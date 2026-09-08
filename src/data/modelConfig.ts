import { LayerMetadata, ModelSpecs, LayerGroup } from '../types/model';

export const MARIN_535B_CONFIG: ModelSpecs = {
  name: "Marin 535B-A23B MoE (Hero Run)",
  totalParams: "535 Billion",
  activeParams: "23 Billion",
  hiddenDim: 6144,
  latentDim: 3072, // 6144 // 2
  numLayers: 48,
  numHeads: 48,
  headDim: 128,
  localKvHeads: 12,
  globalKvHeads: 6,
  globalEvery: 4,
  slidingWindow: 2048,
  numExperts: 384,
  numExpertsPerToken: 8,
  numSharedExperts: 2,
  sharedExpertIntermediateDim: 3072, // 6144 // 2
  vocabSize: 128256,
  qkMult: 1.3,
  gatedNormRank: 128,
  shortConvKernel: 4,
  routingRenormSum: 2.5,
};

export const DEFAULT_TOY_TOKENS = ["The", "marin", "535b", "moe", "hero", "run"];

export function generateLayersMetadata(): LayerMetadata[] {
  const layers: LayerMetadata[] = [];
  const numLayers = MARIN_535B_CONFIG.numLayers;
  const globalEvery = MARIN_535B_CONFIG.globalEvery;

  for (let i = 0; i < numLayers; i++) {
    // Every global_every-th layer is full-causal, and the last layer always is
    const isGlobal = ((i + 1) % globalEvery === 0) || (i === numLayers - 1);
    layers.push({
      index: i,
      type: isGlobal ? 'global' : 'local',
      isGlobal,
      kvHeads: isGlobal ? MARIN_535B_CONFIG.globalKvHeads : MARIN_535B_CONFIG.localKvHeads,
      qHeads: MARIN_535B_CONFIG.numHeads,
      headDim: MARIN_535B_CONFIG.headDim,
      windowSize: isGlobal ? null : MARIN_535B_CONFIG.slidingWindow,
      ropeMode: isGlobal ? 'nope' : 'half-rope',
      expertCount: MARIN_535B_CONFIG.numExperts,
      activeExperts: MARIN_535B_CONFIG.numExpertsPerToken,
      sharedExperts: MARIN_535B_CONFIG.numSharedExperts,
    });
  }

  return layers;
}

export function generateLayerGroups(): LayerGroup[] {
  const allLayers = generateLayersMetadata();
  const groups: LayerGroup[] = [];
  const numGroups = Math.ceil(allLayers.length / MARIN_535B_CONFIG.globalEvery);

  for (let g = 0; g < numGroups; g++) {
    const groupLayers = allLayers.slice(g * 4, (g + 1) * 4);
    const localLayers = groupLayers.filter(l => !l.isGlobal);
    const globalLayer = groupLayers.find(l => l.isGlobal) || groupLayers[groupLayers.length - 1];

    groups.push({
      groupIndex: g,
      name: `Group ${g + 1} (L${g * 4}–L${Math.min(allLayers.length - 1, (g + 1) * 4 - 1)})`,
      layers: groupLayers,
      localLayers,
      globalLayer,
    });
  }

  return groups;
}
