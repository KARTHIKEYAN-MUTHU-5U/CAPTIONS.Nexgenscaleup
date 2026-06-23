import React, { useRef, useMemo, useEffect } from "react";
import { Play, Pause, ChevronRight, Volume2 } from "lucide-react";

interface WaveformVisualizerProps {
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  onPlayToggle: () => void;
  onSeek: (time: number) => void;
  playbackRate: number;
  onChangePlaybackRate: (rate: number) => void;
}

export default function WaveformVisualizer({
  duration,
  currentTime,
  isPlaying,
  onPlayToggle,
  onSeek,
  playbackRate,
  onChangePlaybackRate,
}: WaveformVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate random static waveform peaks that look beautiful and stay stable for a given file
  const waveformBars = useMemo(() => {
    const bars: number[] = [];
    // We render some rhythmic speech patterns with pauses
    let speechSeed = 0.5;
    for (let i = 0; i < 90; i++) {
      if (i % 15 < 3) {
        // Pauses (representing silent intervals)
        bars.push(Math.random() * 4 + 2);
      } else {
        // Active speaking syllables
        speechSeed = Math.sin(i / 3) * 15 + Math.random() * 18 + 12;
        bars.push(Math.max(4, speechSeed));
      }
    }
    return bars;
  }, []);

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || duration <= 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const pct = Math.max(0, Math.min(1, clickX / width));
    onSeek(pct * duration);
  };

  const handleDragScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return; // Only trigger if left mouse is active
    handleScrub(e);
  };

  const pctProgress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Format second timings beautifully
  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-center gap-5 shadow-xl">
      {/* Play/Pause round trigger */}
      <button
        onClick={onPlayToggle}
        disabled={duration <= 0}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 cursor-pointer disabled:opacity-40 ${
          isPlaying
            ? "bg-amber-500 text-black hover:bg-amber-400"
            : "bg-zinc-100 text-black hover:bg-white"
        }`}
      >
        {isPlaying ? (
          <Pause className="w-5.5 h-5.5 fill-current" />
        ) : (
          <Play className="w-5.5 h-5.5 fill-current ml-0.5" />
        )}
      </button>

      {/* Waveform Scrubber Column */}
      <div className="flex-1 w-full space-y-2">
        <div className="flex justify-between items-center text-xs text-zinc-400 font-mono">
          <span className="font-semibold text-zinc-300">{formatTime(currentTime)}</span>
          <span className="text-zinc-500">Live Speech Waveform</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Waveform Area */}
        <div
          ref={containerRef}
          onClick={handleScrub}
          onMouseMove={handleDragScrub}
          className={`relative h-14 bg-zinc-950 rounded-xl overflow-hidden cursor-ew-resize border border-zinc-800 transition ${
            duration <= 0 ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          {/* Waveform drawing */}
          <div className="absolute inset-0 flex items-center justify-between px-3">
            {waveformBars.map((val, idx) => {
              const barPct = (idx / waveformBars.length) * 100;
              const isFilled = barPct <= pctProgress;

              return (
                <div
                  key={idx}
                  className="w-[3px] rounded-full transition-colors duration-150"
                  style={{
                    height: `${val}%`,
                    backgroundColor: isFilled ? "#f59e0b" : "#27272a", // Amber filled vs Zinc unfilled
                  }}
                />
              );
            })}
          </div>

          {/* Active playhead line marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10 pointers-events-none"
            style={{ left: `${pctProgress}%` }}
          />
        </div>
      </div>

      {/* Speed rate chooser / status indicators */}
      <div className="flex items-center gap-3 w-full md:w-auto md:border-l border-zinc-800 md:pl-5 self-stretch justify-center">
        <div className="flex flex-col gap-1 items-center md:items-start">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-sans flex items-center gap-1">
            <Volume2 className="w-3.5 h-3.5 text-zinc-400" />
            Playback Rate
          </span>
          <div className="flex items-center gap-1.5 bg-zinc-950 px-2 py-1.5 rounded-lg border border-zinc-800">
            {[1.0, 1.25, 1.5, 2.0].map((rate) => (
              <button
                key={rate}
                onClick={() => onChangePlaybackRate(rate)}
                className={`px-2 py-1 text-[11px] font-semibold rounded-md font-sans transition-all active:scale-95 ${
                  playbackRate === rate
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
