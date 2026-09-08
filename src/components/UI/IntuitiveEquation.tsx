import React, { useState, useMemo } from 'react';
import katex from 'katex';
import {
  BookOpen,
  Cpu,
  Lightbulb,
  Copy,
  Check,
  Code,
  ArrowRight,
  Sparkles,
  Layers,
  HelpCircle,
  Maximize2
} from 'lucide-react';
import { EquationVariable, IntuitiveFormulaData, DataflowStage } from '../../types/model';
import { getEquationData, EnrichedEquationData } from '../../data/equationData';

export interface IntuitiveEquationProps {
  /** Optional ID to look up predefined equation data (e.g. 'qkv_proj', 'node_latent_down') */
  equationId?: string;
  /** Custom equation data (overrides lookup if provided) */
  data?: IntuitiveFormulaData;
  /** Fallback raw LaTeX string if full data not provided */
  formula?: string;
  /** UI presentation variant: 'full' for modal inspector, 'compact' for narrator bar */
  variant?: 'full' | 'compact' | 'minimal';
  /** Optional title override */
  title?: string;
  /** Action when user wants to expand / view deep dive in compact mode */
  onOpenDetails?: () => void;
  className?: string;
}

// Safely render KaTeX math to HTML string with error fallback
export function renderMath(tex: string, displayMode: boolean = false): { html: string; error?: string } {
  try {
    const html = katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      output: 'html',
      strict: false,
    });
    return { html };
  } catch (err: any) {
    return {
      html: `<span class="font-mono text-red-400 text-xs">${tex}</span>`,
      error: err?.message || 'Math rendering error',
    };
  }
}

// Color schemes for variable badges & dataflow nodes
const COLOR_MAP: Record<string, { bg: string; text: string; border: string; glow: string; ring: string }> = {
  sky: {
    bg: 'bg-sky-950/80',
    text: 'text-sky-300',
    border: 'border-sky-700/60',
    glow: 'rgba(56, 189, 248, 0.25)',
    ring: 'ring-sky-400',
  },
  purple: {
    bg: 'bg-purple-950/80',
    text: 'text-purple-300',
    border: 'border-purple-700/60',
    glow: 'rgba(192, 132, 252, 0.25)',
    ring: 'ring-purple-400',
  },
  emerald: {
    bg: 'bg-emerald-950/80',
    text: 'text-emerald-300',
    border: 'border-emerald-700/60',
    glow: 'rgba(52, 211, 153, 0.25)',
    ring: 'ring-emerald-400',
  },
  amber: {
    bg: 'bg-amber-950/80',
    text: 'text-amber-300',
    border: 'border-amber-700/60',
    glow: 'rgba(251, 191, 36, 0.25)',
    ring: 'ring-amber-400',
  },
  rose: {
    bg: 'bg-rose-950/80',
    text: 'text-rose-300',
    border: 'border-rose-700/60',
    glow: 'rgba(251, 113, 133, 0.25)',
    ring: 'ring-rose-400',
  },
  indigo: {
    bg: 'bg-indigo-950/80',
    text: 'text-indigo-300',
    border: 'border-indigo-700/60',
    glow: 'rgba(129, 140, 248, 0.25)',
    ring: 'ring-indigo-400',
  },
  cyan: {
    bg: 'bg-cyan-950/80',
    text: 'text-cyan-300',
    border: 'border-cyan-700/60',
    glow: 'rgba(34, 211, 238, 0.25)',
    ring: 'ring-cyan-400',
  },
};

