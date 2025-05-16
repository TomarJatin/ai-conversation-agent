export class ConversationClient {
  private onTranscriptionCallback: ((text: string) => void) | null = null;
  private onAudioResponseCallback: ((audioUrl: string) => void) | null = null;
  private onTextResponseCallback: ((text: string) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private isProcessing = false;

  async sendAudioChunk(audioChunk: Blob): Promise<boolean> {
    if (this.isProcessing) {
      console.warn('Already processing audio, please wait');
      return false;
    }

    try {
      this.isProcessing = true;
      
      // Create a FormData object and append the audio blob
      const formData = new FormData();
      formData.append('audio', audioChunk, 'audio.webm');
      
      // Send the audio to the server
      const response = await fetch('/api/socket', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        if (this.onErrorCallback) {
          this.onErrorCallback(errorData.error || 'Failed to process audio');
        }
        return false;
      }
      
      const data = await response.json();
      
      // Handle the transcription
      if (data.transcription && this.onTranscriptionCallback) {
        this.onTranscriptionCallback(data.transcription);
      }
      
      // Handle the text response
      if (data.response && this.onTextResponseCallback) {
        this.onTextResponseCallback(data.response);
      }
      
      // Handle the audio response
      if (data.audioUrl && this.onAudioResponseCallback) {
        this.onAudioResponseCallback(data.audioUrl);
      }
      
      return true;
    } catch (error) {
      console.error('Error sending audio chunk:', error);
      if (this.onErrorCallback) {
        this.onErrorCallback('Failed to send audio chunk');
      }
      return false;
    } finally {
      this.isProcessing = false;
    }
  }

  onTranscription(callback: (text: string) => void) {
    this.onTranscriptionCallback = callback;
  }

  onAudioResponse(callback: (audioUrl: string) => void) {
    this.onAudioResponseCallback = callback;
  }

  onTextResponse(callback: (text: string) => void) {
    this.onTextResponseCallback = callback;
  }

  onError(callback: (error: string) => void) {
    this.onErrorCallback = callback;
  }

  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }
} 