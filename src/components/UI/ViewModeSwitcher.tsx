import React from 'react';
import { Layers, Cuboid, Network, FileSpreadsheet, ChevronLeft, ChevronRight } from 'lucide-react';
import { LayerMetadata, ViewMode } from '../../types/model';

interface ViewModeSwitcherProps {
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  onOpenLayerSpecs: () => void;
  currentGroupIndex: number;
  onChangeGroup: (groupIndex: number) => void;
  selectedLayerIndex?: number;
  currentLayer?: LayerMetadata;
  onPrevLayer?: () => void;
  onNextLayer?: () => void;
  totalLayers?: number;
}

export const ViewModeSwitcher: React.FC<ViewModeSwitcherProps> = ({
  viewMode,
  onChangeViewMode,
  onOpenLayerSpecs,
  currentGroupIndex,
  onChangeGroup,
  selectedLayerIndex = 0,
  currentLayer,
  onPrevLayer,
  onNextLayer,
  totalLayers = 48,
}) => {
  const layerIdx = currentLayer ? currentLayer.index : selectedLayerIndex;
  const isGlobal = currentLayer ? currentLayer.isGlobal : layerIdx % 4 === 3;
  const isFirstLayer = layerIdx <= 0;
  const isLastLayer = layerIdx >= totalLayers - 1;

  return (
    <div className="absolute top-4 right-4 z-20 flex items-center space-x-2 select-none">
      {/* Quad Group Selector (if in quad_cycle mode) */}
      {viewMode === 'quad_cycle' && (
        <div className="flex items-center bg-[#0b0f19]/90 backdrop-blur-md border border-slate-800 rounded-xl px-2 py-1 space-x-1.5 text-xs font-mono">
          <span className="text-slate-400 text-[11px] pl-1">Cycle Group:</span>
          <select
            value={currentGroupIndex}
            onChange={(e) => onChangeGroup(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 text-sky-300 rounded px-2 py-0.5 text-xs focus:outline-none cursor-pointer"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i}>
                Group {i + 1} (L{i * 4}–L{i * 4 + 3})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Compact Layer Stepper Pill (if in single_block mode) */}
      {viewMode === 'single_block' && (
        <div className="flex items-center bg-[#0b0f19]/90 backdrop-blur-md border border-indigo-700/60 rounded-xl px-2 py-1 space-x-2 text-xs font-mono shadow-lg shadow-indigo-950/40">
          <button
            onClick={onPrevLayer}
            disabled={!onPrevLayer || isFirstLayer}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer disabled:cursor-not-allowed"
            title="Previous Layer (ArrowUp)"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center space-x-1.5">
            <span className="font-bold text-slate-100">L{layerIdx}</span>
            <span
              className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full border ${
                isGlobal
                  ? 'bg-purple-950/80 border-purple-600/70 text-purple-300'
                  : 'bg-sky-950/80 border-sky-600/70 text-sky-300'
              }`}
            >
              {isGlobal ? 'Global Causal' : 'Local 2048w'}
            </span>
          </div>
          <button
            onClick={onNextLayer}
            disabled={!onNextLayer || isLastLayer}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer disabled:cursor-not-allowed"
            title="Next Layer (ArrowDown)"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3D View Mode Switcher */}
      <div className="flex items-center bg-[#0b0f19]/90 backdrop-blur-md border border-slate-800 rounded-xl p-1 space-x-1 shadow-lg">
        <button
          onClick={() => onChangeViewMode('quad_cycle')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all ${
            viewMode === 'quad_cycle'
              ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="Simplified 4-Layer Repeating Unit (3 Local + 1 Global)"
        >
          <Network className="w-3.5 h-3.5" />
          <span>4-Layer Cycle</span>
        </button>

        <button
          onClick={() => onChangeViewMode('single_block')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all ${
            viewMode === 'single_block'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="Deep dive into a single Layer's matrix cells (other layers hidden)"
        >
          <Cuboid className="w-3.5 h-3.5" />
          <span>Single Block (L{selectedLayerIndex})</span>
        </button>

        <button
          onClick={() => onChangeViewMode('macro_stack')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all ${
            viewMode === 'macro_stack'
              ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="See all 48 Layers in 3D perspective"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>48-Layer Tower</span>
        </button>
      </div>

      {/* Layer Specs Modal Button */}
      <button
        onClick={onOpenLayerSpecs}
        className="px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 text-xs font-medium flex items-center space-x-1.5 shadow-lg transition-colors"
        title="Open full 48-layer architecture table & details"
      >
        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
        <span>Layer Specs</span>
      </button>
    </div>
  );
};

