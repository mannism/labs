/**
 * capture-experiments.ts
 *
 * Playwright + ffmpeg pipeline for generating looping WebM VP9 preview clips
 * for each experiment card on /playground.
 *
 * Usage:
 *   npm run capture-experiments
 *   npm run capture-experiments -- --dry-run      # print plan, no captures
 *   npm run capture-experiments -- --slug voice-particles  # single experiment
 *
 * Requirements:
 *   - macOS with a GPU (WebGPU experiments require hardware acceleration)
 *   - ffmpeg installed and on PATH (`brew install ffmpeg`)
 *   - Playwright Chromium installed (`npx playwright install chromium`)
 *   - Next.js dev server running on localhost:3000 (`npm run dev`)
 *
 * Output:
 *   public/experiment-previews/{slug}.webm
 *
 * See scripts/README.md for full documentation.
 */

import { chromium } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExperimentConfig {
  /** URL path relative to the dev server root. */
  path: string;
  /** Browser viewport width for capture. Final output is 640×360. */
  viewportWidth: number;
  /** Browser viewport height for capture. */
  viewportHeight: number;
  /**
   * Milliseconds to wait after page load before starting the timed capture.
   * WebGPU/Three.js experiments need longer warmup; static/SSE experiments
   * can start immediately.
   */
  idleWaitMs: number;
  /**
   * Milliseconds of recording to capture (before ffmpeg trim).
   * Aim for 3500–4000ms so the 3s VP9 output has clean head/tail frames.
   */
  captureMs: number;
  /**
   * Human-readable reason for the warmup/capture duration choices.
   * Purely documentary — helps Owner re-tune without reading the full script.
   */
  note: string;
}

// ---------------------------------------------------------------------------
// Per-experiment configuration map
// ---------------------------------------------------------------------------
// Owner can edit idleWaitMs / captureMs / viewportWidth / viewportHeight
// without touching script logic. All other fields are structural.
//
// Capture strategy per experiment:
//   WebGPU / Three.js (voice-particles, gesture-fluid, crowd-flow):
//     Longer idleWaitMs — GPU init + shader compilation takes 2-4s on first
//     frame. Input-driven experiments captured in idle/breathing mode only
//     (no mic, no mouse) per brief's out-of-scope clause.
//
//   Canvas 2D simulations (gesture-fluid, crowd-flow):
//     gesture-fluid: idle ambient wisps visible without pointer input.
//     crowd-flow: agents run autonomously; idle state shows flocking + RD.
//
//   Agent-ops / SSE experiments (routines-repo-audit, autonomous-brand-pipeline,
//   adk-visualizer, orchestration-map, generative-ui-renderer, agentic-reliability):
//     Shorter warmup (React + SSE setup is fast). Capture the default/resting UI
//     state — form + preset filled, diagram pre-loaded, etc.

