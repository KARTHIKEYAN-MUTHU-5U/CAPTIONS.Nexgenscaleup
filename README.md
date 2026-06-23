# Captions Suite — AI-Powered Caption Generator

Upload audio, get perfectly synced word-level captions with style customization and video export.

**Live**: [captions.nexgenscaleup.com](https://captions.nexgenscaleup.com)

## Run Locally

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the environment template and add your API keys:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and set your `GEMINI_API_KEY` (and optionally `GROQ_API_KEY`).

3. Run the app:
   ```bash
   npm run dev
   ```

## Transcription Providers

| Tier | Provider | Cost | Speed |
|------|----------|------|-------|
| Free | Client-side Whisper (browser) | $0 | 15-60s |
| Fast | Groq Whisper Large V3 | $0.04/hr | <1s |
| Best | Gemini 2.5 Flash | $0.09/hr | 3-8s |

## Tech Stack

- **Frontend**: React 19 + Vite + Tailwind CSS v4
- **Backend**: Express.js (dev), Vercel Serverless Functions (prod)
- **AI**: Google Gemini, Groq Whisper, HuggingFace Transformers.js
