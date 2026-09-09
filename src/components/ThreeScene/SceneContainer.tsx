import React from 'react';
import { Canvas } from '@react-three/fiber';
import { MicroBlockView } from './MicroBlockView';
import { QuadCycleView } from './QuadCycleView';
import { MacroTowerView } from './MacroTowerView';
import { CameraRig } from './CameraRig';
import { FlowProvider } from './FlowConnections';
import { LayerMetadata, ForwardStep, ViewMode } from '../../types/model';
import { ActivationData } from '../../data/tokenSimulation';

interface SceneContainerProps {
  viewMode: ViewMode;
  allLayers: LayerMetadata[];
  groupLayers: LayerMetadata[];
  currentLayer: LayerMetadata;
  activeStep: ForwardStep;
  activationData: ActivationData;
  autoFollow: boolean;
  cameraPos: [number, number, number];
  cameraFocus: [number, number, number];
  onHoverItem: (id: string | null) => void;
  onClickItem: (id: string) => void;
  onSelectLayer: (index: number) => void;
  onHoverCell?: (cellInfo: any) => void;
  onUserInteract?: () => void;
  inspectedId: string | null;
  hoveredItemId?: string | null;
  flowSpeedMultiplier?: number;
  resetTrigger?: number;
}

export const SceneContainer: React.FC<SceneContainerProps> = ({
  viewMode,
  allLayers,
  groupLayers,
  currentLayer,
  activeStep,
  activationData,
  autoFollow,
  cameraPos,
  cameraFocus,
  onHoverItem,
  onClickItem,
  onSelectLayer,
  onHoverCell,
  onUserInteract,
  inspectedId,
  hoveredItemId,
  flowSpeedMultiplier = 0.5,
  resetTrigger,
}) => {
  // Adjust spatial ground grid height to eliminate clipping with single_block / quad_cycle floor
  const gridY = viewMode === 'macro_stack' ? -2.5 : -0.01;

  return (
    <div className="w-full h-full relative bg-[#07090e]">
      <Canvas
        camera={{ position: cameraPos, fov: 42 }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        {/* Ambient & Directional Lights */}
        <ambientLight intensity={0.8} />
        <directionalLight position={[20, 30, 20]} intensity={1.5} castShadow />
        <directionalLight position={[-20, -10, -20]} intensity={0.5} color="#38bdf8" />
        <pointLight position={[4, 15, 0]} intensity={1.0} color="#818cf8" />

        {/* Global Flow Context for synchronized speeds */}
        <FlowProvider speedMultiplier={flowSpeedMultiplier}>
          {/* Dynamic 3D Scene View */}
          {viewMode === 'quad_cycle' && (
            <QuadCycleView
              groupLayers={groupLayers}
              activeLayerIndex={currentLayer.index}
              activeStep={activeStep}
              activationData={activationData}
              onSelectLayer={onSelectLayer}
              onHoverItem={onHoverItem}
              onClickItem={onClickItem}
              onHoverCell={onHoverCell}
              inspectedId={inspectedId}
              hoveredItemId={hoveredItemId}
            />
          )}

          {viewMode === 'single_block' && (
            <MicroBlockView
              layer={currentLayer}
              activeStep={activeStep}
              activationData={activationData}
              onHoverItem={onHoverItem}
              onClickItem={onClickItem}
              onHoverCell={onHoverCell}
              inspectedId={inspectedId}
              hoveredItemId={hoveredItemId}
            />
          )}

          {viewMode === 'macro_stack' && (
            <MacroTowerView
              layers={allLayers}
              selectedLayerIndex={currentLayer.index}
              onSelectLayer={onSelectLayer}
            />
          )}
        </FlowProvider>

        {/* Spatial Ground Grid */}
        <gridHelper
          args={[100, 100, '#1e293b', '#0f172a']}
          position={[0, gridY, 0]}
        />

        {/* Camera Rig with Smooth Orbit & Position Lerping */}
        <CameraRig
          cameraPos={cameraPos}
          cameraFocus={cameraFocus}
          autoFollow={autoFollow}
          onUserInteract={onUserInteract}
          resetTrigger={resetTrigger}
        />
      </Canvas>
    </div>
  );
};
