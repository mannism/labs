/**
 * System prompt assembly with tiered context injection for the Digital Twin.
 *
 * Context tiers:
 *   - Always-injected (9 files): included in every API call via template placeholders.
 *   - On-demand (4 files): injected only when the user's message matches keyword lists.
 *
 * mtime-based caching: files are re-read from disk only when their modification
 * time changes, so edits take effect without a server restart.
 *
 * Port of telegram-digital-twin/app/core/prompts.py.
 */

import { readFileSync, statSync } from "fs";
import { join }                   from "path";

// Resolve once relative to project root.
// process.cwd() is the project root in both `next dev` and `output: "standalone"`.
const DATA_ROOT    = join(process.cwd(), "src", "data", "twin");
const CONTEXT_ROOT = join(DATA_ROOT, "context");

// ── Tiered context file lists ─────────────────────────────────────────────────

/** Always-injected files, ordered for optimal model attention. */
const ALWAYS_FILES = [
    "profile-summary.md",
    "positioning.md",
    "recent-experience.md",
    "projects.md",
    "experiments.md",
    "agentic-workflow.md",
    "personal.md",
    "tools.md",
    "links.md",
] as const;

/** On-demand files, injected only when keyword triggers match. */
const ON_DEMAND_FILES: Record<string, string> = {
    early_career:    "early-career.md",
    tools_legacy:    "tools-legacy.md",
    ai_team:         "ai-team.md",
    creative_coding: "creative-coding.md",
};

// ── Keyword trigger lists (port of prompts.py constants) ──────────────────────

const EARLY_CAREER_KEYWORDS = [
    "early career", "first job", "first role", "started career",
    "bbdo", "proximity", "upper storey", "sembcorp", "asia compass",
    "send.com", "glaxo", "densfield", "mentor graphics",
    "2000", "2001", "2002", "2003", "2004", "2005", "2006", "2007",
    "2008", "2009", "2010", "2011", "2012", "2013", "2014", "2015",
    "2016", "2017",
    "visa app", "exxonmobil", "discovery channel", "daimler",
];

const LEGACY_TOOLS_KEYWORDS = [
    "asp.net", "vb.net", "vbscript", "c#", "assembly",
    "com/dcom", ".net framework", "sql server", "t-sql", "oracle",
    "legacy", "older tech", "early tech",
];

/** Keywords that trigger injection of the full AI team roster. */
const AI_TEAM_KEYWORDS = [
    "team", "sheena", "nix", "sable", "reid", "vera", "cleo",
    "maya", "tom", "jo", "oren", "lena", "quinn",
    "who works", "how many people", "delegation", "ai team",
    "agents", "who is on your team",
];

/** Keywords that trigger injection of the creative coding / Labs v2 animations context. */
const CREATIVE_CODING_KEYWORDS = [
    "animation", "creative coding", "boot sequence", "glitch",
    "canvas", "signal field", "ghost type", "datamosh",
    "proximity pulse", "system boot", "speculative interface",
    "labs v2", "chartreuse", "particle",
    "voice particle", "gesture fluid", "crowd flow",
    "fluid simulation", "boids", "reaction-diffusion",
    "playground", "webgpu", "navier-stokes", "navier stokes",
];

// ── Cache types ───────────────────────────────────────────────────────────────

interface FileCache {
    content: string;
    mtime:   number;
}

let systemCache:    FileCache | null = null;
let summariseCache: FileCache | null = null;
const onDemandCache = new Map<string, FileCache>();

// ── File helpers ──────────────────────────────────────────────────────────────

function readFile(path: string): string {
    return readFileSync(path, "utf-8");
}

function getMtime(path: string): number {
    try {
        return statSync(path).mtimeMs;
    } catch {
        return 0;
    }
}

