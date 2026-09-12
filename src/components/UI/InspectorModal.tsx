import React from 'react';
import { X, Code2, Cpu, Maximize2, Minimize2 } from 'lucide-react';
import { ForwardStep } from '../../types/model';
import { IntuitiveEquation } from './IntuitiveEquation';
import { getEquationData } from '../../data/equationData';

// Database of specific tensor / operator architectural info for hover inspection
export const INSPECTION_DATA: {
  [id: string]: {
    title: string;
    category: string;
    formula: string;
    realShape: string;
    visualShape: string;
    codeSnippet: string;
    rationale: string;
  };
} = {
  node_tokens: {
    title: "token_ids",
    category: "Embedding / Input",
    formula: "\\text{token\\_ids} = [t_1, t_2, \\dots, t_S] \\in \\{0, \\dots, 128255\\}^S",
    realShape: "Sequence length: 4096 tokens",
    visualShape: "Toy sequence: 6 tokens",
    codeSnippet: "token_ids: Int[Array, 'B S']",
    rationale: "Marin uses an expanded 128,256 vocabulary tokenizer for high compression efficiency across multilingual text, reasoning datasets, and code.",
  },
  node_embed: {
    title: "hidden",
    category: "Embedding / Input",
    formula: "\\text{hidden} = \\text{Gather}(\\text{token\\_embed}, \\text{token\\_ids})",
    realShape: "[1, 4096, 6144]",
    visualShape: "[1, 6, 64]",
    codeSnippet: "hidden = _embedding_gather(self.token_embed, token_ids)",
    rationale: "Fully replicated across data and expert shards for zero-communication local lookup.",
  },
  node_w_embed: {
    title: "token_embed (Embedding Table)",
    category: "Embedding / Parameters",
    formula: "\\text{token\\_embed} \\in \\mathbb{R}^{128256 \\times 6144}",
    realShape: "[128256, 6144] (~787M params, Untied)",
    visualShape: "Toy matrix: [32, 16]",
    codeSnippet: "self.token_embed: Array  # [Vocab, HiddenDim]",
    rationale: "Untied embedding table storing 788M parameters learned end-to-end during pre-training across 18T tokens. Distributed across model shards during training; frozen as a zero-communication gather table at inference.",
  },
  op_embed_gather: {
    title: "_embedding_gather",
    category: "Embedding / Operator",
    formula: "\\text{hidden} = \\text{Gather}(\\text{token\\_embed}, \\text{token\\_ids})",
    realShape: "[B, S] × [128256, 6144] → [B, S, 6144]",
    visualShape: "Gather operator node",
    codeSnippet: "hidden = _embedding_gather(self.token_embed, token_ids)",
    rationale: "Extracts dense embedding vectors corresponding to token IDs via JAX gather/indexing. Strictly untied from the output lm_head projection.",
  },
  op_embed_gn: {
    title: "Embedding GatedNorm (Rank-128)",
    category: "Normalization",
    formula: "y = \\text{RMSNorm}(x) \\odot \\sigma(\\text{SiLU}(\\text{RMSNorm}(x) W_{\\text{down}}) W_{\\text{up}})",
    realShape: "W_down: [6144, 128], W_up: [128, 6144]",
    visualShape: "Rank: 128 Bottleneck",
    codeSnippet: "class GatedNorm(eqx.Module):\n    w_down: [6144, 128]\n    w_up: [128, 6144]",
    rationale: "GatedNorm compensates for AdamH/MuonH bounded activation norms, stopping loss degradation and early training gradient spikes.",
  },
  op_attn_gn: {
    title: "Pre-Attention GatedNorm",
    category: "Attention Branch",
    formula: "x_{\\text{in}} = \\text{GatedNorm}_{\\text{attn}}(\\text{RMSNorm}(x))",
    realShape: "hidden_dim: 6144, rank: 128",
    visualShape: "64 channels",
    codeSnippet: "attn_in = self.attn_gated_norm(self.rms_attn(x))",
    rationale: "Stabilizes signal transmission across the deep 48-layer stack before projecting into Q, K, and V heads.",
  },
  node_q: {
    title: "Query Projection Matrix (Q)",
    category: "Attention Branch",
    formula: "Q = x_{\\text{attn\\_in}} W_Q, \\quad W_Q \\in \\mathbb{R}^{6144 \\times (48 \\times 128)}",
    realShape: "48 Heads × 128 head_dim = 6144",
    visualShape: "12 Heads × 16",
    codeSnippet: "q_flat = jnp.einsum('bsh,hd->bsd', x, self.w_q)",
    rationale: "All 48 layers carry 48 Query heads, projecting into 128-dim head subspaces.",
  },
  node_k: {
    title: "Key Projection Matrix (K) & GQA",
    category: "Attention Branch",
    formula: "K = x_{\\text{attn\\_in}} W_K, \\quad W_K \\in \\mathbb{R}^{6144 \\times (M \\times 128)}",
    realShape: "Local: 12 KV heads (1536) / Global: 6 KV heads (768)",
    visualShape: "3 KV heads × 16",
    codeSnippet: "local_kv_heads: 12  # GQA 4:1\nglobal_kv_heads: 6   # GQA 8:1",
    rationale: "Grouped Query Attention (GQA) reduces KV cache memory consumption by 75%–87.5% for 4096-context inference.",
  },
  op_sconv_k: {
    title: "ShortConv (Kernel=4 Causal 1D)",
    category: "Attention Branch",
    formula: "K_{\\text{conv}}[t] = \\sum_{\\tau=0}^{3} w_\\tau \\odot K[t - \\tau], \\quad w_0=1, w_{1..3}=0 \\; (init)",
    realShape: "Kernel: 4 taps, per-channel depthwise",
    visualShape: "4 taps",
    codeSnippet: "class ShortConv(eqx.Module):\n    # weight: [kernel_size, channels]\n    return short_conv(weight, x, segment_ids)",
    rationale: "Mixes local temporal tokens with zero cross-GPU collective communication overhead, enhancing in-context n-gram recognition.",
  },
  op_rope: {
    title: "RoPE Schedule (Local Half-RoPE vs Global NoPE)",
    category: "Positional Encoding",
    formula: "Q_{\\text{rot}} = [\\text{RoPE}(Q_{[:64]}), Q_{[64:]}], \\quad \\text{Global: disable\\_rope=True}",
    realShape: "First 64/128 dims roped on Local layers",
    visualShape: "First 8/16 dims roped",
    codeSnippet: "q, k = _apply_rotary_embedding_fused(q, k, rotary_dim=64, disable_rope=is_global)",
    rationale: "Half-RoPE prevents high-frequency position decay while Global layers run NoPE (No Positional Encoding) for long-horizon context aggregation.",
  },
  node_attn_matrix: {
    title: "Attention Score Matrix (Softmax)",
    category: "Attention Branch",
    formula: "A = \\text{Softmax}\\left( \\frac{Q K^\\top}{\\sqrt{128}} \\cdot 1.3 + M \\right)",
    realShape: "Local: 2048 Sliding Window / Global: Full Causal",
    visualShape: "6 × 6 Attention Heatmap",
    codeSnippet: "attn_out = attention(q, k, v, mask, implementation='gpu_fa4_cute_wide')",
    rationale: "3 out of 4 layers apply a 2048 sliding window mask, reducing attention FLOPs from O(S^2) to linear O(S·W).",
  },
  op_xsa: {
    title: "XSA (Exclusive Self-Attention)",
    category: "Attention Branch",
    formula: "z_i = y_i - \\left( \\frac{y_i^\\top v_i}{\\|v_i\\|^2 + 10^{-6}} \\right) v_i",
    realShape: "Per Head (48 heads × 128 dim)",
    visualShape: "Decorrelated heads",
    codeSnippet: "dot = jnp.sum(attn_out * aligned_v, axis=-1, keepdims=True)\nattn_out = attn_out - (dot / (v_norm_sq + 1e-6)) * aligned_v",
    rationale: "Forces self-attention to capture novel relational features by removing the component parallel to V, stopping lazy value-copying.",
  },
  op_head_gate: {
    title: "Attention Head Gate",
    category: "Attention Branch",
    formula: "g_h = 2 \\cdot \\sigma(x \\cdot W_{\\text{gate}}^{(h)}), \\quad \\text{attn\\_out}_h = g_h \\cdot z_h",
    realShape: "W_gate: [6144, 48 heads]",
    visualShape: "12 heads scalar gates",
    codeSnippet: "gate = 2 * jax.nn.sigmoid(jnp.einsum('bsd,dn->bsn', x, self.attn_gate))\nattn_out = gate * attn_out",
    rationale: "Learned dynamic scaling per attention head conditioned on the residual stream, acting as continuous head routing.",
  },
  node_router: {
    title: "LatentMoE Router (QB Routing)",
    category: "MoE Branch",
    formula: "s = x W_{\\text{router}}, \\quad \\text{Top-8} = \\text{top\\_k}(s + b, 8)",
    realShape: "384 Experts, Top-8 active",
    visualShape: "384 Experts, Top-8 highlighted",
    codeSnippet: "_topk_logits, selected_experts = jax.lax.top_k(biased_logits, 8 + 1)\ncombine_weights = sigmoid(unbiased_topk) * (2.5 / (sum + 1e-9))",
    rationale: "QB (Quantile Balancing) dynamically equalizes token routing across GPU ranks without auxiliary loss penalties.",
  },
  node_latent_down: {
    title: "Latent Down-Projection (6144 -> 3072)",
    category: "MoE Branch",
    formula: "x_{\\text{latent}} = \\text{RMSNorm}_{\\text{latent}}(x \\cdot W_{\\text{down}}), \\quad W_{\\text{down}} \\in \\mathbb{R}^{6144 \\times 3072}",
    realShape: "hidden_dim 6144 → latent_dim 3072",
    visualShape: "64 → 32 channels",
    codeSnippet: "routed_input = jnp.einsum('td,dl->tl', x_flat, self.w_latent_down)\nrouted_input = self.latent_norm(routed_input)",
    rationale: "Halves the expert-parallel all-to-all cross-node communication traffic, saving over 75 GB/s network bandwidth per GPU.",
  },
  node_experts_routed: {
    title: "8 Routed Experts (Half-Width SwiGLU)",
    category: "MoE Branch",
    formula: "\\text{Expert}(x) = (\\text{SiLU}(x W_{\\text{gate}}) \\odot x W_{\\text{up}}) W_{\\text{down}}",
    realShape: "8 selected of 384 experts, width 3072",
    visualShape: "8 active SwiGLU tiles",
    codeSnippet: "expert_mlp = MoEExpertMlp.init(num_experts=384, hidden_dim=3072, intermediate_dim=3072)",
    rationale: "Half-width experts (3072) double the number of distinct specialized experts fitting inside HBM memory.",
  },
  node_experts_shared: {
    title: "2 Concurrent Shared Experts",
    category: "MoE Branch",
    formula: "\\text{Shared}(x) = \\text{SwiGLU}_1(x) + \\text{SwiGLU}_2(x)",
    realShape: "2 experts × [6144 → 3072 → 6144]",
    visualShape: "2 parallel SwiGLU paths",
    codeSnippet: "for shared_expert in self.shared:\n    mlp_out = mlp_out + shared_expert(mlp_in, activation=silu)",
    rationale: "Captures common domain-invariant representations, leaving routed experts free to specialize in niche domains.",
  },
  node_lm_head: {
    title: "Untied Language Model Head",
    category: "Output",
    formula: "\\text{logits} = x_{\\text{final}} \\cdot W_{\\text{output\\_proj}}, \\quad W_{\\text{out}} \\in \\mathbb{R}^{6144 \\times 128256}",
    realShape: "[1, 4096, 128256]",
    visualShape: "[1, 6, 128]",
    codeSnippet: "output_proj = reshard(_init_weight(out_key, (6144, 128256)), _LM_HEAD_PARTITION_SPEC)",
    rationale: "Untied from embedding weights, giving maximum expressivity for the final next-token prediction across 18 Trillion tokens.",
  },
};

