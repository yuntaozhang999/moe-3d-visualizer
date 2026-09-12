import React from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import { TensorMatrix } from './TensorMatrix';
import { OperatorNode } from './OperatorNode';
import { FlowConnection } from './FlowConnections';
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
  totalLayers?: number;
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
  totalLayers = 48,
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
  const isFirstLayer = layer.index === 0;
  const isLastLayer = layer.index === totalLayers - 1;
  const windowLabel = isGlobal ? 'Full Causal [4096]' : 'Sliding Window [2048]';
  const ropeLabel = isGlobal ? 'NoPE (Disabled)' : 'Half-RoPE (64/128)';
  const DIM_W = 0.05;
  // Floor stage markers need to pop against the dark slate platform.
  const STAGE_LABEL_COLOR = '#cfe1f7';
  const STAGE_LABEL_OUTLINE = '#0a0e14';

  return (
    <group position={[0, 0, 0]}>
      {/* 3D Ground Platform / Bounding Enclosure (obsidian dark slate) */}
      <mesh position={[13.0, -1.8, 0]}>
        <boxGeometry args={[66, 0.15, 20]} />
        <meshStandardMaterial color="#080b11" roughness={0.9} metalness={0.1} />
      </mesh>
      <lineSegments position={[13.0, -1.8, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(66, 0.15, 20)]} />
        <lineBasicMaterial color="#172033" />
      </lineSegments>

      {/* Subtle Ground Stage Demarcations (Floor Markers) */}
      <group position={[0, -1.72, 7.5]}>
        <Text
          position={[-12.5, 0, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.52}
          color={STAGE_LABEL_COLOR}
          outlineWidth={0.02}
          outlineColor={STAGE_LABEL_OUTLINE}
          outlineBlur={0.008}
          fontWeight={700}
          anchorX="center"
          anchorY="middle"
        >
          {isFirstLayer ? 'STAGE 1: EMBEDDING & NORM' : `STAGE 1: RESIDUAL INPUT (FROM L${layer.index - 1})`}
        </Text>
        <Text
          position={[3.0, 0, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.52}
          color={STAGE_LABEL_COLOR}
          outlineWidth={0.02}
          outlineColor={STAGE_LABEL_OUTLINE}
          outlineBlur={0.008}
          fontWeight={700}
          anchorX="center"
          anchorY="middle"
        >
          {`STAGE 2: ATTENTION (${isGlobal ? 'GLOBAL CAUSAL' : 'LOCAL 2048w'})`}
        </Text>
        <Text
          position={[25.5, 0, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.52}
          color={STAGE_LABEL_COLOR}
          outlineWidth={0.02}
          outlineColor={STAGE_LABEL_OUTLINE}
          outlineBlur={0.008}
          fontWeight={700}
          anchorX="center"
          anchorY="middle"
        >
          STAGE 3: LATENT MoE (384 EXPERTS + 2 SHARED)
        </Text>
        <Text
          position={[40.0, 0, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.52}
          color={STAGE_LABEL_COLOR}
          outlineWidth={0.02}
          outlineColor={STAGE_LABEL_OUTLINE}
          outlineBlur={0.008}
          fontWeight={700}
          anchorX="center"
          anchorY="middle"
        >
          {isLastLayer ? 'STAGE 4: UNEMBEDDING / LM HEAD' : `STAGE 4: RESIDUAL OUTPUT (TO L${layer.index + 1})`}
        </Text>
      </group>

      {/* ========================================================
          STAGE 1: INPUT & EMBEDDING
          ======================================================== */}
      <group position={[0, 2.0, 0]}>
      {isFirstLayer ? (
        <group>
          {/* Input Tokens */}
          <TensorMatrix
            id="node_tokens"
            label="token_ids"
            subLabel="Input IDs [S=6]"
            position={[-16.0, 2.0, 0]}
            size={[1.3, 3.2, 0.6]}
            gridRows={activationData.tokens.length}
            gridCols={1}
            colorTheme="cyan"
            isHighlighted={isHighlighted('node_tokens')}
            onHover={onHoverItem}
            onClick={onClickItem}
            onHoverCell={onHoverCell}
            tokenLabels={activationData.tokens}
          />

          {/* token_ids -> _embedding_gather */}
          <FlowConnection
            from={[-15.35, 2.0, 0]}
            to={[-14.15, 2.0, 0]}
            color="#38bdf8"
            isHighlighted={isFlowActive(isStep('input_tokens') || isStep('token_embed'), ['node_tokens', 'op_embed_gather'])}
            label="indices"
          />

          {/* Token Embed Matrix W_embed (Weight) */}
          <TensorMatrix
            id="node_w_embed"
            label="token_embed"
            subLabel="[128k × 6144] · Pre-trained Weights (788M)"
            position={[-13.6, 2.0, -2.4]}
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

          {/* token_embed -> _embedding_gather */}
          <FlowConnection
            from={[-13.6, 2.0, -1.95]}
            to={[-13.6, 2.0, -0.45]}
            color="#64748b"
            tubeRadius={0.018}
            particleCount={4}
            isHighlighted={isFlowActive(isStep('token_embed'), ['node_w_embed', 'op_embed_gather'])}
            label="table"
          />

          {/* _embedding_gather Operator */}
          <OperatorNode
            id="op_embed_gather"
            name="_embedding_gather"
            symbol="G"
            position={[-13.6, 2.0, 0]}
            color="#38bdf8"
            isHighlighted={isHighlighted('op_embed_gather') || isStep('token_embed')}
            onHover={onHoverItem}
            onClick={onClickItem}
            labelPosition="bottom"
          />

          {/* _embedding_gather -> hidden */}
          <FlowConnection
            from={[-13.05, 2.0, 0]}
            to={[-12.8, 2.0, 0]}
            color="#00f3ff"
            isHighlighted={isFlowActive(isStep('token_embed'), ['op_embed_gather', 'node_embed'])}
          />

          {/* Embed Activation Vector */}
          <TensorMatrix
            id="node_embed"
            label="hidden"
            subLabel="Embeddings [S × 6144]"
            position={[-11.2, 2.0, 0]}
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
            from={[-9.6, 2.0, 0]}
            to={[-9.55, 2.0, 0]}
            color="#10b981"
            isHighlighted={isFlowActive(isStep('token_embed') || isStep('embed_gated_norm'), ['node_embed', 'op_embed_gn'])}
          />

          {/* Embed GatedNorm */}
          <OperatorNode
            id="op_embed_gn"
            name="Embed GatedNorm"
            symbol="GN"
            position={[-9.0, 2.0, 0]}
            color="#10b981"
            isHighlighted={isHighlighted('op_embed_gn')}
            onHover={onHoverItem}
            onClick={onClickItem}
            labelPosition="bottom"
          />

          {/* Embed GN -> Pre-Attn GN */}
          <FlowConnection
            from={[-8.45, 2.0, 0]}
            to={[-7.35, 2.0, -2.0]}
            color="#10b981"
            isHighlighted={isFlowActive(isStep('embed_gated_norm') || isStep('pre_attn_gated_norm'), ['op_embed_gn', 'op_attn_gn'])}
            label="Pre-Attn Stream"
          />
        </group>
      ) : (
        <group>
          <TensorMatrix
            id="node_residual_in"
            label={`Input from L${layer.index - 1}`}
            subLabel="Residual Stream [S × 6144]"
            position={[-11.2, 2.0, 0]}
            size={[64 * DIM_W, 3.2, 0.6]}
            gridRows={activationData.tokens.length}
            gridCols={64}
            data={activationData.embeddings}
            colorTheme="cyan"
            isHighlighted={isHighlighted('node_residual_in')}
            onHover={onHoverItem}
            onClick={onClickItem}
            onHoverCell={onHoverCell}
          />
          {/* Main Residual Bus out of node_residual_in */}
          <FlowConnection
            from={[-9.6, 2.0, 0]}
            to={[-9.0, 2.0, 0]}
            label="Residual Bus"
            color="#00f3ff"
            isHighlighted={isFlowActive(isStep('input_tokens') || isStep('pre_attn_gated_norm') || isStep('token_embed') || isStep('embed_gated_norm'), ['node_residual_in', 'op_attn_gn'])}
          />
          {/* Branching into Pre-Attn GN */}
          <FlowConnection
            from={[-9.0, 2.0, 0]}
            to={[-7.35, 2.0, -2.0]}
            label="Pre-Attn Branch"
            color="#10b981"
            isHighlighted={isFlowActive(isStep('pre_attn_gated_norm'), ['node_residual_in', 'op_attn_gn'])}
          />
        </group>
      )}

      {/* ========================================================
          STAGE 2: PRE-ATTENTION GATEDNORM & QKV PROJECTIONS
          ======================================================== */}
      <OperatorNode
        id="op_attn_gn"
        name="Pre-Attn GatedNorm"
        symbol="GN"
        position={[-6.8, 2.0, -2.0]}
        color="#10b981"
        isHighlighted={isHighlighted('op_attn_gn')}
        onHover={onHoverItem}
        onClick={onClickItem}
        labelPosition="bottom"
      />

      {/* High-Altitude Residual Bypass 1 (Attention Residual) */}
      <FlowConnection
        from={[-9.0, isFirstLayer ? 2.45 : 2.0, 0]}
        to={[13.2, 2.45, 0]}
        isResidual={true}
        curveHeight={6.5}
        isHighlighted={isFlowActive(isStep('attn_proj_residual'), [isFirstLayer ? 'op_embed_gn' : 'node_residual_in', 'op_attn_add'])}
        label="Residual Skip 1 [6144]"
      />

      {/* W_QKV Weights Matrix */}
      <TensorMatrix
        id="node_w_qkv"
        label="W_Q, W_K, W_V Weights"
        subLabel="[6144 × 9216]"
        position={[-4.6, 3.4, -4.5]}
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

      {/* QKV Proj Node */}
      <OperatorNode
        id="op_qkv_proj"
        name="QKV Proj (@)"
        symbol="@"
        position={[-4.6, 2.0, -2.0]}
        color="#818cf8"
        isHighlighted={isHighlighted('op_qkv_proj') || isHighlighted('node_w_qkv')}
        onHover={onHoverItem}
        onClick={onClickItem}
        labelPosition="bottom"
      />

      {/* Pre-Attn GN -> QKV Proj */}
      <FlowConnection
        from={[-6.3, 2.0, -2.0]}
        to={[-5.15, 2.0, -2.0]}
        color="#10b981"
        label="Normed [6144]"
        isHighlighted={isFlowActive(isStep('pre_attn_gated_norm') || isStep('qkv_proj'), ['op_attn_gn', 'op_qkv_proj'])}
      />

      {/* W_QKV Weights projection flow */}
      <FlowConnection
        from={[-4.6, 3.4, -4.5]}
        to={[-4.6, 2.0, -2.4]}
        color="#64748b"
        tubeRadius={0.02}
        particleCount={5}
        label="W_QKV"
        isHighlighted={isFlowActive(isStep('pre_attn_gated_norm') || isStep('qkv_proj'), ['node_w_qkv', 'op_qkv_proj'])}
      />

      {/* op_qkv_proj -> Q */}
      <FlowConnection
        from={[-4.6, 2.0, -2.0]}
        to={[-3.85, 4.8, -2.0]}
        color="#818cf8"
        isHighlighted={isFlowActive(isStep('qkv_proj'), ['op_qkv_proj', 'node_q'])}
        label="Q (48h)"
      />
      {/* op_qkv_proj -> K */}
      <FlowConnection
        from={[-4.6, 2.0, -2.0]}
        to={[isGlobal ? -2.45 : -2.65, 2.0, -2.0]}
        color="#818cf8"
        isHighlighted={isFlowActive(isStep('qkv_proj'), ['op_qkv_proj', 'node_k'])}
        label={`K (${kvHeads}h)`}
      />
      {/* op_qkv_proj -> V */}
      <FlowConnection
        from={[-4.6, 2.0, -2.0]}
        to={[isGlobal ? -2.45 : -2.65, -0.8, -2.0]}
        color="#818cf8"
        isHighlighted={isFlowActive(isStep('qkv_proj'), ['op_qkv_proj', 'node_v'])}
        label={`V (${kvHeads}h)`}
      />

      {/* Q Matrix */}
      <TensorMatrix
        id="node_q"
        label="Q (Query Heads)"
        subLabel="48 Heads × 128"
        position={[-2.2, 4.8, -2.0]}
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

      {/* K Matrix */}
      <TensorMatrix
        id="node_k"
        label={`K (${kvHeads} KV Heads)`}
        subLabel={isGlobal ? "GQA 8:1 (6 KV Heads)" : "GQA 4:1 (12 KV Heads)"}
        position={[-2.2, 2.0, -2.0]}
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

      {/* V Matrix */}
      <TensorMatrix
        id="node_v"
        label={`V (${kvHeads} KV Heads)`}
        subLabel={isGlobal ? "GQA 8:1 (6 KV Heads)" : "GQA 4:1 (12 KV Heads)"}
        position={[-2.2, -0.8, -2.0]}
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

      {/* K into ShortConv */}
      <FlowConnection
        from={[isGlobal ? -1.95 : -1.75, 2.0, -2.0]}
        to={[-0.75, 2.0, -2.0]}
        color="#38bdf8"
        isHighlighted={isFlowActive(isStep('short_conv_k'), ['node_k', 'op_sconv_k'])}
        label="ShortConv K=4"
      />

      {/* ShortConv Node */}
      <OperatorNode
        id="op_sconv_k"
        name="ShortConv (K=4)"
        symbol="SC"
        position={[-0.2, 2.0, -2.0]}
        color="#38bdf8"
        isHighlighted={isHighlighted('op_sconv_k')}
        onHover={onHoverItem}
        onClick={onClickItem}
        labelPosition="bottom"
      />

      {/* ShortConv K into RoPE */}
      <FlowConnection
        from={[-0.35, 2.0, -2.0]}
        to={[1.3, 3.2, -2.0]}
        color="#818cf8"
        isHighlighted={isFlowActive(isStep('q_k_norm_rope'), ['op_sconv_k', 'op_rope'])}
      />

      {/* Q into RoPE */}
      <FlowConnection
        from={[-0.55, 4.8, -2.0]}
        to={[1.3, 3.6, -2.0]}
        color="#818cf8"
        isHighlighted={isFlowActive(isStep('q_k_norm_rope'), ['node_q', 'op_rope'])}
        label={ropeLabel}
      />

      {/* RoPE Node */}
      <OperatorNode
        id="op_rope"
        name={isGlobal ? "100% NoPE (Off)" : "Half-RoPE [64/64]"}
        symbol={isGlobal ? "NoPE" : "Half-RoPE"}
        position={[1.8, 3.4, -2.0]}
        color={isGlobal ? "#64748b" : "#818cf8"}
        isHighlighted={isHighlighted('op_rope')}
        onHover={onHoverItem}
        onClick={onClickItem}
        labelPosition="top"
        labelOffset={[0, 0.72, 0]}
      />

      {/* RoPE to Attention Score Map */}
      <FlowConnection
        from={[2.35, 3.4, -2.0]}
        to={[2.95, 2.4, -2.0]}
        color="#818cf8"
        isHighlighted={isFlowActive(isStep('attention_weights'), ['op_rope', 'node_attn_matrix'])}
        label="Q · K^T / √d"
      />

      {/* V to Attention Score Map */}
      <FlowConnection
        from={[isGlobal ? -1.95 : -1.75, -0.8, -2.0]}
        to={[2.95, 2.0, -2.0]}
        color="#818cf8"
        isHighlighted={isFlowActive(isStep('attention_weights') || isStep('attention_output'), ['node_v', 'node_attn_matrix'])}
        label="Attn · V"
      />

      {/* ========================================================
          STAGE 2B: ATTENTION MATRIX (SOFTMAX HEATMAP), XSA & HEAD GATE
          ======================================================== */}
      {/* Attention Score Map */}
      <TensorMatrix
        id="node_attn_matrix"
        label="Attention Score Map"
        subLabel={windowLabel}
        position={[4.2, 2.2, -2.0]}
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

      {/* Attn Output to XSA */}
      <FlowConnection
        from={[5.45, 2.2, -2.0]}
        to={[6.05, 2.2, -2.0]}
        color="#c084fc"
        isHighlighted={isFlowActive(isStep('xsa_decorrelation'), ['node_attn_matrix', 'op_xsa'])}
        label="XSA Decorr"
      />

      {/* XSA Node */}
      <OperatorNode
        id="op_xsa"
        name="XSA (Decorrelate)"
        symbol="XSA"
        position={[6.6, 2.2, -2.0]}
        color="#c084fc"
        isHighlighted={isHighlighted('op_xsa')}
        onHover={onHoverItem}
        onClick={onClickItem}
        labelPosition="bottom"
      />

      {/* XSA to Head Gate */}
      <FlowConnection
        from={[7.15, 2.2, -2.0]}
        to={[8.25, 2.2, -2.0]}
        color="#fb7185"
        isHighlighted={isFlowActive(isStep('head_gating'), ['op_xsa', 'op_head_gate'])}
        label="Gate 2·σ"
      />

      {/* Head Gate Node */}
      <OperatorNode
        id="op_head_gate"
        name="Head Gate (2·σ)"
        symbol="HG"
        position={[8.8, 2.2, -2.0]}
        color="#fb7185"
        isHighlighted={isHighlighted('op_head_gate')}
        onHover={onHoverItem}
        onClick={onClickItem}
        labelPosition="bottom"
      />

      {/* Head Gate to W_O Proj */}
      <FlowConnection
        from={[9.35, 2.2, -2.0]}
        to={[10.45, 2.2, -2.0]}
        color="#38bdf8"
        isHighlighted={isFlowActive(isStep('attn_proj_residual'), ['op_head_gate', 'op_wo_proj'])}
      />

      {/* W_O Output Projection Weight */}
      <TensorMatrix
        id="node_w_o"
        label="W_O Weight Matrix"
        subLabel="[6144 × 6144]"
        position={[11.0, 4.2, -4.5]}
        size={[1.3, 1.5, 0.6]}
        gridRows={8}
        gridCols={12}
        isWeight={true}
        colorTheme="slate"
        isHighlighted={isHighlighted('node_w_o') || isHighlighted('op_wo_proj')}
        onHover={onHoverItem}
        onClick={onClickItem}
        onHoverCell={onHoverCell}
        labelYOffset={0.2}
      />

      {/* W_O Proj Node */}
      <OperatorNode
        id="op_wo_proj"
        name="W_O Proj (@)"
        symbol="@"
        position={[11.0, 2.2, -2.0]}
        color="#38bdf8"
        isHighlighted={isHighlighted('op_wo_proj') || isHighlighted('node_w_o')}
        onHover={onHoverItem}
        onClick={onClickItem}
        labelPosition="bottom"
      />

      {/* W_O Weight into W_O Proj */}
      <FlowConnection
        from={[11.0, 4.2, -4.5]}
        to={[11.0, 2.2, -2.4]}
        color="#64748b"
        tubeRadius={0.02}
        particleCount={5}
        label="W_O"
        isHighlighted={isFlowActive(isStep('attn_proj_residual'), ['node_w_o', 'op_wo_proj'])}
      />

      {/* W_O Proj to Attn Add */}
      <FlowConnection
        from={[11.55, 2.2, -2.0]}
        to={[12.65, 2.0, 0]}
        color="#38bdf8"
        label="Attn Out [6144]"
        isHighlighted={isFlowActive(isStep('attn_proj_residual'), ['op_wo_proj', 'op_attn_add'])}
      />

      {/* Attn Add Node */}
      <OperatorNode
        id="op_attn_add"
        name="Attn W_O + Res"
        symbol="+"
        position={[13.2, 2.0, 0]}
        color="#38bdf8"
        isHighlighted={isHighlighted('op_attn_add')}
        onHover={onHoverItem}
        onClick={onClickItem}
        labelPosition="bottom"
      />

      {/* ========================================================
          STAGE 3: PRE-MOE GATEDNORM & 384 EXPERTS + 2 SHARED
          ======================================================== */}
      <FlowConnection
        from={[13.75, 2.0, 0]}
        to={[14.95, 2.0, 0]}
        color="#10b981"
        isHighlighted={isFlowActive(isStep('attn_proj_residual') || isStep('pre_moe_gated_norm'), ['op_attn_add', 'op_moe_gn'])}
      />

      {/* Pre-MoE GatedNorm */}
      <OperatorNode
        id="op_moe_gn"
        name="Pre-MoE GatedNorm"
        symbol="GN"
        position={[15.5, 2.0, 0]}
        color="#10b981"
        isHighlighted={isHighlighted('op_moe_gn')}
        onHover={onHoverItem}
        onClick={onClickItem}
        labelPosition="bottom"
      />

      {/* MoE Bypass Residual High Arch */}
      <FlowConnection
        from={[13.2, 2.45, 0]}
        to={[36.6, 2.45, 0]}
        isResidual={true}
        curveHeight={6.5}
        isHighlighted={isFlowActive(isStep('moe_aggregation_residual'), ['op_attn_add', 'op_moe_add'])}
        label="MoE Residual Skip [6144]"
      />

      {/* --- LANE A: ROUTER & SHARED EXPERTS (UPPER LATERAL TIER) --- */}
      {/* Token to op_router_proj */}
      <FlowConnection
        from={[16.05, 2.0, 0]}
        to={[24.45, 3.4, -2.5]}
        color="#f59e0b"
        isHighlighted={isFlowActive(isStep('router_qb_selection'), ['op_moe_gn', 'op_router_proj'])}
        label="Token [6144]"
      />

      {/* W_router Weight Matrix */}
      <TensorMatrix
        id="node_w_router"
        label="W_router [6144 × 384]"
        subLabel="QB Router Projection"
        position={[25.0, 3.4, -4.5]}
        size={[1.4, 1.6, 0.6]}
        gridRows={12}
        gridCols={16}
        isWeight={true}
        colorTheme="slate"
        isHighlighted={isHighlighted('node_w_router') || isHighlighted('op_router_proj')}
        onHover={onHoverItem}
        onClick={onClickItem}
        onHoverCell={onHoverCell}
        labelYOffset={0.15}
      />

      {/* W_router -> op_router_proj */}
      <FlowConnection
        from={[25.0, 3.4, -4.2]}
        to={[25.0, 3.4, -2.9]}
        color="#64748b"
        tubeRadius={0.02}
        particleCount={4}
        label="W_router"
        isHighlighted={isFlowActive(isStep('router_qb_selection'), ['node_w_router', 'op_router_proj'])}
      />

      {/* Router Projection Operator */}
      <OperatorNode
        id="op_router_proj"
        name="einsum (td,de->te)"
        symbol="@"
        position={[25.0, 3.4, -2.5]}
        color="#f59e0b"
        isHighlighted={isHighlighted('op_router_proj') || isHighlighted('node_w_router')}
        onHover={onHoverItem}
        onClick={onClickItem}
        labelPosition="top"
      />

      {/* op_router_proj -> node_router */}
      <FlowConnection
        from={[25.55, 3.4, -2.5]}
        to={[26.3, 3.4, -2.5]}
        color="#f59e0b"
        isHighlighted={isFlowActive(isStep('router_qb_selection'), ['op_router_proj', 'node_router'])}
        label="Logits [384]"
      />

      {/* Router Logits & QB Selection */}
      <TensorMatrix
        id="node_router"
        label="Router (Top-8 of 384)"
        subLabel="QB Threshold & Sigmoid"
        position={[27.2, 3.4, -2.5]}
        size={[1.8, 1.4, 0.5]}
        gridRows={activationData.tokens.length}
        gridCols={16}
        colorTheme="amber"
        isHighlighted={isHighlighted('node_router')}
        onHover={onHoverItem}
        onClick={onClickItem}
        onHoverCell={onHoverCell}
        labelYOffset={0.15}
      />

      {/* node_router -> op_router_qb */}
      <FlowConnection
        from={[28.1, 3.4, -2.5]}
        to={[28.85, 3.4, -2.5]}
        color="#f59e0b"
        isHighlighted={isFlowActive(isStep('router_qb_selection'), ['node_router', 'op_router_qb'])}
      />

      {/* QB Routing Operator */}
      <OperatorNode
        id="op_router_qb"
        name="QB Routing (Top 8)"
        symbol="QB"
        position={[29.4, 3.4, -2.5]}
        color="#f59e0b"
        isHighlighted={isHighlighted('op_router_qb')}
        onHover={onHoverItem}
        onClick={onClickItem}
        labelPosition="top"
      />

      {/* 2 Concurrent Shared Experts (Elevated High-Capacity Highway) */}
      <TensorMatrix
        id="node_experts_shared"
        label="2 Shared Experts"
        subLabel="6144 → 3072 → 6144 (each)"
        position={[25.0, 2.2, 2.5]}
        size={[64 * DIM_W, 1.6, 0.6]}
        gridRows={activationData.tokens.length}
        gridCols={64}
        data={activationData.sharedExpert1}
        colorTheme="emerald"
        isHighlighted={isHighlighted('node_experts_shared')}
        onHover={onHoverItem}
        onClick={onClickItem}
        onHoverCell={onHoverCell}
        labelYOffset={-0.1}
      />

      {/* Full-Width mlp_in into 2 Shared Experts */}
      <FlowConnection
        from={[16.05, 2.0, 0]}
        to={[23.4, 2.2, 2.5]}
        color="#10b981"
        isHighlighted={isFlowActive(isStep('shared_experts_swiglu'), ['op_moe_gn', 'node_experts_shared'])}
        label="Full Width [6144]"
      />

      {/* --- LANE B: LATENT COMPRESSION & ROUTED EXPERTS (LOWER LATERAL TIER) --- */}
      {/* Branch to Latent Down (Token -> op_latent_proj) */}
      <FlowConnection
        from={[16.05, 2.0, 0]}
        to={[17.45, 1.0, -2.5]}
        color="#38bdf8"
        isHighlighted={isFlowActive(isStep('latent_compression'), ['op_moe_gn', 'op_latent_proj'])}
        label="Token [6144]"
      />

      {/* W_latent_down Weight Matrix */}
      <TensorMatrix
        id="node_w_latent_down"
        label="W_latent_down [6144 × 3072]"
        subLabel="Compression Matrix"
        position={[18.0, 1.0, -4.5]}
        size={[1.4, 1.4, 0.6]}
        gridRows={12}
        gridCols={12}
        isWeight={true}
        colorTheme="slate"
        isHighlighted={isHighlighted('node_w_latent_down') || isHighlighted('op_latent_proj')}
        onHover={onHoverItem}
        onClick={onClickItem}
        onHoverCell={onHoverCell}
        labelYOffset={-0.15}
      />

      {/* W_down -> op_latent_proj */}
      <FlowConnection
        from={[18.0, 1.0, -4.2]}
        to={[18.0, 1.0, -2.9]}
        color="#64748b"
        tubeRadius={0.02}
        particleCount={4}
        label="W_down"
        isHighlighted={isFlowActive(isStep('latent_compression'), ['node_w_latent_down', 'op_latent_proj'])}
      />

      {/* Latent Projection Operator */}
      <OperatorNode
        id="op_latent_proj"
        name="einsum (td,dl->tl)"
        symbol="@"
        position={[18.0, 1.0, -2.5]}
        color="#38bdf8"
        isHighlighted={isHighlighted('op_latent_proj') || isHighlighted('node_w_latent_down')}
        onHover={onHoverItem}
        onClick={onClickItem}
        labelPosition="bottom"
      />

      {/* op_latent_proj -> node_latent_down */}
      <FlowConnection
        from={[18.55, 1.0, -2.5]}
        to={[19.6, 1.0, -2.5]}
        color="#38bdf8"
        isHighlighted={isFlowActive(isStep('latent_compression'), ['op_latent_proj', 'node_latent_down'])}
        label="Latent [3072]"
      />

      {/* Compressed Latent Vector */}
      <TensorMatrix
        id="node_latent_down"
        label="Latent Vector (3072)"
        subLabel="50% Comms Reduction"
        position={[20.4, 1.0, -2.5]}
        size={[32 * DIM_W, 1.4, 0.5]}
        gridRows={activationData.tokens.length}
        gridCols={32}
        data={activationData.latentDown}
        colorTheme="blue"
        isHighlighted={isHighlighted('node_latent_down')}
        onHover={onHoverItem}
        onClick={onClickItem}
        onHoverCell={onHoverCell}
        labelYOffset={-0.15}
      />

      {/* Latent Down to Latent RMSNorm */}
      <FlowConnection
        from={[21.2, 1.0, -2.5]}
        to={[22.25, 1.0, -2.5]}
        color="#38bdf8"
        isHighlighted={isFlowActive(isStep('latent_compression'), ['node_latent_down', 'op_latent_norm'])}
      />

      {/* Latent RMSNorm Node */}
      <OperatorNode
        id="op_latent_norm"
        name="Latent RMSNorm"
        symbol="LN"
        position={[22.8, 1.0, -2.5]}
        color="#38bdf8"
        isHighlighted={isHighlighted('op_latent_norm')}
        onHover={onHoverItem}
        onClick={onClickItem}
        labelPosition="bottom"
      />

      {/* QB Router to 8 Routed Experts: Gating dispatch */}
      <FlowConnection
        from={[29.95, 3.4, -2.5]}
        to={[31.4, 1.8, -2.5]}
        color="#f59e0b"
        curveHeight={0.3}
        isHighlighted={isFlowActive(isStep('router_qb_selection') || isStep('routed_experts_swiglu'), ['op_router_qb', 'node_experts_routed'])}
        label="Top-8 Gating Beam"
      />

      {/* Latent RMSNorm into 8 Routed Experts */}
      <FlowConnection
        from={[23.35, 1.0, -2.5]}
        to={[31.0, 1.2, -2.5]}
        color="#38bdf8"
        isHighlighted={isFlowActive(isStep('routed_experts_swiglu'), ['op_latent_norm', 'node_experts_routed'])}
        label="Normed [3072]"
      />

      {/* 8 Routed Half-Width Experts */}
      <TensorMatrix
        id="node_experts_routed"
        label="8 Routed Experts"
        subLabel="Top-8 Active SwiGLU (3072)"
        position={[31.8, 1.4, -2.5]}
        size={[32 * DIM_W, 1.8, 0.6]}
        gridRows={8}
        gridCols={32}
        colorTheme="amber"
        isHighlighted={isHighlighted('node_experts_routed')}
        onHover={onHoverItem}
        onClick={onClickItem}
        onHoverCell={onHoverCell}
        labelYOffset={0.15}
      />

      {/* Routed Experts → Latent Up Proj */}
      <FlowConnection
        from={[32.6, 1.4, -2.5]}
        to={[33.65, 1.4, -2.5]}
        color="#f59e0b"
        isHighlighted={isFlowActive(isStep('routed_experts_swiglu') || isStep('moe_aggregation_residual'), ['node_experts_routed', 'op_latent_up_proj'])}
        label="Routed [3072]"
      />

      {/* W_latent_up Weight Matrix */}
      <TensorMatrix
        id="node_w_latent_up"
        label="W_latent_up"
        subLabel="[3072 × 6144]"
        position={[34.2, 1.4, -4.5]}
        size={[1.3, 1.4, 0.6]}
        gridRows={12}
        gridCols={12}
        isWeight={true}
        colorTheme="slate"
        isHighlighted={isHighlighted('node_w_latent_up') || isHighlighted('op_latent_up_proj')}
        onHover={onHoverItem}
        onClick={onClickItem}
        onHoverCell={onHoverCell}
        labelYOffset={-0.15}
      />

      {/* Latent Up Proj Node */}
      <OperatorNode
        id="op_latent_up_proj"
        name="einsum (tl,ld->td)"
        symbol="@"
        position={[34.2, 1.4, -2.5]}
        color="#f59e0b"
        isHighlighted={isHighlighted('op_latent_up_proj') || isHighlighted('node_w_latent_up')}
        onHover={onHoverItem}
        onClick={onClickItem}
        labelPosition="bottom"
      />

      {/* W_latent_up Weight into Latent Up Proj */}
      <FlowConnection
        from={[34.2, 1.4, -4.2]}
        to={[34.2, 1.4, -2.9]}
        color="#64748b"
        isHighlighted={isFlowActive(isStep('moe_aggregation_residual'), ['node_w_latent_up', 'op_latent_up_proj'])}
        label="W_up"
      />

      {/* Up-projection Output → MoE Merge */}
      <FlowConnection
        from={[34.75, 1.4, -2.5]}
        to={[36.1, 1.8, 0]}
        color="#f59e0b"
        tubeRadius={0.035}
        particleCount={8}
        isHighlighted={isFlowActive(isStep('moe_aggregation_residual'), ['op_latent_up_proj', 'op_moe_add'])}
        label="Up-Projected [6144]"
      />

      {/* Shared Experts to MoE Add */}
      <FlowConnection
        from={[26.6, 2.2, 2.5]}
        to={[36.1, 2.0, 0]}
        color="#10b981"
        isHighlighted={isFlowActive(isStep('shared_experts_swiglu') || isStep('moe_aggregation_residual'), ['node_experts_shared', 'op_moe_add'])}
        label="Shared Out [6144]"
      />

      {/* MoE Residual Merge Node */}
      <OperatorNode
        id="op_moe_add"
        name="MoE Add (Σ)"
        symbol="+"
        position={[36.6, 2.0, 0]}
        color="#f59e0b"
        isHighlighted={isHighlighted('op_moe_add')}
        onHover={onHoverItem}
        onClick={onClickItem}
        labelPosition="bottom"
      />

      {/* ========================================================
          STAGE 4: FINAL NORM & UNTIED LM HEAD
          ======================================================== */}
      {isLastLayer ? (
        <group>
          <FlowConnection
            from={[37.15, 2.0, 0]}
            to={[38.25, 2.0, 0]}
            color="#10b981"
            isHighlighted={isFlowActive(isStep('moe_aggregation_residual') || isStep('final_gated_norm'), ['op_moe_add', 'op_final_gn'])}
          />

          {/* Final GatedNorm */}
          <OperatorNode
            id="op_final_gn"
            name="Final GatedNorm"
            symbol="GN"
            position={[38.8, 2.0, 0]}
            color="#10b981"
            isHighlighted={isHighlighted('op_final_gn')}
            onHover={onHoverItem}
            onClick={onClickItem}
            labelPosition="bottom"
          />

          {/* Final GN to LM Head Proj */}
          <FlowConnection
            from={[39.35, 2.0, 0]}
            to={[40.45, 2.0, 0]}
            color="#fb7185"
            isHighlighted={isFlowActive(isStep('final_gated_norm') || isStep('untied_lm_head'), ['op_final_gn', 'op_lm_head_proj'])}
          />

          {/* Untied LM Head Weight W_out */}
          <TensorMatrix
            id="node_w_lm_head"
            label="W_out [6144 × 128k]"
            subLabel="Untied Output Projection"
            position={[41.0, 2.0, -3.5]}
            size={[1.4, 3.2, 0.8]}
            gridRows={16}
            gridCols={16}
            isWeight={true}
            colorTheme="slate"
            isHighlighted={isHighlighted('node_w_lm_head') || isHighlighted('op_lm_head_proj')}
            onHover={onHoverItem}
            onClick={onClickItem}
            onHoverCell={onHoverCell}
            labelYOffset={0.2}
          />

          {/* LM Head Proj Node */}
          <OperatorNode
            id="op_lm_head_proj"
            name="LM Head Proj (@)"
            symbol="@"
            position={[41.0, 2.0, 0]}
            color="#fb7185"
            isHighlighted={isHighlighted('op_lm_head_proj') || isHighlighted('node_w_lm_head')}
            onHover={onHoverItem}
            onClick={onClickItem}
            labelPosition="bottom"
          />

          {/* W_lm_head weight into LM Head Proj */}
          <FlowConnection
            from={[41.0, 2.0, -3.0]}
            to={[41.0, 2.0, -0.4]}
            color="#64748b"
            tubeRadius={0.02}
            particleCount={5}
            isHighlighted={isFlowActive(isStep('untied_lm_head'), ['node_w_lm_head', 'op_lm_head_proj'])}
            label="W_out"
          />

          {/* LM Head Proj Output Logits */}
          <FlowConnection
            from={[41.55, 2.0, 0]}
            to={[42.6, 2.0, 0.8]}
            color="#fb7185"
            isHighlighted={isFlowActive(isStep('untied_lm_head'), ['op_lm_head_proj', 'node_lm_head'])}
            label="Logits [128k]"
          />

          {/* LM Head Output Logits */}
          <TensorMatrix
            id="node_lm_head"
            label="Logits & Top-1 Token"
            subLabel="Vocab: 128,256"
            position={[43.4, 2.0, 0.8]}
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
      ) : (
        <group>
          <TensorMatrix
            id="node_residual_out"
            label={`Output to L${layer.index + 1}`}
            subLabel="Residual Stream [S × 6144]"
            position={[41.0, 2.0, 0]}
            size={[64 * DIM_W, 3.2, 0.6]}
            gridRows={activationData.tokens.length}
            gridCols={64}
            data={activationData.embeddings}
            colorTheme="cyan"
            isHighlighted={isHighlighted('node_residual_out')}
            onHover={onHoverItem}
            onClick={onClickItem}
            onHoverCell={onHoverCell}
          />
          <FlowConnection
            from={[37.15, 2.0, 0]}
            to={[37.2, 2.0, 0]}
            label="Residual Stream [6144]"
            color="#a855f7"
            isHighlighted={isFlowActive(isStep('moe_aggregation_residual'), ['op_moe_add', 'node_residual_out'])}
          />
        </group>
      )}
      </group>
    </group>
  );
};
