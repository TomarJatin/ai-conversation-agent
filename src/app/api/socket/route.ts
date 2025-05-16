import { Server } from 'socket.io';
import { NextRequest } from 'next/server';
import { createServer } from 'http';
import { OpenAI } from 'openai';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const socketServer = new Server({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Add global type declaration
declare global {
  var socketServerStarted: boolean;
}

socketServer.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Store conversation history for this session
  const conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [];

  // Handle audio chunks from client for speech-to-text
  socket.on('audioChunk', async (audioChunk: Buffer) => {
    try {
      // Save audio chunk to a temporary file
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, `${socket.id}-audio.webm`);
      fs.writeFileSync(tempFilePath, audioChunk);

      // Convert audio to text using OpenAI's API
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: 'whisper-1',
      });

      // Clean up temporary file
      fs.unlinkSync(tempFilePath);

      const userText = transcription.text;
      if (!userText || userText.trim() === '') return;

      // Update conversation history
      conversationHistory.push({ role: 'user', content: userText });

      // Send the transcribed text back to client
      socket.emit('transcription', userText);

      // Generate AI response
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          ...conversationHistory,
        ],
      });

      const assistantResponse = response.choices[0].message.content;
      conversationHistory.push({ role: 'assistant', content: assistantResponse || '' });

      // Generate speech from text
      const audioResponse = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'alloy',
        input: assistantResponse || '',
      });

      // Convert audio to buffer and send back to client
      const audioBuffer = await audioResponse.arrayBuffer();
      socket.emit('audioResponse', Buffer.from(audioBuffer));
      socket.emit('textResponse', assistantResponse);
    } catch (error) {
      console.error('Error processing audio:', error);
      socket.emit('error', 'Failed to process audio');
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const httpServer = createServer();
socketServer.attach(httpServer);

// Start the server if it hasn't been started yet
if (!global.socketServerStarted) {
  httpServer.listen(3001, () => {
    console.log('Socket.IO server running on port 3001');
  });
  global.socketServerStarted = true;
}

export async function GET(req: NextRequest) {
  return new Response('Socket.IO server is running', { status: 200 });
} 