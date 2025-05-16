'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useConversation } from '@/lib/ConversationContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar } from '@/components/ui/avatar';
import { Mic, Send, Loader2, MicOff, Volume2 } from 'lucide-react';

const ConversationInterface: React.FC = () => {
  const {
    messages,
    isListening,
    isSpeaking,
    isProcessing,
    startConversation,
    stopConversation,
    sendMessage,
    userSpeaking,
    error,
  } = useConversation();

  const [textInput, setTextInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      sendMessage(textInput);
      setTextInput('');
    }
  };

  // Determine the current state for display
  const getStatusMessage = () => {
    if (isProcessing) return "Processing...";
    if (isSpeaking) return "Speaking...";
    if (isListening) {
      return userSpeaking ? "Listening (active)" : "Listening...";
    }
    return null;
  };

  const statusMessage = getStatusMessage();

  return (
    <div className="flex flex-col h-[80vh]">
      {/* Conversation Status */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isProcessing && (
            <span className="text-sm text-yellow-400 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Processing...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {statusMessage && (
            <span className={`text-sm flex items-center gap-1 ${
              isProcessing ? 'text-yellow-400' : 
              isSpeaking ? 'text-blue-400' : 
              userSpeaking ? 'text-green-500' : 'text-green-400'
            }`}>
              {isProcessing && <Loader2 className="h-3 w-3 animate-spin" />}
              {isSpeaking && <Volume2 className="h-3 w-3 animate-pulse" />}
              {isListening && !isProcessing && !isSpeaking && (
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    userSpeaking ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
                  }`}
                />
              )}
              {statusMessage}
            </span>
          )}
        </div>
      </div>

      {/* Messages Container */}
      <Card className="flex-1 overflow-y-auto p-4 mb-4 bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <p className="text-center mb-2">No conversation yet</p>
            <p className="text-center text-sm">
              {isListening
                ? 'Start speaking or type a message below'
                : 'Click the Start Conversation button to begin'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`flex gap-3 max-w-[80%] ${
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <Avatar className={`w-8 h-8 ${
                    message.role === 'user' ? 'bg-blue-600' : 'bg-purple-600'
                  }`}>
                    <div className="text-xs font-medium">
                      {message.role === 'user' ? 'You' : 'AI'}
                    </div>
                  </Avatar>
                  <div
                    className={`rounded-2xl px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-white'
                    }`}
                  >
                    <p>{message.content}</p>
                    <div className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </Card>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-2 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm">
          Error: {error}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-center">
          {!isListening && !isProcessing && !isSpeaking ? (
            <Button
              onClick={startConversation}
              disabled={isProcessing}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>Start Conversation</>
              )}
            </Button>
          ) : (
            <Button
              onClick={stopConversation}
              variant="destructive"
              className="px-6"
            >
              End Conversation
            </Button>
          )}
        </div>

        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-lg bg-gray-700 border-gray-600 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isProcessing || isSpeaking}
          />
          <Button 
            type="submit" 
            disabled={!textInput.trim() || isProcessing || isSpeaking} 
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
          {(isListening || isProcessing || isSpeaking) && (
            <Button
              type="button"
              size="icon"
              variant="outline"
              disabled={true}
              className={`${
                isListening && userSpeaking ? "bg-green-600" : 
                isSpeaking ? "bg-blue-600" : 
                isProcessing ? "bg-yellow-600" : ""
              }`}
            >
              {isListening ? (
                <Mic className={`h-4 w-4 ${userSpeaking ? 'animate-pulse' : ''}`} />
              ) : isSpeaking ? (
                <Volume2 className="h-4 w-4 animate-pulse" />
              ) : (
                <MicOff className="h-4 w-4" />
              )}
            </Button>
          )}
        </form>

        {/* Voice Activity Indicator */}
        {isListening && (
          <div className="mt-2">
            <div className="text-xs text-gray-400 mb-1">Voice activity</div>
            <Progress
              value={userSpeaking ? 100 : 0}
              className="h-1"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationInterface; 