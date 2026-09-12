# Layer Semantics Verification & Architecture Fixes

## 1. Problem Statement: Misleading Token Lookup in Intermediate Layers

Prior to this refactor, all 48 Transformer layers in the visualizer displayed the full **Stage 1 (Token Embedding)** and **Stage 4 (LM Head)** components. For intermediate layers (e.g., Layer 6), displaying the token ID lookup (`W_embed`) and vocabulary logits (`W_out`) was architecturally incorrect and severely misleading. In a standard deep Transformer architecture, token embeddings only occur at layer 0, and the LM head projection only occurs after the final layer. All intermediate layers exclusively read from and write to the **Residual Stream**.

## 2. Solution: Dynamic Residual Stream Routing (Plan A)

We implemented "Plan A", resolving this discrepancy by introducing conditional rendering and dynamic steps driven by the current layer index:

*   **First Layer (L0):** Retains the standard Token Input, Untied Embedding (`W_embed`), and Initial GatedNorm representations.
*   **Intermediate Layers (L1 - L46):** Hides the token structures. Replaces the input with a dynamic **`Input from Layer N-1 (Residual Stream [S × 6144])`** node, flowing directly into the Pre-Attn GatedNorm. Hides the LM Head, routing the MoE output to a **`Output to Layer N+1 (Residual Stream [S × 6144])`** node.
*   **Final Layer (L47):** Retains the Untied LM Head and Output Logit projections.

## 3. Visual Before & After Comparison

### Before
*   ![Before: Layer 6 Misleading Lookup](./screenshots/before_layer6_misleading_lookup.png)
*   ![Before: Full Architecture](./screenshots/before_full_architecture.png)

### After
*   ![After: Layer 6 Residual Stream](./screenshots/after_layer6_residual_stream.png)
*   ![After: Layer 0 Token Embedding](./screenshots/after_layer0_token_embedding.png)

## 4. Technical Implementation Details

1.  **3D Component Rendering (`MicroBlockView.tsx`):**
    *   Dynamic floor text generation based on `isFirstLayer` and `isLastLayer`.
    *   Conditional masking of `node_tokens`, `node_w_embed`, `node_lm_head`, etc.
    *   Precise alignment of `FlowConnection` coordinates to eliminate clipping and floating gaps (e.g., `op_moe_add` to `node_residual_out` strictly bound to `x=35.55`).
    *   Removal of magic numbers by inferring `isLastLayer` via a generalized `totalLayers` prop.
2.  **State Management (`App.tsx` & `SceneContainer.tsx`):**
    *   `dynamicSteps` logic dynamically overrides Step 1~3 and Step 18~19 titles, descriptions, and `activeNodeIds`.
    *   Smooth camera focus rerouting for bypassed stages to prevent out-of-bounds rendering or crashing the UI.
3.  **Data Definitions (`equationData.ts`):**
    *   Integrated definitions for `node_residual_in` and `node_residual_out` metadata cards with LaTeX formulas ($x^{(l)} = x^{(l-1)} + \text{Attn}(x) + \text{MoE}(x)$) to maintain tooltip integrity during 3D inspections.

## 5. Embed Vector Centralization (Layer 0 Alignment)

In Layer 0, the `Embed Vector` (`node_embed`) and its adjacent flow connections were originally offset at $z=0.8$, causing the primary data pipeline (`Prompt Tokens` -> `Embed Vector` -> `Embed GatedNorm`) to appear bent and disjointed.

To resolve this, the node position and associated coordinate links were moved to the central axis ($z=0$):
- `node_embed` centered from $z=0.8$ to $z=0$.
- `Lookup` and `Embed Vector -> Embed GatedNorm` flow connections realigned to $z=0$.
- `W_embed Weight Flow` connection realigned seamlessly to $z=-0.35$ to avoid clipping into the centered vector.

### Visual Comparison
*   ![Before: Embed Vector Offset](./screenshots/before_embed_vector_offset.png)
*   ![After: Embed Vector Centered](./screenshots/after_embed_vector_centered.png)

