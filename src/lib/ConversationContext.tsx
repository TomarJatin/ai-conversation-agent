import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AudioRecorder, SpeechDetector, AudioPlayer } from './audioUtils';
import { ConversationClient } from './socketClient';

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
  isProcessing: boolean;
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<ConversationClient | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const speechDetectorRef = useRef<SpeechDetector | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);

  // Initialize utilities
  useEffect(() => {
    clientRef.current = new ConversationClient();
    audioRecorderRef.current = new AudioRecorder();
    speechDetectorRef.current = new SpeechDetector();
    audioPlayerRef.current = new AudioPlayer();

    return () => {
      stopConversation();
    };
  }, []);

  // Set up client event handlers
  useEffect(() => {
    if (!clientRef.current) return;

    const client = clientRef.current;

    client.onTranscription((text) => {
      addMessage('user', text);
    });

    client.onTextResponse((text) => {
      addMessage('assistant', text);
    });

    client.onAudioResponse(async (audioUrl) => {
      if (!audioPlayerRef.current) return;

      try {
        setIsSpeaking(true);
        
        // Fetch the audio from the URL
        const response = await fetch(audioUrl);
        if (!response.ok) {
          throw new Error('Failed to fetch audio');
        }
        
        const audioBuffer = await response.arrayBuffer();
        const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
        
        // Play the audio
        await audioPlayerRef.current.playAudio(audioBlob, () => {
          setIsSpeaking(false);
        });
      } catch (error) {
        console.error('Error playing audio:', error);
        setIsSpeaking(false);
      }
    });

    client.onError((errorMsg) => {
      setError(errorMsg);
      setIsProcessing(false);
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
          
          if (audioBlob && clientRef.current) {
            // Send audio to server
            setIsProcessing(true);
            const success = await clientRef.current.sendAudioChunk(audioBlob);
            if (!success) {
              setError('Failed to process audio');
            }
            setIsProcessing(false);
          }
        }
      );
      
      if (!speechDetectorInitialized) {
        setError('Failed to initialize speech detection');
        return;
      }
      
      setIsListening(true);
    } catch (error) {
      console.error('Error starting conversation:', error);
      setError('Failed to start conversation');
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
    
    setIsListening(false);
    setIsSpeaking(false);
    setUserSpeaking(false);
    setIsProcessing(false);
  };

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    
    addMessage('user', text);
    
    // Send message to server via REST API
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
    isProcessing,
    startConversation,
    stopConversation,
    sendMessage,
    userSpeaking,
    error,
  };

  return <ConversationContext.Provider value={value}>{children}</ConversationContext.Provider>;
}; 