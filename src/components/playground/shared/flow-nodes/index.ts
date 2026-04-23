/**
 * Shared React Flow node component registry.
 * All five node types used across EXP_007 and EXP_008 are exported here.
 *
 * Import from this barrel to keep component registration tidy in canvas files.
 */

import { OrchestratorNode } from "./OrchestratorNode";
import { SpecialistNode } from "./SpecialistNode";
import { ToolNode } from "./ToolNode";
import { MemoryNode } from "./MemoryNode";
import { MonolithNode } from "./MonolithNode";

export { OrchestratorNode } from "./OrchestratorNode";
export type { OrchestratorNodeData } from "./OrchestratorNode";

export { SpecialistNode } from "./SpecialistNode";
export type { SpecialistNodeData } from "./SpecialistNode";

export { ToolNode } from "./ToolNode";
export type { ToolNodeData } from "./ToolNode";

export { MemoryNode } from "./MemoryNode";
export type { MemoryNodeData } from "./MemoryNode";

export { MonolithNode } from "./MonolithNode";
export type { MonolithNodeData } from "./MonolithNode";

/**
 * Typed node type map for use with ReactFlow's `nodeTypes` prop.
 * Import and spread into <ReactFlow nodeTypes={NODE_TYPES} />.
 */
export const NODE_TYPES = {
  orchestrator: OrchestratorNode,
  specialist: SpecialistNode,
  tool: ToolNode,
  memory: MemoryNode,
  monolith: MonolithNode,
} as const;

export type NodeTypeName = keyof typeof NODE_TYPES;
