import React from 'react';
import * as THREE from 'three';
import { Text, Billboard } from '@react-three/drei';

interface OperatorNodeProps {
  id: string;
  name: string;
  symbol: string;
  position: [number, number, number];
  color?: string;
  isHighlighted?: boolean;
  onHover?: (id: string | null) => void;
  onClick?: (id: string) => void;
  onHoverCell?: (cellInfo: any) => void;
  labelPosition?: 'top' | 'bottom';
  labelOffset?: [number, number, number];
}

export const OperatorNode: React.FC<OperatorNodeProps> = ({
  id,
  name,
  symbol,
  position,
  color = '#38bdf8',
  isHighlighted = false,
  onHover,
  onClick,
  labelPosition = 'bottom',
  labelOffset,
}) => {
  return (
    <group position={position}>
      {/* 3D Cylinder / Disc Badge */}
      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover?.(id);
        }}
        onPointerOut={() => onHover?.(null)}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(id);
        }}
      >
        <cylinderGeometry args={[0.45, 0.45, 0.15, 32]} />
        <meshStandardMaterial
          color={isHighlighted ? color : '#1e293b'}
          emissive={new THREE.Color(color)}
          emissiveIntensity={isHighlighted ? 0.7 : 0.2}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>

      {/* Outer Halo Ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.52, 0.03, 16, 64]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isHighlighted ? 0.9 : 0.4}
        />
      </mesh>

      {/* Operator Symbol inside disc */}
      <Text
        position={[0, 0, 0.1]}
        fontSize={0.25}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        fontWeight={700}
      >
        {symbol}
      </Text>

      {/* Operator Name with Billboard & High-Contrast Pill Backdrop */}
      <Billboard
        follow={true}
        position={
          labelOffset
            ? labelOffset
            : labelPosition === 'top'
            ? [0, 0.72, 0]
            : [0, -0.72, 0]
        }
      >
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[Math.max(1.0, name.length * 0.14 + 0.38), 0.34]} />
          <meshBasicMaterial
            color="#080c16"
            transparent
            opacity={0.94}
            depthWrite={true}
          />
        </mesh>
        <lineSegments position={[0, 0, 0]}>
          <edgesGeometry
            args={[
              new THREE.PlaneGeometry(
                Math.max(1.0, name.length * 0.14 + 0.38),
                0.34
              ),
            ]}
          />
          <lineBasicMaterial
            color={isHighlighted ? color : '#334155'}
            transparent
            opacity={0.75}
          />
        </lineSegments>
        <Text
          position={[0, 0, 0.01]}
          fontSize={0.19}
          color={isHighlighted ? '#ffffff' : '#94a3b8'}
          anchorX="center"
          anchorY="middle"
          fontWeight={600}
        >
          {name}
        </Text>
      </Billboard>
    </group>
  );
};
