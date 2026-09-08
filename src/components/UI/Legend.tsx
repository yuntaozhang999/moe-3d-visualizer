import React from 'react';

export const Legend: React.FC = () => {
  return (
    <div className="absolute top-20 right-6 z-10 bg-[#0b0f19]/80 backdrop-blur-md border border-slate-800/80 rounded-xl px-3 py-2 shadow-lg hidden xl:flex items-center space-x-3.5 text-[11px] font-mono select-none">
      <div className="flex items-center space-x-1.5">
        <span className="w-2.5 h-2.5 rounded bg-sky-400"></span>
        <span className="text-slate-300">Embedding</span>
      </div>
      <div className="flex items-center space-x-1.5">
        <span className="w-2.5 h-2.5 rounded bg-purple-400"></span>
        <span className="text-slate-300">Attention (XSA)</span>
      </div>
      <div className="flex items-center space-x-1.5">
        <span className="w-2.5 h-2.5 rounded bg-amber-400"></span>
        <span className="text-slate-300">LatentMoE (Top-8)</span>
      </div>
      <div className="flex items-center space-x-1.5">
        <span className="w-2.5 h-2.5 rounded bg-emerald-400"></span>
        <span className="text-slate-300">Shared Experts</span>
      </div>
      <div className="flex items-center space-x-1.5">
        <span className="w-2.5 h-2.5 rounded bg-rose-400"></span>
        <span className="text-slate-300">Residual & LM Head</span>
      </div>
    </div>
  );
};
