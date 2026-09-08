import React, { useState } from 'react';
import { Activity, Zap, Waves, Sparkles, Gauge } from 'lucide-react';

interface FlowDynamicsHUDProps {
  flowSpeedMultiplier: number;
  onChangeFlowSpeed: (multiplier: number) => void;
  flowDensity: 'normal' | 'dense' | 'ultra';
  onChangeFlowDensity: (density: 'normal' | 'dense' | 'ultra') => void;
  onTriggerTokenBurst: () => void;
  isBurstActive: boolean;
}

export const FlowDynamicsHUD: React.FC<FlowDynamicsHUDProps> = ({
  flowSpeedMultiplier,
  onChangeFlowSpeed,
  flowDensity,
  onChangeFlowDensity,
  onTriggerTokenBurst,
  isBurstActive,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="absolute bottom-36 right-4 z-20 flex items-center space-x-2 select-none">
      {/* Mini Toggle / Status Pill */}
      <div className="bg-[#0b0f19]/90 backdrop-blur-md border border-slate-800 rounded-xl p-1.5 flex items-center space-x-2 text-xs shadow-xl">
        <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-lg bg-sky-950/60 border border-sky-800/40 text-sky-300">
          <Activity className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
          <span className="font-mono text-[11px] font-semibold">Flow Dynamics</span>
        </div>

        {/* Speed presets */}
        <div className="flex items-center space-x-1 text-xs font-mono">
          <span className="text-slate-500 text-[10px] uppercase font-semibold">Speed:</span>
          {[0.5, 1, 2].map((s) => (
            <button
              key={s}
              onClick={() => onChangeFlowSpeed(s)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                flowSpeedMultiplier === s
                  ? 'bg-sky-500/20 border border-sky-400/80 text-sky-300 font-bold'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Density presets */}
        <div className="flex items-center space-x-1 text-xs font-mono pl-1 border-l border-slate-800">
          <span className="text-slate-500 text-[10px] uppercase font-semibold">Density:</span>
          {(['normal', 'dense', 'ultra'] as const).map((d) => (
            <button
              key={d}
              onClick={() => onChangeFlowDensity(d)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium capitalize transition-all ${
                flowDensity === d
                  ? 'bg-indigo-500/20 border border-indigo-400/80 text-indigo-300 font-bold'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400'
              }`}
            >
              {d === 'normal' ? 'Std' : d === 'dense' ? 'Dense' : 'Ultra'}
            </button>
          ))}
        </div>

        {/* Token Pulse Burst Trigger */}
        <button
          onClick={onTriggerTokenBurst}
          className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-md ${
            isBurstActive
              ? 'bg-rose-500 text-white shadow-rose-500/40 animate-pulse'
              : 'bg-gradient-to-r from-rose-500/80 to-amber-500/80 hover:from-rose-500 hover:to-amber-500 text-white shadow-rose-500/20'
          }`}
          title="Fire High-Intensity Token Photon Burst through Architecture"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="font-mono text-[11px]">
            {isBurstActive ? 'Surging...' : 'Token Burst'}
          </span>
        </button>
      </div>
    </div>
  );
};
