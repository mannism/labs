# Diana Ismail Labs

**Version:** 2.17.0

A Next.js 16 portfolio showcasing proof-of-concept projects and experiments in Agentic AI, full-stack development, and creative technology — with a built-in AI chat engine powering a floating digital twin chat widget and a Telegram bot.

## Design System: "Speculative Interface" (v2)

A clinical, forward-looking aesthetic built on pale blue-grey surfaces with chartreuse (#C8FF00) accent:

- **Palette:** Light mode only. Pale blue-grey base (`#F0F2F5`), white card surfaces, dark text. Chartreuse used for accents, active states, and interactive highlights.
- **Typography:** Space Grotesk throughout — display headlines (uppercase, tight tracking), Geist Mono for system labels and metadata.
- **Layout:** Highlight-aware 3-column bento grid with glitch/diagnostic filler cards inserted between adjacent highlighted projects. Responsive down to 375px.
- **Accessibility:** `prefers-reduced-motion` respected across all animations, `focus-visible` outlines, 44px minimum touch targets, semantic `aria-labels`.

## Creative Animations

| Animation | Description |
|---|---|
| **Ghost Type** | Procedural text scramble — characters resolve left-to-right through Unicode glyphs (headlines, chat header, detail titles) |
| **System Boot** | Full-page terminal initialization overlay on first visit. Character-by-character boot log with status dots. Click to skip. Session-gated. |
| **Signal Field** | Full-viewport HTML5 Canvas dot grid. Desktop: cursor-reactive (brighten + chartreuse shift + pull). Mobile: ambient sine wave. |
| **Datamosh** | RGB channel separation glitch overlay during view transitions. Full mode (grid→detail) and mild mode (detail→grid). |
| **Proximity Pulse** | Cursor-driven magnetic field on the bento grid. Nearest card lifts (translateZ), adjacent cards compress. Directional chartreuse glow follows cursor. |

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, standalone output) |
| Language | TypeScript (strict mode) |
| UI | React 19 |
| Styling | Tailwind CSS v4 + CSS custom properties |
| Animations | Framer Motion + HTML5 Canvas + Three.js (WebGL2) |
| Typography | Space Grotesk, Geist Mono (self-hosted via `next/font`) |
| Icons | Lucide React + custom SVG icons (`src/components/icons/`) |
| AI | OpenAI API |
| Session store | Redis (ioredis) |
| Deployment | Docker (multi-stage, Node 22 Alpine) |

**Security & Privacy:**
- All fonts self-hosted via `next/font/google` — zero external HTTP requests at runtime.
- Strict security headers in `next.config.ts`: HSTS (2-year preload), `X-Frame-Options: DENY`, restrictive `Permissions-Policy`, tight CSP.

## Architecture

The app has two layers:

**UI layer** — single-page client-side React application. All project data lives in `src/data/projects.json` — no database, no auth. Browser history integration for detail view (`?project=` URL params with pushState/popState).

**Chat engine layer** — three API routes backed by OpenAI and Redis. The engine powers the floating chat widget (web) and a Telegram bot, with shared conversation history across both interfaces.

