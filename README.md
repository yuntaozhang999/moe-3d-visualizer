# MoE 3D Architecture Visualizer

[![Three.js](https://img.shields.io/badge/Three.js-r160-black?logo=three.js)](https://threejs.org/)
[![React](https://img.shields.io/badge/React-18-blue?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![KaTeX](https://img.shields.io/badge/KaTeX-Math-3298dc?logo=latex)](https://katex.org/)
[![Vite](https://img.shields.io/badge/Vite-v8-646cff?logo=vite)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Live Demo**: [https://yuntaozhang999.github.io/moe-3d-visualizer](https://yuntaozhang999.github.io/moe-3d-visualizer/)

An interactive 3D architecture visualizer for modern 500B+ Mixture-of-Experts (MoE) Large Language Models, featuring real-time autoregressive sampling, volumetric 3D tensor microscopes, and high-performance distributed communication simulations. Inspired by **Marin 535B** and contemporary MoE architectures (such as LatentMoE, GQA, XSA, and ShortConv).

Inspired by [bbycroft.net/llm](https://bbycroft.net/llm) & [Marin Community Hero Run](https://github.com/marin-community/marin/issues/8435).

---

## 🌟 Key Highlights & Core Features

### 1. 3D Macro / Micro Multi-Level Architecture View
- **Macro 48-Layer Tower & 4-Layer Cycle**: Comprehensive 3D visualization of a 48-layer Transformer tower with a unique 4-layer cycle pattern (36 local sliding-window attention layers + 12 global causal attention layers).
- **Click-to-Isolate / Solo Layer Mode**: Click any layer in the 3D scene or sidebar to isolate and inspect the target layer while hiding the remaining 47 layers. Quickly navigate between layers using `↑` and `↓` arrow keys.

### 2. LatentMoE 50% Communication Reduction & Routing
- **Latent Latency & Bandwidth Optimization**: Dynamically simulate $6144 \to 3072$ latent low-rank compression projection, cutting payload data volume by 50% prior to All-to-All cross-node/cross-accelerator dispatch, drastically reducing cluster network congestion.
- **Top-8 of 384 QB-Routing & Shared Experts**: Dynamically demonstrate token routing via QB (Query-Based) gating dispatch to the Top-8 out of 384 sparse half-width experts, seamlessly merged with dual concurrent Shared Experts.

### 3. Step 19 Dynamic Sampling & Autoregressive Decoding
- **Interactive Sampling Controls**: Integrated dynamic sampling control panel supporting real-time adjustments for Temperature, Top-p (nucleus sampling), Top-k, and Monte Carlo roulette wheels.
- **Step-by-Step Forward Pass**: Full interactive simulation across all 19 forward-pass stages from token embedding to final prediction, tracking softmax probability distributions and autoregressive token generation in real time.

### 4. 96-Dimensional Canvas Tensor Microscope
- **Volumetric Dynamic Canvas Textures**: High-fidelity tensor grids rendered using dynamic 2D canvas textures with millisecond-grade responsiveness for weight matrices and activation vectors.
- **Raycasting Cell HUD & Tensor Probe**: Raycasting inspection for individual tensor cells, displaying token sequence index (row), channel/head dimension (column), and exact floating-point scalar values in real time.

### 5. Real-Time Token Routing Distribution & Load Balancing
- **Expert Utilization Heatmap**: Real-time telemetry tracking routing frequency and distribution skew across 384 expert pools.
- **Load Balancing Verification**: Hands-on verification of auxiliary load-balancing loss and drop-less routing effectiveness in preventing expert starvation and hot-spot bottlenecks.

---

## 📚 Documentation Index

Complete architectural designs, mathematical formulations, and user guides are cataloged in [`docs/`](./docs):

- [**`docs/MARIN_535B_SPEC.md`**](./docs/MARIN_535B_SPEC.md): Comprehensive 535B MoE technical specification (GatedNorm, GQA, ShortConv, XSA, Attention Head Gate, LatentMoE 384 experts, 2 shared experts, Untied LM Head).
- [**`docs/MATHEMATICAL_FORMULATIONS.md`**](./docs/MATHEMATICAL_FORMULATIONS.md): Detailed mathematical formulations across 19 forward-pass steps, tensor shape transformations, dataflow pathways, and hardware memory residency (SRAM / HBM / All-to-All network).
- [**`docs/ARCHITECTURE.md`**](./docs/ARCHITECTURE.md): Visualizer frontend technology stack implementation (Three.js / React Three Fiber, KaTeX mathematical typesetting engine, camera tween interpolation, and component topology).
- [**`docs/INTERACTIVE_GUIDE.md`**](./docs/INTERACTIVE_GUIDE.md): Interactive operation guide, keyboard & mouse navigation conventions, isolated solo layer mode, cell HUD probes, and camera view presets.

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- npm, pnpm, or yarn

### 1. Clone Repository & Install Dependencies
```bash
git clone https://github.com/yuntaozhang999/moe-3d-visualizer.git
cd moe-3d-visualizer
npm install
```

### 2. Start Local Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser to explore the visualizer.

### 3. Production Build & Preview
```bash
npm run build
npm run preview
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Description |
| :--- | :--- |
| `Space` | Play / Pause forward-pass step animation |
| `→` (Right Arrow) | Step Forward (Next Step) |
| `←` (Left Arrow) | Step Backward (Previous Step) |
| `↑` (Up Arrow) | Switch to Previous Transformer Layer (keeps solo focus) |
| `↓` (Down Arrow) | Switch to Next Transformer Layer (keeps solo focus) |
| `R` | Reset Camera to Default Overview Angle |
| `M` | Toggle Formulas & Step Walkthrough Card |
| `S` | Toggle Dynamic Sampling & Roulette HUD |
| `Escape` | Close active dialogs, floating panels, and cell HUD overlays |

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).

Copyright (c) 2026 Yuntao Zhang.
