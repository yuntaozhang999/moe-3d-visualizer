# User Interaction & Navigation Guide

This guide details all interactive features available in the Marin 535B visualizer.

---

## 1. Click-to-Isolate / Solo Layer Mode

When exploring deep transformer models, isolating an individual layer is crucial to inspect internal matrix states without visual clutter from 47 other layers.

### How to Isolate a Layer
- **In 4-Layer Cycle View (`quad_cycle`)**: Hover over any of the 4 layer cards. The card highlights, and a `🔍 Focus & Isolate Layer` 3D button appears. Clicking either the card or the button immediately hides all other layers and focuses on that layer.
- **In 48-Layer Tower View (`macro_stack`)**: Click any of the 48 layer slabs in the 3D tower.
- **In Left Sidebar (`LayerSidebar`)**: Click any layer in the 48-item list.
- **Keyboard Shortcuts**: Press `↑` / `↓` while in isolation mode to step to the previous or next layer while remaining in isolated view.

### Exiting Isolation Mode
When a layer is isolated, a floating status bar appears at the top center of the viewport:
- Click `[Show 4-Layer Cycle]` to return to the 4-layer repeating pipeline view.
- Click `[Show 48 Layers]` to return to the macro perspective view.
- Click `Exit Focus` in the left sidebar.

---

## 2. 3D View Modes Switcher (Top Right)
Located in the upper right corner of the screen:
- **`4-Layer Cycle`**: Visualizes the repeating fundamental unit (3 Local Sliding Window layers + 1 Global Full Causal layer). Includes a Cycle Group dropdown (`Group 1 (L0–L3)` through `Group 12 (L44–L47)`).
- **`Single Block (L#)`**: Focuses exclusively on the micro architecture of the selected layer.
- **`48-Layer Tower`**: Displays all 48 layers laid out in 3D perspective.
- **`Layer Specs`**: Opens the comprehensive modal containing architectural parameter tables for all 48 layers.

---

## 3. Step-by-Step Forward Pass Playback (Bottom Bar & Top Narrator)
- **Controls**:
  - `Prev Step` (`←` key) and `Next Step` (`→` key).
  - `Play / Pause` (`Spacebar`).
  - Speed adjustment: `0.5x`, `1x`, `2x`.
  - Timeline Scrubber: Jump directly to any of the 19 forward steps.
- **Auto-Follow Mode**: When enabled, the 3D camera smoothly flies to and frames the active tensor or operator for the current step.

---

## 4. Camera Controls & Presets Bar
Located at the bottom right corner:
- **`Overview`**: Global isometric framing of the layer.
- **`Attention`**: Zooms directly into the Q, K, V, XSA, and Attention matrix.
- **`LatentMoE`**: Zooms directly into the Router, Latent Down-Projection, 384 Experts pool, and Shared Experts.
- **`Top-Down`**: Orthographic top-down plan view.
- **Mouse Orbit & Zoom**: Left-click drag to rotate; Right-click drag or middle-click drag to pan; Wheel to zoom.
- *Note*: Mouse interaction immediately disengages auto-camera interpolation so you retain complete control over 3D navigation.

---

## 5. Cell-Level Value Inspection (HUD)
- Hover your mouse over any 3D tensor block (e.g. $Q$, $K$, $V$, Attention Heatmap, Latent Embeddings).
- A floating HUD in the bottom left corner displays:
  - Tensor Name and ID
  - Cell Coordinates: Row (Token index) and Column (Channel/Head index)
  - Floating Point Value (e.g. `+0.4281`)
  - Normalized Magnitude Bar

---

## 6. Intuitive Equation & Variable Explorer
- Every forward step displays its exact KaTeX equation, plain-English intuitive explanation, and visual dataflow pipeline.
- Hover or click any variable chip ($x, W_Q, K, V, W_{\text{down}}, \text{Top-8}$, etc.) in the equation box to inspect:
  - Human-readable name
  - Mathematical shape
  - Hardware storage location (GPU SRAM, HBM, InfiniBand).
- Toggle between formatted KaTeX rendering and raw LaTeX code with one click.
- One-click copy LaTeX equation to clipboard.
