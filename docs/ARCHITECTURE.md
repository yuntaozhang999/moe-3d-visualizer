# Visualizer Web Application Architecture

## 1. Technical Stack
- **Framework**: React 18 + TypeScript.
- **3D Graphics**: Three.js + `@react-three/fiber` (R3F) + `@react-three/drei`.
- **Styling**: Tailwind CSS 4 + Lucide React.
- **Math Engine**: KaTeX 0.16.x (`katex` + `@types/katex`).
- **Build Tool**: Vite 8.2.2.

---

## 2. Directory Structure & Key Modules

```
visualizer/
├── index.html                     # Main entry HTML
├── package.json                   # Dependencies (three, r3f, katex, tailwind)
├── vite.config.ts                 # Vite bundler configuration
├── docs/                          # Comprehensive architectural & math docs
│   ├── ARCHITECTURE.md            # Visualizer technical implementation guide
│   ├── MARIN_535B_SPEC.md         # Marin 535B model specifications
│   ├── MATHEMATICAL_FORMULATIONS.md # Complete math & dataflow guide
│   └── INTERACTIVE_GUIDE.md       # Interactive controls & UI documentation
├── src/
│   ├── App.tsx                    # Top-level state coordinator
│   ├── main.tsx                   # React root mount
│   ├── types/
│   │   └── model.ts               # Core TypeScript definitions (Layer, Step, ViewMode)
│   ├── data/
│   │   ├── modelConfig.ts         # Marin 535B hyperparameters & layer generators
│   │   ├── stepDefinitions.ts     # 19 token forward pass steps with camera frames
│   │   ├── equationData.ts        # Structured KaTeX math, variables, and dataflow
│   │   └── tokenSimulation.ts     # Synthetic activation & routing generator
│   ├── components/
│   │   ├── ThreeScene/            # 3D Scene rendered inside R3F Canvas
│   │   │   ├── SceneContainer.tsx # 3D Canvas, lighting, and view router
│   │   │   ├── QuadCycleView.tsx  # 4-Layer repeating cycle (3 Local + 1 Global)
│   │   │   ├── MicroBlockView.tsx # Deep single-layer block inspection
│   │   │   ├── MacroTowerView.tsx # All 48 layers in perspective
│   │   │   ├── TensorMatrix.tsx   # Dynamic 3D tensor grid with CanvasTexture
│   │   │   ├── OperatorNode.tsx   # 3D spherical operator node with glowing rings
│   │   │   ├── FlowConnections.tsx# Curving 3D tube lines linking tensors
│   │   │   └── CameraRig.tsx      # Smooth camera interpolation with user orbit priority
│   │   └── UI/                    # 2D Glassmorphic HUD Overlays
│   │       ├── Header.tsx         # Top title bar with parameter badges
│   │       ├── SamplingHUD.tsx    # Live next-token sampling & generation panel
│   │       ├── IntuitiveEquation.tsx # KaTeX math + dataflow + variable explorer
│   │       ├── WalkthroughNarrator.tsx # Top step-by-step narration bar
│   │       ├── InspectorModal.tsx # Right deep-dive formula & code inspector
│   │       ├── LayerSidebar.tsx   # Left 48-layer panorama navigation
│   │       ├── LayerDetailModal.tsx # Full 48-layer comparative parameter table
│   │       ├── ViewModeSwitcher.tsx # Cycle / Single / Tower mode switcher
│   │       ├── CameraPresetsBar.tsx # Quick camera presets (Isometric, Attn, MoE)
│   │       ├── CellHoverHUD.tsx   # Live cell-level coordinates & value HUD
│   │       ├── Controls.tsx       # Bottom playback & timeline scrubber
│   │       ├── TokenInputBar.tsx  # Interactive prompt editor
│   │       └── Legend.tsx         # Color coding guide
```

---

## 3. Core Subsystems

### 3.1 3D Volumetric Tensor Rendering (`TensorMatrix.tsx`)
- Tensors are represented as 3D box meshes with dynamic high-resolution `CanvasTexture`.
- Each cell in the tensor matrix displays activation intensity or weight values.
- Implements raycasting UV coordinate extraction (`onHoverCell`) to determine exact row (Token) and column (Hidden/Channel) under the cursor.

### 3.2 View Modes Router
1. **`quad_cycle` (Default)**: Visualizes the simplified 4-layer fundamental repeating block (Layer 0 Local $\to$ Layer 1 Local $\to$ Layer 2 Local $\to$ Layer 3 Global) with inter-layer flowing residual tubes.
2. **`single_block` (Solo / Focus)**: Completely hides other 47 layers to dedicate full GPU canvas space to the micro-architecture of the selected layer (QKV projections, XSA, ShortConv, Attention Gates, Latent Compression, 384 Experts, 2 Shared Experts).
3. **`macro_stack`**: Arranges all 48 layers in a 3D matrix grid to show the macro structure of the entire 535B parameter network.

### 3.3 Non-Fighting Camera Rig (`CameraRig.tsx`)
- Automates smooth interpolation (`lerp`) when advancing forward steps or switching presets.
- Attaches event listeners to `OrbitControls.onStart` to immediately yield camera ownership to user mouse/touch drags, preventing annoying snapping or camera reset fighting.

### 3.4 Intuitive Math System (`IntuitiveEquation.tsx`)
- Renders equations with KaTeX (Computer Modern font).
- Visualizes multi-stage dimension transformations (`Input [Shape] -> Op -> Weight [Shape] -> Output [Shape]`).
- Binds hoverable variable chips with shape and hardware memory location.
- Provides plain-English algorithmic motivation for every mathematical operation.
