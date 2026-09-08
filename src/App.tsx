import React, { useState, useEffect, useMemo, useCallback } from 'react';
import 'katex/dist/katex.min.css';
import { Header } from './components/UI/Header';
import { LayerSidebar } from './components/UI/LayerSidebar';
import { Controls } from './components/UI/Controls';
import { InspectorModal } from './components/UI/InspectorModal';
import { TokenInputBar } from './components/UI/TokenInputBar';
import { Legend } from './components/UI/Legend';
import { ViewModeSwitcher } from './components/UI/ViewModeSwitcher';
import { LayerDetailModal } from './components/UI/LayerDetailModal';
import { WalkthroughNarrator } from './components/UI/WalkthroughNarrator';
import { CellHoverHUD, HoveredCellInfo } from './components/UI/CellHoverHUD';
import { CameraPresetsBar } from './components/UI/CameraPresetsBar';
import { FlowDynamicsHUD } from './components/UI/FlowDynamicsHUD';
import { SceneContainer } from './components/ThreeScene/SceneContainer';
import { IsolatedLayerBanner } from './components/UI/IsolatedLayerBanner';
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

export function App() {
  const layers = useMemo(() => generateLayersMetadata(), []);
  const layerGroups = useMemo(() => generateLayerGroups(), []);

  // View mode: default to 'quad_cycle' (the simplified 4-layer 3 Local + 1 Global unit!)
  const [viewMode, setViewMode] = useState<ViewMode>('quad_cycle');
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [selectedLayerIndex, setSelectedLayerIndex] = useState(0);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [autoFollow, setAutoFollow] = useState(true);
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
    setIsNarratorCollapsed((prev) => {
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

  const handleOpenInspector = useCallback((nodeId?: string) => {
    if (nodeId) {
      setInspectedId(nodeId);
    } else {
      const primaryNode = FORWARD_STEPS[currentStepIndex]?.activeNodeIds[0] || 'node_tokens';
      setInspectedId(primaryNode);
    }
    setIsInspectorCollapsed(false);
    localStorage.setItem('marin_inspector_collapsed', 'false');
  }, [currentStepIndex]);

  // Flow dynamics & particle swarm control
  const [flowSpeedMultiplier, setFlowSpeedMultiplier] = useState(1.0);
  const [flowDensity, setFlowDensity] = useState<'normal' | 'dense' | 'ultra'>('dense');
  const [isBurstActive, setIsBurstActive] = useState(false);

  const handleTriggerTokenBurst = useCallback(() => {
    setIsBurstActive(true);
    setTimeout(() => {
      setIsBurstActive(false);
    }, 2400);
  }, []);

  // Synchronize group and selected layer
  const currentGroup = layerGroups[currentGroupIndex] || layerGroups[0];
  const currentLayer = layers[selectedLayerIndex] || layers[0];
  const activeStep = FORWARD_STEPS[currentStepIndex];

  // Auto-open Sampling HUD when user advances to Step 19 (untied_lm_head)
  useEffect(() => {
    if (activeStep.id === 'untied_lm_head') {
      if (!hasAutoOpenedStep19.current) {
        setIsSamplingHUDOpen(true);
        hasAutoOpenedStep19.current = true;
      }
    }
  }, [activeStep.id]);

  // Camera presets & forced reset trigger
  const [cameraOverride, setCameraOverride] = useState<{
    pos: [number, number, number];
    focus: [number, number, number];
  } | null>(null);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [activeBranchFocus, setActiveBranchFocus] = useState<'attn' | 'moe'>('attn');

  // Smooth reset to optimal overview angle (45° elevation)
  const handleResetCamera = useCallback(() => {
    if (viewMode === 'quad_cycle') {
      setCameraOverride({ pos: [-22, 24, 38], focus: [4, 1.5, 0] });
    } else if (viewMode === 'macro_stack') {
      setCameraOverride({ pos: [0, 8, 38], focus: [0, 2, 0] });
    } else {
      // Single block optimal overview (Iso 45° tilt, clear visibility of all 5 stages)
      setCameraOverride({ pos: [7, 22, 24], focus: [7, 2, 0] });
    }
    setAutoFollow(true);
    setResetTrigger((prev) => prev + 1);
  }, [viewMode]);

  // Top-Down panoramic view (90° vertical floorplan)
  const handleSetTopDownView = useCallback(() => {
    if (viewMode === 'quad_cycle') {
      setCameraOverride({ pos: [4, 46, 0.01], focus: [4, 0, 0] });
    } else if (viewMode === 'macro_stack') {
      setCameraOverride({ pos: [0, 42, 0.01], focus: [0, 0, 0] });
    } else {
      setCameraOverride({ pos: [7, 34, 0.01], focus: [7, 0, 0] });
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
      setCameraOverride({ pos: [2, 11, 13], focus: [2, 2.5, -1.5] });
    } else {
      setCameraOverride({ pos: [17, 11, 14], focus: [17, 2.5, 1.0] });
    }
    setAutoFollow(false);
    setResetTrigger((prev) => prev + 1);
  }, [viewMode, selectedLayerIndex, activeBranchFocus]);

  // Select layer handler that isolates the layer (hiding all others) and aligns currentGroupIndex
  const handleSelectLayer = useCallback((index: number, isolate: boolean = true) => {
    setSelectedLayerIndex(index);
    const g = Math.floor(index / 4);
    setCurrentGroupIndex(g);
    if (isolate) {
      setViewMode('single_block');
      setAutoFollow(true);
      setCameraOverride({
        pos: [7, 20, 28],
        focus: [7, 2, 0],
      });
      setResetTrigger((prev) => prev + 1);
    }
  }, []);

  const handleExitIsolation = useCallback((targetMode: ViewMode = 'quad_cycle') => {
    setCameraOverride(null);
    setAutoFollow(true);
    setViewMode(targetMode);
    setResetTrigger((prev) => prev + 1);
  }, []);

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
      if (prev < FORWARD_STEPS.length - 1) {
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
  }, [layers.length]);

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
    const intervalMs = 2400 / playbackSpeed;
    const timer = setInterval(() => {
      handleNextStep();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, handleNextStep]);

  // Synchronize inspected node with step changes if inspector is already active
  useEffect(() => {
    if (inspectedId !== null) {
      const primaryNode = activeStep.activeNodeIds[0] || 'node_tokens';
      setInspectedId(primaryNode);
    }
  }, [currentStepIndex]);

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
    return {
      currentCameraPos: activeStep.cameraPos,
      currentCameraFocus: activeStep.cameraFocus,
    };
  }, [cameraOverride, viewMode, activeStep.cameraPos, activeStep.cameraFocus]);

  const effectiveStep = useMemo(() => {
    return {
      ...activeStep,
      cameraPos: currentCameraPos,
      cameraFocus: currentCameraFocus,
    };
  }, [activeStep, currentCameraPos, currentCameraFocus]);

  return (
    <div className="flex flex-col w-screen h-screen bg-[#07090e] text-slate-100 overflow-hidden select-none">
      {/* Top Header Navigation */}
      <Header
        config={MARIN_535B_CONFIG}
        autoFollow={autoFollow}
        onToggleAutoFollow={() => {
          setCameraOverride(null);
          setAutoFollow(!autoFollow);
        }}
        onResetCamera={handleResetCamera}
      />

      <div className="flex flex-1 relative overflow-hidden">
        {/* Left Sidebar: 48-Layer Panorama */}
        <LayerSidebar
          layers={layers}
          selectedLayerIndex={selectedLayerIndex}
          onSelectLayer={handleSelectLayer}
          viewMode={viewMode}
          onExitIsolation={() => handleExitIsolation('quad_cycle')}
        />

        {/* Center: 3D Stage Viewport */}
        <main className="flex-1 h-full relative">
          {/* Top Floating View Mode Switcher */}
          <ViewModeSwitcher
            viewMode={viewMode}
            onChangeViewMode={(mode) => {
              setCameraOverride(null);
              setViewMode(mode);
            }}
            onOpenLayerSpecs={() => setShowLayerSpecsModal(true)}
            currentGroupIndex={currentGroupIndex}
            onChangeGroup={handleChangeGroup}
            selectedLayerIndex={selectedLayerIndex}
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

          {/* Prominent Floating Banner when Layer is Isolated */}
          {viewMode === 'single_block' && (
            <IsolatedLayerBanner
              currentLayer={currentLayer}
              totalLayers={layers.length}
              onPrevLayer={() => handleSelectLayer(Math.max(0, selectedLayerIndex - 1), true)}
              onNextLayer={() => handleSelectLayer(Math.min(layers.length - 1, selectedLayerIndex + 1), true)}
              onSelectLayer={(idx) => handleSelectLayer(idx, true)}
              onExitIsolation={handleExitIsolation}
            />
          )}

          {/* bbycroft-style Walkthrough Narrator Bar (Collapsible Pill & Card) */}
          <WalkthroughNarrator
            currentStep={activeStep}
            stepIndex={currentStepIndex}
            totalSteps={FORWARD_STEPS.length}
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
            onToggleAutoFollow={() => setAutoFollow(!autoFollow)}
          />

          {/* Interactive Flow Dynamics HUD */}
          <FlowDynamicsHUD
            flowSpeedMultiplier={flowSpeedMultiplier}
            onChangeFlowSpeed={setFlowSpeedMultiplier}
            flowDensity={flowDensity}
            onChangeFlowDensity={setFlowDensity}
            onTriggerTokenBurst={handleTriggerTokenBurst}
            isBurstActive={isBurstActive}
          />

          {/* Three.js 3D Scene */}
          <SceneContainer
            viewMode={viewMode}
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
            onClickItem={(id) => setInspectedId(id)}
            onSelectLayer={handleSelectLayer}
            onHoverCell={setHoveredCell}
            onUserInteract={() => setAutoFollow(false)}
            inspectedId={inspectedId}
            hoveredItemId={hoveredItemId}
            flowSpeedMultiplier={flowSpeedMultiplier}
            flowDensity={flowDensity}
            isBurstActive={isBurstActive}
            resetTrigger={resetTrigger}
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
            steps={FORWARD_STEPS}
            currentStepIndex={currentStepIndex}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            onPrevStep={handlePrevStep}
            onNextStep={handleNextStep}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            onReset={handleReset}
            onSelectStep={(idx) => {
              setCameraOverride(null);
              setCurrentStepIndex(idx);
              setIsPlaying(false);
            }}
            onChangeSpeed={setPlaybackSpeed}
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
              className="fixed bottom-28 right-6 z-25 flex items-center space-x-2 px-3.5 py-2 rounded-2xl bg-[#0c101d]/95 hover:bg-[#131b2e] border-2 border-amber-400/70 hover:border-amber-300 text-amber-300 hover:text-white shadow-2xl shadow-amber-500/30 backdrop-blur-xl transition-all duration-200 hover:scale-105 select-none animate-bounce cursor-pointer"
              title="Step 19 核心功能：打开动态采样实验面板 (快捷键: S)"
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
