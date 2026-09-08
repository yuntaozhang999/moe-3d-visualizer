import React, { useState } from 'react';
import { X, Globe, Layers, Cpu, Zap, HardDrive, Check, ArrowUpRight, Filter } from 'lucide-react';
import { LayerMetadata, LayerGroup } from '../../types/model';

interface LayerDetailModalProps {
  layers: LayerMetadata[];
  selectedLayerIndex: number;
  onSelectLayer: (index: number) => void;
  onClose: () => void;
}

export const LayerDetailModal: React.FC<LayerDetailModalProps> = ({
  layers,
  selectedLayerIndex,
  onSelectLayer,
  onClose,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'local' | 'global'>('all');
  const [activeLayer, setActiveLayer] = useState<LayerMetadata>(layers[selectedLayerIndex]);

  const filteredLayers = layers.filter((l) => {
    if (filterType === 'local') return !l.isGlobal;
    if (filterType === 'global') return l.isGlobal;
    return true;
  });

  const isGlobal = activeLayer.isGlobal;
  const groupIndex = Math.floor(activeLayer.index / 4);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-[#0b0f19] border border-slate-700/80 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center">
              <Layers className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">
                48-Layer Architecture Explorer & Detailed Inspection
              </h2>
              <p className="text-[11px] font-mono text-slate-400">
                Marin 535B-A23B MoE · 12 Quad-Groups of [3 Local (Half-RoPE) + 1 Global (NoPE)]
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar & Layer Pill Selector */}
        <div className="px-4 py-2.5 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono text-slate-400 flex items-center space-x-1">
              <Filter className="w-3 h-3 text-slate-500" />
              <span>Filter:</span>
            </span>
            {(['all', 'local', 'global'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors ${
                  filterType === type
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {type === 'all' ? 'All 48 Layers' : type === 'local' ? '36 Local Layers' : '12 Global Layers'}
              </button>
            ))}
          </div>

          <div className="text-xs font-mono text-slate-400">
            Selected: <strong className={isGlobal ? 'text-purple-400' : 'text-sky-400'}>Layer {activeLayer.index}</strong> (Quad-Group {groupIndex + 1})
          </div>
        </div>

        {/* 48 Layer Quick Matrix (clickable pills) */}
        <div className="px-4 py-3 border-b border-slate-800/80 overflow-x-auto flex items-center space-x-1.5 bg-[#080b12]">
          {filteredLayers.map((l) => {
            const isCur = l.index === activeLayer.index;
            return (
              <button
                key={l.index}
                onClick={() => setActiveLayer(l)}
                className={`flex-shrink-0 px-2 py-1 rounded text-[11px] font-mono font-bold transition-all ${
                  isCur
                    ? l.isGlobal
                      ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                      : 'bg-sky-500 text-white ring-2 ring-sky-300'
                    : l.isGlobal
                    ? 'bg-purple-950/70 text-purple-300 border border-purple-800 hover:bg-purple-900'
                    : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                }`}
              >
                L{String(l.index).padStart(2, '0')}
              </button>
            );
          })}
        </div>

        {/* Main Content Area: Detailed Specs of the Selected Layer */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Column 1: Layer Identity & Residual Structure */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                  isGlobal
                    ? 'bg-purple-950 text-purple-300 border border-purple-700'
                    : 'bg-sky-950 text-sky-300 border border-sky-700'
                }`}>
                  {isGlobal ? 'GLOBAL CONTEXT LAYER' : 'LOCAL SLIDING LAYER'}
                </span>
                <span className="text-xs font-mono text-slate-400">Index: #{activeLayer.index}</span>
              </div>

              <h3 className="text-lg font-bold text-slate-100">
                {isGlobal
                  ? `Layer ${activeLayer.index} — Global Full-Causal Block`
                  : `Layer ${activeLayer.index} — Local Window Block`}
              </h3>

              <p className="text-xs text-slate-300 leading-relaxed">
                {isGlobal
                  ? `Positioned every 4th layer (and last layer 47). Computes unrestricted full causal self-attention across all 4096 tokens, disabling RoPE (NoPE) to consolidate wide-horizon semantic context without high-frequency rotational decay.`
                  : `Part of the 3 consecutive local layers preceding each global layer. Constrains attention to a 2048-token sliding window and uses Half-RoPE to accelerate local context modeling while slashing O(S^2) attention compute.`}
              </p>

              <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-slate-400 text-[10px]">Total Layer Params:</span>
                  <div className="font-bold text-slate-200">~11.14 Billion</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Active Params / Tok:</span>
                  <div className="font-bold text-emerald-400">~479.2 Million</div>
                </div>
              </div>
            </div>

            {/* Normalization & Residuals */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span>Norms & Residual Highways</span>
              </h4>

              <div className="text-xs space-y-2 font-mono">
                <div className="p-2 rounded bg-slate-950 border border-slate-800">
                  <div className="text-[11px] text-emerald-300 font-semibold">2× Pre-Norm GatedNorm (Rank 128)</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Pre-Attn & Pre-MoE: RMSNorm wrapped in a rank-128 low-rank gate to stabilize AdamH/MuonH activation drift.
                  </div>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-800">
                  <div className="text-[11px] text-rose-300 font-semibold">Dual Additive Residuals</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Pre-norm additive skips: `x = x + Attn(Norm(x))` and `x = x + MoE(Norm(x))`.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Attention Architecture */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span>Attention Branch Details</span>
            </h4>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Head Dimensions & GQA</div>
                <div className="font-semibold text-slate-200 mt-0.5">
                  Q: 48 Heads · KV: <strong className={isGlobal ? 'text-purple-300' : 'text-sky-300'}>{activeLayer.kvHeads} Heads</strong>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {isGlobal ? 'GQA Ratio 8:1 (8 Query heads share 1 KV head)' : 'GQA Ratio 4:1 (4 Query heads share 1 KV head)'}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Attention Mask & Window</div>
                <div className="font-semibold text-slate-200 mt-0.5">
                  {isGlobal ? 'Full Causal Attention (4096 tokens)' : '2048-Token Sliding Window Causal Mask'}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">RoPE Positional Schedule</div>
                <div className="font-semibold text-slate-200 mt-0.5">
                  {isGlobal ? 'NoPE (RoPE completely disabled)' : 'Half-RoPE (applied to first 64 of 128 head_dim)'}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">XSA (Exclusive Self-Attention)</div>
                <div className="text-[11px] text-sky-300 mt-0.5 font-semibold">
                  zᵢ = yᵢ - (yᵢᵀ vᵢ / ‖vᵢ‖²) vᵢ
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Subtracts the component parallel to V, eliminating lazy copying pathways.
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">ShortConv on K-Projection</div>
                <div className="font-semibold text-slate-200 mt-0.5">Kernel Size 4 (Depthwise Causal 1D Conv)</div>
              </div>
            </div>
          </div>

          {/* Column 3: LatentMoE & Expert Parallelism */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              <span>LatentMoE Branch Details</span>
            </h4>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Latent Compression Ratio</div>
                <div className="font-semibold text-amber-300 mt-0.5">
                  6144 (hidden) → 3072 (latent_dim)
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Token compressed + normalized by learnable `latent_norm` before dispatch. <strong>Cuts cross-GPU All-to-All communication traffic by 50%</strong>.
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Router & QB Dispatch</div>
                <div className="font-semibold text-slate-200 mt-0.5">
                  Top-8 of 384 Active Half-Width Experts
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Quantile Balancing (QB) dynamically aligns routing histograms without auxiliary loss degradation.
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">2 Concurrent Shared Experts</div>
                <div className="font-semibold text-emerald-300 mt-0.5">
                  Width 3072 SwiGLU (Always Active)
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Operates concurrently on full 6144 token to capture universal domain knowledge.
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Latent Up-Projection & Merge</div>
                <div className="font-semibold text-slate-200 mt-0.5">
                  3072 → 6144 Projection + Shared Fusion
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950">
          <span className="text-xs font-mono text-slate-400">
            Click "Focus Layer in 3D" to load this layer into the primary 3D viewport.
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                onSelectLayer(activeLayer.index);
                onClose();
              }}
              className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-lg shadow-sky-500/20 transition-all"
            >
              <span>Focus Layer {activeLayer.index} in 3D</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
