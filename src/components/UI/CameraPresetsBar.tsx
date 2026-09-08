import React from 'react';
import { RotateCcw, Grid, Focus, Zap, Compass, Video } from 'lucide-react';
import { ViewMode } from '../../types/model';

export interface CameraPresetsBarProps {
  viewMode: ViewMode;
  onResetCamera: () => void;
  onSetTopDownView: () => void;
  onFocusBranch: (branch?: 'attn' | 'moe') => void;
  activeBranchFocus?: 'attn' | 'moe';
  autoFollow: boolean;
  onToggleAutoFollow: () => void;
}

export const CameraPresetsBar: React.FC<CameraPresetsBarProps> = ({
  viewMode,
  onResetCamera,
  onSetTopDownView,
  onFocusBranch,
  activeBranchFocus = 'attn',
  autoFollow,
  onToggleAutoFollow,
}) => {
  return (
    <div className="absolute bottom-24 right-4 z-20 bg-[#0b0f19]/90 backdrop-blur-md border border-slate-700/60 rounded-xl p-1.5 flex items-center space-x-1.5 text-xs select-none shadow-2xl shadow-black/60">
      {/* 1. Reset Camera (Iso 45° overview) with R badge */}
      <button
        onClick={onResetCamera}
        className="px-2.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-sky-200 hover:text-white flex items-center space-x-1.5 font-medium transition-all shadow-sm shadow-sky-500/20 active:scale-95"
        title="Reset camera smoothly to default isometric angle (45°, full overview) [Shortcut: R]"
      >
        <RotateCcw className="w-3.5 h-3.5 text-sky-300" />
        <span className="font-semibold">Reset View</span>
        <kbd className="px-1.5 py-0.5 rounded bg-sky-950/80 border border-sky-400/40 text-[10px] text-sky-300 font-mono font-bold leading-none shadow-inner">
          R
        </kbd>
      </button>

      <div className="h-4 w-px bg-slate-700/80 mx-0.5" />

      {/* 2. Top-Down Floorplan View */}
      <button
        onClick={onSetTopDownView}
        className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700/50 text-slate-300 hover:text-white flex items-center space-x-1.5 transition-all active:scale-95"
        title="90° Top-down floorplan architecture view"
      >
        <Grid className="w-3.5 h-3.5 text-emerald-400" />
        <span>Top Down</span>
      </button>

      <div className="h-4 w-px bg-slate-700/80 mx-0.5" />

      {/* 3. Focus Branch / Layer */}
      {viewMode === 'single_block' ? (
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onFocusBranch('attn')}
            className={`px-2 py-1.5 rounded-lg border flex items-center space-x-1 transition-all active:scale-95 ${
              activeBranchFocus === 'attn'
                ? 'bg-purple-500/20 border-purple-400/60 text-purple-200 font-semibold'
                : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700/50 text-slate-300'
            }`}
            title="Focus Attention Branch (Pre-Norm, QKV, RoPE, Attention Map, XSA)"
          >
            <Focus className="w-3 h-3 text-purple-400" />
            <span>Focus Attn</span>
          </button>
          <button
            onClick={() => onFocusBranch('moe')}
            className={`px-2 py-1.5 rounded-lg border flex items-center space-x-1 transition-all active:scale-95 ${
              activeBranchFocus === 'moe'
                ? 'bg-amber-500/20 border-amber-400/60 text-amber-200 font-semibold'
                : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700/50 text-slate-300'
            }`}
            title="Focus LatentMoE Branch (QB Router, Shared Experts, Latent Down, 8 Routed Experts)"
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Focus MoE</span>
          </button>
        </div>
      ) : viewMode === 'quad_cycle' ? (
        <button
          onClick={() => onFocusBranch()}
          className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700/50 text-slate-300 hover:text-white flex items-center space-x-1.5 transition-all active:scale-95"
          title="Focus currently active layer"
        >
          <Focus className="w-3.5 h-3.5 text-sky-400" />
          <span>Focus Layer</span>
        </button>
      ) : (
        <button
          onClick={() => onFocusBranch()}
          className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700/50 text-slate-300 hover:text-white flex items-center space-x-1.5 transition-all active:scale-95"
          title="Focus currently selected layer"
        >
          <Focus className="w-3.5 h-3.5 text-indigo-400" />
          <span>Focus Layer</span>
        </button>
      )}

      <div className="h-4 w-px bg-slate-700/80 mx-0.5" />

      {/* 4. Auto-Follow Toggle */}
      <button
        onClick={onToggleAutoFollow}
        className={`px-2 py-1.5 rounded-lg border flex items-center space-x-1 transition-all ${
          autoFollow
            ? 'bg-sky-500/20 border-sky-400/50 text-sky-300 shadow-sm shadow-sky-500/10'
            : 'bg-slate-800/60 hover:bg-slate-700 border-slate-700 text-slate-400'
        }`}
        title={autoFollow ? 'Step auto-tracking camera: Enabled' : 'Free camera mode (Drag to orbit freely)'}
      >
        <Compass className={`w-3.5 h-3.5 ${autoFollow ? 'text-sky-400' : 'text-slate-400'}`} />
        <span className="text-[11px] font-mono">{autoFollow ? 'Follow On' : 'Free Cam'}</span>
      </button>
    </div>
  );
};
