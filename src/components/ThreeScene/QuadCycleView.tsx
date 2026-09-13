import React from 'react';
import * as THREE from 'three';
import { Text, Billboard } from '@react-three/drei';
import { TensorMatrix } from './TensorMatrix';
import { OperatorNode } from './OperatorNode';
import { FlowConnection } from './FlowConnections';
import { LayerMetadata, ForwardStep } from '../../types/model';
import { ActivationData, simulateActivations } from '../../data/tokenSimulation';

interface QuadCycleViewProps {
  groupLayers: LayerMetadata[];
  activeLayerIndex: number;
  activeStep: ForwardStep;
  activationData: ActivationData;
  onSelectLayer: (index: number) => void;
  onHoverItem: (id: string | null) => void;
  onClickItem: (id: string) => void;
  onHoverCell?: (cellInfo: any) => void;
  inspectedId: string | null;
  hoveredItemId?: string | null;
}

interface QuadLayerEnclosureProps {
  layer: LayerMetadata;
  isSelected: boolean;
  onSelectLayer: (index: number) => void;
}

const QuadLayerEnclosure: React.FC<QuadLayerEnclosureProps> = ({
  layer,
  isSelected,
  onSelectLayer,
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const isGlobal = layer.isGlobal;
  const borderColor = isGlobal ? '#a855f7' : '#38bdf8';

  return (
    <>
      {/* 3D Bounding Card / Enclosure for this Layer */}
      <mesh
        position={[4, 1.5, 0]}
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
        <boxGeometry args={[26, 7, 10]} />
        <meshStandardMaterial
          color={
            isSelected
              ? isGlobal ? '#3b0764' : '#082f49'
              : isHovered
              ? isGlobal ? '#2e1065' : '#0c4a6e'
              : '#0b0f19'
          }
          transparent
          opacity={isSelected ? 0.45 : isHovered ? 0.35 : 0.18}
          roughness={0.8}
        />
      </mesh>

      {/* Layer Boundary Wireframe */}
      <lineSegments position={[4, 1.5, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(26, 7, 10)]} />
        <lineBasicMaterial
          color={borderColor}
          transparent
          opacity={isSelected || isHovered ? 0.95 : 0.3}
          linewidth={isSelected || isHovered ? 2 : 1}
        />
      </lineSegments>

      {/* Layer Header in 3D with Billboard & Dark Card */}
      <Billboard follow={true} position={[-2.5, 4.8, -4]}>
        <Text
          position={[-5.3, 0.15, 0.01]}
          fontSize={0.52}
          color={isGlobal ? "#d8b4fe" : "#7dd3fc"}
          fontWeight={700}
          anchorX="left"
          outlineWidth={0.024}
          outlineColor="#090c13"
          outlineBlur={0.006}
        >
          Layer {layer.index} — {isGlobal ? 'GLOBAL LAYER' : 'LOCAL LAYER'}
        </Text>
        <Text
          position={[-5.3, -0.32, 0.01]}
          fontSize={0.26}
          color={isGlobal ? "#c084fc" : "#38bdf8"}
          anchorX="left"
          outlineWidth={0.024}
          outlineColor="#090c13"
          outlineBlur={0.006}
        >
          {isGlobal
            ? '[⚡ 6 KV Heads (-50% Cache) | 100% NoPE | 🌐 Full Causal]'
            : '[12 KV Heads | Half-RoPE (64d) | Sliding Window (2048)]'}
        </Text>
      </Billboard>

      {/* Click to Focus / Isolate Tag */}
      <group
        position={[13, 4.5, -4]}
        onClick={(e) => {
          e.stopPropagation();
          onSelectLayer(layer.index);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setIsHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setIsHovered(false);
          document.body.style.cursor = 'default';
        }}
      >
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[5.4, 0.85]} />
          <meshBasicMaterial
            color={
              isGlobal
                ? isHovered ? '#9333ea' : '#581c87'
                : isHovered ? '#0284c7' : '#0369a1'
            }
          />
        </mesh>
        <Text
          position={[0, 0, 0.05]}
          fontSize={0.27}
          color="#ffffff"
          fontWeight={700}
          anchorX="center"
          anchorY="middle"
        >
          🔍 Focus & Isolate Layer
        </Text>
      </group>
    </>
  );
};

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
  const layerZOffsets = [-22, -7, 8, 23];

  // Generate unique activation data for each of the 4 layers
  const layerActivations = React.useMemo(() => {
    return groupLayers.map(layer => simulateActivations(activationData.tokens, layer.index, layer.isGlobal));
  }, [groupLayers, activationData.tokens]);
  // One world-unit column represents 96 real features (same policy as MicroBlockView,
  // scaled down to fit four stacked layers side by side).
  const DIM_W = 0.035;

  return (
    <group position={[0, 0, 0]}>
      {/* Overview Group Label with Billboard & Dark Card */}
      <Billboard follow={true} position={[4, 8, -25]}>
        <Text
          position={[0, 0.12, 0.01]}
          fontSize={0.72}
          color="#38bdf8"
          fontWeight={700}
          anchorX="center"
          outlineWidth={0.024}
          outlineColor="#090c13"
          outlineBlur={0.006}
        >
          Marin 535B: 4-Layer Cycle (3 Local Sliding + 1 Global Causal)
        </Text>
        <Text
          position={[0, -0.48, 0.01]}
          fontSize={0.32}
          color="#cbd5e1"
          anchorX="center"
          outlineWidth={0.024}
          outlineColor="#090c13"
          outlineBlur={0.006}
        >
          Repeating 12× over 48 layers · 36 Local (12 KV, 2048w, Half-RoPE) + 12 Global (6 KV, Full Causal, NoPE)
        </Text>
      </Billboard>

      {/* Render the 4 Layers in 3D */}
      {groupLayers.map((layer, idx) => {
        const z = layerZOffsets[idx];
        const isSelected = layer.index === activeLayerIndex;
        const isGlobal = layer.isGlobal;
        const layerData = layerActivations[idx];

        return (
          <group key={layer.index} position={[0, 0, z]}>
            <QuadLayerEnclosure
              layer={layer}
              isSelected={isSelected}
              onSelectLayer={onSelectLayer}
            />

            {/* Internal Architecture within Layer */}
            {/* 1. Pre-Attn GatedNorm */}
            <OperatorNode
              id={`l${layer.index}_gn_attn`}
              name="GatedNorm (r128)"
              symbol="GN"
              position={[-7, 1.5, 0]}
              color="#10b981"
              isHighlighted={isSelected && activeStep.activeNodeIds.includes('op_attn_gn')}
              onHover={onHoverItem}
              onHoverCell={onHoverCell}
              onClick={onClickItem}
            />

            {/* 2. QKV Matrices */}
            <TensorMatrix
              id={`l${layer.index}_q`}
              label="Q (48 Heads)"
              subLabel="dim 128"
              position={[-4.2, 3.0, -1.8]}
              size={[64 * DIM_W, 1.5, 0.4]}
              gridRows={layerData.tokens.length}
              gridCols={64}
              data={layerData.qValues}
              colorTheme="purple"
              isHighlighted={isSelected && activeStep.activeNodeIds.includes('node_q')}
              onHover={onHoverItem}
              onHoverCell={onHoverCell}
              onClick={onClickItem}
            />

            <TensorMatrix
              id={`l${layer.index}_k`}
              label={isGlobal ? "K (⚡ 6 KV Heads)" : "K (12 KV Heads)"}
              subLabel={isGlobal ? "100% NoPE · GQA 8:1" : "Half-RoPE · GQA 4:1"}
              position={[-4.2, 1.5, -1.8]}
              size={isGlobal ? [8 * DIM_W, 1.4, 0.2] : [16 * DIM_W, 1.4, 0.4]}
              gridRows={layerData.tokens.length}
              gridCols={isGlobal ? 8 : 16}
              data={layerData.kValues}
              colorTheme={isGlobal ? "purple" : "cyan"}
              isHighlighted={isSelected && activeStep.activeNodeIds.includes('node_k')}
              onHover={onHoverItem}
              onHoverCell={onHoverCell}
              onClick={onClickItem}
            />

            <TensorMatrix
              id={`l${layer.index}_v`}
              label={isGlobal ? "V (⚡ 6 KV Heads)" : "V (12 KV Heads)"}
              subLabel={isGlobal ? "⚡ GQA 8:1 (-50% Cache)" : "GQA 4:1 Cache"}
              position={[-4.2, 0.0, -1.8]}
              size={isGlobal ? [8 * DIM_W, 1.4, 0.2] : [16 * DIM_W, 1.4, 0.4]}
              gridRows={layerData.tokens.length}
              gridCols={isGlobal ? 8 : 16}
              data={layerData.vValues}
              colorTheme={isGlobal ? "purple" : "cyan"}
              isHighlighted={isSelected && activeStep.activeNodeIds.includes('node_v')}
              onHover={onHoverItem}
              onHoverCell={onHoverCell}
              onClick={onClickItem}
            />

            <OperatorNode
              id={`l${layer.index}_rope`}
              name={isGlobal ? "100% NoPE (Disabled)" : "Half-RoPE (64 RoPE + 64 NoPE)"}
              symbol={isGlobal ? "NoPE" : "RoPE"}
              position={[-2.5, 1.5, -1.5]}
              color={isGlobal ? "#6b7280" : "#0284c7"}
              isHighlighted={isSelected && activeStep.activeNodeIds.includes('op_rope')}
              onHover={onHoverItem}
              onHoverCell={onHoverCell}
              onClick={onClickItem}
            />

            {/* 3. Attention Heatmap & XSA */}
            <TensorMatrix
              id={`l${layer.index}_attn`}
              label={isGlobal ? "Full Causal Map" : "Sliding Window Map"}
              subLabel={isGlobal ? "Full Context" : "Window 2048"}
              position={[-0.8, 1.5, -1.2]}
              size={[2.0, 2.0, 0.3]}
              gridRows={layerData.tokens.length}
              gridCols={layerData.tokens.length}
              data={layerData.attnScores}
              colorTheme={isGlobal ? "purple" : "cyan"}
              isHighlighted={isSelected && activeStep.activeNodeIds.includes('node_attn_matrix')}
              onHover={onHoverItem}
              onHoverCell={onHoverCell}
              onClick={onClickItem}
            />

            <OperatorNode
              id={`l${layer.index}_xsa`}
              name="XSA Decorrelate"
              symbol="XSA"
              position={[1.5, 1.5, -1.2]}
              color="#e879f9"
              isHighlighted={isSelected && activeStep.activeNodeIds.includes('op_xsa')}
              onHover={onHoverItem}
              onHoverCell={onHoverCell}
              onClick={onClickItem}
            />

            <OperatorNode
              id={`l${layer.index}_gate`}
              name="Head Gate"
              symbol="HG"
              position={[3.0, 1.5, -0.6]}
              color="#f43f5e"
              isHighlighted={isSelected && activeStep.activeNodeIds.includes('op_head_gate')}
              onHover={onHoverItem}
              onHoverCell={onHoverCell}
              onClick={onClickItem}
            />

            {/* Attention Residual Add */}
            <OperatorNode
              id={`l${layer.index}_attn_add`}
              name="Attn Add"
              symbol="+"
              position={[4.6, 1.5, 0]}
              color="#38bdf8"
              isHighlighted={isSelected && activeStep.activeNodeIds.includes('op_attn_add')}
              onHover={onHoverItem}
              onHoverCell={onHoverCell}
              onClick={onClickItem}
            />

            {/* 1 to 2: Pre-Attn GN into QKV */}
            <FlowConnection
              from={[-6.4, 1.5, 0]}
              to={[-4.9, 1.5, -1.8]}
              color="#c084fc"
              isHighlighted={isSelected && (activeStep.activeNodeIds.includes('node_q') || activeStep.activeNodeIds.includes('node_k'))}
            />

            {/* QKV to RoPE */}
            <FlowConnection
              from={[-3.5, 1.5, -1.8]}
              to={[-2.8, 1.5, -1.5]}
              color="#c084fc"
              isHighlighted={isSelected && activeStep.activeNodeIds.includes('op_rope')}
            />

            {/* 2 to 3: RoPE into Attention Matrix */}
            <FlowConnection
              from={[-2.2, 1.5, -1.5]}
              to={[-1.9, 1.5, -1.2]}
              color="#c084fc"
              isHighlighted={isSelected && activeStep.activeNodeIds.includes('node_attn_matrix')}
            />

            {/* 3 to XSA: Attention Matrix into XSA */}
            <FlowConnection
              from={[0.3, 1.5, -1.2]}
              to={[1.1, 1.5, -1.2]}
              color="#e879f9"
              isHighlighted={isSelected && activeStep.activeNodeIds.includes('op_xsa')}
            />

            {/* XSA to Head Gate */}
            <FlowConnection
              from={[1.9, 1.5, -1.2]}
              to={[2.6, 1.5, -0.6]}
              color="#f43f5e"
              isHighlighted={isSelected && activeStep.activeNodeIds.includes('op_head_gate')}
            />

            {/* Head Gate to Attn Add */}
            <FlowConnection
              from={[3.4, 1.5, -0.6]}
              to={[4.2, 1.5, 0]}
              color="#38bdf8"
              isHighlighted={isSelected && activeStep.activeNodeIds.includes('op_attn_add')}
            />

            {/* Attention Bypass Residual */}
            <FlowConnection
              from={[-7.5, 1.5, 0]}
              to={[4.6, 1.5, 0]}
              isResidual={true}
              curveHeight={2.8}
              isHighlighted={isSelected && activeStep.id === 'attn_proj_residual'}
              label="Attn Skip [6144]"
            />

            {/* 4. Pre-MoE GatedNorm */}
            <FlowConnection
              from={[5.0, 1.5, 0]}
              to={[6.0, 1.5, 0]}
              color="#10b981"
              isHighlighted={isSelected && activeStep.activeNodeIds.includes('op_moe_gn')}
            />

            <OperatorNode
              id={`l${layer.index}_gn_moe`}
              name="Pre-MoE GN"
              symbol="GN"
              position={[6.4, 1.5, 0]}
              color="#10b981"
              isHighlighted={isSelected && activeStep.activeNodeIds.includes('op_moe_gn')}
              onHover={onHoverItem}
              onHoverCell={onHoverCell}
              onClick={onClickItem}
            />

            {/* Pre-MoE GN Branches: A to Router, B to Latent Down */}
            <FlowConnection
              from={[6.8, 1.5, 0]}
              to={[8.1, 3.2, 1.5]}
              color="#f59e0b"
              isHighlighted={isSelected && activeStep.activeNodeIds.includes('node_router')}
            />
            <FlowConnection
              from={[6.8, 1.5, 0]}
              to={[8.1, 0.5, -1.5]}
              color="#38bdf8"
              isHighlighted={isSelected && activeStep.activeNodeIds.includes('node_latent_down')}
              label="Compress 50%"
            />

            {/* 5. LatentMoE Router + 8 Experts + 2 Shared */}
            <TensorMatrix
              id={`l${layer.index}_router`}
              label="Router (QB)"
              subLabel="Top-8 / 384"
              position={[9.0, 3.2, 1.5]}
              size={[1.6, 1.4, 0.4]}
              gridRows={layerData.tokens.length}
              gridCols={16}
              colorTheme="amber"
              isHighlighted={isSelected && activeStep.activeNodeIds.includes('node_router')}
              onHover={onHoverItem}
              onHoverCell={onHoverCell}
              onClick={onClickItem}
            />

            {/* Router to 8 Routed Experts: Top-8 Gating Beam */}
            <FlowConnection
              from={[9.9, 3.2, 1.5]}
              to={[11.4, 0.5, -1.5]}
              color="#f59e0b"
              isHighlighted={isSelected && activeStep.activeNodeIds.includes('node_experts_routed')}
              label="Top-8 Dispatch"
            />

            <TensorMatrix
              id={`l${layer.index}_latent`}
              label="Latent 3072"
              subLabel="Down-Proj 50% Comms"
              position={[9.0, 0.5, -1.5]}
              size={[32 * DIM_W, 1.4, 0.4]}
              gridRows={layerData.tokens.length}
              gridCols={32}
              data={layerData.latentDown}
              colorTheme="blue"
              isHighlighted={isSelected && activeStep.activeNodeIds.includes('node_latent_down')}
              onHover={onHoverItem}
              onHoverCell={onHoverCell}
              onClick={onClickItem}
            />

            {/* Latent to Routed Experts; Full-Width mlp_in to Shared Experts */}
            <FlowConnection
              from={[9.9, 0.5, -1.5]}
              to={[11.4, 0.5, -1.5]}
              color="#38bdf8"
              isHighlighted={isSelected && activeStep.activeNodeIds.includes('node_experts_routed')}
            />
            <FlowConnection
              from={[6.8, 1.5, -0.4]}
              to={[11.5, 3.2, 1.5]}
              color="#10b981"
              curveHeight={2.4}
              isHighlighted={isSelected && activeStep.activeNodeIds.includes('node_experts_shared')}
              label="Full Width [6144]"
            />

            <TensorMatrix
              id={`l${layer.index}_routed`}
              label="8 Routed (SwiGLU)"
              subLabel="Width 3072"
              position={[12.5, 0.5, -1.5]}
              size={[32 * DIM_W, 1.5, 0.5]}
              gridRows={8}
              gridCols={32}
              colorTheme="amber"
              isHighlighted={isSelected && activeStep.activeNodeIds.includes('node_experts_routed')}
              onHover={onHoverItem}
              onHoverCell={onHoverCell}
              onClick={onClickItem}
            />

            <TensorMatrix
              id={`l${layer.index}_shared`}
              label="2 Shared Experts"
              subLabel="6144 → 3072 → 6144 (each)"
              position={[12.5, 3.2, 1.5]}
              size={[64 * DIM_W, 1.4, 0.5]}
              gridRows={layerData.tokens.length}
              gridCols={64}
              data={layerData.sharedExpert1}
              colorTheme="emerald"
              isHighlighted={isSelected && activeStep.activeNodeIds.includes('node_experts_shared')}
              onHover={onHoverItem}
              onHoverCell={onHoverCell}
              onClick={onClickItem}
            />

            {/* Experts to MoE Merge */}
            <FlowConnection
              from={[13.6, 0.5, -1.5]}
              to={[15.1, 1.5, 0]}
              color="#f59e0b"
              isHighlighted={isSelected && activeStep.activeNodeIds.includes('op_moe_add')}
            />
            <FlowConnection
              from={[13.6, 3.2, 1.5]}
              to={[15.1, 1.5, 0]}
              color="#10b981"
              isHighlighted={isSelected && activeStep.activeNodeIds.includes('op_moe_add')}
            />

            {/* MoE Bypass Residual */}
            <FlowConnection
              from={[6.8, 1.5, 0]}
              to={[15.6, 1.5, 0]}
              isResidual={true}
              curveHeight={2.8}
              isHighlighted={isSelected && activeStep.id === 'moe_aggregation_residual'}
              label="MoE Skip [6144]"
            />

            {/* MoE Merge Node */}
            <OperatorNode
              id={`l${layer.index}_moe_add`}
              name="MoE Merge"
              symbol="+"
              position={[15.6, 1.5, 0]}
              color="#f59e0b"
              isHighlighted={isSelected && activeStep.activeNodeIds.includes('op_moe_add')}
              onHover={onHoverItem}
              onHoverCell={onHoverCell}
              onClick={onClickItem}
            />

            {/* Merge to Output */}
            <FlowConnection
              from={[16.0, 1.5, 0]}
              to={[16.9, 1.5, 0]}
              color={isGlobal ? "#c084fc" : "#38bdf8"}
              isHighlighted={isSelected}
            />

            {/* Output of this layer */}
            <TensorMatrix
              id={`l${layer.index}_out`}
              label={`L${layer.index} Output`}
              subLabel={`[${layerData.tokens.length}, 6144]`}
              position={[17.5, 1.5, 0]}
              size={[64 * DIM_W, 2.4, 0.4]}
              gridRows={layerData.tokens.length}
              gridCols={64}
              colorTheme={isGlobal ? "purple" : "cyan"}
              isHighlighted={isSelected}
              onHover={onHoverItem}
              onHoverCell={onHoverCell}
              onClick={onClickItem}
            />
          </group>
        );
      })}

      {/* Inter-Layer Connection Tubes */}
      {[0, 1, 2].map((idx) => {
        const fromZ = layerZOffsets[idx];
        const toZ = layerZOffsets[idx + 1];
        return (
          <group key={`link_${idx}`}>
            <FlowConnection
              from={[18.1, 1.5, fromZ]}
              to={[-7.4, 1.5, toZ]}
              color="#38bdf8"
              curveHeight={2.6}
              particleCount={16}
              speed={0.5}
              isHighlighted={true}
              label={`L${idx}→L${idx+1} Stream [6144]`}
            />
            <Text
              position={[5, 4.2, (fromZ + toZ) / 2]}
              fontSize={0.28}
              color="#38bdf8"
              anchorX="center"
              outlineWidth={0.03}
              outlineColor="#05070c"
            >
              Residual Stream [6144] →
            </Text>
          </group>
        );
      })}
    </group>
  );
};
