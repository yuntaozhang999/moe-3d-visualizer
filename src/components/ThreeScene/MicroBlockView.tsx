import React from 'react';
import * as THREE from 'three';
import { Text, Billboard } from '@react-three/drei';
import { TensorMatrix } from './TensorMatrix';
import { OperatorNode } from './OperatorNode';
import { FlowConnection, getNodePort, getOperatorPort } from './FlowConnections';
import { LayerMetadata, ForwardStep } from '../../types/model';
import { ActivationData } from '../../data/tokenSimulation';
import { HoveredCellInfo } from '../UI/CellHoverHUD';

interface MicroBlockViewProps {
  layer: LayerMetadata;
  activeStep: ForwardStep;
  activationData: ActivationData;
  onHoverItem: (id: string | null) => void;
  onClickItem: (id: string) => void;
  onHoverCell?: (cellInfo: HoveredCellInfo | null) => void;
  inspectedId: string | null;
  hoveredItemId?: string | null;
}

export const MicroBlockView: React.FC<MicroBlockViewProps> = ({
  layer,
  activeStep,
  activationData,
  onHoverItem,
  onClickItem,
  onHoverCell,
  inspectedId,
  hoveredItemId,
}) => {
  const isStep = (stepId: string) => activeStep.id === stepId;
  const isHighlighted = (nodeId: string) =>
    activeStep.activeNodeIds.includes(nodeId) ||
    inspectedId === nodeId ||
    hoveredItemId === nodeId;
  const isFlowActive = (stepMatch: boolean, nodeIds: string[] = []) => {
    if (stepMatch) return true;
    if (inspectedId && nodeIds.includes(inspectedId)) return true;
    if (hoveredItemId && nodeIds.includes(hoveredItemId)) return true;
    return false;
  };

  const isGlobal = layer.isGlobal;
  const kvHeads = layer.kvHeads;
  const windowLabel = isGlobal ? 'Full Causal [4096]' : 'Sliding Window [2048]';
  const ropeLabel = isGlobal ? 'NoPE (Disabled)' : 'Half-RoPE (64/128)';
  // One world-unit column represents 96 real features (6144 -> 64, 3072 -> 32, ...)
  const DIM_W = 0.05;

  return (
    <group position={[0, 0, 0]}>
      {/* 3D Ground Platform / Bounding Enclosure (bbycroft style) lowered to Y=-1.5 and expanded to [52, 0.1, 18] */}
      <mesh position={[8.5, -1.5, 0]}>
        <boxGeometry args={[52, 0.1, 18]} />
        <meshStandardMaterial color="#080b12" roughness={0.9} metalness={0.1} />
      </mesh>
      <lineSegments position={[8.5, -1.5, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(52, 0.1, 18)]} />
        <lineBasicMaterial color="#1e293b" />
      </lineSegments>

      {/* 3D Main Layer Title Banner Elevated to Sky Deck Y=11.8 */}
      <Billboard follow={true} position={[8.5, 11.8, 0]}>
        <mesh position={[0, -0.2, -0.02]}>
          <planeGeometry args={[18.5, 1.8]} />
          <meshBasicMaterial color="#080c16" transparent opacity={0.94} depthWrite={true} />
        </mesh>
        <lineSegments position={[0, -0.2, -0.01]}>
          <edgesGeometry args={[new THREE.PlaneGeometry(18.5, 1.8)]} />
          <lineBasicMaterial color={isGlobal ? "#a855f7" : "#0284c7"} transparent opacity={0.65} />
        </lineSegments>
        <Text
          position={[0, 0.25, 0.01]}
          fontSize={0.72}
          color={isGlobal ? "#d8b4fe" : "#38bdf8"}
          fontWeight={800}
          anchorX="center"
        >
          {`Layer ${layer.index} (${isGlobal ? 'GLOBAL CAUSAL' : 'LOCAL 2048w'}) — ISOLATED FOCUS`}
        </Text>
        <Text
          position={[0, -0.38, 0.01]}
          fontSize={0.28}
          color="#cbd5e1"
          anchorX="center"
        >
          {isGlobal
            ? '6 KV Heads (GQA 8:1) · Full Causal Attention · NoPE · LatentMoE 384 (Top-8 + 2 Shared)'
            : '12 KV Heads (GQA 4:1) · 2048 Sliding Window · Half-RoPE (64d) · LatentMoE 384 (Top-8 + 2 Shared)'}
        </Text>
      </Billboard>

      {/* 3D Floating Stage Titles Unified to Y=9.8 Sky Deck (2.05 safety clearance above Residual Skip Arches) */}
      {/* Stage 1: Embedding & Norm */}
      <Billboard follow={true} position={[-13.0, 9.8, 0]}>
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[4.5, 0.62]} />
          <meshBasicMaterial color="#080c16" transparent opacity={0.94} depthWrite={true} />
        </mesh>
        <lineSegments position={[0, 0, 0]}>
          <edgesGeometry args={[new THREE.PlaneGeometry(4.5, 0.62)]} />
          <lineBasicMaterial color="#0284c7" transparent opacity={0.75} />
        </lineSegments>
        <Text position={[0, 0, 0.01]} fontSize={0.34} color="#7dd3fc" fontWeight={700} anchorX="center" anchorY="middle">
          Embedding & Norm
        </Text>
      </Billboard>

      {/* Stage 2: Attention Branch (Elevated to Y=9.8, X=3.5, Z=-2.5 to completely avoid Residual Skip 1 label) */}
      <Billboard follow={true} position={[3.5, 9.8, -2.5]}>
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[7.4, 0.62]} />
          <meshBasicMaterial color="#080c16" transparent opacity={0.94} depthWrite={true} />
        </mesh>
        <lineSegments position={[0, 0, 0]}>
          <edgesGeometry args={[new THREE.PlaneGeometry(7.4, 0.62)]} />
          <lineBasicMaterial color="#9333ea" transparent opacity={0.75} />
        </lineSegments>
        <Text position={[0, 0, 0.01]} fontSize={0.34} color="#c084fc" fontWeight={700} anchorX="center" anchorY="middle">
          {`Attention Branch (${isGlobal ? 'Global Causal' : 'Local 2048w'})`}
        </Text>
      </Billboard>

      {/* Stage 3: LatentMoE Branch (Elevated to Y=9.8, X=18.5, Z=+2.2 to completely avoid MoE Residual Skip label) */}
      <Billboard follow={true} position={[18.5, 9.8, 2.2]}>
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[9.4, 0.62]} />
          <meshBasicMaterial color="#080c16" transparent opacity={0.94} depthWrite={true} />
        </mesh>
        <lineSegments position={[0, 0, 0]}>
          <edgesGeometry args={[new THREE.PlaneGeometry(9.4, 0.62)]} />
          <lineBasicMaterial color="#d97706" transparent opacity={0.75} />
        </lineSegments>
        <Text position={[0, 0, 0.01]} fontSize={0.34} color="#fbbf24" fontWeight={700} anchorX="center" anchorY="middle">
          LatentMoE Branch (384 Experts · Top-8 + 2 Shared)
        </Text>
      </Billboard>

      {/* Stage 5: Output & LM Head (Elevated to Y=9.8, X=30.5, Z=0) */}
      <Billboard follow={true} position={[30.5, 9.8, 0]}>
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[5.2, 0.62]} />
          <meshBasicMaterial color="#080c16" transparent opacity={0.94} depthWrite={true} />
        </mesh>
        <lineSegments position={[0, 0, 0]}>
          <edgesGeometry args={[new THREE.PlaneGeometry(5.2, 0.62)]} />
          <lineBasicMaterial color="#f43f5e" transparent opacity={0.75} />
        </lineSegments>
        <Text position={[0, 0, 0.01]} fontSize={0.34} color="#fb7185" fontWeight={700} anchorX="center" anchorY="middle">
          Untied LM Head (128k)
        </Text>
      </Billboard>

      {/* ========================================================
          STAGE 1: INPUT & EMBEDDING
          ======================================================== */}
      {/* Input Tokens */}
      <TensorMatrix
        id="node_tokens"
        label="Prompt Tokens"
        subLabel={`S=${activationData.tokens.length}`}
        position={[-15.2, 2.0, 0]}
        size={[1.2, 3.2, 0.6]}
        gridRows={activationData.tokens.length}
        gridCols={1}
        colorTheme="cyan"
        isHighlighted={isHighlighted('node_tokens')}
        onHover={onHoverItem}
        onClick={onClickItem}
        onHoverCell={onHoverCell}
      />

      {/* Input Tokens -> Embed Vector (precise surface docking) */}
      <FlowConnection
        from={[-14.55, 2.0, 0]}
        to={[-12.65, 2.0, 0.8]}
        color="#38bdf8"
        isHighlighted={isFlowActive(isStep('input_tokens') || isStep('token_embed'), ['node_tokens', 'node_embed'])}
        label="Token Lookup"
      />

      {/* W_embed Weight Projection Flow (X-offset 2.2 for decoupling) */}
      <FlowConnection
        from={[-13.2, 2.0, -1.35]}
        to={[-11.0, 2.0, 0.45]}
        color="#64748b"
        tubeRadius={0.018}
        particleCount={4}
        isHighlighted={isFlowActive(isStep('token_embed'), ['node_w_embed', 'node_embed'])}
      />

      {/* Token Embed Matrix W_embed (Weight) */}
      <TensorMatrix
        id="node_w_embed"
        label="W_embed (128k × 6144)"
        subLabel="Untied Embedding"
        position={[-13.2, 2.0, -1.8]}
        size={[1.4, 3.2, 0.8]}
        gridRows={activationData.tokens.length}
        gridCols={16}
        isWeight={true}
        colorTheme="slate"
        isHighlighted={isHighlighted('node_w_embed') || isHighlighted('node_embed')}
        onHover={onHoverItem}
        onClick={onClickItem}
        onHoverCell={onHoverCell}
      />

      {/* Embed Activation Vector */}
      <TensorMatrix
        id="node_embed"
        label="Embed Vector"
        subLabel={`S × 6144 (shown ${activationData.tokens.length} × 64)`}
        position={[-11.0, 2.0, 0.8]}
        size={[64 * DIM_W, 3.2, 0.6]}
        gridRows={activationData.tokens.length}
        gridCols={64}
        data={activationData.embeddings}
        colorTheme="cyan"
        isHighlighted={isHighlighted('node_embed')}
        onHover={onHoverItem}
        onClick={onClickItem}
        onHoverCell={onHoverCell}
      />

      {/* Embed Vector -> Embed GatedNorm */}
      <FlowConnection
        from={[-9.35, 2.0, 0.8]}
        to={[-9.45, 2.0, 0]}
        color="#10b981"
        isHighlighted={isFlowActive(isStep('token_embed') || isStep('embed_gated_norm'), ['node_embed', 'op_embed_gn'])}
      />

      <OperatorNode
        id="op_embed_gn"
        name="Embed GatedNorm"
        symbol="GN"
        position={[-9.0, 2.0, 0]}
        color="#10b981"
        isHighlighted={isHighlighted('op_embed_gn')}
        onHover={onHoverItem}
        onClick={onClickItem}
      />

      {/* Embed GN -> Pre-Attn GN */}
      <FlowConnection
        from={[-8.5, 2.0, 0]}
        to={[-7.7, 2.0, 0]}
        color="#10b981"
        isHighlighted={isFlowActive(isStep('embed_gated_norm') || isStep('pre_attn_gated_norm'), ['op_embed_gn', 'op_attn_gn'])}
        label="Pre-Attn Stream"
      />

      {/* ========================================================
          STAGE 2: PRE-ATTENTION GATEDNORM & QKV PROJECTIONS
          ======================================================== */}
      <OperatorNode
        id="op_attn_gn"
        name="Pre-Attn GatedNorm"
        symbol="GN"
        position={[-7.2, 2.0, 0]}
        color="#10b981"
        isHighlighted={isHighlighted('op_attn_gn')}
        onHover={onHoverItem}
        onClick={onClickItem}
      />

      {/* High-Altitude Residual Bypass 1 (Attention Residual) apex Y=7.05, 2.75 clearance to banner (Y=9.8) */}
      <FlowConnection
        from={[-7.2, 2.45, 0]}
        to={[9.5, 2.45, 0]}
        isResidual={true}
        curveHeight={4.5}
        isHighlighted={isFlowActive(isStep('attn_proj_residual'), ['op_attn_gn', 'op_attn_add'])}
        label="Residual Skip 1 [6144]"
      />

      {/* W_QKV Weights projection flow (retracted to background high [-5.0, 3.6, -4.6], zero occlusion) */}
      <FlowConnection
        from={[-6.75, 2.0, 0]}
        to={[-5.75, 3.6, -4.6]}
        color="#64748b"
        tubeRadius={0.02}
        particleCount={5}
        isHighlighted={isFlowActive(isStep('pre_attn_gated_norm') || isStep('qkv_proj'), ['op_attn_gn', 'node_w_qkv'])}
      />

      {/* Q, K, V Projection Splits: precise docking to matrix left faces */}
      {/* Pre-Attn GN -> Q (upward natural arc) */}
      <FlowConnection
        from={[-6.75, 2.0, 0]}
        to={[-3.65, 4.5, -2.2]}
        color="#c084fc"
        isHighlighted={isFlowActive(isStep('qkv_proj'), ['op_attn_gn', 'node_q'])}
        label="Q (48h)"
      />
      {/* Pre-Attn GN -> K (horizontal/negative-Z with subtle side curve) */}
      <FlowConnection
        from={[-6.75, 2.0, 0]}
        to={[isGlobal ? -2.25 : -2.45, 2.0, -2.0]}
        color="#c084fc"
        isHighlighted={isFlowActive(isStep('qkv_proj'), ['op_attn_gn', 'node_k'])}
        label={`K (${kvHeads}h)`}
      />
      {/* Pre-Attn GN -> V (downward adaptive concave natural drop arc) */}
      <FlowConnection
        from={[-6.75, 2.0, 0]}
        to={[isGlobal ? -2.25 : -2.45, -0.5, -1.5]}
        color="#c084fc"
        isHighlighted={isFlowActive(isStep('qkv_proj'), ['op_attn_gn', 'node_v'])}
        label={`V (${kvHeads}h)`}
      />

      {/* W_Q, W_K, W_V Weight Matrices: retracted to background high [-5.0, 3.6, -4.6], decoupled from Q */}
      <TensorMatrix
        id="node_w_qkv"
        label="W_Q, W_K, W_V Weights"
        subLabel="[6144 × 9216]"
        position={[-5.0, 3.6, -4.6]}
        size={[1.4, 3.4, 0.8]}
        gridRows={16}
        gridCols={16}
        isWeight={true}
        colorTheme="slate"
        isHighlighted={isHighlighted('node_w_qkv') || isHighlighted('node_q')}
        onHover={onHoverItem}
        onClick={onClickItem}
        onHoverCell={onHoverCell}
        labelYOffset={0.2}
      />

      {/* Q Matrix (high tier: Y=4.5, Z=-2.2, zero occlusion and penetration) */}
      <TensorMatrix
        id="node_q"
        label="Q (Query Heads)"
        subLabel="48 Heads × 128"
        position={[-2.0, 4.5, -2.2]}
        size={[64 * DIM_W, 1.6, 0.6]}
        gridRows={activationData.tokens.length}
        gridCols={64}
        data={activationData.qValues}
        colorTheme="purple"
        isHighlighted={isHighlighted('node_q')}
        onHover={onHoverItem}
        onClick={onClickItem}
        onHoverCell={onHoverCell}
        labelYOffset={0.15}
      />

      {/* K Matrix (mid tier: Y=2.0, Z=-2.0, ample clearance below Q) */}
      <TensorMatrix
        id="node_k"
        label={`K (${kvHeads} KV Heads)`}
        subLabel={isGlobal ? "⚡ GQA 8:1 (6 KV Heads · -50% Cache)" : "GQA 4:1 (12 KV Heads)"}
        position={[-2.0, 2.0, -2.0]}
        size={isGlobal ? [8 * DIM_W, 1.3, 0.3] : [16 * DIM_W, 1.3, 0.6]}
        gridRows={activationData.tokens.length}
        gridCols={isGlobal ? 8 : 16}
        data={activationData.kValues}
        colorTheme={isGlobal ? "purple" : "cyan"}
        isHighlighted={isHighlighted('node_k')}
        onHover={onHoverItem}
        onClick={onClickItem}
        onHoverCell={onHoverCell}
        labelYOffset={0.08}
      />

      {/* V Matrix (low tier: Y=-0.5, Z=-1.5, ample clearance below K) */}
      <TensorMatrix
        id="node_v"
        label={`V (${kvHeads} KV Heads)`}
        subLabel={isGlobal ? "⚡ GQA 8:1 (6 KV Heads · -50% Cache)" : "GQA 4:1 (12 KV Heads)"}
        position={[-2.0, -0.5, -1.5]}
        size={isGlobal ? [8 * DIM_W, 1.3, 0.3] : [16 * DIM_W, 1.3, 0.6]}
        gridRows={activationData.tokens.length}
        gridCols={isGlobal ? 8 : 16}
        data={activationData.vValues}
        colorTheme={isGlobal ? "purple" : "cyan"}
        isHighlighted={isHighlighted('node_v')}
        onHover={onHoverItem}
        onClick={onClickItem}
        onHoverCell={onHoverCell}
        labelYOffset={0.08}
      />

      {/* K into ShortConv: align precisely to K center height and depth */}
      <FlowConnection
        from={[isGlobal ? -1.75 : -1.55, 2.0, -2.0]}
        to={[-1.1, 2.0, -2.0]}
        color="#38bdf8"
        isHighlighted={isFlowActive(isStep('short_conv_k'), ['node_k', 'op_sconv_k'])}
        label="ShortConv K=4"
      />

      {/* ShortConv Node: strictly aligned to [-0.6, 2.0, -2.0] */}
      <OperatorNode
        id="op_sconv_k"
        name="ShortConv (K=4)"
        symbol="SC"
        position={[-0.6, 2.0, -2.0]}
        color="#38bdf8"
        isHighlighted={isHighlighted('op_sconv_k')}
        onHover={onHoverItem}
        onClick={onClickItem}
        labelPosition="bottom"
      />

      {/* ShortConv K into RoPE (upward natural arc) */}
      <FlowConnection
        from={[-0.1, 2.0, -2.0]}
        to={[0.4, 3.1, -2.2]}
        color="#c084fc"
        isHighlighted={isFlowActive(isStep('q_k_norm_rope'), ['op_sconv_k', 'op_rope'])}
      />

      {/* Q into RoPE (downward natural arc) */}
      <FlowConnection
        from={[-0.35, 4.5, -2.2]}
        to={[0.4, 3.5, -2.2]}
        color="#c084fc"
        isHighlighted={isFlowActive(isStep('q_k_norm_rope'), ['node_q', 'op_rope'])}
        label={ropeLabel}
      />

      {/* RoPE Node: concise label Half-RoPE [64/64], prevents clipping into Score Map */}
      <OperatorNode
        id="op_rope"
        name={isGlobal ? "100% NoPE (Off)" : "Half-RoPE [64/64]"}
        symbol={isGlobal ? "NoPE" : "Half-RoPE"}
        position={[0.8, 3.3, -2.2]}
        color={isGlobal ? "#6b7280" : "#c084fc"}
        isHighlighted={isHighlighted('op_rope')}
        onHover={onHoverItem}
        onClick={onClickItem}
        labelPosition="top"
        labelOffset={[0, 0.72, 0]}
      />

      {/* RoPE (Q & K) to Attention Score Map (flow down into score matrix) */}
      <FlowConnection
        from={[1.3, 3.3, -2.2]}
        to={[2.75, 2.4, -1.8]}
        color="#c084fc"
        isHighlighted={isFlowActive(isStep('attention_weights'), ['op_rope', 'node_attn_matrix'])}
        label="Q · K^T / √d"
      />

      {/* V to Attention Score Map (fly up naturally from low tier into score matrix) */}
      <FlowConnection
        from={[isGlobal ? -1.75 : -1.55, -0.5, -1.5]}
        to={[2.75, 2.0, -1.8]}
        color="#a855f7"
        isHighlighted={isFlowActive(isStep('attention_weights') || isStep('attention_output'), ['node_v', 'node_attn_matrix'])}
        label="Attn · V"
      />

      {/* ========================================================
          STAGE 3: ATTENTION MATRIX (SOFTMAX HEATMAP), XSA & HEAD GATE
          ======================================================== */}
      {/* Attention Score Map: shifted right to [4.0, 2.2, -1.8], maintaining 0.55 clearance */}
      <TensorMatrix
        id="node_attn_matrix"
        label="Attention Score Map"
        subLabel={windowLabel}
        position={[4.0, 2.2, -1.8]}
        size={[2.4, 2.4, 0.4]}
        gridRows={activationData.tokens.length}
        gridCols={activationData.tokens.length}
        data={activationData.attnScores}
        colorTheme={isGlobal ? "purple" : "cyan"}
        isHighlighted={isHighlighted('node_attn_matrix')}
        onHover={onHoverItem}
        onClick={onClickItem}
        onHoverCell={onHoverCell}
        labelYOffset={0.12}
      />

      {/* Attn Output to XSA (right face precisely connected to operator edge) */}
      <FlowConnection
        from={[5.25, 2.2, -1.8]}
        to={[5.8, 2.2, -1.5]}
        color="#e879f9"
        isHighlighted={isFlowActive(isStep('xsa_decorrelation'), ['node_attn_matrix', 'op_xsa'])}
        label="XSA Decorr"
      />

      {/* XSA Node: placed at [6.3, 2.2, -1.5] */}
      <OperatorNode
        id="op_xsa"
        name="XSA (Decorrelate)"
        symbol="XSA"
        position={[6.3, 2.2, -1.5]}
        color="#e879f9"
        isHighlighted={isHighlighted('op_xsa')}
        onHover={onHoverItem}
        onClick={onClickItem}
        labelPosition="bottom"
      />

      {/* XSA to Head Gate */}
      <FlowConnection
        from={[6.8, 2.2, -1.5]}
        to={[7.3, 2.2, -0.8]}
        color="#f43f5e"
        isHighlighted={isFlowActive(isStep('head_gating'), ['op_xsa', 'op_head_gate'])}
        label="Gate 2·σ"
      />

      {/* Head Gate Node: placed at [7.8, 2.2, -0.8] */}
      <OperatorNode
        id="op_head_gate"
        name="Head Gate (2·σ)"
        symbol="HG"
        position={[7.8, 2.2, -0.8]}
        color="#f43f5e"
        isHighlighted={isHighlighted('op_head_gate')}
        onHover={onHoverItem}
        onClick={onClickItem}
        labelPosition="bottom"
      />

      {/* Head Gate to Attn Add */}
      <FlowConnection
        from={[8.3, 2.2, -0.8]}
        to={[9.0, 2.0, 0]}
        color="#38bdf8"
        isHighlighted={isFlowActive(isStep('attn_proj_residual'), ['op_head_gate', 'op_attn_add'])}
      />

      {/* W_O Output Projection Weight: shifted to negative-Z background [7.8, 4.4, -2.4], no Head Gate occlusion */}
      <TensorMatrix
        id="node_w_o"
        label="W_O Weight Matrix"
        subLabel="[6144 × 6144]"
        position={[7.8, 4.4, -2.4]}
        size={[1.2, 1.4, 0.6]}
        gridRows={8}
        gridCols={12}
        isWeight={true}
        colorTheme="slate"
        isHighlighted={isHighlighted('node_w_o') || isHighlighted('op_attn_add')}
        onHover={onHoverItem}
        onClick={onClickItem}
        onHoverCell={onHoverCell}
        labelYOffset={0.2}
      />

      {/* W_O Weight into Attn Add (downward natural drop arc) */}
      <FlowConnection
        from={[7.8, 3.65, -2.4]}
        to={[9.4, 2.5, 0]}
        color="#64748b"
        tubeRadius={0.02}
        particleCount={5}
        isHighlighted={isFlowActive(isStep('attn_proj_residual'), ['node_w_o', 'op_attn_add'])}
        label="W_O Proj"
      />

      {/* Attn Add Node: [9.5, 2.0, 0] */}
      <OperatorNode
        id="op_attn_add"
        name="Attn W_O + Res"
        symbol="+"
        position={[9.5, 2.0, 0]}
        color="#38bdf8"
        isHighlighted={isHighlighted('op_attn_add')}
        onHover={onHoverItem}
        onClick={onClickItem}
        labelPosition="bottom"
      />

      {/* ========================================================
          STAGE 4: PRE-MOE GATEDNORM & 384 EXPERTS + 2 SHARED
          ======================================================== */}
      <FlowConnection
        from={[10.0, 2.0, 0]}
        to={[11.3, 2.0, 0]}
        color="#10b981"
        isHighlighted={isFlowActive(isStep('attn_proj_residual') || isStep('pre_moe_gated_norm'), ['op_attn_add', 'op_moe_gn'])}
      />

      {/* Pre-MoE GatedNorm: placed at [11.8, 2.0, 0] */}
      <OperatorNode
        id="op_moe_gn"
        name="Pre-MoE GatedNorm"
        symbol="GN"
        position={[11.8, 2.0, 0]}
        color="#10b981"
        isHighlighted={isHighlighted('op_moe_gn')}
        onHover={onHoverItem}
        onClick={onClickItem}
        labelPosition="bottom"
      />

      {/* MoE Bypass Residual High Arch (from [11.8, 2.45, 0] to [25.5, 2.45, 0], apex Y=7.05, 2.75 clearance to banner) */}
      <FlowConnection
        from={[11.8, 2.45, 0]}
        to={[25.5, 2.45, 0]}
        isResidual={true}
        curveHeight={4.5}
        isHighlighted={isFlowActive(isStep('moe_aggregation_residual'), ['op_moe_gn', 'op_moe_add'])}
        label="MoE Residual Skip [6144]"
      />

      {/* Pre-MoE GN Branch A: to QB Router (+Z branch: precise connection to Router [14.0, 2.0, 3.5] left face) */}
      <FlowConnection
        from={[12.3, 2.0, 0]}
        to={[13.15, 2.0, 3.5]}
        color="#f59e0b"
        isHighlighted={isFlowActive(isStep('router_qb_selection'), ['op_moe_gn', 'node_router'])}
        label="Router In"
      />

      {/* W_router Weight Matrix: placed at [13.8, 4.6, 3.8], high background board, 0.38 vertical clearance to Router */}
      <TensorMatrix
        id="node_w_router"
        label="W_router [6144 × 384]"
        subLabel="QB Router Projection"
        position={[13.8, 4.6, 3.8]}
        size={[1.3, 1.6, 0.6]}
        gridRows={12}
        gridCols={16}
        isWeight={true}
        colorTheme="slate"
        isHighlighted={isHighlighted('node_w_router') || isHighlighted('node_router')}
        onHover={onHoverItem}
        onClick={onClickItem}
        onHoverCell={onHoverCell}
        labelYOffset={0.2}
      />

      {/* W_router Weight into Router (downward concave natural drop arc) */}
      <FlowConnection
        from={[13.8, 3.75, 3.8]}
        to={[14.0, 2.75, 3.5]}
        color="#64748b"
        tubeRadius={0.02}
        particleCount={4}
        isHighlighted={isFlowActive(isStep('router_qb_selection'), ['node_w_router', 'node_router'])}
      />

      {/* Router Logits & QB Selection (384 experts, placed at [14.0, 2.0, 3.5]) */}
      <TensorMatrix
        id="node_router"
        label="Router (Top-8 of 384)"
        subLabel="QB Threshold & Sigmoid"
        position={[14.0, 2.0, 3.5]}
        size={[1.6, 1.4, 0.5]}
        gridRows={activationData.tokens.length}
        gridCols={16}
        colorTheme="amber"
        isHighlighted={isHighlighted('node_router')}
        onHover={onHoverItem}
        onClick={onClickItem}
        onHoverCell={onHoverCell}
        labelYOffset={0.08}
      />

      {/* Router Matrix to QB Operator */}
      <FlowConnection
        from={[14.85, 2.0, 3.5]}
        to={[15.7, 2.0, 3.5]}
        color="#f59e0b"
        isHighlighted={isFlowActive(isStep('router_qb_selection'), ['node_router', 'op_router_qb'])}
      />

      {/* QB Routing Operator: placed at [16.2, 2.0, 3.5] */}
      <OperatorNode
        id="op_router_qb"
        name="QB Routing (Top 8)"
        symbol="QB"
        position={[16.2, 2.0, 3.5]}
        color="#f59e0b"
        isHighlighted={isHighlighted('op_router_qb')}
        onHover={onHoverItem}
        onClick={onClickItem}
        labelPosition="top"
      />

      {/* 2 Concurrent Shared Experts (high tier [20.5, 4.5, 2.5]) */}
      <TensorMatrix
        id="node_experts_shared"
        label="2 Shared Experts"
        subLabel="6144 → 3072 → 6144 (each)"
        position={[20.5, 4.5, 2.5]}
        size={[64 * DIM_W, 1.6, 0.6]}
        gridRows={activationData.tokens.length}
        gridCols={64}
        data={activationData.sharedExpert1}
        colorTheme="emerald"
        isHighlighted={isHighlighted('node_experts_shared')}
        onHover={onHoverItem}
        onClick={onClickItem}
        onHoverCell={onHoverCell}
        labelYOffset={0.2}
      />

      {/* Pre-MoE GN Branch B: to Latent Down (downward natural drop arc, offset to X=15.6) */}
      <FlowConnection
        from={[12.3, 2.0, 0]}
        to={[14.75, 0.5, -0.6]}
        color="#38bdf8"
        isHighlighted={isFlowActive(isStep('latent_compression'), ['op_moe_gn', 'node_latent_down'])}
        label="Compress 6144→3072"
      />

      {/* W_latent_down Weight Matrix: placed at [14.0, 0.5, -2.2] */}
      <TensorMatrix
        id="node_w_latent_down"
        label="W_latent_down [6144 × 3072]"
        subLabel="Compression Matrix"
        position={[14.0, 0.5, -2.2]}
        size={[1.4, 1.4, 0.6]}
        gridRows={12}
        gridCols={12}
        isWeight={true}
        colorTheme="slate"
        isHighlighted={isHighlighted('node_w_latent_down') || isHighlighted('node_latent_down')}
        onHover={onHoverItem}
        onClick={onClickItem}
        onHoverCell={onHoverCell}
        labelYOffset={-0.1}
      />

      {/* W_latent_down Weight into Latent Down Matrix */}
      <FlowConnection
        from={[14.0, 0.5, -1.85]}
        to={[15.6, 0.5, -0.9]}
        color="#64748b"
        tubeRadius={0.02}
        particleCount={4}
        isHighlighted={isFlowActive(isStep('latent_compression'), ['node_w_latent_down', 'node_latent_down'])}
      />

      {/* Compressed Latent Vector: shifted right to [15.6, 0.5, -0.6], fully offset from Router (X=14.0) */}
      <TensorMatrix
        id="node_latent_down"
        label="Latent Vector (3072)"
        subLabel="50% Comms Reduction"
        position={[15.6, 0.5, -0.6]}
        size={[32 * DIM_W, 1.4, 0.5]}
        gridRows={activationData.tokens.length}
        gridCols={32}
        data={activationData.latentDown}
        colorTheme="blue"
        isHighlighted={isHighlighted('node_latent_down')}
        onHover={onHoverItem}
        onClick={onClickItem}
        onHoverCell={onHoverCell}
        labelYOffset={0.1}
      />

      {/* Latent Down to Latent RMSNorm */}
      <FlowConnection
        from={[16.45, 0.5, -0.6]}
        to={[16.9, 0.5, -0.6]}
        color="#38bdf8"
        isHighlighted={isFlowActive(isStep('latent_compression'), ['node_latent_down', 'op_latent_norm'])}
        label="RMSNorm"
      />

      {/* Latent RMSNorm: placed at [17.4, 0.5, -0.6], fully offset from QB Router (X=16.2) */}
      <OperatorNode
        id="op_latent_norm"
        name="Latent RMSNorm"
        symbol="LN"
        position={[17.4, 0.5, -0.6]}
        color="#38bdf8"
        isHighlighted={isHighlighted('op_latent_norm')}
        onHover={onHoverItem}
        onClick={onClickItem}
        labelPosition="top"
      />

      {/* QB Router to 8 Routed Experts: Gating dispatch (downward natural drop arc) */}
      <FlowConnection
        from={[16.7, 2.0, 3.5]}
        to={[19.15, 1.3, -1.2]}
        color="#f59e0b"
        isHighlighted={isFlowActive(isStep('router_qb_selection') || isStep('routed_experts_swiglu'), ['op_router_qb', 'node_experts_routed'])}
        label="Top-8 Gating Beam"
      />

      {/* Latent RMSNorm into 8 Routed Experts (upward natural arc) */}
      <FlowConnection
        from={[17.9, 0.5, -0.6]}
        to={[19.15, 1.1, -1.2]}
        color="#38bdf8"
        isHighlighted={isFlowActive(isStep('routed_experts_swiglu'), ['op_latent_norm', 'node_experts_routed'])}
        label="Latent [3072]"
      />

      {/* Full-Width mlp_in into 2 Shared Experts (upward natural fly-in arc) */}
      <FlowConnection
        from={[12.3, 2.2, 0]}
        to={[18.85, 4.5, 2.5]}
        color="#10b981"
        isHighlighted={isFlowActive(isStep('shared_experts_swiglu'), ['op_moe_gn', 'node_experts_shared'])}
        label="Full Width [6144]"
      />

      {/* 8 Routed Half-Width Experts: located at low tier [20.0, 1.2, -1.2], right edge X=20.8 */}
      <TensorMatrix
        id="node_experts_routed"
        label="8 Routed Half-Width Experts"
        subLabel="Top-8 Active SwiGLU (3072)"
        position={[20.0, 1.2, -1.2]}
        size={[32 * DIM_W, 1.8, 0.6]}
        gridRows={8}
        gridCols={32}
        colorTheme="amber"
        isHighlighted={isHighlighted('node_experts_routed')}
        onHover={onHoverItem}
        onClick={onClickItem}
        onHoverCell={onHoverCell}
        labelYOffset={0.1}
      />

      {/* W_latent_up Weight Matrix: placed at [23.2, 0.6, -2.0], left edge X=22.6 with 1.8 clearance to Routed Experts */}
      <TensorMatrix
        id="node_w_latent_up"
        label="W_latent_up"
        subLabel="[3072 × 6144]"
        position={[23.2, 0.6, -2.0]}
        size={[1.2, 1.4, 0.6]}
        gridRows={12}
        gridCols={12}
        isWeight={true}
        colorTheme="slate"
        isHighlighted={isHighlighted('node_w_latent_up') || isHighlighted('op_moe_add')}
        onHover={onHoverItem}
        onClick={onClickItem}
        onHoverCell={onHoverCell}
        labelYOffset={-0.1}
      />

      {/* W_latent_up into MoE Add */}
      <FlowConnection
        from={[23.2, 1.35, -1.7]}
        to={[25.1, 1.8, -0.3]}
        color="#64748b"
        tubeRadius={0.02}
        particleCount={5}
        isHighlighted={isFlowActive(isStep('moe_aggregation_residual'), ['node_w_latent_up', 'op_moe_add'])}
        label="Up 3072→6144"
      />

      {/* MoE Residual Merge Node: placed at [25.5, 2.0, 0] */}
      <OperatorNode
        id="op_moe_add"
        name="Latent Up & Merge"
        symbol="+"
        position={[25.5, 2.0, 0]}
        color="#f59e0b"
        isHighlighted={isHighlighted('op_moe_add')}
        onHover={onHoverItem}
        onClick={onClickItem}
        labelPosition="bottom"
      />

      {/* Shared Experts to MoE Add (downward natural drop arc) */}
      <FlowConnection
        from={[22.15, 4.5, 2.5]}
        to={[25.5, 2.4, 0.4]}
        color="#10b981"
        isHighlighted={isFlowActive(isStep('shared_experts_swiglu') || isStep('moe_aggregation_residual'), ['node_experts_shared', 'op_moe_add'])}
        label="Shared Out"
      />

      {/* Routed Experts to MoE Add (upward natural arc) */}
      <FlowConnection
        from={[20.85, 1.2, -1.2]}
        to={[25.0, 1.9, 0]}
        color="#f59e0b"
        isHighlighted={isFlowActive(isStep('routed_experts_swiglu') || isStep('moe_aggregation_residual'), ['node_experts_routed', 'op_moe_add'])}
        label="Routed Out"
      />

      {/* ========================================================
          STAGE 5: FINAL NORM & UNTIED LM HEAD
          ======================================================== */}
      <FlowConnection
        from={[26.0, 2.0, 0]}
        to={[27.0, 2.0, 0]}
        color="#10b981"
        isHighlighted={isFlowActive(isStep('moe_aggregation_residual') || isStep('final_gated_norm'), ['op_moe_add', 'op_final_gn'])}
      />

      {/* Final GatedNorm: placed at [27.5, 2.0, 0] */}
      <OperatorNode
        id="op_final_gn"
        name="Final GatedNorm"
        symbol="GN"
        position={[27.5, 2.0, 0]}
        color="#10b981"
        isHighlighted={isHighlighted('op_final_gn')}
        onHover={onHoverItem}
        onClick={onClickItem}
        labelPosition="bottom"
      />

      {/* Final GN to LM Head Logits (aligned precisely to LM Head [31.8, 2.0, 1.0] left face) */}
      <FlowConnection
        from={[28.0, 2.0, 0]}
        to={[30.95, 2.0, 1.0]}
        color="#f43f5e"
        isHighlighted={isFlowActive(isStep('final_gated_norm') || isStep('untied_lm_head'), ['op_final_gn', 'node_lm_head'])}
        label="Predict"
      />

      {/* Untied LM Head Weight W_out: placed at [29.5, 2.0, -2.2], offset 2.3 from foreground LM Head (X=31.8) */}
      <TensorMatrix
        id="node_w_lm_head"
        label="W_out"
        subLabel="[6144 × 128k]"
        position={[29.5, 2.0, -2.2]}
        size={[1.4, 3.2, 0.8]}
        gridRows={16}
        gridCols={16}
        isWeight={true}
        colorTheme="slate"
        isHighlighted={isHighlighted('node_w_lm_head') || isHighlighted('node_lm_head')}
        onHover={onHoverItem}
        onClick={onClickItem}
        onHoverCell={onHoverCell}
        labelYOffset={0.2}
      />

      {/* W_lm_head weight into LM Head (from W_out front face to LM Head back face) */}
      <FlowConnection
        from={[29.5, 2.0, -1.75]}
        to={[31.8, 2.0, 0.65]}
        color="#64748b"
        tubeRadius={0.02}
        particleCount={5}
        isHighlighted={isFlowActive(isStep('untied_lm_head'), ['node_w_lm_head', 'node_lm_head'])}
        label="Untied W_out [128k]"
      />

      {/* LM Head Output Logits: placed at [31.8, 2.0, 1.0] */}
      <TensorMatrix
        id="node_lm_head"
        label="Logits & Top-1 Token"
        subLabel="Vocab: 128,256"
        position={[31.8, 2.0, 1.0]}
        size={[1.6, 3.2, 0.6]}
        gridRows={activationData.tokens.length}
        gridCols={20}
        colorTheme="rose"
        isHighlighted={isHighlighted('node_lm_head')}
        onHover={onHoverItem}
        onClick={onClickItem}
        onHoverCell={onHoverCell}
        labelYOffset={0.2}
      />
    </group>
  );
};
