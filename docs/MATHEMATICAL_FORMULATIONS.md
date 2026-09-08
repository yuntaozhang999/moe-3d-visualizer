# Mathematical Formulations & Dataflow Reference Guide

This document catalogs the exact mathematical equations, dataflow transformations, and hardware implications across all 19 forward pass steps in **Marin 535B-A23B MoE**.

---

## Step 1: Input Tokens & IDs
- **Category**: Input
- **Formula**:
  $$x_{\text{tokens}} = [t_1, t_2, \dots, t_S], \quad t_i \in \{0, 1, \dots, V-1\}$$
- **Dataflow**: `Raw Text` $\to$ `BPE Tokenizer (128,256 vocab)` $\to$ `[1, 4096]` (Toy: `[1, 6]`).
- **Variables**:
  - $t_i$: Token integer index in vocabulary (`Scalar Int`, CPU/GPU device buffer).
  - $S$: Sequence length (`4096 tokens`, defines attention sequence dimension).
  - $V$: Vocabulary size (`128,256 tokens`).

---

## Step 2: Token Embedding Lookup
- **Category**: Input
- **Formula**:
  $$E = \text{Gather}(W_{\text{embed}}, t), \quad W_{\text{embed}} \in \mathbb{R}^{128256 \times 6144}$$
- **Dataflow**: `Token IDs [1, 4096]` $\to$ `Gather` from $W_{\text{embed}} [128256, 6144]$ $\to$ `[1, 4096, 6144]`.
- **Hardware Note**: Replicated across Data/Expert shards for zero-communication local lookup. Untied from LM output projection.

---

## Step 3: Embedding GatedNorm
- **Category**: Normalization
- **Formula**:
  $$y = \text{RMSNorm}(x) \odot \sigma\left(\text{SiLU}\left(\text{RMSNorm}(x) W_{\text{down}}\right) W_{\text{up}}\right)$$
- **Dataflow**: `[1, 4096, 6144]` $\to$ `RMSNorm` $\to$ `Bottleneck [6144 -> 128 -> 6144]` $\to$ `[1, 4096, 6144]`.
- **Intuitive Meaning**: Stabilizes signal variance before entering deep layers; compensates for AdamH/MuonH optimizer dynamics without parameter explosion.

---

## Step 4: Pre-Attention GatedNorm
- **Category**: Attention Branch
- **Formula**:
  $$x_{\text{attn\_in}} = \text{GatedNorm}_{\text{attn}}(\text{RMSNorm}(x))$$
- **Dataflow**: `Residual Stream [1, 4096, 6144]` $\to$ `RMSNorm + GN (Rank-128)` $\to$ `[1, 4096, 6144]`.
- **Variables**:
  - $W_{\text{down}} \in \mathbb{R}^{6144 \times 128}$, $W_{\text{up}} \in \mathbb{R}^{128 \times 6144}$.

---

## Step 5: QKV Projections & GQA
- **Category**: Attention Branch
- **Formula**:
  $$Q = x W_Q \in \mathbb{R}^{S \times (48 \times 128)}, \quad K = x W_K \in \mathbb{R}^{S \times (M \times 128)}, \quad V = x W_V \in \mathbb{R}^{S \times (M \times 128)}$$
- **Dataflow**:
  - $Q$: `[1, 4096, 6144]` $\to$ `W_Q [6144, 6144]` $\to$ `[1, 4096, 48, 128]`.
  - $K, V$: `[1, 4096, 6144]` $\to$ `W_K, W_V` $\to$ `[1, 4096, 12, 128]` (Local, 4:1) or `[1, 4096, 6, 128]` (Global, 8:1).
- **Intuitive Meaning**: Grouped Query Attention (GQA) shares Key/Value heads among 4 (Local) or 8 (Global) Query heads, slashing inference KV cache by 75% to 87.5%.

---

