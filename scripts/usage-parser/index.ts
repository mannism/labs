/**
 * Claude Code Usage Parser
 *
 * Walks JSONL session logs under ~/.claude/projects/, aggregates token usage
 * by day and model tier, estimates costs using Anthropic pricing, and outputs
 * a JSON array of DayAggregate objects to stdout.
 *
 * High-water mark: ~/.claude/usage-hwm.json tracks the last processed
 * timestamp so incremental runs only parse new entries.
 *
 * Design decisions:
 * - Outputs to stdout so n8n can pipe directly without temp files
 * - Skips files whose first record doesn't match expected schema (logs warning)
 * - Aggregates only "assistant" type records — these carry token usage
 * - Cache write/read tokens are included in cost estimates at their respective rates
 * - <synthetic> and alias model IDs (e.g. "sonnet") are normalized to their tier
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import * as os from "os";

// ─── Types ────────────────────────────────────────────────────────────────────

type ModelTier = "opus" | "sonnet" | "haiku" | "unknown";

interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
}

/** Shape of an assistant record in a JSONL session log */
interface AssistantRecord {
  type: "assistant";
  timestamp: string;
  sessionId: string;
  message: {
    model: string;
    usage: TokenUsage;
  };
}

/** Accumulated stats for a single model tier within a day */
interface TierStats {
  tokensIn: number;
  tokensOut: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  sessions: Set<string>;
}

/** Final shape emitted to stdout per day */
interface DayAggregate {
  date: string; // YYYY-MM-DD
  opusTokensIn: number;
  opusTokensOut: number;
  sonnetTokensIn: number;
  sonnetTokensOut: number;
  haikuTokensIn: number;
  haikuTokensOut: number;
  totalTokens: number;
  opusSessions: number;
  sonnetSessions: number;
  haikuSessions: number;
  estimatedCostUsd: number;
  modelSplitPct: string; // e.g. "Opus 12% / Sonnet 73% / Haiku 15%"
  pipelineStatus: "success" | "partial" | "failed";
}

/** High-water mark file shape */
interface HwmFile {
  lastProcessedAt: string; // ISO 8601
}

// ─── Pricing (per token) — source: platform.claude.com/docs/en/about-claude/pricing ─────

/**
 * Pricing per single token (not per million).
 * Cache creation uses 1-hour cache write rates (most common in practice).
 * Cache reads use the 0.1x multiplier on base input.
 */
const PRICING: Record<
  ModelTier,
  {
    inputPerToken: number;
    outputPerToken: number;
    cacheCreationPerToken: number; // 1h cache write
    cacheReadPerToken: number;
  }
> = {
  opus: {
    // Opus 4.6 / 4.7: $5 input, $25 output, $10 cache write (1h), $0.50 cache read per MTok
    inputPerToken: 5 / 1_000_000,
    outputPerToken: 25 / 1_000_000,
    cacheCreationPerToken: 10 / 1_000_000,
    cacheReadPerToken: 0.5 / 1_000_000,
  },
  sonnet: {
    // Sonnet 4.6: $3 input, $15 output, $6 cache write (1h), $0.30 cache read per MTok
    inputPerToken: 3 / 1_000_000,
    outputPerToken: 15 / 1_000_000,
    cacheCreationPerToken: 6 / 1_000_000,
    cacheReadPerToken: 0.3 / 1_000_000,
  },
  haiku: {
    // Haiku 4.5: $1 input, $5 output, $2 cache write (1h), $0.10 cache read per MTok
    inputPerToken: 1 / 1_000_000,
    outputPerToken: 5 / 1_000_000,
    cacheCreationPerToken: 2 / 1_000_000,
    cacheReadPerToken: 0.1 / 1_000_000,
  },
  unknown: {
    // Fall back to sonnet pricing for unrecognised model IDs
    inputPerToken: 3 / 1_000_000,
    outputPerToken: 15 / 1_000_000,
    cacheCreationPerToken: 6 / 1_000_000,
    cacheReadPerToken: 0.3 / 1_000_000,
  },
};

