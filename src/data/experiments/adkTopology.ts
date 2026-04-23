/**
 * ADK topology data for EXP_007 (ADK Visualizer).
 *
 * Two pre-positioned graphs based on Google's published case study:
 * "Production-Ready AI Agents: 5 Lessons from Refactoring a Monolith" (April 2026).
 *
 * Node positions are manually authored for pedagogical contrast — not auto-layout.
 * The monolithic topology shows inward radiation (tools from a single agent).
 * The orchestrated topology shows a sequential vertical pipeline with shared state
 * branching horizontally to communicate the read/write whiteboard pattern.
 *
 * Typing: React Flow's Node and Edge generics are used with our custom data shapes.
 */

import type { Node, Edge } from "@xyflow/react";
import type { OrchestratorNodeData } from "@/components/playground/shared/flow-nodes/OrchestratorNode";
import type { SpecialistNodeData } from "@/components/playground/shared/flow-nodes/SpecialistNode";
import type { ToolNodeData } from "@/components/playground/shared/flow-nodes/ToolNode";
import type { MemoryNodeData } from "@/components/playground/shared/flow-nodes/MemoryNode";
import type { MonolithNodeData } from "@/components/playground/shared/flow-nodes/MonolithNode";
import type { DelegationEdgeData } from "@/components/playground/shared/flow-edges/DelegationEdge";

// ---------------------------------------------------------------------------
// Monolithic topology
// ---------------------------------------------------------------------------
// One LlmAgent (Titanium) at centre; four tools radiating outward.
// This is the pre-refactor pattern from Google's case study.

export type MonolithicNode =
  | Node<MonolithNodeData, "monolith">
  | Node<ToolNodeData, "tool">;

export const MONOLITHIC_NODES: MonolithicNode[] = [
  {
    id: "titanium",
    type: "monolith",
    position: { x: 200, y: 160 },
    data: {
      label: "Titanium Agent",
      description:
        "Single LlmAgent that executes all research, analysis, selection, and email tasks inline in a linear for loop. No delegation — every tool is called directly within this agent.",
      pattern:
        "Monolithic LlmAgent — all responsibilities in one agent, tool calls in sequence, no sub-agents.",
    },
  },
  {
    id: "web-search",
    type: "tool",
    position: { x: 40, y: 320 },
    data: {
      label: "web_search",
      description:
        "Searches the web for company and case study information. Called inline by Titanium Agent on every iteration.",
      pattern: "Inline tool — no caching, no isolation, failure cascades to all subsequent tasks.",
    },
  },
  {
    id: "code-exec",
    type: "tool",
    position: { x: 200, y: 340 },
    data: {
      label: "code_exec",
      description:
        "Executes Python code to process and score research results. Runs synchronously within Titanium's task loop.",
      pattern: "Inline tool — shared execution context, tight coupling to agent state.",
    },
  },
  {
    id: "vector-search",
    type: "tool",
    position: { x: 360, y: 320 },
    data: {
      label: "vector_search",
      description:
        "Queries a vector index for relevant case study embeddings. Another inline tool in the same agent loop.",
      pattern: "Inline tool — no isolation from other tool failures.",
    },
  },
  {
    id: "email-draft",
    type: "tool",
    position: { x: 120, y: 420 },
    data: {
      label: "email_draft",
      description:
        "Drafts the outbound email using all accumulated context. Final step in Titanium's for loop — if any earlier tool fails, this never runs.",
      pattern: "Inline tool — depends on all upstream tool calls succeeding in sequence.",
    },
  },
];

export type MonolithicEdge = Edge<DelegationEdgeData, "delegation">;

export const MONOLITHIC_EDGES: MonolithicEdge[] = [
  {
    id: "titanium-web",
    type: "delegation",
    source: "titanium",
    target: "web-search",
    markerEnd: { type: "arrowclosed" as const, color: "rgba(200,255,0,0.5)" },
    data: {
      label: "calls",
      description: "Titanium calls web_search synchronously in its for loop.",
      pattern: "Inline invocation — no delegation, no isolation.",
      sourceLabel: "Titanium Agent",
      targetLabel: "web_search",
      relationshipType: "inline-tool-call",
    },
  },
  {
    id: "titanium-code",
    type: "delegation",
    source: "titanium",
    target: "code-exec",
    markerEnd: { type: "arrowclosed" as const, color: "rgba(200,255,0,0.5)" },
    data: {
      label: "calls",
      description: "Titanium calls code_exec to process results.",
      pattern: "Inline invocation — sequential dependency.",
      sourceLabel: "Titanium Agent",
      targetLabel: "code_exec",
      relationshipType: "inline-tool-call",
    },
  },
  {
    id: "titanium-vector",
    type: "delegation",
    source: "titanium",
    target: "vector-search",
    markerEnd: { type: "arrowclosed" as const, color: "rgba(200,255,0,0.5)" },
    data: {
      label: "calls",
      description: "Titanium calls vector_search for embeddings.",
      pattern: "Inline invocation — no retry on failure.",
      sourceLabel: "Titanium Agent",
      targetLabel: "vector_search",
      relationshipType: "inline-tool-call",
    },
  },
  {
    id: "titanium-email",
    type: "delegation",
    source: "titanium",
    target: "email-draft",
    markerEnd: { type: "arrowclosed" as const, color: "rgba(200,255,0,0.5)" },
    data: {
      label: "calls",
      description: "Titanium calls email_draft as the final step.",
      pattern: "Inline invocation — blocked if any earlier tool failed.",
      sourceLabel: "Titanium Agent",
      targetLabel: "email_draft",
      relationshipType: "inline-tool-call",
    },
  },
];

