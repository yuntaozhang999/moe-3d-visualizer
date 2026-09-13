import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, DepthOfField } from '@react-three/postprocessing';
import { MicroBlockView } from './MicroBlockView';
import { QuadCycleView } from './QuadCycleView';
import { MacroTowerView } from './MacroTowerView';
import { CameraRig } from './CameraRig';
import { FlowProvider } from './FlowConnections';
import { LayerMetadata, ForwardStep, ViewMode } from '../../types/model';
import { ActivationData } from '../../data/tokenSimulation';

export function AdaptiveFog({ color, focusTarget }: { color: string, focusTarget: [number, number, number] }) {
  const { scene } = useThree();
  const targetVec = useMemo(() => new THREE.Vector3(...focusTarget), [focusTarget]);

  useEffect(() => {
    if (!scene.fog) {
      scene.fog = new THREE.Fog(color, 18, 65);
    }
    return () => { scene.fog = null; };
  }, [scene, color]);

  useFrame(({ camera }) => {
    if (scene.fog && (scene.fog as THREE.Fog).isFog) {
      const fog = scene.fog as THREE.Fog;
      const dist = camera.position.distanceTo(targetVec);
      fog.near = Math.max(18, dist * 0.85);
      fog.far = Math.max(65, dist * 2.4);
    }
  });
  return null;
}

interface SceneContainerProps {
  viewMode: ViewMode;
  vfxMode?: 'crisp' | 'fog' | 'bokeh';
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
  cameraMode?: 'perspective' | 'orthographic';
}

export const SceneContainer: React.FC<SceneContainerProps> = ({
  viewMode,
  vfxMode = 'crisp',
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
  cameraMode = 'perspective',
}) => {
  // Adjust spatial ground grid height to eliminate clipping with single_block / quad_cycle floor
  const gridY = viewMode === 'macro_stack' ? -2.5 : -0.01;

  return (
    <div className="w-full h-full relative bg-[#08090e]">
      <Canvas
        camera={
          cameraMode === 'orthographic'
            ? { position: cameraPos, zoom: 28, near: 0.1, far: 200 }
            : { position: cameraPos, fov: 36 }
        }
        orthographic={cameraMode === 'orthographic'}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        {/* Visual FX Modes */}
        {vfxMode === 'fog' && (
          <AdaptiveFog color="#08090e" focusTarget={cameraFocus || [0,0,0]} />
        )}
        {vfxMode === 'bokeh' && (
          <EffectComposer multisampling={0}>
            <DepthOfField target={cameraFocus || [0,0,0]} focalLength={0.035} bokehScale={3.5} height={720} />
          </EffectComposer>
        )}

        {/* Ambient & Directional Lights */}
        <ambientLight intensity={1.1} />
        <directionalLight position={[20, 32, 20]} intensity={1.3} castShadow />
        <directionalLight position={[-20, -10, -20]} intensity={0.4} color="#818cf8" />
        <pointLight position={[13, 16, 0]} intensity={0.8} color="#cbd5e1" />

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
              totalLayers={allLayers.length}
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

        {/* Subtle Obsidian Ground Grid */}
        <gridHelper
          args={[120, 60, '#141a26', '#0c1018']}
          position={[13.0, gridY, 0]}
        />

        {/* Camera Rig with Smooth Orbit & Position Lerping */}
        <CameraRig
          cameraPos={cameraPos}
          cameraFocus={cameraFocus}
          autoFollow={autoFollow}
          onUserInteract={onUserInteract}
          resetTrigger={resetTrigger}
          cameraMode={cameraMode}
        />
      </Canvas>
    </div>
  );
};
