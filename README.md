# MoE 3D Architecture Visualizer

[![Three.js](https://img.shields.io/badge/Three.js-r160-black?logo=three.js)](https://threejs.org/)
[![React](https://img.shields.io/badge/React-18-blue?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![KaTeX](https://img.shields.io/badge/KaTeX-Math-3298dc?logo=latex)](https://katex.org/)
[![Vite](https://img.shields.io/badge/Vite-v8-646cff?logo=vite)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Live Demo**: [https://yuntaozhang999.github.io/moe-3d-visualizer](https://yuntaozhang999.github.io/moe-3d-visualizer/)

An interactive 3D architecture visualizer for 500B+ Mixture-of-Experts (MoE) Large Language Models, featuring real-time autoregressive sampling, 3D tensor microscopes, and high-performance communication simulation.

现代超大规模（500B+ 参数级别）混合专家大模型（Mixture-of-Experts, MoE）的交互式 3D 架构与分布式通信可视化器。受到 **Marin 535B** 及现代前沿 MoE（如 LatentMoE、GQA、XSA、ShortConv）启发打造的独立探索项目。

Inspired by [bbycroft.net/llm](https://bbycroft.net/llm) & [Marin Community Hero Run](https://github.com/marin-community/marin/issues/8435).

---

## 🌟 Key Highlights & Core Features (核心特性)

### 1. 3D Macro / Micro Multi-Level Architecture View (3D 宏观与微观分层架构视图)
- **Macro 48-Layer Tower & 4-Layer Cycle**: 3D 全景展现 48 层 Transformer 巨塔以及独特的 4 层周期结构（36 个局部滑动窗口注意力层 + 12 个全局全注意力层）。
- **Click-to-Isolate / Solo Layer Mode**: 支持点击 3D 场景中任意一层或侧边栏，一键“隔离并单显 (Solo Focus)”目标层，隐藏其余 47 层，搭配快捷键 `↑` / `↓` 极速逐层穿梭诊断。

### 2. LatentMoE 50% Communication Reduction & Routing (LatentMoE 50% 通信减免与路由模拟)
- **Latent Latency & Bandwidth Optimization**: 动态模拟 $6144 \to 3072$ 隐空间低秩压缩投影，在触发 All-to-All 跨节点跨卡通信前缩减 50% 数据体量，大幅降低集群网络拥塞。
- **Top-8 of 384 QB-Routing & Shared Experts**: 动态呈现输入 Token 如何经由 QB 门控路由器精确分派至 384 个稀疏半宽专家中的 Top-8，并与 2 个全局共享专家 (Shared Experts) 的计算分支实现无缝合并。

### 3. Step 19 Dynamic Sampling & Autoregressive Decoding (Step 19 动态采样与自回归解码生成控制)
- **Interactive Sampling Controls**: 集成动态采样控制面板，支持实时调节 Temperature（温度）、Top-P（核采样）与 Top-K。
- **Step-by-Step Forward Pass**: 完整模拟自嵌入层到最终预测的全部 19 个前向传播阶段，观察 Softmax 概率分布与预测 Token 的实时自回归采样演化。

### 4. 96-Dimensional Canvas Tensor Microscope (96 维微观 Canvas 显微镜)
- **Volumetric Dynamic Canvas Textures**: 张量网格基于动态 Canvas 纹理生成，以毫秒级响应呈现权重矩阵与激活向量。
- **Raycasting Cell HUD & Tensor Probe**: 支持光线投射 (Raycasting) 拾取任意网格单元，实时悬浮显示 Token 索引（行）、通道/注意力头（列）及真实浮点数值，洞悉数值微观变化。

### 5. Real-time Token Routing Distribution & Load Balancing (实时 Token 路由分布与专家负载均衡监控)
- **Expert Utilization Heatmap**: 实时统计 Token 在 384 个专家池之间的路由热度与分布倾斜情况。
- **Load Balancing Verification**: 直观验证辅助负载均衡损失 (Auxiliary Loss) 与无路由丢弃机制对消除热点专家的实际效果。

---

## 📚 Documentation Index (深入技术文档)

完整架构设计、数学推导与操作指南均已归档于 [`docs/`](./docs)：

- [**`docs/MARIN_535B_SPEC.md`**](./docs/MARIN_535B_SPEC.md): 535B MoE 核心规格全景（GatedNorm, GQA, ShortConv, XSA, Attention Head Gate, LatentMoE 384 专家, 2 共享专家, Untied LM Head）。
- [**`docs/MATHEMATICAL_FORMULATIONS.md`**](./docs/MATHEMATICAL_FORMULATIONS.md): 前向传播 19 个 Step 的数学公式、张量 Shape 变换、数据流与硬件内存驻留（SRAM / HBM / All-to-All 网络）。
- [**`docs/ARCHITECTURE.md`**](./docs/ARCHITECTURE.md): 可视化器前端技术栈实现（Three.js / React Three Fiber, KaTeX 数学渲染引擎, 相机补间插值与组件拓扑）。
- [**`docs/INTERACTIVE_GUIDE.md`**](./docs/INTERACTIVE_GUIDE.md): 完整交互指南、键鼠操控规范、单层隔离模式、单元格 HUD 与预设相机视角。

---

## 🚀 Quick Start (快速开始)

### Prerequisites (环境依赖)
- [Node.js](https://nodejs.org/) (v18.0.0 或更高版本)
- npm, pnpm 或 yarn

### 1. 本地克隆与安装依赖
```bash
git clone https://github.com/yuntaozhang999/moe-3d-visualizer.git
cd moe-3d-visualizer
npm install
```

### 2. 启动本地开发服务
```bash
npm run dev
```
启动后在浏览器中打开 `http://localhost:3000` 即可体验。

### 3. 生产构建与预览
```bash
npm run build
npm run preview
```

---

## ⌨️ Keyboard Shortcuts (快捷键)

| 按键 | 功能说明 |
| :--- | :--- |
| `Space` | 播放 / 暂停前向传播步骤动画 |
| `→` (Right Arrow) | 前进一步 (Next Step) |
| `←` (Left Arrow) | 后退一步 (Previous Step) |
| `↑` (Up Arrow) | 切换至上一 Transformer 层 (保持 Solo 聚焦) |
| `↓` (Down Arrow) | 切换至下一 Transformer 层 (保持 Solo 聚焦) |
| `Escape` | 关闭当前弹窗、浮层与变量 HUD 提示 |

---

## 📄 License (开源协议)

本项目采用 [MIT License](./LICENSE) 开源。

Copyright (c) 2026 Yuntao Zhang.
