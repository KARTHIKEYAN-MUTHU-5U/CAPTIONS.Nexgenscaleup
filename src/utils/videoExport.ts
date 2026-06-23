/**
 * Video Export Utilities — FFmpeg.wasm for container conversion + audio extraction.
 * 
 * FFmpeg is lazy-loaded on-demand (~31MB, cached by service worker).
 * ONLY used for:
 *   1. WebM → MP4 container remux (instant, no re-encoding)
 *   2. Audio extraction from exotic video formats (MKV, AVI)
 * 
 * The actual subtitle burning uses Canvas + MediaRecorder (hardware-accelerated).
 */

import type { FFmpeg } from "@ffmpeg/ffmpeg";

const CDN_PRIMARY = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";
const CDN_FALLBACK = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

/**
 * Lazy-load FFmpeg singleton. Downloads ~31MB WASM on first call, cached thereafter.
 */
async function getFFmpeg(onLog?: (msg: string) => void): Promise<FFmpeg> {
  if (ffmpegInstance?.loaded) return ffmpegInstance;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const { toBlobURL } = await import("@ffmpeg/util");

    const ffmpeg = new FFmpeg();

    if (onLog) {
      ffmpeg.on("log", ({ message }) => onLog(message));
    }

    // Try primary CDN, fallback to secondary
    try {
      await ffmpeg.load({
        coreURL: await toBlobURL(`${CDN_PRIMARY}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${CDN_PRIMARY}/ffmpeg-core.wasm`, "application/wasm"),
      });
    } catch {
      await ffmpeg.load({
        coreURL: await toBlobURL(`${CDN_FALLBACK}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${CDN_FALLBACK}/ffmpeg-core.wasm`, "application/wasm"),
      });
    }

    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  return loadPromise;
}

/**
 * Remux WebM (H.264 or VP9) to MP4 container.
 * No re-encoding — instant, lossless container swap.
 * ~2-5 seconds regardless of video length.
 */
export async function remuxToMp4(
  webmBlob: Blob,
  onProgress?: (msg: string) => void
): Promise<Blob> {
  onProgress?.("Loading video processing engine...");
  const ffmpeg = await getFFmpeg();
  const { fetchFile } = await import("@ffmpeg/util");

  onProgress?.("Converting to MP4...");
  await ffmpeg.writeFile("input.webm", await fetchFile(webmBlob));

  try {
    await ffmpeg.exec([
      "-i", "input.webm",
      "-c", "copy",
      "-movflags", "+faststart", // Optimize for web streaming
      "output.mp4",
    ]);

    const data = await ffmpeg.readFile("output.mp4");
    const mp4Blob = new Blob([data], { type: "video/mp4" });

    // Cleanup virtual filesystem
    await ffmpeg.deleteFile("input.webm");
    await ffmpeg.deleteFile("output.mp4");

    onProgress?.("MP4 ready!");
    return mp4Blob;
  } catch (err: unknown) {
    // Cleanup on failure
    try { await ffmpeg.deleteFile("input.webm"); } catch { /* noop */ }
    try { await ffmpeg.deleteFile("output.mp4"); } catch { /* noop */ }

    // If remux fails (VP9 in MP4 incompatibility), return original WebM
    console.warn("WebM→MP4 remux failed, returning WebM:", err);
    onProgress?.("MP4 conversion failed — downloading as WebM");
    return webmBlob;
  }
}

/**
 * Extract audio from video file when browser's AudioContext can't decode the format.
 * Used as fallback for MKV, AVI, WMV containers.
 * Returns a base64 data URL of WAV audio (16kHz mono, optimal for speech recognition).
 */
export async function extractAudioFromVideo(
  videoFile: File,
  onProgress?: (msg: string) => void
): Promise<string> {
  onProgress?.("Loading video processing engine...");
  const ffmpeg = await getFFmpeg();
  const { fetchFile } = await import("@ffmpeg/util");

  onProgress?.("Extracting audio track...");
  await ffmpeg.writeFile("input_video", await fetchFile(videoFile));

  await ffmpeg.exec([
    "-i", "input_video",
    "-vn",           // No video
    "-ar", "16000",  // 16kHz sample rate (optimal for speech recognition)
    "-ac", "1",      // Mono
    "-f", "wav",     // WAV format
    "audio.wav",
  ]);

  const data = await ffmpeg.readFile("audio.wav");

  // Cleanup
  await ffmpeg.deleteFile("input_video");
  await ffmpeg.deleteFile("audio.wav");

  // Convert to base64 data URL
  const uint8 = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
  const blob = new Blob([uint8], { type: "audio/wav" });
  
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
