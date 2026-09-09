import React, { useState } from 'react';
import { Type, ArrowRight, Sparkles, RefreshCw, Dices, Plus } from 'lucide-react';
import { ActivationData, TokenCandidate } from '../../data/tokenSimulation';

interface TokenInputBarProps {
  tokens: string[];
  activationData: ActivationData;
  onUpdateTokens: (newTokens: string[]) => void;
  sampledToken?: TokenCandidate | null;
  onAppendSampledToken?: (token: string) => void;
  onOpenSamplingHUD?: () => void;
  isSamplingHUDOpen?: boolean;
}

export const TokenInputBar: React.FC<TokenInputBarProps> = ({
  tokens,
  activationData,
  onUpdateTokens,
  sampledToken,
  onAppendSampledToken,
  onOpenSamplingHUD,
  isSamplingHUDOpen = false,
}) => {
  const [inputText, setInputText] = useState(tokens.join(' '));
  const [isEditing, setIsEditing] = useState(false);

  const handleApply = () => {
    const split = inputText.trim().split(/\s+/).filter(Boolean);
    if (split.length > 0) {
      // Limit to 8 tokens for clean 3D visual density
      onUpdateTokens(split.slice(0, 8));
    }
    setIsEditing(false);
  };

  const handleReset = () => {
    const defaults = ["The", "marin", "535b", "moe", "hero", "run"];
    setInputText(defaults.join(' '));
    onUpdateTokens(defaults);
  };

  return (
    <div className="absolute top-16 left-4 z-20 bg-[#090c13]/90 backdrop-blur-md border border-white/10 rounded-xl p-2.5 shadow-xl flex items-center space-x-3 text-xs select-none">
      <div className="flex items-center space-x-1.5 text-slate-400 font-mono pl-1">
        <Type className="w-3.5 h-3.5 text-slate-300" />
        <span className="text-[11px] font-semibold text-slate-300">Prompt:</span>
      </div>

      {isEditing ? (
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
            placeholder="Type words..."
            className="bg-[#121620] border border-white/20 rounded px-2 py-1 text-slate-100 font-mono text-xs focus:outline-none w-56"
            autoFocus
          />
          <button
            onClick={handleApply}
            className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium text-[11px] transition-colors"
          >
            Apply
          </button>
        </div>
      ) : (
        <div
          onClick={() => setIsEditing(true)}
          className="flex items-center space-x-1.5 cursor-pointer hover:bg-[#161b26] px-2 py-1 rounded transition-colors"
          title="Click to edit prompt words"
        >
          {tokens.map((tok, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded bg-[#161b26] border border-white/10 font-mono text-slate-200 text-xs shadow-sm"
            >
              {tok}
            </span>
          ))}
          <span className="text-[10px] text-slate-500 ml-1">(Click to edit)</span>
        </div>
      )}

      {/* Predicted Next Token (Argmax baseline) */}
      <div className="flex items-center space-x-1.5 pl-2 border-l border-white/10">
        <ArrowRight className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
        <span className="text-slate-400 text-[11px]">Top Next:</span>
        <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 font-mono font-bold text-emerald-300 shadow-sm">
          "{activationData.nextTokens[0]?.token}"
        </span>
        <span className="text-[10px] font-mono text-emerald-400/80">
          ({Math.round((activationData.nextTokens[0]?.prob || 0) * 100)}%)
        </span>
      </div>

      {/* Real-time Live Sampled Token Feedback Banner */}
      {sampledToken && (
        <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-800 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/30 animate-in fade-in zoom-in-95 duration-200">
          <Dices className="w-3.5 h-3.5 text-amber-400 animate-spin" />
          <span className="text-amber-300 text-[11px] font-semibold">Sampled:</span>
          <span className="px-1.5 py-0.2 rounded bg-amber-950/90 border border-amber-400/60 font-mono font-bold text-amber-200 shadow-sm">
            "{sampledToken.token.trim()}"
          </span>
          <span className="text-[10px] font-mono text-amber-400/90">
            ({(sampledToken.prob * 100).toFixed(1)}%)
          </span>
          {onAppendSampledToken && (
            <button
              onClick={() => onAppendSampledToken(sampledToken.token)}
              className="ml-1 px-1.5 py-0.5 rounded bg-amber-500/25 hover:bg-amber-500/40 text-amber-200 hover:text-white text-[10px] font-mono font-medium transition-colors border border-amber-400/40 flex items-center space-x-0.5"
              title="Append sampled token to the end of sequence (Autoregressive generation step)"
            >
              <Plus className="w-2.5 h-2.5" />
              <span>Append</span>
            </button>
          )}
        </div>
      )}

      {/* Sampling HUD Quick Toggle Pill */}
      {onOpenSamplingHUD && (
        <button
          onClick={onOpenSamplingHUD}
          className={`p-1.5 rounded-lg border transition-all flex items-center space-x-1 ${
            isSamplingHUDOpen
              ? 'bg-amber-500/20 border-amber-400/70 text-amber-300 shadow-sm shadow-amber-500/20'
              : 'bg-slate-900/80 border-slate-700/60 hover:border-amber-400/50 text-slate-400 hover:text-amber-300'
          }`}
          title="Toggle Dynamic Sampling HUD"
        >
          <Dices className="w-3.5 h-3.5" />
          <span className="text-[10px] font-mono font-medium hidden lg:inline">Sampling HUD</span>
        </button>
      )}

      <button
        onClick={handleReset}
        className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors ml-1"
        title="Reset Default Prompt"
      >
        <RefreshCw className="w-3 h-3" />
      </button>
    </div>
  );
};
