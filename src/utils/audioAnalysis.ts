/**
 * Client-side audio analysis utilities.
 * Provides onset detection, timestamp refinement, silence trimming,
 * and audio quality estimation — all running in the browser at zero cost.
 */

export interface OnsetResult {
  /** Onset times in seconds */
  onsets: number[];
  /** Total duration of the audio in seconds */
  duration: number;
}

/**
 * Detect energy onsets (speech start points) from an AudioBuffer.
 * Uses a simple energy threshold with adaptive noise floor.
 */
export function detectOnsets(
  audioBuffer: AudioBuffer,
  options: { frameMs?: number; threshold?: number } = {}
): OnsetResult {
  const { frameMs = 10, threshold = 0.015 } = options;
  const data = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const frameSize = Math.floor(sampleRate * (frameMs / 1000));
  const onsets: number[] = [];

  let prevEnergy = 0;
  // Adaptive noise floor from first 100ms
  let noiseFloor = 0;
  const noiseFrames = Math.floor(sampleRate * 0.1);
  for (let i = 0; i < Math.min(noiseFrames, data.length); i++) {
    noiseFloor += data[i] * data[i];
  }
  noiseFloor = noiseFrames > 0 ? noiseFloor / noiseFrames : 0;

  const adaptiveThreshold = Math.max(threshold, noiseFloor * 3);

  for (let i = 0; i < data.length; i += frameSize) {
    let energy = 0;
    const end = Math.min(i + frameSize, data.length);
    for (let j = i; j < end; j++) {
      energy += data[j] * data[j];
    }
    energy /= (end - i);

    // Onset = energy rises above threshold from below
    if (energy > adaptiveThreshold && prevEnergy < adaptiveThreshold * 0.5) {
      const timeSec = i / sampleRate;
      // Minimum gap between onsets: 80ms (prevents double-triggers)
      if (onsets.length === 0 || timeSec - onsets[onsets.length - 1] > 0.08) {
        onsets.push(parseFloat(timeSec.toFixed(3)));
      }
    }
    prevEnergy = energy;
  }

  return {
    onsets,
    duration: audioBuffer.duration,
  };
}

/**
 * Snap transcription word timestamps to nearest detected audio onset.
 * This refines imprecise timestamps from any source (Whisper, Groq, etc.)
 * to align precisely with actual speech energy in the audio.
 *
 * @param words - Array of caption words with start/end times
 * @param onsets - Detected onset times from detectOnsets()
 * @param maxDriftSec - Maximum allowed drift from original timestamp (default 150ms)
 * @returns Words with refined start timestamps
 */
export function snapTimestampsToOnsets(
  words: Array<{ word: string; start: number; end: number; confidence?: number }>,
  onsets: number[],
  maxDriftSec: number = 0.15
): Array<{ word: string; start: number; end: number; confidence?: number }> {
  if (onsets.length === 0 || words.length === 0) return words;

  return words.map((w, i) => {
    // Find nearest onset to this word's start time
    let nearest = onsets[0];
    let nearestDist = Math.abs(onsets[0] - w.start);

    for (const onset of onsets) {
      const dist = Math.abs(onset - w.start);
      if (dist < nearestDist) {
        nearest = onset;
        nearestDist = dist;
      }
      // Early exit: onsets are sorted, if we're past the word start + maxDrift, stop looking
      if (onset > w.start + maxDriftSec) break;
    }

    const snappedStart = nearestDist <= maxDriftSec ? nearest : w.start;

    // Adjust end proportionally
    const originalDuration = w.end - w.start;
    const snappedEnd = snappedStart + originalDuration;

    // Ensure non-overlapping with next word
    const nextStart = i < words.length - 1 ? words[i + 1].start : Infinity;
    const clampedEnd = Math.min(snappedEnd, nextStart);

    return {
      ...w,
      start: parseFloat(snappedStart.toFixed(3)),
      end: parseFloat(Math.max(snappedStart + 0.05, clampedEnd).toFixed(3)),
    };
  });
}

/**
 * Estimate audio quality (Signal-to-Noise Ratio approximation).
 * Used for adaptive routing: clean audio → cheap engine, noisy → best engine.
 *
 * Returns: "clean" (SNR > 20), "moderate" (10-20), or "noisy" (< 10)
 */
export function estimateAudioQuality(
  audioBuffer: AudioBuffer
): "clean" | "moderate" | "noisy" {
  const data = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;

  // Analyze first 500ms as "noise" reference
  const noiseLen = Math.min(Math.floor(sampleRate * 0.5), data.length);
  let noiseEnergy = 0;
  for (let i = 0; i < noiseLen; i++) {
    noiseEnergy += data[i] * data[i];
  }
  noiseEnergy /= noiseLen;

  // Analyze the loudest 500ms section as "signal" reference
  const frameSize = Math.floor(sampleRate * 0.05); // 50ms frames
  let maxEnergy = 0;
  for (let i = 0; i < data.length; i += frameSize) {
    let energy = 0;
    const end = Math.min(i + frameSize, data.length);
    for (let j = i; j < end; j++) {
      energy += data[j] * data[j];
    }
    energy /= (end - i);
    if (energy > maxEnergy) maxEnergy = energy;
  }

  // Approximate SNR in dB
  if (noiseEnergy <= 0) return "clean";
  const snr = 10 * Math.log10(maxEnergy / noiseEnergy);

  if (snr > 20) return "clean";
  if (snr > 10) return "moderate";
  return "noisy";
}

/**
 * Detect leading and trailing silence boundaries.
 * Returns the start and end times of actual speech content.
 */
export function detectSpeechBounds(
  audioBuffer: AudioBuffer,
  threshold: number = 0.01
): { speechStart: number; speechEnd: number } {
  const data = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const frameSize = Math.floor(sampleRate * 0.02); // 20ms frames

  let speechStart = 0;
  let speechEnd = audioBuffer.duration;

  // Find first frame above threshold
  for (let i = 0; i < data.length; i += frameSize) {
    let energy = 0;
    const end = Math.min(i + frameSize, data.length);
    for (let j = i; j < end; j++) {
      energy += data[j] * data[j];
    }
    energy /= (end - i);
    if (energy > threshold) {
      speechStart = Math.max(0, (i / sampleRate) - 0.05); // 50ms buffer
      break;
    }
  }

  // Find last frame above threshold (scan backward)
  for (let i = data.length - frameSize; i >= 0; i -= frameSize) {
    let energy = 0;
    const end = Math.min(i + frameSize, data.length);
    for (let j = i; j < end; j++) {
      energy += data[j] * data[j];
    }
    energy /= (end - i);
    if (energy > threshold) {
      speechEnd = Math.min(audioBuffer.duration, (i + frameSize) / sampleRate + 0.05);
      break;
    }
  }

  return { speechStart, speechEnd };
}
