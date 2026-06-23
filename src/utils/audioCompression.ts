/**
 * Client-side audio compression utility.
 * Downsamples and re-encodes audio to reduce payload size before sending to API.
 * 
 * Vercel Hobby plan has a 4.5MB request body limit.
 * A 6.8MB MP3 becomes ~9MB in base64 — exceeding the limit.
 * This utility compresses audio to mono 16kHz WAV (speech-optimized)
 * which typically reduces payload by 60-80%.
 */

/**
 * Compress audio by downsampling to an optimal rate for speech recognition.
 * Dynamically selects sample rate to keep output under maxOutputMB.
 * Returns base64-encoded WAV string.
 */
export async function compressAudioForTranscription(
  dataUrl: string,
  maxOutputMB: number = 2.5
): Promise<{ base64: string; mimeType: string; sizeMB: number }> {
  // First, decode to get duration for budget calculation
  const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const response = await fetch(dataUrl);
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer.slice(0));
  tempCtx.close();

  const durationSec = audioBuffer.duration;

  // Budget: maxOutputMB in bytes, divided by (duration * 2 bytes per sample)
  // Gives us the max sample rate we can use
  const maxBytes = maxOutputMB * 1024 * 1024;
  const budgetSampleRate = Math.floor(maxBytes / (durationSec * 2));

  // Clamp between 8000 and 16000 Hz (all speech models work fine with 8kHz+)
  const targetSampleRate = Math.min(16000, Math.max(8000, budgetSampleRate));

  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
    sampleRate: targetSampleRate,
  });

  try {
    // Re-decode with fresh buffer (can't reuse decoded buffer)
    const freshResponse = await fetch(dataUrl);
    const freshArrayBuffer = await freshResponse.arrayBuffer();
    const freshAudioBuffer = await audioCtx.decodeAudioData(freshArrayBuffer);

    // Resample to target rate + mono
    const offlineCtx = new OfflineAudioContext(
      1, // mono
      Math.ceil(freshAudioBuffer.duration * targetSampleRate),
      targetSampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = freshAudioBuffer;
    source.connect(offlineCtx.destination);
    source.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    const monoData = renderedBuffer.getChannelData(0);

    // Encode as WAV
    const wavBlob = encodeWAV(monoData, targetSampleRate);
    const base64 = await blobToBase64(wavBlob);

    return {
      base64,
      mimeType: "audio/wav",
      sizeMB: parseFloat((wavBlob.size / (1024 * 1024)).toFixed(2)),
    };
  } finally {
    audioCtx.close();
  }
}

/**
 * Check if audio needs compression (base64 size > maxMB).
 */
export function needsCompression(base64Data: string, maxMB: number = 3.5): boolean {
  // base64 string length * 0.75 = approximate bytes
  const approxBytes = base64Data.length * 0.75;
  const approxMB = approxBytes / (1024 * 1024);
  return approxMB > maxMB;
}

// ─── Internal Helpers ───────────────────────────────────────────────────

function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // WAV header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, "WAVE");

  // fmt chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample

  // data chunk
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);

  // Write PCM samples (float32 → int16)
  const offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove data URL prefix to get pure base64
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
