import React from 'react';
import { RotateCcw, Grid, Focus, Zap, Compass, Box } from 'lucide-react';
import { ViewMode } from '../../types/model';

export interface CameraPresetsBarProps {
  viewMode: ViewMode;
  onResetCamera: () => void;
  onSetTopDownView: () => void;
  onFocusBranch: (branch?: 'attn' | 'moe') => void;
  activeBranchFocus?: 'attn' | 'moe';
  autoFollow: boolean;
  onToggleAutoFollow: () => void;
  isSamplingHUDOpen?: boolean;
  cameraMode?: 'perspective' | 'orthographic';
  onToggleCameraMode?: () => void;
}

export const CameraPresetsBar: React.FC<CameraPresetsBarProps> = ({
  viewMode,
  onResetCamera,
  onSetTopDownView,
  onFocusBranch,
  activeBranchFocus = 'attn',
  autoFollow,
  onToggleAutoFollow,
  isSamplingHUDOpen = false,
  cameraMode = 'perspective',
  onToggleCameraMode,
}) => {
  return (
    <div
      className={`absolute bottom-20 ${
        isSamplingHUDOpen ? 'right-[510px]' : 'right-4'
      } z-20 bg-[#090c13]/90 backdrop-blur-md border border-white/10 rounded-xl p-1.5 flex items-center space-x-1.5 text-xs select-none shadow-2xl shadow-black/60 transition-all duration-300`}
    >
      {/* 1. Reset Camera with R badge */}
      <button
        onClick={onResetCamera}
        className="px-2.5 py-1.5 rounded-lg bg-[#141923] hover:bg-[#1c2230] border border-white/10 text-slate-200 hover:text-white flex items-center space-x-1.5 font-medium transition-all shadow-sm active:scale-95 cursor-pointer"
        title="Reset camera smoothly to default isometric overview angle (Shortcut: R)"
      >
        <RotateCcw className="w-3.5 h-3.5 text-slate-300" />
        <span className="font-semibold">Reset View</span>
        <kbd className="px-1.5 py-0.5 rounded bg-[#0b0e14] border border-white/10 text-[10px] text-slate-300 font-mono font-bold leading-none shadow-inner">
          R
        </kbd>
      </button>

      <div className="h-4 w-px bg-white/10 mx-0.5" />

      {/* 2. Top-Down Floorplan View */}
      <button
        onClick={onSetTopDownView}
        className="px-2.5 py-1.5 rounded-lg bg-[#141923] hover:bg-[#1c2230] border border-white/10 text-slate-300 hover:text-white flex items-center space-x-1.5 transition-all active:scale-95 cursor-pointer"
        title="90° Top-down floorplan architecture view"
      >
        <Grid className="w-3.5 h-3.5 text-slate-300" />
        <span>Top Down</span>
      </button>

      <div className="h-4 w-px bg-white/10 mx-0.5" />

      {/* 3. Focus Branch / Layer */}
      {viewMode === 'single_block' ? (
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onFocusBranch('attn')}
            className={`px-2.5 py-1.5 rounded-lg border flex items-center space-x-1.5 transition-all active:scale-95 cursor-pointer ${
              activeBranchFocus === 'attn'
                ? 'bg-[#1e2434] border-indigo-500/50 text-indigo-200 font-semibold'
                : 'bg-[#141923] hover:bg-[#1c2230] border-white/10 text-slate-300'
            }`}
            title="Focus Attention Branch (Pre-Norm, QKV, RoPE, Attention Map, XSA)"
          >
            <Focus className="w-3 h-3 text-indigo-300" />
            <span>Focus Attn</span>
          </button>
          <button
            onClick={() => onFocusBranch('moe')}
            className={`px-2.5 py-1.5 rounded-lg border flex items-center space-x-1.5 transition-all active:scale-95 cursor-pointer ${
              activeBranchFocus === 'moe'
                ? 'bg-[#1e2434] border-amber-500/50 text-amber-200 font-semibold'
                : 'bg-[#141923] hover:bg-[#1c2230] border-white/10 text-slate-300'
            }`}
            title="Focus LatentMoE Branch (QB Router, Shared Experts, Latent Down, 8 Routed Experts)"
          >
            <Zap className="w-3 h-3 text-amber-300" />
            <span>Focus MoE</span>
          </button>
        </div>
      ) : viewMode === 'quad_cycle' ? (
        <button
          onClick={() => onFocusBranch()}
          className="px-2.5 py-1.5 rounded-lg bg-[#141923] hover:bg-[#1c2230] border border-white/10 text-slate-300 hover:text-white flex items-center space-x-1.5 transition-all active:scale-95 cursor-pointer"
          title="Focus currently active layer"
        >
          <Focus className="w-3.5 h-3.5 text-slate-300" />
          <span>Focus Layer</span>
        </button>
      ) : (
        <button
          onClick={() => onFocusBranch()}
          className="px-2.5 py-1.5 rounded-lg bg-[#141923] hover:bg-[#1c2230] border border-white/10 text-slate-300 hover:text-white flex items-center space-x-1.5 transition-all active:scale-95 cursor-pointer"
          title="Focus currently selected layer"
        >
          <Focus className="w-3.5 h-3.5 text-slate-300" />
          <span>Focus Layer</span>
        </button>
      )}

      <div className="h-4 w-px bg-white/10 mx-0.5" />

      {/* 4. Auto-Follow Toggle */}
      <button
        onClick={onToggleAutoFollow}
        className={`px-2.5 py-1.5 rounded-lg border flex items-center space-x-1.5 transition-all cursor-pointer ${
          autoFollow
            ? 'bg-[#1e2434] border-sky-500/50 text-sky-200 shadow-sm'
            : 'bg-[#141923] hover:bg-[#1c2230] border-white/10 text-slate-400 hover:text-slate-200'
        }`}
        title={
          autoFollow
            ? 'Camera Auto-Follow is Active: Tracking current step tensor (Click to switch to Free Orbit)'
            : 'Free Orbit Camera: Drag/scroll freely (Click to re-enable Step Auto-Follow)'
        }
      >
        <Compass className={`w-3.5 h-3.5 ${autoFollow ? 'text-sky-300' : 'text-slate-400'}`} />
        <span className="text-[11px] font-mono font-semibold">{autoFollow ? 'Follow On' : 'Free Cam'}</span>
      </button>

      <div className="h-4 w-px bg-white/10 mx-0.5" />

      {/* 5. Camera Mode: Perspective / Orthographic Toggle */}
      <button
        onClick={onToggleCameraMode}
        className={`px-2.5 py-1.5 rounded-lg border flex items-center space-x-1.5 transition-all cursor-pointer ${
          cameraMode === 'orthographic'
            ? 'bg-[#1e2434] border-emerald-500/50 text-emerald-200 shadow-sm'
            : 'bg-[#141923] hover:bg-[#1c2230] border-white/10 text-slate-400 hover:text-slate-200'
        }`}
        title={
          cameraMode === 'orthographic'
            ? 'Orthographic 2.5D View (Click for Perspective)'
            : 'Perspective 3D View (Click for Orthographic 2.5D)'
        }
      >
        <Box className={`w-3.5 h-3.5 ${cameraMode === 'orthographic' ? 'text-emerald-300' : 'text-slate-400'}`} />
        <span className="text-[11px] font-mono font-semibold">{cameraMode === 'orthographic' ? '2.5D' : '3D'}</span>
      </button>
    </div>
  );
};