// ─── Model normalisation ──────────────────────────────────────────────────────

/**
 * Maps a raw model ID from the JSONL log to a ModelTier.
 * Handles full IDs (e.g. "claude-opus-4-6"), alias shortnames ("sonnet"),
 * and the "<synthetic>" placeholder that Claude Code emits for tool-only turns.
 */
function classifyModel(model: string): ModelTier {
  const lower = model.toLowerCase();
  if (lower === "<synthetic>") return "unknown";
  if (lower.includes("opus")) return "opus";
  if (lower.includes("sonnet") || lower === "sonnet") return "sonnet";
  if (lower.includes("haiku") || lower === "haiku") return "haiku";
  return "unknown";
}

// ─── HWM helpers ─────────────────────────────────────────────────────────────

const HWM_PATH = path.join(os.homedir(), ".claude", "usage-hwm.json");

function readHwm(): Date | null {
  try {
    const raw = fs.readFileSync(HWM_PATH, "utf8");
    const parsed = JSON.parse(raw) as HwmFile;
    const d = new Date(parsed.lastProcessedAt);
    if (isNaN(d.getTime())) return null;
    return d;
  } catch {
    // File does not exist yet — first run, backfill everything
    return null;
  }
}

function writeHwm(ts: Date): void {
  const data: HwmFile = { lastProcessedAt: ts.toISOString() };
  fs.writeFileSync(HWM_PATH, JSON.stringify(data, null, 2), "utf8");
}

// ─── Schema validation ────────────────────────────────────────────────────────

/**
 * Validates that a parsed JSON object has the shape we need to extract
 * token data from. Returns true only for assistant-type records with usage.
 * Called on the first record per file to gate whether the file is processed.
 *
 * We treat schema mismatches as warnings (log to stderr, skip file) rather
 * than hard errors to avoid one malformed file blocking the whole run.
 */
function looksLikeAssistantRecord(obj: unknown): obj is AssistantRecord {
  if (typeof obj !== "object" || obj === null) return false;
  const r = obj as Record<string, unknown>;
  if (r["type"] !== "assistant") return false;
  if (typeof r["timestamp"] !== "string") return false;
  if (typeof r["sessionId"] !== "string") return false;
  const msg = r["message"];
  if (typeof msg !== "object" || msg === null) return false;
  const m = msg as Record<string, unknown>;
  if (typeof m["model"] !== "string") return false;
  const usage = m["usage"];
  if (typeof usage !== "object" || usage === null) return false;
  const u = usage as Record<string, unknown>;
  if (typeof u["input_tokens"] !== "number") return false;
  if (typeof u["output_tokens"] !== "number") return false;
  return true;
}

// ─── JSONL file processor ─────────────────────────────────────────────────────

/**
 * Reads a JSONL file line by line. On the first assistant record encountered,
 * validates the schema. If valid, accumulates token counts into `accumulator`
 * for all entries newer than `since`.
 *
 * Returns the latest timestamp seen in this file (or null if none processed).
 */
