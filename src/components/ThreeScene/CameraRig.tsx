import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

interface CameraRigProps {
  cameraPos: [number, number, number];
  cameraFocus: [number, number, number];
  autoFollow: boolean;
  onUserInteract?: () => void;
  resetTrigger?: number;
  cameraMode?: 'perspective' | 'orthographic';
}

export const CameraRig: React.FC<CameraRigProps> = ({
  cameraPos,
  cameraFocus,
  autoFollow,
  onUserInteract,
  resetTrigger,
  cameraMode,
}) => {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();

  const targetVec = useRef(new THREE.Vector3(...cameraFocus));
  const posVec = useRef(new THREE.Vector3(...cameraPos));
  const isTransitioning = useRef(false);
  const userInteracting = useRef(false);

  // Trigger smooth transition when target coordinates change or autoFollow is activated
  useEffect(() => {
    targetVec.current.set(...cameraFocus);
    posVec.current.set(...cameraPos);
    if (autoFollow) {
      isTransitioning.current = true;
    }
  }, [
    cameraPos[0],
    cameraPos[1],
    cameraPos[2],
    cameraFocus[0],
    cameraFocus[1],
    cameraFocus[2],
    autoFollow,
  ]);

  // Unconditional forced reset when resetTrigger increments
  useEffect(() => {
    if (resetTrigger === undefined) return;
    targetVec.current.set(...cameraFocus);
    posVec.current.set(...cameraPos);
    userInteracting.current = false;
    isTransitioning.current = true;
  }, [resetTrigger, cameraFocus, cameraPos]);

  useFrame((_, delta) => {
    if (!controlsRef.current) return;

    // Interpolate smoothly to target position and focus
    if ((autoFollow || isTransitioning.current) && isTransitioning.current && !userInteracting.current) {
      const posDist = camera.position.distanceTo(posVec.current);
      const targetDist = controlsRef.current.target.distanceTo(targetVec.current);

      if (posDist < 0.05 && targetDist < 0.05) {
        // Arrived at target! Snap precisely and allow free orbit
        camera.position.copy(posVec.current);
        controlsRef.current.target.copy(targetVec.current);
        controlsRef.current.update();
        isTransitioning.current = false;
      } else {
        const lerpFactor = Math.min(delta * 4.5, 0.18);
        camera.position.lerp(posVec.current, lerpFactor);
        controlsRef.current.target.lerp(targetVec.current, lerpFactor);
        controlsRef.current.update();
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      maxPolarAngle={Math.PI / 2 - 0.08} // ~85.4°, strictly prevents grazing ground and underground views
      minPolarAngle={0.05}               // ~2.9°, prevents gimbal lock while fully enabling clean top-down view
      minDistance={5}
      maxDistance={80}
      onStart={() => {
        // As soon as user begins mouse/touch interaction, disable auto-transition immediately!
        userInteracting.current = true;
        isTransitioning.current = false;
        onUserInteract?.();
      }}
      onEnd={() => {
        userInteracting.current = false;
      }}
    />
  );
};
