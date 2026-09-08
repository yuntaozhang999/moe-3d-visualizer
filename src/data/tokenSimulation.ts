// Generates realistic mock activation values for 2D/3D tensor grid cells

export interface TokenCandidate {
  id: number;
  token: string;
  logit: number;
  prob: number;
  scaledLogit?: number;
  isFiltered?: boolean;
  filterReason?: 'top-k' | 'top-p' | null;
  cumulativeProb?: number;
}

export interface ActivationData {
  tokens: string[];
  embeddings: number[][]; // [seqLen, 64]
  attnScores: number[][]; // [seqLen, seqLen]
  qValues: number[][];    // [seqLen, 64]
  kValues: number[][];    // [seqLen, 16] (local) or 8 (global)
  vValues: number[][];    // [seqLen, 16] (local) or 8 (global)
  xsaValues: number[][];  // [seqLen, 32]
  headGates: number[];    // [12 heads]
  routerScores: { expertId: number; weight: number; isTop8: boolean }[]; // 384 experts
  top8Experts: number[];
  sharedExpert1: number[][]; // [seqLen, 64]
  sharedExpert2: number[][]; // [seqLen, 64]
  latentDown: number[][];    // [seqLen, 32]
  outputResidual: number[][]; // [seqLen, 64]
  nextTokens: { token: string; prob: number }[];
  candidateTokens?: TokenCandidate[];
}

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

export function simulateActivations(tokens: string[], layerIndex: number, isGlobal: boolean): ActivationData {
  const seqLen = tokens.length;
  const seedBase = layerIndex * 1000 + (isGlobal ? 99 : 11);

  // 1. Token Embeddings [seqLen, 64]
  const embeddings: number[][] = [];
  for (let s = 0; s < seqLen; s++) {
    const row: number[] = [];
    for (let d = 0; d < 64; d++) {
      const val = (pseudoRandom(seedBase + s * 64 + d) - 0.5) * 2;
      row.push(val);
    }
    embeddings.push(row);
  }

  // 2. Q, K, V activations
  const qValues: number[][] = [];
  const kValues: number[][] = [];
  const vValues: number[][] = [];
  const kvLength = isGlobal ? 8 : 16;
  for (let s = 0; s < seqLen; s++) {
    qValues.push(Array.from({ length: 64 }, (_, i) => (pseudoRandom(seedBase + 100 + s * 64 + i) - 0.45) * 1.8));
    kValues.push(Array.from({ length: kvLength }, (_, i) => (pseudoRandom(seedBase + 200 + s * kvLength + i) - 0.48) * 1.5));
    vValues.push(Array.from({ length: kvLength }, (_, i) => (pseudoRandom(seedBase + 300 + s * kvLength + i) - 0.52) * 1.7));
  }

  // 3. Attention matrix [seqLen, seqLen] (Causal + Local window / Global full)
  const attnScores: number[][] = [];
  const windowLimit = isGlobal ? seqLen + 1 : (seqLen <= 6 ? 3 : Math.max(2, Math.floor(seqLen * 0.5)));
  
  for (let i = 0; i < seqLen; i++) {
    const row: number[] = [];
    let sum = 0;
    for (let j = 0; j < seqLen; j++) {
      if (j > i) {
        row.push(0); // strict causal mask
      } else {
        if (!isGlobal && i - j >= windowLimit) {
          row.push(0);
        } else {
          const raw = Math.exp((pseudoRandom(seedBase + 400 + i * 10 + j) - 0.2) * 2.5);
          row.push(raw);
          sum += raw;
        }
      }
    }
    // normalize softmax
    attnScores.push(row.map(v => (sum > 0 ? v / sum : 0)));
  }

  // 4. XSA output [seqLen, 32]
  const xsaValues: number[][] = [];
  for (let s = 0; s < seqLen; s++) {
    xsaValues.push(Array.from({ length: 32 }, (_, i) => (pseudoRandom(seedBase + 500 + s * 32 + i) - 0.5) * 1.6));
  }

  // 5. Head Gate scalars (12 heads)
  const headGates: number[] = Array.from({ length: 12 }, (_, h) => {
    // 2 * sigmoid(...)
    const sig = 1 / (1 + Math.exp(-(pseudoRandom(seedBase + 600 + h) * 3 - 1.2)));
    return 2 * sig;
  });

  // 6. Router distribution over 384 experts
  // We simulate Top-8 selection with QB threshold
  const allExpertLogits: { expertId: number; logit: number }[] = [];
  for (let e = 0; e < 384; e++) {
    const logit = (pseudoRandom(seedBase + 700 + e) - 0.5) * 6;
    allExpertLogits.push({ expertId: e, logit });
  }
  allExpertLogits.sort((a, b) => b.logit - a.logit);
  const top8Ids = new Set(allExpertLogits.slice(0, 8).map(x => x.expertId));

  // Compute Sigmoid combine weights for top 8, normalized to 2.5 sum
  let sigmoidSum = 0;
  const top8Sigmoids: { [id: number]: number } = {};
  for (let i = 0; i < 8; i++) {
    const item = allExpertLogits[i];
    const sig = 1 / (1 + Math.exp(-item.logit));
    top8Sigmoids[item.expertId] = sig;
    sigmoidSum += sig;
  }

  const routerScores = allExpertLogits.slice(0, 32).map(item => {
    const isTop8 = top8Ids.has(item.expertId);
    let weight = 0;
    if (isTop8 && sigmoidSum > 0) {
      weight = (top8Sigmoids[item.expertId] / sigmoidSum) * 2.5;
    }
    return {
      expertId: item.expertId,
      weight,
      isTop8,
    };
  });

  const top8Experts = Array.from(top8Ids);

  // 7. Latent Down [seqLen, 32]
  const latentDown: number[][] = [];
  for (let s = 0; s < seqLen; s++) {
    latentDown.push(Array.from({ length: 32 }, (_, i) => (pseudoRandom(seedBase + 800 + s * 32 + i) - 0.5) * 1.4));
  }

  // 8. Shared experts
  const sharedExpert1: number[][] = [];
  const sharedExpert2: number[][] = [];
  for (let s = 0; s < seqLen; s++) {
    sharedExpert1.push(Array.from({ length: 64 }, (_, i) => (pseudoRandom(seedBase + 900 + s * 64 + i) - 0.5) * 1.5));
    sharedExpert2.push(Array.from({ length: 64 }, (_, i) => (pseudoRandom(seedBase + 1000 + s * 64 + i) - 0.5) * 1.5));
  }

  // 9. Output Residual
  const outputResidual: number[][] = [];
  for (let s = 0; s < seqLen; s++) {
    outputResidual.push(Array.from({ length: 64 }, (_, i) => (pseudoRandom(seedBase + 1100 + s * 64 + i) - 0.5) * 2.2));
  }

  // 10. Predicted Next Tokens & Full Candidates for Step 19
  const candidateTokens = getStep19Candidates(seedBase);
  const nextTokens = candidateTokens.slice(0, 5).map(c => ({
    token: c.token.trim(),
    prob: Number(c.prob.toFixed(4)),
  }));

  return {
    tokens,
    embeddings,
    attnScores,
    qValues,
    kValues,
    vValues,
    xsaValues,
    headGates,
    routerScores,
    top8Experts,
    sharedExpert1,
    sharedExpert2,
    latentDown,
    outputResidual,
    nextTokens,
    candidateTokens,
  };
}

