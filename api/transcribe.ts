import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";

// Lazy-initialized Gemini client (persists across warm invocations)
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Simulation fallback for when API key is missing or API fails
function simulateTranscription(duration: number, fileName: string) {
  const totalSeconds = duration && duration > 0 ? duration : 12;

  const sampleSpeeches = [
    "Welcome to the high precision captions studio. This application accepts an uploaded audio file and generates accurate, word level subtitles that match your audio perfectly. Notice how words remain fully visible on screen, and do not disappear during silence. You can easily adjust text sizes, outline colors, and glow settings to style your captions dynamically. Once satisfied, export your masterwork as a video with audio, or with a transparent alpha channel setup.",
    "The speech timing engine uses advanced frame synchronization to guarantee that subtitles stay visually and temporally identical across both live preview and rendering exports. This level of accuracy is essential for producing high quality vertical video subtitles and social media clips.",
    "In the studio, you can preview captions instantly with real time playback. Use the styling panel to customize outline depth, shadow blurs, and apply punchy pop vfx animations that trigger exactly when speech sound matches the timeline.",
  ];

  let text = sampleSpeeches[0];
  if (fileName.toLowerCase().includes("sample") || fileName.toLowerCase().includes("2")) {
    text = sampleSpeeches[1];
  } else if (fileName.toLowerCase().includes("test") || fileName.toLowerCase().includes("3")) {
    text = sampleSpeeches[2];
  }

  const rawWords = text.trim().split(/\s+/);
  const wordCount = rawWords.length;

  const weights = rawWords.map((w) => {
    const len = w.length;
    const baseWeight = Math.max(2, len);
    const pauseWeight = w.endsWith(",") || w.endsWith(".") ? 4.5 : 0.5;
    return baseWeight + pauseWeight;
  });

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const scaleFactor = (totalSeconds - 0.4) / totalWeight;

  const resultW: Array<{ word: string; start: number; end: number; confidence?: number }> = [];
  let currentStart = 0.2;

  for (let i = 0; i < wordCount; i++) {
    const word = rawWords[i];
    const durationForWord = weights[i] * scaleFactor;
    const wordDuration = Math.max(0.12, durationForWord * 0.85);

    const start = parseFloat(currentStart.toFixed(2));
    const end = parseFloat((currentStart + wordDuration).toFixed(2));

    let confidence = 0.95;
    const seed = (i * 12345) % 100;
    if (seed < 5) {
      confidence = parseFloat((0.35 + (seed % 20) * 0.01).toFixed(2));
    } else if (seed < 20) {
      confidence = parseFloat((0.60 + (seed % 19) * 0.01).toFixed(2));
    } else {
      confidence = parseFloat((0.82 + (seed % 17) * 0.01).toFixed(2));
    }

    resultW.push({
      word,
      start,
      end: end > totalSeconds ? parseFloat(totalSeconds.toFixed(2)) : end,
      confidence,
    });

    currentStart += durationForWord;
  }

  return resultW;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { audioData, mimeType, duration, fileName } = req.body;

  if (!audioData || typeof audioData !== "string") {
    return res.status(400).json({ error: "No audio data provided." });
  }

  const client = getGeminiClient();

  // No API key — return simulation
  if (!client) {
    return res.json({
      success: true,
      simulated: true,
      words: simulateTranscription(duration || 10, fileName || "audio.mp3"),
    });
  }

  try {
    const systemInstruction = `Word-level audio transcription tool. Return a JSON array of word objects.
Each object: {"w":"exact_word","s":start_seconds,"e":end_seconds,"c":confidence_0_to_1}
Rules:
1. Every spoken word gets its own timing entry.
2. Words remain visible until next word begins (no unnecessary gaps, but respect natural pauses).
3. Timestamps strictly ascending, non-overlapping.
4. Output raw JSON only, no markdown wrapping.
5. Do not invent speech. If low confidence, choose most reliable text.
6. Confidence reflects auditory clarity and ambient distortion (float 0.00-1.00).`;

    const cleanMimeType = mimeType ? mimeType.split(";")[0] : "audio/mp3";

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            data: audioData,
            mimeType: cleanMimeType,
          },
        },
        {
          text: `Please transcribe this audio at the word-level. The estimated duration from client metadata is ${duration || "unknown"} seconds. Output the formatted JSON array of words with start and end timestamps.`,
        },
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });

    let rawText = response.text || "";
    rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      const words = JSON.parse(rawText);
      if (Array.isArray(words)) {
        // Remap short keys to full keys for backward compatibility
        const remappedWords = words.map((w: any) => ({
          word: w.w ?? w.word,
          start: w.s ?? w.start,
          end: w.e ?? w.end,
          confidence: w.c ?? w.confidence,
        }));
        return res.json({ success: true, words: remappedWords, simulated: false });
      }
    } catch (parseErr) {
      console.error("Failed to parse Gemini response as JSON.");
    }

    // Fallback if parsing fails
    return res.json({
      success: true,
      simulated: true,
      words: simulateTranscription(duration || 10, fileName || "audio.mp3"),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Gemini API transcription error:", message);
    return res.status(500).json({
      error: "Transcription failed. Please try again.",
      simulatedFallback: true,
      words: simulateTranscription(duration || 10, fileName || "audio.mp3"),
    });
  }
}