interface InspectorModalProps {
  inspectedId: string | null;
  activeStep: ForwardStep;
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed?: boolean) => void;
  onClose: () => void;
}

export const InspectorModal: React.FC<InspectorModalProps> = ({
  inspectedId,
  activeStep,
  isCollapsed = false,
  onToggleCollapse,
  onClose,
}) => {
  // If an inspectedId is provided, look up its specific entry; otherwise show the active step info
  const info = inspectedId && INSPECTION_DATA[inspectedId]
    ? INSPECTION_DATA[inspectedId]
    : {
        title: activeStep.name,
        category: activeStep.category,
        formula: activeStep.mathFormula,
        realShape: activeStep.realShape,
        visualShape: activeStep.visualShape,
        codeSnippet: activeStep.codeSnippet || '',
        rationale: activeStep.hardwareSignificance,
      };

  const equationId = inspectedId || activeStep.id;
  const equationData = (inspectedId ? getEquationData(inspectedId) : undefined) ||
    activeStep.formulaData ||
    getEquationData(activeStep.id);

  // Compact floating pill mode (non-intrusive handle)
  if (isCollapsed) {
    return (
      <div
        onClick={() => onToggleCollapse?.(false)}
        className="absolute top-20 right-6 z-30 flex items-center bg-[#0c101d]/90 hover:bg-[#11172b]/95 backdrop-blur-xl border border-sky-500/50 hover:border-sky-400 rounded-xl px-3 py-1.5 shadow-2xl hover:shadow-sky-500/20 cursor-pointer group transition-all select-none animate-in fade-in slide-in-from-right-3 duration-200"
        title="Click to expand full mathematical formula and operator inspector modal"
      >
        <div className="flex items-center space-x-2">
          <span className="text-sm">📐</span>
          <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-sky-950/90 border border-sky-700/60 text-sky-300">
            {info.category}
          </span>
          <span className="text-xs font-semibold text-slate-200 group-hover:text-white max-w-[150px] sm:max-w-[200px] truncate">
            {info.title}
          </span>
          <span className="hidden sm:inline-block text-[10px] font-mono text-purple-300 bg-purple-950/70 border border-purple-800/40 px-1.5 py-0.5 rounded truncate max-w-[120px]">
            {info.realShape}
          </span>
        </div>

        <div className="flex items-center space-x-1 pl-2.5 ml-2 border-l border-slate-700/80">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse?.(false);
            }}
            className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 hover:text-sky-100 text-[11px] font-medium transition-colors"
          >
            <span>Expand Formula</span>
            <Maximize2 className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Expanded full drawer mode
  return (
    <div className="absolute top-20 right-6 w-[28rem] sm:w-[32rem] max-h-[calc(100vh-8rem)] z-30 bg-[#0c101d]/95 backdrop-blur-xl border border-sky-500/40 rounded-2xl p-4 shadow-2xl flex flex-col space-y-3.5 select-none overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 animate-in fade-in slide-in-from-right-4 duration-200">
      {/* Modal Header */}
      <div className="flex items-start justify-between border-b border-slate-800 pb-2.5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-sky-950/80 border border-sky-700/60 text-sky-300">
              {info.category}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              [Formula Details]
            </span>
          </div>
          <h2 className="text-sm font-bold text-slate-100 mt-1">
            {info.title}
          </h2>
        </div>
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => onToggleCollapse?.(true)}
            className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition-colors border border-slate-700/60"
            title="Minimize to floating pill (keeps node selected)"
          >
            <Minimize2 className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[11px]">Minimize</span>
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Close Inspector (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Intuitive Mathematical Formula & Interactive Explorer */}
      <IntuitiveEquation
        equationId={equationId}
        data={equationData}
        formula={info.formula}
        variant="full"
        title="Mathematical Formulation & Operator Flow"
      />

      {/* Tensor Shapes */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase">Real Shape (535B)</div>
          <div className="font-semibold text-purple-300 mt-0.5 truncate" title={info.realShape}>
            {info.realShape}
          </div>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase">Visual Grid</div>
          <div className="font-semibold text-emerald-300 mt-0.5 truncate" title={info.visualShape}>
            {info.visualShape}
          </div>
        </div>
      </div>

      {/* Architectural Significance / Hardware Rationale */}
      {info.rationale && (!equationData?.intuitiveMeaning || info.rationale !== equationData.intuitiveMeaning) && (
        <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3">
          <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-slate-400 mb-1">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span>Hardware & Training Significance</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            {info.rationale}
          </p>
        </div>
      )}

      {/* Code Snippet */}
      {info.codeSnippet && (
        <div className="rounded-xl bg-[#080b12] border border-slate-800 p-3">
          <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-slate-400 mb-1.5">
            <Code2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Levanter / JAX Implementation</span>
          </div>
          <pre className="text-[11px] font-mono text-indigo-200 bg-slate-950 p-2 rounded overflow-x-auto leading-tight">
            {info.codeSnippet}
          </pre>
        </div>
      )}

      {/* Footer bar with tip and collapse button */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
        <span>Press Esc to close · Can be minimized anytime</span>
        <button
          onClick={() => onToggleCollapse?.(true)}
          className="text-sky-400 hover:text-sky-300 flex items-center space-x-1 transition-colors font-medium"
        >
          <Minimize2 className="w-3 h-3" />
          <span>Minimize Panel</span>
        </button>
      </div>
    </div>
  );
};
