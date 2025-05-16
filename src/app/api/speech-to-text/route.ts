import { NextRequest, NextResponse } from 'next/server';
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
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Save the audio file to a temporary location
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `stt-${Date.now()}.webm`);
    
    // Convert File to Buffer and save to disk
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    fs.writeFileSync(tempFilePath, audioBuffer);
    
    // Create a readable stream from the file
    const audioStream = fs.createReadStream(tempFilePath);
    
    // Transcribe the audio using OpenAI's API
    const transcription = await openai.audio.transcriptions.create({
      file: audioStream,
      model: 'whisper-1',
    });
    
    // Clean up the temporary file
    fs.unlinkSync(tempFilePath);
    
    return NextResponse.json({ text: transcription.text });
  } catch (error) {
    console.error('Error in speech-to-text:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
} 