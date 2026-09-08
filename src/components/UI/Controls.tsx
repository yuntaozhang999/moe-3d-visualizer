import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { ForwardStep } from '../../types/model';

interface ControlsProps {
  steps: ForwardStep[];
  currentStepIndex: number;
  isPlaying: boolean;
  playbackSpeed: number;
  onPrevStep: () => void;
  onNextStep: () => void;
  onTogglePlay: () => void;
  onReset: () => void;
  onSelectStep: (index: number) => void;
  onChangeSpeed: (speed: number) => void;
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
  playbackSpeed,
  onPrevStep,
  onNextStep,
  onTogglePlay,
  onReset,
  onSelectStep,
  onChangeSpeed,
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
    <div className="absolute bottom-4 left-76 right-4 z-20 bg-[#0b0f19]/95 backdrop-blur-md border border-slate-800/80 rounded-xl p-3 shadow-2xl flex flex-col space-y-2 select-none">
      {/* Top row: Current Step Name & Progress bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-indigo-950 border border-indigo-700/60 text-indigo-300">
            {currentStep.category}
          </span>
          <h3 className="text-xs font-semibold text-slate-100">
            {currentStep.name}
          </h3>
        </div>
        <div className="text-xs font-mono text-slate-400">
          Step <strong className="text-sky-400">{currentStepIndex + 1}</strong> of {steps.length}
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
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400 hover:accent-sky-300"
        />
      </div>

      {/* Bottom row: Playback Buttons & Speed Selector */}
      <div className="flex items-center justify-between pt-1">
        {/* Playback Button Group */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={onReset}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Reset to Beginning"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={onPrevStep}
            disabled={currentStepIndex === 0}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 transition-colors"
            title="Previous Step"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={onTogglePlay}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-lg transition-all ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                : 'bg-sky-500 hover:bg-sky-400 text-white shadow-sky-500/20'
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
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 transition-colors"
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
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all select-none ${
              isNarratorActive
                ? 'bg-indigo-500/25 border border-indigo-400/80 text-indigo-200 shadow-sm shadow-indigo-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60'
            }`}
            title={isNarratorActive ? "收起步骤讲解与公式卡片 (快捷键: M)" : "展开步骤讲解与公式卡片 (快捷键: M)"}
          >
            <span className="text-xs">📖</span>
            <span>步骤讲解</span>
            <span className={`w-1.5 h-1.5 rounded-full ${isNarratorActive ? 'bg-indigo-400 animate-pulse' : 'bg-slate-500'}`} />
          </button>
        )}

        {/* Formula Inspector Toggle Button */}
        {onToggleInspector && (
          <button
            onClick={onToggleInspector}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all select-none ${
              isInspectorActive
                ? 'bg-sky-500/25 border border-sky-400/80 text-sky-200 shadow-sm shadow-sky-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60'
            }`}
            title={isInspectorActive ? "收起/关闭公式详情" : "展开数学公式与算子详情"}
          >
            <span className="text-xs">📐</span>
            <span>公式详情</span>
            <span className={`w-1.5 h-1.5 rounded-full ${isInspectorActive ? 'bg-sky-400 animate-pulse' : 'bg-slate-500'}`} />
          </button>
        )}

        {/* Dynamic Sampling HUD Toggle Button */}
        {onToggleSamplingHUD && (
          <button
            onClick={onToggleSamplingHUD}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all select-none ${
              isSamplingHUDOpen
                ? 'bg-amber-500/25 border border-amber-400/80 text-amber-200 shadow-sm shadow-amber-500/20'
                : isStep19
                ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-400/60 shadow-sm shadow-amber-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60'
            }`}
            title={
              isSamplingHUDOpen
                ? '收起/关闭采样面板 (快捷键: S)'
                : isStep19
                ? 'Step 19 专属: 展开动态采样与轮盘赌面板 (快捷键: S)'
                : '展开动态采样与概率分布面板 (快捷键: S)'
            }
          >
            <span className="text-xs">🎲</span>
            <span>动态采样</span>
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

        {/* Speed Controls */}
        <div className="flex items-center space-x-1 text-xs font-mono">
          <span className="text-slate-500 text-[11px] mr-1">Speed:</span>
          {[0.5, 1, 2].map((s) => (
            <button
              key={s}
              onClick={() => onChangeSpeed(s)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                playbackSpeed === s
                  ? 'bg-sky-500/20 border border-sky-400/60 text-sky-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
