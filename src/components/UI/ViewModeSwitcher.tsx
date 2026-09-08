import React from 'react';
import { Layers, Cuboid, Network, FileSpreadsheet } from 'lucide-react';
import { ViewMode } from '../../types/model';

interface ViewModeSwitcherProps {
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  onOpenLayerSpecs: () => void;
  currentGroupIndex: number;
  onChangeGroup: (groupIndex: number) => void;
  selectedLayerIndex?: number;
}

export const ViewModeSwitcher: React.FC<ViewModeSwitcherProps> = ({
  viewMode,
  onChangeViewMode,
  onOpenLayerSpecs,
  currentGroupIndex,
  onChangeGroup,
  selectedLayerIndex = 0,
}) => {
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