const EXPERIMENT_CONFIGS: Record<string, ExperimentConfig> = {
  "voice-particles": {
    path: "/playground/voice-particles",
    viewportWidth: 1280,
    viewportHeight: 720,
    idleWaitMs: 4000,
    captureMs: 4000,
    note:
      "WebGPU + Three.js. 4s warmup for GPU init and shader compilation. " +
      "Captured in idle breathing-sphere mode (no mic) per brief. " +
      "Particle field animates continuously without audio input.",
  },
  "gesture-fluid": {
    path: "/playground/gesture-fluid",
    viewportWidth: 1280,
    viewportHeight: 720,
    idleWaitMs: 3000,
    captureMs: 4000,
    note:
      "Canvas 2D Navier-Stokes. 3s warmup for canvas setup + initial fluid state. " +
      "Captured in idle mode: ambient wisps inject automatically after 3s of no pointer input. " +
      "No mouse movement injected — idle mode is visually rich.",
  },
  "crowd-flow": {
    path: "/playground/crowd-flow",
    viewportWidth: 1280,
    viewportHeight: 720,
    idleWaitMs: 3500,
    captureMs: 4000,
    note:
      "Canvas 2D Boids + Gray-Scott. 3.5s warmup for agent initialization and " +
      "initial flocking formation. Agents run autonomously; RD patterns emerge ~2s in.",
  },
  "routines-repo-audit": {
    path: "/playground/routines-repo-audit",
    viewportWidth: 1280,
    viewportHeight: 720,
    idleWaitMs: 1500,
    captureMs: 3500,
    note:
      "Agent-ops informational page. 1.5s warmup for React hydration. " +
      "Captures the static detail page with experiment description — no live data.",
  },
  "autonomous-brand-pipeline": {
    path: "/playground/autonomous-brand-pipeline",
    viewportWidth: 1280,
    viewportHeight: 720,
    idleWaitMs: 2000,
    captureMs: 3500,
    note:
      "SSE pipeline UI. 2s warmup for React hydration + form state init. " +
      "Captures the resting form state with Luxury Sustainable Fashion preset visible.",
  },
  "adk-visualizer": {
    path: "/playground/adk-visualizer",
    viewportWidth: 1280,
    viewportHeight: 720,
    idleWaitMs: 2500,
    captureMs: 3500,
    note:
      "React Flow topology diagram. 2.5s warmup for React Flow canvas render + " +
      "node layout stabilisation. Captures the pre-loaded orchestrated topology.",
  },
  "orchestration-map": {
    path: "/playground/orchestration-map",
    viewportWidth: 1280,
    viewportHeight: 720,
    idleWaitMs: 2500,
    captureMs: 3500,
    note:
      "React Flow drag-and-drop builder. 2.5s warmup for canvas init. " +
      "Captures the empty canvas with node palette visible — resting state.",
  },
  "generative-ui-renderer": {
    path: "/playground/generative-ui-renderer",
    viewportWidth: 1280,
    viewportHeight: 720,
    idleWaitMs: 1500,
    captureMs: 3500,
    note:
      "LLM generative UI. 1.5s warmup for React hydration. " +
      "Captures the resting form state — text input + generate button.",
  },
  "agentic-reliability": {
    path: "/playground/agentic-reliability",
    viewportWidth: 1280,
    viewportHeight: 720,
    idleWaitMs: 1500,
    captureMs: 3500,
    note:
      "Benchmark dashboard. 1.5s warmup. " +
      "Captures the resting state: three model columns, task rows, run button.",
  },
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Base URL of the dev server. Must be running before this script starts. */
const BASE_URL = "http://localhost:3000";

/** Final output directory — committed to repo in Stage 3. */
const OUTPUT_DIR = resolve("public/experiment-previews");

/** Temporary directory for raw Playwright video files (gitignored). */
const TEMP_DIR = resolve(".playwright-capture-tmp");

/** Final video dimensions. Card preview area is 180px tall; capture at 1280×720
 *  (full page), then crop/scale to 640×360 (2× card height) in ffmpeg.
 *  640×360 is the canonical output size Nix will read in Stage 2. */
const OUTPUT_WIDTH = 640;
const OUTPUT_HEIGHT = 360;

/** Target duration of the looping clip in seconds. */
const CLIP_DURATION_SECONDS = 3;

/**
 * VP9 CRF value. Range 0 (lossless) – 63 (worst). 33 targets ~200–400 KB
 * per clip at 640×360×3s. Increase (lower quality) if files exceed 500 KB.
 * Owner can tune by re-running with different values.
 */
const VP9_CRF = 33;

/** VP9 bitrate cap. Constrains file size ceiling independent of CRF. */
const VP9_BITRATE = "400k";

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const slugArg = (() => {
  const idx = args.indexOf("--slug");
  return idx !== -1 ? args[idx + 1] : undefined;
})();

// ---------------------------------------------------------------------------
// Preflight checks
// ---------------------------------------------------------------------------

/**
 * Fail-fast: verify the environment meets all script requirements before
 * touching any files. Better to abort immediately than fail mid-capture.
 */
function runPreflightChecks(): void {
  console.log("[preflight] Checking environment...");

  // Platform check — WebGPU experiments require macOS GPU.
  // On non-Mac the script still runs for non-WebGPU experiments, but
  // voice-particles / gesture-fluid / crowd-flow captures will be blank.
  if (process.platform !== "darwin") {
    console.warn(
      "[preflight] WARNING: Non-macOS platform detected. " +
        "WebGPU experiments (voice-particles, gesture-fluid, crowd-flow) " +
        "require a Mac with GPU and will produce blank frames on Linux/Windows. " +
        "Continuing — non-WebGPU experiments will still capture correctly."
    );
  }

  // ffmpeg check — script shells out to system ffmpeg.
  const ffmpegResult = spawnSync("ffmpeg", ["-version"], {
    encoding: "utf8",
    stdio: "pipe",
  });
  if (ffmpegResult.status !== 0 || ffmpegResult.error) {
    throw new Error(
      "[preflight] FATAL: ffmpeg not found on PATH. " +
        "Install with: brew install ffmpeg"
    );
  }
  console.log("[preflight] ffmpeg: OK");

  // Dev server reachability check.
  // spawnSync with an arg array avoids any shell-interpolation risk if
  // BASE_URL were ever made configurable. Consistent with all other
  // child_process calls in this script.
  const curlResult = spawnSync(
    "curl",
    ["-sf", BASE_URL, "-o", "/dev/null"],
    { encoding: "utf8", stdio: "pipe" }
  );
  if (curlResult.status !== 0 || curlResult.error) {
    throw new Error(
      `[preflight] FATAL: Dev server not reachable at ${BASE_URL}. ` +
        "Start with: npm run dev"
    );
  }
  console.log(`[preflight] Dev server at ${BASE_URL}: OK`);

  console.log("[preflight] All checks passed.\n");
}

// ---------------------------------------------------------------------------
// Directory setup
// ---------------------------------------------------------------------------

function ensureDirectories(): void {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`[setup] Created output directory: ${OUTPUT_DIR}`);
  }
  // Always recreate temp dir cleanly to avoid stale Playwright recordings
  // from a previous failed run contaminating this run.
  if (existsSync(TEMP_DIR)) {
    rmSync(TEMP_DIR, { recursive: true, force: true });
  }
  mkdirSync(TEMP_DIR, { recursive: true });
  console.log(`[setup] Temp directory ready: ${TEMP_DIR}`);
}

