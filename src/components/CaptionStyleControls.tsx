import React, { useState } from "react";
import { CaptionStyle } from "../types";
import { Sparkles, Palette, ZoomIn, Sliders, Type, Layers, Compass, Play } from "lucide-react";

interface CaptionStyleControlsProps {
  style: CaptionStyle;
  onChangeStyle: (newStyle: CaptionStyle) => void;
}

type TabType = "presets" | "colors" | "depth" | "motion";

export default function CaptionStyleControls({
  style,
  onChangeStyle,
}: CaptionStyleControlsProps) {
  const [activeTab, setActiveTab] = useState<TabType>("presets");

  const updateStyle = <K extends keyof CaptionStyle>(key: K, value: CaptionStyle[K]) => {
    onChangeStyle({
      ...style,
      [key]: value,
    });
  };

  // Color preset hooks - vibrant, modern influencer-style combinations
  const presets = [
    { name: "Neon Yellow", text: "#FFFF00", glow: "#FFFF00", outline: "#000000", shadow: "#000000" },
    { name: "Polar Ice", text: "#00F0FF", glow: "#00F0FF", outline: "#010F17", shadow: "#010F17" },
    { name: "Hyper Pink", text: "#FF007F", glow: "#FF007F", outline: "#16000B", shadow: "#16000B" },
    { name: "Clean Pearl", text: "#FFFFFF", glow: "#FFFFFF", outline: "#000000", shadow: "#1A1A1A" },
    { name: "Saber Green", text: "#39FF14", glow: "#39FF14", outline: "#0A1402", shadow: "#0A1402" },
    { name: "Solar Orange", text: "#FF6600", glow: "#FF6600", outline: "#0F0600", shadow: "#0F0600" },
  ];

  const applyPreset = (preset: typeof presets[number]) => {
    onChangeStyle({
      ...style,
      textColor: preset.text,
      outlineColor: preset.outline,
      shadowColor: preset.shadow,
      glowColor: preset.glow,
      glowBlur: 14,
      outlineWidth: 9,
      shadowBlur: 8,
      shadowOffsetX: 6,
      shadowOffsetY: 6,
    });
  };

  return (
    <div className="flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header Widget */}
      <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-amber-500" />
          <h2 className="text-xs font-bold text-zinc-100 uppercase tracking-widest font-sans">
            Style Configurator
          </h2>
        </div>
        <span className="text-[9px] font-mono font-bold tracking-wider px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md">
          PRESETS ACTIVE
        </span>
      </div>

      {/* Tabs list strip */}
      <div className="flex bg-zinc-950 px-3 py-1 border-b border-zinc-800 gap-1 overflow-x-auto scrollbar-none">
        {(["presets", "colors", "depth", "motion"] as const).map((tab) => {
          const isActive = activeTab === tab;
          let label = "";
          let Icon = Sparkles;
          
          if (tab === "presets") { label = "Presets"; Icon = Sparkles; }
          if (tab === "colors") { label = "Colors"; Icon = Type; }
          if (tab === "depth") { label = "Shadows"; Icon = Layers; }
          if (tab === "motion") { label = "VFX Motion"; Icon = Compass; }

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer active:scale-95 ${
                isActive
                  ? "bg-zinc-800 text-amber-400"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-amber-500" : "text-zinc-500"}`} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab contents block */}
      <div className="p-5 min-h-[290px]">
        {activeTab === "presets" && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block font-sans mb-1">
                Influence Templates
              </span>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Apply professionally tailored subtitle palettes optimized for video readability and engagement across social channels with a single tap.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => applyPreset(p)}
                  className="flex items-center justify-between p-3 border border-zinc-800 bg-zinc-950/20 hover:bg-zinc-950/60 hover:border-zinc-750 rounded-xl transition duration-150 active:scale-95 text-left group"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-bold font-sans text-zinc-300 group-hover:text-zinc-100 truncate">
                      {p.name}
                    </span>
                    <span className="text-[9px] font-mono text-zinc-500">
                      Glow {p.text}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-inner" style={{ backgroundColor: p.text }} />
                    <div className="w-2.5 h-2.5 rounded-full border border-black/40 shadow-inner -ml-2" style={{ backgroundColor: p.glow }} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === "colors" && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block font-sans mb-1">
                Color Harmonizer
              </span>
              <p className="text-[11px] text-zinc-500 leading-relaxed mb-3">
                Fine tune active token colors, stroke outlines, and back-glow radiance configurations representing your video palette.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Text Fill */}
              <div className="space-y-1.5 bg-zinc-950/40 p-3 rounded-xl border border-zinc-800/80">
                <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase block font-sans">
                  Active Text Fill
                </span>
                <div className="flex items-center gap-3">
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-zinc-800 shrink-0 cursor-pointer shadow-md bg-zinc-900 flex items-center justify-center">
                    <input
                      type="color"
                      value={style.textColor}
                      onChange={(e) => updateStyle("textColor", e.target.value)}
                      className="absolute inset-0 w-full h-full scale-150 cursor-pointer opacity-100 bg-transparent border-0"
                    />
                  </div>
                  <input
                    type="text"
                    value={style.textColor.toUpperCase()}
                    onChange={(e) => updateStyle("textColor", e.target.value)}
                    className="w-full bg-transparent border-b border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 transition focus:outline-none text-xs font-mono text-zinc-200 font-medium"
                  />
                </div>
              </div>

              {/* Outline Color */}
              <div className="space-y-1.5 bg-zinc-950/40 p-3 rounded-xl border border-zinc-800/80">
                <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase block font-sans">
                  Outer Edge Outline
                </span>
                <div className="flex items-center gap-3">
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-zinc-800 shrink-0 cursor-pointer shadow-md bg-zinc-900 flex items-center justify-center">
                    <input
                      type="color"
                      value={style.outlineColor}
                      onChange={(e) => updateStyle("outlineColor", e.target.value)}
                      className="absolute inset-0 w-full h-full scale-150 cursor-pointer opacity-100 bg-transparent border-0"
                    />
                  </div>
                  <input
                    type="text"
                    value={style.outlineColor.toUpperCase()}
                    onChange={(e) => updateStyle("outlineColor", e.target.value)}
                    className="w-full bg-transparent border-b border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 transition focus:outline-none text-xs font-mono text-zinc-200 font-medium"
                  />
                </div>
              </div>

              {/* Glow Color */}
              <div className="space-y-1.5 bg-zinc-950/40 p-3 rounded-xl border border-zinc-800/80">
                <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase block font-sans">
                  Ambient Glow Hue
                </span>
                <div className="flex items-center gap-3">
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-zinc-800 shrink-0 cursor-pointer shadow-md bg-zinc-900 flex items-center justify-center">
                    <input
                      type="color"
                      value={style.glowColor}
                      onChange={(e) => updateStyle("glowColor", e.target.value)}
                      className="absolute inset-0 w-full h-full scale-150 cursor-pointer opacity-100 bg-transparent border-0"
                    />
                  </div>
                  <input
                    type="text"
                    value={style.glowColor.toUpperCase()}
                    onChange={(e) => updateStyle("glowColor", e.target.value)}
                    className="w-full bg-transparent border-b border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 transition focus:outline-none text-xs font-mono text-zinc-200 font-medium"
                  />
                </div>
              </div>

              {/* Shadow Color */}
              <div className="space-y-1.5 bg-zinc-950/40 p-3 rounded-xl border border-zinc-800/80">
                <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase block font-sans">
                  Hard Drop Shadow
                </span>
                <div className="flex items-center gap-3">
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-zinc-800 shrink-0 cursor-pointer shadow-md bg-zinc-900 flex items-center justify-center">
                    <input
                      type="color"
                      value={style.shadowColor}
                      onChange={(e) => updateStyle("shadowColor", e.target.value)}
                      className="absolute inset-0 w-full h-full scale-150 cursor-pointer opacity-100 bg-transparent border-0"
                    />
                  </div>
                  <input
                    type="text"
                    value={style.shadowColor.toUpperCase()}
                    onChange={(e) => updateStyle("shadowColor", e.target.value)}
                    className="w-full bg-transparent border-b border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 transition focus:outline-none text-xs font-mono text-zinc-200 font-medium"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "depth" && (
          <div className="space-y-4 animate-fadeIn">
            {/* Font Sizing */}
            <div className="bg-zinc-950/20 p-4 border border-zinc-800/50 rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 font-sans uppercase">
                  <ZoomIn className="w-3.5 h-3.5 text-amber-500" />
                  Font Size
                </span>
                <span className="text-[10px] font-mono text-amber-400 bg-zinc-900 px-2.5 py-0.5 border border-zinc-800 rounded font-semibold">
                  {style.textSize}px
                </span>
              </div>
              <input
                type="range"
                min="32"
                max="128"
                step="1"
                value={style.textSize}
                onChange={(e) => updateStyle("textSize", parseInt(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Stroke Outline Depth */}
            <div className="bg-zinc-950/20 p-4 border border-zinc-800/50 rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 font-sans uppercase">
                  <Sliders className="w-3.5 h-3.5 text-amber-500" />
                  Stroke Weight (Edge)
                </span>
                <span className="text-[10px] font-mono text-amber-400 bg-zinc-900 px-2.5 py-0.5 border border-zinc-800 rounded font-semibold">
                  {style.outlineWidth}px
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                step="0.5"
                value={style.outlineWidth}
                onChange={(e) => updateStyle("outlineWidth", parseFloat(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Dual Slider Row: Glow Blur + Shadow Blur */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-zinc-950/20 p-3.5 border border-zinc-800/50 rounded-xl space-y-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide font-sans">
                    Radiance Glow Radius
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500">
                    {style.glowBlur}px
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  step="1"
                  value={style.glowBlur}
                  onChange={(e) => updateStyle("glowBlur", parseInt(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              <div className="bg-zinc-950/20 p-3.5 border border-zinc-800/50 rounded-xl space-y-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide font-sans">
                    Contrast Shadow Blur
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500">
                    {style.shadowBlur}px
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  step="1"
                  value={style.shadowBlur}
                  onChange={(e) => updateStyle("shadowBlur", parseInt(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>
            </div>
            
            {/* Shadow Depth Offset */}
            <div className="bg-zinc-950/20 p-4 border border-zinc-800/50 rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-zinc-300 font-sans uppercase">
                  Shadow Offset
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  X: {style.shadowOffsetX}px | Y: {style.shadowOffsetY}px
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="1"
                value={style.shadowOffsetX}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  onChangeStyle({
                    ...style,
                    shadowOffsetX: val,
                    shadowOffsetY: val,
                  });
                }}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>
        )}

        {activeTab === "motion" && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block font-sans mb-1">
                Visual Active Onsets
              </span>
              <p className="text-[11px] text-zinc-500 leading-relaxed mb-3">
                Power dynamic scale highlights as sound-waves cross each transcript word token, ensuring perfect vertical video pacing.
              </p>
            </div>

            <div className="bg-zinc-950/30 p-4 border border-zinc-800 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                  <span className="text-xs font-bold text-zinc-200 font-sans uppercase block">
                    Active Onset Animations
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={style.popVfxEnabled}
                    onChange={(e) => updateStyle("popVfxEnabled", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 peer-checked:after:bg-zinc-950"></div>
                </label>
              </div>

              {style.popVfxEnabled ? (
                <div className="space-y-4 pt-3.5 border-t border-zinc-800/80 animate-fadeIn">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                      VFX Highlighter Presets
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(["pop", "bounce", "tilt", "glitch", "zoom_fade"] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => updateStyle("animationStyle", type)}
                          className={`py-2 px-1 text-[10px] font-sans font-extrabold tracking-wider uppercase border rounded-lg transition-all active:scale-95 cursor-pointer ${
                            (style.animationStyle || "pop") === type
                              ? "bg-amber-500 border-amber-600 text-black shadow-md shadow-amber-500/10"
                              : "bg-zinc-900 border-zinc-850 text-zinc-400 hover:text-zinc-200 hover:border-zinc-750"
                          }`}
                        >
                          {type.replace("_", " ")}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between items-center text-[10px] font-sans">
                      <span className="text-zinc-400 font-semibold uppercase tracking-wider">Onset Impact Scale</span>
                      <span className="text-amber-400 font-mono font-bold">({style.popIntensity}x)</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.5"
                      step="0.1"
                      value={style.popIntensity}
                      onChange={(e) => updateStyle("popIntensity", parseFloat(e.target.value))}
                      className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 border border-dashed border-zinc-800/80 rounded-xl text-center text-zinc-500/80 text-[11px]">
                  Visual highlighters disabled. Word highlights will remain clean but transition statically.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
