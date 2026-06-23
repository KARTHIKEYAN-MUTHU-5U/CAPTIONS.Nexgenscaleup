import React, { useState, useEffect, useRef } from "react";
import { CaptionWord } from "../types";
import {
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Check,
  Clock,
  Sparkles,
  Save,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  X,
  AlertTriangle,
  Filter
} from "lucide-react";

interface CaptionEditorProps {
  words: CaptionWord[];
  currentTime: number;
  onUpdateWords: (updated: CaptionWord[]) => void;
  onSeek: (time: number) => void;
}

export default function CaptionEditor({
  words,
  currentTime,
  onUpdateWords,
  onSeek,
}: CaptionEditorProps) {
  // Local active copy for draft edits
  const [localWords, setLocalWords] = useState<CaptionWord[]>([]);
  // Whether to push updates instantly or save as draft
  const [autoApply, setAutoApply] = useState<boolean>(false);
  
  // Filter mode to only show low confidence words (under 75%)
  const [filterLowConfidence, setFilterLowConfidence] = useState<boolean>(false);
  
  // Container ref for auto scrolling synchronization
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  
  // Text inline edits state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");

  // Sync state with parent's fresh loads (preset or file loading conversions)
  useEffect(() => {
    setLocalWords(words);
  }, [words]);

  // Check if there are unapplied changes
  const isDirty = JSON.stringify(localWords) !== JSON.stringify(words);

  const triggerChangeAction = (updated: CaptionWord[]) => {
    setLocalWords(updated);
    if (autoApply) {
      onUpdateWords(updated);
    }
  };

  const handleWordTextChange = (index: number, newText: string) => {
    const updated = [...localWords];
    updated[index] = {
      ...updated[index],
      word: newText,
      confidence: 1.0 // Mark as fully confidence-vouchsafed and verified!
    };
    triggerChangeAction(updated);
  };

  const handleStartEdit = (index: number, word: CaptionWord) => {
    setEditingId(index);
    setEditingText(word.word);
  };

  const handleSaveEdit = (index: number) => {
    if (!editingText.trim()) return;
    handleWordTextChange(index, editingText.trim());
    setEditingId(null);
  };

  const handleDeleteWord = (index: number) => {
    const updated = localWords.filter((_, i) => i !== index);
    triggerChangeAction(updated);
  };

  const handleInsertWord = (index: number) => {
    if (localWords.length === 0) return;
    const currentWord = localWords[index];
    const nextWord = localWords[index + 1];
    
    // Position the new word in between or right after the current word
    const start = parseFloat((currentWord.end + 0.05).toFixed(2));
    const end = nextWord 
      ? parseFloat(((currentWord.end + nextWord.start) / 2).toFixed(2))
      : parseFloat((currentWord.end + 0.5).toFixed(2));

    const newWord: CaptionWord = {
      word: "[New]",
      start,
      end,
    };

    const updated = [...localWords];
    updated.splice(index + 1, 0, newWord);
    triggerChangeAction(updated);
  };

  const adjustTiming = (index: number, field: "start" | "end", amount: number) => {
    const updated = [...localWords];
    const target = updated[index];
    let newVal = parseFloat((target[field] + amount).toFixed(2));
    
    if (newVal < 0) newVal = 0;

    // Enforce logic boundaries (start must be < end)
    if (field === "start" && newVal >= target.end) {
      newVal = parseFloat((target.end - 0.05).toFixed(2));
    }
    if (field === "end" && newVal <= target.start) {
      newVal = parseFloat((target.start + 0.05).toFixed(2));
    }

    updated[index] = {
      ...target,
      [field]: newVal,
    };
    triggerChangeAction(updated);
  };

  // Explicitly apply state up to the parent and main rendering loop
  const handleApplyChanges = () => {
    onUpdateWords(localWords);
  };

  // Revert local changes back to the last successfully applied parent state
  const handleDiscardChanges = () => {
    setLocalWords(words);
  };

  // Find active word indexes matching currentTime
  let activeIndex = -1;
  const matchIdx = localWords.findIndex(w => currentTime >= w.start && currentTime <= w.end);
  if (matchIdx !== -1) {
    activeIndex = matchIdx;
  } else {
    // Check pause intervals
    for (let i = 0; i < localWords.length - 1; i++) {
      if (currentTime > localWords[i].end && currentTime < localWords[i + 1].start) {
        activeIndex = i;
        break;
      }
    }
    if (activeIndex === -1 && localWords.length > 0 && currentTime >= localWords[localWords.length - 1].end) {
      activeIndex = localWords.length - 1;
    }
  }

  // Calculate transcription confidence data metrics
  const avgConfidence = localWords.length > 0 
    ? (localWords.reduce((sum, w) => sum + (w.confidence !== undefined ? w.confidence : 1.0), 0) / localWords.length) * 100 
    : 100;

  const uncertainCount = localWords.filter(w => (w.confidence !== undefined ? w.confidence : 1.0) < 0.75).length;

  // Smooth scroll active element into view during real-time synced playback
  useEffect(() => {
    if (activeIndex !== -1 && listContainerRef.current) {
      const container = listContainerRef.current;
      const activeElement = container.querySelector(`[data-word-idx="${activeIndex}"]`);
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }
  }, [activeIndex]);

  return (
    <div className="flex flex-col h-full bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl relative">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 py-3.5 border-b border-zinc-805 bg-zinc-950/60">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
          <div className="flex flex-col">
            <h2 className="text-xs font-extrabold tracking-widest text-zinc-300 font-sans uppercase">
              Time Alignments
            </h2>
            <span className="text-[10px] text-zinc-500 font-sans tracking-wide">
              Tap timings to scrub, or rewrite text segments
            </span>
          </div>
        </div>

        {/* Workflow controls */}
        <div className="flex items-center gap-2.5">
          {/* Auto-apply toggle */}
          <button
            onClick={() => {
              const nextVal = !autoApply;
              setAutoApply(nextVal);
              if (nextVal) {
                onUpdateWords(localWords);
              }
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800/80 transition text-xs select-none cursor-pointer active:scale-95"
            title="Toggle between immediate update or batch save modes"
          >
            <span className="text-zinc-400 font-semibold text-[10px] uppercase">Auto Apply</span>
            {autoApply ? (
              <span className="text-amber-400 font-bold flex items-center gap-1.5 text-[10px]">
                ON <ToggleRight className="w-4 h-4 text-amber-400 fill-amber-400/20" />
              </span>
            ) : (
              <span className="text-zinc-500 font-semibold flex items-center gap-1.5 text-[10px]">
                OFF <ToggleLeft className="w-4 h-4 text-zinc-600" />
              </span>
            )}
          </button>

          <span className="px-2.5 py-1.5 text-[10px] font-mono font-bold tracking-wider rounded-xl bg-zinc-900 text-zinc-400 border border-zinc-800 shrink-0">
            {localWords.length} SEGMENTS
          </span>
        </div>
      </div>

      {/* Confidence Score Summary & Error Filtering HUD */}
      {localWords.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-2.5 bg-zinc-950/40 border-b border-zinc-805 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-zinc-500">Avg Confidence:</span>
              <span className={`font-mono text-xs font-black ${
                avgConfidence >= 90 ? "text-emerald-400" : avgConfidence >= 75 ? "text-amber-400" : "text-rose-400"
              }`}>
                {avgConfidence.toFixed(1)}%
              </span>
            </div>
            
            {uncertainCount > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 font-sans text-[10px] font-bold">
                <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                <span>{uncertainCount} low-prob word{uncertainCount > 1 ? "s" : ""}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterLowConfidence(!filterLowConfidence)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition duration-150 cursor-pointer active:scale-95 ${
                filterLowConfidence
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-400 font-extrabold shadow-sm"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
              title="Filter transcription segments list to only show low confidence words under 75% probability"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{filterLowConfidence ? "Showing Low Prob Only" : "Filter Uncertain (<75%)"}</span>
              {uncertainCount > 0 && !filterLowConfidence && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Unapplied Changes Glowing Notification Bar */}
      {isDirty && !autoApply && (
        <div className="bg-gradient-to-r from-amber-500/10 to-amber-950/10 border-b border-amber-500/30 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="font-sans text-[11px] font-medium">Pending edits found. Save to synchronize viewport rendering.</span>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              onClick={handleDiscardChanges}
              className="px-2.5 py-1 text-[11px] rounded-lg bg-zinc-800 hover:bg-zinc-700 hover:text-zinc-100 text-zinc-400 font-bold transition cursor-pointer active:scale-95"
            >
              Reset
            </button>
            <button
              onClick={handleApplyChanges}
              className="px-3 py-1.5 text-[11px] rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold flex items-center gap-1 shadow-md transition active:scale-95 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Apply Drafts
            </button>
          </div>
        </div>
      )}

      {/* Editor Body */}
      {localWords.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 p-8 text-center text-zinc-500 min-h-[250px]">
          <p className="text-sm font-bold mb-1 uppercase tracking-wider text-zinc-400">Workspace Empty</p>
          <p className="text-xs max-w-xs mx-auto leading-relaxed text-zinc-500">
            Please import an audio track or reload our preset interactive demo to test direct alignment editors.
          </p>
        </div>
      ) : (
        <div
          ref={listContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[440px] min-h-[300px] scrollbar-thin"
        >
          {localWords.map((w, index) => {
            const isActive = index === activeIndex;
            const isEditing = editingId === index;
            const confidence = w.confidence !== undefined ? w.confidence : 1.0;
            const isLowConfidence = confidence < 0.75;

            // Filter out non-low confidence words if Filter Uncertain toggle is on
            if (filterLowConfidence && !isLowConfidence) {
              return null;
            }

            let containerStyleClass = "";
            if (isActive) {
              containerStyleClass = "bg-amber-500/10 border-amber-500/30 border-l-[3px] border-l-amber-500 shadow-[0_4px_12px_rgba(245,158,11,0.03)]";
            } else if (isLowConfidence) {
              containerStyleClass = "bg-rose-500/5 border-rose-500/20 border-l-[3px] border-l-rose-500/70 hover:bg-rose-500/10 hover:border-rose-500/40";
            } else {
              containerStyleClass = "bg-zinc-950/20 border-zinc-800/50 hover:bg-zinc-800/10 hover:border-zinc-800";
            }

            return (
              <div
                key={index}
                data-word-idx={index}
                className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-xl transition-all duration-150 border ${containerStyleClass}`}
              >
                {/* Word ID & Navigation Trigger */}
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => onSeek(w.start)}
                    className={`flex items-center justify-center w-7 h-7 text-[10px] font-mono rounded-lg transition-all cursor-pointer ${
                      isActive
                        ? "bg-amber-500 text-black font-extrabold scale-105 shadow-md shadow-amber-500/20"
                        : "bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                    }`}
                    title="Seek video cursor to start index"
                  >
                    {(index + 1).toString().padStart(2, "0")}
                  </button>
 
                  <div className="flex-1">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEdit(index);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="px-2.5 py-1 bg-zinc-950 text-zinc-100 border border-zinc-700 text-xs font-semibold rounded-lg focus:outline-none focus:border-amber-500 font-sans max-w-[150px] w-full"
                          autoFocus
                          placeholder="word"
                        />
                        <button
                          onClick={() => handleSaveEdit(index)}
                          className="p-1 text-green-400 bg-green-500/10 rounded-md hover:bg-green-500/20 transition cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 text-rose-450 bg-rose-500/10 rounded-md hover:bg-rose-500/20 transition cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group/word">
                        <span
                          onClick={() => handleStartEdit(index, w)}
                          className={`font-sans text-sm font-semibold tracking-wide cursor-pointer py-0.5 rounded px-1 -ml-1 transition-all ${
                            isActive 
                              ? "text-amber-400 hover:bg-amber-500/20" 
                              : isLowConfidence
                                ? "text-rose-400 hover:bg-rose-500/10"
                                : "text-zinc-200 hover:bg-zinc-800 hover:text-zinc-100"
                          }`}
                          title="Double tap to modify spelled text"
                        >
                          {w.word}
                        </span>

                        {/* Interactive Confidence Score Indicator Pill */}
                        <div
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold cursor-help select-none shrink-0 ${
                            confidence >= 0.90 
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10" 
                              : confidence >= 0.75 
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/30 animate-pulse"
                          }`}
                          title={`Clarity score: ${(confidence * 100).toFixed(0)}%. ${
                            isLowConfidence 
                              ? "Transcribed with lower confidence. Tap the word text or pencil to correct spelling." 
                              : "Transcribed with high probability."
                          }`}
                        >
                          {isLowConfidence && <AlertTriangle className="w-2.5 h-2.5 text-rose-400 shrink-0" />}
                          <span>{(confidence * 100).toFixed(0)}%</span>
                        </div>

                        <button
                          onClick={() => handleStartEdit(index, w)}
                          className="p-1 opacity-0 group-hover/word:opacity-100 text-zinc-500 hover:text-amber-400 transition cursor-pointer"
                          title="Edit transcription spelling"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timing Alignment Controls row */}
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                  {/* Start time bounds slider trigger */}
                  <div className="flex items-center gap-1.5 bg-zinc-950/60 p-1 rounded-xl border border-zinc-805">
                    <span className="text-[10px] font-mono text-zinc-500 font-semibold uppercase px-1">IN:</span>
                    <button
                      onClick={() => adjustTiming(index, "start", -0.05)}
                      className="p-1 hover:bg-zinc-800 rounded disabled:opacity-30 cursor-pointer text-zinc-400 active:scale-90 transition"
                      title="-50ms shift"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] font-mono text-zinc-300 font-semibold min-w-[34px] text-center">
                      {w.start.toFixed(2)}s
                    </span>
                    <button
                      onClick={() => adjustTiming(index, "start", 0.05)}
                      className="p-1 hover:bg-zinc-800 rounded disabled:opacity-30 cursor-pointer text-zinc-400 active:scale-90 transition"
                      title="+50ms shift"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* End time bounds slider trigger */}
                  <div className="flex items-center gap-1.5 bg-zinc-950/60 p-1 rounded-xl border border-zinc-805">
                    <span className="text-[10px] font-mono text-zinc-500 font-semibold uppercase px-1">OUT:</span>
                    <button
                      onClick={() => adjustTiming(index, "end", -0.05)}
                      className="p-1 hover:bg-zinc-800 rounded disabled:opacity-30 cursor-pointer text-zinc-400 active:scale-90 transition"
                      title="-50ms shift"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] font-mono text-zinc-300 font-semibold min-w-[34px] text-center">
                      {w.end.toFixed(2)}s
                    </span>
                    <button
                      onClick={() => adjustTiming(index, "end", 0.05)}
                      className="p-1 hover:bg-zinc-800 rounded disabled:opacity-30 cursor-pointer text-zinc-400 active:scale-90 transition"
                      title="+50ms shift"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Utility Insertion & Deletions */}
                  <div className="flex items-center gap-1.5 pl-1.5 sm:border-l border-zinc-800">
                    <button
                      onClick={() => handleInsertWord(index)}
                      className="p-1.5 hover:bg-emerald-500/10 rounded-lg text-zinc-500 hover:text-emerald-400 transition cursor-pointer"
                      title="Insert empty token following this"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteWord(index)}
                      className="p-1.5 hover:bg-rose-500/10 rounded-lg text-zinc-600 hover:text-rose-400 transition cursor-pointer"
                      title="Delete this token permanently"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Big "Apply Changes" Footer Trigger when Dirty & not auto-apply */}
      {isDirty && !autoApply && (
        <div className="px-5 py-3.5 border-t border-zinc-855 bg-zinc-950/40 flex items-center justify-between gap-3">
          <span className="text-[10px] text-amber-200/80 font-mono font-bold uppercase tracking-wider">
            Pending segment updates: {localWords.length} items
          </span>
          <button
            onClick={handleApplyChanges}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-[11px] tracking-wider uppercase flex items-center gap-1.5 shadow-lg shadow-amber-500/10 transition duration-150 active:scale-95 cursor-pointer animate-pulse"
          >
            <Sparkles className="w-4 h-4" />
            Apply Changes
          </button>
        </div>
      )}
    </div>
  );
}
