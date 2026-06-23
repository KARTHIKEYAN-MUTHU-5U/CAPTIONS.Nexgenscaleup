export interface CaptionWord {
  id?: string; // unique identification for rendering edits
  word: string;
  start: number;
  end: number;
  confidence?: number; // float representing confidence score between 0.0 and 1.0 (or percentage 0..100)
}

export interface CaptionStyle {
  textColor: string;
  outlineColor: string;
  outlineWidth: number; // in pixels
  shadowColor: string;
  shadowBlur: number; // in pixels
  shadowOffsetX: number; // in pixels
  shadowOffsetY: number; // in pixels
  glowColor: string;
  glowBlur: number; // in pixels
  textSize: number; // base scale factor or font size in pixels
  popVfxEnabled: boolean;
  popIntensity: number; // 0.5 to 2.0 factor
  animationStyle?: "pop" | "bounce" | "tilt" | "glitch" | "zoom_fade";
}

export interface AudioTrackInfo {
  name: string;
  size: number;
  type: string;
  duration: number;
  dataUrl: string; // Base64 data url for playing locally
}
