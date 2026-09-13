import React from 'react';
import * as THREE from 'three';
import { Text, Billboard } from '@react-three/drei';
import { FlowConnection } from './FlowConnections';
import { LayerMetadata, ForwardStep } from '../../types/model';
import { ActivationData, simulateActivations } from '../../data/tokenSimulation';
import { MicroBlockView } from './MicroBlockView';

interface QuadCycleViewProps {
  groupLayers: LayerMetadata[];
  activeLayerIndex: number;
  activeStep: ForwardStep;
  activationData: ActivationData;
  onSelectLayer: (index: number) => void;
  onHoverItem: (id: string | null) => void;
  onClickItem: (id: string, worldPos?: [number, number, number]) => void;
  onHoverCell?: (cellInfo: any) => void;
  inspectedId: string | null;
  hoveredItemId?: string | null;
}

export const QuadCycleView: React.FC<QuadCycleViewProps> = ({
  groupLayers,
  activeLayerIndex,
  activeStep,
  activationData,
  onSelectLayer,
  onHoverItem,
  onClickItem,
  onHoverCell,
  inspectedId,
  hoveredItemId,
}) => {
  // 4 layers spaced along the Z axis
  const layerZOffsets = [-39, -13, 13, 39];

  // Generate unique activation data for each of the 4 layers
  const layerActivations = React.useMemo(() => {
    return groupLayers.map(layer => simulateActivations(activationData.tokens, layer.index, layer.isGlobal));
  }, [groupLayers, activationData.tokens]);

  return (
    <group position={[0, 0, 0]}>
      {/* Render the 4 Layers in 3D */}
      {groupLayers.map((layer, idx) => {
        const z = layerZOffsets[idx];
        const isGlobal = layer.isGlobal;
        const layerData = layerActivations[idx];

        return (
          <group key={layer.index} position={[0, 0, z]}>
            {/* 3D Floating Floor Tray */}
            <mesh
              position={[14, -2.0, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
              onClick={(e) => {
                e.stopPropagation();
                onSelectLayer(layer.index);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                document.body.style.cursor = 'default';
              }}
            >
              <planeGeometry args={[68, 20]} />
              <meshStandardMaterial
                color={isGlobal ? '#a855f7' : '#38bdf8'}
                transparent
                opacity={0.05}
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>

            {/* Glowing edges */}
            <lineSegments position={[14, -1.98, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <edgesGeometry args={[new THREE.PlaneGeometry(68, 20)]} />
              <lineBasicMaterial
                color={isGlobal ? '#a855f7' : '#38bdf8'}
                transparent
                opacity={0.5}
              />
            </lineSegments>

            {/* Layer Header in 3D with Billboard & Dark Card */}
            <Billboard follow={true} position={[-3.5, 6.2, -3.5]}>
              <mesh position={[0, 0, -0.05]}>
                <planeGeometry args={[7.6, 1.4]} />
                <meshBasicMaterial color="#070a12" transparent opacity={0.88} />
                <lineSegments>
                  <edgesGeometry args={[new THREE.PlaneGeometry(7.6, 1.4)]} />
                  <lineBasicMaterial color={isGlobal ? '#a855f7' : '#38bdf8'} transparent opacity={0.5} />
                </lineSegments>
              </mesh>
              <Text
                position={[0, 0.25, 0.01]}
                fontSize={0.52}
                color={isGlobal ? "#d8b4fe" : "#7dd3fc"}
                fontWeight={700}
                anchorX="center"
                outlineWidth={0.024}
                outlineColor="#090c13"
                outlineBlur={0.006}
              >
                Layer {layer.index} — {isGlobal ? 'GLOBAL LAYER' : 'LOCAL LAYER'}
              </Text>
              <Text
                position={[0, -0.32, 0.01]}
                fontSize={0.26}
                color={isGlobal ? "#c084fc" : "#38bdf8"}
                anchorX="center"
                outlineWidth={0.024}
                outlineColor="#090c13"
                outlineBlur={0.006}
              >
                {isGlobal
                  ? '[⚡ 6 KV Heads (-50% Cache) | 100% NoPE | 🌐 Full Causal]'
                  : '[12 KV Heads | Half-RoPE (64d) | Sliding Window (2048)]'}
              </Text>
            </Billboard>

            <MicroBlockView
              layer={layer}
              activeStep={activeStep}
              activationData={layerData}
              onHoverItem={onHoverItem}
              onClickItem={(id, worldPos) => {
                onSelectLayer(layer.index);
                onClickItem(id, worldPos);
              }}
              onHoverCell={onHoverCell}
              inspectedId={inspectedId}
              hoveredItemId={hoveredItemId}
              totalLayers={48}
            />
          </group>
        );
      })}

      {/* Inter-Layer Connection Tubes */}
      {groupLayers.slice(0, 3).map((layer, idx) => {
        return (
          <group key={`link_${idx}`}>
            <FlowConnection
              from={[39.5, 2.0, layerZOffsets[idx]]}
              to={[-11.5, 2.0, layerZOffsets[idx + 1]]}
              curveHeight={4.0}
              particleCount={24}
              speed={0.6}
              color="#38bdf8"
              isHighlighted={true}
              label={`L${groupLayers[idx].index}→L${groupLayers[idx+1].index} Residual Stream [6144]`}
            />
          </group>
        );
      })}
    </group>
  );
};

