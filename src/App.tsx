import React, { useState, useEffect, useMemo, useCallback } from 'react';
import 'katex/dist/katex.min.css';
import { Header } from './components/UI/Header';
import { Controls } from './components/UI/Controls';
import { InspectorModal } from './components/UI/InspectorModal';
import { TokenInputBar } from './components/UI/TokenInputBar';
import { Legend } from './components/UI/Legend';
import { ViewModeSwitcher } from './components/UI/ViewModeSwitcher';
import { LayerDetailModal } from './components/UI/LayerDetailModal';
import { WalkthroughNarrator } from './components/UI/WalkthroughNarrator';
import { CellHoverHUD, HoveredCellInfo } from './components/UI/CellHoverHUD';
import { CameraPresetsBar } from './components/UI/CameraPresetsBar';
import { SceneContainer } from './components/ThreeScene/SceneContainer';
import {
  MARIN_535B_CONFIG,
  DEFAULT_TOY_TOKENS,
  generateLayersMetadata,
  generateLayerGroups
} from './data/modelConfig';
import { FORWARD_STEPS } from './data/stepDefinitions';
import { simulateActivations, TokenCandidate } from './data/tokenSimulation';
import { ViewMode } from './types/model';
import { SamplingHUD } from './components/UI/SamplingHUD';

// Default single_block overview camera: framed to fit the full forward-pass strip
// spanning roughly x ∈ [-18, 44], so nothing is clipped at the viewport edges.
const SINGLE_BLOCK_CAMERA: { pos: [number, number, number]; focus: [number, number, number] } = {
  pos: [12.5, 22.0, 70.0],
  focus: [12.5, 4.0, 0],
};