/**
 * Default representative candidate tokens for Step 19 (Untied LM Head & Logits projection).
 * Vocabulary IDs conform to Marin's expanded 128,256 tokenizer space.
 */
export const STEP19_DEFAULT_CANDIDATES: Omit<TokenCandidate, 'prob' | 'scaledLogit' | 'isFiltered' | 'cumulativeProb'>[] = [
  { id: 14205, token: "scaling", logit: 13.85 },
  { id: 29841, token: " ladder", logit: 13.20 },
  { id: 8124,  token: " efficiency", logit: 12.65 },
  { id: 41203, token: " throughput", logit: 12.10 },
  { id: 15320, token: " convergence", logit: 11.60 },
  { id: 62450, token: " benchmark", logit: 11.15 },
  { id: 9021,  token: " stability", logit: 10.75 },
  { id: 3180,  token: " loss", logit: 10.40 },
  { id: 22104, token: " optimization", logit: 10.05 },
  { id: 7421,  token: " cluster", logit: 9.70 },
  { id: 51204, token: " dynamics", logit: 9.35 },
  { id: 18940, token: " capacity", logit: 9.00 },
  { id: 34102, token: " memory", logit: 8.65 },
  { id: 12055, token: " latency", logit: 8.30 },
  { id: 49210, token: " speedup", logit: 7.95 },
  { id: 63102, token: " bandwidth", logit: 7.60 },
  { id: 88412, token: " frontier", logit: 7.25 },
  { id: 5214,  token: " FLOPs", logit: 6.90 },
  { id: 97810, token: " perplexity", logit: 6.55 },
  { id: 26144, token: " sparsity", logit: 6.20 },
  { id: 43105, token: " execution", logit: 5.85 },
  { id: 71200, token: " routing", logit: 5.50 },
  { id: 105421, token: " parallelism", logit: 5.15 },
  { id: 114209, token: " saturation", logit: 4.80 },
  { id: 122405, token: " checkpoint", logit: 4.45 },
  { id: 128001, token: " <eos>", logit: 3.90 },
];

/**
 * Returns structured candidate distribution for Step 19, initialized with temperature = 1.0.
 */