async function processJsonlFile(
  filePath: string,
  since: Date | null,
  accumulator: Map<string, Map<ModelTier, TierStats>>
): Promise<Date | null> {
  let latestTs: Date | null = null;
  let schemaValidated = false;
  let schemaValid = false;
  let lineNumber = 0;

  const stream = fs.createReadStream(filePath, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  try {
    for await (const line of rl) {
      lineNumber++;
      const trimmed = line.trim();
      if (!trimmed) continue;

      let record: unknown;
      try {
        record = JSON.parse(trimmed);
      } catch {
        // Skip malformed JSON lines silently — partial writes can produce these
        continue;
      }

      // Only process assistant records (they carry token usage)
      const r = record as Record<string, unknown>;
      if (r["type"] !== "assistant") continue;

      // Validate schema on first assistant record
      if (!schemaValidated) {
        schemaValidated = true;
        if (!looksLikeAssistantRecord(record)) {
          process.stderr.write(
            `[usage-parser] WARN: schema mismatch in ${filePath} at line ${lineNumber}, skipping file\n`
          );
          schemaValid = false;
          rl.close();
          stream.destroy();
          return null;
        }
        schemaValid = true;
      }

      if (!schemaValid) break;

      const rec = record as AssistantRecord;

      // Parse timestamp
      const ts = new Date(rec.timestamp);
      if (isNaN(ts.getTime())) continue;

      // HWM filter — skip entries we've already processed
      if (since !== null && ts <= since) continue;

      // Track latest timestamp for HWM update
      if (latestTs === null || ts > latestTs) {
        latestTs = ts;
      }

      const dateKey = ts.toISOString().slice(0, 10); // YYYY-MM-DD
      const tier = classifyModel(rec.message.model);
      const usage = rec.message.usage;

      // Initialise nested maps on demand
      if (!accumulator.has(dateKey)) {
        accumulator.set(dateKey, new Map());
      }
      const dayMap = accumulator.get(dateKey)!;
      if (!dayMap.has(tier)) {
        dayMap.set(tier, {
          tokensIn: 0,
          tokensOut: 0,
          cacheCreationTokens: 0,
          cacheReadTokens: 0,
          sessions: new Set(),
        });
      }
      const stats = dayMap.get(tier)!;

      stats.tokensIn += usage.input_tokens ?? 0;
      stats.tokensOut += usage.output_tokens ?? 0;
      stats.cacheCreationTokens += usage.cache_creation_input_tokens ?? 0;
      stats.cacheReadTokens += usage.cache_read_input_tokens ?? 0;
      stats.sessions.add(rec.sessionId);
    }
  } catch (err) {
    // Log read errors to stderr and return whatever we managed to collect
    process.stderr.write(
      `[usage-parser] ERROR reading ${filePath}: ${String(err)}\n`
    );
  } finally {
    rl.close();
  }

  return latestTs;
}

// ─── File discovery ───────────────────────────────────────────────────────────

/**
 * Recursively walks a directory and returns all .jsonl file paths.
 * Handles subagent directories (e.g. <session-uuid>/subagents/*.jsonl).
 */
function findJsonlFiles(dir: string): string[] {
  const results: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findJsonlFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
      results.push(fullPath);
    }
  }
  return results;
}

// ─── Cost calculation ─────────────────────────────────────────────────────────

function calculateTierCost(tier: ModelTier, stats: TierStats): number {
  const p = PRICING[tier];
  return (
    stats.tokensIn * p.inputPerToken +
    stats.tokensOut * p.outputPerToken +
    stats.cacheCreationTokens * p.cacheCreationPerToken +
    stats.cacheReadTokens * p.cacheReadPerToken
  );
}

// ─── Aggregation → output ─────────────────────────────────────────────────────

