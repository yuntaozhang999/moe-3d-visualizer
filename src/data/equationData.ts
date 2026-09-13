import { IntuitiveFormulaData } from '../types/model';

export interface EnrichedEquationData extends IntuitiveFormulaData {
  id: string;
  title: string;
  category: string;
  realShape?: string;
  visualShape?: string;
  codeSnippet?: string;
}

export const EQUATION_DEFINITIONS: Record<string, EnrichedEquationData> = {
  node_residual_in: {
    id: 'node_residual_in',
    title: 'Input from Previous Layer',
    category: 'Input',
    formula: 'x^{(l)} = x^{(l-1)} + \\text{Attn}(\\text{GatedNorm}_1(\\text{RMSNorm}(x^{(l-1)}))) + \\text{MoE}(\\text{GatedNorm}_2(\\text{RMSNorm}(x^{(l-1)} + \\dots)))',
    intuitiveMeaning: 'The residual stream is the central highway of the Transformer. It carries the accumulated representations from all previous layers. Instead of computing entirely new representations, each layer reads from this stream, computes updates, and adds them back.',
    dataflow: {
      inputShape: 'Residual Stream',
      operation: 'Identity Passthrough',
      outputShape: '[1, 4096, 6144]',
      transformationNote: 'Receives the output of the previous layer.',
      stages: [
        { label: 'Input', name: 'Layer N-1 Out', shape: '[1, 4096, 6144]', type: 'input' },
        { label: 'Highway', name: 'Residual Stream', shape: '[1, 4096, 6144]', type: 'op' },
        { label: 'Output', name: 'Layer N In', shape: '[1, 4096, 6144]', type: 'output' },
      ],
    },
    variables: [
      { symbol: 'x^{(l-1)}', name: 'Previous Layer Output', shape: '[1, 4096, 6144]', description: 'The accumulated representation up to layer l-1.', hardwareContext: 'Stored in GPU HBM.', color: 'sky' },
    ],
    realShape: '[1, 4096, 6144]',
    visualShape: '[1, 6, 64]',
    codeSnippet: 'x = previous_layer_output',
  },

  node_residual_out: {
    id: 'node_residual_out',
    title: 'Output to Next Layer',
    category: 'Output',
    formula: 'x^{(l+1)} = x^{(l)} + \\text{Attn}(x^{(l)}) + \\text{MoE}(x^{(l)})',
    intuitiveMeaning: 'The final state of the residual stream for this layer, after the Attention and MoE updates have been added. This state is passed directly to the next layer as its input.',
    dataflow: {
      inputShape: 'Residual Stream',
      operation: 'Identity Passthrough',
      outputShape: '[1, 4096, 6144]',
      transformationNote: 'Passes the accumulated state to the next layer.',
      stages: [
        { label: 'Input', name: 'Layer N Out', shape: '[1, 4096, 6144]', type: 'input' },
        { label: 'Highway', name: 'Residual Stream', shape: '[1, 4096, 6144]', type: 'op' },
        { label: 'Output', name: 'Layer N+1 In', shape: '[1, 4096, 6144]', type: 'output' },
      ],
    },
    variables: [
      { symbol: 'x^{(l)}', name: 'Current Layer Output', shape: '[1, 4096, 6144]', description: 'The accumulated representation including this layer\'s updates.', hardwareContext: 'Stored in GPU HBM.', color: 'sky' },
    ],
    realShape: '[1, 4096, 6144]',
    visualShape: '[1, 6, 64]',
    codeSnippet: 'return x',
  },

  op_embed_gather: {
    id: 'op_embed_gather',
    title: '_embedding_gather (Token Embedding Gather)',
    category: 'Input',
    formula: '\\text{hidden} = \\text{Gather}(\\text{token\\_embed}, \\text{token\\_ids})',
    intuitiveMeaning: 'A zero-compute memory lookup mapping each discrete token ID into a dense 6144-dimensional continuous feature space. Trainable in Pre-training: Unlike the static BPE tokenizer vocabulary, these 787,998,720 parameters (~788M) start from random initialization and are learned end-to-end via gradient backpropagation across 18 Trillion pre-training tokens to form rich continuous semantic representations. Fully untied from output projection.',
    dataflow: {
      inputShape: '[1, 4096]',
      operation: 'Embedding Gather / Index Lookup',
      weightShape: 'token_embed [128256, 6144] (788M params)',
      outputShape: '[1, 4096, 6144]',
      transformationNote: 'Discrete IDs mapped to continuous 6144-dim latent vectors via JAX _embedding_gather',
      stages: [
        { label: 'Input IDs', name: 'token_ids', shape: '[1, 4096]', type: 'input' },
        { label: 'Weight', name: 'token_embed Table', shape: '[128256, 6144]', type: 'weight' },
        { label: 'Lookup', name: 'Gather', shape: 'Index Lookup', type: 'op' },
        { label: 'Output', name: 'hidden', shape: '[1, 4096, 6144]', type: 'output' },
      ],
    },
    variables: [
      { symbol: '\\text{token\\_ids}', name: 'Token Sequence IDs', shape: '[1, 4096]', description: 'Input sequence of token indices.', hardwareContext: 'Index buffer passed to gather kernel.', color: 'sky' },
      { symbol: '\\text{token\\_embed}', name: 'Embedding Table', shape: '[128256, 6144]', description: 'Dense weight matrix mapping token IDs to hidden representations. Trainable in Pre-training: Unlike the static BPE tokenizer vocabulary, these 787,998,720 parameters (~788M) start from random initialization and are learned end-to-end via gradient backpropagation across 18 Trillion pre-training tokens.', hardwareContext: 'Replicated across data shards for zero-communication local lookup.', color: 'purple' },
      { symbol: '\\text{hidden}', name: 'Embedded Hidden States', shape: '[1, 4096, 6144]', description: 'Continuous token representation entering the first Transformer block.', hardwareContext: 'Resides in GPU HBM, feeding residual stream.', color: 'emerald' },
    ],
    realShape: '[1, 4096, 6144]',
    visualShape: '[1, 6, 64]',
    codeSnippet: 'hidden = _embedding_gather(self.token_embed, token_ids)',
  },

  input_tokens: {
    id: 'input_tokens',
    title: 'Input Tokens & token_ids',
    category: 'Input',
    formula: '\\text{token\\_ids} = [t_1, t_2, \\dots, t_S], \\quad t_i \\in \\{0, 1, \\dots, V-1\\}',
    intuitiveMeaning: 'Before neural compute begins, raw text is tokenized into discrete integer IDs using byte-pair encoding. Marin\'s expanded 128,256 vocabulary provides dramatically higher compression efficiency across multilingual text, complex reasoning, and code than older 32k vocabularies.',
    dataflow: {
      inputShape: 'Raw Text Stream',
      operation: 'BPE Tokenization (128k Vocab)',
      weightShape: 'Tokenizer Trie / Merges',
      outputShape: '[1, 4096] (Toy: [1, 6])',
      transformationNote: 'Characters compressed into ~4096 discrete token IDs',
      stages: [
        { label: 'Input', name: 'Prompt String', shape: 'UTF-8 Text', type: 'input' },
        { label: 'Tokenizer', name: 'Marin 128k BPE', shape: '128,256 Vocab', type: 'op' },
        { label: 'Output', name: 'token_ids', shape: '[1, 4096]', type: 'output' },
      ],
    },
    variables: [
      { symbol: 't_i', name: 'Token ID', shape: 'Scalar Int', description: 'Discrete integer index corresponding to a token subword in the vocabulary.', hardwareContext: 'Stored as uint32/int32 in CPU/GPU device buffer.', color: 'sky' },
      { symbol: 'S', name: 'Sequence Length', shape: '4096 tokens', description: 'Context window sequence length processed in parallel.', hardwareContext: 'Defines attention sequence dimension on GPU SRAM/HBM.', color: 'purple' },
      { symbol: 'V', name: 'Vocabulary Size', shape: '128,256', description: 'Total number of unique token embeddings supported by Marin.', hardwareContext: 'Determines embedding table and LM head parameter size.', color: 'emerald' },
    ],
    realShape: '[1, 4096]',
    visualShape: '[1, 6]',
    codeSnippet: 'token_ids: Int[Array, "B S"]  # B=1, S=4096 (toy: 6)',
  },

  token_embed: {
    id: 'token_embed',
    title: 'Embedding Gather (_embedding_gather)',
    category: 'Input',
    formula: '\\text{hidden} = \\text{Gather}(\\text{token\\_embed}, \\text{token\\_ids})',
    intuitiveMeaning: 'A zero-compute memory lookup mapping each discrete token ID into a dense 6144-dimensional continuous feature space. Trainable in Pre-training: Unlike the static BPE tokenizer vocabulary, these 787,998,720 parameters (~788M) start from random initialization and are learned end-to-end via gradient backpropagation across 18 Trillion pre-training tokens to form rich continuous semantic representations. Fully untied from output projection.',
    dataflow: {
      inputShape: '[1, 4096]',
      operation: 'Embedding Gather / Index Lookup',
      weightShape: 'token_embed [128256, 6144] (788M params)',
      outputShape: '[1, 4096, 6144]',
      transformationNote: 'Discrete IDs mapped to continuous 6144-dim latent vectors',
      stages: [
        { label: 'Input IDs', name: 't', shape: '[1, 4096]', type: 'input' },
        { label: 'Weight', name: 'W_embed Table', shape: '[128256, 6144]', type: 'weight' },
        { label: 'Lookup', name: 'Gather', shape: 'Index Lookup', type: 'op' },
        { label: 'Output', name: 'Hidden States E', shape: '[1, 4096, 6144]', type: 'output' },
      ],
    },
    variables: [
      { symbol: 't', name: 'Token Sequence IDs', shape: '[1, 4096]', description: 'Input sequence of token indices.', hardwareContext: 'Index buffer passed to gather kernel.', color: 'sky' },
      { symbol: 'W_{\\text{embed}}', name: 'Embedding Table', shape: '[128256, 6144]', description: 'Dense weight matrix mapping token IDs to hidden representations.', hardwareContext: 'Replicated across data shards for zero-communication local lookup.', color: 'purple' },
      { symbol: 'E', name: 'Embedded Hidden States', shape: '[1, 4096, 6144]', description: 'Continuous token representation entering the first Transformer block.', hardwareContext: 'Resides in GPU HBM, feeding residual stream.', color: 'emerald' },
    ],
    realShape: '[1, 4096, 6144]',
    visualShape: '[1, 6, 64]',
    codeSnippet: 'hidden = _embedding_gather(self.token_embed, token_ids)',
  },

  embed_gated_norm: {
    id: 'embed_gated_norm',
    title: 'Embedding GatedNorm (Rank-128 Bottleneck)',
    category: 'Residual & Norm',
    formula: 'y = \\text{RMSNorm}(x) \\odot \\sigma\\left(\\text{SiLU}\\left(\\text{RMSNorm}(x) W_{\\text{down}}\\right) W_{\\text{up}}\\right)',
    intuitiveMeaning: 'Standard RMSNorm rescales activations uniformly, but cannot adapt individual channels dynamically. GatedNorm adds a rank-128 bottleneck MLP that computes a per-channel modulation gate σ(·). This stabilizes activation drift under aggressive MuonH/AdamH optimizers, preventing loss spikes without ballooning parameter count.',
    dataflow: {
      inputShape: '[1, 4096, 6144]',
      operation: 'RMSNorm \u2192 W_down [6144\u2192128] \u2192 SiLU \u2192 W_up [128\u21926144] \u2192 \u03c3',
      weightShape: 'W_down: [6144, 128], W_up: [128, 6144]',
      outputShape: '[1, 4096, 6144]',
      transformationNote: 'Rank-128 bottleneck gate modulates RMSNorm without parameter bloat',
      stages: [
        { label: 'Input', name: 'x', shape: '[1, 4096, 6144]', type: 'input' },
        { label: 'Norm', name: 'RMSNorm(x)', shape: '[1, 4096, 6144]', type: 'op' },
        { label: 'Bottleneck', name: 'W_down', shape: '[6144, 128]', type: 'weight' },
        { label: 'Gate', name: 'SiLU \u2192 W_up \u2192 \u03c3', shape: '[128, 6144]', type: 'op' },
        { label: 'Output', name: 'Gated y', shape: '[1, 4096, 6144]', type: 'output' },
      ],
    },
    variables: [
      { symbol: 'x', name: 'Input Hidden State', shape: '[1, 4096, 6144]', description: 'Unnormalized token activations from embedding or previous layer.', hardwareContext: 'Current residual stream state in GPU memory.', color: 'sky' },
      { symbol: 'W_{\\text{down}}', name: 'Bottleneck Down-Projection', shape: '[6144, 128]', description: 'Projects 6144 channels down to compact rank-128 bottleneck subspace.', hardwareContext: 'Fast GEMM fitting entirely in GPU SRAM.', color: 'purple' },
      { symbol: 'W_{\\text{up}}', name: 'Bottleneck Up-Projection', shape: '[128, 6144]', description: 'Projects rank-128 features back up to modulate the 6144 channels.', hardwareContext: 'Fused with sigmoid modulation kernel.', color: 'indigo' },
      { symbol: '\\sigma', name: 'Sigmoid Activation', shape: 'Range (0, 1)', description: 'Computes smooth gating multiplier per channel.', hardwareContext: 'Fused elementwise operation.', color: 'amber' },
      { symbol: 'y', name: 'Gated-Normalized Output', shape: '[1, 4096, 6144]', description: 'Stabilized activations ready for subsequent attention or MLP blocks.', hardwareContext: 'Feeds downstream projection layers.', color: 'emerald' },
    ],
    realShape: '[1, 4096, 6144] (Rank: 128)',
    visualShape: '[1, 6, 64]',
    codeSnippet: 'hidden = self.embed_gated_norm(self.embed_norm(hidden))',
  },

  pre_attn_gated_norm: {
    id: 'pre_attn_gated_norm',
    title: 'Pre-Attention GatedNorm',
    category: 'Attention',
    formula: 'x_{\\text{attn\\_in}} = \\text{GatedNorm}_{\\text{attn}}(\\text{RMSNorm}(x))',
    intuitiveMeaning: 'Pre-LayerNorm guarantees stable signal propagation through deep Transformer stacks. In Marin\'s 48-layer model, normalizing before attention prevents unbounded activation growth across residual additions while keeping gradients clean during backward passes.',
    dataflow: {
      inputShape: '[1, 4096, 6144]',
      operation: 'Pre-Attention RMSNorm + GatedNorm',
      weightShape: '[6144, 128] + [128, 6144]',
      outputShape: '[1, 4096, 6144]',
      transformationNote: 'Residual stream regulated before QKV head projections',
      stages: [
        { label: 'Residual', name: 'x', shape: '[1, 4096, 6144]', type: 'input' },
        { label: 'RMSNorm', name: 'Root Mean Square', shape: '[1, 4096, 6144]', type: 'op' },
        { label: 'Gate', name: 'Rank-128 GatedNorm', shape: '[6144, 128, 6144]', type: 'weight' },
        { label: 'Output', name: 'x_attn_in', shape: '[1, 4096, 6144]', type: 'output' },
      ],
    },
    variables: [
      { symbol: 'x', name: 'Residual Stream State', shape: '[1, 4096, 6144]', description: 'Accumulated hidden state traversing the Transformer layer.', hardwareContext: 'Bypass highway memory buffer.', color: 'sky' },
      { symbol: '\\text{RMSNorm}', name: 'RMS Normalization', shape: 'Scalar per token', description: 'Scales vector by reciprocal root mean square of activations.', hardwareContext: 'Fused low-latency reduction kernel.', color: 'amber' },
      { symbol: 'x_{\\text{attn\\_in}}', name: 'Attention Branch Input', shape: '[1, 4096, 6144]', description: 'Stabilized input entering Query, Key, and Value projection GEMMs.', hardwareContext: 'Shared input buffer for W_Q, W_K, W_V GEMMs.', color: 'emerald' },
    ],
    realShape: '[1, 4096, 6144]',
    visualShape: '[1, 6, 64]',
    codeSnippet: 'attn_in = self.attn_gated_norm(self.rms_attn(x))',
  },

  node_w_q: {
    id: 'node_w_q',
    title: 'Query Weight Matrix (W_Q)',
    category: 'Attention',
    formula: 'W_Q \\in \\mathbb{R}^{6144 \\times 6144}',
    intuitiveMeaning: 'Projects the 6144-dimensional hidden states into 48 Query heads of dimension 128.',
    dataflow: {
      inputShape: '-',
      operation: 'Weight Matrix',
      outputShape: '[6144, 6144]',
      transformationNote: '48 heads × 128 dim',
      stages: []
    },
    variables: [],
    realShape: '[6144, 6144]',
    visualShape: '[16, 16]',
    codeSnippet: 'self.w_q = _init_weight((6144, 6144))'
  },

  node_w_k: {
    id: 'node_w_k',
    title: 'Key Weight Matrix (W_K)',
    category: 'Attention',
    formula: 'W_K \\in \\mathbb{R}^{6144 \\times (H_{kv} \\times 128)}',
    intuitiveMeaning: 'Projects hidden states into Key heads using Grouped Query Attention (GQA). Ratio is 4:1 (12h) for Local layers, and 8:1 (6h) for Global layers.',
    dataflow: {
      inputShape: '-',
      operation: 'Weight Matrix',
      outputShape: '[6144, 1536] or [6144, 768]',
      transformationNote: 'GQA compression',
      stages: []
    },
    variables: [],
    realShape: '[6144, 1536/768]',
    visualShape: '[4/8, 16]',
    codeSnippet: 'self.w_k = _init_weight((6144, kv_heads * 128))'
  },

  node_w_v: {
    id: 'node_w_v',
    title: 'Value Weight Matrix (W_V)',
    category: 'Attention',
    formula: 'W_V \\in \\mathbb{R}^{6144 \\times (H_{kv} \\times 128)}',
    intuitiveMeaning: 'Projects hidden states into Value heads using Grouped Query Attention (GQA). Ratio is 4:1 (12h) for Local layers, and 8:1 (6h) for Global layers.',
    dataflow: {
      inputShape: '-',
      operation: 'Weight Matrix',
      outputShape: '[6144, 1536] or [6144, 768]',
      transformationNote: 'GQA compression',
      stages: []
    },
    variables: [],
    realShape: '[6144, 1536/768]',
    visualShape: '[4/8, 16]',
    codeSnippet: 'self.w_v = _init_weight((6144, kv_heads * 128))'
  },

  op_q_proj: {
    id: 'op_q_proj',
    title: 'Query Projection Operator',
    category: 'Attention',
    formula: 'Q = X @ W_Q',
    intuitiveMeaning: 'Computes the queries for all 48 attention heads.',
    dataflow: {
      inputShape: '[1, 4096, 6144]',
      operation: 'Matrix Multiplication',
      outputShape: '[1, 4096, 48, 128]',
      transformationNote: 'Linear projection to Q',
      stages: []
    },
    variables: [],
    realShape: '[1, 4096, 6144]',
    visualShape: 'Operator',
    codeSnippet: 'q = jnp.einsum("bsh,hd->bsd", x, self.w_q)'
  },

  op_k_proj: {
    id: 'op_k_proj',
    title: 'Key Projection Operator',
    category: 'Attention',
    formula: 'K = X @ W_K',
    intuitiveMeaning: 'Computes the keys for the KV heads. GQA reduces memory bandwidth requirements.',
    dataflow: {
      inputShape: '[1, 4096, 6144]',
      operation: 'Matrix Multiplication',
      outputShape: '[1, 4096, 12/6, 128]',
      transformationNote: 'Linear projection to K',
      stages: []
    },
    variables: [],
    realShape: '[1, 4096, 1536/768]',
    visualShape: 'Operator',
    codeSnippet: 'k = jnp.einsum("bsh,hd->bsd", x, self.w_k)'
  },

  op_v_proj: {
    id: 'op_v_proj',
    title: 'Value Projection Operator',
    category: 'Attention',
    formula: 'V = X @ W_V',
    intuitiveMeaning: 'Computes the values for the KV heads. GQA allows smaller KV caches.',
    dataflow: {
      inputShape: '[1, 4096, 6144]',
      operation: 'Matrix Multiplication',
      outputShape: '[1, 4096, 12/6, 128]',
      transformationNote: 'Linear projection to V',
      stages: []
    },
    variables: [],
    realShape: '[1, 4096, 1536/768]',
    visualShape: 'Operator',
    codeSnippet: 'v = jnp.einsum("bsh,hd->bsd", x, self.w_v)'
  },

  qkv_proj: {
    id: 'qkv_proj',
    title: 'QKV Projections & GQA Compression',
    category: 'Attention',
    formula: 'Q = x W_Q, \\quad K = x W_K, \\quad V = x W_V',
    intuitiveMeaning: 'Projects hidden states into attention subspaces. Marin uses Grouped Query Attention (GQA): 48 Query heads share only 12 KV heads on Local layers (4:1 ratio) and 6 KV heads on Global layers (8:1 ratio). This reduces KV cache size by 75% to 87.5%, dramatically speeding up long-sequence generation.',
    dataflow: {
      inputShape: '[1, 4096, 6144]',
      operation: 'GEMM Linear Projections (GQA 4:1 / 8:1)',
      weightShape: 'W_Q: [6144, 6144], W_K: [6144, 1536/768], W_V: [6144, 1536/768]',
      outputShape: 'Q: [48, 128], K: [12/6, 128], V: [12/6, 128]',
      transformationNote: 'GQA compression slashes KV cache memory by 75%–87.5%',
      stages: [
        { label: 'Input', name: 'x_attn_in', shape: '[1, 4096, 6144]', type: 'input' },
        { label: 'Query Weights', name: 'W_Q', shape: '[6144, 48x128]', type: 'weight' },
        { label: 'Key/Val Weights', name: 'W_K, W_V (GQA)', shape: '[6144, 12/6x128]', type: 'weight' },
        { label: 'Output Q', name: 'Q Heads', shape: '[48, 128]', type: 'output' },
        { label: 'Output K/V', name: 'K, V Heads', shape: '[12 or 6, 128]', type: 'output' },
      ],
    },
    variables: [
      { symbol: 'x', name: 'Normalized Input', shape: '[1, 4096, 6144]', description: 'Input token activations from pre-attention norm.', hardwareContext: 'Stored in GPU SRAM during GEMM execution.', color: 'sky' },
      { symbol: 'W_Q', name: 'Query Weights', shape: '[6144, 6144]', description: 'Projects 6144 dims into 48 heads of 128 dimensions.', hardwareContext: 'Sharded across Tensor Parallel (TP) ranks.', color: 'purple' },
      { symbol: 'W_K, W_V', name: 'Key & Value Weights', shape: '[6144, 1536 or 768]', description: 'Projects into compact GQA key/value heads (12 for local, 6 for global).', hardwareContext: 'Saves 75%–87.5% KV cache memory during autoregressive decoding.', color: 'emerald' },
      { symbol: 'Q, K, V', name: 'Head Projections', shape: 'Head dim 128', description: 'Per-head subspace representations for attention routing.', hardwareContext: 'Fed into ShortConv and FlashAttention kernels.', color: 'cyan' },
    ],
    realShape: 'Q: [48, 128], K/V: [12/6, 128]',
    visualShape: 'Q: [12, 16], K/V: [3, 16]',
    codeSnippet: 'q_flat = jnp.einsum("bsh,hd->bsd", x, self.w_q)\nk_flat = jnp.einsum("bsh,hd->bsd", x, self.w_k)',
  },

  short_conv_k: {
    id: 'short_conv_k',
    title: 'ShortConv on Key Channel (Causal 1D)',
    category: 'Attention',
    formula: 'K_{\\text{conv}}[t] = \\sum_{\\tau=0}^{3} w_{\\tau} \\odot K[t - \\tau], \\quad w_0=1, w_{1..3}=0 \\; (init)',
    intuitiveMeaning: 'A causal 1D depthwise convolution with kernel size 4 on Key channels. By blending each key with its immediate 3 predecessor tokens, it equips attention with localized n-gram context. Because it is depthwise and causal, it executes on GPU SRAM with zero cross-GPU collective communication.',
    dataflow: {
      inputShape: 'K [1, 4096, 12/6, 128]',
      operation: '1D Causal Depthwise Conv (kernel=4)',
      weightShape: 'w_tau: [4, 1536/768]',
      outputShape: 'K_conv [1, 4096, 12/6, 128]',
      transformationNote: 'Key sequence smoothed over 4-step causal receptive field',
      stages: [
        { label: 'Input Keys', name: 'K[t]', shape: '[1, 4096, KV, 128]', type: 'input' },
        { label: 'Kernel', name: '4-Tap Filter w', shape: '[4, Channels]', type: 'weight' },
        { label: 'Conv', name: 'Causal Depthwise 1D', shape: 'Temporal Slip', type: 'op' },
        { label: 'Output Keys', name: 'K_conv[t]', shape: '[1, 4096, KV, 128]', type: 'output' },
      ],
    },
    variables: [
      { symbol: 'K[t]', name: 'Current Key Vector', shape: '[12/6, 128]', description: 'Key representation for token at time step t.', hardwareContext: 'Channel-major tensor in GPU SRAM.', color: 'sky' },
      { symbol: '\\tau', name: 'Causal Time Lag', shape: 'Index 0..3', description: 'Time offset into past causal tokens.', hardwareContext: 'Cached in circular convolution buffer.', color: 'amber' },
      { symbol: 'w_{\\tau}', name: 'Conv Tap Weight', shape: '[4, Channels]', description: 'Learnable depthwise kernel coefficients initialized to identity [1, 0, 0, 0].', hardwareContext: 'Loaded into GPU registers for ultra-fast fused conv.', color: 'purple' },
      { symbol: 'K_{\\text{conv}}', name: 'Temporally Mixed Keys', shape: '[12/6, 128]', description: 'Keys enriched with local n-gram temporal context.', hardwareContext: 'Stored directly into KV cache.', color: 'emerald' },
    ],
    realShape: 'Kernel: [4, 1536/768]',
    visualShape: '[4, 48]',
    codeSnippet: 'if self.sconv_k is not None:\n    k_flat = self.sconv_k(k_flat, sconv_segment_ids)',
  },

  q_k_norm_rope: {
    id: 'q_k_norm_rope',
    title: 'Q/K RMSNorm & Local Half-RoPE vs Global NoPE',
    category: 'Attention',
    formula: 'Q\' = \\text{RMSNorm}(Q) \\cdot 1.3, \\quad Q\'_{[:64]} = \\text{RoPE}(Q\'_{[:64]}), \\quad Q\'_{[64:]} = Q\'_{[64:]}',
    intuitiveMeaning: 'Per-head RMSNorm prevents attention logits from exploding, scaled by 1.3 for temperature stability. Local layers apply Rotary Position Embedding (RoPE) only to the first 64 of 128 head dims (Half-RoPE), leaving the rest invariant. Global layers use NoPE (No Positional Encoding) to allow unrestrained attention across long horizons.',
    dataflow: {
      inputShape: 'Q [48, 128], K [12/6, 128]',
      operation: 'RMSNorm \u00d7 1.3 \u2192 Half-RoPE (Local) / NoPE (Global)',
      outputShape: 'Q\', K\' [Head dim: 128]',
      transformationNote: 'Half-RoPE rotates 64 dims; Global layers run 100% NoPE',
      stages: [
        { label: 'Input Heads', name: 'Q, K', shape: 'Dim 128', type: 'input' },
        { label: 'Per-Head Norm', name: 'RMSNorm * 1.3', shape: 'Entropy Stabilizer', type: 'op' },
        { label: 'Half-RoPE', name: 'RoPE on Dims 0..63', shape: 'Local Layers Only', type: 'op' },
        { label: 'NoPE', name: 'Dims 64..127 Untouched', shape: 'Position Invariant', type: 'op' },
        { label: 'Output', name: 'Q\', K\' Ready', shape: 'Dim 128', type: 'output' },
      ],
    },
    variables: [
      { symbol: 'Q, K', name: 'Raw Projections', shape: 'Head dim 128', description: 'Per-head query and key representations before normalization.', hardwareContext: 'Computed by projection GEMMs.', color: 'sky' },
      { symbol: '1.3', name: 'qk_mult Multiplier', shape: 'Scalar Constant', description: 'Learned scaling factor that stabilizes softmax entropy.', hardwareContext: 'Fused into RMSNorm epilogue.', color: 'amber' },
      { symbol: 'Q\'_{[:64]}', name: 'Half-RoPE Rotated Subspace', shape: 'Dims 0..63', description: 'Rotated by complex angles corresponding to token positions.', hardwareContext: 'Only active on 36 Local layers.', color: 'purple' },
      { symbol: 'Q\'_{[64:]}', name: 'NoPE Unrotated Subspace', shape: 'Dims 64..127', description: 'Position-invariant subspace preserving pure semantic similarity.', hardwareContext: '100% of head is NoPE on 12 Global layers.', color: 'emerald' },
    ],
    realShape: 'Head dim: 128 (RoPE on 64, NoPE on 64)',
    visualShape: 'Head dim: 16 (RoPE on 8, NoPE on 8)',
    codeSnippet: 'q = rms_norm(q) * self.cfg.qk_mult\n# Half-RoPE on local, NoPE on global\nq, k = _apply_rotary_embedding_fused(q, k, rotary_dim=64, disable_rope=is_global)',
  },

  attention_weights: {
    id: 'attention_weights',
    title: 'Attention Softmax & 2048 Sliding Window vs Full Causal',
    category: 'Attention',
    formula: 'A_{ij} = \\text{Softmax}\\left( \\frac{Q_i K_j^\\top}{\\sqrt{d_k}} + M_{ij} \\right), \\quad M_{ij} = \\begin{cases} 0 & 0 \\le i-j \\le W \\\\ -\\infty & \\text{otherwise} \\end{cases}',
    intuitiveMeaning: 'Calculates token-to-token attention relevance. Local layers enforce a 2048-token sliding window mask, reducing quadratic O(S^2) memory and compute to linear O(S \u00b7 W). Global layers compute full causal attention across all 4096 tokens, guaranteeing global cross-document reasoning.',
    dataflow: {
      inputShape: 'Q [48, 128], K [48, 128] (GQA expanded)',
      operation: 'FlashAttention / Scaled Dot-Product + Mask',
      outputShape: 'Attention Scores A [48, 4096, 4096] (Sparse / Banded)',
      transformationNote: 'Sliding window cuts attention compute by 75% on 36/48 layers',
      stages: [
        { label: 'Q, K Tensors', name: 'Q, K', shape: '[48, 4096, 128]', type: 'input' },
        { label: 'Dot Product', name: 'Q @ K^T / sqrt(d)', shape: '[48, 4096, 4096]', type: 'op' },
        { label: 'Window Mask', name: 'M_ij (W=2048)', shape: 'Banded Causal', type: 'op' },
        { label: 'Softmax', name: 'Softmax Probability', shape: '[48, 4096, 4096]', type: 'output' },
      ],
    },
    variables: [
      { symbol: 'Q_i', name: 'Query Vector', shape: '[128]', description: 'Current token query vector.', hardwareContext: 'Loaded in FlashAttention tile SRAM.', color: 'sky' },
      { symbol: 'K_j', name: 'Key Vector', shape: '[128]', description: 'Candidate memory token key vector.', hardwareContext: 'Streamed from KV cache HBM.', color: 'purple' },
      { symbol: 'M_{ij}', name: 'Causal Window Mask', shape: 'Binary / -\u221e', description: 'Blocks future tokens and tokens outside the 2048 sliding window.', hardwareContext: 'Fused bitmask inside FlashAttention kernel.', color: 'rose' },
      { symbol: 'A_{ij}', name: 'Attention Weight', shape: 'Range (0, 1)', description: 'Softmax normalized attention probability.', hardwareContext: 'Kept in SRAM registers, never written to HBM.', color: 'emerald' },
    ],
    realShape: '[4096, 4096] (Sparsified 2048)',
    visualShape: '[6, 6] Attention Heatmap',
    codeSnippet: 'attn_out = attention(q, k, v, mask, implementation="gpu_fa4_cute_wide")',
  },

  xsa_decorrelation: {
    id: 'xsa_decorrelation',
    title: 'XSA (Exclusive Self-Attention) Decorrelation',
    category: 'Attention',
    formula: 'z_i = y_i - \\left( \\frac{y_i^\\top v_i}{\\|v_i\\|^2 + 10^{-6}} \\right) v_i',
    intuitiveMeaning: 'Exclusive Self-Attention (XSA) removes the component of the attention output that is parallel to the value vector V. Standard self-attention often collapses into an expensive identity copy shortcut. By mathematically orthogonalizing y_i against v_i, XSA forces attention heads to learn genuine relational transformations rather than copying values.',
    dataflow: {
      inputShape: 'Attn Output y_i [48, 128], Value Vector v_i [48, 128]',
      operation: 'Gram-Schmidt Projection Subtraction: y - proj_v(y)',
      outputShape: 'Decorrelated Output z_i [48, 128]',
      transformationNote: 'Parallel component along V stripped: <z_i, v_i> = 0',
      stages: [
        { label: 'Attn Output', name: 'y_i', shape: '[48, 128]', type: 'input' },
        { label: 'Value Vector', name: 'v_i', shape: '[48, 128]', type: 'input' },
        { label: 'Projection', name: 'dot(y, v) / ||v||^2', shape: 'Scalar Coefficient', type: 'op' },
        { label: 'Subtract', name: 'y - proj_v(y)', shape: 'Orthogonalization', type: 'op' },
        { label: 'Decorrelated', name: 'z_i', shape: '[48, 128]', type: 'output' },
      ],
    },
    variables: [
      { symbol: 'y_i', name: 'Raw Attention Head Output', shape: '[128]', description: 'Weighted sum of values: \u2211_j A_ij V_j.', hardwareContext: 'FlashAttention output accumulator.', color: 'sky' },
      { symbol: 'v_i', name: 'Aligned Value Vector', shape: '[128]', description: 'Direct value projection of current token.', hardwareContext: 'Stored in SRAM buffer.', color: 'purple' },
      { symbol: '\\frac{y_i^\\top v_i}{\\|v_i\\|^2}', name: 'Parallel Projection Coeff', shape: 'Scalar', description: 'Measures degree of redundant identity copying in the head.', hardwareContext: 'Vector dot product reduction in registers.', color: 'amber' },
      { symbol: 'z_i', name: 'Decorrelated Head Output', shape: '[128]', description: 'Attention features strictly orthogonal to V.', hardwareContext: 'Fed to Attention Head Gate.', color: 'emerald' },
    ],
    realShape: '[48 heads, 128 dim]',
    visualShape: '[12 heads, 16 dim]',
    codeSnippet: 'dot = jnp.sum(attn_out * aligned_v, axis=-1, keepdims=True)\nv_norm_sq = jnp.sum(aligned_v * aligned_v, axis=-1, keepdims=True)\nattn_out = attn_out - (dot / (v_norm_sq + 1e-6)) * aligned_v',
  },

  head_gating: {
    id: 'head_gating',
    title: 'Attention Head Dynamic Gate',
    category: 'Attention',
    formula: 'g_h = 2 \\cdot \\sigma(x \\cdot W_{\\text{gate}}^{(h)}), \\quad \\text{attn\\_out}_h = g_h \\cdot z_h',
    intuitiveMeaning: 'A continuous per-head gating mechanism. A linear projection from the token\'s residual state computes a dynamic multiplier g_h \u2208 (0, 2) for each head. This allows the model to dynamically silence noisy or irrelevant attention heads on a per-token basis without discrete routing overhead.',
    dataflow: {
      inputShape: 'Token State x [1, 4096, 6144], Heads z [48, 128]',
      operation: 'Linear Projection \u2192 Sigmoid \u00d7 2 \u2192 Per-Head Scaling',
      weightShape: 'W_gate: [6144, 48]',
      outputShape: 'Gated Heads attn_out [48, 128]',
      transformationNote: 'Learned dynamic scaling factor g_h in (0, 2) per head',
      stages: [
        { label: 'Token State', name: 'x', shape: '[1, 4096, 6144]', type: 'input' },
        { label: 'Gate Weight', name: 'W_gate', shape: '[6144, 48]', type: 'weight' },
        { label: 'Sigmoid', name: '2 * sigmoid(x W)', shape: 'Range (0, 2)', type: 'op' },
        { label: 'Modulate', name: 'g_h * z_h', shape: 'Per-Head Scale', type: 'op' },
        { label: 'Output', name: 'attn_out', shape: '[48, 128]', type: 'output' },
      ],
    },
    variables: [
      { symbol: 'x', name: 'Residual Token', shape: '[6144]', description: 'Contextual token vector driving gating decisions.', hardwareContext: 'Read from residual buffer.', color: 'sky' },
      { symbol: 'W_{\\text{gate}}', name: 'Head Gate Weights', shape: '[6144, 48]', description: 'Lightweight linear matrix mapping hidden state to 48 head gates.', hardwareContext: 'High-throughput GEMV kernel.', color: 'purple' },
      { symbol: 'g_h', name: 'Dynamic Head Gain', shape: 'Scalar in (0, 2)', description: 'Dynamic amplification or suppression factor for head h.', hardwareContext: 'Multiplied elementwise across head dimension.', color: 'amber' },
      { symbol: 'z_h', name: 'Decorrelated Head State', shape: '[128]', description: 'Input attention head features from XSA.', hardwareContext: 'SRAM head register tile.', color: 'emerald' },
    ],
    realShape: '[1, 4096, 48 heads]',
    visualShape: '[1, 6, 12 heads]',
    codeSnippet: 'gate = 2 * jax.nn.sigmoid(jnp.einsum("bsd,dn->bsn", x, self.attn_gate))[..., None]\nattn_out = gate * attn_out',
  },

  attn_proj_residual: {
    id: 'attn_proj_residual',
    title: 'W_O Projection & Highway Residual Merge',
    category: 'Residual & Norm',
    formula: 'x = x + \\text{attn\\_out} \\cdot W_O, \\quad W_O \\in \\mathbb{R}^{6144 \\times 6144}',
    intuitiveMeaning: 'Concatenates all 48 gated attention heads and projects them back into the 6144-dimensional hidden space through W_O. The output is added directly to the residual stream highway, ensuring gradient highways remain unobstructed throughout the 48-layer stack.',
    dataflow: {
      inputShape: 'attn_out [1, 4096, 48 \u00d7 128]',
      operation: 'GEMM Linear Projection + Residual Addition',
      weightShape: 'W_O: [6144, 6144]',
      outputShape: 'Residual Stream x [1, 4096, 6144]',
      transformationNote: 'Head outputs merged and added back to bypass highway',
      stages: [
        { label: 'All Heads', name: 'attn_out', shape: '[48 x 128 = 6144]', type: 'input' },
        { label: 'Projection', name: 'W_O Matrix', shape: '[6144, 6144]', type: 'weight' },
        { label: 'All-Reduce', name: 'Reduce-Scatter / All-Reduce', shape: 'TP Mesh', type: 'op' },
        { label: 'Residual Add', name: 'x + proj', shape: 'Highway Merge', type: 'op' },
        { label: 'Output', name: 'x (Updated)', shape: '[1, 4096, 6144]', type: 'output' },
      ],
    },
    variables: [
      { symbol: '\\text{attn\\_out}', name: 'Concatenated Heads', shape: '[6144]', description: 'Unified attention head representation.', hardwareContext: 'Row partitioned across TP ranks.', color: 'sky' },
      { symbol: 'W_O', name: 'Output Projection Matrix', shape: '[6144, 6144]', description: 'Linear projection mixing heads back to model space.', hardwareContext: 'TP=4 column sharded GEMM with all-reduce.', color: 'purple' },
      { symbol: 'x', name: 'Residual Stream', shape: '[6144]', description: 'The main skip-connection pathway traversing all layers.', hardwareContext: 'Kept resident in GPU HBM.', color: 'emerald' },
    ],
    realShape: '[1, 4096, 6144]',
    visualShape: '[1, 6, 64]',
    codeSnippet: 'x = x + jnp.einsum("bsh,hd->bsd", attn_out, self.w_o)',
  },

  pre_moe_gated_norm: {
    id: 'pre_moe_gated_norm',
    title: 'Pre-MoE GatedNorm',
    category: 'MoE',
    formula: 'x_{\\text{mlp\\_in}} = \\text{GatedNorm}_{\\text{mlp}}(\\text{RMSNorm}(x))',
    intuitiveMeaning: 'Applies RMSNorm and a rank-128 GatedNorm to the residual stream prior to the MoE block. This prevents attention output accumulation from saturating the router logits and ensures expert MLPs receive well-scaled, variance-controlled inputs.',
    dataflow: {
      inputShape: 'Residual Stream x [1, 4096, 6144]',
      operation: 'RMSNorm + Rank-128 GatedNorm',
      weightShape: '[6144, 128] + [128, 6144]',
      outputShape: 'x_mlp_in [1, 4096, 6144]',
      transformationNote: 'Stabilized input broadcast to Router, Latent Proj, and Shared Experts',
      stages: [
        { label: 'Residual', name: 'x', shape: '[1, 4096, 6144]', type: 'input' },
        { label: 'Norm', name: 'RMSNorm(x)', shape: '[1, 4096, 6144]', type: 'op' },
        { label: 'Bottleneck', name: 'GatedNorm (Rank 128)', shape: '[6144, 128, 6144]', type: 'weight' },
        { label: 'Output', name: 'x_mlp_in', shape: '[1, 4096, 6144]', type: 'output' },
      ],
    },
    variables: [
      { symbol: 'x', name: 'Current Residual State', shape: '[1, 4096, 6144]', description: 'Hidden states after attention residual merge.', hardwareContext: 'Read directly from device memory.', color: 'sky' },
      { symbol: 'x_{\\text{mlp\\_in}}', name: 'MoE Input Representation', shape: '[1, 4096, 6144]', description: 'Pre-normalized state shared between Router, Latent Down-Projection, and Shared Experts.', hardwareContext: 'Broadcast to 3 concurrent MoE sub-paths.', color: 'emerald' },
    ],
    realShape: '[1, 4096, 6144]',
    visualShape: '[1, 6, 64]',
    codeSnippet: 'mlp_in = self.mlp_gated_norm(self.rms_mlp(x))',
  },

  router_qb_selection: {
    id: 'router_qb_selection',
    title: 'LatentMoE Router & QB Load Balancing',
    category: 'MoE',
    formula: 's = x W_r, \\quad \\text{top8} = \\text{top\\_k}(s + b, 8), \\quad w_i = \\sigma(s_i) \\cdot \\frac{2.5}{\\sum_{j \\in \\text{top8}} \\sigma(s_j)}',
    intuitiveMeaning: 'Quantile-Balancing (QB) routing selects the top-8 most capable experts out of 384 available half-width experts. Unlike standard routing that adds auxiliary loss penalties which degrade model capacity, QB adds a dynamic per-expert bias b that keeps hardware utilization balanced across GPUs without distorting token representations. Weights are normalized to sum to 2.5.',
    dataflow: {
      inputShape: 'Full Token x [1, 4096, 6144]',
      operation: 'Router Projection \u2192 Biased Top-8 Selection \u2192 Sigmoid Renorm (\u2211=2.5)',
      weightShape: 'W_r: [6144, 384], b: [384]',
      outputShape: 'Top-8 Indices [4096, 8] & Weights [4096, 8]',
      transformationNote: 'Dynamic QB load balancing with zero auxiliary loss penalties',
      stages: [
        { label: 'Token', name: 'x_mlp_in', shape: '[6144]', type: 'input' },
        { label: 'Router Weights', name: 'W_r', shape: '[6144, 384]', type: 'weight' },
        { label: 'Logits + Bias', name: 's + b (QB)', shape: '[384 Experts]', type: 'op' },
        { label: 'Top-8 Select', name: 'top_k', shape: '8 Active Experts', type: 'op' },
        { label: 'Renorm', name: 'Sigmoid * (2.5 / sum)', shape: 'Fixed Sum 2.5', type: 'output' },
      ],
    },
    variables: [
      { symbol: 'x', name: 'Router Input Token', shape: '[6144]', description: 'Full 6144-dimensional token representation.', hardwareContext: 'Shared buffer in device memory.', color: 'sky' },
      { symbol: 'W_r', name: 'Router Matrix', shape: '[6144, 384]', description: 'Linear projection from model space to 384 expert logits.', hardwareContext: 'Replicated across all expert parallel ranks.', color: 'purple' },
      { symbol: 's', name: 'Unbiased Routing Logits', shape: '[384]', description: 'Raw semantic compatibility scores for all 384 experts.', hardwareContext: 'Computed via GEMM.', color: 'indigo' },
      { symbol: 'b', name: 'QB Bias Vector', shape: '[384]', description: 'Dynamic quantile-balancing bias dynamically adjusting for GPU rank load.', hardwareContext: 'Maintained by optimizer without gradient backprop.', color: 'rose' },
      { symbol: 'w_i', name: 'Routing Weight', shape: 'Sum = 2.5', description: 'Normalized expert combination weight for selected top-8 experts.', hardwareContext: 'Used in downstream weighted sum.', color: 'emerald' },
    ],
    realShape: 'Logits: [4096, 384], Selected: [4096, 8]',
    visualShape: 'Logits: [6, 24], Selected: [6, 8]',
    codeSnippet: '_topk_logits, selected_experts = jax.lax.top_k(biased_logits, 8 + 1)\ncombine_weights = sigmoid(unbiased_topk) * (2.5 / (sum + 1e-9))',
  },

  latent_compression: {
    id: 'latent_compression',
    title: 'Latent Compression (6144 \u2192 3072)',
    category: 'MoE',
    formula: 'x_{\\text{latent}} = \\text{RMSNorm}_{\\text{latent}}(x \\cdot W_{\\text{latent\\_down}}), \\quad W_{\\text{latent\\_down}} \\in \\mathbb{R}^{6144 \\times 3072}',
    intuitiveMeaning: 'The core breakthrough of Marin\'s LatentMoE architecture: tokens are compressed from 6144 to 3072 before dispatching across expert-parallel (EP) GPUs. In a 11-rack cluster, all-to-all cross-node network bandwidth is the primary training bottleneck; compressing hidden states by 50% cuts network traffic in half (from 150 GB/s to 75 GB/s per GPU).',
    dataflow: {
      inputShape: 'Hidden State x [1, 4096, 6144]',
      operation: 'Linear Down-Projection (6144 \u2192 3072) + Latent RMSNorm',
      weightShape: 'W_latent_down: [6144, 3072]',
      outputShape: 'Compressed Latent Token x_latent [1, 4096, 3072]',
      transformationNote: 'Cuts EP All-to-All network communication volume by 50%',
      stages: [
        { label: 'Input Token', name: 'x', shape: '[1, 4096, 6144]', type: 'input' },
        { label: 'Compression', name: 'W_latent_down', shape: '[6144, 3072]', type: 'weight' },
        { label: 'Latent Norm', name: 'RMSNorm_latent', shape: 'Unit Variance', type: 'op' },
        { label: 'All-to-All', name: 'EP Dispatch', shape: 'Halved Bandwidth (75 GB/s)', type: 'op' },
        { label: 'Output', name: 'x_latent', shape: '[1, 4096, 3072]', type: 'output' },
      ],
    },
    variables: [
      { symbol: 'x', name: 'Full Hidden State', shape: '[1, 4096, 6144]', description: 'Input token vector before network dispatch.', hardwareContext: 'Stored on source GPU node.', color: 'sky' },
      { symbol: 'W_{\\text{latent\\_down}}', name: 'Latent Down-Projection', shape: '[6144, 3072]', description: 'Linear compression matrix reducing hidden dimensionality by 2x.', hardwareContext: 'Shard-local GEMM prior to network send.', color: 'purple' },
      { symbol: '\\text{RMSNorm}_{\\text{latent}}', name: 'Latent RMSNorm', shape: '[3072]', description: 'Learnable scale normalization ensuring compressed activations are well-conditioned.', hardwareContext: 'Fused with down-projection GEMM.', color: 'amber' },
      { symbol: 'x_{\\text{latent}}', name: 'Dispatched Latent Token', shape: '[1, 4096, 3072]', description: 'Compact payload transmitted across optical InfiniBand fabric.', hardwareContext: 'Sent via ncclAllToAllv / jax all_to_all.', color: 'emerald' },
    ],
    realShape: '[1, 4096, 3072]',
    visualShape: '[1, 6, 32]',
    codeSnippet: 'routed_input = jnp.einsum("td,dl->tl", x_flat, self.w_latent_down)\nrouted_input = self.latent_norm(routed_input)',
  },

  routed_experts_swiglu: {
    id: 'routed_experts_swiglu',
    title: '8 Routed Half-Width Experts (SwiGLU)',
    category: 'MoE',
    formula: '\\text{Expert}_k(x) = \\left(\\text{SiLU}(x W_{\\text{gate}}^{(k)}) \\odot x W_{\\text{up}}^{(k)}\\right) W_{\\text{down}}^{(k)}',
    intuitiveMeaning: 'Each of the 8 selected routed experts is half-width (hidden_dim=3072, intermediate_dim=3072). Using half-width experts allows Marin to pack 384 specialized experts into memory rather than only 192 full-width experts, doubling parameter modularity and specialization for reasoning, math, and code domains while staying within HBM memory constraints.',
    dataflow: {
      inputShape: 'Compressed Token x [1, 4096, 3072]',
      operation: 'SwiGLU MLP: (SiLU(x W_gate) \u2299 x W_up) W_down',
      weightShape: 'W_gate: [3072, 3072], W_up: [3072, 3072], W_down: [3072, 3072]',
      outputShape: 'Expert Output [1, 4096, 3072]',
      transformationNote: '384 half-width experts double modular specialization within HBM',
      stages: [
        { label: 'Latent Input', name: 'x_latent', shape: '[3072]', type: 'input' },
        { label: 'Gate & Up', name: 'W_gate, W_up', shape: '2x [3072, 3072]', type: 'weight' },
        { label: 'SwiGLU', name: 'SiLU(Gate) * Up', shape: 'Bilinear Activation', type: 'op' },
        { label: 'Down Proj', name: 'W_down', shape: '[3072, 3072]', type: 'weight' },
        { label: 'Expert Out', name: 'Expert_k(x)', shape: '[3072]', type: 'output' },
      ],
    },
    variables: [
      { symbol: 'x', name: 'Compressed Latent Token', shape: '[3072]', description: 'Received token vector on destination expert GPU.', hardwareContext: 'Resident in expert node HBM.', color: 'sky' },
      { symbol: 'W_{\\text{gate}}^{(k)}', name: 'SwiGLU Gate Weights', shape: '[3072, 3072]', description: 'Projects token into gating activation subspace.', hardwareContext: 'Stored on assigned EP GPU rank.', color: 'purple' },
      { symbol: 'W_{\\text{up}}^{(k)}', name: 'SwiGLU Up Weights', shape: '[3072, 3072]', description: 'Projects token into intermediate feature subspace.', hardwareContext: 'Fused with gate projection GEMM.', color: 'indigo' },
      { symbol: 'W_{\\text{down}}^{(k)}', name: 'SwiGLU Down Weights', shape: '[3072, 3072]', description: 'Projects intermediate features back to latent dimension 3072.', hardwareContext: 'Final expert GEMM before EP return dispatch.', color: 'amber' },
      { symbol: '\\text{Expert}_k(x)', name: 'Expert Output Vector', shape: '[3072]', description: 'Computed output from specialized expert k.', hardwareContext: 'Accumulated with routing weight w_k.', color: 'emerald' },
    ],
    realShape: '8 experts x [3072, 3072]',
    visualShape: '8 active tiles x [16, 16]',
    codeSnippet: 'moe_out = self.expert_mlp(routed_input, selected_experts, combine_weights)',
  },

  shared_experts_swiglu: {
    id: 'shared_experts_swiglu',
    title: '2 Concurrent Shared Experts (Full-Width SwiGLU)',
    category: 'MoE',
    formula: '\\text{Shared}(x) = \\sum_{s=1}^{2} \\text{SwiGLU}_s(x_{\\text{mlp\\_in}})',
    intuitiveMeaning: 'Operates concurrently with routed experts. 2 shared experts compute directly on the uncompressed 6144-dimensional token (6144 \u2192 intermediate 3072 \u2192 6144). These shared experts capture universal grammar, factual recall, and syntax across all tokens, preventing routed experts from redundantly learning common patterns and keeping them focused on specialized reasoning.',
    dataflow: {
      inputShape: 'Uncompressed Token x [1, 4096, 6144]',
      operation: '2 Concurrent Full-Width SwiGLU Paths',
      weightShape: '2 \u00d7 [6144 \u2192 3072 \u2192 6144]',
      outputShape: 'Shared Representation [1, 4096, 6144]',
      transformationNote: 'Zero-routing baseline capturing domain-invariant language patterns',
      stages: [
        { label: 'Full Token', name: 'x_mlp_in', shape: '[6144]', type: 'input' },
        { label: 'Shared 1', name: 'SwiGLU_1', shape: '[6144 -> 3072 -> 6144]', type: 'weight' },
        { label: 'Shared 2', name: 'SwiGLU_2', shape: '[6144 -> 3072 -> 6144]', type: 'weight' },
        { label: 'Concurrent Add', name: 'Shared_1 + Shared_2', shape: 'Local Shard Compute', type: 'op' },
        { label: 'Output', name: 'Shared(x)', shape: '[6144]', type: 'output' },
      ],
    },
    variables: [
      { symbol: 'x_{\\text{mlp\\_in}}', name: 'Full Token State', shape: '[6144]', description: 'Uncompressed hidden representation from pre-MoE norm.', hardwareContext: 'Remains local on data-parallel rank.', color: 'sky' },
      { symbol: '\\text{SwiGLU}_s', name: 'Shared Expert Network', shape: '[6144, 3072, 6144]', description: 'Full-width SwiGLU MLP evaluated on every token without routing.', hardwareContext: 'Replicated or TP-sharded, runs concurrently with EP dispatch.', color: 'purple' },
      { symbol: '\\text{Shared}(x)', name: 'Shared Expert Output', shape: '[6144]', description: 'Common knowledge representation merged into the residual stream.', hardwareContext: 'Added to up-projected routed expert output.', color: 'emerald' },
    ],
    realShape: '2 x [6144 -> 3072 -> 6144]',
    visualShape: '2 x [64 -> 32 -> 64]',
    codeSnippet: 'for shared_expert in self.shared:\n    mlp_out = mlp_out + shared_expert(mlp_in, activation=silu)',
  },

  moe_aggregation_residual: {
    id: 'moe_aggregation_residual',
    title: 'Latent Up-Proj & Residual Merge',
    category: 'Residual & Norm',
    formula: 'x = x + \\left( \\left(\\sum_{k=1}^8 w_k \\text{Expert}_k(x_{\\text{latent}})\\right) W_{\\text{latent\\_up}} + \\text{Shared}_1 + \\text{Shared}_2 \\right)',
    intuitiveMeaning: 'Merges the dual MoE paths: the 8 routed expert outputs are weighted by w_k, up-projected from 3072 back to 6144 via W_latent_up, added to the 2 shared experts\' outputs, and injected back into the residual highway. This dual-stream design combines specialized domain competence with core shared knowledge.',
    dataflow: {
      inputShape: 'Routed Outputs [4096, 3072], Shared Outputs [4096, 6144], Residual x',
      operation: 'Weighted Sum \u2192 Latent Up-Proj (3072 \u2192 6144) \u2192 Residual Add',
      weightShape: 'W_latent_up: [3072, 6144]',
      outputShape: 'Updated Residual Stream x [1, 4096, 6144]',
      transformationNote: 'Latent space expanded to 6144 and fused with Shared & Residual',
      stages: [
        { label: 'Routed Sum', name: '\u2211 w_k Expert_k', shape: '[3072]', type: 'input' },
        { label: 'Up-Projection', name: 'W_latent_up', shape: '[3072, 6144]', type: 'weight' },
        { label: 'Shared Sum', name: 'Shared_1 + Shared_2', shape: '[6144]', type: 'input' },
        { label: 'Merge', name: 'Routed + Shared', shape: '[6144]', type: 'op' },
        { label: 'Residual Add', name: 'x + mlp_out', shape: 'Highway Sum', type: 'output' },
      ],
    },
    variables: [
      { symbol: 'w_k', name: 'Expert Combination Weight', shape: 'Scalar', description: 'QB normalized routing weight for expert k.', hardwareContext: 'Multiplied in reduction kernel.', color: 'sky' },
      { symbol: 'W_{\\text{latent\\_up}}', name: 'Latent Up-Projection Matrix', shape: '[3072, 6144]', description: 'Projects routed outputs from 3072 back to full 6144 model dimension.', hardwareContext: 'GEMM executed on receiving GPU rank.', color: 'purple' },
      { symbol: '\\text{Shared}_{1, 2}', name: 'Shared Expert Representations', shape: '[6144]', description: 'Base representations capturing domain-invariant linguistic patterns.', hardwareContext: 'Fused into the addition kernel.', color: 'indigo' },
      { symbol: 'x', name: 'Updated Residual Highway', shape: '[1, 4096, 6144]', description: 'Completed Transformer block output representation.', hardwareContext: 'Ready to pass to layer L+1 or final norm.', color: 'emerald' },
    ],
    realShape: '[1, 4096, 6144]',
    visualShape: '[1, 6, 64]',
    codeSnippet: 'routed_flat = jnp.einsum("tl,ld->td", routed_flat, self.w_latent_up)\nmlp_out = mlp_out + routed_out\nx = x + mlp_out',
  },

  final_gated_norm: {
    id: 'final_gated_norm',
    title: 'Final Layer GatedNorm',
    category: 'Residual & Norm',
    formula: 'x_{\\text{final}} = \\text{GatedNorm}_{\\text{final}}(\\text{RMSNorm}(x))',
    intuitiveMeaning: 'Applied once at the output of the 48th layer before token logits projection. It rescales the accumulated residual variance back to unit standard deviation and modulates features through a final rank-128 gate, preventing extreme logit values that cause softmax saturation during generation.',
    dataflow: {
      inputShape: '48-Layer Residual Output x [1, 4096, 6144]',
      operation: 'Final RMSNorm + Rank-128 GatedNorm',
      weightShape: 'W_final_gn: [6144, 128] + [128, 6144]',
      outputShape: 'Normalized Output x_final [1, 4096, 6144]',
      transformationNote: 'Final unit-variance normalization before 128k logit projection',
      stages: [
        { label: 'Deep Residual', name: 'x (Layer 48)', shape: '[1, 4096, 6144]', type: 'input' },
        { label: 'Final RMSNorm', name: 'Root Mean Square', shape: '[1, 4096, 6144]', type: 'op' },
        { label: 'Final Gate', name: 'Rank-128 GatedNorm', shape: '[6144, 128, 6144]', type: 'weight' },
        { label: 'Output', name: 'x_final', shape: '[1, 4096, 6144]', type: 'output' },
      ],
    },
    variables: [
      { symbol: 'x', name: 'Full Model Output Residual', shape: '[6144]', description: 'Accumulated hidden representations through all 48 layers.', hardwareContext: 'Buffer output of final Transformer block.', color: 'sky' },
      { symbol: '\\text{RMSNorm}', name: 'Layer Normalizer', shape: 'Scalar per token', description: 'Scales vector by reciprocal root mean square of activations.', hardwareContext: 'Fused reduction kernel.', color: 'amber' },
      { symbol: 'x_{\\text{final}}', name: 'Regulated Feature State', shape: '[6144]', description: 'Input vector to untied LM head projection.', hardwareContext: 'Feeds output classification GEMM.', color: 'emerald' },
    ],
    realShape: '[1, 4096, 6144]',
    visualShape: '[1, 6, 64]',
    codeSnippet: 'hidden = self.final_gated_norm(self.final_norm(hidden))',
  },

  op_latent_proj: {
    id: 'op_latent_proj',
    title: 'Latent Projection Operator',
    category: 'Operator',
    formula: '\\text{routed\\_input} = \\text{jnp.einsum}("td,dl\\rightarrow tl", x, W_{\\text{down}})',
    intuitiveMeaning: 'Projects the 6144-dimensional token down to a 3072-dimensional latent representation to save cross-node bandwidth.',
    dataflow: {
      inputShape: '[T, 6144]',
      operation: 'Einsum Tensor Contraction',
      weightShape: '[6144, 3072]',
      outputShape: '[T, 3072]',
      transformationNote: 'Source Line: 1046',
      stages: []
    },
    variables: [],
    realShape: '[T, 3072]',
    visualShape: '[T, 32]',
    codeSnippet: 'routed_input = jnp.einsum("td,dl->tl", x, W_down)',
  },

  op_router_proj: {
    id: 'op_router_proj',
    title: 'Router Projection Operator',
    category: 'Operator',
    formula: '\\text{router\\_logits} = \\text{jnp.einsum}("td,de\\rightarrow te", x, W_{\\text{router}})',
    intuitiveMeaning: 'Projects the 6144-dimensional token to expert logits for the Query-Based Router.',
    dataflow: {
      inputShape: '[T, 6144]',
      operation: 'Einsum Tensor Contraction',
      weightShape: '[6144, 384]',
      outputShape: '[T, 384]',
      transformationNote: 'Source Line: 977',
      stages: []
    },
    variables: [],
    realShape: '[T, 384]',
    visualShape: '[T, 4]',
    codeSnippet: 'router_logits = jnp.einsum("td,de->te", x, W_router)',
  },

  untied_lm_head: {
    id: 'untied_lm_head',
    title: 'Untied Language Model Head & Softmax',
    category: 'Output',
    formula: '\\text{logits} = x_{\\text{final}} \\cdot W_{\\text{out}}, \\quad P(w_{t+1}) = \\text{Softmax}\\left(\\frac{\\text{logits}}{T}\\right), \\quad W_{\\text{out}} \\in \\mathbb{R}^{6144 \\times 128256}',
    intuitiveMeaning: 'Untied LM head projection. Many models tie input embeddings and output projection weights (W_out = W_embed^T) to save parameters. Marin keeps them completely untied: 128,256 independent output vectors allow the model to capture fine-grained prediction nuances across 18 Trillion training tokens without distorting input semantic geometry.',
    dataflow: {
      inputShape: 'Final Hidden State x_final [1, 4096, 6144]',
      operation: 'Matrix Multiply \u2192 Temperature Scaling \u2192 Softmax',
      weightShape: 'W_out: [6144, 128256] (~788M params, untied)',
      outputShape: 'Token Probabilities P(w_{t+1}) [1, 4096, 128256]',
      transformationNote: 'Maps 6144 features to 128k vocabulary probabilities',
      stages: [
        { label: 'Final Hidden', name: 'x_final', shape: '[1, 4096, 6144]', type: 'input' },
        { label: 'Untied Head', name: 'W_out Matrix', shape: '[6144, 128256]', type: 'weight' },
        { label: 'Logits GEMM', name: 'Linear Projection', shape: '[1, 4096, 128256]', type: 'op' },
        { label: 'Temperature', name: 'Divide by T', shape: 'Sampling Scale', type: 'op' },
        { label: 'Softmax', name: 'Token Probabilities', shape: '128,256 Class Dist', type: 'output' },
      ],
    },
    variables: [
      { symbol: 'x_{\\text{final}}', name: 'Final Hidden State', shape: '[6144]', description: 'Normalized output vector from the 48-layer Transformer stack.', hardwareContext: 'Stored in GPU register tile.', color: 'sky' },
      { symbol: 'W_{\\text{out}}', name: 'Untied Output Matrix', shape: '[6144, 128256]', description: 'Independent parameter matrix dedicated to vocabulary classification.', hardwareContext: 'Column sharded across TP ranks.', color: 'purple' },
      { symbol: '\\text{logits}', name: 'Unnormalized Logits', shape: '[128256]', description: 'Raw class prediction scores for each vocabulary token.', hardwareContext: 'Temporary buffer in HBM.', color: 'indigo' },
      { symbol: 'T', name: 'Sampling Temperature', shape: 'Scalar Float', description: 'Controls peakedness of probability distribution (e.g. 0.7 or 1.0).', hardwareContext: 'Scalar argument to sampling kernel.', color: 'amber' },
      { symbol: 'P(w_{t+1})', name: 'Next-Token Probability', shape: '[128256]', description: 'Final discrete probability distribution for next token generation.', hardwareContext: 'Sampled via top-p / top-k argmax.', color: 'emerald' },
    ],
    realShape: '[1, 4096, 128256]',
    visualShape: '[1, 6, 128] Top Predicted Tokens',
    codeSnippet: 'return jnp.einsum("bsh,hd->bsd", hidden, self.output_proj)',
  },
};

