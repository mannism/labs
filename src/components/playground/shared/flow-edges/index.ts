/**
 * Shared React Flow edge component registry.
 * DelegationEdge and ReturnEdge serve both EXP_007 and EXP_008.
 */

import { DelegationEdge } from "./DelegationEdge";
import { ReturnEdge } from "./ReturnEdge";

export { DelegationEdge } from "./DelegationEdge";
export type { DelegationEdgeData } from "./DelegationEdge";

export { ReturnEdge } from "./ReturnEdge";
export type { ReturnEdgeData } from "./ReturnEdge";

/** Edge type map for use with <ReactFlow edgeTypes={EDGE_TYPES} />. */
export const EDGE_TYPES = {
  delegation: DelegationEdge,
  return: ReturnEdge,
} as const;

export type EdgeTypeName = keyof typeof EDGE_TYPES;
