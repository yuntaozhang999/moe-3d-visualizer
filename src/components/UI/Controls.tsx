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
    <div className="absolute bottom-4 left-4 right-4 z-20 bg-[#090c13]/95 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-2xl flex flex-col space-y-2 select-none">
      {/* Top row: Current Step Name & Progress bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-[#161b26] border border-white/10 text-indigo-300">
            {currentStep.category}
          </span>
          <h3 className="text-xs font-semibold text-slate-100">
            {currentStep.name}
          </h3>
        </div>
        <div className="text-xs font-mono text-slate-400">
          Step <strong className="text-indigo-400">{currentStepIndex + 1}</strong> of {steps.length}
        </div>
      </div>

      {/* Interactive Step Timeline Slider */}
      <div className="relative flex items-center py-1">
        <input
          type="range"
          min="0"
          max={steps.length - 1}
          value={currentStepIndex}
          onChange={(e) => onSelectStep(Number(e.target.value))}
          className="w-full h-1.5 bg-[#161b26] rounded-lg appearance-none cursor-pointer accent-indigo-400 hover:accent-indigo-300"
        />
      </div>

      {/* Bottom row: Playback Buttons & Speed Selector */}
      <div className="flex items-center justify-between pt-1">
        {/* Playback Button Group */}
        <div className="flex items-center space-x-1.5">
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
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-md transition-all ${
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
                <span>Play Flow</span>
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

        {/* Math summary hint */}
        <div className="hidden md:block text-[11px] font-mono text-slate-400 truncate max-w-sm">
          {currentStep.shortDesc}
        </div>

        {/* Step Walkthrough Narrator Toggle Button */}
        {onToggleNarrator && (
          <button
            onClick={onToggleNarrator}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all select-none border ${
              isNarratorActive
                ? 'bg-[#1e2434] border-indigo-500/50 text-indigo-200'
                : 'bg-[#141924] hover:bg-[#1c2230] border-white/10 text-slate-300 hover:text-white'
            }`}
            title={isNarratorActive ? "Collapse step walkthrough & formula card (Shortcut: M)" : "Expand step walkthrough & formula card (Shortcut: M)"}
          >
            <span className="text-xs">📖</span>
            <span>Walkthrough</span>
            <span className={`w-1.5 h-1.5 rounded-full ${isNarratorActive ? 'bg-indigo-400 animate-pulse' : 'bg-slate-500'}`} />
          </button>
        )}

        {/* Formula Inspector Toggle Button */}
        {onToggleInspector && (
          <button
            onClick={onToggleInspector}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all select-none border ${
              isInspectorActive
                ? 'bg-[#1e2434] border-indigo-500/50 text-indigo-200'
                : 'bg-[#141924] hover:bg-[#1c2230] border-white/10 text-slate-300 hover:text-white'
            }`}
            title={isInspectorActive ? "Collapse/Close formula inspector" : "Expand mathematical formula & operator details"}
          >
            <span className="text-xs">📐</span>
            <span>Formulas</span>
            <span className={`w-1.5 h-1.5 rounded-full ${isInspectorActive ? 'bg-indigo-400 animate-pulse' : 'bg-slate-500'}`} />
          </button>
        )}

        {/* Dynamic Sampling HUD Toggle Button */}
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
            title={
              isSamplingHUDOpen
                ? 'Collapse/Close Sampling HUD (Shortcut: S)'
                : isStep19
                ? 'Step 19 Exclusive: Expand Dynamic Sampling & Roulette HUD (Shortcut: S)'
                : 'Expand Dynamic Sampling & Distribution HUD (Shortcut: S)'
            }
          >
            <span className="text-xs">🎲</span>
            <span>Sampling</span>
            {isStep19 && (
              <span className="px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500/30 text-amber-200 border border-amber-400/40">
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