function maxMtime(paths: string[]): number {
    return Math.max(...paths.map(getMtime));
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Builds the assembled system prompt from the template + always-injected context.
 * On-demand placeholders ({AI_TEAM}, {CREATIVE_CODING}) are cleared to empty
 * strings here — their content is injected per-turn via getOnDemandContext().
 * Uses mtime caching — reloads only when any source file has changed on disk.
 */
export function getSystemPrompt(): string {
    const templatePath  = join(DATA_ROOT, "System-prompt.md");
    const alwaysPaths   = ALWAYS_FILES.map((f) => join(CONTEXT_ROOT, f));
    const allPaths      = [templatePath, ...alwaysPaths];
    const currentMtime  = maxMtime(allPaths);

    if (!systemCache || currentMtime > systemCache.mtime) {
        try {
            let prompt = readFile(templatePath);
            prompt = prompt.replace("{PROFILE_SUMMARY}",    readFile(join(CONTEXT_ROOT, "profile-summary.md")));
            prompt = prompt.replace("{POSITIONING}",        readFile(join(CONTEXT_ROOT, "positioning.md")));
            prompt = prompt.replace("{RECENT_EXPERIENCE}",  readFile(join(CONTEXT_ROOT, "recent-experience.md")));
            prompt = prompt.replace("{PROJECTS}",           readFile(join(CONTEXT_ROOT, "projects.md")));
            prompt = prompt.replace("{EXPERIMENTS}",        readFile(join(CONTEXT_ROOT, "experiments.md")));
            prompt = prompt.replace("{AGENTIC_WORKFLOW}",   readFile(join(CONTEXT_ROOT, "agentic-workflow.md")));
            prompt = prompt.replace("{PERSONAL}",           readFile(join(CONTEXT_ROOT, "personal.md")));
            prompt = prompt.replace("{TOOLS}",              readFile(join(CONTEXT_ROOT, "tools.md")));
            prompt = prompt.replace("{LINKS}",              readFile(join(CONTEXT_ROOT, "links.md")));

            // On-demand placeholders — cleared by default, filled per-turn when triggered.
            prompt = prompt.replace("{AI_TEAM}",        "");
            prompt = prompt.replace("{CREATIVE_CODING}", "");

            systemCache = { content: prompt, mtime: currentMtime };
        } catch (err) {
            console.error("[twin/prompts] error loading system prompt:", err);
            if (systemCache) return systemCache.content; // serve stale cache on error
            return "You are Diana's Digital Twin. Please check the server logs for data loading errors.";
        }
    }

    return systemCache.content;
}

/**
 * Loads the summarisation prompt with mtime caching.
 */
export function getSummarisePrompt(): string {
    const filePath     = join(DATA_ROOT, "summarise-prompt.md");
    const currentMtime = getMtime(filePath);

    if (!summariseCache || currentMtime > summariseCache.mtime) {
        try {
            summariseCache = { content: readFile(filePath).trim(), mtime: currentMtime };
        } catch (err) {
            console.error("[twin/prompts] error loading summarise prompt:", err);
            if (summariseCache) return summariseCache.content;
            return "Summarize the conversation retaining key details.";
        }
    }

    return summariseCache.content;
}

/**
 * Loads an on-demand context file by key.
 * Returns an empty string if the key is unknown or the file cannot be read.
 */
export function getOnDemandContext(key: string): string {
    const filename = ON_DEMAND_FILES[key];
    if (!filename) return "";

    const filePath     = join(CONTEXT_ROOT, filename);
    const currentMtime = getMtime(filePath);
    const cached       = onDemandCache.get(key);

    if (!cached || currentMtime > cached.mtime) {
        try {
            const content = readFile(filePath);
            onDemandCache.set(key, { content, mtime: currentMtime });
            return content;
        } catch (err) {
            console.error(`[twin/prompts] error loading on-demand context '${key}':`, err);
            return cached?.content ?? "";
        }
    }

    return cached.content;
}

/**
 * Checks the user's message against keyword lists and returns which on-demand
 * context keys should be injected for this turn.
 */
export function checkOnDemandKeywords(userText: string): string[] {
    const lower  = userText.toLowerCase();
    const extras: string[] = [];
    if (EARLY_CAREER_KEYWORDS.some((kw) => lower.includes(kw)))    extras.push("early_career");
    if (LEGACY_TOOLS_KEYWORDS.some((kw) => lower.includes(kw)))    extras.push("tools_legacy");
    if (AI_TEAM_KEYWORDS.some((kw) => lower.includes(kw)))         extras.push("ai_team");
    if (CREATIVE_CODING_KEYWORDS.some((kw) => lower.includes(kw))) extras.push("creative_coding");
    return extras;
}