## 6. Prompt Tokens UV Artifact Elimination & Text Labeling

Previously, the `Prompt Tokens` box geometry exhibited misleading stretch artifacts (stripes) on its top face (+Y) because the 6-row front canvas texture was mapped uniformly across the entire cube. To viewers, this incorrectly suggested a 3D depth slice. Additionally, the front faces were solid color blocks devoid of lexical meaning.

We resolved this by:
- Employing a **Multi-Material array** for the `BoxGeometry` `[side, side, side, side, front, front]`. The top, bottom, and side faces now use a pristine, dark solid material, entirely eliminating the UV stretching artifacts.
- Dynamically rendering the actual token strings (e.g., "The", "marin", "535b", "moe", "hero", "run") directly onto the front-facing canvas grid with high-contrast drop shadows, providing immediate lexical context.

### Visual Comparison
*   ![Before: Token UV Artifacts](./screenshots/before_token_uv_artifact.png)
*   ![After: Token Text Close-up](./screenshots/after_token_closeup.png)

## 7. Stage 1 Embedding Gather Convergence Topology & Pre-training Semantics

The previous Stage 1 visualization depicted an ambiguous data pipeline: `Prompt Tokens` were connected directly to `Embed Vector` through an opaque `Lookup` label, while `W_embed` hovered in the background with an oblique connection. This obscured how index gathering actually functions and created conceptual confusion.

To strictly align with the ground truth architecture in `marin-main` (`experiments/grug/moe/model.py` and `lib/levanter/.../snowball.py`), we reconstructed Stage 1 into a canonical dual-input gather convergence topology:

1. **Dual-Input Convergence Topology**:
   - **Indices Input (`token_ids`)**: At `[-16.5, 2.0, 0]`, representing discrete sequence IDs $t \in \{0, \dots, 128255\}^S$. Connects horizontally via the `indices` flow pipeline into the gather operator.
   - **Weight Table (`token_embed`)**: At `[-14.0, 2.0, -2.4]`, representing the untied embedding weight table of shape $[128256, 6144]$. Connects perpendicularly along the Z-axis via the `table` flow pipeline into the gather operator.
   - **Core Operator (`op_embed_gather`)**: Centered at `[-14.0, 2.0, 0]`, an explicit operator node labeled `_embedding_gather` executing $\text{hidden} = \text{Gather}(\text{token\_embed}, \text{token\_ids})$.
   - **Output Tensor (`hidden`)**: Centered at `[-11.5, 2.0, 0]`, receiving the gathered dense representations ($[S \times 6144]$) before flowing into `Embed GatedNorm`.

2. **Pre-training Attribution & Parameter Sizing**:
   - The embedding table comprises $128,256 \times 6,144 = 787,998,720$ parameters (~788M params).
   - In contrast to the static, rule-based BPE tokenizer vocabulary, these 788M continuous parameters are **randomly initialized and trained end-to-end via gradient backpropagation across 18 Trillion tokens during pre-training**.
   - The UI sublabel explicitly displays `[128k × 6144] · Pre-trained Weights (788M)` and is synchronized across `InspectorModal`, `equationData`, and the `Narrator`.

### Visual Comparison
*   ![Before: Misleading Embedding Lookup Pipeline](./screenshots/before_gather_topology.png)
*   ![After: True Gather Convergence Operator Topology](./screenshots/after_gather_topology.png)

## 8. Residual Skip Bridge Anchoring & Pre-Norm Mathematical Rectification

In standard Pre-Norm Transformers ($x \leftarrow x + \text{Attention}(\text{Norm}(x))$ and $x \leftarrow x + \text{MoE}(\text{Norm}(x))$), the identity residual skip path must carry the **un-normalized primary backbone signal**. 

Previously, both residual skip arches in `MicroBlockView.tsx` were incorrectly anchored:
- `Residual Skip 1` was anchored to `Pre-Attn GatedNorm` ($x = -6.8$), implying normalized activation was passed down the skip connection.
- `MoE Residual Skip` was anchored to `Pre-MoE GatedNorm` ($x = 16.1$), violating the post-attention un-normalized identity invariant.

