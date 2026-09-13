import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { ForwardStep } from '../../types/model';

interface ControlsProps {
  steps: ForwardStep[];
  currentStepIndex: number;
  isPlaying: boolean;
  onPrevStep: () => void;
  onNextStep: () => void;
  onTogglePlay: () => void;
  onReset: () => void;
  onSelectStep: (index: number) => void;
  onToggleInspector?: () => void;
  isInspectorActive?: boolean;
  onToggleNarrator?: () => void;
  isNarratorActive?: boolean;
  onToggleSamplingHUD?: () => void;
  isSamplingHUDOpen?: boolean;
  isStep19?: boolean;
}

export const Controls: React.FC<ControlsProps> = ({
  steps,
  currentStepIndex,
  isPlaying,
  onPrevStep,
  onNextStep,
  onTogglePlay,
  onReset,
  onSelectStep,
  onToggleInspector,
  isInspectorActive = false,
  onToggleNarrator,
  isNarratorActive = false,
  onToggleSamplingHUD,
  isSamplingHUDOpen = false,
  isStep19 = false,
}) => {
  const currentStep = steps[currentStepIndex];

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[920px] max-w-[94vw] bg-[#090c13]/90 backdrop-blur-xl border border-white/10 rounded-2xl px-3.5 py-2 shadow-2xl shadow-black/70 flex items-center space-x-3 select-none transition-all">
      {/* Left Area: Playback Group */}
      <div className="flex items-center space-x-1.5 shrink-0">
        <button
          onClick={onReset}
          className="p-1.5 rounded-lg bg-[#141924] hover:bg-[#1c2230] border border-white/10 text-slate-300 hover:text-white transition-colors"
          title="Reset to Beginning"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={onPrevStep}
          disabled={currentStepIndex === 0}
          className="p-1.5 rounded-lg bg-[#141924] hover:bg-[#1c2230] border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 hover:text-white transition-colors"
          title="Previous Step"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={onTogglePlay}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-md transition-all ${
            isPlaying
              ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
          }`}
        >
          {isPlaying ? (
            <>
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Play</span>
            </>
          )}
        </button>

        <button
          onClick={onNextStep}
          disabled={currentStepIndex === steps.length - 1}
          className="p-1.5 rounded-lg bg-[#141924] hover:bg-[#1c2230] border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 hover:text-white transition-colors"
          title="Next Step"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* First Divider */}
      <div className="h-6 w-px bg-white/10 shrink-0" />

      {/* Middle Area: Step Info & Micro Scrubber */}
      <div className="flex-1 min-w-[240px] flex flex-col justify-center space-y-1">
        <div className="flex items-center space-x-2">
          <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-[#161b26] border border-white/10 text-indigo-300 shrink-0">
            {currentStep.category}
          </span>
          <span className="text-xs font-semibold text-slate-100 truncate">
            {currentStep.name}
          </span>
          <span className="text-[11px] font-mono text-slate-400 shrink-0 ml-auto">
            {currentStepIndex + 1}/{steps.length}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max={steps.length - 1}
          value={currentStepIndex}
          onChange={(e) => onSelectStep(Number(e.target.value))}
          className="w-full h-1 bg-[#161b26] rounded-lg appearance-none cursor-pointer accent-indigo-400 hover:accent-indigo-300 transition-all"
        />
      </div>

      {/* Second Divider */}
      <div className="h-6 w-px bg-white/10 shrink-0" />

      {/* Right Area: Action Tools Group */}
      <div className="flex items-center space-x-1.5 shrink-0">
        {onToggleNarrator && (
          <button
            onClick={onToggleNarrator}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all select-none border ${
              isNarratorActive
                ? 'bg-[#1e2434] border-indigo-500/50 text-indigo-200'
                : 'bg-[#141924] hover:bg-[#1c2230] border-white/10 text-slate-300 hover:text-white'
            }`}
            title={isNarratorActive ? "Collapse step walkthrough (Shortcut: M)" : "Expand step walkthrough (Shortcut: M)"}
          >
            <span className="text-xs">📖</span>
            <span className="hidden sm:inline">Walkthrough</span>
            <span className={`w-1.5 h-1.5 rounded-full ${isNarratorActive ? 'bg-indigo-400 animate-pulse' : 'bg-slate-500'}`} />
          </button>
        )}

        {onToggleInspector && (
          <button
            onClick={onToggleInspector}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all select-none border ${
              isInspectorActive
                ? 'bg-[#1e2434] border-indigo-500/50 text-indigo-200'
                : 'bg-[#141924] hover:bg-[#1c2230] border-white/10 text-slate-300 hover:text-white'
            }`}
            title={isInspectorActive ? "Collapse/Close formula inspector" : "Expand mathematical formula details"}
          >
            <span className="text-xs">📐</span>
            <span className="hidden sm:inline">Formulas</span>
            <span className={`w-1.5 h-1.5 rounded-full ${isInspectorActive ? 'bg-indigo-400 animate-pulse' : 'bg-slate-500'}`} />
          </button>
        )}

        {onToggleSamplingHUD && (
          <button
            onClick={onToggleSamplingHUD}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all select-none border ${
              isSamplingHUDOpen
                ? 'bg-[#1e2434] border-amber-500/50 text-amber-200'
                : isStep19
                ? 'bg-[#1e2434] border-amber-500/40 text-amber-300 shadow-sm'
                : 'bg-[#141924] hover:bg-[#1c2230] border-white/10 text-slate-300 hover:text-white'
            }`}
            title={isSamplingHUDOpen ? 'Collapse HUD (Shortcut: S)' : 'Expand HUD (Shortcut: S)'}
          >
            <span className="text-xs">🎲</span>
            <span className="hidden sm:inline">Sampling</span>
            {isStep19 && (
              <span className="px-1 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/30 text-amber-200 border border-amber-400/40 hidden md:inline">
                Step 19
              </span>
            )}
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isSamplingHUDOpen
                  ? 'bg-amber-400 animate-pulse'
                  : isStep19
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-slate-500'
              }`}
            />
          </button>
        )}
      </div>
    </div>
  );
};