```
src/
├── app/
│   ├── layout.tsx              # Root layout: fonts, SEO metadata, JSON-LD, Google Analytics
│   ├── page.tsx                # Renders AppShell
│   ├── globals.css             # Design tokens (v2 Speculative Interface), animations, chat widget styles
│   ├── icon.tsx                # Route-based favicon — chartreuse "D" on dark background
│   ├── apple-icon.tsx          # Apple touch icon generation
│   ├── manifest.ts             # PWA manifest: name, theme colours, icons
│   ├── sitemap.ts              # XML sitemap: homepage + all visible project/experiment pages
│   ├── robots.ts               # robots.txt generation
│   ├── opengraph-image.tsx     # Root OG image (1200×630) — site-wide fallback
│   ├── llms.txt/route.ts       # LLM discovery endpoint — serves llms.txt for AI crawlers
│   ├── module/[slug]/
│   │   ├── page.tsx            # Per-project SSR: generateMetadata (title, desc, keywords), JSON-LD
│   │   ├── ModuleDetailClient.tsx # Client wrapper: datamosh transitions, back navigation
│   │   └── opengraph-image.tsx # Per-project OG image: title + category badge + MODULE/ARTICLE label
│   ├── playground/
│   │   ├── layout.tsx          # Shared playground layout: metadata, ExperimentsShell wrapper
│   │   ├── page.tsx            # Landing page: hero + card grid of all experiments
│   │   └── [slug]/page.tsx     # Individual experiment: per-experiment metadata, dynamic canvas
│   └── api/
│       ├── chat/
│       │   ├── stream/         # POST — SSE streaming endpoint for the chat widget
│       │   └── history/        # GET — retrieve conversation history for a session
│       ├── link/               # POST — OTP verification to link web session ↔ Telegram
│       ├── telegram/           # POST — Telegram webhook handler
│       └── cors.ts             # CORS policy: *.dianaismail.me + localhost
├── components/
│   ├── AppShell.tsx            # Root orchestrator: SignalField, SystemBoot, Datamosh, LayoutShellV2, ChatWidget
│   ├── ChatWidget.tsx          # Floating AI chat: SSE streaming, typewriter, Ghost Type header, Telegram linking
│   ├── ProjectCard.tsx         # Glassmorphic project card — status badge, ping demo URL, motion entrance
│   ├── icons/
│   │   └── GithubIcon.tsx      # Custom GitHub SVG icon (lucide-react v1 removed brand icons)
│   ├── playground/
│   │   ├── ExperimentsShell.tsx   # Client layout: WebGPUProvider + NavbarV2 + FooterV2
│   │   ├── ExperimentsLanding.tsx # Hero + card grid with stagger-fade entrance
│   │   ├── ExperimentCard.tsx     # Card: dark CSS-only preview, system label, status, tags
│   │   ├── ExperimentDetail.tsx   # Detail stub: breadcrumb, header, canvas placeholder
│   │   ├── StatusIndicator.tsx    # Reusable status dot + label (LIVE/BETA/CONCEPT)
│   │   ├── WebGPUCheck.tsx        # WebGPU context provider + amber fallback banner
│   │   ├── voice-particles/       # Three.js WebGL2 — 150k particles driven by microphone FFT
│   │   ├── gesture-fluid/         # Canvas 2D Navier-Stokes fluid sim (Jos Stam Stable Fluids)
│   │   └── crowd-flow/            # Boids flocking + Gray-Scott reaction-diffusion (10k agents)
│   └── v2/
│       ├── LayoutShellV2.tsx   # Page wrapper: NavbarV2 + HeroV2 + content + FooterV2
│       ├── NavbarV2.tsx        # Sticky nav: letterspaced logo, version, portfolio link
│       ├── HeroV2.tsx          # System-label breadcrumb + Ghost Type headline
│       ├── ProjectGridV2.tsx   # Category filter tabs, bento grid, stagger entrance, proximity field
│       ├── ProjectCardV2.tsx   # Card: module counter, status pulse, Proximity Pulse, code-highlighted description
│       ├── ProjectDetailV2.tsx # Full detail view: ProjectLayout (sidebar+content) or ArticleLayout (prose+sticky takeaways)
│       ├── FillerCard.tsx      # Decorative glitch/diagnostic cards between highlights
│       ├── SignalField.tsx     # Canvas dot grid — cursor-reactive (desktop) / ambient wave (mobile)
│       ├── SystemBoot.tsx      # Terminal boot overlay — session-gated, skippable
│       ├── DatamoshTransition.tsx # Glitch overlay for view transitions (full/mild modes)
│       ├── ScanLine.tsx        # Atmospheric drifting horizontal line
│       ├── FooterV2.tsx        # System status bar: latency readout, status dot, boot replay easter egg
│       ├── renderWithCodeHighlights.tsx # Inline code highlighting for bracket/backtick patterns
│       ├── useTextScramble.ts  # Ghost Type hook — procedural text scramble
│       ├── useProximityField.ts # Proximity Pulse hook — cursor-driven magnetic field for grid cards
│       └── useReducedMotion.ts # Detects prefers-reduced-motion via useSyncExternalStore
├── lib/
│   ├── projects.ts             # Canonical projects loader — resolves Labs version from package.json
│   ├── analytics.ts            # Thin wrapper around gtag (injected by @next/third-parties)
│   └── twin/
│       ├── config.ts           # All env vars — single import point
│       ├── engine.ts           # Core chat orchestration: context injection, OpenAI calls, memory
│       ├── memory.ts           # Redis: chat history, rate limiting, OTP pairing codes
│       ├── redis.ts            # ioredis singleton
│       ├── prompts.ts          # System prompt assembly with mtime-based hot-reload caching
│       ├── messages.ts         # User-facing strings: errors, Telegram replies, media placeholders
│       └── telegram.ts         # Telegram Bot API client (sendMessage, sendTypingAction)
├── types/
│   ├── project.ts              # Project interface (id, slug, title, status, tags, URLs, etc.)
│   └── experiment.ts           # Experiment interface (id, slug, status, howItWorks, etc.)
└── data/
    ├── projects.json           # Single source of truth for all project data
    ├── experiments.json        # Single source of truth for experiment data
    ├── seo.json                # OpenGraph metadata, site URL, Twitter handle
    └── twin/
        ├── System-prompt.md    # Main AI instruction template
        ├── summarise-prompt.md # Prompt for compressing old conversation history
        └── context/            # 13 markdown context files (always-on + keyword-triggered)
```

