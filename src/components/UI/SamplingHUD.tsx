import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Sliders,
  Flame,
  Dices,
  X,
  Maximize2,
  Minimize2,
  BarChart3,
  Sparkles,
  CheckCircle2,
  Activity,
  RotateCcw,
} from 'lucide-react';
import {
  TokenCandidate,
  computeTemperatureSoftmax,
  sampleNextToken,
  getStep19Candidates,
} from '../../data/tokenSimulation';

export interface SamplingHUDProps {
  isOpen: boolean;
  onClose: () => void;
  currentStep?: string;
  onSampleToken?: (selectedToken: TokenCandidate) => void;
  customCandidates?: TokenCandidate[];
  className?: string;
}

export const SamplingHUD: React.FC<SamplingHUDProps> = ({
  isOpen,
  onClose,
  currentStep = 'untied_lm_head',
  onSampleToken,
  customCandidates,
  className = '',
}) => {
  // Sampling hyperparameters state
  const [temperature, setTemperature] = useState<number>(0.7);
  const [topKEnabled, setTopKEnabled] = useState<boolean>(true);
  const [topK, setTopK] = useState<number>(10);
  const [topPEnabled, setTopPEnabled] = useState<boolean>(true);
  const [topP, setTopP] = useState<number>(0.9);

  // UI state
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isSampling, setIsSampling] = useState<boolean>(false);
  const [highlightedTokenId, setHighlightedTokenId] = useState<number | null>(null);
  const [lastSampledToken, setLastSampledToken] = useState<TokenCandidate | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const listContainerRef = useRef<HTMLDivElement>(null);
  const animationTimerRef = useRef<(ReturnType<typeof setTimeout>)[]>([]);

  // Base raw candidate pool
  const baseCandidates = useMemo(() => {
    return customCandidates && customCandidates.length > 0
      ? customCandidates
      : getStep19Candidates();
  }, [customCandidates]);

  // Compute live distribution under current hyperparameters
  const processedCandidates = useMemo(() => {
    return computeTemperatureSoftmax(
      baseCandidates,
      temperature,
      topKEnabled ? topK : undefined,
      topPEnabled ? topP : undefined
    );
  }, [baseCandidates, temperature, topKEnabled, topK, topPEnabled, topP]);

  // Derived metrics
  const activeCandidates = useMemo(
    () => processedCandidates.filter((c) => !c.isFiltered && c.prob > 0),
    [processedCandidates]
  );

  const filteredCount = processedCandidates.length - activeCandidates.length;

  // Shannon Entropy: H = -sum(p * log2(p))
  const entropy = useMemo(() => {
    let h = 0;
    for (const c of activeCandidates) {
      if (c.prob > 0) {
        h -= c.prob * Math.log2(c.prob);
      }
    }
    return Math.max(0, h);
  }, [activeCandidates]);

  // Temperature semantic descriptor
  const tempSemantics = useMemo(() => {
    if (temperature <= 0.25) {
      return {
        label: 'Greedy / Deterministic',
        desc: 'Sharp probability mass, quasi-argmax output',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        glowColor: 'shadow-cyan-500/20',
      };
    } else if (temperature <= 0.8) {
      return {
        label: 'Balanced / Reasoning',
        desc: 'Standard generation balance for coherent logical reasoning',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        glowColor: 'shadow-emerald-500/20',
      };
    } else if (temperature <= 1.3) {
      return {
        label: 'Creative / Diverse',
        desc: 'Wider distribution entropy with moderate diverse outputs',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        glowColor: 'shadow-amber-500/20',
      };
    } else {
      return {
        label: 'High Entropy / Chaotic',
        desc: 'Broad flat logits, high hallucination & entropy risk',
        badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        glowColor: 'shadow-rose-500/20',
      };
    }
  }, [temperature]);

  // Filter list by user search query if entered
  const displayedCandidates = useMemo(() => {
    if (!searchQuery.trim()) return processedCandidates;
    const q = searchQuery.toLowerCase();
    return processedCandidates.filter(
      (c) =>
        c.token.toLowerCase().includes(q) ||
        c.id.toString().includes(q)
    );
  }, [processedCandidates, searchQuery]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      animationTimerRef.current.forEach(clearTimeout);
    };
  }, []);

  // Roulette wheel jumping animation for Monte Carlo sampling
  const handleTriggerSampling = () => {
    if (isSampling || activeCandidates.length === 0) return;

    // Clear any previous animation timers
    animationTimerRef.current.forEach(clearTimeout);
    animationTimerRef.current = [];

    setIsSampling(true);
    const targetToken = sampleNextToken(processedCandidates);

    // Build deceleration interval schedule: fast hops slowing down to the target
    const hopIntervals = [
      35, 35, 35, 40, 45, 55, 70, 90, 120, 160, 220, 300, 420, 580,
    ];

    let accumulatedTime = 0;

    hopIntervals.forEach((interval, index) => {
      accumulatedTime += interval;
      const isLastHop = index === hopIntervals.length - 1;

      const timer = setTimeout(() => {
        if (isLastHop) {
          // Lock on winner
          setHighlightedTokenId(targetToken.id);
          setLastSampledToken(targetToken);
          setIsSampling(false);

          if (onSampleToken) {
            onSampleToken(targetToken);
          }

          // Scroll winner row into view smoothly
          const targetEl = document.getElementById(`token-row-${targetToken.id}`);
          if (targetEl && listContainerRef.current) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        } else {
          // Random hop among active valid candidates
          const randomCandidate =
            activeCandidates[Math.floor(Math.random() * activeCandidates.length)];
          setHighlightedTokenId(randomCandidate.id);
        }
      }, accumulatedTime);

      animationTimerRef.current.push(timer);
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed z-40 transition-all duration-300 select-none ${
        isMinimized
          ? 'bottom-28 right-6 w-80'
          : 'bottom-28 right-6 w-[480px] max-w-[calc(100vw-3rem)] max-h-[calc(100vh-9.5rem)]'
      } flex flex-col bg-[#0b0f19]/95 backdrop-blur-xl border border-slate-800/90 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden ${className}`}
    >
      {/* Top Header / HUD Drag Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-900/90 via-[#0e1626]/90 to-slate-900/90 border-b border-slate-800/80">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-400/30 text-sky-400">
            <Sliders className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono font-bold text-xs text-slate-100 tracking-wide">
                Sampling Pipeline
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Step 19 LM Head
              </span>
            </div>
            {!isMinimized && (
              <p className="text-[10px] text-slate-400 font-mono">
                Logits Softmax • Dynamic Top-k / Top-p
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-1">
          {/* Minimize / Expand Button */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
            title={isMinimized ? 'Expand HUD' : 'Minimize HUD'}
          >
            {isMinimized ? (
              <Maximize2 className="w-3.5 h-3.5" />
            ) : (
              <Minimize2 className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 transition-colors"
            title="Close Sampling HUD"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Minimized Quick Preview */}
      {isMinimized ? (
        <div className="p-3 bg-slate-950/60 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-2">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-300">T: {temperature.toFixed(2)}</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-300">K: {topKEnabled ? topK : 'Off'}</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-300">P: {topPEnabled ? topP.toFixed(2) : 'Off'}</span>
          </div>
          <button
            onClick={handleTriggerSampling}
            disabled={isSampling}
            className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold flex items-center space-x-1"
          >
            <Dices className="w-3 h-3" />
            <span>{isSampling ? '...' : 'Sample'}</span>
          </button>
        </div>
      ) : (
        /* Full Expanded HUD Content */
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Controls & Sliders Section */}
          <div className="p-4 bg-slate-950/40 border-b border-slate-800/80 space-y-3.5">
            {/* 1. Temperature Control */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-mono font-semibold text-slate-200">
                    Temperature (T):
                  </span>
                  <span className="font-mono font-bold text-sky-300 bg-sky-950/80 px-1.5 py-0.5 rounded border border-sky-800/50">
                    {temperature.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => {
                      setTemperature(0.7);
                      setTopK(10);
                      setTopKEnabled(true);
                      setTopP(0.9);
                      setTopPEnabled(true);
                    }}
                    className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
                    title="Reset hyperparameters to default"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                  <div
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${tempSemantics.badgeColor}`}
                  >
                    {tempSemantics.label}
                  </div>
                </div>
              </div>

              {/* Slider input */}
              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  min="0.10"
                  max="2.00"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400 focus:outline-none"
                />
              </div>

              {/* Presets & semantic guide */}
              <div className="flex items-center justify-between pt-0.5">
                <div className="text-[10px] font-mono text-slate-500 truncate max-w-[260px]">
                  {tempSemantics.desc}
                </div>
                <div className="flex items-center space-x-1 font-mono text-[10px]">
                  {[
                    { label: '0.2', val: 0.2, title: 'Greedy' },
                    { label: '0.7', val: 0.7, title: 'Balanced' },
                    { label: '1.2', val: 1.2, title: 'Creative' },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      onClick={() => setTemperature(preset.val)}
                      className={`px-1.5 py-0.5 rounded transition-colors ${
                        temperature === preset.val
                          ? 'bg-sky-500/30 text-sky-200 border border-sky-400/60 font-bold'
                          : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                      title={preset.title}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Top-K and Top-P Dual Row */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-800/60">
              {/* Top-K Section */}
              <div className="bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/60 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={topKEnabled}
                      onChange={(e) => setTopKEnabled(e.target.checked)}
                      className="w-3 h-3 rounded accent-sky-500 bg-slate-800"
                    />
                    <span className="font-mono font-medium text-slate-300">Top-k</span>
                  </label>
                  <span className="font-mono text-[11px] font-bold text-slate-200">
                    {topKEnabled ? topK : 'Off'}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="26"
                  step="1"
                  disabled={!topKEnabled}
                  value={topK}
                  onChange={(e) => setTopK(parseInt(e.target.value, 10))}
                  className={`w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400 focus:outline-none ${
                    !topKEnabled ? 'opacity-30 cursor-not-allowed' : ''
                  }`}
                />
                <div className="flex justify-between text-[9px] font-mono text-slate-500">
                  <span>1 (Argmax)</span>
                  <span>26 (All)</span>
                </div>
              </div>

              {/* Top-P (Nucleus) Section */}
              <div className="bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/60 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={topPEnabled}
                      onChange={(e) => setTopPEnabled(e.target.checked)}
                      className="w-3 h-3 rounded accent-indigo-500 bg-slate-800"
                    />
                    <span className="font-mono font-medium text-slate-300">Top-p</span>
                  </label>
                  <span className="font-mono text-[11px] font-bold text-slate-200">
                    {topPEnabled ? topP.toFixed(2) : 'Off'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="1.00"
                  step="0.05"
                  disabled={!topPEnabled}
                  value={topP}
                  onChange={(e) => setTopP(parseFloat(e.target.value))}
                  className={`w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400 focus:outline-none ${
                    !topPEnabled ? 'opacity-30 cursor-not-allowed' : ''
                  }`}
                />
                <div className="flex justify-between text-[9px] font-mono text-slate-500">
                  <span>0.1 (Strict)</span>
                  <span>1.0 (Full)</span>
                </div>
              </div>
            </div>

            {/* Distribution Health & Shannon Entropy Pill Bar */}
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-[11px] font-mono">
              <div className="flex items-center space-x-3 text-slate-400">
                <div className="flex items-center space-x-1">
                  <span className="text-slate-500">Active:</span>
                  <span className="font-bold text-emerald-400">{activeCandidates.length}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-slate-500">Filtered:</span>
                  <span className="font-bold text-rose-400">{filteredCount}</span>
                </div>
              </div>
              <div className="flex items-center space-x-1.5 text-slate-400">
                <Activity className="w-3 h-3 text-indigo-400" />
                <span className="text-slate-500">Entropy:</span>
                <span className="font-bold text-indigo-300">
                  {entropy.toFixed(3)} <span className="text-[9px] text-slate-500">bits</span>
                </span>
              </div>
            </div>
          </div>

          {/* Winner Spotlight Banner (if sampled) */}
          {lastSampledToken && (
            <div className="mx-4 mt-3 p-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-sky-500/10 to-indigo-500/15 border border-amber-500/40 shadow-lg shadow-amber-500/10 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-1 rounded-lg bg-amber-500/20 text-amber-300">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400/90 font-semibold">
                    Sampled Token Selected
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-sm font-bold text-white bg-slate-900/80 px-2 py-0.5 rounded border border-amber-400/40">
                      "{lastSampledToken.token}"
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      ID: #{lastSampledToken.id}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right font-mono">
                <div className="text-xs font-bold text-amber-300">
                  {(lastSampledToken.prob * 100).toFixed(2)}%
                </div>
                <div className="text-[9px] text-slate-500">P(Token)</div>
              </div>
            </div>
          )}

          {/* Candidate Distribution Table / Bar Chart */}
          <div className="px-4 pt-3 pb-2 flex items-center justify-between text-xs font-mono text-slate-400">
            <div className="flex items-center space-x-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-semibold text-slate-200">Candidate Tokens</span>
              <span className="text-[10px] text-slate-500">
                ({displayedCandidates.length})
              </span>
            </div>

            {/* Quick Filter Search */}
            <input
              type="text"
              placeholder="Search token / ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 placeholder-slate-600 focus:outline-none focus:border-sky-500 w-36"
            />
          </div>

          {/* Scrollable Token Bars Container */}
          <div
            ref={listContainerRef}
            className="flex-1 overflow-y-auto px-4 pb-3 space-y-1.5 max-h-[300px]"
          >
            {displayedCandidates.map((candidate, idx) => {
              const isSelected = highlightedTokenId === candidate.id;
              const isWinner = lastSampledToken?.id === candidate.id;
              const isFiltered = candidate.isFiltered;
              const pct = (candidate.prob * 100).toFixed(2);

              return (
                <div
                  key={candidate.id}
                  id={`token-row-${candidate.id}`}
                  onClick={() => {
                    if (!isFiltered && !isSampling) {
                      setHighlightedTokenId(candidate.id);
                      setLastSampledToken(candidate);
                      onSampleToken?.(candidate);
                    }
                  }}
                  className={`relative p-2 rounded-xl border transition-all duration-150 ${
                    isSelected
                      ? 'bg-amber-500/25 border-amber-400 shadow-md shadow-amber-500/30 scale-[1.01]'
                      : isWinner
                      ? 'bg-amber-950/30 border-amber-500/60'
                      : isFiltered
                      ? 'bg-slate-900/20 border-slate-800/40 opacity-45 cursor-not-allowed'
                      : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/90 cursor-pointer'
                  }`}
                >
                  {/* Background Probability Fill Bar */}
                  {!isFiltered && (
                    <div
                      className="absolute top-0 bottom-0 left-0 rounded-xl bg-gradient-to-r from-sky-600/20 to-indigo-600/25 transition-all duration-200 pointer-events-none"
                      style={{ width: `${Math.max(2, candidate.prob * 100)}%` }}
                    />
                  )}

                  <div className="relative flex items-center justify-between text-xs font-mono">
                    {/* Left: Token Identifier */}
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="text-[10px] text-slate-500 w-5">
                        #{idx + 1}
                      </span>
                      <span
                        className={`font-semibold px-1.5 py-0.5 rounded text-[11px] ${
                          isFiltered
                            ? 'text-slate-400 bg-slate-800/60 line-through'
                            : isWinner
                            ? 'text-amber-200 bg-amber-900/50 border border-amber-500/40'
                            : 'text-sky-300 bg-slate-800/80'
                        }`}
                      >
                        {candidate.token.startsWith(' ') ? (
                          <>
                            <span className="text-slate-500 select-none">␣</span>
                            {candidate.token.slice(1)}
                          </>
                        ) : (
                          candidate.token
                        )}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {candidate.id}
                      </span>
                    </div>

                    {/* Right: Probability & Filter Badges */}
                    <div className="flex items-center space-x-2">
                      {isFiltered ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-bold bg-rose-950/60 text-rose-400 border border-rose-800/40">
                          {candidate.filterReason === 'top-k'
                            ? 'Truncated (Top-K)'
                            : 'Truncated (Top-P)'}
                        </span>
                      ) : (
                        <>
                          <span className="text-[10px] text-slate-500">
                            z: {candidate.logit.toFixed(1)}
                          </span>
                          <span
                            className={`font-bold text-xs ${
                              isSelected || isWinner
                                ? 'text-amber-300'
                                : 'text-slate-200'
                            }`}
                          >
                            {pct}%
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Footer: Roulette Sampling Trigger Button */}
          <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
            <div className="text-[11px] font-mono text-slate-400 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Monte Carlo Roulette</span>
            </div>

            <button
              onClick={handleTriggerSampling}
              disabled={isSampling || activeCandidates.length === 0}
              className={`px-4 py-2 rounded-xl font-mono text-xs font-bold flex items-center space-x-2 transition-all shadow-lg ${
                isSampling
                  ? 'bg-amber-600 text-white cursor-wait animate-pulse shadow-amber-500/40'
                  : activeCandidates.length === 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-sky-500 via-indigo-500 to-amber-500 hover:from-sky-400 hover:to-amber-400 text-white shadow-sky-500/20 hover:shadow-sky-500/40 active:scale-95'
              }`}
            >
              <Dices className={`w-4 h-4 ${isSampling ? 'animate-spin' : ''}`} />
              <span>{isSampling ? 'Rolling Roulette...' : '🎲 Sample Token'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
