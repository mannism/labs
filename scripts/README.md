# scripts/

Maintenance and capture scripts for the Labs project.

---

## capture-experiments.ts

Auto-captures 3-second looping WebM VP9 preview clips for each experiment card on `/playground`. Produced clips land in `public/experiment-previews/{slug}.webm`.

### Quick start

```bash
# 1. Ensure dev server is running
npm run dev

# 2. Dry-run — prints the plan without capturing anything
npm run capture-experiments -- --dry-run

# 3. Capture all 9 experiments
npm run capture-experiments

# 4. Capture a single experiment (re-capture or troubleshoot one slug)
npm run capture-experiments -- --slug voice-particles
```

---

### Requirements

| Requirement | Notes |
|---|---|
| **macOS with GPU** | WebGPU experiments require hardware acceleration. Headless Linux/CI runners will produce blank frames for `voice-particles`, `gesture-fluid`, and `crowd-flow`. Non-WebGPU experiments capture correctly on any platform. |
| **ffmpeg on PATH** | Install: `brew install ffmpeg`. Script fails fast if missing. |
| **Playwright Chromium** | Install: `npx playwright install chromium`. |
| **Next.js dev server on localhost:3000** | Start: `npm run dev`. Script fails fast if server is not reachable. |
| **Node.js >=22.14.0** | Per project `engines` field. |

---

### Asset format and path convention

This is the contract Nix reads in Stage 2 (frontend wiring).

| Property | Value |
|---|---|
| **Output path** | `public/experiment-previews/{slug}.webm` |
| **Container** | WebM |
| **Video codec** | VP9 (libvpx-vp9) |
| **Audio** | None (stripped with `-an`) |
| **Dimensions** | 640×360 px |
| **Duration** | 3 seconds |
| **Loop** | Client-side via HTML `<video loop>` — not encoded into the container |
| **File size budget** | ≤ 500 KB per file, ≤ 5 MB total |

**Why WebM VP9?** Better compression than MP4 H.264 at small file sizes, and Safari 14+ supports it — matching the Labs browser baseline (Chrome 88+, Safari 14+, Firefox 84+).

**Why 640×360?** The card preview area is 180px tall in production. 2× density (360px) covers retina displays. 640×360 is standard 16:9 at that height and compresses efficiently.

**Why 3 seconds?** Long enough to show meaningful animation, short enough to stay under the 500 KB per-file budget. The HTML `<video loop>` attribute creates a seamless loop.

---

### Per-experiment configuration

The `EXPERIMENT_CONFIGS` map in `capture-experiments.ts` controls capture behaviour per slug:

| Field | Purpose |
|---|---|
| `path` | URL path on the dev server |
| `viewportWidth` / `viewportHeight` | Browser viewport for capture (1280×720) |
| `idleWaitMs` | Warmup time after page load before recording content |
| `captureMs` | Duration of the recording window (before ffmpeg trim to 3s) |
| `note` | Human-readable reason for the timing choices |

**Owner can edit `idleWaitMs` and `captureMs`** without touching script logic — these are the tuning knobs for per-experiment timing.

#### Warmup rationale

| Experiment | `idleWaitMs` | Reason |
|---|---|---|
| `voice-particles` | 4000ms | WebGPU + Three.js shader compilation |
| `gesture-fluid` | 3000ms | Canvas 2D solver init + idle wisps |
| `crowd-flow` | 3500ms | Boids init + RD pattern emergence |
| `routines-repo-audit` | 1500ms | React hydration only |
| `autonomous-brand-pipeline` | 2000ms | React + form state |
| `adk-visualizer` | 2500ms | React Flow canvas render |
| `orchestration-map` | 2500ms | React Flow canvas init |
| `generative-ui-renderer` | 1500ms | React hydration only |
| `agentic-reliability` | 1500ms | React hydration only |

#### Idle-mode-only capture

Per the brief, input-driven experiments are captured in their idle/resting state only:

- **voice-particles** — breathing sphere (no microphone input)
- **gesture-fluid** — ambient wisps (no pointer movement)
- **crowd-flow** — autonomous agent flocking (no click obstacles)

Active-state capture (mic, camera, pointer injection) is out of scope for this pipeline and tracked as a future brief.

---

### ffmpeg encoding parameters

```
ffmpeg -y
  -i {raw_playwright.webm}
  -t 3
  -vf "scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2"
  -c:v libvpx-vp9
  -crf 33
  -b:v 400k
  -an
  {output.webm}
```

| Parameter | Value | Reason |
|---|---|---|
| `-t 3` | 3 seconds | Brief specifies 3–4s; 3s hits budget comfortably |
| `scale=640:360` | 640×360 | Card 2× density, 16:9, efficient compression |
| `force_original_aspect_ratio=decrease` + `pad` | centred | Handles viewport aspect ratio variation without stretching |
| `-c:v libvpx-vp9` | VP9 | Best compression at this size; Safari 14+ compatible |
| `-crf 33` | Quality target | Produces ~200–400 KB at 640×360×3s on typical experiment UIs |
| `-b:v 400k` | Bitrate ceiling | Prevents outliers from exceeding 500 KB budget |
| `-an` | No audio | Experiment previews are mute; removes any system audio accidentally captured |

**If a file exceeds 500 KB:** increase `VP9_CRF` (currently 33) toward 40 in `capture-experiments.ts` and re-run that slug with `--slug {slug}`.

---

### Idempotency

Re-running overwrites output files cleanly:

- `ffmpeg -y` overwrites the output WebM without prompting
- The temp dir (`.playwright-capture-tmp/`) is deleted and recreated on each run
- No leftover partial files — each slug's temp dir is cleaned immediately after ffmpeg completes, even on error

**The temp dir is gitignored** (added to `.gitignore`). Raw Playwright recordings are intermediate artifacts — only the final `public/experiment-previews/*.webm` files are committed (in Stage 3 PR 2).

---

### When to re-capture

Re-run `npm run capture-experiments -- --slug {slug}` when:

- The experiment's UI substantially changes (new layout, new default state)
- The preview clip is blank (increase `idleWaitMs` for that slug)
- The preview clip cuts off mid-animation (increase `captureMs`)
- The output file exceeds 500 KB (increase `VP9_CRF`)
- A new experiment is added (add a new entry to `EXPERIMENT_CONFIGS`)

---

### Troubleshooting

**Blank frames on WebGPU experiments**
The browser must launch non-headless with `--enable-gpu --use-angle=metal`. This is the default. If you see blank/black frames, verify your Mac has GPU access and ffmpeg is encoding a real video (check duration with `ffprobe {file}.webm`).

**"Dev server not reachable"**
Run `npm run dev` in a separate terminal and wait for the "ready" message before running the capture script.

**"No .webm file found in temp dir"**
Playwright did not write the video file, which means `context.close()` may not have been called or the recording was aborted. Check Playwright Chromium is installed (`npx playwright install chromium`).

**VP9 encoding fails**
Confirm ffmpeg has VP9 support: `ffmpeg -codecs | grep vp9`. Homebrew ffmpeg includes libvpx-vp9 by default.

---

## validate-descriptions.ts

Validates `src/data/projects.json` description fields against word-count thresholds and formatting rules. See comments in the script for details.

## validate-exp009.ts

Validates the EXP_009 (Agentic Reliability) task suite data files against their schemas. Requires `.env` with API keys. See comments in the script for details.
