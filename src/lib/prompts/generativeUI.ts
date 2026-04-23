/**
 * Prompt templates for EXP_006 — Generative UI Renderer.
 *
 * The system prompt embeds a plain JSON Schema describing UICanvas so the
 * model has a precise structural contract to target. Three worked examples
 * are included: a stats card, a sign-up form, and a heading + paragraph +
 * button landing-page strip. Examples drive compliance far more reliably than
 * instructions alone.
 *
 * Prompt changes must be committed separately from code changes (per CLAUDE.md).
 *
 * Exports:
 *   GENERATIVE_UI_SYSTEM_PROMPT — static system message, embedded once per call
 *   buildGenerativeUIUserMessage — builds the user message from a raw prompt string
 */

// ---------------------------------------------------------------------------
// JSON Schema embedded in the system prompt
//
// Plain JSON Schema (not TypeScript) so the model sees exactly the wire format
// it must produce, without TypeScript-isms like discriminated union syntax.
// ---------------------------------------------------------------------------

const UI_CANVAS_JSON_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    title: "UICanvas",
    type: "object",
    required: ["blocks"],
    properties: {
        blocks: {
            type: "array",
            items: { $ref: "#/definitions/UIBlock" },
        },
        theme: {
            type: "string",
            enum: ["default", "dark", "minimal"],
            description: "Optional visual theme for the entire canvas.",
        },
    },
    definitions: {
        UIBlock: {
            type: "object",
            required: ["id", "type", "props"],
            properties: {
                id: {
                    type: "string",
                    description: "Unique identifier for the block. Use short incrementing strings: '1', '2', '3'.",
                },
                type: {
                    type: "string",
                    enum: [
                        "heading", "paragraph", "button", "card",
                        "stat", "form", "input_field", "divider", "badge",
                    ],
                },
                props: {
                    type: "object",
                    description: "Block-specific properties. See per-type prop definitions below.",
                },
                children: {
                    type: "array",
                    items: { $ref: "#/definitions/UIBlock" },
                    description: "Inner blocks. Only valid on 'card' and 'form' type blocks.",
                },
            },
        },
        HeadingProps:    { required: ["text"], properties: { text: { type: "string" }, level: { type: "number", enum: [1, 2, 3] } } },
        ParagraphProps:  { required: ["text"], properties: { text: { type: "string" } } },
        ButtonProps:     { required: ["label"], properties: { label: { type: "string" }, variant: { type: "string", enum: ["primary", "secondary", "outline"] } } },
        CardProps:       { required: ["title"], properties: { title: { type: "string" }, subtitle: { type: "string" } } },
        StatProps:       { required: ["label", "value"], properties: { label: { type: "string" }, value: { type: "string" }, change: { type: "string" } } },
        FormProps:       { properties: { title: { type: "string" } } },
        InputFieldProps: { required: ["label"], properties: { label: { type: "string" }, type: { type: "string", enum: ["text", "email", "password"] }, placeholder: { type: "string" } } },
        DividerProps:    { properties: {} },
        BadgeProps:      { required: ["text"], properties: { text: { type: "string" }, variant: { type: "string", enum: ["default", "success", "warning", "error"] } } },
    },
} as const;

// ---------------------------------------------------------------------------
// Worked examples
//
// Three concrete UICanvas objects demonstrating correct structure.
// They are serialised into the system prompt so the model can see valid JSON
// before being asked to produce its own.
// ---------------------------------------------------------------------------

const EXAMPLE_STATS_CARD: object = {
    theme: "default",
    blocks: [
        {
            id: "1",
            type: "card",
            props: { title: "Monthly Revenue", subtitle: "April 2026" },
            children: [
                { id: "2", type: "stat", props: { label: "Total Revenue", value: "$48,320", change: "+12.4%" } },
                { id: "3", type: "stat", props: { label: "New Customers",  value: "214",     change: "+8.1%"  } },
                { id: "4", type: "stat", props: { label: "Churn Rate",     value: "2.3%",    change: "-0.5%"  } },
            ],
        },
    ],
};

const EXAMPLE_SIGNUP_FORM: object = {
    theme: "minimal",
    blocks: [
        { id: "1", type: "heading",   props: { text: "Create your account", level: 2 } },
        { id: "2", type: "paragraph", props: { text: "Join thousands of teams already using the platform." } },
        {
            id: "3",
            type: "form",
            props: { title: "Sign Up" },
            children: [
                { id: "4", type: "input_field", props: { label: "Full name",      type: "text",     placeholder: "Jane Smith"         } },
                { id: "5", type: "input_field", props: { label: "Email address",  type: "email",    placeholder: "jane@example.com"   } },
                { id: "6", type: "input_field", props: { label: "Password",       type: "password", placeholder: "At least 8 characters" } },
                { id: "7", type: "button",      props: { label: "Create account", variant: "primary" } },
            ],
        },
    ],
};

const EXAMPLE_LANDING_STRIP: object = {
    theme: "default",
    blocks: [
        { id: "1", type: "badge",     props: { text: "Now in beta", variant: "success" } },
        { id: "2", type: "heading",   props: { text: "Ship faster with AI", level: 1 } },
        { id: "3", type: "paragraph", props: { text: "Stop wrestling with boilerplate. Describe what you need and let the AI build it for you in seconds." } },
        { id: "4", type: "divider",   props: {} },
        { id: "5", type: "button",    props: { label: "Get started free", variant: "primary"   } },
        { id: "6", type: "button",    props: { label: "See examples",     variant: "secondary" } },
    ],
};

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

export const GENERATIVE_UI_SYSTEM_PROMPT = `You are a UI composition engine. Your job is to translate a natural-language description into a UICanvas JSON object.

## Output rules
- Return ONLY valid UICanvas JSON. No markdown code fences. No prose. No explanation. No comments inside the JSON.
- The response must be parseable by JSON.parse() without any pre-processing.
- Every block must have a unique "id" field (use incrementing integers: "1", "2", "3", …).
- Only "card" and "form" block types may have a "children" array.
- Use the correct props shape for each block type as defined in the schema below.
- If the description is ambiguous, make a reasonable layout choice and return it.

## UICanvas JSON Schema
${JSON.stringify(UI_CANVAS_JSON_SCHEMA, null, 2)}

## Examples

### Example 1 — Stats card
${JSON.stringify(EXAMPLE_STATS_CARD, null, 2)}

### Example 2 — Sign-up form
${JSON.stringify(EXAMPLE_SIGNUP_FORM, null, 2)}

### Example 3 — Landing page strip (heading + paragraph + button)
${JSON.stringify(EXAMPLE_LANDING_STRIP, null, 2)}`;

// ---------------------------------------------------------------------------
// User message builder
// ---------------------------------------------------------------------------

/**
 * Builds the user message for a single generative-UI call.
 *
 * Appends a closing instruction reminding the model to return only JSON —
 * this redundancy is intentional: models are more compliant when the
 * constraint is repeated at the end of the user turn.
 *
 * @param prompt — the raw user description (already validated, max 200 chars)
 */
export function buildGenerativeUIUserMessage(prompt: string): string {
    return `${prompt.trim()}

Remember: return only valid UICanvas JSON. No markdown fences. No prose.`;
}
