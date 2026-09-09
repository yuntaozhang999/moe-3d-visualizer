import React from 'react';
import { ExternalLink, Cpu } from 'lucide-react';
import { ModelSpecs, LayerMetadata, ViewMode } from '../../types/model';

interface HeaderProps {
  config: ModelSpecs;
  currentLayer?: LayerMetadata;
  viewMode?: ViewMode;
}

export const Header: React.FC<HeaderProps> = ({ config, currentLayer, viewMode }) => {
  const isGlobal = currentLayer?.isGlobal ?? false;

  return (
    <header className="h-16 px-5 border-b border-white/10 bg-[#090c13]/90 backdrop-blur-md flex items-center justify-between z-30 select-none">
      {/* Brand, Model Title & Breadcrumb */}
      <div className="flex items-center space-x-3.5">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 via-sky-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-sky-500/10">
          <Cpu className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-base font-bold text-slate-100 tracking-tight">
              Marin 535B-A23B MoE
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-[#161b26] border border-white/10 text-indigo-300 font-mono">
              Hero Run
            </span>
            <a
              href="https://github.com/marin-community/marin/issues/8435"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-xs text-sky-400 hover:text-sky-300 transition-colors"
            >
              <span>#8435</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            {/* Breadcrumb Layer Metadata (replaces floating in-scene card) */}
            {currentLayer && viewMode === 'single_block' && (
              <>
                <span className="text-slate-600 font-mono text-sm">/</span>
                <div className="flex items-center space-x-2 font-mono">
                  <span className="text-xs font-bold text-slate-200">
                    Layer {currentLayer.index}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border ${
                      isGlobal
                        ? 'bg-purple-950/60 border-purple-500/40 text-purple-300'
                        : 'bg-indigo-950/60 border-indigo-500/40 text-indigo-300'
                    }`}
                  >
                    {isGlobal ? 'Global Causal' : 'Local 2048w'}
                  </span>
                  <span className="hidden xl:inline text-[11px] text-slate-400 font-sans">
                    {isGlobal
                      ? '6 KV Heads (GQA 8:1) · Full Causal Attention · NoPE · LatentMoE 384'
                      : '12 KV Heads (GQA 4:1) · 2048 SWA · Half-RoPE · LatentMoE 384'}
                  </span>
                </div>
              </>
            )}
          </div>
          <p className="text-[11px] text-slate-400 font-mono">
            48 Layers · 384 Experts (Top-8) · 2 Shared · GatedNorm · XSA · LatentMoE (3072)
          </p>
        </div>
      </div>

      {/* Architecture Specs Badges */}
      <div className="hidden lg:flex items-center space-x-2 text-xs font-mono">
        <div className="px-2.5 py-1 rounded-lg bg-[#121620] border border-white/10 text-slate-300">
          <span className="text-slate-400">Total:</span> <strong className="text-sky-400">535B</strong> / <span className="text-slate-400">Active:</span> <strong className="text-emerald-400">23B</strong>
        </div>
        <div className="px-2.5 py-1 rounded-lg bg-[#121620] border border-white/10 text-slate-300">
          <span className="text-slate-400">Hidden:</span> <strong className="text-indigo-400">6144</strong> → <span className="text-slate-400">Latent:</span> <strong className="text-amber-400">3072</strong>
        </div>
        <div className="px-2.5 py-1 rounded-lg bg-[#121620] border border-white/10 text-slate-300">
          <span className="text-slate-400">Schedule:</span> <strong className="text-slate-200">3 Local : 1 Global</strong>
        </div>
      </div>
    </header>
  );
};