export const IntuitiveEquation: React.FC<IntuitiveEquationProps> = ({
  equationId,
  data,
  formula,
  variant = 'full',
  title,
  onOpenDetails,
  className = '',
}) => {
  // Resolve formula data
  const resolvedData: IntuitiveFormulaData = useMemo(() => {
    if (data) return data;
    if (equationId) {
      const found = getEquationData(equationId);
      if (found) return found;
    }
    return {
      formula: formula || 'y = x',
      intuitiveMeaning: 'Performs state transformation in the hidden representation space.',
    };
  }, [equationId, data, formula]);

  const [activeVarIndex, setActiveVarIndex] = useState<number | null>(
    resolvedData.variables && resolvedData.variables.length > 0 ? 0 : null
  );
  const [copied, setCopied] = useState(false);
  const [showRawTex, setShowRawTex] = useState(false);

  // Copy LaTeX code to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(resolvedData.formula);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const mainMath = useMemo(() => {
    return renderMath(resolvedData.formula, variant !== 'compact');
  }, [resolvedData.formula, variant]);

  const activeVariable = useMemo(() => {
    if (activeVarIndex === null || !resolvedData.variables) return null;
    return resolvedData.variables[activeVarIndex] || null;
  }, [activeVarIndex, resolvedData.variables]);

  /* -------------------------------------------------------------------------- */
  /* COMPACT VARIANT (Used in top-left Walkthrough Narrator bar)                 */
  /* -------------------------------------------------------------------------- */
  if (variant === 'compact') {
    return (
      <div className={`flex flex-col space-y-2 select-none ${className}`}>
        {/* KaTeX Math Card */}
        <div className="group relative rounded-lg bg-slate-950/90 border border-slate-800 p-2 shadow-inner hover:border-slate-700 transition-colors">
          <div
            className="overflow-x-auto text-sky-200 text-xs font-mono py-1 px-1.5 scrollbar-thin scrollbar-thumb-slate-700"
            dangerouslySetInnerHTML={{ __html: mainMath.html }}
          />
          <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
            <button
              onClick={handleCopy}
              className="p-1 rounded bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="Copy LaTeX Formula"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
            {onOpenDetails && (
              <button
                onClick={onOpenDetails}
                className="p-1 rounded bg-slate-900 border border-slate-700 hover:bg-slate-800 text-sky-400 hover:text-sky-300 transition-colors"
                title="Inspect Dimensions & Variables"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Intuitive Meaning Snippet */}
        {resolvedData.intuitiveMeaning && (
          <div className="flex items-start space-x-1.5 text-[11px] text-amber-200/90 bg-amber-950/30 border border-amber-900/40 rounded-md p-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
            <span className="leading-snug">{resolvedData.intuitiveMeaning}</span>
          </div>
        )}

        {/* Quick Variable Badges Row */}
        {resolvedData.variables && resolvedData.variables.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 pt-0.5">
            <span className="text-[10px] uppercase font-mono text-slate-500 mr-0.5">Variables:</span>
            {resolvedData.variables.map((v, idx) => {
              const symMath = renderMath(v.symbol, false);
              const color = COLOR_MAP[v.color || 'sky'] || COLOR_MAP.sky;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (onOpenDetails) onOpenDetails();
                    setActiveVarIndex(idx);
                  }}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-all flex items-center space-x-1 ${color.bg} ${color.text} ${color.border} hover:brightness-125`}
                  title={`${v.name}: ${v.description}`}
                >
                  <span dangerouslySetInnerHTML={{ __html: symMath.html }} />
                  {v.shape && <span className="opacity-70 text-[9px]">({v.shape})</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* FULL VARIANT (Used in Inspector Modal & Detailed Math View)                 */
  /* -------------------------------------------------------------------------- */
  return (
    <div className={`flex flex-col space-y-3.5 select-none ${className}`}>
      {/* Formula Rendering Box */}
      <div className="relative rounded-xl bg-gradient-to-b from-slate-950 to-[#070b14] border border-slate-800 p-3.5 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2.5">
          <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-slate-300">
            <BookOpen className="w-3.5 h-3.5 text-sky-400" />
            <span>{title || 'Mathematical Formulation & Operator'}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setShowRawTex(!showRawTex)}
              className={`px-2 py-0.5 text-[10px] font-mono rounded border transition-colors flex items-center space-x-1 ${
                showRawTex
                  ? 'bg-indigo-900/80 border-indigo-600 text-indigo-200'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle LaTeX Source / KaTeX view"
            >
              <Code className="w-3 h-3" />
              <span>{showRawTex ? 'Rendered Math' : 'LaTeX'}</span>
            </button>
            <button
              onClick={handleCopy}
              className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors flex items-center space-x-1"
              title="Copy LaTeX formula"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* KaTeX Math or Raw LaTeX View */}
        {showRawTex ? (
          <pre className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-indigo-300 overflow-x-auto whitespace-pre-wrap select-text">
            {resolvedData.formula}
          </pre>
        ) : (
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-center overflow-x-auto text-sky-200 text-sm shadow-inner py-4 scrollbar-thin scrollbar-thumb-slate-700">
            <div dangerouslySetInnerHTML={{ __html: mainMath.html }} />
          </div>
        )}
      </div>

      {/* Visual Dataflow / Dimension Breakdown Pipeline */}
      {resolvedData.dataflow && (
        <div className="rounded-xl bg-[#080d1a]/90 border border-slate-800 p-3 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
            <div className="flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>Visual Dataflow & Dimension Transformation</span>
            </div>
            {resolvedData.dataflow.transformationNote && (
              <span className="text-[10px] font-mono text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/60">
                {resolvedData.dataflow.transformationNote}
              </span>
            )}
          </div>

          {/* Visual Pipeline Stages */}
          {resolvedData.dataflow.stages && resolvedData.dataflow.stages.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
              {resolvedData.dataflow.stages.map((stage, idx) => {
                const isLast = idx === (resolvedData.dataflow?.stages?.length ?? 0) - 1;
                const typeStyle =
                  stage.type === 'input'
                    ? 'border-sky-700/60 bg-sky-950/50 text-sky-200'
                    : stage.type === 'weight'
                    ? 'border-purple-700/60 bg-purple-950/50 text-purple-200'
                    : stage.type === 'output'
                    ? 'border-emerald-700/60 bg-emerald-950/50 text-emerald-200'
                    : 'border-amber-700/60 bg-amber-950/50 text-amber-200';

                return (
                  <React.Fragment key={idx}>
                    <div className={`p-2 rounded-lg border flex flex-col min-w-[90px] shadow-sm ${typeStyle}`}>
                      <span className="text-[9px] uppercase tracking-wider opacity-60 font-sans font-bold">
                        {stage.label}
                      </span>
                      <span className="font-bold text-[11px] truncate mt-0.5">{stage.name}</span>
                      <span className="text-[10px] opacity-80 mt-0.5 truncate">{stage.shape}</span>
                      {stage.subtext && (
                        <span className="text-[9px] opacity-60 mt-0.5">{stage.subtext}</span>
                      )}
                    </div>
                    {!isLast && (
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          ) : (
            /* Simple 4-stage fallback dataflow */
            <div className="grid grid-cols-4 gap-2 font-mono text-xs text-center">
              <div className="p-2 rounded-lg bg-sky-950/40 border border-sky-800/60 text-sky-200">
                <div className="text-[9px] text-slate-400 uppercase font-sans">Input Shape</div>
                <div className="font-bold mt-0.5 truncate">{resolvedData.dataflow.inputShape || 'x'}</div>
              </div>
              <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-200">
                <div className="text-[9px] text-slate-400 uppercase font-sans">Operation</div>
                <div className="font-bold mt-0.5 truncate">{resolvedData.dataflow.operation || 'Transform'}</div>
              </div>
              <div className="p-2 rounded-lg bg-purple-950/40 border border-purple-800/60 text-purple-200">
                <div className="text-[9px] text-slate-400 uppercase font-sans">Weights</div>
                <div className="font-bold mt-0.5 truncate">{resolvedData.dataflow.weightShape || 'Parameters'}</div>
              </div>
              <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-200">
                <div className="text-[9px] text-slate-400 uppercase font-sans">Output Shape</div>
                <div className="font-bold mt-0.5 truncate">{resolvedData.dataflow.outputShape || 'y'}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Plain English / Intuitive Meaning Callout */}
      {resolvedData.intuitiveMeaning && (
        <div className="rounded-xl bg-gradient-to-r from-amber-950/40 via-amber-950/20 to-slate-900/60 border border-amber-700/50 p-3 shadow-lg">
          <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-amber-400 mb-1">
            <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="uppercase tracking-wider text-[10px]">Architectural Intuition (Why This Math?)</span>
          </div>
          <p className="text-xs text-amber-100/90 leading-relaxed pl-5 font-sans">
            {resolvedData.intuitiveMeaning}
          </p>
        </div>
      )}

      {/* Interactive Variable Chips / Badges */}
      {resolvedData.variables && resolvedData.variables.length > 0 && (
        <div className="rounded-xl bg-[#090e1b] border border-slate-800 p-3 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
            <div className="flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Interactive Variable Inspector</span>
            </div>
            <span className="text-[10px] text-slate-500">Click a variable to explore definition & hardware specs</span>
          </div>

          {/* Variable Badges List */}
          <div className="flex flex-wrap gap-1.5">
            {resolvedData.variables.map((v, idx) => {
              const isActive = activeVarIndex === idx;
              const color = COLOR_MAP[v.color || 'sky'] || COLOR_MAP.sky;
              const symMath = renderMath(v.symbol, false);

              return (
                <button
                  key={idx}
                  onClick={() => setActiveVarIndex(isActive ? null : idx)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-medium transition-all flex items-center space-x-1.5 ${
                    isActive
                      ? `${color.bg} ${color.text} ${color.border} ring-2 ${color.ring} shadow-md`
                      : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <span
                    className="font-bold"
                    dangerouslySetInnerHTML={{ __html: symMath.html }}
                  />
                  <span className="text-[11px] font-sans opacity-90">{v.name}</span>
                </button>
              );
            })}
          </div>

          {/* Active Variable Deep-Dive Card */}
          {activeVariable && (
            <div className="mt-2.5 p-3 rounded-lg bg-slate-950 border border-slate-700/80 shadow-inner space-y-2 animate-fadeIn">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <div className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-xs text-sky-300">
                    <span
                      dangerouslySetInnerHTML={{
                        __html: renderMath(activeVariable.symbol, false).html,
                      }}
                    />
                  </div>
                  <h4 className="text-xs font-bold text-slate-100">{activeVariable.name}</h4>
                </div>
                {activeVariable.shape && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 border border-purple-800 text-purple-300">
                    Shape: {activeVariable.shape}
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {activeVariable.description}
              </p>

              {/* Hardware Context */}
              {activeVariable.hardwareContext && (
                <div className="pt-1.5 border-t border-slate-800/80 flex items-start space-x-1.5 text-[11px] font-mono text-emerald-300">
                  <Cpu className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-400 font-sans">Hardware context: </strong>
                    {activeVariable.hardwareContext}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Re-export alias for convenience
export const InteractiveFormula = IntuitiveEquation;
export default IntuitiveEquation;
