/**
 * Multi-provider transcription engine.
 * Routes transcription requests to the optimal provider based on user selection.
 *
 * Providers:
 * - "free"  → Client-side Whisper via @huggingface/transformers (offline, $0)
 * - "fast"  → Groq Whisper Large V3 API (server, ~$0.0007/clip)
 * - "best"  → Gemini 2.5 Flash API (server, ~$0.0018/clip)
 */

import type { CaptionWord } from "../types";

export type TranscriptionTier = "free" | "fast" | "best";
export type TranscriptionProvider = "whisper-local" | "groq" | "gemini";

export interface TranscriptionResult {
  words: CaptionWord[];
  provider: TranscriptionProvider;
  tier: TranscriptionTier;
  simulated: boolean;
  processingTimeMs: number;
}

// ─── Device Capability Detection ────────────────────────────────────────

let _webgpuSupported: boolean | null = null;

export async function isWebGPUSupported(): Promise<boolean> {
  if (_webgpuSupported !== null) return _webgpuSupported;
  try {
    const nav = navigator as any;
    if (!nav.gpu) {
      _webgpuSupported = false;
      return false;
    }
    const adapter = await nav.gpu.requestAdapter();
    _webgpuSupported = adapter !== null;
    return _webgpuSupported;
  } catch {
    _webgpuSupported = false;
    return false;
  }
}

export function getDeviceMemoryGB(): number {
  // navigator.deviceMemory is available in Chrome/Edge (returns GB)
  return (navigator as any).deviceMemory ?? 4;
}

export function canRunLocalWhisper(): boolean {
  return getDeviceMemoryGB() >= 4;
}

// ─── Whisper Local (Client-Side) ────────────────────────────────────────

let whisperPipeline: any = null;
let whisperLoading = false;
let whisperLoadPromise: Promise<any> | null = null;

export function getWhisperLoadingState(): { loading: boolean; ready: boolean } {
  return {
    loading: whisperLoading,
    ready: whisperPipeline !== null,
  };
}

async function loadWhisperPipeline(): Promise<any> {
  if (whisperPipeline) return whisperPipeline;
  if (whisperLoadPromise) return whisperLoadPromise;

  whisperLoading = true;
  whisperLoadPromise = (async () => {
    try {
      const { pipeline } = await import("@huggingface/transformers");
      whisperPipeline = await pipeline(
        "automatic-speech-recognition",
        "onnx-community/whisper-tiny.en",
        {
          dtype: "q4",
          device: (await isWebGPUSupported()) ? "webgpu" : "wasm",
        }
      );
      return whisperPipeline;
    } finally {
      whisperLoading = false;
    }
  })();

  return whisperLoadPromise;
}

async function transcribeWithWhisperLocal(
  audioData: string,
  mimeType: string,
  duration: number
): Promise<CaptionWord[]> {
  const pipe = await loadWhisperPipeline();

  // Convert base64 to audio URL for the pipeline
  const audioUrl = `data:${mimeType};base64,${audioData}`;

  const result = await pipe(audioUrl, {
    return_timestamps: "word",
    chunk_length_s: 30,
    stride_length_s: 5,
  });

  // Transform Whisper output to CaptionWord format
  if (result.chunks && Array.isArray(result.chunks)) {
    return result.chunks
      .filter((chunk: any) => chunk.text && chunk.text.trim())
      .map((chunk: any) => ({
        word: chunk.text.trim(),
        start: parseFloat((chunk.timestamp?.[0] ?? 0).toFixed(2)),
        end: parseFloat((chunk.timestamp?.[1] ?? chunk.timestamp?.[0] + 0.3).toFixed(2)),
        confidence: 0.85, // Whisper tiny doesn't provide per-word confidence
      }));
  }

  return [];
}

// ─── Groq Whisper (Server-Side) ─────────────────────────────────────────

async function transcribeWithGroq(
  audioData: string,
  mimeType: string,
  duration: number,
  fileName: string
): Promise<CaptionWord[]> {
  const res = await fetch("/api/transcribe/groq", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audioData, mimeType, duration, fileName }),
  });

  if (!res.ok) {
    throw new Error(`Groq API returned status ${res.status}`);
  }

  const data = await res.json();
  if (data.success && Array.isArray(data.words)) {
    return data.words;
  }
  throw new Error("Groq returned invalid response format");
}

// ─── Gemini (Server-Side) ───────────────────────────────────────────────