## Chat Engine

The chat engine is a port of [Diana's Digital Twin](https://twin.dianaismail.me) into the Labs Next.js codebase. It uses a tiered context injection strategy to keep token usage low:

- **Always injected (9 files):** profile summary, positioning, recent experience, projects, experiments, agentic workflow, personal, tools, links
- **On-demand (4 files):** early-career history (triggered by company names or years 2000–2017), legacy tools ("ASP.NET", "VB.NET", etc.), AI team roster ("team", "delegation"), creative coding (Labs v2 animations)

Conversation history is stored in Redis with a 30-day rolling TTL. Once a session exceeds `SUMMARISATION_THRESHOLD` messages, older exchanges are compressed into a rolling summary using a dedicated OpenAI call, keeping the context window efficient.

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/chat/stream` | POST | SSE streaming — accepts `{ session_id, text }`, yields `{ type: "chunk"\|"done"\|"error" }` |
| `/api/chat/history` | GET | Retrieve conversation history for a session ID |
| `/api/link` | POST | OTP verification — accepts `{ code }`, returns `{ success, linked_session_id?, message }` |
| `/api/telegram` | POST | Telegram webhook — validates secret, routes commands, delegates messages to engine |

### Telegram Bot

The Telegram bot shares the same engine and Redis session store as the web widget. Supported commands:

- `/start` — welcome message
- `/start web_{id}` — auto-pairs Telegram chat with a web session (deep link)
- `/connect` — generates a 10-minute OTP link to sync chat history from web to Telegram
- `/contact` — returns Diana's contact details

### Cross-platform Session Linking

Web sessions use a `localStorage` session ID. Telegram chats use the Telegram numeric chat ID. The `/connect` flow generates a short-lived OTP; when the user clicks the deep link, the ChatWidget calls `/api/link` and Redis creates a permanent alias so both clients read and write the same history.

## Playground Experiments

The `/playground` section hosts interactive creative-coding experiments. Experiment data lives in `src/data/experiments.json` — same pattern as `projects.json`.

| Experiment | Slug | Tech | Status |
|---|---|---|---|
| **Voice Particle Instrument** | `voice-particles` | Three.js WebGL2, Web Audio API | LIVE |
| **Gesture Fluid Wall** | `gesture-fluid` | Canvas 2D, Navier-Stokes (Jos Stam Stable Fluids) | BETA |
| **Crowd Flow Twin** | `crowd-flow` | Canvas 2D, Boids + Gray-Scott reaction-diffusion | BETA |

- **Voice Particles:** 150k GPU-instanced particles respond to microphone FFT. Band-directional physics (bass ↓ red, low-mid ← chartreuse, high-mid → cyan, treble ↑ white). Terrain mesh deformation. Mobile fallback (50k particles).
- **Gesture Fluid:** 256×256 Eulerian fluid grid with pointer/touch velocity injection. 4 colour palettes. Idle/active mode transitions.
- **Crowd Flow:** 10k Boids agents with spatial-hash neighbour detection. Trail density deposits onto a grid, feeding a Gray-Scott reaction-diffusion system for emergent organic patterns. Interactive obstacle drawing.

All experiment canvases are loaded via `next/dynamic` with `ssr: false`. The `WebGPUProvider` context gates WebGPU-dependent features with an amber fallback banner.

## Environment Variables

Copy `.env.local.example` or create `.env.local`:

```env
# Required
OPENAI_API_KEY=sk-proj-...
REDIS_URL=redis://localhost:6379
TELEGRAM_TOKEN=...         # Required for the Telegram bot
TELEGRAM_WEBHOOK_SECRET=...  # Required for webhook security

# Optional (defaults shown)
OPENAI_MODEL=gpt-4o-mini
RATE_LIMIT_COUNT=5           # Max messages per window
RATE_LIMIT_WINDOW=60         # Window size in seconds
SUMMARISATION_THRESHOLD=30   # Messages before history compression
LABS_URL=https://labs.dianaismail.me  # Used in /connect deep links
```

> `NEXT_PUBLIC_CHAT_API_URL` can be set on another site to point its ChatWidget at this Labs instance as the backend.

## Managing Projects

Add, edit, or hide projects by modifying `src/data/projects.json`. The category filter tabs and grid are generated entirely from this file — no component changes needed.

### Project schema

```json
{
  "id": "unique-slug",
  "slug": "url-safe-slug",
  "order": 1,
  "title": "Project Title",
  "shortDescription": "One-line summary shown on the card.",
  "detailedDescription": "Full description shown in the detail view.",
  "category": "Agentic-AI",
  "status": "Active",
  "display": true,
  "highlight": false,
  "type": "project",
  "tags": ["Python", "OpenAI"],
  "demoUrl": "https://project.dianaismail.me",
  "githubUrl": "https://github.com/...",
  "keyLearnings": ["Optional — shown in the detail view as numbered callouts."],
  "articleSections": [
    { "title": "Section Title", "body": "Section content..." }
  ]
}
```

**Field notes:**
- `display: false` hides the project from the grid without deleting it.
- `status` accepts `"Active"`, `"Research"`, or `"Archived"` — each maps to a distinct badge style.
- `highlight: true` gives the project a 2-column span in the bento grid with larger typography.
- `type: "article"` renders a full-width editorial layout with titled prose sections and a sticky key takeaways sidebar. Defaults to `"project"` when absent.
- `articleSections` is only used when `type` is `"article"` — an array of `{ title, body }` objects rendered as headed prose blocks.
- `tags` drive the category filter tabs, card chips, and per-project `<meta name="keywords">` for SEO.
- Setting `demoUrl` or `githubUrl` to `"#"` hides the corresponding action button.
- Demo URLs containing `dianaismail.me` open in the same tab; all other URLs open in a new tab with `noopener noreferrer`.
- `order` controls display position — lower numbers appear first.
- `version` and `lastUpdated` are auto-populated by the GitHub Actions sync workflow — do not edit by hand.

## Getting Started

```bash
npm install
npm run dev
```

Redis is required for the chat engine. For local development:

```bash
docker run -d -p 6379:6379 redis:alpine
```

## Docker Deployment

**Recommended (Docker Compose — includes Redis):**
```bash
docker compose up -d --build
```

**Manual:**
```bash
docker build -t labs-app .
docker run -p 3000:3000 --env-file .env.local labs-app
```

The Docker build uses a three-stage pipeline (deps → builder → runner) with Next.js standalone output for a minimal production image. Twin context markdown files are explicitly copied into the runner image because they are read at runtime via `fs` and not traced by Next.js's standalone file tracer.

## GitHub Actions

### CI & Security

| Workflow | Trigger | Purpose |
|---|---|---|
| `ci.yml` | Push/PR to main | Runs `npm audit --production --audit-level=high` |
| `release.yml` | Push to main | Creates GitHub Releases via semantic-release |
| `sync-project-versions.yml` | Daily 02:00 UTC | Syncs `version` and `lastUpdated` in `projects.json` from GitHub API |

**Dependabot** (`.github/dependabot.yml`) checks npm dependencies weekly on Mondays, groups minor+patch updates, and limits to 5 open PRs.

### Version Sync

The version sync workflow keeps `version` and `lastUpdated` in `src/data/projects.json` in sync with each project's GitHub repository — no manual updates needed. Can also be triggered manually via `workflow_dispatch`.

#### What it does

For each project registered in `REPO_MAP` (inside the workflow), the job:
1. Fetches the repo's `pushed_at` date from the GitHub API and writes it to `lastUpdated` (ISO date, `YYYY-MM-DD`).
2. Fetches the latest GitHub Release tag; falls back to the first repo tag if no release exists. Strips the leading `v` and writes the result to `version`.
3. If either field changed, commits `src/data/projects.json` back to `main` with the message `chore: sync project versions and update dates [skip ci]`.

#### Required secret

The workflow uses a fine-grained Personal Access Token stored as the repository secret **`PAT_READ_REPOS`**. The token only needs **read access to repository metadata** (Contents: Read) for each target repo. If the secret is absent the API calls fall back to unauthenticated requests, which are subject to GitHub's lower rate limits.

#### Adding a new project to the sync

1. Open `.github/workflows/sync-project-versions.yml`.
2. Add an entry to the `REPO_MAP` object inside the Node.js script:
   ```js
   "Exact project title from projects.json": "github-owner/repo-name",
   ```
3. The title must match the `title` field in `src/data/projects.json` exactly (case-sensitive).
4. Commit the workflow change. The next scheduled run (or a manual `workflow_dispatch`) will pick up the new project automatically.

## Telegram Webhook Setup

After deploying, register the webhook once:

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://labs.dianaismail.me/api/telegram",
    "secret_token": "<TELEGRAM_WEBHOOK_SECRET>"
  }'
```
