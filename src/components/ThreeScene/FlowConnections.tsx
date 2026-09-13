import React, { useRef, useMemo, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { ScreenSpaceBillboard } from './ScreenSpaceBillboard';

export interface FlowContextValue {
  speedMultiplier: number;
  densityMultiplier: number;
  isBurstActive?: boolean;
}

export const FlowContext = React.createContext<FlowContextValue>({
  speedMultiplier: 0.5,
  densityMultiplier: 1.0,
  isBurstActive: false,
});

export const FlowProvider: React.FC<{
  speedMultiplier?: number;
  densityMultiplier?: number;
  isBurstActive?: boolean;
  children: React.ReactNode;
}> = ({ speedMultiplier = 0.5, densityMultiplier = 1.0, isBurstActive = false, children }) => {
  const value = useMemo(
    () => ({ speedMultiplier, densityMultiplier, isBurstActive }),
    [speedMultiplier, densityMultiplier, isBurstActive]
  );
  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
};

export interface FlowConnectionProps {
  from: [number, number, number];
  to: [number, number, number];
  color?: string;
  isHighlighted?: boolean;
  isResidual?: boolean;
  curveHeight?: number;
  particleCount?: number;
  speed?: number;
  speedMultiplier?: number;
  densityMultiplier?: number;
  label?: string;
  tubeRadius?: number;
  showImpact?: boolean;
  reverse?: boolean;
}

export type PortDirection = 'left' | 'right' | 'top' | 'bottom' | 'front' | 'back';

export function getNodePort(
  position: [number, number, number],
  size: [number, number, number],
  direction: PortDirection,
  offset: number = 0.03
): [number, number, number] {
  const [x, y, z] = position;
  const [w, h, d] = size;
  switch (direction) {
    case 'left': return [x - w / 2 - offset, y, z];
    case 'right': return [x + w / 2 + offset, y, z];
    case 'top': return [x, y + h / 2 + offset, z];
    case 'bottom': return [x, y - h / 2 - offset, z];
    case 'front': return [x, y, z + d / 2 + offset];
    case 'back': return [x, y, z - d / 2 - offset];
  }
}

export function getOperatorPort(
  position: [number, number, number],
  direction: 'left' | 'right' | 'top' | 'bottom' | 'front' | 'back',
  offset: number = 0.03,
  radius: number = 0.52
): [number, number, number] {
  const [x, y, z] = position;
  const r = radius + offset;
  switch (direction) {
    case 'left': return [x - r, y, z];
    case 'right': return [x + r, y, z];
    case 'top': return [x, y + r, z];
    case 'bottom': return [x, y - r, z];
    case 'front': return [x, y, z + 0.1 + offset];
    case 'back': return [x, y, z - 0.1 - offset];
  }
}

export const FlowConnection: React.FC<FlowConnectionProps> = ({
  from,
  to,
  color = '#38bdf8',
  isHighlighted = false,
  isResidual = false,
  curveHeight = 0,
  particleCount,
  speed: customSpeed,
  speedMultiplier: propSpeedMultiplier,
  densityMultiplier: propDensityMultiplier,
  label,
  tubeRadius: customTubeRadius,
  showImpact = true,
  reverse = false,
}) => {
  const context = React.useContext(FlowContext);
  const effectiveSpeedMultiplier = propSpeedMultiplier ?? context.speedMultiplier ?? 0.5;
  const effectiveDensityMultiplier = propDensityMultiplier ?? context.densityMultiplier ?? 1.0;

  const instancedRef = useRef<THREE.InstancedMesh>(null);
  const impactRef = useRef<THREE.Mesh>(null);
  const tubeMatRef = useRef<THREE.MeshStandardMaterial>(null);

  const [isHovered, setIsHovered] = useState(false);

  // Generate 3D curve with natural arch
  const { curve, linePoints, midPoint, distance } = useMemo(() => {
    const start = new THREE.Vector3(...(reverse ? to : from));
    const end = new THREE.Vector3(...(reverse ? from : to));
    const dist = start.distanceTo(end);

    // Degeneracy guard: avoid generating invalid curves when start and end coincide
    if (dist < 0.001) {
      return { curve: null as unknown as THREE.QuadraticBezierCurve3, linePoints: [] as THREE.Vector3[], midPoint: start, distance: 0 };
    }

    // Calculate midpoint with smooth arched trajectory
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

    if (isResidual) {
      // Filleted Orthogonal Manhattan Residual Bus:
      // Rises vertically, turns 90° with fillet, runs horizontal parallel to pipeline, turns 90° down into target
      const yBus = Math.max(start.y, end.y) + (curveHeight ? Math.min(curveHeight, 12.0) : 1.4);
      const zBus = start.z;
      const r = 0.35; // Fillet corner radius
      
      const p0 = start.clone();
      const p1 = new THREE.Vector3(start.x, yBus - r, zBus);
      const c1 = new THREE.Vector3(start.x, yBus, zBus);
      const p2 = new THREE.Vector3(start.x + r, yBus, zBus);
      const p3 = new THREE.Vector3(end.x - r, yBus, zBus);
      const c2 = new THREE.Vector3(end.x, yBus, zBus);
      const p4 = new THREE.Vector3(end.x, yBus - r, zBus);
      const p5 = end.clone();

      const path = new THREE.CurvePath<THREE.Vector3>();
      if (p0.distanceTo(p1) > 0.01) path.add(new THREE.LineCurve3(p0, p1));
      path.add(new THREE.QuadraticBezierCurve3(p1, c1, p2));
      if (p2.distanceTo(p3) > 0.01) path.add(new THREE.LineCurve3(p2, p3));
      path.add(new THREE.QuadraticBezierCurve3(p3, c2, p4));
      if (p4.distanceTo(p5) > 0.01) path.add(new THREE.LineCurve3(p4, p5));

      const pts = path.getPoints(64);
      const mid = new THREE.Vector3((start.x + end.x) * 0.5, yBus, zBus);
      return { curve: path as THREE.Curve<THREE.Vector3>, linePoints: pts, midPoint: mid, distance: dist };
    }

    if (curveHeight !== undefined && curveHeight !== 0) {
      // Explicit curveHeight passed (supports positive convex arch and negative drop)
      mid.y += curveHeight;
    } else {
      // Adaptive direction analysis between start and end points
      const deltaY = end.y - start.y;
      const deltaZ = end.z - start.z;
      const deltaX = end.x - start.x;
      const magnitude = Math.min(0.8, Math.max(0.25, dist * 0.15));

      if (deltaY > 0.3) {
        // Moving upward: control point curves upward
        mid.y += magnitude;
      } else if (deltaY < -0.3) {
        // Moving downward: control point arches downward for natural sagging arc
        mid.y -= magnitude;
      } else {
        // Near-horizontal trajectory (|deltaY| <= 0.3)
        if (Math.abs(deltaZ) > 0.6) {
          if (Math.abs(deltaX) < 0.2) {
            // Collinear lateral arch: Z-axis is primary trajectory with near-collinear X; offset on X-axis creates true 3D side curve
            mid.x += magnitude * 0.5;
          } else {
            // Smooth lateral arch along Z-axis (avoids intersecting front plane)
            mid.z += (deltaZ > 0 ? 1 : -1) * magnitude * 0.6;
          }
        } else {
          // Z-axis is flat as well, retain subtle curve
          mid.y += 0.08;
        }
      }
    }

    const c = new THREE.QuadraticBezierCurve3(start, mid, end);
    const pts = c.getPoints(40);
    return { curve: c as THREE.Curve<THREE.Vector3>, linePoints: pts, midPoint: mid, distance: dist };
  }, [from, to, isResidual, curveHeight, reverse]);

  // Dynamic particle count: more particles for long or highlighted connections
  const actualParticleCount = useMemo(() => {
    const mult = effectiveDensityMultiplier;
    if (particleCount) return Math.max(2, Math.round(particleCount * mult));
    if (isResidual) return Math.max(22, Math.round(distance * 2.0 * mult));
    return Math.max(6, Math.round((isHighlighted ? 14 : 9) * mult));
  }, [particleCount, isResidual, isHighlighted, effectiveDensityMultiplier, distance]);

  const baseColor = isResidual ? '#fb7185' : color;

  // Tube geometry for glowing conduit sheath
  const tubeRadius =
    customTubeRadius ||
    (isResidual
      ? (isHighlighted ? 0.062 : 0.045)
      : (isHighlighted ? 0.048 : 0.032));
  const tubeGeometry = useMemo(() => {
    if (!curve) return new THREE.BufferGeometry();
    return new THREE.TubeGeometry(curve, isResidual ? 64 : 36, tubeRadius, 8, false);
  }, [curve, tubeRadius, isResidual]);

  // Core fiber line for crisp definition
  const lineObject = useMemo(() => {
    const geom = new THREE.BufferGeometry().setFromPoints(linePoints);
    const mat = new THREE.LineBasicMaterial({
      color: isHighlighted ? '#ffffff' : baseColor,
      transparent: true,
      opacity: isHighlighted ? 0.95 : (isResidual ? 0.82 : 0.60),
      linewidth: isHighlighted ? 2 : 1,
    });
    return new THREE.Line(geom, mat);
  }, [linePoints, baseColor, isHighlighted, isResidual]);

  // Orientation helper for impact ring
  const impactQuaternion = useMemo(() => {
    if (!curve) return new THREE.Quaternion();
    const tangent = curve.getTangent(1.0);
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
    return q;
  }, [curve]);

  // Dummy object for instanced particle transforms
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Frame animation loop for photon stream and ripples
  useFrame((state) => {
    if (!curve) return;
    const clockTime = state.clock.getElapsedTime();
    const baseSpeed = (customSpeed || (isHighlighted ? 0.75 : 0.38)) * effectiveSpeedMultiplier;
    const travelTime = clockTime * baseSpeed;

    // 1. Glowing conduit sheath
    if (tubeMatRef.current) {
      const burstBoost = context.isBurstActive ? 0.8 : 0.0;
      const pulse = 0.5 + 0.5 * Math.sin(clockTime * (isHighlighted ? 4.5 : 2.2));
      tubeMatRef.current.emissiveIntensity =
        (isHighlighted
          ? 1.4 + 0.6 * pulse
          : (isResidual ? 0.85 : 0.55) + 0.25 * pulse) + burstBoost;
      tubeMatRef.current.opacity = Math.min(
        1.0,
        (isHighlighted
          ? 0.75 + 0.15 * pulse
          : (isResidual ? 0.46 : 0.32) + 0.15 * pulse) + burstBoost * 0.3
      );
    }

    // 2. Continuous uniform micro-particle dataflow stream
    if (instancedRef.current) {
      const count = Math.max(1, actualParticleCount);
      const baseS = isResidual
        ? (isHighlighted ? 0.068 : 0.052)
        : (isHighlighted ? 0.055 : 0.040);
      for (let i = 0; i < actualParticleCount; i++) {
        // Spaced evenly along the curve: offset = i / actualParticleCount
        const offset = i / count;
        const t = (travelTime + offset) % 1;
        const pt = curve.getPointAt(t);

        dummy.position.copy(pt);

        // Uniform, delicate particle size with smooth fade at endpoints
        const env = Math.sin(t * Math.PI);
        const s = Math.max(0.0001, baseS * env);

        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        instancedRef.current.setMatrixAt(i, dummy.matrix);
      }
      instancedRef.current.instanceMatrix.needsUpdate = true;
    }

    // 3. Impact Ripple at the target node
    if (impactRef.current) {
      const ripplePhase = (travelTime * 2.5) % 1;
      const rippleScale = 0.8 + ripplePhase * 1.6;
      impactRef.current.scale.set(rippleScale, rippleScale, rippleScale);
      
      const mat = impactRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = (1.0 - ripplePhase) * (isHighlighted ? 0.75 : 0.35);
      }
    }
  });

  if (!curve) return null;

  const destPos = reverse ? from : to;

  return (
    <group>
      {/* Outer Glowing Energy Conduit (Tube) */}
      <mesh
        geometry={tubeGeometry}
        onPointerOver={(e) => {
          e.stopPropagation();
          setIsHovered(true);
        }}
        onPointerOut={() => {
          setIsHovered(false);
        }}
      >
        <meshStandardMaterial
          ref={tubeMatRef}
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={isHighlighted ? 1.0 : (isHovered ? 0.7 : (isResidual ? 0.5 : 0.3))}
          transparent={true}
          opacity={isHighlighted ? 0.7 : (isHovered ? 0.5 : (isResidual ? 0.4 : 0.28))}
          roughness={0.25}
          metalness={0.15}
          depthWrite={false}
        />
      </mesh>

      {/* Inner Crisp Optical Core Fiber */}
      <primitive object={lineObject} />

      {/* Continuous Uniform Micro-Particle Stream */}
      <instancedMesh
        ref={instancedRef}
        args={[undefined, undefined, actualParticleCount]}
      >
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial
          color={baseColor}
          transparent={true}
          opacity={isResidual ? (isHighlighted ? 0.95 : 0.8) : (isHighlighted ? 0.9 : 0.7)}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>

      {/* Target Arrival Impact Wave Ring */}
      {showImpact && (
        <mesh
          ref={impactRef}
          position={destPos}
          quaternion={impactQuaternion}
        >
          <ringGeometry args={[0.08, 0.16, 20]} />
          <meshBasicMaterial
            color={baseColor}
            transparent={true}
            opacity={0.4}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Filtered & De-noised Floating 3D Tag: Only render if highlighted, residual, or hovered */}
      {label && (isHighlighted || isResidual || isHovered) && (
        <ScreenSpaceBillboard
          position={[midPoint.x, midPoint.y + (isResidual ? 0.38 : 0.45), midPoint.z]}
        >
          <Text
            position={[0, 0, 0.01]}
            fontSize={0.21}
            color={isHighlighted ? '#ffffff' : (isResidual ? '#fb7185' : '#e2e8f0')}
            anchorX="center"
            anchorY="middle"
            fontWeight={600}
            outlineWidth={0.024}
            outlineColor="#090c13"
            outlineBlur={0.006}
          >
            {label}
          </Text>
        </ScreenSpaceBillboard>
      )}
    </group>
  );
};