## Step 6: ShortConv on Key Channel
- **Category**: Attention Branch
- **Formula**:
  $$K_{\text{conv}}[t] = \sum_{\tau=0}^{3} w_\tau \odot K[t - \tau], \quad w_0=1, w_{1..3}=0 \quad (\text{init})$$
- **Dataflow**: `K [1, 4096, M, 128]` $\to$ `1D Causal Depthwise Conv (kernel=4)` $\to$ `K_conv [1, 4096, M, 128]`.
- **Intuitive Meaning**: Mixes immediate local temporal tokens without any cross-GPU network collective, improving in-context n-gram recognition.

---

## Step 7: RoPE Positional Encoding (Half-RoPE vs NoPE)
- **Category**: Positional Encoding
- **Formula**:
  $$Q_{\text{rot}} = [\text{RoPE}(Q_{[:64]}), Q_{[64:]}], \quad K_{\text{rot}} = [\text{RoPE}(K_{[:64]}), K_{[64:]}] \quad (\text{Local Layers})$$
  $$\text{disable\_rope} = \text{True} \quad (\text{Global Layers})$$
- **Dataflow**: `Q, K head_dim 128` $\to$ `First 64 dims complex rotated` (Local) or `Untouched` (Global).
- **Intuitive Meaning**: Half-RoPE preserves high-frequency relative position while avoiding long-context rotational collapse; Global layers use NoPE for clean cross-sequence association.

---

## Step 8: Scaled Dot-Product Attention & Sliding Window
- **Category**: Attention Branch
- **Formula**:
  $$A = \text{Softmax}\left(\frac{Q K^\top}{\sqrt{128}} \cdot 1.3 + M\right), \quad M_{i,j} = \begin{cases} 0 & 0 \le i - j \le 2048 \text{ (Local)} \text{ or } i \ge j \text{ (Global)} \\ -\infty & \text{otherwise} \end{cases}$$
- **Dataflow**: `Q [48, S, 128]` $\times$ `K^T [48, 128, S]` $\to$ `[48, S, S]` Attention Matrix.
- **Intuitive Meaning**: 3 out of 4 layers use a 2048 sliding window, dropping FLOPs from quadratic $O(S^2)$ to linear $O(S \cdot W)$.

---

## Step 9: Value Aggregation
- **Category**: Attention Branch
- **Formula**:
  $$Y = A \cdot V, \quad Y \in \mathbb{R}^{S \times 48 \times 128}$$
- **Dataflow**: `A [48, S, S]` $\times$ `V [48, S, 128]` $\to$ `Y [48, S, 128]`.

---

## Step 10: Exclusive Self-Attention (XSA)
- **Category**: Attention Branch
- **Formula**:
  $$z_i = y_i - \left(\frac{y_i^\top v_i}{\|v_i\|^2 + 10^{-6}}\right) v_i$$
- **Dataflow**: `Attn Head Vector y_i [128]` $\to$ `Subtract component parallel to v_i` $\to$ `Decorrelated z_i [128]`.
- **Intuitive Meaning**: Eliminates value-copying shortcut bias, forcing heads to learn novel relational abstractions.

---

## Step 11: Attention Head Gate
- **Category**: Attention Branch
- **Formula**:
  $$g_h = 2 \cdot \sigma\left(x \cdot W_{\text{gate}}^{(h)}\right), \quad \text{attn\_out}_h = g_h \cdot z_h$$
- **Dataflow**: `Input [6144]` $\to$ `W_gate [6144, 48]` $\to$ `Sigmoid * 2 [48]` $\to$ `Gated Head Output`.
- **Intuitive Meaning**: Conditioned on the residual stream, dynamically amplifies or silences specific attention heads.

---

## Step 12: Attention Output Projection & Residual Highway
- **Category**: Attention Branch
- **Formula**:
  $$x_{\text{mid}} = x + \text{Concat}(\text{attn\_out}_1, \dots, \text{attn\_out}_{48}) \cdot W_O$$
- **Dataflow**: `[1, 4096, 6144]` $\to$ `W_O [6144, 6144]` $\to$ `Add Residual Highway` $\to$ `[1, 4096, 6144]`.