async function transcribeWithGemini(
  audioData: string,
  mimeType: string,
  duration: number,
  fileName: string
): Promise<{ words: CaptionWord[]; simulated: boolean }> {
  const res = await fetch("/api/transcribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audioData, mimeType, duration, fileName }),
  });

  const data = await res.json();

  // Server returns words even on 500 (simulation fallback)
  if (data.words && Array.isArray(data.words) && data.words.length > 0) {
    return {
      words: data.words,
      simulated: data.simulated ?? data.simulatedFallback ?? !data.success,
    };
  }

  if (!res.ok) {
    throw new Error(`Gemini API returned status ${res.status}: ${data.error || "Unknown error"}`);
  }

  throw new Error("Gemini returned invalid response format");
}

// ─── Post-Processing ────────────────────────────────────────────────────

/**
 * Enforce timestamp rules on any provider's output:
 * - Strictly ascending, non-overlapping
 * - No gaps between consecutive words (fill to next word start)
 * - Generate unique IDs
 */
function postProcessWords(words: CaptionWord[]): CaptionWord[] {
  if (words.length === 0) return words;

  // Sort by start time
  const sorted = [...words].sort((a, b) => a.start - b.start);

  return sorted.map((w, i) => {
    const next = sorted[i + 1];
    const prevEnd = i > 0 ? sorted[i - 1].end : 0;

    // Ensure start >= previous word's end (non-overlapping)
    const start = Math.max(w.start, prevEnd);

    // Ensure end doesn't overlap next word's start
    let end = w.end;
    if (next && end > next.start) {
      end = next.start;
    }

    // Ensure minimum word duration of 50ms
    if (end - start < 0.05) {
      end = start + 0.05;
    }

    return {
      id: `w-${i}-${Date.now()}`,
      word: w.word,
      start: parseFloat(start.toFixed(3)),
      end: parseFloat(end.toFixed(3)),
      confidence: w.confidence,
    };
  });
}

// ─── Main Transcription Entry Point ─────────────────────────────────────

/** Fallback chain order for each tier */
const FALLBACK_CHAINS: Record<TranscriptionTier, TranscriptionProvider[]> = {
  free: ["whisper-local", "groq", "gemini"],
  fast: ["groq", "gemini", "whisper-local"],
  best: ["gemini", "groq", "whisper-local"],
};

export async function transcribe(
  audioData: string,
  options: {
    tier: TranscriptionTier;
    mimeType: string;
    duration: number;
    fileName: string;
    onProgress?: (message: string) => void;
  }
): Promise<TranscriptionResult> {
  const { tier, mimeType, duration, fileName, onProgress } = options;
  const chain = FALLBACK_CHAINS[tier];
  const startTime = performance.now();

  for (const provider of chain) {
    try {
      let words: CaptionWord[] = [];
      let simulated = false;

      switch (provider) {
        case "whisper-local": {
          onProgress?.("Loading Whisper model (first time may take 30-60s)...");
          words = await transcribeWithWhisperLocal(audioData, mimeType, duration);
          onProgress?.("Whisper transcription complete");
          break;
        }
        case "groq": {
          onProgress?.("Sending to Groq Whisper Large V3...");
          words = await transcribeWithGroq(audioData, mimeType, duration, fileName);
          onProgress?.("Groq transcription complete");
          break;
        }
        case "gemini": {
          onProgress?.("Sending to Gemini 2.5 Flash...");
          const geminiResult = await transcribeWithGemini(audioData, mimeType, duration, fileName);
          words = geminiResult.words;
          simulated = geminiResult.simulated;
          onProgress?.("Gemini transcription complete");
          break;
        }
      }

      if (words.length > 0) {
        const processed = postProcessWords(words);
        return {
          words: processed,
          provider,
          tier,
          simulated,
          processingTimeMs: Math.round(performance.now() - startTime),
        };
      }

      // If no words returned, try next provider
      onProgress?.(`${provider} returned no words, trying fallback...`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`Transcription with ${provider} failed: ${errMsg}`);
      onProgress?.(`${provider} failed, trying fallback...`);
      // Continue to next provider in the chain
    }
  }

  // All providers failed — should not normally reach here
  // Return empty result; the caller (App.tsx) has its own simulation fallback
  return {
    words: [],
    provider: chain[chain.length - 1],
    tier,
    simulated: true,
    processingTimeMs: Math.round(performance.now() - startTime),
  };
}

/**
 * Pre-load the Whisper model in the background.
 * Call this when the user opens the app so the model is ready
 * when they first click "Transcribe (Free)".
 */
export async function preloadWhisperModel(
  onProgress?: (message: string) => void
): Promise<boolean> {
  try {
    if (!canRunLocalWhisper()) {
      onProgress?.("Device doesn't meet requirements for local Whisper");
      return false;
    }
    onProgress?.("Pre-loading Whisper model...");
    await loadWhisperPipeline();
    onProgress?.("Whisper model ready");
    return true;
  } catch (err) {
    console.warn("Failed to pre-load Whisper:", err);
    return false;
  }
}
