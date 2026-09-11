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
