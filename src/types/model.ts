export type LayerType = 'local' | 'global';

export interface LayerMetadata {
  index: number;
  type: LayerType;
  isGlobal: boolean;
  kvHeads: number;
  qHeads: number;
  headDim: number;
  windowSize: number | null; // 2048 for local, null (full causal) for global
  ropeMode: 'half-rope' | 'nope'; // half-rope for local, nope for global
  expertCount: number;
  activeExperts: number;
  sharedExperts: number;
}

export type ViewMode = 'quad_cycle' | 'single_block' | 'macro_stack';

export interface LayerGroup {
  groupIndex: number;
  name: string;
  layers: LayerMetadata[];
  localLayers: LayerMetadata[];
  globalLayer: LayerMetadata;
}

export interface ModelSpecs {
  name: string;
  totalParams: string;
  activeParams: string;
  hiddenDim: number;
  latentDim: number;
  numLayers: number;
  numHeads: number;
  headDim: number;
  localKvHeads: number;
  globalKvHeads: number;
  globalEvery: number;
  slidingWindow: number;
  numExperts: number;
  numExpertsPerToken: number;
  numSharedExperts: number;
  sharedExpertIntermediateDim: number;
  vocabSize: number;
  qkMult: number;
  gatedNormRank: number;
  shortConvKernel: number;
  routingRenormSum: number;
}

export type ForwardStepId = 
  | 'input_tokens'
  | 'token_embed'
  | 'embed_gated_norm'
  | 'pre_attn_gated_norm'
  | 'qkv_proj'
  | 'short_conv_k'
  | 'q_k_norm_rope'
  | 'attention_weights'
  | 'attention_output'
  | 'xsa_decorrelation'
  | 'head_gating'
  | 'attn_proj_residual'
  | 'pre_moe_gated_norm'
  | 'router_qb_selection'
  | 'latent_compression'
  | 'routed_experts_swiglu'
  | 'shared_experts_swiglu'
  | 'moe_aggregation_residual'
  | 'final_gated_norm'
  | 'untied_lm_head';

export interface EquationVariable {
  symbol: string;
  name: string;
  shape?: string;
  description: string;
  hardwareContext?: string;
  color?: 'sky' | 'purple' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'cyan';
}

export interface DataflowStage {
  label: string;
  name: string;
  shape: string;
  subtext?: string;
  type?: 'input' | 'weight' | 'op' | 'output' | 'intermediate';
}

export interface IntuitiveFormulaData {
  formula: string;
  intuitiveMeaning: string;
  dataflow?: {
    inputShape?: string;
    operation?: string;
    weightShape?: string;
    outputShape?: string;
    transformationNote?: string;
    stages?: DataflowStage[];
  };
  variables?: EquationVariable[];
}

export interface ForwardStep {
  id: ForwardStepId;
  order: number;
  name: string;
  category: 'Input' | 'Attention' | 'MoE' | 'Residual & Norm' | 'Output';
  shortDesc: string;
  longDesc: string;
  mathFormula: string;
  formulaData?: IntuitiveFormulaData;
  codeSnippet?: string;
  realShape: string;
  visualShape: string;
  hardwareSignificance: string;
  cameraFocus: [number, number, number];
  cameraPos: [number, number, number];
  activeNodeIds: string[];
}

export interface TensorNodeData {
  id: string;
  label: string;
  subLabel?: string;
  category: 'input' | 'norm' | 'attn' | 'moe' | 'shared' | 'residual' | 'output';
  position: [number, number, number];
  dimensions: [number, number, number]; // width, height, depth in 3D scene
  gridRows: number;
  gridCols: number;
  color: string;
  accentColor: string;
  realShape: string;
  visualShape: string;
  description: string;
  formula: string;
  designNotes: string;
  highlightInSteps: ForwardStepId[];
}

export interface OperatorNodeData {
  id: string;
  name: string;
  type: 'gated_norm' | 'short_conv' | 'xsa' | 'head_gate' | 'router_qb' | 'latent_norm' | 'swiglu' | 'add';
  position: [number, number, number];
  label: string;
  color: string;
  formula: string;
  description: string;
  highlightInSteps: ForwardStepId[];
}

export interface FlowConnectionData {
  id: string;
  from: [number, number, number];
  to: [number, number, number];
  color?: string;
  activeInSteps: ForwardStepId[];
  isResidual?: boolean;
}
