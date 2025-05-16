import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AudioRecorder, SpeechDetector, AudioPlayer } from './audioUtils';
import { ConversationSocketClient } from './socketClient';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

type ConversationContextType = {
  messages: Message[];
  isListening: boolean;
  isSpeaking: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  startConversation: () => Promise<void>;
  stopConversation: () => void;
  sendMessage: (text: string) => void;
  userSpeaking: boolean;
  error: string | null;
};

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

export const useConversation = () => {
  const context = useContext(ConversationContext);
  if (context === undefined) {
    throw new Error('useConversation must be used within a ConversationProvider');
  }
  return context;
};

export const ConversationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const socketClientRef = useRef<ConversationSocketClient | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const speechDetectorRef = useRef<SpeechDetector | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);

  // Initialize utilities
  useEffect(() => {
    socketClientRef.current = new ConversationSocketClient();
    audioRecorderRef.current = new AudioRecorder();
    speechDetectorRef.current = new SpeechDetector();
    audioPlayerRef.current = new AudioPlayer();

    return () => {
      stopConversation();
    };
  }, []);

  // Set up socket event handlers
  useEffect(() => {
    if (!socketClientRef.current) return;

    const socketClient = socketClientRef.current;

    socketClient.onConnect(() => {
      setIsConnected(true);
      setIsConnecting(false);
    });

    socketClient.onDisconnect(() => {
      setIsConnected(false);
    });

    socketClient.onTranscription((text) => {
      addMessage('user', text);
    });

    socketClient.onTextResponse((text) => {
      addMessage('assistant', text);
    });

    socketClient.onAudioResponse(async (audioBuffer) => {
      if (!audioPlayerRef.current) return;

      setIsSpeaking(true);
      
      const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      await audioPlayerRef.current.playAudio(audioBlob, () => {
        setIsSpeaking(false);
      });
    });

    socketClient.onError((errorMsg) => {
      setError(errorMsg);
    });
  }, []);

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        id: Date.now().toString(),
        role,
        content,
        timestamp: new Date(),
      },
    ]);
  };

  const startConversation = async () => {
    try {
      setError(null);
      setIsConnecting(true);
      
      // Connect to WebSocket server
      if (!socketClientRef.current) {
        socketClientRef.current = new ConversationSocketClient();
      }
      
      const connected = await socketClientRef.current.connect();
      if (!connected) {
        setError('Failed to connect to the conversation server');
        setIsConnecting(false);
        return;
      }
      
      // Initialize speech detector
      if (!speechDetectorRef.current) {
        speechDetectorRef.current = new SpeechDetector();
      }
      
      const speechDetectorInitialized = await speechDetectorRef.current.init(
        // On speech start
        async () => {
          setUserSpeaking(true);
          
          // Start recording
          if (!audioRecorderRef.current) {
            audioRecorderRef.current = new AudioRecorder();
          }
          await audioRecorderRef.current.startRecording();
        },
        // On speech end
        async () => {
          setUserSpeaking(false);
          
          if (!audioRecorderRef.current) return;
          
          // Stop recording and get audio blob
          const audioBlob = await audioRecorderRef.current.stopRecording();
          
          if (audioBlob && socketClientRef.current) {
            // Send audio to server
            socketClientRef.current.sendAudioChunk(audioBlob);
          }
        }
      );
      
      if (!speechDetectorInitialized) {
        setError('Failed to initialize speech detection');
        setIsConnecting(false);
        return;
      }
      
      setIsListening(true);
    } catch (error) {
      console.error('Error starting conversation:', error);
      setError('Failed to start conversation');
      setIsConnecting(false);
      setIsListening(false);
    }
  };

  const stopConversation = () => {
    // Stop speech detector
    if (speechDetectorRef.current) {
      speechDetectorRef.current.stop();
    }
    
    // Stop audio recorder
    if (audioRecorderRef.current && audioRecorderRef.current.isCurrentlyRecording()) {
      audioRecorderRef.current.stopRecording();
    }
    
    // Stop audio player
    if (audioPlayerRef.current) {
      audioPlayerRef.current.stop();
    }
    
    // Disconnect socket
    if (socketClientRef.current) {
      socketClientRef.current.disconnect();
    }
    
    setIsListening(false);
    setIsSpeaking(false);
    setUserSpeaking(false);
    setIsConnected(false);
  };

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    
    addMessage('user', text);
    
    // Send message to server via REST API since we're not using voice
    fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: messages.concat({
          id: Date.now().toString(),
          role: 'user',
          content: text,
          timestamp: new Date(),
        }),
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.message) {
          addMessage('assistant', data.message.content);
          
          // Convert response to speech
          fetch('/api/text-to-speech', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: data.message.content }),
          })
            .then((response) => response.arrayBuffer())
            .then((audioBuffer) => {
              if (audioPlayerRef.current) {
                setIsSpeaking(true);
                const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
                audioPlayerRef.current.playAudio(audioBlob, () => {
                  setIsSpeaking(false);
                });
              }
            })
            .catch((error) => {
              console.error('Error converting text to speech:', error);
            });
        }
      })
      .catch((error) => {
        console.error('Error sending message:', error);
        setError('Failed to send message');
      });
  };

  const value = {
    messages,
    isListening,
    isSpeaking,
    isConnecting,
    isConnected,
    startConversation,
    stopConversation,
    sendMessage,
    userSpeaking,
    error,
  };

  return <ConversationContext.Provider value={value}>{children}</ConversationContext.Provider>;
}; 