export function App() {
  const layers = useMemo(() => generateLayersMetadata(), []);
  const layerGroups = useMemo(() => generateLayerGroups(), []);

  // View mode: default to 'single_block' (the comprehensive isolated layer architecture)
  const [viewMode, setViewMode] = useState<ViewMode>('single_block');
  const [vfxMode, setVfxMode] = useState<'crisp' | 'fog' | 'bokeh'>('crisp');
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [selectedLayerIndex, setSelectedLayerIndex] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const param = new URLSearchParams(window.location.search).get('layer');
      if (param !== null) {
        const val = parseInt(param, 10);
        if (!isNaN(val)) return val;
      }
    }
    return 0;
  });

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoFollow, setAutoFollow] = useState(false);
  const [tokens, setTokens] = useState<string[]>(DEFAULT_TOY_TOKENS);
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [isInspectorCollapsed, setIsInspectorCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('marin_inspector_collapsed');
    return saved !== null ? saved === 'true' : true;
  });
  const [showLayerSpecsModal, setShowLayerSpecsModal] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<HoveredCellInfo | null>(null);
  const [isNarratorCollapsed, setIsNarratorCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('marin_narrator_collapsed');
    return saved !== null ? saved === 'true' : false;
  });

  // Step 19 Dynamic Sampling HUD state
  const [isSamplingHUDOpen, setIsSamplingHUDOpen] = useState(false);
  const [sampledToken, setSampledToken] = useState<TokenCandidate | null>(null);
  const hasAutoOpenedStep19 = React.useRef(false);

  // Camera mode: perspective (default 3D) or orthographic (2.5D)
  const [cameraMode, setCameraMode] = useState<'perspective' | 'orthographic'>('perspective');
  const toggleCameraMode = () => setCameraMode(m => m === 'perspective' ? 'orthographic' : 'perspective');

  const handleToggleSamplingHUD = useCallback((open?: boolean) => {
    setIsSamplingHUDOpen((prev) => (open !== undefined ? open : !prev));
  }, []);

  const handleSampleToken = useCallback((token: TokenCandidate) => {
    setSampledToken(token);
  }, []);

  const handleAppendSampledToken = useCallback((tokenText: string) => {
    const clean = tokenText.trim().replace(/^␣/, '');
    if (clean) {
      setTokens((prev) => [...prev, clean].slice(-8));
    }
  }, []);

  const handleToggleNarratorCollapse = useCallback((collapsed?: boolean) => {
    setIsNarratorCollapsed((prev: boolean) => {
      const next = collapsed !== undefined ? collapsed : !prev;
      localStorage.setItem('marin_narrator_collapsed', String(next));
      return next;
    });
  }, []);

  const handleToggleInspectorCollapse = useCallback((collapsed?: boolean) => {
    setIsInspectorCollapsed((prev) => {
      const next = collapsed !== undefined ? collapsed : !prev;
      localStorage.setItem('marin_inspector_collapsed', String(next));
      return next;
    });
  }, []);

  const dynamicSteps = useMemo(() => {
    return FORWARD_STEPS.map((step) => {
      const newStep = { ...step };
      if (selectedLayerIndex > 0) {
        if (['input_tokens', 'token_embed', 'embed_gated_norm'].includes(step.id)) {
          if (step.id === 'input_tokens') {
            newStep.name = '1. Previous Layer Residual Input';
            newStep.shortDesc = 'Residual stream [S × 6144] from the previous layer.';
            newStep.longDesc = `Receives the accumulated hidden state from Layer ${selectedLayerIndex - 1}.`;
          } else {
            newStep.name = step.name.replace(/^\d+\.\s*/, `${step.order}. `) + ' (Bypassed)';
            newStep.shortDesc = 'Bypassed. Tokens already embedded.';
            newStep.longDesc = 'Embedding only happens on the first layer. This block directly receives the residual stream.';
          }
        }
      }
      if (selectedLayerIndex < layers.length - 1) {
        if (['final_gated_norm', 'untied_lm_head'].includes(step.id)) {
          if (step.id === 'final_gated_norm') {
            newStep.name = '18. Residual Stream Forwarding';
            newStep.shortDesc = 'Pass [S × 6144] hidden states to the next layer.';
            newStep.longDesc = `Forwarding the updated residual stream to Layer ${selectedLayerIndex + 1}.`;
          } else {
            newStep.name = step.name.replace(/^\d+\.\s*/, `${step.order}. `) + ' (Bypassed)';
            newStep.shortDesc = 'Bypassed. LM Head only active on final layer.';
            newStep.longDesc = 'The untied LM head projection and softmax only run after the final layer.';
          }
        }
      }
      return newStep;
    });
  }, [selectedLayerIndex, layers.length]);

  const handleOpenInspector = useCallback((nodeId?: string) => {
    if (nodeId) {
      setInspectedId(nodeId);
    } else {
      const primaryNode = dynamicSteps[currentStepIndex]?.activeNodeIds[0] || 'node_tokens';
      setInspectedId(primaryNode);
    }
    setIsInspectorCollapsed(false);
    localStorage.setItem('marin_inspector_collapsed', 'false');
  }, [currentStepIndex, dynamicSteps]);

  const handleItemClick = useCallback((id: string, worldPos?: [number, number, number]) => {
    setInspectedId(id);

    let targetStepIndex = dynamicSteps.findIndex(step => step.activeNodeIds?.includes(id));
    if (targetStepIndex === -1) {
      const fallbackMap: Record<string, string> = {
        'op_attn_add': 'attn_proj_residual',
        'op_moe_add': 'moe_aggregation_residual',
        'node_w_q': 'qkv_proj',
        'node_w_k': 'qkv_proj',
        'node_w_v': 'qkv_proj',
        'node_attn_score': 'attn_softmax',
        'node_attn_dropout': 'attn_softmax',
        'node_attn_prob': 'attn_softmax',
        'node_attn_out': 'attn_out',
        'node_w_o': 'attn_proj_residual',
        'node_moe_router': 'moe_router',
        'node_moe_topk': 'moe_router',
        'node_expert_1': 'moe_experts',
        'node_expert_2': 'moe_experts',
        'node_w_g': 'moe_experts',
        'node_w_u': 'moe_experts',
        'node_w_d': 'moe_experts'
      };
      
      const fallbackStepId = fallbackMap[id];
      if (fallbackStepId) {
        targetStepIndex = dynamicSteps.findIndex(step => step.id === fallbackStepId);
      }
    }

    if (targetStepIndex !== -1) {
      setCurrentStepIndex(targetStepIndex);
      setIsPlaying(false);
      setIsNarratorCollapsed(false);
    }

    if (worldPos) {
      // 2. Zoom-out Calibration (More comfortable view distance)
      setCameraOverride({
        pos: [worldPos[0] + 0.8, worldPos[1] + 4.2, worldPos[2] + 14.5],
        focus: [worldPos[0], worldPos[1], worldPos[2]]
      });
      // 3. Trigger the smooth lerp camera transition
      setResetTrigger(prev => prev + 1);
    }
  }, [dynamicSteps]);

  // Synchronize group and selected layer
  const currentGroup = layerGroups[currentGroupIndex] || layerGroups[0];
  const currentLayer = layers[selectedLayerIndex] || layers[0];
  const activeStep = dynamicSteps[currentStepIndex];

  // Auto-open Sampling HUD when user advances to Step 19 (untied_lm_head)
  useEffect(() => {
    if (activeStep.id === 'untied_lm_head') {
      if (!hasAutoOpenedStep19.current) {
        setIsSamplingHUDOpen(true);
        hasAutoOpenedStep19.current = true;
      }
    }
  }, [activeStep.id]);

  // Camera presets & forced reset trigger (calibrated for 55-70% viewport utilization)
  const [cameraOverride, setCameraOverride] = useState<{
    pos: [number, number, number];
    focus: [number, number, number];
  } | null>({ ...SINGLE_BLOCK_CAMERA });
  const [resetTrigger, setResetTrigger] = useState(0);
  const [activeBranchFocus, setActiveBranchFocus] = useState<'attn' | 'moe'>('attn');

  // Smooth reset to optimal overview angle (gentle 14.5° elevation, perfect 1:1 framing)
  const handleResetCamera = useCallback(() => {
    if (viewMode === 'quad_cycle') {
      setCameraOverride({ pos: [-22, 24, 38], focus: [4, 1.5, 0] });
    } else if (viewMode === 'macro_stack') {
      setCameraOverride({ pos: [0, 8, 38], focus: [0, 2, 0] });
    } else {
      setCameraOverride({ ...SINGLE_BLOCK_CAMERA });
    }
    setAutoFollow(false);
    setResetTrigger((prev) => prev + 1);
  }, [viewMode]);

  // Top-Down panoramic view (90° vertical floorplan)
  const handleSetTopDownView = useCallback(() => {
    if (viewMode === 'quad_cycle') {
      setCameraOverride({ pos: [4, 46, 0.01], focus: [4, 0, 0] });
    } else if (viewMode === 'macro_stack') {
      setCameraOverride({ pos: [0, 42, 0.01], focus: [0, 0, 0] });
    } else {
      setCameraOverride({ pos: [13.0, 50.0, 0.01], focus: [13.0, 2.0, 0] });
    }
    setAutoFollow(false);
    setResetTrigger((prev) => prev + 1);
  }, [viewMode]);

  // Focus specific branch or layer
  const handleFocusBranch = useCallback((branch?: 'attn' | 'moe') => {
    if (viewMode === 'quad_cycle') {
      const zOffsets = [-22, -7, 8, 23];
      const z = zOffsets[selectedLayerIndex % 4] ?? 0;
      setCameraOverride({ pos: [4, 14, z + 20], focus: [4, 2, z] });
      setAutoFollow(false);
      setResetTrigger((prev) => prev + 1);
      return;
    }
    if (viewMode === 'macro_stack') {
      setCameraOverride({ pos: [0, 6, 22], focus: [0, 2, 0] });
      setAutoFollow(false);
      setResetTrigger((prev) => prev + 1);
      return;
    }

    // single_block: focus Attention branch or LatentMoE branch
    const targetBranch = branch || (activeBranchFocus === 'attn' ? 'moe' : 'attn');
    setActiveBranchFocus(targetBranch);
    if (targetBranch === 'attn') {
      setCameraOverride({ pos: [3.5, 14.0, 24.0], focus: [3.5, 4.5, -1.0] });
    } else {
      setCameraOverride({ pos: [26.0, 14.0, 26.0], focus: [26.0, 4.5, 1.0] });
    }
    setAutoFollow(false);
    setResetTrigger((prev) => prev + 1);
  }, [viewMode, selectedLayerIndex, activeBranchFocus]);

  const handleToggleAutoFollow = useCallback(() => {
    setAutoFollow((prev) => {
      if (!prev) setCameraOverride(null);
      return !prev;
    });
  }, []);

  // Select layer handler that isolates the layer (hiding all others) and aligns currentGroupIndex
  const handleSelectLayer = useCallback((index: number, isolate: boolean = true) => {
    const clampedIndex = Math.max(0, Math.min(layers.length - 1, index));
    setSelectedLayerIndex(clampedIndex);
    const g = Math.floor(clampedIndex / 4);
    setCurrentGroupIndex(g);
    if (isolate) {
      setViewMode('single_block');
      setAutoFollow(false);
      setCameraOverride({
        ...SINGLE_BLOCK_CAMERA,
      });
      setResetTrigger((prev) => prev + 1);
    }
  }, [layers.length]);

  const handleChangeGroup = useCallback((gIndex: number) => {
    setCurrentGroupIndex(gIndex);
    setSelectedLayerIndex(gIndex * 4);
  }, []);

  // Simulated activations
  const activationData = useMemo(() => {
    return simulateActivations(tokens, selectedLayerIndex, currentLayer.isGlobal);
  }, [tokens, selectedLayerIndex, currentLayer.isGlobal]);

  // Step advancement
  const handleNextStep = useCallback(() => {
    setCameraOverride(null);
    setCurrentStepIndex((prev) => {
      if (prev < dynamicSteps.length - 1) {
        return prev + 1;
      } else {
        // Advance to next layer or loop
        setSelectedLayerIndex((lPrev) => {
          const nextLayer = (lPrev + 1) % layers.length;
          setCurrentGroupIndex(Math.floor(nextLayer / 4));
          return nextLayer;
        });
        return 0;
      }
    });
  }, [layers.length, dynamicSteps.length]);

  const handlePrevStep = useCallback(() => {
    setCameraOverride(null);
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCameraOverride(null);
    setCurrentStepIndex(0);
  }, []);

  // Playback timer
  useEffect(() => {
    if (!isPlaying) return;
    const intervalMs = 2400;
    const timer = setInterval(() => {
      handleNextStep();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, handleNextStep]);

  // Synchronize inspected node with step changes if inspector is already active
  useEffect(() => {
    if (inspectedId !== null) {
      const primaryNode = activeStep.activeNodeIds[0] || 'node_tokens';
      setInspectedId(primaryNode);
    }
  }, [currentStepIndex, selectedLayerIndex, activeStep.activeNodeIds]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNextStep();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrevStep();
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        handleSelectLayer(Math.max(0, selectedLayerIndex - 1), viewMode === 'single_block');
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        handleSelectLayer(Math.min(layers.length - 1, selectedLayerIndex + 1), viewMode === 'single_block');
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        handleToggleNarratorCollapse();
      } else if (e.code === 'KeyS') {
        e.preventDefault();
        handleToggleSamplingHUD();
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        handleResetCamera();
      } else if (e.code === 'Escape') {
        if (isSamplingHUDOpen) {
          setIsSamplingHUDOpen(false);
        } else if (inspectedId !== null) {
          setInspectedId(null);
        } else if (showLayerSpecsModal) {
          setShowLayerSpecsModal(false);
        } else if (!isNarratorCollapsed) {
          handleToggleNarratorCollapse(true);
        }
        setHoveredCell(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleNextStep,
    handlePrevStep,
    handleSelectLayer,
    handleResetCamera,
    handleToggleSamplingHUD,
    isSamplingHUDOpen,
    selectedLayerIndex,
    layers.length,
    viewMode,
    inspectedId,
    showLayerSpecsModal,
    isNarratorCollapsed,
    handleToggleNarratorCollapse,
  ]);

  // Compute active camera target coordinates
  const { currentCameraPos, currentCameraFocus } = useMemo(() => {
    const isFirst = selectedLayerIndex === 0;
    const isLast = selectedLayerIndex === layers.length - 1;
    let basePos = activeStep.cameraPos;
    let baseFocus = activeStep.cameraFocus;

    if (!isFirst && ['input_tokens', 'token_embed', 'embed_gated_norm'].includes(activeStep.id)) {
      basePos = [-11.5, 5, 8];
      baseFocus = [-11.5, 2, 0];
    }
    if (!isLast && ['final_gated_norm', 'untied_lm_head'].includes(activeStep.id)) {
      basePos = [39.5, 5, 8];
      baseFocus = [39.5, 2, 0];
    }

    if (cameraOverride) {
      return {
        currentCameraPos: cameraOverride.pos,
        currentCameraFocus: cameraOverride.focus,
      };
    }
    if (viewMode === 'quad_cycle') {
      return {
        currentCameraPos: [-22, 24, 38] as [number, number, number],
        currentCameraFocus: [4, 1.5, 0] as [number, number, number],
      };
    }
    if (viewMode === 'macro_stack') {
      return {
        currentCameraPos: [0, 8, 38] as [number, number, number],
        currentCameraFocus: [0, 2, 0] as [number, number, number],
      };
    }
    if (!autoFollow) {
      return {
        currentCameraPos: SINGLE_BLOCK_CAMERA.pos,
        currentCameraFocus: SINGLE_BLOCK_CAMERA.focus,
      };
    }
    return {
      currentCameraPos: basePos,
      currentCameraFocus: baseFocus,
    };
  }, [cameraOverride, viewMode, autoFollow, activeStep.cameraPos, activeStep.cameraFocus, activeStep.id, selectedLayerIndex, layers.length]);

  const effectiveStep = useMemo(() => {
    const isFirst = selectedLayerIndex === 0;
    const isLast = selectedLayerIndex === layers.length - 1;
    let patchedNodeIds = [...activeStep.activeNodeIds];
    
    if (!isFirst && ['input_tokens', 'token_embed', 'embed_gated_norm'].includes(activeStep.id)) {
      patchedNodeIds = ['node_residual_in'];
    }
    if (!isLast && ['final_gated_norm', 'untied_lm_head'].includes(activeStep.id)) {
      patchedNodeIds = ['node_residual_out'];
    }

    return {
      ...activeStep,
      activeNodeIds: patchedNodeIds,
      cameraPos: currentCameraPos,
      cameraFocus: currentCameraFocus,
    };
  }, [activeStep, currentCameraPos, currentCameraFocus, selectedLayerIndex, layers.length]);

  return (
    <div className="flex flex-col w-screen h-screen bg-[#07090e] text-slate-100 overflow-hidden select-none">
      {/* Top Header Navigation */}
      <Header config={MARIN_535B_CONFIG} currentLayer={currentLayer} viewMode={viewMode} />

      <div className="flex flex-1 relative overflow-hidden">
        {/* Center: 3D Stage Viewport */}
        <main className="flex-1 h-full relative">
          {/* Top Floating View Mode Switcher */}
          <ViewModeSwitcher
            viewMode={viewMode}
            onChangeViewMode={(mode) => {
              setCameraOverride(null);
              setAutoFollow(true);
              setViewMode(mode);
              setResetTrigger((prev) => prev + 1);
            }}
            vfxMode={vfxMode}
            onChangeVfxMode={setVfxMode}
            onOpenLayerSpecs={() => setShowLayerSpecsModal(true)}
            currentGroupIndex={currentGroupIndex}
            onChangeGroup={handleChangeGroup}
            selectedLayerIndex={selectedLayerIndex}
            currentLayer={currentLayer}
            totalLayers={layers.length}
            onPrevLayer={() => handleSelectLayer(selectedLayerIndex - 1, true)}
            onNextLayer={() => handleSelectLayer(selectedLayerIndex + 1, true)}
          />

          {/* Token Input Bar for customizing sequence */}
          <TokenInputBar
            tokens={tokens}
            activationData={activationData}
            onUpdateTokens={setTokens}
            sampledToken={sampledToken}
            onAppendSampledToken={handleAppendSampledToken}
            onOpenSamplingHUD={handleToggleSamplingHUD}
            isSamplingHUDOpen={isSamplingHUDOpen}
          />

          {/* bbycroft-style Walkthrough Narrator Bar (Collapsible Pill & Card) */}
          <WalkthroughNarrator
            currentStep={activeStep}
            stepIndex={currentStepIndex}
            totalSteps={dynamicSteps.length}
            onPrevStep={handlePrevStep}
            onNextStep={handleNextStep}
            onOpenDetails={() => handleOpenInspector(activeStep.activeNodeIds[0] || 'node_tokens')}
            isCollapsed={isNarratorCollapsed}
            onToggleCollapse={handleToggleNarratorCollapse}
            onOpenSamplingHUD={() => setIsSamplingHUDOpen(true)}
            isSamplingHUDOpen={isSamplingHUDOpen}
          />

          {/* Color Coding Legend */}
          {!inspectedId && !showLayerSpecsModal && !hoveredCell && <Legend />}

          {/* Live Cell Hover HUD (bbycroft style) */}
          <CellHoverHUD
            cellInfo={hoveredCell}
            onClose={() => setHoveredCell(null)}
            isSamplingHUDOpen={isSamplingHUDOpen}
          />

          {/* 3D Camera Presets Bar */}
          <CameraPresetsBar
            viewMode={viewMode}
            onResetCamera={handleResetCamera}
            onSetTopDownView={handleSetTopDownView}
            onFocusBranch={handleFocusBranch}
            activeBranchFocus={activeBranchFocus}
            autoFollow={autoFollow}
            onToggleAutoFollow={handleToggleAutoFollow}
            isSamplingHUDOpen={isSamplingHUDOpen}
            cameraMode={cameraMode}
            onToggleCameraMode={toggleCameraMode}
          />

          {/* Three.js 3D Scene */}
          <SceneContainer
            viewMode={viewMode}
            vfxMode={vfxMode}
            allLayers={layers}
            groupLayers={currentGroup.layers}
            currentLayer={currentLayer}
            activeStep={effectiveStep}
            activationData={activationData}
            autoFollow={autoFollow}
            cameraPos={currentCameraPos}
            cameraFocus={currentCameraFocus}
            onHoverItem={(id) => {
              setHoveredItemId(id);
            }}
            onClickItem={handleItemClick}
            onSelectLayer={handleSelectLayer}
            onHoverCell={setHoveredCell}
            onUserInteract={() => setAutoFollow(false)}
            inspectedId={inspectedId}
            hoveredItemId={hoveredItemId}
            flowSpeedMultiplier={0.5}
            resetTrigger={resetTrigger}
            cameraMode={cameraMode}
          />

          {/* Floating Mathematical Formula / Design Tooltip (Collapsible Pill & Drawer) */}
          {inspectedId && (
            <InspectorModal
              inspectedId={inspectedId}
              activeStep={activeStep}
              isCollapsed={isInspectorCollapsed}
              onToggleCollapse={handleToggleInspectorCollapse}
              onClose={() => setInspectedId(null)}
            />
          )}

          {/* Full 48-Layer Detailed Architectural Specification Modal */}
          {showLayerSpecsModal && (
            <LayerDetailModal
              layers={layers}
              selectedLayerIndex={selectedLayerIndex}
              onSelectLayer={handleSelectLayer}
              onClose={() => setShowLayerSpecsModal(false)}
            />
          )}

          {/* Bottom Playback & Step Controls */}
          <Controls
            steps={dynamicSteps}
            currentStepIndex={currentStepIndex}
            isPlaying={isPlaying}
            onPrevStep={handlePrevStep}
            onNextStep={handleNextStep}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            onReset={handleReset}
            onSelectStep={(idx) => {
              setCameraOverride(null);
              setCurrentStepIndex(idx);
              setIsPlaying(false);
            }}
            onToggleInspector={() => {
              if (!inspectedId) {
                handleOpenInspector(activeStep.activeNodeIds[0] || 'node_tokens');
              } else if (isInspectorCollapsed) {
                handleToggleInspectorCollapse(false);
              } else {
                handleToggleInspectorCollapse(true);
              }
            }}
            isInspectorActive={Boolean(inspectedId && !isInspectorCollapsed)}
            onToggleNarrator={() => handleToggleNarratorCollapse()}
            isNarratorActive={!isNarratorCollapsed}
            onToggleSamplingHUD={handleToggleSamplingHUD}
            isSamplingHUDOpen={isSamplingHUDOpen}
            isStep19={activeStep.id === 'untied_lm_head'}
          />

          {/* Floating Highlight Pill for Step 19 (When Sampling HUD is closed) */}
          {activeStep.id === 'untied_lm_head' && !isSamplingHUDOpen && (
            <button
              onClick={() => setIsSamplingHUDOpen(true)}
              className="fixed bottom-48 right-4 z-25 flex items-center space-x-2 px-3.5 py-2 rounded-2xl bg-[#0c101d]/95 hover:bg-[#131b2e] border-2 border-amber-400/70 hover:border-amber-300 text-amber-300 hover:text-white shadow-2xl shadow-amber-500/30 backdrop-blur-xl transition-all duration-200 hover:scale-105 select-none animate-bounce cursor-pointer"
              title="Step 19 Core Feature: Open Dynamic Sampling HUD (Shortcut: S)"
            >
              <span className="text-base">🎲</span>
              <div className="text-left font-mono">
                <div className="text-xs font-bold flex items-center space-x-1.5">
                  <span>Open Sampling HUD</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                </div>
                <div className="text-[9px] text-amber-400/80">Temperature • Top-k • Top-p</div>
              </div>
            </button>
          )}

          {/* Step 19 Dynamic Sampling Experiment HUD */}
          <SamplingHUD
            isOpen={isSamplingHUDOpen}
            onClose={() => setIsSamplingHUDOpen(false)}
            currentStep={activeStep.id}
            onSampleToken={handleSampleToken}
            customCandidates={activationData.candidateTokens}
          />
        </main>
      </div>
    </div>
  );
}
