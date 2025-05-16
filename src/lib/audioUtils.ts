// Audio recording utilities

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private isRecording = false;

  async startRecording(): Promise<boolean> {
    try {
      if (this.isRecording) return true;

      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      
      this.mediaRecorder = new MediaRecorder(this.stream);
      
      this.mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      });
      
      this.mediaRecorder.start(100); // Collect data every 100ms
      this.isRecording = true;
      
      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      return false;
    }
  }

  async stopRecording(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || !this.isRecording) {
        resolve(null);
        return;
      }

      this.mediaRecorder.addEventListener('stop', () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.stopMediaTracks();
        this.isRecording = false;
        resolve(audioBlob);
      });

      this.mediaRecorder.stop();
    });
  }

  getAudioChunks(): Blob[] {
    return [...this.audioChunks];
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  private stopMediaTracks() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }
}

// Speech detection utility
export class SpeechDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private silenceTimer: NodeJS.Timeout | null = null;
  private isSpeaking = false;
  private onSpeechStart: (() => void) | null = null;
  private onSpeechEnd: (() => void) | null = null;
  private silenceThreshold = 15; // Adjust based on testing
  private silenceDelay = 1500; // 1.5 seconds of silence to consider speech ended

  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
  }

  async init(
    onSpeechStart: () => void,
    onSpeechEnd: () => void,
    silenceDelay = 1500,
    silenceThreshold = 15
  ): Promise<boolean> {
    try {
      this.onSpeechStart = onSpeechStart;
      this.onSpeechEnd = onSpeechEnd;
      this.silenceDelay = silenceDelay;
      this.silenceThreshold = silenceThreshold;

      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      this.microphone.connect(this.analyser);
      
      this.startDetection();
      return true;
    } catch (error) {
      console.error('Error initializing speech detector:', error);
      return false;
    }
  }

  private startDetection() {
    const bufferLength = this.analyser!.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const checkAudioLevel = () => {
      if (!this.analyser) return;
      
      this.analyser.getByteFrequencyData(dataArray);
      
      // Calculate average volume level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      
      // Detect speech
      if (average > this.silenceThreshold) {
        if (!this.isSpeaking) {
          this.isSpeaking = true;
          if (this.onSpeechStart) this.onSpeechStart();
        }
        
        // Reset silence timer
        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer);
          this.silenceTimer = null;
        }
      } else if (this.isSpeaking && !this.silenceTimer) {
        // Start silence timer
        this.silenceTimer = setTimeout(() => {
          this.isSpeaking = false;
          if (this.onSpeechEnd) this.onSpeechEnd();
          this.silenceTimer = null;
        }, this.silenceDelay);
      }
      
      // Continue checking
      requestAnimationFrame(checkAudioLevel);
    };
    
    checkAudioLevel();
  }

  stop() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.analyser = null;
    this.isSpeaking = false;
  }
}

// Audio playback utility
export class AudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private onEndCallback: (() => void) | null = null;

  constructor() {
    this.audio = new Audio();
    this.audio.addEventListener('ended', () => {
      if (this.onEndCallback) this.onEndCallback();
    });
  }

  async playAudio(audioBlob: Blob, onEnd?: () => void): Promise<void> {
    return new Promise((resolve) => {
      if (!this.audio) {
        this.audio = new Audio();
      }
      
      const url = URL.createObjectURL(audioBlob);
      this.audio.src = url;
      
      this.onEndCallback = onEnd || null;
      
      this.audio.addEventListener('ended', function onEnded() {
        URL.revokeObjectURL(url);
        resolve();
        this.removeEventListener('ended', onEnded);
      });
      
      this.audio.play().catch(error => {
        console.error('Error playing audio:', error);
        resolve();
      });
    });
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
  }
} 