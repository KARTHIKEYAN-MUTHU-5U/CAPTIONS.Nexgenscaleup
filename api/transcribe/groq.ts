import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { audioData, mimeType, duration, fileName } = req.body;

  if (!audioData || typeof audioData !== "string") {
    return res.status(400).json({ error: "No audio data provided." });
  }

  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) {
    return res.status(500).json({
      error: "GROQ_API_KEY not configured. Add it in Vercel Environment Variables.",
    });
  }

  try {
    // Convert base64 to binary buffer for Groq's multipart API
    const audioBuffer = Buffer.from(audioData, "base64");

    // Determine file extension from MIME type
    const cleanMime = (mimeType || "audio/mp3").split(";")[0];
    const extMap: Record<string, string> = {
      "audio/mp3": "mp3",
      "audio/mpeg": "mp3",
      "audio/wav": "wav",
      "audio/x-wav": "wav",
      "audio/webm": "webm",
      "audio/ogg": "ogg",
      "audio/flac": "flac",
      "audio/m4a": "m4a",
      "audio/mp4": "m4a",
    };
    const ext = extMap[cleanMime] || "mp3";
    const safeFileName = (fileName || `audio.${ext}`).replace(/[^a-zA-Z0-9._-]/g, "_");

    // Build multipart form data for Groq API
    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: cleanMime });
    formData.append("file", blob, safeFileName);
    formData.append("model", "whisper-large-v3-turbo");
    formData.append("response_format", "verbose_json");
    formData.append("timestamp_granularities[]", "word");
    formData.append("language", "en");

    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: formData,
      }
    );

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error("Groq API error:", groqResponse.status, errorText);
      return res.status(groqResponse.status).json({
        error: "Groq transcription failed.",
        success: false,
      });
    }

    const groqData = await groqResponse.json();

    // Extract word-level timestamps from Groq response
    let words: Array<{ word: string; start: number; end: number; confidence?: number }> = [];

    if (groqData.words && Array.isArray(groqData.words)) {
      words = groqData.words.map((w: any) => ({
        word: (w.word || "").trim(),
        start: parseFloat((w.start ?? 0).toFixed(2)),
        end: parseFloat((w.end ?? w.start + 0.3).toFixed(2)),
        confidence: 0.9, // Groq Whisper doesn't provide per-word confidence
      }));
    } else if (groqData.segments && Array.isArray(groqData.segments)) {
      // Fallback: extract from segments if word-level not available
      for (const seg of groqData.segments) {
        if (seg.words && Array.isArray(seg.words)) {
          for (const w of seg.words) {
            words.push({
              word: (w.word || "").trim(),
              start: parseFloat((w.start ?? 0).toFixed(2)),
              end: parseFloat((w.end ?? w.start + 0.3).toFixed(2)),
              confidence: 0.9,
            });
          }
        }
      }
    }

    // Post-process: enforce ascending timestamps, fill gaps
    const cleaned = words
      .filter((w) => w.word.length > 0)
      .map((w, i, arr) => {
        const next = arr[i + 1];
        return {
          word: w.word,
          start: Math.max(w.start, i > 0 ? arr[i - 1].end : 0),
          end: next ? Math.min(w.end, next.start) : w.end,
          confidence: w.confidence,
        };
      });

    return res.json({
      success: true,
      words: cleaned,
      simulated: false,
      provider: "groq",
      model: "whisper-large-v3-turbo",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Groq transcription error:", message);
    return res.status(500).json({
      error: "Groq transcription failed. Please try again.",
      success: false,
    });
  }
}
