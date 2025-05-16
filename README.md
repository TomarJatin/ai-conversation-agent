# AI Conversation Agent

A conversational agent built with Next.js that uses OpenAI's Text-to-Speech (TTS) and Speech-to-Text (STT) capabilities to enable natural voice conversations with an AI assistant.

## Features

- Real-time speech recognition using OpenAI's Whisper model
- Natural text-to-speech responses using OpenAI's TTS model
- WebSocket-based continuous conversation
- Automatic speech detection
- Beautiful UI with Tailwind CSS and shadcn/ui components
- Responsive design for all devices

## Tech Stack

- Next.js 15
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Socket.IO for real-time communication
- OpenAI API for AI responses, speech recognition, and text-to-speech

## Getting Started

### Prerequisites

- Node.js 18+ and npm/pnpm
- OpenAI API key

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/conversation-agent.git
cd conversation-agent
```

2. Install dependencies:

```bash
pnpm install
```

3. Create a `.env.local` file in the root directory and add your OpenAI API key:

```
OPENAI_API_KEY=your_openai_api_key_here
```

4. Run the development server:

```bash
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Usage

1. Navigate to the conversation page by clicking "Start Talking" on the home page.
2. Click the "Start Conversation" button to initialize the voice conversation.
3. Start speaking when you see the "Listening" indicator.
4. The AI will respond both in text and with voice.
5. You can also type messages in the input field if you prefer.

## How It Works

1. **WebSocket Connection**: When you start a conversation, a WebSocket connection is established to enable real-time communication.

2. **Speech Detection**: The app uses the Web Audio API to detect when you're speaking and automatically starts recording.

3. **Speech-to-Text**: Your voice is recorded and sent to OpenAI's Whisper model, which transcribes it to text.

4. **AI Response**: The transcribed text is sent to OpenAI's GPT model, which generates a response.

5. **Text-to-Speech**: The AI's response is converted to speech using OpenAI's TTS model and played back to you.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [OpenAI](https://openai.com/) for their powerful AI models
- [Next.js](https://nextjs.org/) for the React framework
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [shadcn/ui](https://ui.shadcn.com/) for UI components
