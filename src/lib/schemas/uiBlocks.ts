/**
 * UIBlock schema — EXP_006 Generative UI Renderer.
 *
 * This file is the hard contract between the backend API and the frontend
 * renderer. Nix imports TypeScript types and Zod schemas from here.
 *
 * Design principles:
 *   - All props are plain JSON-serialisable scalars (string | number | boolean)
 *     so blocks can be safely transported over SSE without custom serialisers.
 *   - Per-type prop schemas are defined as individual Zod objects and then
 *     assembled into a discriminated union via UIBlockSchema. This lets the
 *     route handler validate each block in isolation before emitting it.
 *   - children is restricted to card and form containers. Other block types
 *     may not carry children — this is enforced at the Zod level.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Block type enum
// ---------------------------------------------------------------------------

export const BlockTypeSchema = z.enum([
    "heading",
    "paragraph",
    "button",
    "card",
    "stat",
    "form",
    "input_field",
    "divider",
    "badge",
]);

export type BlockType = z.infer<typeof BlockTypeSchema>;

// ---------------------------------------------------------------------------
// Per-block prop schemas
// ---------------------------------------------------------------------------

export const HeadingPropsSchema = z.object({
    text:  z.string().min(1),
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
});

export const ParagraphPropsSchema = z.object({
    text: z.string().min(1),
});

export const ButtonPropsSchema = z.object({
    label:   z.string().min(1),
    variant: z.enum(["primary", "secondary", "outline"]).optional(),
});

export const StatPropsSchema = z.object({
    label:  z.string().min(1),
    value:  z.string().min(1),
    change: z.string().optional(),
});

// card and form carry no required props themselves — content lives in children
export const CardPropsSchema = z.object({
    title:    z.string().min(1),
    subtitle: z.string().optional(),
});

export const FormPropsSchema = z.object({
    title: z.string().optional(),
});

export const InputFieldPropsSchema = z.object({
    label:       z.string().min(1),
    type:        z.enum(["text", "email", "password"]).optional(),
    placeholder: z.string().optional(),
});

// divider carries no props
export const DividerPropsSchema = z.object({});

export const BadgePropsSchema = z.object({
    text:    z.string().min(1),
    variant: z.enum(["default", "success", "warning", "error"]).optional(),
});

// ---------------------------------------------------------------------------
// UIBlock — discriminated union on `type`
//
// Forward-declare UIBlock as a type alias for the inferred schema so that
// children (recursive) can reference it. z.lazy() is used to handle recursion.
// ---------------------------------------------------------------------------

// Base fields shared by every block variant (id + type + optionally children).
// We define the container blocks (card, form) with z.lazy so children can
// reference the full UIBlockSchema without a circular import error.

const BaseBlockFields = {
    id: z.string().min(1),
} as const;

// Leaf blocks — no children allowed
const HeadingBlockSchema = z.object({
    ...BaseBlockFields,
    type:  z.literal("heading"),
    props: HeadingPropsSchema,
});

const ParagraphBlockSchema = z.object({
    ...BaseBlockFields,
    type:  z.literal("paragraph"),
    props: ParagraphPropsSchema,
});

const ButtonBlockSchema = z.object({
    ...BaseBlockFields,
    type:  z.literal("button"),
    props: ButtonPropsSchema,
});

const StatBlockSchema = z.object({
    ...BaseBlockFields,
    type:  z.literal("stat"),
    props: StatPropsSchema,
});

const InputFieldBlockSchema = z.object({
    ...BaseBlockFields,
    type:  z.literal("input_field"),
    props: InputFieldPropsSchema,
});

const DividerBlockSchema = z.object({
    ...BaseBlockFields,
    type:  z.literal("divider"),
    props: DividerPropsSchema,
});

const BadgeBlockSchema = z.object({
    ...BaseBlockFields,
    type:  z.literal("badge"),
    props: BadgePropsSchema,
});

// Container blocks — children is an array of UIBlock (recursive via z.lazy)
// We export the resolved type separately to avoid the z.ZodTypeAny trick.
const CardBlockSchema = z.object({
    ...BaseBlockFields,
    type:     z.literal("card"),
    props:    CardPropsSchema,
    children: z.lazy(() => z.array(UIBlockSchema)).optional(),
});

const FormBlockSchema = z.object({
    ...BaseBlockFields,
    type:     z.literal("form"),
    props:    FormPropsSchema,
    children: z.lazy(() => z.array(UIBlockSchema)).optional(),
});

// Full discriminated union
export const UIBlockSchema: z.ZodType<UIBlock> = z.discriminatedUnion("type", [
    HeadingBlockSchema,
    ParagraphBlockSchema,
    ButtonBlockSchema,
    CardBlockSchema,
    StatBlockSchema,
    FormBlockSchema,
    InputFieldBlockSchema,
    DividerBlockSchema,
    BadgeBlockSchema,
]);

// ---------------------------------------------------------------------------
// TypeScript types (inferred from schemas where possible)
// ---------------------------------------------------------------------------

export type HeadingProps    = z.infer<typeof HeadingPropsSchema>;
export type ParagraphProps  = z.infer<typeof ParagraphPropsSchema>;
export type ButtonProps     = z.infer<typeof ButtonPropsSchema>;
export type CardProps       = z.infer<typeof CardPropsSchema>;
export type StatProps       = z.infer<typeof StatPropsSchema>;
export type FormProps       = z.infer<typeof FormPropsSchema>;
export type InputFieldProps = z.infer<typeof InputFieldPropsSchema>;
export type DividerProps    = z.infer<typeof DividerPropsSchema>;
export type BadgeProps      = z.infer<typeof BadgePropsSchema>;

/**
 * A single rendered block in the canvas.
 *
 * props is typed as a union discriminated by type — use the per-block prop
 * types above when you need to narrow into a specific block's shape.
 */
export type UIBlock =
    | { id: string; type: "heading";     props: HeadingProps;    children?: never }
    | { id: string; type: "paragraph";   props: ParagraphProps;  children?: never }
    | { id: string; type: "button";      props: ButtonProps;     children?: never }
    | { id: string; type: "card";        props: CardProps;       children?: UIBlock[] }
    | { id: string; type: "stat";        props: StatProps;       children?: never }
    | { id: string; type: "form";        props: FormProps;       children?: UIBlock[] }
    | { id: string; type: "input_field"; props: InputFieldProps; children?: never }
    | { id: string; type: "divider";     props: DividerProps;    children?: never }
    | { id: string; type: "badge";       props: BadgeProps;      children?: never };

// ---------------------------------------------------------------------------
// UICanvas — the root object the LLM returns and SSE stream terminates with
// ---------------------------------------------------------------------------

export const UICanvasSchema = z.object({
    blocks: z.array(UIBlockSchema),
    theme:  z.enum(["default", "dark", "minimal"]).optional(),
});

export type UICanvas = z.infer<typeof UICanvasSchema>;

// ---------------------------------------------------------------------------
// SSE event types — the wire format sent from route handler to frontend
// ---------------------------------------------------------------------------

/** Emitted each time a complete, valid block is extracted from the LLM stream. */
export type BlockEvent = {
    type:  "block";
    block: UIBlock;
};

/** Emitted once after all blocks have been streamed. */
export type CanvasDoneEvent = {
    type:  "canvas_done";
    theme?: UICanvas["theme"];
};

/** Emitted if a block fails Zod validation or an unrecoverable parse error occurs. */
export type CanvasErrorEvent = {
    type:    "canvas_error";
    message: string;
};

export type UICanvasSSEEvent = BlockEvent | CanvasDoneEvent | CanvasErrorEvent;
