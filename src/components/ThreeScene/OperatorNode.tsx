import React from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import { ScreenSpaceBillboard } from './ScreenSpaceBillboard';

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
          color={isHighlighted ? color : '#121722'}
          emissive={new THREE.Color(color)}
          emissiveIntensity={isHighlighted ? 0.5 : 0.12}
          roughness={0.4}
          metalness={0.6}
        />
      </mesh>

      {/* Outer Halo Ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.52, 0.025, 16, 64]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isHighlighted ? 0.75 : 0.25}
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

      {/* Operator Name with Distance-Compensated ScreenSpaceBillboard & High-Contrast Pill Backdrop */}
      <ScreenSpaceBillboard
        position={
          labelOffset
            ? labelOffset
            : labelPosition === 'top'
            ? [0, 0.76, 0]
            : [0, -0.76, 0]
        }
      >
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[Math.min(2.4, Math.max(1.0, name.length * 0.105 + 0.34)), 0.34]} />
          <meshBasicMaterial
            color="#090c13"
            transparent
            opacity={0.94}
            depthWrite={true}
          />
        </mesh>
        <lineSegments position={[0, 0, 0]}>
          <edgesGeometry
            args={[
              new THREE.PlaneGeometry(
                Math.min(2.4, Math.max(1.0, name.length * 0.105 + 0.34)),
                0.34
              ),
            ]}
          />
          <lineBasicMaterial
            color={isHighlighted ? color : '#243046'}
            transparent
            opacity={0.7}
          />
        </lineSegments>
        <Text
          position={[0, 0, 0.01]}
          fontSize={0.19}
          color={isHighlighted ? '#ffffff' : '#cbd5e1'}
          anchorX="center"
          anchorY="middle"
          fontWeight={600}
        >
          {name}
        </Text>
      </ScreenSpaceBillboard>
    </group>
  );
};
