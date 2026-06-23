import { CaptionWord, CaptionStyle } from "../types";

/**
 * Finds the active caption word for a given timestamp.
 * Adheres strictly to:
 * - A word must remain on screen until the next word begins.
 * - During pauses, the previous word must stay visible/not disappear early.
 * - Never clear the caption area just because silence is detected.
 */
export function getActiveWordIdx(words: CaptionWord[], currentTime: number): number {
  if (words.length === 0) return -1;

  // 1. Direct hit: check if current time is exactly within a word's start and end times
  const activeIdx = words.findIndex(w => currentTime >= w.start && currentTime <= w.end);
  if (activeIdx !== -1) {
    return activeIdx;
  }

  // 2. Playback is in a pause after a word ends but before the next word starts
  // "During pauses, the previous word must stay visible and must not disappear early."
  for (let i = 0; i < words.length - 1; i++) {
    if (currentTime > words[i].end && currentTime < words[i + 1].start) {
      return i; // Keep the previous word active
    }
  }

  // 3. Playback is after the very last word
  const lastWord = words[words.length - 1];
  if (currentTime >= lastWord.end) {
    return words.length - 1; // Keep the last word active on screen
  }

  // 4. Playback is before the first word's start
  if (currentTime < words[0].start) {
    return 0; // Default to showing the first word ready
  }

  return 0;
}

/**
 * Draws the active caption word onto the Canvas context with rich custom styling.
 */