// ---------------------------------------------------------------------------
// Orchestrated topology
// ---------------------------------------------------------------------------
// SequentialAgent at top; 5 specialists in order; session.state as shared memory.

export type OrchestratedNode =
  | Node<OrchestratorNodeData, "orchestrator">
  | Node<SpecialistNodeData, "specialist">
  | Node<MemoryNodeData, "memory">;

export const ORCHESTRATED_NODES: OrchestratedNode[] = [
  {
    id: "sequential",
    type: "orchestrator",
    position: { x: 195, y: 20 },
    data: {
      label: "SequentialAgent",
      description:
        "Top-level orchestrator that invokes five specialist agents in a defined sequence. Manages InvocationContext and passes it between specialists. Does not perform any research tasks itself.",
      pattern:
        "SequentialAgent — each specialist runs in order, passing outputs via session.state to downstream agents.",
    },
  },
  {
    id: "search-planner",
    type: "specialist",
    position: { x: 60, y: 145 },
    data: {
      label: "Search Planner",
      description:
        "First specialist in the sequence. Plans the web search queries required to research the target company. Writes its plan to session.state for Company Researcher.",
      pattern:
        "Specialist agent — single responsibility (planning), writes output_key to session.state.",
    },
  },
  {
    id: "company-researcher",
    type: "specialist",
    position: { x: 330, y: 145 },
    data: {
      label: "Company Researcher",
      description:
        "Executes web searches for company information using the plan from Search Planner. Writes structured company data to session.state.",
      pattern:
        "Specialist agent — single responsibility (research), reads plan from session.state, writes results back.",
    },
  },
  {
    id: "case-researcher",
    type: "specialist",
    position: { x: 60, y: 290 },
    data: {
      label: "Case Study Researcher",
      description:
        "Queries the vector index for relevant case studies using the company data from Company Researcher. Writes case study hits to session.state.",
      pattern:
        "Specialist agent — decoupled from other specialists, reads/writes session.state.",
    },
  },
  {
    id: "selector",
    type: "specialist",
    position: { x: 330, y: 290 },
    data: {
      label: "Selector",
      description:
        "Scores and selects the best case study from Case Study Researcher's results. Makes a binary selection and writes the winner to session.state.",
      pattern:
        "Specialist agent — decision responsibility only. Reads candidates, writes final selection.",
    },
  },
  {
    id: "email-drafter",
    type: "specialist",
    position: { x: 195, y: 420 },
    data: {
      label: "Email Drafter",
      description:
        "Final specialist. Reads company data and selected case study from session.state and drafts the outbound email. Failure is isolated — other specialists' outputs are preserved.",
      pattern:
        "Specialist agent — terminal node in sequence, reads from session.state, produces final artifact.",
    },
  },
  {
    id: "session-state",
    type: "memory",
    position: { x: 510, y: 240 },
    data: {
      label: "session.state",
      description:
        "Shared whiteboard for the entire agent pipeline. Each specialist publishes results via output_key and reads upstream results by key name. Persists for the duration of the InvocationContext.",
      pattern:
        "Shared context store — replaces return values and implicit coupling with explicit key-based handoffs.",
    },
  },
];

export type OrchestratedEdge = Edge<DelegationEdgeData, "delegation">;

/** Marker configuration reused across orchestrated edges. */
const ORCH_MARKER = { type: "arrowclosed" as const, color: "rgba(200,255,0,0.5)" };

