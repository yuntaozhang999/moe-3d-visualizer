import React from 'react';
import { Globe, Compass, CheckCircle2, ChevronRight } from 'lucide-react';
import { LayerMetadata, ViewMode } from '../../types/model';

interface LayerSidebarProps {
  layers: LayerMetadata[];
  selectedLayerIndex: number;
  onSelectLayer: (index: number) => void;
  activeLayerProgress?: number;
  viewMode?: ViewMode;
  onExitIsolation?: () => void;
}

export const LayerSidebar: React.FC<LayerSidebarProps> = ({
  layers,
  selectedLayerIndex,
  onSelectLayer,
  activeLayerProgress = 0,
  viewMode = 'quad_cycle',
  onExitIsolation,
}) => {
  const isIsolatedMode = viewMode === 'single_block';

  return (
    <aside className="w-72 h-[calc(100vh-4rem)] border-r border-slate-800/80 bg-[#090d16]/95 backdrop-blur-md flex flex-col z-20 select-none">
      {/* Sidebar Header */}
      <div className="p-3.5 border-b border-slate-800/80 bg-slate-900/50">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Transformer Layers (48)
          </h2>
          <span className="text-[11px] font-mono text-slate-400">
            {layers.filter(l => l.isGlobal).length} Global / {layers.filter(l => !l.isGlobal).length} Local
          </span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px] font-mono">
          <div className="px-2 py-1 rounded bg-sky-950/40 border border-sky-800/40 text-sky-300 flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-sky-400"></span>
            <span>Local: 12KV, 2048w</span>
          </div>
          <div className="px-2 py-1 rounded bg-purple-950/40 border border-purple-800/40 text-purple-300 flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-purple-400"></span>
            <span>Global: 6KV, NoPE</span>
          </div>
        </div>

        {/* Focus Mode Banner in Sidebar */}
        {isIsolatedMode && (
          <div className="mt-2.5 p-2 rounded-lg bg-indigo-950/80 border border-indigo-500/60 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-indigo-200 font-medium text-[11px]">
                Layer {selectedLayerIndex} Isolated
              </span>
            </div>
            {onExitIsolation && (
              <button
                onClick={onExitIsolation}
                className="px-2 py-0.5 rounded bg-indigo-800 hover:bg-indigo-700 text-white text-[10px] font-medium transition-colors"
                title="Show 4-Layer Cycle"
              >
                Exit Focus
              </button>
            )}
          </div>
        )}
      </div>

      {/* Scrollable Layer List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {layers.map((layer) => {
          const isSelected = layer.index === selectedLayerIndex;
          const isGlobal = layer.isGlobal;

          return (
            <button
              key={layer.index}
              onClick={() => onSelectLayer(layer.index)}
              className={`w-full text-left p-2 rounded-lg transition-all flex items-center justify-between border ${
                isSelected
                  ? isGlobal
                    ? 'bg-purple-950/60 border-purple-500/80 shadow-md shadow-purple-900/30'
                    : 'bg-sky-950/60 border-sky-500/80 shadow-md shadow-sky-900/30'
                  : 'bg-slate-900/30 hover:bg-slate-800/50 border-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                {/* Layer Number */}
                <div
                  className={`w-7 h-7 rounded flex items-center justify-center font-mono text-xs font-bold ${
                    isSelected
                      ? isGlobal ? 'bg-purple-600 text-white' : 'bg-sky-500 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {String(layer.index).padStart(2, '0')}
                </div>

                {/* Layer Details */}
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-medium text-slate-200">
                      Layer {layer.index}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-medium ${
                        isGlobal
                          ? 'bg-purple-900/80 text-purple-200 border border-purple-700/50'
                          : 'bg-sky-950 text-sky-300 border border-sky-800/50'
                      }`}
                    >
                      {isGlobal ? 'GLOBAL' : 'LOCAL'}
                    </span>
                    {isSelected && isIsolatedMode && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950 border border-emerald-500/70 text-emerald-300 font-mono font-bold animate-pulse">
                        ISOLATED
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {isGlobal
                      ? '6 KV · Full Causal · NoPE'
                      : '12 KV · 2048 Window · Half-RoPE'}
                  </div>
                </div>
              </div>

              {isSelected && (
                <ChevronRight className={`w-4 h-4 ${isGlobal ? 'text-purple-400' : 'text-sky-400'}`} />
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
};
