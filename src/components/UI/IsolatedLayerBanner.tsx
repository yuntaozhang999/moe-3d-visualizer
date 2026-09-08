import React from 'react';
import { ChevronLeft, ChevronRight, Eye, Layers, Network, X } from 'lucide-react';
import { LayerMetadata, ViewMode } from '../../types/model';

interface IsolatedLayerBannerProps {
  currentLayer: LayerMetadata;
  totalLayers: number;
  onPrevLayer: () => void;
  onNextLayer: () => void;
  onSelectLayer: (index: number) => void;
  onExitIsolation: (targetMode?: ViewMode) => void;
}

export const IsolatedLayerBanner: React.FC<IsolatedLayerBannerProps> = ({
  currentLayer,
  totalLayers,
  onPrevLayer,
  onNextLayer,
  onSelectLayer,
  onExitIsolation,
}) => {
  const isGlobal = currentLayer.isGlobal;
  const prevDisabled = currentLayer.index === 0;
  const nextDisabled = currentLayer.index === totalLayers - 1;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center bg-[#0b0f19]/95 backdrop-blur-md border border-sky-500/50 rounded-2xl px-3.5 py-2 shadow-2xl shadow-sky-950/40 select-none max-w-xl space-x-3">
      {/* Pulse Status Indicator */}
      <div className="flex items-center space-x-2">
        <span className="relative flex h-3 w-3">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isGlobal ? 'bg-purple-400' : 'bg-sky-400'
            }`}
          />
          <span
            className={`relative inline-flex rounded-full h-3 w-3 ${
              isGlobal ? 'bg-purple-500' : 'bg-sky-500'
            }`}
          />
        </span>

        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-white tracking-wide">
              LAYER {currentLayer.index} ISOLATED
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                isGlobal
                  ? 'bg-purple-950 text-purple-300 border border-purple-600/70'
                  : 'bg-sky-950 text-sky-300 border border-sky-600/70'
              }`}
            >
              {isGlobal ? 'GLOBAL CAUSAL (NoPE)' : 'LOCAL 2048w (Half-RoPE)'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono">
            All other 47 layers hidden · 3D focused on Attention & LatentMoE
          </p>
        </div>
      </div>

      {/* Layer Step Navigation (Prev / Next) */}
      <div className="flex items-center space-x-1 bg-slate-900/80 border border-slate-800 rounded-lg p-0.5">
        <button
          onClick={onPrevLayer}
          disabled={prevDisabled}
          className="px-2 py-1 rounded text-xs text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent flex items-center space-x-1 transition-colors"
          title="Previous Layer (Up Arrow)"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="font-mono text-[11px]">L{Math.max(0, currentLayer.index - 1)}</span>
        </button>

        <span className="text-slate-600 text-xs">|</span>

        <button
          onClick={onNextLayer}
          disabled={nextDisabled}
          className="px-2 py-1 rounded text-xs text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent flex items-center space-x-1 transition-colors"
          title="Next Layer (Down Arrow)"
        >
          <span className="font-mono text-[11px]">L{Math.min(totalLayers - 1, currentLayer.index + 1)}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Exit Isolation Action Buttons */}
      <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-800">
        <button
          onClick={() => onExitIsolation('quad_cycle')}
          className="px-2.5 py-1 rounded-lg bg-sky-950/80 hover:bg-sky-900 border border-sky-700/60 text-sky-200 text-xs font-medium flex items-center space-x-1.5 transition-colors shadow-sm"
          title="Return to 4-Layer Repeating Unit View"
        >
          <Network className="w-3 h-3 text-sky-400" />
          <span>Show 4-Layer Cycle</span>
        </button>

        <button
          onClick={() => onExitIsolation('macro_stack')}
          className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium flex items-center space-x-1.5 transition-colors"
          title="Show all 48 Layers Tower"
        >
          <Layers className="w-3 h-3 text-purple-400" />
          <span>Show 48 Layers</span>
        </button>
      </div>
    </div>
  );
};
