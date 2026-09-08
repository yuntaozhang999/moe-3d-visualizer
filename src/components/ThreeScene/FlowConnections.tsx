import React, { useRef, useMemo, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';

export interface FlowContextValue {
  speedMultiplier: number;
  densityMultiplier: number;
  isBurstActive?: boolean;
}

export const FlowContext = React.createContext<FlowContextValue>({
  speedMultiplier: 1.0,
  densityMultiplier: 1.0,
  isBurstActive: false,
});

export const FlowProvider: React.FC<{
  speedMultiplier?: number;
  densityMultiplier?: number;
  isBurstActive?: boolean;
  children: React.ReactNode;
}> = ({ speedMultiplier = 1.0, densityMultiplier = 1.0, isBurstActive = false, children }) => {
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

const Y_AXIS = new THREE.Vector3(0, 1, 0);

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
  const effectiveSpeedMultiplier = (propSpeedMultiplier ?? context.speedMultiplier ?? 1.0) * (context.isBurstActive ? 2.2 : 1.0);
  const effectiveDensityMultiplier = propDensityMultiplier ?? context.densityMultiplier ?? 1.0;

  const instancedRef = useRef<THREE.InstancedMesh>(null);
  const leadPacketRef = useRef<THREE.Mesh>(null);
  const impactRef = useRef<THREE.Mesh>(null);
  const tubeMatRef = useRef<THREE.MeshStandardMaterial>(null);

  const [isHovered, setIsHovered] = useState(false);

  // Dynamic particle count: more particles for long or highlighted connections
  const actualParticleCount = useMemo(() => {
    const mult = effectiveDensityMultiplier;
    if (particleCount) return Math.max(2, Math.round(particleCount * mult));
    if (isResidual) return Math.max(4, Math.round(14 * mult));
    return Math.max(3, Math.round((isHighlighted ? 10 : 7) * mult));
  }, [particleCount, isResidual, isHighlighted, effectiveDensityMultiplier]);
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
      // Residual connection: maintain high flying arch, supports explicit curveHeight or dynamic calculation
      mid.y += curveHeight || Math.max(2.6, dist * 0.22);
      mid.z += 0.5;
    } else if (curveHeight !== undefined && curveHeight !== 0) {
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
    return { curve: c, linePoints: pts, midPoint: mid, distance: dist };
  }, [from, to, isResidual, curveHeight, reverse]);

  const baseColor = isResidual ? '#f43f5e' : color;
  const leadColor = isHighlighted ? '#ffffff' : (isResidual ? '#ffe4e6' : '#e0f2fe');

  // Tube geometry for glowing conduit sheath
  const tubeRadius = customTubeRadius || (isHighlighted ? 0.042 : 0.024);
  const tubeGeometry = useMemo(() => {
    if (!curve) return new THREE.BufferGeometry();
    return new THREE.TubeGeometry(curve, 36, tubeRadius, 8, false);
  }, [curve, tubeRadius]);

  // Core fiber line for crisp definition
  const lineObject = useMemo(() => {
    const geom = new THREE.BufferGeometry().setFromPoints(linePoints);
    const mat = new THREE.LineBasicMaterial({
      color: isHighlighted ? '#ffffff' : baseColor,
      transparent: true,
      opacity: isHighlighted ? 0.95 : (isResidual ? 0.55 : 0.35),
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

    // 0. Conduit Tube Emissive Breathing Pulse
    if (tubeMatRef.current) {
      const burstBoost = context.isBurstActive ? 0.8 : 0.0;
      const pulse = 0.5 + 0.5 * Math.sin(clockTime * (isHighlighted ? 4.5 : 2.2));
      tubeMatRef.current.emissiveIntensity = (isHighlighted ? (0.9 + 0.5 * pulse) : (0.22 + 0.12 * pulse)) + burstBoost;
      tubeMatRef.current.opacity = Math.min(1.0, (isHighlighted ? (0.6 + 0.18 * pulse) : (isResidual ? 0.28 : 0.18)) + burstBoost * 0.3);
    }

    // 1. Lead Token Packet
    if (leadPacketRef.current) {
      const tLead = (travelTime) % 1;
      const pt = curve.getPoint(tLead);
      const tangent = curve.getTangent(tLead);

      leadPacketRef.current.position.copy(pt);
      leadPacketRef.current.quaternion.setFromUnitVectors(Y_AXIS, tangent);

      // Smooth envelope scale: swell up in middle, gracefully shrink at endpoints
      const env = Math.sin(tLead * Math.PI);
      const leadScale = (isHighlighted ? 0.14 : 0.09) * Math.pow(env, 0.4);
      leadPacketRef.current.scale.set(leadScale, leadScale * 2.2, leadScale);
    }

    // 2. Trailing Swarm Particles via InstancedMesh
    if (instancedRef.current) {
      for (let i = 0; i < actualParticleCount; i++) {
        // Staggered phase offset for stream effect
        const offset = (i + 1) / (actualParticleCount + 1);
        const t = (travelTime + offset) % 1;
        const pt = curve.getPoint(t);
        const tangent = curve.getTangent(t);

        dummy.position.copy(pt);
        dummy.quaternion.setFromUnitVectors(Y_AXIS, tangent);

        // Natural pulse and endpoint fading
        const env = Math.sin(t * Math.PI);
        // Trailing particles taper down in size along the tail
        const taper = 1.0 - (i / (actualParticleCount + 1)) * 0.45;
        const particleScale = (isHighlighted ? 0.085 : 0.055) * taper * Math.pow(env, 0.45);
        const stretch = 1.8; // elongated photons
        
        dummy.scale.set(particleScale, particleScale * stretch, particleScale);
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
          emissiveIntensity={isHighlighted ? 1.2 : (isHovered ? 0.8 : 0.3)}
          transparent={true}
          opacity={isHighlighted ? 0.65 : (isHovered ? 0.5 : (isResidual ? 0.28 : 0.18))}
          roughness={0.2}
          metalness={0.1}
          depthWrite={false}
        />
      </mesh>

      {/* Inner Crisp Optical Core Fiber */}
      <primitive object={lineObject} />

      {/* Leading High-Energy Data Packet (Head Photon) */}
      <mesh ref={leadPacketRef}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial
          color={leadColor}
          toneMapped={false}
        />
      </mesh>

      {/* Trailing Photon Swarm (Multi-Particle Stream) */}
      <instancedMesh
        ref={instancedRef}
        args={[undefined, undefined, actualParticleCount]}
      >
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial
          color={baseColor}
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
            opacity={0.5}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Filtered & De-noised Floating 3D Tag: Only render if highlighted, residual, or hovered */}
      {label && (isHighlighted || isResidual || isHovered) && (
        <Billboard
          follow={true}
          position={[midPoint.x, midPoint.y + (isResidual ? 0.72 : 0.45), midPoint.z]}
        >
          {/* Semi-transparent dark pill backdrop for ultra-high contrast */}
          <mesh position={[0, 0, -0.01]}>
            <planeGeometry args={[Math.max(1.1, label.length * 0.15 + 0.42), 0.38]} />
            <meshBasicMaterial
              color="#070a12"
              transparent
              opacity={0.94}
              depthWrite={true}
            />
          </mesh>
          <lineSegments position={[0, 0, 0]}>
            <edgesGeometry
              args={[
                new THREE.PlaneGeometry(
                  Math.max(1.1, label.length * 0.15 + 0.42),
                  0.38
                ),
              ]}
            />
            <lineBasicMaterial
              color={isHighlighted ? '#38bdf8' : (isResidual ? '#f43f5e' : '#334155')}
              transparent
              opacity={0.75}
            />
          </lineSegments>
          <Text
            position={[0, 0, 0.01]}
            fontSize={0.24}
            color={isHighlighted ? '#ffffff' : (isResidual ? '#fda4af' : '#cbd5e1')}
            anchorX="center"
            anchorY="middle"
            fontWeight={600}
          >
            {label}
          </Text>
        </Billboard>
      )}
    </group>
  );
};