// Node-to-equation mappings for 3D inspection
export const NODE_EQUATION_MAP: Record<string, string> = {
  node_tokens: 'input_tokens',
  node_embed: 'token_embed',
  op_embed_gn: 'embed_gated_norm',
  node_embed_norm: 'embed_gated_norm',
  node_pre_attn_norm: 'pre_attn_gated_norm',
  op_attn_gn: 'pre_attn_gated_norm',
  node_q: 'qkv_proj',
  node_k: 'short_conv_k',
  node_v: 'qkv_proj',
  op_sconv_k: 'short_conv_k',
  op_rope: 'q_k_norm_rope',
  node_attn_matrix: 'attention_weights',
  op_xsa: 'xsa_decorrelation',
  node_attn_out: 'xsa_decorrelation',
  op_head_gate: 'head_gating',
  node_attn_res: 'attn_proj_residual',
  op_attn_add: 'attn_proj_residual',
  node_pre_moe_norm: 'pre_moe_gated_norm',
  op_moe_gn: 'pre_moe_gated_norm',
  op_router_proj: 'op_router_proj',
  node_router: 'router_qb_selection',
  op_router_qb: 'router_qb_selection',
  op_latent_proj: 'op_latent_proj',
  node_latent_down: 'latent_compression',
  op_latent_norm: 'latent_compression',
  node_experts_routed: 'routed_experts_swiglu',
  node_experts_shared: 'shared_experts_swiglu',
  node_moe_res: 'moe_aggregation_residual',
  op_moe_add: 'moe_aggregation_residual',
  node_final_norm: 'final_gated_norm',
  op_final_gn: 'final_gated_norm',
  node_lm_head: 'untied_lm_head',
};

export function getEquationData(idOrStep: string): EnrichedEquationData | undefined {
  if (EQUATION_DEFINITIONS[idOrStep]) {
    return EQUATION_DEFINITIONS[idOrStep];
  }
  const mappedStepId = NODE_EQUATION_MAP[idOrStep];
  if (mappedStepId && EQUATION_DEFINITIONS[mappedStepId]) {
    return EQUATION_DEFINITIONS[mappedStepId];
  }
  return undefined;
}
