import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Minimize2,
  X,
  ChevronDown,
  Dices
} from 'lucide-react';
import { ForwardStep } from '../../types/model';
import { IntuitiveEquation } from './IntuitiveEquation';

interface WalkthroughNarratorProps {
  currentStep: ForwardStep;
  stepIndex: number;
  totalSteps: number;
  onPrevStep: () => void;
  onNextStep: () => void;
  onOpenDetails: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed?: boolean) => void;
  onOpenSamplingHUD?: () => void;
  isSamplingHUDOpen?: boolean;
}

export const WalkthroughNarrator: React.FC<WalkthroughNarratorProps> = ({
  currentStep,
  stepIndex,
  totalSteps,
  onPrevStep,
  onNextStep,
  onOpenDetails,
  isCollapsed = false,
  onToggleCollapse,
  onOpenSamplingHUD,
  isSamplingHUDOpen = false,
}) => {
  const isStep19 = currentStep.id === 'untied_lm_head';

  // Collapsed Mode: Lightweight, non-intrusive floating pill button
  if (isCollapsed) {
    return (
      <div
        onClick={() => onToggleCollapse?.(false)}
        className="absolute top-4 left-4 z-20 flex items-center bg-[#0b0f19]/90 hover:bg-[#101626]/95 backdrop-blur-xl border border-sky-500/40 hover:border-sky-400/80 rounded-xl px-2.5 py-1.5 shadow-2xl hover:shadow-sky-500/20 group transition-all duration-200 select-none cursor-pointer"
        title="Click to expand full math formulas & step walkthrough (Shortcut: M)"
      >
        <div className="flex items-center space-x-2">
          <span className="text-xs">📐</span>
          <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-indigo-950/90 border border-indigo-700/60 text-indigo-300">
            {currentStep.category}
          </span>
          <span className="text-xs font-semibold text-slate-200 group-hover:text-white max-w-[140px] sm:max-w-[200px] truncate">
            {stepIndex + 1}. {currentStep.name}
          </span>
          <span className="text-[10px] font-mono text-sky-400 bg-sky-950/70 border border-sky-800/50 px-1.5 py-0.5 rounded">
            {stepIndex + 1}/{totalSteps}
          </span>
        </div>

        {/* Quick step navigation & expand handle */}
        <div className="flex items-center space-x-1 pl-2 ml-2 border-l border-slate-700/80">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrevStep();
            }}
            disabled={stepIndex === 0}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-colors"
            title="Previous Step"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNextStep();
            }}
            disabled={stepIndex === totalSteps - 1}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-colors"
            title="Next Step"
          >
            <ChevronRight className="w-3 h-3" />
          </button>

          {isStep19 && onOpenSamplingHUD && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenSamplingHUD();
              }}
              className="flex items-center space-x-1 ml-1 px-2 py-0.5 rounded-md bg-amber-500/25 hover:bg-amber-500/40 text-amber-200 border border-amber-400/50 text-[11px] font-medium transition-colors animate-pulse"
              title="Step 19 Exclusive: Open Dynamic Sampling HUD (Shortcut: S)"
            >
              <Dices className="w-3 h-3" />
              <span>Sampling</span>
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse?.(false);
            }}
            className="flex items-center space-x-1 ml-1 px-2 py-0.5 rounded-md bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 hover:text-sky-100 text-[11px] font-medium transition-colors"
            title="Expand Walkthrough (Shortcut: M)"
          >
            <span>Formulas & Walkthrough</span>
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  // Expanded Mode: Full walkthrough card with clear minimize / close controls
  return (
    <div className="absolute top-4 left-4 z-20 w-[28rem] sm:w-[32rem] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-7rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 bg-[#0b0f19]/95 backdrop-blur-xl border border-slate-700/80 hover:border-slate-600 rounded-xl p-3.5 shadow-2xl flex flex-col space-y-2.5 select-none transition-all duration-200">
      {/* Title & Navigation & Close Controls */}
      <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
        <div className="flex items-center space-x-2">
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-indigo-950 border border-indigo-700/60 text-indigo-300">
            {currentStep.category}
          </span>
          <span className="text-xs font-bold text-slate-100 max-w-[180px] sm:max-w-[220px] truncate">
            {currentStep.name}
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          {/* Step Pagination */}
          <div className="flex items-center space-x-0.5 bg-slate-900/80 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={onPrevStep}
              disabled={stepIndex === 0}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-colors"
              title="Previous Step (ArrowLeft)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-slate-400 px-1.5">
              {stepIndex + 1}/{totalSteps}
            </span>
            <button
              onClick={onNextStep}
              disabled={stepIndex === totalSteps - 1}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-colors"
              title="Next Step (ArrowRight)"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="w-[1px] h-4 bg-slate-800" />

          {/* Minimize / Collapse Button */}
          <button
            onClick={() => onToggleCollapse?.(true)}
            className="p-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            title="Minimize to floating pill (Shortcut: Esc or M)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>

          {/* Close Button */}
          <button
            onClick={() => onToggleCollapse?.(true)}
            className="p-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-rose-300 transition-colors"
            title="Close / Minimize (Shortcut: Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Walkthrough Description */}
      <p className="text-xs text-slate-300 leading-relaxed font-sans">
        {currentStep.longDesc}
      </p>

      {/* Interactive Intuitive Equation & Variable Badges */}
      <div className="pt-1.5 border-t border-slate-800/80">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1.5">
          <span className="text-sky-400 font-semibold flex items-center space-x-1">
            <span>Mathematical Formula:</span>
          </span>
          <button
            onClick={onOpenDetails}
            className="text-slate-400 hover:text-sky-300 flex items-center space-x-1 transition-colors text-[10px]"
            title="Open detailed operator & variable inspector modal"
          >
            <span>Deep Dive & Shapes</span>
            <HelpCircle className="w-3 h-3" />
          </button>
        </div>

        <IntuitiveEquation
          equationId={currentStep.id}
          data={currentStep.formulaData}
          formula={currentStep.mathFormula}
          variant="compact"
          onOpenDetails={onOpenDetails}
        />

        {/* Step 19 Dedicated Interactive Action Banner */}
        {isStep19 && onOpenSamplingHUD && (
          <div className="pt-2">
            <button
              onClick={onOpenSamplingHUD}
              className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-all select-none ${
                isSamplingHUDOpen
                  ? 'bg-amber-500/20 border border-amber-400/60 text-amber-200'
                  : 'bg-gradient-to-r from-amber-500/20 via-sky-500/15 to-indigo-500/20 hover:from-amber-500/30 hover:to-indigo-500/30 border border-amber-400/50 text-white shadow-lg shadow-amber-500/10 animate-pulse'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-base">🎲</span>
                <div className="text-left">
                  <div className="font-bold text-[11px] text-amber-300 flex items-center space-x-1.5">
                    <span>{isSamplingHUDOpen ? 'Sampling HUD Active' : 'Open Dynamic Sampling HUD'}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Tuning Temperature • Top-k • Top-p • Monte Carlo Roulette
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-amber-500/30 text-amber-200 text-[10px] font-mono border border-amber-400/40">
                {isSamplingHUDOpen ? 'View HUD →' : 'Try Now →'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Footer Shortcut Tip & Quick Collapse Link */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1.5 border-t border-slate-800/60">
        <span className="flex items-center space-x-1">
          <span>💡 Focus 3D viewport? Press</span>
          <kbd className="px-1 py-0.2 rounded bg-slate-800 text-slate-300 font-mono text-[9px] border border-slate-700">
            Esc
          </kbd>
          <span>or</span>
          <kbd className="px-1 py-0.2 rounded bg-slate-800 text-slate-300 font-mono text-[9px] border border-slate-700">
            M
          </kbd>
          <span>to collapse</span>
        </span>
        <button
          onClick={() => onToggleCollapse?.(true)}
          className="text-sky-400/90 hover:text-sky-300 hover:underline flex items-center space-x-0.5"
        >
          <span>Collapse Card ▲</span>
        </button>
      </div>
    </div>
  );
};
