import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Target, Microscope, Pin, PinOff, X, Sparkles, Focus, Zap, Activity } from 'lucide-react';

export interface HoveredCellInfo {
  tensorId: string;
  tensorLabel: string;
  row: number;
  col: number;
  totalRows: number;
  totalCols: number;
  value: number;
  isWeight?: boolean;
  specialNote?: string;
  subDimensions?: number[]; // optional precomputed or ground-truth 96-dim vector slice
}

export interface CellHoverHUDProps {
  cellInfo: HoveredCellInfo | null;
  onClose?: () => void;
  isSamplingHUDOpen?: boolean;
}

// Deterministic 32-bit FNV-1a hash
function stringHash(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// Fast deterministic Mulberry32 PRNG
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Synthesizes a deterministic 96-dimensional slice for a logical tensor block
function generateDeterministic96Slice(
  tensorId: string,
  row: number,
  col: number,
  macroValue: number,
  isWeight?: boolean,
  specialNote?: string
): number[] {
  if (specialNote && (specialNote.toLowerCase().includes('mask') || specialNote.includes('0.0000'))) {
    return new Array(96).fill(0);
  }

  const hash = stringHash(tensorId);
  const seed = (hash ^ (row * 73856093) ^ (col * 19349663) ^ (isWeight ? 0xdeadbeef : 0xcafebabe)) >>> 0;
  const rng = mulberry32(seed);
  const slice: number[] = new Array(96);

  for (let i = 0; i < 96; i++) {
    const u1 = rng();
    const u2 = rng();
    // Box-Muller transform for standard Gaussian perturbation
    const z0 = Math.sqrt(-2.0 * Math.log(Math.max(1e-9, u1))) * Math.cos(2.0 * Math.PI * u2);

    if (isWeight) {
      // Weights: zero-centered distribution with macro bias
      const w = macroValue * 0.5 + z0 * 0.28;
      slice[i] = Math.round(w * 10000) / 10000;
    } else {
      // Activations: correlated harmonic clusters + macro centering + occasional sparse activations
      const clusterPhase = Math.sin((i / 96) * Math.PI * 4 + (col % 8));
      const sparsitySpike = rng() > 0.88 ? (rng() > 0.5 ? 1 : -1) * (0.4 + rng() * 0.8) : 0;
      const act = macroValue * 0.75 + clusterPhase * 0.18 + z0 * 0.22 + sparsitySpike;
      slice[i] = Math.round(act * 10000) / 10000;
    }
  }

  return slice;
}

// Bipolar colormap mapper: negative -> cool cyan-blue, zero -> dark midnight slate, positive -> warm orange-red
function getBipolarRGB(val: number, maxAbs: number): [number, number, number] {
  if (maxAbs <= 1e-6) return [13, 17, 28];
  const t = Math.max(-1, Math.min(1, val / maxAbs));
  if (Math.abs(t) < 0.02) {
    return [13, 17, 28]; // neutral dark slate
  }
  if (t < 0) {
    // Negative: cool cyan-blue
    const u = Math.abs(t);
    const r = Math.round(10 + u * 15);
    const g = Math.round(25 + u * 160);
    const b = Math.round(45 + u * 205);
    return [r, g, b];
  } else {
    // Positive: warm flame orange-red
    const u = t;
    const r = Math.round(35 + u * 215);
    const g = Math.round(20 + u * 100);
    const b = Math.round(15 + u * 40);
    return [r, g, b];
  }
}

export const CellHoverHUD: React.FC<CellHoverHUDProps> = ({
  cellInfo,
  onClose,
  isSamplingHUDOpen,
}) => {
  const [displayedCell, setDisplayedCell] = useState<HoveredCellInfo | null>(cellInfo);
  const [isPinned, setIsPinned] = useState(false);
  const [isMouseOverHUD, setIsMouseOverHUD] = useState(false);
  const [hoveredSubDim, setHoveredSubDim] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRectRef = useRef<DOMRect | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClose = useCallback(() => {
    setIsPinned(false);
    setDisplayedCell(null);
    setHoveredSubDim(null);
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    onClose?.();
  }, [onClose]);

  // Global Escape shortcut to unlock and dismiss HUD immediately
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'Escape' || e.code === 'Escape') {
        if (displayedCell || isPinned) {
          handleClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayedCell, isPinned, handleClose]);

  // Synchronize incoming cellInfo with graceful persistence
  useEffect(() => {
    if (cellInfo) {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      setDisplayedCell(cellInfo);
    } else if (!isPinned && !isMouseOverHUD) {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = setTimeout(() => {
        setDisplayedCell(null);
        setHoveredSubDim(null);
      }, 450);
    }
  }, [cellInfo, isPinned, isMouseOverHUD]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  const handleMouseEnterHUD = useCallback(() => {
    setIsMouseOverHUD(true);
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const handleMouseLeaveHUD = useCallback(() => {
    setIsMouseOverHUD(false);
    if (!cellInfo && !isPinned) {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = setTimeout(() => {
        setDisplayedCell(null);
        setHoveredSubDim(null);
      }, 350);
    }
  }, [cellInfo, isPinned]);

  // Tensor semantic classification for physical interpretation
  const isAttentionMatrix = Boolean(
    displayedCell &&
      (displayedCell.tensorId.includes('attn') ||
        displayedCell.tensorId.includes('node_attn_matrix') ||
        displayedCell.tensorId.includes('attn_scores') ||
        displayedCell.tensorLabel.toLowerCase().includes('attention'))
  );

  const isGatingScalar = Boolean(
    displayedCell &&
      (displayedCell.tensorId.includes('gate') ||
        displayedCell.tensorId.includes('head_gates') ||
        displayedCell.tensorId.includes('router') ||
        displayedCell.tensorLabel.toLowerCase().includes('gate') ||
        displayedCell.tensorLabel.toLowerCase().includes('router'))
  );

  const isScalarTensor = isAttentionMatrix || isGatingScalar;
  // High-dimensional hidden state tensors (Marin 535B 6144/3072 dims)
  const isHiddenState = !isScalarTensor;

  // 96-dimensional slice extraction / generation (only for high-dimensional hidden representations)
  const subDimensions = useMemo(() => {
    if (!displayedCell || !isHiddenState) return [];
    if (displayedCell.subDimensions && displayedCell.subDimensions.length === 96) {
      return displayedCell.subDimensions;
    }
    return generateDeterministic96Slice(
      displayedCell.tensorId,
      displayedCell.row,
      displayedCell.col,
      displayedCell.value,
      displayedCell.isWeight,
      displayedCell.specialNote
    );
  }, [displayedCell, isHiddenState]);

  // Statistical metrics: RMS, Max, Min, MaxAbs
  const stats = useMemo(() => {
    if (!subDimensions || subDimensions.length === 0) {
      return { rms: 0, max: 0, min: 0, maxAbs: 0 };
    }
    let sumSq = 0;
    let max = -Infinity;
    let min = Infinity;
    let maxAbs = 0;

    for (let i = 0; i < subDimensions.length; i++) {
      const v = subDimensions[i];
      sumSq += v * v;
      if (v > max) max = v;
      if (v < min) min = v;
      const absV = Math.abs(v);
      if (absV > maxAbs) maxAbs = absV;
    }

    const rms = Math.sqrt(sumSq / subDimensions.length);
    return {
      rms,
      max: max === -Infinity ? 0 : max,
      min: min === Infinity ? 0 : min,
      maxAbs,
    };
  }, [subDimensions]);

  // Canvas 2D Vector Microscope rendering (Fixed 640x112 physical Retina buffer, zero dynamic reallocation)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !displayedCell || !isHiddenState) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cssWidth = 320;
    const cssHeight = 56;

    // Reset transform and scale 2x for Retina 640x112 physical canvas
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    // Canvas background
    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    const isMasked = Boolean(
      displayedCell.specialNote &&
        (displayedCell.specialNote.toLowerCase().includes('mask') || displayedCell.specialNote.includes('0.0000'))
    );

    const totalSubDims = 96;
    const slotW = cssWidth / totalSubDims;
    const zeroY = 18; // Midline for zero amplitude in upper chart
    const ribbonY = 38; // Lower dense heatmap ribbon start Y
    const ribbonH = 14; // Lower dense heatmap ribbon height

    // Zero-axis baseline in upper waveform section
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, zeroY);
    ctx.lineTo(cssWidth, zeroY);
    ctx.stroke();

    // Section divider line between amplitude bars and chromatic ribbon
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.55)';
    ctx.beginPath();
    ctx.moveTo(0, ribbonY - 2);
    ctx.lineTo(cssWidth, ribbonY - 2);
    ctx.stroke();

    if (isMasked) {
      // Muted visualization for causal-masked blocks
      ctx.fillStyle = '#0a0e1a';
      ctx.fillRect(0, ribbonY, cssWidth, ribbonH);

      ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('CAUSAL MASKED · 96 DIMS ZEROED', cssWidth / 2, zeroY + 4);
    } else {
      const maxMag = Math.max(0.08, stats.maxAbs);

      // 1. Upper Bipolar Amplitude Bar Chart
      for (let k = 0; k < totalSubDims; k++) {
        const val = subDimensions[k];
        const normVal = Math.max(-1, Math.min(1, val / maxMag));
        const barH = Math.abs(normVal) * 15;
        const [r, g, b] = getBipolarRGB(val, maxMag);

        const x = k * slotW;
        const barY = val >= 0 ? zeroY - barH : zeroY;

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x + 0.35, barY, Math.max(1, slotW - 0.7), Math.max(1, barH));
      }

      // 2. Lower Continuous Chromatic Spectrum Ribbon
      for (let k = 0; k < totalSubDims; k++) {
        const val = subDimensions[k];
        const [r, g, b] = getBipolarRGB(val, maxMag);
        const x = k * slotW;

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x, ribbonY, Math.max(1, slotW), ribbonH);
      }

      // 3. Interactive Probe Reticle & Laser Cursor
      if (hoveredSubDim !== null && hoveredSubDim >= 0 && hoveredSubDim < totalSubDims) {
        const hx = hoveredSubDim * slotW;
        const hVal = subDimensions[hoveredSubDim];

        // Vertical laser beam across canvas
        ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.fillRect(hx, 0, Math.max(2, slotW), cssHeight);

        // Highlight bar in upper amplitude chart
        const normVal = Math.max(-1, Math.min(1, hVal / maxMag));
        const barH = Math.abs(normVal) * 15;
        const barY = hVal >= 0 ? zeroY - barH : zeroY;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(hx - 0.5, barY, Math.max(2, slotW + 1), Math.max(2, barH));

        // Neon border on lower ribbon cell
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(hx - 0.5, ribbonY, Math.max(3, slotW + 1), ribbonH);

        // Reticle pointer tick at top axis
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(hx + slotW / 2 - 2.5, 1);
        ctx.lineTo(hx + slotW / 2 + 2.5, 1);
        ctx.lineTo(hx + slotW / 2, 4.5);
        ctx.closePath();
        ctx.fill();
      }
    }
  }, [displayedCell, isHiddenState, subDimensions, stats, hoveredSubDim]);

  // Interactive probe mouse handlers with cached bounding rect (eliminating forced reflow)
  const handleCanvasMouseEnter = useCallback(() => {
    if (canvasRef.current) {
      canvasRectRef.current = canvasRef.current.getBoundingClientRect();
    }
  }, []);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    let rect = canvasRectRef.current;
    if (!rect && canvasRef.current) {
      rect = canvasRef.current.getBoundingClientRect();
      canvasRectRef.current = rect;
    }
    if (!rect || rect.width <= 0) return;
    const relX = Math.max(0, Math.min(rect.width - 0.001, e.clientX - rect.left));
    const subIdx = Math.min(95, Math.max(0, Math.floor((relX / rect.width) * 96)));
    setHoveredSubDim(subIdx);
  }, []);

  const handleCanvasMouseLeave = useCallback(() => {
    setHoveredSubDim(null);
  }, []);

  if (!displayedCell) return null;

  const isPos = displayedCell.value >= 0;
  const absVal = Math.abs(displayedCell.value);
  const percent = Math.min(100, Math.round(absVal * 100));

  // Marin 535B logical dimension bounds (64 logical blocks * 96 = 6144 hidden dim)
  const startDim = displayedCell.col * 96;
  const endDim = (displayedCell.col + 1) * 96 - 1;

  // Active probed sub-dimension details
  const probedValue =
    hoveredSubDim !== null && subDimensions[hoveredSubDim] !== undefined
      ? subDimensions[hoveredSubDim]
      : null;
  const probedGlobalDim = hoveredSubDim !== null ? startDim + hoveredSubDim : null;

  return (
    <div
      onMouseEnter={handleMouseEnterHUD}
      onMouseLeave={handleMouseLeaveHUD}
      className={`absolute bottom-20 ${
        isSamplingHUDOpen ? 'right-[516px]' : 'right-6'
      } z-30 bg-[#090d16]/95 backdrop-blur-xl border ${
        isPinned
          ? 'border-amber-500/70 shadow-[0_8px_32px_rgba(0,0,0,0.8),0_0_20px_rgba(245,158,11,0.2)]'
          : 'border-sky-500/60 shadow-[0_8px_32px_rgba(0,0,0,0.7),0_0_15px_rgba(56,189,248,0.15)]'
      } rounded-xl p-3 min-w-[320px] w-84 font-mono select-none pointer-events-auto animate-in fade-in duration-150 transition-all`}
    >
      {/* Top Header: Tensor Label, Pin, Type Badge */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
        <div className="flex items-center space-x-1.5 text-xs font-bold text-sky-300 truncate max-w-[170px]">
          <Target className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="truncate">{displayedCell.tensorLabel}</span>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            onClick={() => setIsPinned(!isPinned)}
            className={`p-1 rounded transition-colors ${
              isPinned
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'text-slate-400 hover:text-sky-300 hover:bg-slate-800/80'
            }`}
            title={isPinned ? 'Unpin HUD (Currently Locked)' : 'Pin HUD for continuous micro-inspection'}
          >
            {isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
          </button>

          {isPinned && (
            <button
              onClick={handleClose}
              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors"
              title="Close HUD (Esc)"
            >
              <X className="w-3 h-3" />
            </button>
          )}

          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/50">
            {isAttentionMatrix
              ? 'Attention Matrix'
              : isGatingScalar
              ? 'Gating / Router'
              : displayedCell.isWeight
              ? 'Weight Matrix'
              : 'Hidden State'}
          </span>
        </div>
      </div>

      {/* Grid Coordinates & Marin Architecture Dimensions */}
      <div className="grid grid-cols-2 gap-2 text-[11px] mb-2">
        <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
          <span className="text-slate-500 block text-[10px]">
            {isAttentionMatrix ? 'Query Token (Qᵢ):' : 'Row / Token:'}
          </span>
          <span className="text-slate-200 font-semibold">
            {displayedCell.row} <span className="text-slate-500">/ {displayedCell.totalRows}</span>
          </span>
        </div>
        <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
          <span className="text-slate-500 block text-[10px]">
            {isAttentionMatrix
              ? 'Key Token (Kⱼ):'
              : isGatingScalar
              ? displayedCell.tensorId.includes('router')
                ? 'Expert ID:'
                : 'Head ID:'
              : 'Col / Block:'}
          </span>
          <span className="text-slate-200 font-semibold">
            {displayedCell.col} <span className="text-slate-500">/ {displayedCell.totalCols}</span>
          </span>
        </div>
      </div>

      {/* Macro Float Value & Magnitude Bar */}
      <div className="bg-slate-950 p-2 rounded border border-slate-800 space-y-1.5 mb-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[11px]">
            {isAttentionMatrix
              ? `Softmax A[${displayedCell.row}, ${displayedCell.col}]:`
              : isGatingScalar
              ? displayedCell.tensorId.includes('router')
                ? 'Router Dispatch Score:'
                : 'Head Gate Scalar (2·σ):'
              : 'Block Mean:'}
          </span>
          <span
            className={`font-bold ${
              displayedCell.specialNote
                ? 'text-slate-500'
                : isPos
                ? isAttentionMatrix
                  ? 'text-sky-300'
                  : isGatingScalar
                  ? 'text-amber-400'
                  : 'text-emerald-400'
                : 'text-rose-400'
            }`}
          >
            {displayedCell.specialNote
              ? displayedCell.specialNote
              : isAttentionMatrix
              ? `${(displayedCell.value * 100).toFixed(2)}% (${displayedCell.value.toFixed(4)})`
              : `${isPos ? '+' : ''}${displayedCell.value.toFixed(4)}`}
          </span>
        </div>

        {/* Visual Bar */}
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
          {isAttentionMatrix ? (
            <div
              className="h-full bg-gradient-to-r from-sky-400 to-indigo-400 rounded-full transition-all duration-75"
              style={{ width: `${Math.min(100, Math.round(displayedCell.value * 100))}%` }}
            />
          ) : isGatingScalar ? (
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-rose-400 rounded-full transition-all duration-75"
              style={{
                width: `${Math.min(
                  100,
                  Math.round(
                    (displayedCell.value / (displayedCell.tensorId.includes('router') ? 1 : 2)) * 100
                  )
                )}%`,
              }}
            />
          ) : isPos ? (
            <div
              className="h-full bg-emerald-400 rounded-full transition-all duration-75"
              style={{ width: `${percent}%` }}
            />
          ) : (
            <div
              className="h-full bg-rose-500 rounded-full transition-all duration-75"
              style={{ width: `${percent}%` }}
            />
          )}
        </div>
      </div>

      {/* 1. Attention Scalar Semantics */}
      {isAttentionMatrix && (
        <div className="border-t border-slate-800/80 pt-2 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-sky-300">
              <Focus className="w-3.5 h-3.5 text-sky-400" />
              <span>Attention Softmax Logit</span>
            </div>
            <span className="text-[9px] text-slate-500 font-mono">
              A[{displayedCell.row}, {displayedCell.col}]
            </span>
          </div>

          {displayedCell.specialNote ? (
            <div className="bg-[#060a12] border border-slate-800/90 rounded-lg p-2.5 space-y-1">
              <div className="flex items-center space-x-2 text-xs font-bold text-amber-400">
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/20 border border-amber-500/40 text-amber-300">
                  MASKED
                </span>
                <span className="text-slate-300 font-mono text-[10px]">
                  A[{displayedCell.row}, {displayedCell.col}] = 0.0000
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-normal font-sans">
                {displayedCell.specialNote.includes('Strict Causal')
                  ? 'Causal Mask Applied: Future tokens strictly masked (j > i, upper-triangular mask matrix Softmax = 0).'
                  : 'Local Sliding Window Mask: Beyond local attention span window, strictly clamped to 0.'}
              </p>
            </div>
          ) : (
            <div className="bg-[#060a12] border border-slate-800/90 rounded-lg p-2.5 space-y-2 font-mono">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[10px] uppercase font-semibold">
                  Attention Probability:
                </span>
                <span className="text-sky-300 font-bold text-sm">
                  {(displayedCell.value * 100).toFixed(2)}%
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-indigo-400 rounded-full transition-all duration-150"
                  style={{ width: `${Math.min(100, Math.max(0, displayedCell.value * 100))}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-800/60">
                <span>
                  Exact Scalar: <b className="text-slate-200">{displayedCell.value.toFixed(6)}</b>
                </span>
                <span className={displayedCell.value > 0.25 ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                  {displayedCell.value > 0.25 ? '★ Primary Attention Focus' : 'Contextual Connection'}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-1.5 text-[10px] pt-1 font-mono">
            <div className="bg-slate-900/90 px-1 py-1 rounded border border-slate-800/70 text-center">
              <span className="text-slate-500 block text-[8px]">PROB</span>
              <span className="text-sky-300 font-bold">{(displayedCell.value * 100).toFixed(1)}%</span>
            </div>
            <div className="bg-slate-900/90 px-1 py-1 rounded border border-slate-800/70 text-center">
              <span className="text-slate-500 block text-[8px]">RAW VALUE</span>
              <span className="text-emerald-400 font-bold">{displayedCell.value.toFixed(4)}</span>
            </div>
            <div className="bg-slate-900/90 px-1 py-1 rounded border border-slate-800/70 text-center">
              <span className="text-slate-500 block text-[8px]">STATUS</span>
              <span className={displayedCell.specialNote ? 'text-slate-500 font-bold' : 'text-amber-400 font-bold'}>
                {displayedCell.specialNote ? 'Masked' : 'Active'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Gating / Routing Scalar Semantics */}
      {isGatingScalar && (
        <div className="border-t border-slate-800/80 pt-2 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-amber-300">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {displayedCell.tensorId.includes('router') ? 'QB Routing Dispatch' : 'Head Gate Multiplier'}
              </span>
            </div>
            <span className="text-[9px] text-slate-500 font-mono">
              Scalar [{displayedCell.row}, {displayedCell.col}]
            </span>
          </div>

          <div className="bg-[#060a12] border border-slate-800/90 rounded-lg p-2.5 space-y-2 font-mono">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Scalar Multiplier:</span>
              <span className="text-amber-300 font-bold text-sm">{displayedCell.value.toFixed(4)}</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-rose-400 rounded-full transition-all duration-150"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      0,
                      (displayedCell.value / (displayedCell.tensorId.includes('router') ? 1 : 2)) * 100
                    )
                  )}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-800/60">
              <span>
                Domain:{' '}
                <b className="text-slate-200">
                  {displayedCell.tensorId.includes('router') ? '[0.0 .. 1.0]' : '[0.0 .. 2.0]'}
                </b>
              </span>
              <span className={displayedCell.value > 0 ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                {displayedCell.value > 0 ? '● Active Multiplier' : '○ Suppressed'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[10px] pt-1 font-mono">
            <div className="bg-slate-900/90 px-1 py-1 rounded border border-slate-800/70 text-center">
              <span className="text-slate-500 block text-[8px]">MAGNITUDE</span>
              <span className="text-amber-300 font-bold">{displayedCell.value.toFixed(4)}</span>
            </div>
            <div className="bg-slate-900/90 px-1 py-1 rounded border border-slate-800/70 text-center">
              <span className="text-slate-500 block text-[8px]">DISPATCH</span>
              <span className={displayedCell.value > 0 ? 'text-emerald-400 font-bold' : 'text-slate-500 font-bold'}>
                {displayedCell.value > 0 ? 'Selected' : 'Filtered'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. High-Dimensional Hidden States: 96D Micro-Spectrogram Microscope */}
      {isHiddenState && (
        <div className="border-t border-slate-800/80 pt-2">
          {/* Microscope Section Header */}
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-sky-300">
              <Microscope className="w-3.5 h-3.5 text-sky-400" />
              <span>96D Micro-Spectrogram</span>
            </div>
            <span className="text-[9px] text-slate-500 font-mono">
              Block {displayedCell.col} · Dims [{startDim}..{endDim}]
            </span>
          </div>

          {/* Real-time Interactive Probe Readout */}
          <div className="mb-1.5 h-5 flex items-center">
            {hoveredSubDim !== null && probedValue !== null ? (
              <div className="w-full flex items-center justify-between text-[10px] bg-sky-950/70 border border-sky-500/50 px-2 py-0.5 rounded text-sky-200 animate-in fade-in duration-75">
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-sky-300">Sub-dim #{hoveredSubDim}</span>
                  <span className="text-slate-400 text-[9px]">(Global #{probedGlobalDim})</span>
                </div>
                <span className={`font-bold ${probedValue >= 0 ? 'text-amber-400' : 'text-cyan-400'}`}>
                  {probedValue >= 0 ? '+' : ''}
                  {probedValue.toFixed(4)}
                </span>
              </div>
            ) : (
              <div className="w-full flex items-center justify-between text-[9px] text-slate-400 px-0.5">
                <span className="flex items-center space-x-1 text-slate-400">
                  <Sparkles className="w-2.5 h-2.5 text-sky-400/80" />
                  <span>Hover strip to probe sub-channels</span>
                </span>
                <span className="text-slate-500">6144D Dense Slice</span>
              </div>
            )}
          </div>

          {/* High-Resolution HTML5 Canvas Strip (Fixed 640x112 Retina Backing Store) */}
          <div className="relative group">
            <canvas
              ref={canvasRef}
              width={640}
              height={112}
              onMouseEnter={handleCanvasMouseEnter}
              onMouseMove={handleCanvasMouseMove}
              onMouseLeave={handleCanvasMouseLeave}
              className="w-full h-14 rounded bg-[#060a12] border border-slate-800/90 cursor-crosshair block shadow-inner"
            />

            {/* Sub-channel Axis Scale Markers */}
            <div className="flex justify-between items-center text-[8px] text-slate-500 font-mono px-0.5 mt-1">
              <span>d₀ ({startDim})</span>
              <span>d₃₂ ({startDim + 32})</span>
              <span>d₆₄ ({startDim + 64})</span>
              <span>d₉₅ ({endDim})</span>
            </div>
          </div>

          {/* Microscopic Statistical Characteristics */}
          <div className="grid grid-cols-4 gap-1.5 text-[10px] mt-2 pt-2 border-t border-slate-800/70 font-mono">
            <div className="bg-slate-900/90 px-1 py-1 rounded border border-slate-800/70 text-center">
              <span className="text-slate-500 block text-[8px]">RMS</span>
              <span className="text-sky-300 font-bold">{stats.rms.toFixed(4)}</span>
            </div>
            <div className="bg-slate-900/90 px-1 py-1 rounded border border-slate-800/70 text-center">
              <span className="text-slate-500 block text-[8px]">MAX</span>
              <span className="text-amber-400 font-bold">
                {stats.max >= 0 ? '+' : ''}
                {stats.max.toFixed(3)}
              </span>
            </div>
            <div className="bg-slate-900/90 px-1 py-1 rounded border border-slate-800/70 text-center">
              <span className="text-slate-500 block text-[8px]">MIN</span>
              <span className="text-cyan-400 font-bold">{stats.min.toFixed(3)}</span>
            </div>
            <div className="bg-slate-900/90 px-1 py-1 rounded border border-slate-800/70 text-center">
              <span className="text-slate-500 block text-[8px]">MAX |V|</span>
              <span className="text-emerald-400 font-bold">{stats.maxAbs.toFixed(3)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