export function getStep19Candidates(seedBase?: number): TokenCandidate[] {
  const baseCandidates = STEP19_DEFAULT_CANDIDATES.map((c, i) => {
    const jitter = seedBase ? (pseudoRandom(seedBase + 1200 + i) - 0.5) * 0.4 : 0;
    return {
      id: c.id,
      token: c.token,
      logit: Number((c.logit + jitter).toFixed(3)),
      prob: 0,
    };
  });

  return computeTemperatureSoftmax(baseCandidates, 1.0);
}

/**
 * Computes temperature scaling, Top-k, and Top-p (Nucleus) truncation and renormalizes probabilities.
 * 
 * @param candidates List of token candidates with raw logits
 * @param temperature Temperature scalar T > 0 (controls sharpness vs diversity)
 * @param topK Retain top-k tokens (1 <= topK <= candidates.length)
 * @param topP Retain smallest set of tokens with cumulative probability >= topP (0 < topP <= 1)
 */
export function computeTemperatureSoftmax(
  candidates: TokenCandidate[],
  temperature: number = 1.0,
  topK?: number,
  topP?: number
): TokenCandidate[] {
  if (candidates.length === 0) return [];

  const temp = Math.max(1e-4, Math.min(10.0, temperature));

  // 1. Scale logits: z_i / T
  const scaledCandidates = candidates.map(c => ({
    ...c,
    scaledLogit: Number((c.logit / temp).toFixed(4)),
  }));

  // 2. Numerical stability: subtract max(z_i / T)
  const maxScaled = Math.max(...scaledCandidates.map(c => c.scaledLogit));
  const expValues = scaledCandidates.map(c => Math.exp(c.scaledLogit - maxScaled));
  const sumExp = expValues.reduce((acc, v) => acc + v, 0);

  // 3. Raw Softmax probabilities sorted descending by scaledLogit
  const sorted: (TokenCandidate & { rawProb: number })[] = scaledCandidates.map((c, idx) => ({
    ...c,
    rawProb: sumExp > 0 ? expValues[idx] / sumExp : 1 / scaledCandidates.length,
    prob: 0,
    isFiltered: false,
    filterReason: null,
    cumulativeProb: 0,
  })).sort((a, b) => (b.scaledLogit ?? 0) - (a.scaledLogit ?? 0));

  // 4. Top-K truncation
  if (topK !== undefined && topK > 0 && topK < sorted.length) {
    for (let i = topK; i < sorted.length; i++) {
      sorted[i].isFiltered = true;
      sorted[i].filterReason = 'top-k';
    }
  }

  // 5. Top-P (Nucleus) truncation on remaining candidates
  const activeSumAfterTopK = sorted.filter(c => !c.isFiltered).reduce((acc, c) => acc + c.rawProb, 0);

  if (topP !== undefined && topP > 0 && topP < 1.0 && activeSumAfterTopK > 0) {
    let cumsum = 0;
    for (let i = 0; i < sorted.length; i++) {
      const item = sorted[i];
      if (item.isFiltered) continue;

      if (cumsum >= topP && i > 0) {
        item.isFiltered = true;
        item.filterReason = 'top-p';
      } else {
        cumsum += (item.rawProb / activeSumAfterTopK);
      }
    }
  }

  // 6. Renormalize active candidates so sum(probabilities) == 1.0
  const activeSum = sorted.filter(c => !c.isFiltered).reduce((acc, c) => acc + c.rawProb, 0);
  let activeCumsum = 0;

  return sorted.map(item => {
    if (!item.isFiltered && activeSum > 0) {
      const normalizedProb = item.rawProb / activeSum;
      activeCumsum += normalizedProb;
      return {
        id: item.id,
        token: item.token,
        logit: item.logit,
        scaledLogit: item.scaledLogit,
        prob: normalizedProb,
        isFiltered: false,
        filterReason: null,
        cumulativeProb: Math.min(1.0, activeCumsum),
      };
    } else {
      return {
        id: item.id,
        token: item.token,
        logit: item.logit,
        scaledLogit: item.scaledLogit,
        prob: 0,
        isFiltered: true,
        filterReason: item.filterReason,
        cumulativeProb: 1.0,
      };
    }
  });
}

/**
 * Monte Carlo roulette wheel sampling from the active probability distribution.
 * 
 * @param candidates Token candidates with normalized probabilities and filter flags
 * @returns The sampled TokenCandidate
 */
export function sampleNextToken(candidates: TokenCandidate[]): TokenCandidate {
  const activeCandidates = candidates.filter(c => !c.isFiltered && c.prob > 0);
  if (activeCandidates.length === 0) {
    return candidates[0] || {
      id: 0,
      token: '<unk>',
      logit: 0,
      prob: 1,
    };
  }

  const rand = Math.random();
  let accumulated = 0;
  for (const candidate of activeCandidates) {
    accumulated += candidate.prob;
    if (rand <= accumulated) {
      return candidate;
    }
  }

  return activeCandidates[activeCandidates.length - 1];
}

