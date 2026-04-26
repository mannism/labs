/** Status of an experiment — drives visual treatment and status indicator. */
export type ExperimentStatus = "live" | "beta" | "concept";

/** Schema for a single experiment entry in src/data/experiments.json. */
export interface Experiment {
  /** Unique numeric identifier. */
  id: string;
  /** URL-safe slug used for dynamic routing, e.g. "voice-particles". */
  slug: string;
  /** Display title shown on cards and detail pages. */
  title: string;
  /** 1-2 sentence summary of the experiment. */
  description: string;
  /** Technology tags (e.g. "WebGPU", "Web Audio"). */
  tags: string[];
  /** Current development status — drives status indicator color and pulse. */
  status: ExperimentStatus;
  /** Human input device the experiment requires (e.g. "Microphone", "Camera"). */
  inputType: string;
  /** Formatted experiment number for display (e.g. "EXP_001"). */
  experimentNumber: string;
  /** Grouping collection (e.g. "webgpu"). */
  collection: string;
  /**
   * Optional external URL for experiments whose live UI lives outside the
   * /playground/[slug] route (e.g. EXP_009 at /experiments/agentic-reliability/).
   * When present, ExperimentCard links here instead of /playground/[slug].
   */
  demoUrl?: string;
  /** Short concept statement — what it is and what it proves. */
  conceptStatement?: string;
  /** How It Works — detailed explanation paragraphs (array of {title, body}). */
  howItWorks?: { title: string; body: string }[];
  /** What This Experiment Proves — technical significance. */
  whatItProves?: string[];
}
