/**
 * Prompt templates for EXP_007 / EXP_008 — shared orchestration annotation API.
 *
 * Both the ADK Visualizer (EXP_007) and the Agent Orchestration Map (EXP_008)
 * use the same annotation endpoint. The prompts differ based on whether the
 * user has selected a node (a single architectural component) or an edge (a
 * relationship between two components), and whether the caller supplies
 * surrounding topology context (EXP_008 only).
 *
 * Prompt changes must be committed separately from code changes (per CLAUDE.md).
 */

// ---------------------------------------------------------------------------
// System prompt — shared across node and edge annotations
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT =
    "You are an expert in agentic AI systems architecture. The user has selected " +
    "an element in an agent topology diagram. Explain this element's architectural " +
    "role in exactly 3 sentences: what it is, when to use it, and what breaks if " +
    "this pattern is misapplied.";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Payload describing a node (single architectural component). */
export interface NodeElementData {
    label: string;
    description: string;
    pattern: string;
}

/** Payload describing an edge (directed relationship between two components). */
export interface EdgeElementData {
    label: string;
    description: string;
    pattern: string;
    sourceLabel: string;
    targetLabel: string;
    relationshipType: string;
}

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

/**
 * Builds the system and user messages for an annotation request.
 *
 * @param elementType     - 'node' for a single component, 'edge' for a relationship
 * @param elementData     - Structured data about the selected element. For edges,
 *                          sourceLabel, targetLabel, and relationshipType are used
 *                          in addition to the base label/description/pattern fields.
 * @param contextPrompt   - Optional: surrounding topology context sent by EXP_008
 *                          (e.g. "This node connects to an Orchestrator and two
 *                          Tool Agents"). Appended to the user message when present
 *                          so the model can tailor the explanation to the broader
 *                          architectural context. Not used by EXP_007.
 *
 * @returns { system, user } — ready to pass to the Anthropic messages API.
 */
export function buildAnnotationPrompt(
    elementType: "node" | "edge",
    elementData: NodeElementData | EdgeElementData,
    contextPrompt?: string
): { system: string; user: string } {
    let userMessage: string;

    if (elementType === "node") {
        const data = elementData as NodeElementData;
        userMessage =
            `I have selected the following node in an agent topology diagram:\n\n` +
            `Label: ${data.label}\n` +
            `Description: ${data.description}\n` +
            `Architectural pattern: ${data.pattern}`;
    } else {
        // Edge — include source/target and relationship type for directional context
        const data = elementData as EdgeElementData;
        userMessage =
            `I have selected the following edge in an agent topology diagram:\n\n` +
            `Label: ${data.label}\n` +
            `Description: ${data.description}\n` +
            `Architectural pattern: ${data.pattern}\n` +
            `Source component: ${data.sourceLabel}\n` +
            `Target component: ${data.targetLabel}\n` +
            `Relationship type: ${data.relationshipType}`;
    }

    // EXP_008 passes surrounding topology so the model can contextualise its
    // explanation within the broader architecture. EXP_007 omits this field.
    if (contextPrompt && contextPrompt.trim().length > 0) {
        userMessage += `\n\nSurrounding topology context:\n${contextPrompt.trim()}`;
    }

    return { system: SYSTEM_PROMPT, user: userMessage };
}
