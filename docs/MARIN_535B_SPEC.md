# Marin 535B-A23B MoE Architectural Specification

## Reference Run & Target
- **Hero Run Target**: GitHub Issue [#8435](https://github.com/marin-community/marin/issues/8435) (`grug/moe_hero_ep`).
- **Total Parameters**: 535 Billion parameters.
- **Active Parameters per Token**: ~23 Billion parameters.
- **Context Window**: 4096 tokens (with Local 2048 sliding window schedule).
- **Hidden Dimension ($d_{\text{model}}$)**: 6144.
- **Latent Compressed Dimension ($d_{\text{latent}}$)**: 3072.
- **Number of Layers**: 48.
- **Tokenizer Vocabulary Size**: 128,256 (Untied Embedding & Output Head).

---

## 1. 4-Layer Periodic Cycle (3 Local : 1 Global)

The 48 layers are organized into 12 quad-layer repeating cycles ($12 \times 4 = 48$):

| Metric | Local Layers (3 out of 4) | Global Layers (1 out of 4) |
| :--- | :--- | :--- |
| **Layer Indices** | $0, 1, 2, 4, 5, 6, 8, \dots$ (36 total) | $3, 7, 11, 15, \dots, 47$ (12 total) |
| **Query Heads** | 48 heads ($d_k = 128$) | 48 heads ($d_k = 128$) |
| **KV Heads** | 12 KV heads (GQA 4:1 ratio) | 6 KV heads (GQA 8:1 ratio) |
| **Attention Pattern** | 2048-token Sliding Window | Full 4096-token Causal Attention |
| **RoPE Schedule** | **Half-RoPE**: Rotary embedding on first 64/128 dims | **NoPE**: `disable_rope=True` (No Rotary Embedding) |
| **ShortConv** | 1D Causal Depthwise Conv (kernel=4) on Key | 1D Causal Depthwise Conv (kernel=4) on Key |
| **Pre-Attn Norm** | RMSNorm + GatedNorm (Rank-128 Bottleneck) | RMSNorm + GatedNorm (Rank-128 Bottleneck) |
| **Decorrelation** | Exclusive Self-Attention (XSA) | Exclusive Self-Attention (XSA) |
| **Head Gating** | 48 learned scalar gates $2\sigma(x W_{\text{gate}})$ | 48 learned scalar gates $2\sigma(x W_{\text{gate}})$ |

---

## 2. Attention Sub-Layer Details

### 2.1 Pre-Attention GatedNorm (Rank-128)
```
x_norm = RMSNorm(x)
gate = σ( SiLU( x_norm · W_down ) · W_up )    # W_down: [6144, 128], W_up: [128, 6144]
x_attn_in = x_norm ⊙ gate
```
* **Motivation**: Normalizes input magnitude and prevents early training gradient spikes when trained under AdamH/MuonH optimizer combinations without the parameter overhead of full MLP gates.

### 2.2 ShortConv on Key Vector
```
K_conv[t] = Σ_{τ=0}^{3} w_τ ⊙ K[t - τ]         # w initialized to [1, 0, 0, 0]
```
* **Motivation**: Local depthwise 1D temporal convolution mixes adjacent tokens with zero cross-GPU collective communication overhead, improving local n-gram matching.

### 2.3 Exclusive Self-Attention (XSA)
```
z_i = y_i - ( (y_i^T v_i) / (||v_i||^2 + 1e-6) ) · v_i
```
* **Motivation**: Removes the projection component of attention output along the Value vector $v_i$. Prevents attention heads from degenerating into identity/copy operators, forcing the model to learn abstract relational features.

### 2.4 Attention Head Gate
```
g_h = 2 · σ( x · W_gate^{(h)} )                # W_gate: [6144, 48]
attn_out_h = g_h · z_h
```
* **Motivation**: Provides learned scalar amplitude modulation $[0, 2]$ for each of the 48 attention heads conditioned on the layer input.

---

## 3. LatentMoE Sub-Layer Details

### 3.1 Token Compression: $6144 \to 3072$
```
x_latent = RMSNorm(x) · W_latent_down          # W_latent_down: [6144, 3072]
x_latent = latent_norm(x_latent)               # Learnable RMSNorm on 3072
```
* **Motivation**: Expert Parallelism (EP) across an 11-rack GPU cluster requires an all-to-all cross-node collective. Compressing hidden states from 6144 to 3072 reduces cross-node network communication volume by **50%** (from 150 GB/s to 75 GB/s per GPU).

### 3.2 Quantile-Balancing (QB) Router
```
logits = x · W_router                          # W_router: [6144, 384]
top8_indices, top8_weights = top_k_gating(logits + b_bias, k=8)
```
* **Routing Strategy**: Selects 8 of 384 active experts per token.
* **Quantile Balancing**: Uses dynamic router bias offsets $b$ updated via quantile tracking rather than auxiliary loss penalties, ensuring perfect load balancing across all 384 experts without degrading task loss.

### 3.3 Expert Architecture
- **Routed Experts**: 384 half-width experts ($d_{\text{ffn}} = 3072$).
  - SwiGLU activation: $\text{SwiGLU}(x) = (\text{Swish}(x W_{\text{gate}}) \odot x W_{\text{up}}) W_{\text{down}}$.
- **Shared Experts**: 2 concurrent full-width experts ($d_{\text{ffn}} = 3072 \times 2 = 6144$).
  - Operate unconditionally on every token without gating to retain domain-invariant general linguistic knowledge.

### 3.4 Latent Up-Projection & Highway Fusion
```
routed_out = Σ_{i=1}^{8} w_i · Expert_i(x_latent)   # Dimension 3072
routed_up = routed_out · W_latent_up                # W_latent_up: [3072, 6144]
final_out = x + routed_up + shared_experts(x)
```

---

## 4. Output & Loss Head
- **Untied LM Head**: $W_{\text{out}} \in \mathbb{R}^{6144 \times 128256}$ is completely independent of $W_{\text{embed}}$.
- **Final Norm**: RMSNorm + GatedNorm applied to the 48th layer's output before linear projection.
