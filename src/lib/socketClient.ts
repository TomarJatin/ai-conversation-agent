import { io, Socket } from 'socket.io-client';

export class ConversationSocketClient {
  private socket: Socket | null = null;
  private isConnected = false;
  private onTranscriptionCallback: ((text: string) => void) | null = null;
  private onAudioResponseCallback: ((audio: ArrayBuffer) => void) | null = null;
  private onTextResponseCallback: ((text: string) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private onConnectCallback: (() => void) | null = null;
  private onDisconnectCallback: (() => void) | null = null;

  async connect(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.isConnected && this.socket) {
        resolve(true);
        return;
      }

      // Determine the WebSocket server URL based on the current environment
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      const port = process.env.NODE_ENV === 'production' ? window.location.port : '3001';
      const socketUrl = `${protocol}//${host}:${port}`;

      try {
        this.socket = io(socketUrl, {
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          transports: ['websocket'],
        });

        this.socket.on('connect', () => {
          this.isConnected = true;
          if (this.onConnectCallback) this.onConnectCallback();
          resolve(true);
        });

        this.socket.on('disconnect', () => {
          this.isConnected = false;
          if (this.onDisconnectCallback) this.onDisconnectCallback();
        });

        this.socket.on('transcription', (text: string) => {
          if (this.onTranscriptionCallback) this.onTranscriptionCallback(text);
        });

        this.socket.on('audioResponse', (audioBuffer: ArrayBuffer) => {
          if (this.onAudioResponseCallback) this.onAudioResponseCallback(audioBuffer);
        });

        this.socket.on('textResponse', (text: string) => {
          if (this.onTextResponseCallback) this.onTextResponseCallback(text);
        });

        this.socket.on('error', (error: string) => {
          if (this.onErrorCallback) this.onErrorCallback(error);
        });

        this.socket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          resolve(false);
        });
      } catch (error) {
        console.error('Error creating socket connection:', error);
        resolve(false);
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  sendAudioChunk(audioChunk: Blob) {
    if (!this.socket || !this.isConnected) {
      console.error('Cannot send audio chunk: Socket not connected');
      return false;
    }

    // Convert Blob to ArrayBuffer and send
    const reader = new FileReader();
    reader.onloadend = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      this.socket?.emit('audioChunk', arrayBuffer);
    };
    reader.readAsArrayBuffer(audioChunk);
    return true;
  }

  onTranscription(callback: (text: string) => void) {
    this.onTranscriptionCallback = callback;
  }

  onAudioResponse(callback: (audio: ArrayBuffer) => void) {
    this.onAudioResponseCallback = callback;
  }

  onTextResponse(callback: (text: string) => void) {
    this.onTextResponseCallback = callback;
  }

  onError(callback: (error: string) => void) {
    this.onErrorCallback = callback;
  }

  onConnect(callback: () => void) {
    this.onConnectCallback = callback;
  }

  onDisconnect(callback: () => void) {
    this.onDisconnectCallback = callback;
  }

  isSocketConnected(): boolean {
    return this.isConnected;
  }
} 