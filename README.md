# Diana Ismail Labs

**Version:** 1.24.0

A Next.js 16 portfolio showcasing proof-of-concept projects and experiments in Agentic AI, full-stack development, and creative technology — with a built-in AI chat engine that powers a floating digital twin chat widget and a Telegram bot.

## Design System: "Cyber-Minimalist"

The UI is built around a single coherent design language:

- **Atmospheric Depth:** Deep charcoal background (`#0A0C10`) with a 48×48px CSS grid pattern and large, heavily blurred ambient orbs (electric blue + purple) rendered at fixed positions to create physical depth without scroll cost.
- **Glassmorphism:** Translucent cards with 16px backdrop blur. Hover states trigger an electric-blue radiant glow (`#0069FF`).
- **Typography:** Dual-font system — **Merriweather** (serif) for display headings, **Open Sans** (sans-serif, 16px / 1.625 leading) for body text, and **Geist Mono** for badges and technical labels.
- **Micro-interactions:** CSS-driven transitions on filter tabs and links (no JS re-renders). Framer Motion handles component entry and card hover animations.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, standalone output) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 + CSS custom properties |
| Animations | Framer Motion |
| Icons | Lucide React |
| AI | OpenAI API |
| Session store | Redis (ioredis) |
| Deployment | Docker (multi-stage, Node 22 Alpine) |

**Security & Privacy:**
- All fonts (Merriweather, Open Sans, Geist Mono) are self-hosted via `next/font/google` — zero external HTTP requests at runtime.
- Strict security headers enforced in `next.config.ts`: HSTS (2-year preload), `X-Frame-Options: DENY`, restrictive `Permissions-Policy`, and a tight CSP.

## Architecture

The app has two layers:

**UI layer** — single-page client-side React application. All project data lives in `src/data/projects.json` — no database, no auth.

**Chat engine layer** — three API routes backed by OpenAI and Redis. The engine powers the floating chat widget (web) and a Telegram bot, with shared conversation history across both interfaces.

```
src/
├── app/
│   ├── layout.tsx              # Root layout: fonts, SEO metadata, background orbs
│   ├── page.tsx                # Home page: Navbar + Hero + ProjectGrid + Footer + ChatWidget
│   ├── globals.css             # Design tokens, glassmorphism, animations, component base styles
│   └── api/
│       ├── chat/stream/        # POST — SSE streaming endpoint for the chat widget
│       ├── link/               # POST — OTP verification to link web session ↔ Telegram
│       ├── telegram/           # POST — Telegram webhook handler
│       └── cors.ts             # CORS policy: *.dianaismail.me + localhost
├── components/
│   ├── Hero.tsx                # Status badge + staggered headline animations
│   ├── Navbar.tsx              # Sticky nav: branding, portfolio link, dark/light toggle
│   ├── ProjectGrid.tsx         # Category filter tabs, grid layout, drawer state
│   ├── ProjectCard.tsx         # Glassmorphic card: badges, icon buttons, tags, live ping
│   ├── ProjectDetailsDrawer.tsx # Slide-out panel (bottom-sheet on mobile, side-panel on desktop)
│   ├── ChatWidget.tsx          # Floating AI chat: SSE streaming, typewriter, Telegram linking
│   └── Footer.tsx              # Copyright footer
├── lib/twin/
│   ├── config.ts               # All env vars — single import point, never use process.env directly
│   ├── engine.ts               # Core chat orchestration: context injection, OpenAI calls, memory
│   ├── memory.ts               # Redis: chat history, rate limiting, OTP pairing codes
│   ├── redis.ts                # ioredis singleton
│   ├── prompts.ts              # System prompt assembly with mtime-based hot-reload caching
│   ├── messages.ts             # User-facing strings: errors, Telegram replies, media placeholders
│   └── telegram.ts             # Telegram Bot API client (sendMessage, sendTypingAction)
└── data/
    ├── projects.json           # Single source of truth for all project data
    ├── seo.json                # OpenGraph metadata, site URL, Twitter handle
    └── twin/
        ├── System-prompt.md    # Main AI instruction template
        ├── summarise-prompt.md # Prompt for compressing old conversation history
        └── context/            # 9 markdown context files (always-on + keyword-triggered)
```

## Chat Engine

The chat engine is a port of [Diana's Digital Twin](https://twin.dianaismail.me) into the Labs Next.js codebase. It uses a tiered context injection strategy to keep token usage low:

- **Always injected (7 files):** profile summary, recent experience, projects, experiments, personal, tools, links
- **On-demand (2 files):** early-career history (triggered by keywords like company names or years 2000–2017), legacy tools (triggered by "ASP.NET", "VB.NET", etc.)

Conversation history is stored in Redis with a 30-day rolling TTL. Once a session exceeds `SUMMARISATION_THRESHOLD` messages, older exchanges are compressed into a rolling summary using a dedicated OpenAI call, keeping the context window efficient.

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/chat/stream` | POST | SSE streaming — accepts `{ session_id, text }`, yields `{ type: "chunk"\|"done"\|"error" }` |
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
  "order": 1,
  "title": "Project Title",
  "shortDescription": "One-line summary shown on the card.",
  "detailedDescription": "Full description shown in the details drawer.",
  "category": "Agentic-AI",
  "status": "Active",
  "display": true,
  "tags": ["Python", "OpenAI"],
  "demoUrl": "https://project.dianaismail.me",
  "githubUrl": "https://github.com/...",
  "keyLearnings": "Optional — shown in the drawer above the tech tags."
}
```

**Field notes:**
- `display: false` hides the project from the grid without deleting it.
- `status` accepts `"Active"`, `"Research"`, or `"Archived"` — each maps to a distinct badge colour.
- Setting `demoUrl` or `githubUrl` to `"#"` hides the corresponding action button.
- Demo URLs containing `dianaismail.me` open in the same tab; all other URLs open in a new tab with `noopener noreferrer`.
- `order` controls display position — lower numbers appear first.

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

## GitHub Actions: Version Sync

The workflow at `.github/workflows/sync-project-versions.yml` runs **daily at 02:00 UTC** (and can be triggered manually via `workflow_dispatch`). It keeps `version` and `lastUpdated` in `src/data/projects.json` in sync with each project's GitHub repository — no manual updates needed.

### What it does

For each project registered in `REPO_MAP` (inside the workflow), the job:
1. Fetches the repo's `pushed_at` date from the GitHub API and writes it to `lastUpdated` (ISO date, `YYYY-MM-DD`).
2. Fetches the latest GitHub Release tag; falls back to the first repo tag if no release exists. Strips the leading `v` and writes the result to `version`.
3. If either field changed, commits `src/data/projects.json` back to `main` with the message `chore: sync project versions and update dates [skip ci]`.

### Required secret

The workflow uses a fine-grained Personal Access Token stored as the repository secret **`PAT_READ_REPOS`**. The token only needs **read access to repository metadata** (Contents: Read) for each target repo. If the secret is absent the API calls fall back to unauthenticated requests, which are subject to GitHub's lower rate limits.

### Adding a new project to the sync

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
