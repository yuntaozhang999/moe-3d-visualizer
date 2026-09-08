import React from 'react';
import { Layers, Compass, ExternalLink, Cpu, Sparkles } from 'lucide-react';
import { ModelSpecs } from '../../types/model';

interface HeaderProps {
  config: ModelSpecs;
  autoFollow: boolean;
  onToggleAutoFollow: () => void;
  onResetCamera: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  autoFollow,
  onToggleAutoFollow,
  onResetCamera,
}) => {
  return (
    <header className="h-16 px-5 border-b border-slate-800/80 bg-[#0b0f19]/90 backdrop-blur-md flex items-center justify-between z-30 select-none">
      {/* Brand & Model Title */}
      <div className="flex items-center space-x-3.5">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 via-sky-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-sky-500/20">
          <Cpu className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-base font-bold text-slate-100 tracking-tight">
              Marin 535B-A23B MoE
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-950/80 border border-indigo-700/60 text-indigo-300">
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
          </div>
          <p className="text-[11px] text-slate-400 font-mono">
            48 Layers · 384 Experts (Top-8) · 2 Shared · GatedNorm · XSA · LatentMoE (3072)
          </p>
        </div>
      </div>

      {/* Architecture Specs Badges */}
      <div className="hidden lg:flex items-center space-x-2 text-xs font-mono">
        <div className="px-2.5 py-1 rounded bg-slate-900/90 border border-slate-800 text-slate-300">
          <span className="text-slate-400">Total:</span> <strong className="text-sky-400">535B</strong> / <span className="text-slate-400">Active:</span> <strong className="text-emerald-400">23B</strong>
        </div>
        <div className="px-2.5 py-1 rounded bg-slate-900/90 border border-slate-800 text-slate-300">
          <span className="text-slate-400">Hidden:</span> <strong className="text-purple-400">6144</strong> → <span className="text-slate-400">Latent:</span> <strong className="text-amber-400">3072</strong>
        </div>
        <div className="px-2.5 py-1 rounded bg-slate-900/90 border border-slate-800 text-slate-300">
          <span className="text-slate-400">Schedule:</span> <strong className="text-indigo-400">3 Local : 1 Global</strong>
        </div>
      </div>

      {/* Actions / View Controls */}
      <div className="flex items-center space-x-2.5">
        <button
          onClick={onToggleAutoFollow}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            autoFollow
              ? 'bg-sky-500/20 border border-sky-400/50 text-sky-300 shadow-sm shadow-sky-500/20'
              : 'bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300'
          }`}
          title="Toggle between Auto Guided Tour and Free Orbit"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>{autoFollow ? 'Auto-Track Cam' : 'Free Orbit Cam'}</span>
        </button>

        <button
          onClick={onResetCamera}
          className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 transition-colors"
          title="Reset Camera View"
        >
          Reset View
        </button>
      </div>
    </header>
  );
};