// ---------------------------------------------------------------------------
// Core capture function
// ---------------------------------------------------------------------------

/**
 * Captures a single experiment page and produces a trimmed VP9 WebM at
 * `public/experiment-previews/{slug}.webm`.
 *
 * Steps:
 *   1. Launch Playwright Chromium (non-headless for GPU access)
 *   2. Create a browser context with video recording enabled
 *   3. Navigate to the experiment URL
 *   4. Wait idleWaitMs for the experiment to warm up
 *   5. Wait captureMs for the actual clip content
 *   6. Close context — Playwright finalises the raw .webm to disk
 *   7. ffmpeg: crop/scale to 640×360, trim to CLIP_DURATION_SECONDS, encode VP9
 *   8. Move final file to output dir, clean up temp file
 */
async function captureExperiment(
  slug: string,
  config: ExperimentConfig
): Promise<void> {
  console.log(`\n[capture] ${slug}`);
  console.log(`  URL:      ${BASE_URL}${config.path}`);
  console.log(`  Warmup:   ${config.idleWaitMs}ms`);
  console.log(`  Capture:  ${config.captureMs}ms`);
  console.log(`  Note:     ${config.note}`);

  /** Subdirectory for this slug's raw Playwright video output. */
  const slugTempDir = join(TEMP_DIR, slug);
  mkdirSync(slugTempDir, { recursive: true });

  const browser = await chromium.launch({
    // headless: false is required for WebGPU hardware acceleration.
    // Chromium headless mode disables GPU rendering, producing blank frames
    // for Three.js / WebGPU experiments.
    headless: false,
    args: [
      "--enable-gpu",
      "--use-angle=metal", // macOS Metal backend for best WebGPU compat
      "--enable-features=WebGPU",
      // --no-sandbox is safe here because this script only ever navigates to
      // localhost (a trusted dev server we own). The flag is needed on some
      // macOS setups where Chromium's sandbox conflicts with the GPU process
      // launched non-headless — without it, the browser may fail to start.
      "--no-sandbox",
    ],
  });

  const context = await browser.newContext({
    viewport: {
      width: config.viewportWidth,
      height: config.viewportHeight,
    },
    recordVideo: {
      dir: slugTempDir,
      size: {
        width: config.viewportWidth,
        height: config.viewportHeight,
      },
    },
    // Reduce motion preference is NOT set here — we want to capture the
    // animated state. prefers-reduced-motion is handled by ExperimentCard
    // in the frontend (Stage 2).
  });

  const page = await context.newPage();

  try {
    // Navigate and wait for network idle (all assets loaded).
    await page.goto(`${BASE_URL}${config.path}`, {
      waitUntil: "networkidle",
      timeout: 30_000,
    });

    console.log(`  [capture] Page loaded. Waiting ${config.idleWaitMs}ms for warmup...`);
    // Warmup: give WebGPU / Canvas simulations time to initialise before
    // the timed capture window starts.
    await page.waitForTimeout(config.idleWaitMs);

    console.log(`  [capture] Warmup done. Recording ${config.captureMs}ms clip...`);
    // Capture window: the actual content we want in the final clip.
    await page.waitForTimeout(config.captureMs);

  } finally {
    // Close context BEFORE closing browser — Playwright only finalises the
    // video file on context.close(), not page.close() or browser.close().
    await context.close();
    await browser.close();
  }

  // At this point Playwright has written a raw .webm file to slugTempDir.
  // Find it — Playwright names the file with a UUID, so we glob for it.
  const tempFiles = readdirSync(slugTempDir).filter((f) => f.endsWith(".webm"));
  if (tempFiles.length === 0) {
    throw new Error(
      `[capture] ${slug}: No .webm file found in ${slugTempDir} after context.close(). ` +
        "Playwright video recording may have failed."
    );
  }
  const rawWebm = join(slugTempDir, tempFiles[0]);

  // ---------------------------------------------------------------------------
  // ffmpeg: trim, scale, encode VP9
  // ---------------------------------------------------------------------------
  // Strategy:
  //   -ss 0           : start at the beginning (post-warmup frames are in the
  //                     recording; we keep the full clip since idleWait already
  //                     filtered the warmup — we just trim to CLIP_DURATION_SECONDS)
  //   -t {duration}   : output clip length
  //   -vf scale       : downscale from viewport size to 640×360
  //                     force_original_aspect_ratio=decrease pads if needed
  //   -c:v libvpx-vp9 : VP9 encoder (best compression at small sizes)
  //   -crf {VP9_CRF}  : quality target (constant rate factor)
  //   -b:v {bitrate}  : max bitrate cap (prevents outliers over 500 KB)
  //   -an             : strip audio (no audio in experiment previews)
  //   -loop 0         : WebM container loop flag (client-side loop is via
  //                     HTML <video loop>, not ffmpeg — this is a no-op in WebM
  //                     but included for documentation clarity)
  //   -movflags +faststart : not needed for WebM, omitted
  //   -y              : overwrite output file (idempotency)

  const outputFile = join(OUTPUT_DIR, `${slug}.webm`);
  // Single source of truth for ffmpeg args — both the log line and the
  // spawnSync call derive from this array to stay in sync.
  const ffmpegArgs = [
    "-y",
    "-i", rawWebm,
    "-t", String(CLIP_DURATION_SECONDS),
    "-vf",
    `scale=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT}:force_original_aspect_ratio=decrease,pad=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT}:(ow-iw)/2:(oh-ih)/2`,
    "-c:v", "libvpx-vp9",
    "-crf", String(VP9_CRF),
    "-b:v", VP9_BITRATE,
    "-an",
    outputFile,
  ];

  console.log(`  [ffmpeg] Encoding: ffmpeg ${ffmpegArgs.join(" ")}`);

  const ffmpegResult = spawnSync("ffmpeg", ffmpegArgs, {
    encoding: "utf8",
    stdio: "pipe",
  });

  if (ffmpegResult.status !== 0) {
    throw new Error(
      `[ffmpeg] ${slug}: encoding failed (exit ${ffmpegResult.status}).\n` +
        `stderr: ${ffmpegResult.stderr}`
    );
  }

  // Verify output file exists and log its size.
  const stats = statSync(outputFile);
  const sizeKb = Math.round(stats.size / 1024);
  console.log(`  [done] ${outputFile} (${sizeKb} KB)`);

  // Warn if file exceeds the per-experiment budget (500 KB).
  if (stats.size > 500 * 1024) {
    console.warn(
      `  [warn] ${slug}: output ${sizeKb} KB exceeds 500 KB budget. ` +
        `Increase VP9_CRF (currently ${VP9_CRF}) and re-run.`
    );
  }

  // Clean up raw Playwright temp file for this slug.
  rmSync(slugTempDir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("=== capture-experiments ===\n");

  // Determine which slugs to process.
  const allSlugs = Object.keys(EXPERIMENT_CONFIGS);
  const targetSlugs: string[] = (() => {
    if (slugArg !== undefined) {
      if (!EXPERIMENT_CONFIGS[slugArg]) {
        throw new Error(
          `Unknown slug: "${slugArg}". Valid slugs: ${allSlugs.join(", ")}`
        );
      }
      return [slugArg];
    }
    return allSlugs;
  })();

  console.log(`Targets: ${targetSlugs.join(", ")}`);
  console.log(`Output:  ${OUTPUT_DIR}`);
  console.log(`Format:  WebM VP9, ${OUTPUT_WIDTH}×${OUTPUT_HEIGHT}, ${CLIP_DURATION_SECONDS}s, CRF ${VP9_CRF}\n`);

  if (isDryRun) {
    console.log("[dry-run] Plan only. No captures will be made.\n");
    for (const slug of targetSlugs) {
      const config = EXPERIMENT_CONFIGS[slug];
      console.log(`  ${slug}`);
      console.log(`    URL:     ${BASE_URL}${config.path}`);
      console.log(`    Warmup:  ${config.idleWaitMs}ms`);
      console.log(`    Capture: ${config.captureMs}ms`);
      console.log(`    Note:    ${config.note}`);
    }
    console.log("\n[dry-run] Done. Run without --dry-run to execute.");
    return;
  }

  // Preflight: abort early if environment is not ready.
  runPreflightChecks();
  ensureDirectories();

  // Capture each experiment sequentially.
  // Sequential (not parallel) to avoid overloading GPU + CPU with multiple
  // Playwright/Three.js/WebGPU instances competing for the same hardware.
  const results: { slug: string; status: "ok" | "error"; error?: string }[] =
    [];

  for (const slug of targetSlugs) {
    const config = EXPERIMENT_CONFIGS[slug];
    try {
      await captureExperiment(slug, config);
      results.push({ slug, status: "ok" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\n[error] ${slug}: ${message}`);
      results.push({ slug, status: "error", error: message });
      // Continue to next slug — partial capture is better than full abort.
    }
  }

  // Clean up top-level temp dir if empty (all slugTempDirs already removed).
  if (existsSync(TEMP_DIR)) {
    rmSync(TEMP_DIR, { recursive: true, force: true });
    console.log(`\n[cleanup] Removed temp directory: ${TEMP_DIR}`);
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log("\n=== Summary ===");
  const ok = results.filter((r) => r.status === "ok");
  const errors = results.filter((r) => r.status === "error");

  for (const r of ok) {
    console.log(`  OK    ${r.slug}`);
  }
  for (const r of errors) {
    console.error(`  ERROR ${r.slug}: ${r.error}`);
  }

  console.log(`\n${ok.length}/${results.length} experiments captured.`);

  if (errors.length > 0) {
    // Exit non-zero so CI / shell scripts can detect partial failure.
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\n[fatal] ${message}`);
  process.exit(1);
});