---

## Step 13: Pre-MoE GatedNorm
- **Category**: MoE Branch
- **Formula**:
  $$x_{\text{moe\_in}} = \text{GatedNorm}_{\text{moe}}(\text{RMSNorm}(x_{\text{mid}}))$$
- **Dataflow**: `[1, 4096, 6144]` $\to$ `RMSNorm + GN (Rank-128)` $\to$ `[1, 4096, 6144]`.

---

## Step 14: Quantile-Balancing Router (Top-8 of 384)
- **Category**: MoE Branch
- **Formula**:
  $$s = x_{\text{moe\_in}} \cdot W_{\text{router}}, \quad \mathcal{E} = \text{Top-8}(s + b), \quad w = \text{Softmax}(s_{\mathcal{E}})$$
- **Dataflow**: `[1, 4096, 6144]` $\to$ `W_router [6144, 384]` $\to$ `Top-8 Selection & Weights`.
- **Intuitive Meaning**: Load-balanced routing without auxiliary loss degradation.

---

## Step 15: Latent Token Down-Projection ($6144 \to 3072$)
- **Category**: MoE Branch
- **Formula**:
  $$x_{\text{latent}} = \text{RMSNorm}\left(x_{\text{moe\_in}} \cdot W_{\text{down}}\right), \quad W_{\text{down}} \in \mathbb{R}^{6144 \times 3072}$$
- **Dataflow**: `[1, 4096, 6144]` $\to$ `W_down [6144, 3072]` $\to$ `Latent RMSNorm` $\to$ `[1, 4096, 3072]`.
- **Hardware Impact**: **Cuts cross-GPU all-to-all network traffic by 50%**, vital for cluster efficiency across 11 racks.

---

## Step 16: Top-8 Half-Width Expert Computation
- **Category**: MoE Branch
- **Formula**:
  $$\text{Expert}_k(x_{\text{latent}}) = \left(\text{Swish}(x_{\text{latent}} W_{\text{gate}}^{(k)}) \odot x_{\text{latent}} W_{\text{up}}^{(k)}\right) W_{\text{down}}^{(k)}$$
- **Dataflow**: `[1, S, 3072]` $\to$ `SwiGLU (intermediate width 3072)` $\to$ `[1, S, 3072]`.

---

## Step 17: Concurrent Shared Experts (Width 3072 × 2)
- **Category**: MoE Branch
- **Formula**:
  $$e_{\text{shared}} = \text{SharedExpert}_1(x_{\text{moe\_in}}) + \text{SharedExpert}_2(x_{\text{moe\_in}})$$
- **Dataflow**: `[1, 4096, 6144]` $\to$ `2 SwiGLU Shared Experts` $\to$ `[1, 4096, 6144]`.
- **Intuitive Meaning**: Always-on shared capacity capturing common linguistic primitives.

---

## Step 18: Latent Up-Projection & MoE Residual Fusion
- **Category**: MoE Branch
- **Formula**:
  $$x_{\text{next}} = x_{\text{mid}} + \left(\sum_{k \in \mathcal{E}} w_k \cdot \text{Expert}_k(x_{\text{latent}})\right) W_{\text{up}} + e_{\text{shared}}$$
- **Dataflow**: `Routed Experts [1, S, 3072]` $\to$ `W_up [3072, 6144]` $+$ `Shared [6144]` $+$ `Residual [6144]` $\to$ `[1, 4096, 6144]`.

---

## Step 19: Untied LM Output Head
- **Category**: Output
- **Formula**:
  $$\text{logits} = \text{GatedNorm}_{\text{final}}(\text{RMSNorm}(x)) \cdot W_{\text{out}}, \quad W_{\text{out}} \in \mathbb{R}^{6144 \times 128256}$$
- **Dataflow**: `[1, 4096, 6144]` $\to$ `W_out [6144, 128256]` $\to$ `Logits [1, 4096, 128256]`.
