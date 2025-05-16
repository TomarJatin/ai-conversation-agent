'use client';

import React from 'react';
import { ConversationProvider } from '@/lib/ConversationContext';
import ConversationInterface from '@/components/ConversationInterface';

export default function ConversationPage() {
  return (
    <ConversationProvider>
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <h1 className="text-3xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
            AI Conversation Agent
          </h1>
          <ConversationInterface />
        </div>
      </div>
    </ConversationProvider>
  );
} 