### Rectifications Implemented:
1. **Attention Residual Skip (`Residual Skip 1`)**:
   - In Layer 0 (`isFirstLayer`): Re-anchored to takeoff directly from the output of `Embed GatedNorm` (`op_embed_gn`, $x = -8.8$).
   - In Layers 1-47 (`!isFirstLayer`): Re-anchored to takeoff directly from `node_residual_in` ($x = -9.85$).
   - Coordinates: `from={[isFirstLayer ? -8.8 : -9.85, 2.45, 0]}`.
   - Highlighting bounds: `[isFirstLayer ? 'op_embed_gn' : 'node_residual_in', 'op_attn_add']`.
2. **MoE Residual Skip (`MoE Residual Skip`)**:
   - Re-anchored to takeoff from the Attention aggregation adder `op_attn_add` ($x = 13.5$), carrying the accumulated post-attention backbone stream.
   - Coordinates: `from={[13.5, 2.45, 0]}` to `[35.0, 2.45, 0]`.
   - Highlighting bounds: `['op_attn_add', 'op_moe_add']`.

### Visual Comparison
*   ![Before: Residual Skip Erroneously Anchored to Pre-Attn Norm](./screenshots/before_residual_skip.png)
*   ![After: Residual Skip Correctly Anchored to Embed GatedNorm](./screenshots/after_residual_skip.png)

## 9. Pre-Attn GatedNorm Depth Offset & Residual Backbone Decoupling

Previously, `Pre-Attn GatedNorm` (`op_attn_gn`) was positioned at `[-6.8, 2.0, 0]` directly along the primary central axis ($Z=0$). In both perspective and top-down views, the main residual highway bridge (`Residual Skip 1 [6144]`) directly superimposed over the node, obscuring visual hierarchy and falsely suggesting the residual stream flowed into or through the pre-attention normalizer.

To decouple the primary backbone highway from the attention side-branch, we shifted `op_attn_gn` deeper along the Z-axis:

1. **Spatial Depth Offset**:
   - `op_attn_gn` shifted from $Z=0$ to $Z=-2.0$ (`position={[-6.8, 2.0, -2.0]}`).
   - Centered $Z=0$ is now exclusively reserved for the primary residual stream and its overhead skip connection.

2. **Branching Off Dataflow Alignment**:
   - **Layer 0 (`isFirstLayer`)**: Signal diverges from `op_embed_gn` (`[-8.25, 2.0, 0]`) and branches off diagonally into `op_attn_gn` (`[-7.35, 2.0, -2.0]`), labeled `Pre-Attn Stream`.
   - **Layers 1-47 (`!isFirstLayer`)**: Signal diverges from `node_residual_in` (`[-9.85, 2.0, 0]`) into `[-7.35, 2.0, -2.0]`.

3. **Coplanar Projection Alignment with QKV**:
   - Downstream connections to `node_q` ($Z=-2.0$) and `node_k` ($Z=-2.0$) now travel strictly coplanar in the $Z=-2.0$ 2D slice, providing pristine geometric cleanliness.

4. **Camera Tracking Calibration**:
   - In `stepDefinitions.ts`, Step 4 camera focus updated to `[-6.8, 2.0, -2.0]` and position to `[-6.8, 5.0, 6.0]`.

### Visual Comparison
*   ![Before: Pre-Attn GatedNorm on Residual Backbone (Perspective)](./screenshots/before_preattn_offset_perspective.png)
*   ![After: Pre-Attn GatedNorm Offset to Z=-2.0 (Perspective)](./screenshots/after_preattn_offset_perspective.png)
*   ![Before: Pre-Attn GatedNorm on Residual Backbone (Top Down)](./screenshots/before_preattn_offset_topdown.png)
*   ![After: Pre-Attn GatedNorm Offset to Z=-2.0 (Top Down)](./screenshots/after_preattn_offset_topdown.png)



