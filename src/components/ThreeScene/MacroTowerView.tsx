import React from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import { LayerMetadata } from '../../types/model';

interface MacroTowerViewProps {
  layers: LayerMetadata[];
  selectedLayerIndex: number;
  onSelectLayer: (index: number) => void;
}

interface MacroLayerSlabProps {
  layer: LayerMetadata;
  x: number;
  y: number;
  z: number;
  isSelected: boolean;
  onSelectLayer: (index: number) => void;
}

const MacroLayerSlab: React.FC<MacroLayerSlabProps> = ({
  layer,
  x,
  y,
  z,
  isSelected,
  onSelectLayer,
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const isGlobal = layer.isGlobal;
  const color = isGlobal ? '#a855f7' : '#38bdf8';
  const slabColor = isGlobal
    ? isSelected
      ? '#7e22ce'
      : isHovered
      ? '#6b21a8'
      : '#3b0764'
    : isSelected
    ? '#0284c7'
    : isHovered
    ? '#0369a1'
    : '#0c4a6e';

  return (
    <group
      position={[x, y, z]}
      onClick={(e) => {
        e.stopPropagation();
        onSelectLayer(layer.index);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setIsHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setIsHovered(false);
        document.body.style.cursor = 'default';
      }}
    >
      {/* 3D Slab */}
      <mesh>
        <boxGeometry args={[5.6, 1.3, 1.2]} />
        <meshStandardMaterial
          color={slabColor}
          roughness={0.3}
          metalness={0.6}
          emissive={new THREE.Color(color)}
          emissiveIntensity={isSelected ? 0.7 : isHovered ? 0.45 : 0.15}
        />
      </mesh>

      {/* Wireframe border */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(5.6, 1.3, 1.2)]} />
        <lineBasicMaterial
          color={color}
          linewidth={isSelected || isHovered ? 2 : 1}
          transparent
          opacity={isSelected || isHovered ? 1.0 : 0.4}
        />
      </lineSegments>

      {/* Layer Number & Type Label */}
      <Text
        position={[-2.4, 0.2, 0.65]}
        fontSize={0.32}
        color="#ffffff"
        fontWeight={700}
        anchorX="left"
      >
        L{String(layer.index).padStart(2, '0')}
      </Text>

      <Text
        position={[-1.3, 0.2, 0.65]}
        fontSize={0.24}
        color={isGlobal ? "#f3e8ff" : "#e0f2fe"}
        fontWeight={600}
        anchorX="left"
      >
        {isGlobal ? "GLOBAL (NoPE)" : "LOCAL (Half-RoPE)"}
      </Text>

      {/* Layer Specs Sub-label */}
      <Text
        position={[-2.4, -0.28, 0.65]}
        fontSize={0.19}
        color={isHovered ? "#38bdf8" : "#cbd5e1"}
        anchorX="left"
      >
        {isHovered
          ? "🔍 Click to isolate layer"
          : isGlobal
          ? "6 KV · Full Causal · MoE 384"
          : "12 KV · 2048w · MoE 384"}
      </Text>
    </group>
  );
};

export const MacroTowerView: React.FC<MacroTowerViewProps> = ({
  layers,
  selectedLayerIndex,
  onSelectLayer,
}) => {
  return (
    <group position={[0, 0, 0]}>

      {/* Grid of 48 Layers */}
      {layers.map((layer) => {
        const groupIdx = Math.floor(layer.index / 4);
        const withinGroup = layer.index % 4;

        // Arrange by 4 columns (one for each layer in the quad group!)
        // Col 0: Local 1, Col 1: Local 2, Col 2: Local 3, Col 3: Global!
        const col = withinGroup; // 0, 1, 2, 3
        const row = groupIdx;    // 0 to 11

        const x = (col - 1.5) * 6.5;
        const y = 10 - row * 1.8;
        const z = 0;

        const isSelected = layer.index === selectedLayerIndex;

        return (
          <MacroLayerSlab
            key={layer.index}
            layer={layer}
            x={x}
            y={y}
            z={z}
            isSelected={isSelected}
            onSelectLayer={onSelectLayer}
          />
        );
      })}
    </group>
  );
};
