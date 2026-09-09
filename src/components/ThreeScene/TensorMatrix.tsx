import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import { HoveredCellInfo } from '../UI/CellHoverHUD';
import { ScreenSpaceBillboard } from './ScreenSpaceBillboard';

interface TensorMatrixProps {
  id: string;
  label: string;
  subLabel?: string;
  position: [number, number, number];
  size: [number, number, number]; // width, height, depth
  gridRows: number;
  gridCols: number;
  data?: number[][]; // 2D values [rows, cols]
  colorTheme?: 'cyan' | 'purple' | 'amber' | 'emerald' | 'rose' | 'blue' | 'slate';
  isWeight?: boolean;
  isHighlighted?: boolean;
  isFocused?: boolean;
  onHover?: (id: string | null) => void;
  onClick?: (id: string) => void;
  onHoverCell?: (cellInfo: HoveredCellInfo | null) => void;
  labelYOffset?: number;
}

export const TensorMatrix: React.FC<TensorMatrixProps> = ({
  id,
  label,
  subLabel,
  position,
  size,
  gridRows,
  gridCols,
  data,
  colorTheme = 'blue',
  isWeight = false,
  isHighlighted = false,
  isFocused = false,
  onHover,
  onClick,
  onHoverCell,
  labelYOffset = 0,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Canvas texture generation with bbycroft-style checkerboard & cell lines
  const { canvas, texture } = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = Math.max(128, gridCols * 20);
    c.height = Math.max(128, gridRows * 20);
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return { canvas: c, texture: tex };
  }, [gridRows, gridCols]);

  // Redraw canvas
  useEffect(() => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    
    if (gridCols === 0 || gridRows === 0) {
      ctx.fillStyle = isWeight ? '#080c14' : '#0a0d16';
      ctx.fillRect(0, 0, w, h);
      texture.needsUpdate = true;
      return;
    }

    const cellW = w / gridCols;
    const cellH = h / gridRows;

    // Background base
    ctx.fillStyle = isWeight ? '#080c14' : '#0a0d16';
    ctx.fillRect(0, 0, w, h);

    // Color mapper with bbycroft checkerboard modulation
    const getColor = (val: number, r: number, c: number) => {
      if (val === 0 && !isWeight && gridRows === gridCols && (id.includes('attn') || id.includes('Attention') || label.includes('Attention') || label.includes('Map'))) {
        return '#060911';
      }

      const v = Math.max(-1, Math.min(1, val));
      const checker = (r + c) % 2 === 0 ? 0.88 : 1.0;

      if (isWeight) {
        // bbycroft-style weight matrices: steel/charcoal with subtle tint
        if (v >= 0) {
          const intensity = Math.floor(v * 180 * checker);
          return `rgb(${Math.floor(25 + intensity * 0.4)}, ${Math.floor(40 + intensity * 0.5)}, ${Math.floor(65 + intensity * 0.7)})`;
        } else {
          const intensity = Math.floor(-v * 160 * checker);
          return `rgb(${Math.floor(45 + intensity * 0.6)}, ${Math.floor(25 + intensity * 0.3)}, ${Math.floor(35 + intensity * 0.4)})`;
        }
      }

      if (colorTheme === 'cyan') {
        if (v >= 0) {
          const intensity = Math.floor(v * 255 * checker);
          return `rgb(${Math.floor(intensity * 0.15)}, ${Math.floor(130 + intensity * 0.49)}, ${Math.floor(190 + intensity * 0.25)})`;
        } else {
          const intensity = Math.floor(-v * 200 * checker);
          return `rgb(${Math.floor(15 + intensity * 0.3)}, ${Math.floor(25 + intensity * 0.3)}, ${Math.floor(60 + intensity * 0.5)})`;
        }
      } else if (colorTheme === 'purple') {
        if (v >= 0) {
          const intensity = Math.floor(v * 255 * checker);
          return `rgb(${Math.floor(140 + intensity * 0.45)}, ${Math.floor(75 + intensity * 0.3)}, ${Math.floor(225 + intensity * 0.12)})`;
        } else {
          const intensity = Math.floor(-v * 200 * checker);
          return `rgb(${Math.floor(40 + intensity * 0.4)}, ${Math.floor(20 + intensity * 0.2)}, ${Math.floor(70 + intensity * 0.5)})`;
        }
      } else if (colorTheme === 'amber') {
        if (v >= 0) {
          const intensity = Math.floor(v * 255 * checker);
          return `rgb(${Math.floor(225 + intensity * 0.12)}, ${Math.floor(135 + intensity * 0.45)}, ${Math.floor(30 + intensity * 0.2)})`;
        } else {
          const intensity = Math.floor(-v * 200 * checker);
          return `rgb(${Math.floor(70 + intensity * 0.5)}, ${Math.floor(35 + intensity * 0.3)}, ${Math.floor(15 + intensity * 0.2)})`;
        }
      } else if (colorTheme === 'emerald') {
        if (v >= 0) {
          const intensity = Math.floor(v * 255 * checker);
          return `rgb(${Math.floor(30 + intensity * 0.3)}, ${Math.floor(190 + intensity * 0.25)}, ${Math.floor(125 + intensity * 0.3)})`;
        } else {
          const intensity = Math.floor(-v * 200 * checker);
          return `rgb(${Math.floor(15 + intensity * 0.2)}, ${Math.floor(55 + intensity * 0.4)}, ${Math.floor(40 + intensity * 0.3)})`;
        }
      } else if (colorTheme === 'rose') {
        if (v >= 0) {
          const intensity = Math.floor(v * 255 * checker);
          return `rgb(${Math.floor(235 + intensity * 0.08)}, ${Math.floor(65 + intensity * 0.4)}, ${Math.floor(105 + intensity * 0.3)})`;
        } else {
          const intensity = Math.floor(-v * 200 * checker);
          return `rgb(${Math.floor(75 + intensity * 0.5)}, ${Math.floor(20 + intensity * 0.2)}, ${Math.floor(35 + intensity * 0.3)})`;
        }
      } else {
        // Blue
        if (v >= 0) {
          const intensity = Math.floor(v * 255 * checker);
          return `rgb(${Math.floor(50 + intensity * 0.2)}, ${Math.floor(125 + intensity * 0.45)}, ${Math.floor(230 + intensity * 0.1)})`;
        } else {
          const intensity = Math.floor(-v * 200 * checker);
          return `rgb(${Math.floor(20 + intensity * 0.2)}, ${Math.floor(35 + intensity * 0.3)}, ${Math.floor(80 + intensity * 0.5)})`;
        }
      }
    };

    // Draw cells
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        const val = data && data[r] && data[r][c] !== undefined
          ? data[r][c]
          : ((r + c) % 2 === 0 ? 0.45 : -0.35);

        ctx.fillStyle = getColor(val, r, c);
        ctx.fillRect(c * cellW + 0.5, r * cellH + 0.5, cellW - 1, cellH - 1);
      }
    }

    // Grid wireframe lines (subtle in cells, stronger at boundaries)
    ctx.strokeStyle = isHighlighted ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= gridCols; c++) {
      ctx.beginPath();
      ctx.moveTo(c * cellW, 0);
      ctx.lineTo(c * cellW, h);
      ctx.stroke();
    }
    for (let r = 0; r <= gridRows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * cellH);
      ctx.lineTo(w, r * cellH);
      ctx.stroke();
    }

    texture.needsUpdate = true;
  }, [canvas, texture, gridRows, gridCols, data, colorTheme, isWeight, isHighlighted]);

  // Pointer move handler to inspect exact cell
  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (!e.uv) return;
    const col = Math.min(gridCols - 1, Math.max(0, Math.floor(e.uv.x * gridCols)));
    const row = Math.min(gridRows - 1, Math.max(0, Math.floor((1 - e.uv.y) * gridRows)));
    const val = data && data[row] && data[row][col] !== undefined
      ? data[row][col]
      : ((row + col) % 2 === 0 ? 0.45 : -0.35);

    let specialNote = undefined;
    if (val === 0 && !isWeight && gridRows === gridCols && (id.includes('attn') || id.includes('Attention') || label.includes('Attention') || label.includes('Map'))) {
      if (col > row) {
        specialNote = '0.0000 (Strict Causal Mask)';
      } else {
        specialNote = '0.0000 (Sliding Window Masked)';
      }
    }

    onHoverCell?.({
      tensorId: id,
      tensorLabel: label,
      row,
      col,
      totalRows: gridRows,
      totalCols: gridCols,
      value: val,
      isWeight,
      specialNote,
    });
  };

  const borderColor = isHighlighted
    ? (colorTheme === 'amber' ? '#f59e0b' : colorTheme === 'emerald' ? '#10b981' : colorTheme === 'purple' ? '#818cf8' : colorTheme === 'rose' ? '#fb7185' : '#38bdf8')
    : (isWeight ? '#2e384d' : '#1e2838');

  return (
    <group position={position}>
      {/* 3D Volumetric Box */}
      <mesh
        ref={meshRef}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover?.(id);
        }}
        onPointerMove={handlePointerMove}
        onPointerOut={() => {
          onHover?.(null);
          onHoverCell?.(null);
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(id);
        }}
      >
        <boxGeometry args={size} />
        <meshStandardMaterial
          map={texture}
          roughness={isWeight ? 0.5 : 0.25}
          metalness={isWeight ? 0.4 : 0.15}
          emissive={isHighlighted ? new THREE.Color(borderColor) : new THREE.Color('#000000')}
          emissiveIntensity={isHighlighted ? 0.35 : 0}
        />
      </mesh>

      {/* 3D Edge Wireframe */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(...size)]} />
        <lineBasicMaterial
          color={borderColor}
          linewidth={isHighlighted ? 2 : 1}
          transparent
          opacity={isHighlighted ? 0.9 : 0.35}
        />
      </lineSegments>

      {/* 3D Floating Header with Distance-Compensated ScreenSpaceBillboard & High-Contrast Backdrop Pill */}
      <ScreenSpaceBillboard
        position={[0, size[1] / 2 + (subLabel ? 0.52 : 0.4) + labelYOffset, 0]}
      >
        {/* High-contrast dark pill backdrop */}
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry
            args={[
              Math.min(2.6, Math.max(1.1, Math.max(label.length, subLabel?.length || 0) * 0.105 + 0.34)),
              subLabel ? 0.52 : 0.34,
            ]}
          />
          <meshBasicMaterial
            color="#090c13"
            transparent
            opacity={0.95}
            depthWrite={true}
          />
        </mesh>
        <lineSegments position={[0, 0, 0]}>
          <edgesGeometry
            args={[
              new THREE.PlaneGeometry(
                Math.min(2.6, Math.max(1.1, Math.max(label.length, subLabel?.length || 0) * 0.105 + 0.34)),
                subLabel ? 0.52 : 0.34
              ),
            ]}
          />
          <lineBasicMaterial
            color={isHighlighted ? borderColor : '#243046'}
            transparent
            opacity={0.75}
          />
        </lineSegments>

        <Text
          position={[0, subLabel ? 0.12 : 0, 0.01]}
          fontSize={0.21}
          color={isHighlighted ? '#ffffff' : '#e2e8f0'}
          anchorX="center"
          anchorY="middle"
          fontWeight={600}
        >
          {label}
        </Text>

        {subLabel && (
          <Text
            position={[0, -0.14, 0.01]}
            fontSize={0.15}
            color={isHighlighted ? '#93c5fd' : '#94a3b8'}
            anchorX="center"
            anchorY="middle"
          >
            {subLabel}
          </Text>
        )}
      </ScreenSpaceBillboard>

      {/* bbycroft-style Type Pill in 3D: [W] for Weight, [A] for Activation */}
      <mesh position={[-size[0] / 2 + 0.2, size[1] / 2 - 0.2, size[2] / 2 + 0.02]}>
        <planeGeometry args={[0.3, 0.25]} />
        <meshBasicMaterial color={isWeight ? '#243046' : '#4f46e5'} />
      </mesh>
      <Text
        position={[-size[0] / 2 + 0.2, size[1] / 2 - 0.2, size[2] / 2 + 0.04]}
        fontSize={0.14}
        color="#ffffff"
        fontWeight={700}
        anchorX="center"
        anchorY="middle"
      >
        {isWeight ? 'W' : 'A'}
      </Text>
    </group>
  );
};
