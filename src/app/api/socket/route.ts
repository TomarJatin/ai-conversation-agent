import { NextRequest } from 'next/server';
import { OpenAI } from 'openai';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return new Response(JSON.stringify({ error: 'No audio file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Save audio chunk to a temporary file
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `audio-${Date.now()}.webm`);
    
    // Convert File to Buffer and save to disk
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    fs.writeFileSync(tempFilePath, audioBuffer);

    // Convert audio to text using OpenAI's API
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: 'whisper-1',
    });

    // Clean up temporary file
    fs.unlinkSync(tempFilePath);

    const userText = transcription.text;
    if (!userText || userText.trim() === '') {
      return new Response(JSON.stringify({ error: 'No speech detected' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate AI response
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: userText },
      ],
    });

    const assistantResponse = response.choices[0].message.content;

    // Generate speech from text
    const audioResponse = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: assistantResponse || '',
    });

    // Return all the data
    return new Response(
      JSON.stringify({
        transcription: userText,
        response: assistantResponse,
        audioUrl: `/api/socket/audio?text=${encodeURIComponent(assistantResponse || '')}`
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error processing audio:', error);
    return new Response(JSON.stringify({ error: 'Failed to process audio' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 