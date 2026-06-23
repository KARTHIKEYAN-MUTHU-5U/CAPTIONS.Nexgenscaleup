/**
 * Caption persistence — auto-save/restore transcription from localStorage.
 * Protects against tab crashes during long video exports.
 */

import { CaptionWord, CaptionStyle } from "../types";

const STORAGE_KEY = "captions_suite_backup";
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CaptionBackup {
  words: CaptionWord[];
  style: CaptionStyle;
  fileName: string;
  timestamp: number;
}

/**
 * Save current transcription + style to localStorage.
 * Called automatically before video export starts.
 */
export function saveCaptions(
  words: CaptionWord[],
  style: CaptionStyle,
  fileName: string
): void {
  try {
    const backup: CaptionBackup = {
      words,
      style,
      fileName,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(backup));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

/**
 * Load saved transcription from localStorage.
 * Returns null if no backup exists or if it's older than 24 hours.
 */
export function loadCaptions(): CaptionBackup | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data: CaptionBackup = JSON.parse(raw);
    if (Date.now() - data.timestamp > MAX_AGE_MS) {
      clearCaptions();
      return null;
    }
    if (!data.words || data.words.length === 0) return null;

    return data;
  } catch {
    return null;
  }
}

/**
 * Clear saved backup after successful export or user dismissal.
 */
export function clearCaptions(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Silently ignore
  }
}
