# User Interaction & Navigation Guide

This guide details all interactive features available in the Marin 535B visualizer.

---

## 1. Click-to-Isolate / Solo Layer Mode

When exploring deep transformer models, isolating an individual layer is crucial to inspect internal matrix states without visual clutter from 47 other layers.

### How to Isolate a Layer
- **In 4-Layer Cycle View (`quad_cycle`)**: Hover over any of the 4 layer cards. The card highlights, and a `🔍 Focus & Isolate Layer` 3D button appears. Clicking either the card or the button immediately hides all other layers and focuses on that layer.
- **In 48-Layer Tower View (`macro_stack`)**: Click any of the 48 layer slabs in the 3D tower.
- **Top-Right Stepper & Keyboard Shortcuts**: In `Single Block` mode, step seamlessly between layers L0–L47 using the top-right `◀` / `▶` buttons or the `↑` / `↓` arrow keys on your keyboard.

### Exiting Isolation Mode
To exit single block mode and view broader architectural contexts:
- Click **`4-Layer Cycle`** in the top-right switcher to return to the 4-layer repeating pipeline view.
- Click **`48-Layer Tower`** to return to the full 48-layer 3D macro perspective view.

---

## 2. 3D View Modes Switcher (Top Right)
Located in the upper right corner of the screen:
- **`4-Layer Cycle`**: Visualizes the repeating fundamental unit (3 Local Sliding Window layers + 1 Global Full Causal layer). Includes a Cycle Group dropdown (`Group 1 (L0–L3)` through `Group 12 (L44–L47)`).
- **`Single Block (L#)`**: Focuses exclusively on the micro architecture of the selected layer. When active, an adjacent compact layer navigator (`◀ L{idx} [Global Causal | Local 2048w] ▶`) provides instant, boundary-guarded stepping between layers.
- **`48-Layer Tower`**: Displays all 48 layers laid out in 3D perspective.
- **`Layer Specs`**: Opens the comprehensive modal containing architectural parameter tables for all 48 layers.

---

## 3. Step-by-Step Forward Pass Playback (Bottom Bar & Walkthrough)
- **Playback Controls**:
  - `Prev Step` (`←` key) and `Next Step` (`→` key).
  - `Play / Pause` (`Spacebar`) at a steady, readable 2.4s cadence.
  - `Reset` to return to Step 1 (Input Tokens & Latent Embedding).
  - Interactive scrub slider: Jump directly to any of the 19 forward steps.
- **Drawer & HUD Triggers**:
  - `Walkthrough` (`M` key): Toggles the detailed bbycroft-style walkthrough card with intuitive KaTeX equations and tensor dataflow. When collapsed, it remains hidden to maximize 3D viewport immersion.
  - `Formulas`: Toggles the mathematical formula inspector and variable shape inspector.
  - `Sampling` (`S` key): Step 19 dynamic temperature, top-k/top-p, and Monte Carlo roulette sampling simulator.

---

## 4. Unified Camera Controls & Presets Bar
Located at the bottom right corner:
- **`Reset View [R]`**: Smoothly animates the camera back to the optimal 45° isometric overview angle.
- **`Top Down`**: Switches to a 90° orthographic plan floorplan view.
- **`Focus Attn` / `Focus MoE`**: In `Single Block` mode, zooms directly into either the Attention branch or the LatentMoE branch.
- **`Follow On` / `Free Cam`**: Toggles camera auto-tracking. When enabled, the camera smoothly tracks the active step tensor. Dragging or zooming freely transitions to Free Cam mode.
- **Smart HUD Avoidance**: When the Step 19 Sampling HUD is open, the camera bar automatically lifts upwards to avoid any overlap or occlusion.

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