function buildDayAggregates(
  accumulator: Map<string, Map<ModelTier, TierStats>>
): DayAggregate[] {
  const results: DayAggregate[] = [];

  for (const [date, dayMap] of accumulator) {
    const opus = dayMap.get("opus") ?? {
      tokensIn: 0,
      tokensOut: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      sessions: new Set<string>(),
    };
    const sonnet = dayMap.get("sonnet") ?? {
      tokensIn: 0,
      tokensOut: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      sessions: new Set<string>(),
    };
    const haiku = dayMap.get("haiku") ?? {
      tokensIn: 0,
      tokensOut: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      sessions: new Set<string>(),
    };

    const totalTokens =
      opus.tokensIn +
      opus.tokensOut +
      sonnet.tokensIn +
      sonnet.tokensOut +
      haiku.tokensIn +
      haiku.tokensOut;

    const estimatedCostUsd =
      calculateTierCost("opus", opus) +
      calculateTierCost("sonnet", sonnet) +
      calculateTierCost("haiku", haiku);

    // Model split based on output tokens (a proxy for generation volume)
    const totalOut = opus.tokensOut + sonnet.tokensOut + haiku.tokensOut;
    const pct = (n: number): string =>
      totalOut > 0 ? `${Math.round((n / totalOut) * 100)}%` : "0%";

    const modelSplitPct = `Opus ${pct(opus.tokensOut)} / Sonnet ${pct(sonnet.tokensOut)} / Haiku ${pct(haiku.tokensOut)}`;

    results.push({
      date,
      opusTokensIn: opus.tokensIn,
      opusTokensOut: opus.tokensOut,
      sonnetTokensIn: sonnet.tokensIn,
      sonnetTokensOut: sonnet.tokensOut,
      haikuTokensIn: haiku.tokensIn,
      haikuTokensOut: haiku.tokensOut,
      totalTokens,
      opusSessions: opus.sessions.size,
      sonnetSessions: sonnet.sessions.size,
      haikuSessions: haiku.sessions.size,
      estimatedCostUsd: Math.round(estimatedCostUsd * 100000) / 100000,
      modelSplitPct,
      pipelineStatus: "success",
    });
  }

  // Sort chronologically
  results.sort((a, b) => a.date.localeCompare(b.date));
  return results;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const projectsDir = path.join(os.homedir(), ".claude", "projects");

  // Read high-water mark (null = first run, backfill all history)
  const since = readHwm();
  if (since) {
    process.stderr.write(
      `[usage-parser] Incremental run: processing entries after ${since.toISOString()}\n`
    );
  } else {
    process.stderr.write(
      `[usage-parser] First run: backfilling all historical data\n`
    );
  }

  // Discover all JSONL files
  const files = findJsonlFiles(projectsDir);
  process.stderr.write(`[usage-parser] Found ${files.length} JSONL files\n`);

  // Accumulator: date → tier → stats
  const accumulator = new Map<string, Map<ModelTier, TierStats>>();
  let latestTs: Date | null = null;
  let filesProcessed = 0;
  let filesSkipped = 0;

  for (const filePath of files) {
    const fileLatest = await processJsonlFile(filePath, since, accumulator);
    if (fileLatest !== null) {
      filesProcessed++;
      if (latestTs === null || fileLatest > latestTs) {
        latestTs = fileLatest;
      }
    } else {
      filesSkipped++;
    }
  }

  process.stderr.write(
    `[usage-parser] Processed ${filesProcessed} files, skipped ${filesSkipped} (schema mismatch or empty)\n`
  );

  // Build output
  const aggregates = buildDayAggregates(accumulator);

  if (aggregates.length === 0) {
    process.stderr.write(
      `[usage-parser] No new data found since HWM. Outputting empty array.\n`
    );
    process.stdout.write(JSON.stringify([], null, 2) + "\n");
    return;
  }

  // Report summary to stderr (stdout is reserved for JSON output)
  const totalTokens = aggregates.reduce((s, d) => s + d.totalTokens, 0);
  const totalCost = aggregates.reduce((s, d) => s + d.estimatedCostUsd, 0);
  const dateRange = `${aggregates[0].date} → ${aggregates[aggregates.length - 1].date}`;
  process.stderr.write(
    `[usage-parser] Summary: ${aggregates.length} days, ${dateRange}, ` +
      `${totalTokens.toLocaleString()} tokens, ~$${totalCost.toFixed(4)} estimated\n`
  );

  // Update HWM only after successful aggregation
  if (latestTs !== null) {
    try {
      writeHwm(latestTs);
      process.stderr.write(
        `[usage-parser] HWM updated to ${latestTs.toISOString()}\n`
      );
    } catch (err) {
      process.stderr.write(
        `[usage-parser] WARN: failed to write HWM: ${String(err)}\n`
      );
    }
  }

  // Emit JSON to stdout
  process.stdout.write(JSON.stringify(aggregates, null, 2) + "\n");
}

main().catch((err: unknown) => {
  process.stderr.write(`[usage-parser] FATAL: ${String(err)}\n`);
  process.exit(1);
});
