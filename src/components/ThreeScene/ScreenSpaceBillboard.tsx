import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';

export interface ScreenSpaceBillboardProps {
  position?: [number, number, number];
  referenceFrustumHeight?: number;
  minScale?: number;
  maxScale?: number;
  children: React.ReactNode;
}

/**
 * ScreenSpaceBillboard
 * Orients towards the camera while scaling based on distance so text and backdrops
 * maintain crisp, legible dimensions (effective 12~14px) regardless of viewing distance.
 */
export const ScreenSpaceBillboard: React.FC<ScreenSpaceBillboardProps> = ({
  position = [0, 0, 0],
  referenceFrustumHeight = 13.0,
  minScale = 0.55,
  maxScale = 1.55,
  children,
}) => {
  const scaleGroupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const worldPos = useRef(new THREE.Vector3());

  useFrame(() => {
    if (!scaleGroupRef.current) return;
    scaleGroupRef.current.getWorldPosition(worldPos.current);
    const dist = camera.position.distanceTo(worldPos.current);

    let scale = 1.0;
    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const fov = (camera as THREE.PerspectiveCamera).fov;
      const frustumH = 2 * dist * Math.tan((fov * Math.PI) / 360);
      scale = frustumH / referenceFrustumHeight;
    } else if ((camera as THREE.OrthographicCamera).isOrthographicCamera) {
      const ortho = camera as THREE.OrthographicCamera;
      const frustumH = (ortho.top - ortho.bottom) / (ortho.zoom || 1);
      scale = frustumH / referenceFrustumHeight;
    }

    const clamped = Math.min(maxScale, Math.max(minScale, scale));
    scaleGroupRef.current.scale.set(clamped, clamped, clamped);
  });

  return (
    <Billboard follow={true} position={position}>
      <group ref={scaleGroupRef}>
        {children}
      </group>
    </Billboard>
  );
};