export const ORCHESTRATED_EDGES: OrchestratedEdge[] = [
  // Sequential chain
  {
    id: "seq-planner",
    type: "delegation",
    source: "sequential",
    target: "search-planner",
    markerEnd: ORCH_MARKER,
    data: {
      label: "next →",
      description: "SequentialAgent delegates to Search Planner as step 1.",
      pattern: "Sequential delegation — defined execution order.",
      sourceLabel: "SequentialAgent",
      targetLabel: "Search Planner",
      relationshipType: "sequential-delegation",
    },
  },
  {
    id: "seq-researcher",
    type: "delegation",
    source: "sequential",
    target: "company-researcher",
    markerEnd: ORCH_MARKER,
    data: {
      label: "next →",
      description: "SequentialAgent delegates to Company Researcher as step 2.",
      pattern: "Sequential delegation.",
      sourceLabel: "SequentialAgent",
      targetLabel: "Company Researcher",
      relationshipType: "sequential-delegation",
    },
  },
  {
    id: "seq-case",
    type: "delegation",
    source: "sequential",
    target: "case-researcher",
    markerEnd: ORCH_MARKER,
    data: {
      label: "next →",
      description: "SequentialAgent delegates to Case Study Researcher as step 3.",
      pattern: "Sequential delegation.",
      sourceLabel: "SequentialAgent",
      targetLabel: "Case Study Researcher",
      relationshipType: "sequential-delegation",
    },
  },
  {
    id: "seq-selector",
    type: "delegation",
    source: "sequential",
    target: "selector",
    markerEnd: ORCH_MARKER,
    data: {
      label: "next →",
      description: "SequentialAgent delegates to Selector as step 4.",
      pattern: "Sequential delegation.",
      sourceLabel: "SequentialAgent",
      targetLabel: "Selector",
      relationshipType: "sequential-delegation",
    },
  },
  {
    id: "seq-email",
    type: "delegation",
    source: "sequential",
    target: "email-drafter",
    markerEnd: ORCH_MARKER,
    data: {
      label: "next →",
      description: "SequentialAgent delegates to Email Drafter as final step.",
      pattern: "Sequential delegation — terminal step.",
      sourceLabel: "SequentialAgent",
      targetLabel: "Email Drafter",
      relationshipType: "sequential-delegation",
    },
  },
  // Session state read/write edges — specialists read from and write to shared memory
  {
    id: "planner-state",
    type: "delegation",
    source: "search-planner",
    target: "session-state",
    markerEnd: { type: "arrowclosed" as const, color: "rgba(200,255,0,0.4)" },
    data: {
      label: "writes",
      description: "Search Planner writes its query plan to session.state via output_key.",
      pattern: "State write — explicit output_key handoff to downstream agents.",
      sourceLabel: "Search Planner",
      targetLabel: "session.state",
      relationshipType: "state-write",
    },
  },
  {
    id: "state-researcher",
    type: "delegation",
    source: "session-state",
    target: "company-researcher",
    markerEnd: { type: "arrowclosed" as const, color: "rgba(200,255,0,0.4)" },
    data: {
      label: "reads",
      description: "Company Researcher reads the query plan written by Search Planner.",
      pattern: "State read — reads upstream output_key, no direct coupling to Search Planner.",
      sourceLabel: "session.state",
      targetLabel: "Company Researcher",
      relationshipType: "state-read",
    },
  },
  {
    id: "researcher-state",
    type: "delegation",
    source: "company-researcher",
    target: "session-state",
    markerEnd: { type: "arrowclosed" as const, color: "rgba(200,255,0,0.4)" },
    data: {
      label: "writes",
      description: "Company Researcher writes its findings to session.state.",
      pattern: "State write.",
      sourceLabel: "Company Researcher",
      targetLabel: "session.state",
      relationshipType: "state-write",
    },
  },
  {
    id: "state-case",
    type: "delegation",
    source: "session-state",
    target: "case-researcher",
    markerEnd: { type: "arrowclosed" as const, color: "rgba(200,255,0,0.4)" },
    data: {
      label: "reads",
      description: "Case Study Researcher reads company data to inform its vector search.",
      pattern: "State read.",
      sourceLabel: "session.state",
      targetLabel: "Case Study Researcher",
      relationshipType: "state-read",
    },
  },
  {
    id: "case-state",
    type: "delegation",
    source: "case-researcher",
    target: "session-state",
    markerEnd: { type: "arrowclosed" as const, color: "rgba(200,255,0,0.4)" },
    data: {
      label: "writes",
      description: "Case Study Researcher writes candidate case studies to session.state.",
      pattern: "State write.",
      sourceLabel: "Case Study Researcher",
      targetLabel: "session.state",
      relationshipType: "state-write",
    },
  },
  {
    id: "state-selector",
    type: "delegation",
    source: "session-state",
    target: "selector",
    markerEnd: { type: "arrowclosed" as const, color: "rgba(200,255,0,0.4)" },
    data: {
      label: "reads",
      description: "Selector reads candidate case studies from session.state to score and select.",
      pattern: "State read.",
      sourceLabel: "session.state",
      targetLabel: "Selector",
      relationshipType: "state-read",
    },
  },
  {
    id: "selector-state",
    type: "delegation",
    source: "selector",
    target: "session-state",
    markerEnd: { type: "arrowclosed" as const, color: "rgba(200,255,0,0.4)" },
    data: {
      label: "writes",
      description: "Selector writes the winning case study selection to session.state.",
      pattern: "State write — single decision output.",
      sourceLabel: "Selector",
      targetLabel: "session.state",
      relationshipType: "state-write",
    },
  },
  {
    id: "state-email",
    type: "delegation",
    source: "session-state",
    target: "email-drafter",
    markerEnd: { type: "arrowclosed" as const, color: "rgba(200,255,0,0.4)" },
    data: {
      label: "reads",
      description: "Email Drafter reads company data and selected case study from session.state to compose the email.",
      pattern: "State read — terminal consumer, reads multiple upstream keys.",
      sourceLabel: "session.state",
      targetLabel: "Email Drafter",
      relationshipType: "state-read",
    },
  },
];