export function drawCaptionToCanvas(
  ctx: CanvasRenderingContext2D,
  words: CaptionWord[],
  currentTime: number,
  style: CaptionStyle,
  width: number,
  height: number,
  isTransparent: boolean,
  skipClear: boolean = false
) {
  // Clear canvas (skip when video frame is already drawn as background)
  if (!skipClear) {
    if (isTransparent) {
      ctx.clearRect(0, 0, width, height);
    } else {
      // Rich professional visual studio grid background
      ctx.fillStyle = "#111116"; // Slate dark
      ctx.fillRect(0, 0, width, height);

      // Subtle center guide lines to make the captioning suite look absolute professional
      ctx.strokeStyle = "rgba(63, 63, 70, 0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
    }
  }

  if (words.length === 0) return;

  const activeIdx = getActiveWordIdx(words, currentTime);
  if (activeIdx === -1) return;

  const activeWord = words[activeIdx];
  const wordText = activeWord.word.toUpperCase(); // Bangers looks incredible in all-caps

  // Reset text properties
  ctx.save();

  // Font setup (Bangers font imported in index.css)
  const baseFontSize = style.textSize || 64;
  ctx.font = `${baseFontSize}px "Bangers", Impact, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Compute Adaptive Animation VFX
  let scale = 1.0;
  let offsetX = 0;
  let offsetY = 0;
  let angle = 0;
  let opacity = 1.0;

  if (style.popVfxEnabled) {
    const elapsed = currentTime - activeWord.start;
    const animType = style.animationStyle || "pop";

    if (elapsed >= 0) {
      if (animType === "pop") {
        const popDuration = 0.25;
        if (elapsed <= popDuration) {
          const progress = elapsed / popDuration;
          const peak = Math.sin(progress * Math.PI);
          scale = 1.0 + peak * (0.35 * style.popIntensity);
        }
      } else if (animType === "bounce") {
        // High-engagement elastic bouncy feedback
        const durationLimit = 0.6;
        if (elapsed < durationLimit) {
          const omega = 15 * style.popIntensity;
          const beta = 6;
          scale = 1.0 - Math.exp(-beta * elapsed) * Math.cos(omega * elapsed);
        }
      } else if (animType === "tilt") {
        // High-energy playfulness: scale in + tilt left on onset, then settle
        const tiltDuration = 0.3;
        if (elapsed <= tiltDuration) {
          const t = elapsed / tiltDuration;
          scale = t * 1.15;
          angle = (1.0 - t) * -0.2 * style.popIntensity;
        }
      } else if (animType === "glitch") {
        // Displace the coordinate system randomly early in the word's duration range
        const glitchDuration = 0.3;
        if (elapsed <= glitchDuration) {
          const tick = Math.sin(elapsed * 200 * style.popIntensity);
          if (tick > 0.4) {
            offsetX = tick * 14;
            offsetY = Math.cos(elapsed * 150) * 10;
            scale = 1.2;
          }
        }
      } else if (animType === "zoom_fade") {
        // High-fidelity cinematic entry zoom
        const zoomDuration = 0.35;
        if (elapsed <= zoomDuration) {
          const t = elapsed / zoomDuration;
          scale = 2.0 - t * 1.0;
          opacity = t;
        }
      }
    }
  }

  // Set local alpha for opacity transitions safely
  ctx.globalAlpha = opacity;

  // Set up coordinate center (Centered horizontally and located at the vertical mid-point)
  const cx = width / 2;
  const cy = height / 2;

  ctx.translate(cx + offsetX, cy + offsetY);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  // Measure word dimensions for accurate glow compounding
  const textMetrics = ctx.measureText(wordText);
  const textWidth = textMetrics.width;

  // 1. Draw Glow if configured
  if (style.glowBlur > 0 && style.glowColor) {
    ctx.shadowColor = style.glowColor;
    ctx.shadowBlur = style.glowBlur;
    
    // Fill text multiple times to strengthen the soft emission effect of the glowing neon style
    ctx.fillStyle = style.textColor;
    ctx.fillText(wordText, 0, 0);
    ctx.fillText(wordText, 0, 0);
    
    // Clear shadow configuration so it doesn't pollute subsequent path stages
    ctx.shadowBlur = 0;
  }

  // 2. Draw Shadow if configured (Draw behind)
  if (style.shadowBlur > 0 || style.shadowOffsetX !== 0 || style.shadowOffsetY !== 0) {
    ctx.shadowColor = style.shadowColor;
    ctx.shadowBlur = style.shadowBlur;
    ctx.shadowOffsetX = style.shadowOffsetX;
    ctx.shadowOffsetY = style.shadowOffsetY;
    
    // Render draft shadow behind outline
    ctx.fillStyle = style.textColor;
    ctx.fillText(wordText, 0, 0);
    
    // Restore clean states
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  // 3. Draw Thick Outline
  if (style.outlineWidth > 0 && style.outlineColor) {
    ctx.strokeStyle = style.outlineColor;
    ctx.lineWidth = style.outlineWidth;
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
    ctx.strokeText(wordText, 0, 0);
  }

  // 4. Fill main text layer (To superimpose perfectly on top of outline / shadows)
  ctx.fillStyle = style.textColor;
  ctx.fillText(wordText, 0, 0);

  ctx.restore();
}

/**
 * Converts a CaptionWord list into SRT format string.
 */
export function exportToSRT(words: CaptionWord[]): string {
  let srtContent = "";
  if (words.length === 0) return srtContent;

  // Requirements state: a word remains on-screen until the next word begins.
  // Let's create SRT items representing each word.
  for (let i = 0; i < words.length; i++) {
    const item = words[i];
    const index = i + 1;
    
    // Start of current word
    const startStr = formatSRTTime(item.start);
    
    // End is either when the NEXT word starts, or when current word ends if it's the last word
    const nextStart = (i < words.length - 1) ? words[i + 1].start : item.end;
    const endStr = formatSRTTime(nextStart);

    srtContent += `${index}\n${startStr} --> ${endStr}\n${item.word}\n\n`;
  }

  return srtContent.trim();
}

/**
 * Converts a CaptionWord list into VTT format string.
 */
export function exportToVTT(words: CaptionWord[]): string {
  let vttContent = "WEBVTT\n\n";
  if (words.length === 0) return vttContent.trim();

  for (let i = 0; i < words.length; i++) {
    const item = words[i];
    const startStr = formatVTTTime(item.start);
    const nextStart = (i < words.length - 1) ? words[i + 1].start : item.end;
    const endStr = formatVTTTime(nextStart);

    vttContent += `${startStr} --> ${endStr}\n${item.word}\n\n`;
  }

  return vttContent.trim();
}

/**
 * Converts a CaptionWord list into ASS format string.
 */
export function exportToASS(words: CaptionWord[], style: CaptionStyle): string {
  const header = `[Script Info]
Title: Exact Alignment Subtitles
ScriptType: v4.00+
Collisions: Normal
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Bangers,${style.textSize * 1.5},${colourToASS(style.textColor)},&H000000FF,${colourToASS(style.outlineColor)},${colourToASS(style.shadowColor)},1,0,0,0,100,100,0,0,1,${style.outlineWidth},${style.shadowBlur},2,10,10,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  let events = "";
  for (let i = 0; i < words.length; i++) {
    const item = words[i];
    const startStr = formatASSTime(item.start);
    const nextStart = (i < words.length - 1) ? words[i + 1].start : item.end;
    const endStr = formatASSTime(nextStart);

    // Escape word and make uppercase if matching style
    const val = item.word.toUpperCase();
    events += `Dialogue: 0,${startStr},${endStr},Default,,0,0,0,,${val}\n`;
  }

  return header + events;
}

// Helpers
function formatSRTTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${padZero(hrs, 2)}:${padZero(mins, 2)}:${padZero(secs, 2)},${padZero(ms, 3)}`;
}

function formatVTTTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${padZero(hrs, 2)}:${padZero(mins, 2)}:${padZero(secs, 2)}.${padZero(ms, 3)}`;
}

function formatASSTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100); // centiseconds for ASS

  return `${hrs}:${padZero(mins, 2)}:${padZero(secs, 2)}.${padZero(cs, 2)}`;
}

function padZero(num: number, size: number): string {
  let s = num + "";
  while (s.length < size) s = "0" + s;
  return s;
}

// Convert Hex Color to ASS format color code (&HBBGGRR)
function colourToASS(hex: string): string {
  if (!hex) return "&HFFFFFF";
  let h = hex.replace("#", "");
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  if (h.length === 6) {
    const r = h.substring(0, 2);
    const g = h.substring(2, 4);
    const b = h.substring(4, 6);
    return `&H00${b}${g}${r}`;
  }
  return "&HFFFFFF";
}
