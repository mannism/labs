Personal Experiments & Side Projects — Diana Ismail

These are personal coding experiments and side projects I've built independently — mostly to learn, prototype ideas, and explore what's possible at the intersection of AI, product, and engineering.

---

1. Labs — v2.15.5
   Status: Live & actively maintained
   URL: labs.dianaismail.me
   Repo: labs

   My project showcase — a hand-coded creative layer where the interface itself is the portfolio piece. The site opens with a terminal boot sequence, then drops into a reactive canvas field that follows the cursor on desktop and ripples autonomously on mobile. Headlines decrypt character-by-character, view transitions glitch and reassemble, and project cards tilt and lift as the pointer moves between them. Everything runs on raw Canvas API and requestAnimationFrame — no animation libraries for the interactive layer.

   What it does:
   - Self-maintaining project grid with nightly GitHub Actions auto-sync for version numbers and timestamps
   - Embedded Digital Twin chat widget with persistent session history
   - Per-project SEO: unique OG social preview images, JSON-LD structured data, keywords from tags
   - Article system with editorial layout and sticky takeaways sidebar
   - Playground layer hosting three interactive experiments (see Playground Experiments section below)
   - Creative animations: Ghost Type (text scramble), System Boot (terminal overlay), Signal Field (canvas grid), Datamosh (RGB glitch), Proximity Pulse (cursor-driven magnetic field)

   Built with: Next.js 16, React 19, TypeScript 6, Tailwind CSS 4, Framer Motion, Canvas API, OpenAI, Redis, GitHub Actions, semantic-release
   Key learning: Canvas-based cursor animations require bounding-box culling — the Signal Field only recalculates dots within a radius around the pointer, skipping the full grid each frame.

---

2. Diana's Digital Twin — v2.3.1
   Status: Live & actively maintained
   Repo: telegram-digital-twin

   An AI-powered digital twin of myself — a persistent, multi-interface AI persona that answers questions about my career, skills, and projects in my voice.

   What it does:
   - Cross-platform AI persona across web chat widget, standalone landing page, and Telegram bot
   - 13 structured context files: 9 always-injected, 4 keyword-triggered on-demand layers
   - Mtime caching hot-reloads edited context files without a server restart
   - Conversation history persists in Redis with 30-day rolling TTL and automatic summarisation
   - Cross-platform auto-pairing: continue web conversations in Telegram via deep links or OTP codes, both resolving to a single shared session via Redis aliasing
   - SSE streaming for web, full JSON for API consumers
   - Input sanitisation strips prompt injection patterns before every LLM call

   Built with: Next.js, OpenAI GPT, Redis, Telegram Bot API (hosted on Labs — labs.dianaismail.me)
   Key learning: Tiered context injection (always-on vs on-demand keyword triggers) reduced token usage by ~57% vs injecting everything.

---

3. RESO (CV/JD Matcher & Application Tool) — v3.11.2
   Status: Live
   URL: reso.dianaismail.me
   Repo: FitCheckerApp

   An AI-powered job search platform — upload a CV and job description, get dual ATS and recruiter match scores, tailored CV generation with diff view, and interview prep packs. A full job tracker manages the application pipeline.

   What it does:
   - Dual scoring: ATS score (keyword/format compliance) and recruiter score (human readability/narrative strength), plus career archetype classification across six categories with industry-adaptive tone generation
   - Tailored CV variant generation with line-by-line diff view against the original
   - Interview prep packs with company-specific questions
   - Full job tracker: 8-stage pipeline from Applied to Offer/Rejected, with logged interview sessions summarised by LLM on demand
   - Insights dashboard: pipeline funnels, weekly trends, score averages across tracked roles
   - 10-page admin panel: prompt versioning with diff and rollback, LLM configuration, pricing management, discount codes, analytics, and full audit log
   - sessionStorage navigation (not URL params) — a privacy decision keeping job UUIDs out of browser history
   - Better Auth with database-backed sessions and Drizzle adapter, replacing earlier NextAuth setup while preserving bcrypt-with-pepper credential flow
   - PostgreSQL advisory locks for race-condition-safe credit deduction
   - Upstash Redis: rate limiting (sliding window), response caching (cache-aside), request idempotency (SET NX with 5-min TTL)
   - Dark-mode-first Obsidian Edge design palette — Lighthouse 100/100 accessibility in both modes, dedicated print stylesheet

   Built with: Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, PostgreSQL, Drizzle ORM, Better Auth, TanStack Query, Zustand, OpenAI, Upstash Redis, Resend, Pino, Vitest, Playwright, Railway
   Key learning: PostgreSQL advisory locks (pg_advisory_xact_lock) were the only clean solution for race-condition-safe credit deduction — row-level locks were insufficient because the balance is a computed aggregate across multiple rows.

---

4. AI Chat Scheduler — v2.3.5
   Status: Demo / POC
   URL: scheduler.dianaismail.me
   Repo: EventChatScheduler

   A conversational AI assistant that helps event attendees discover sessions and build conflict-free personal schedules for multi-day events.

   What it does:
   - Natural language chat to discover sessions, speakers, and exhibitors, then build a personalised conflict-free itinerary
   - AI-emitted markers ([GENERATE_SCHEDULE], schedule_download JSON blocks) trigger client-side behaviours from within streamed responses
   - One-click iCalendar export and printable schedule view

   Built with: Next.js 16, Vercel AI SDK, OpenAI GPT, TypeScript 5, Framer Motion
   Key learning: Markers must appear at predictable positions in the stream; if the model embeds them mid-sentence or omits them under ambiguous prompts, the UI silently skips the action.

---

5. GEO Audit — v2.10.10
   Status: Live
   URL: geoaudit.dianaismail.me
   Repo: GEOAudit

   A tool that tests any webpage's visibility to AI search engines — Perplexity, Gemini, ChatGPT. Returns a scored report with specific, actionable improvements. Three audit tiers with increasing depth.

   What it does:
   - Three audit tiers: Basic (free, 3 core metrics — Fact Density, Entity Salience, Extractability), Advanced (1 credit, 8 metrics with competitor gap analysis and platform fit assessment), Commerce (2 credits, scores against 6 weighted protocols — Universal Baseline 40%, Google UCP 20%, OpenAI ACP 15%, Amazon Buy for Me 10%, Perplexity 10%, Microsoft Copilot 5%)
   - Commerce tier runs 7-9 binary checks per protocol to produce readiness verdicts: discovery-ready at 50+, transaction-ready when any non-Universal protocol also scores 60+
   - Three LLM backends: OpenAI, Gemini, and Anthropic — model selection managed through admin UI
   - Database-backed admin UI with prompt versioning and version history, so model and prompt changes deploy without code changes
   - JWT authentication with role hierarchy (user/admin/super_admin)
   - Results render as charts (Recharts) with PDF export
   - Fully decoupled frontend/backend: React 19 on Vite communicates with Express API via environment-configured endpoints
   - SSE streaming with fetch() + ReadableStream (not EventSource, which doesn't support credentials)
   - SSRF protection covering full private IP space
   - Stripe for credit purchases

   Built with: React 19, TypeScript, Vite 7, Tailwind CSS 4, Express 4, Node.js 22, OpenAI, Gemini, Anthropic, PostgreSQL, Cheerio, Turndown, Recharts, Stripe, Zod, JWT, Docker, Nginx, Railway
   Key learning: Tailwind CSS v4's oklch() colour space breaks html2canvas's CSS parser — the fix pre-renders each Recharts SVG to a PNG data URL via XMLSerializer + offscreen canvas.

---

6. Slack ↔ Claude CLI Bridge — v1.0.0
   Status: Active (internal tool)
   Repo: claudecli-local-mcp

   An internal Slack bot that routes direct messages and @mentions to Claude — via the local CLI or the Anthropic API — with GPT-powered Gmail digest and team inbox commands.

   What it does:
   - Responds to DMs and @mentions, routing to Claude in CLI mode (local binary) or API mode (Anthropic API), switchable via env var
   - /digest: fetches unread Gmail for up to three accounts, classifies by priority using GPT, returns formatted summary
   - /owner-inbox: scans a designated folder and suggests prioritised actions
   - Socket Mode for local dev, HTTP mode for cloud deployments

   Built with: Node.js, Slack Bolt SDK, Anthropic API, OpenAI, Gmail API
   Key learning: CLI mode only works when the claude binary is authenticated on the local machine — cloud deployment silently requires API mode.

---

7. Diana Ismail — Portfolio — v2.0.0
   Status: Live
   URL: dianaismail.me
   Repo: portfolio

   My portfolio site — ground-up migration from WordPress to Next.js 16, designed and built by my AI team.

   What it does:
   - AI Context Panel: collapsible sidebar on desktop, inline accordion on mobile, streaming AI-generated project summaries on demand (cached in sessionStorage by content hash)
   - Embedded Digital Twin: floating chat widget on every page, primary interface on the Ask Diana page, shared Redis session
   - Sanity CMS for all content management — no code changes needed for updates
   - WCAG AA-compliant theming in both light and dark mode
   - WordPress URL redirects to preserve old bookmarks
   - Locally hosted fonts to avoid build-time network dependencies

   Built with: Next.js 16, TypeScript, Tailwind CSS, Sanity CMS, OpenAI, Redis, Railway
   Key learning: The parent nav's backdrop-blur creates a CSS stacking context that traps position: fixed children — a portal to document.body was the clean escape.

---

8. IG Autopilot — v1.0.0
   Status: Active (internal tool)
   Repo: ig-autopilot

   An automated Instagram content pipeline — write a line of text, pick a template, and the tool renders a pixel-perfect graphic, uploads it to a CDN, and publishes it to Instagram via the Graph API.

   What it does:
   - Four-stage pipeline: inject content variables into HTML template → render to PNG via headless Puppeteer (1080x1080 or 1080x1350) → upload to Cloudflare R2 CDN → publish via Instagram Graph API two-stage container flow
   - Ten templates across six content pillars using DM Sans typography with variable injection
   - Carousel publishing: up to ten slides per post, each rendered independently
   - Dry-run mode for local preview, quota check against API's 25-posts-per-day limit

   Built with: Node.js, Puppeteer, Cloudflare R2, Meta Instagram Graph API v21.0
   Key learning: Instagram's Graph API enforces a two-stage publish flow — create a container, poll until processing completes, then publish. The container can sit in IN_PROGRESS for up to 60 seconds.

---

PLAYGROUND EXPERIMENTS

Three interactive experiments hosted at labs.dianaismail.me/playground/. Each runs entirely client-side with no server dependencies.

EXP_001 — Voice Particle Instrument (live)
   150,000 GPU-instanced particles respond to microphone input in real time. The browser captures audio through a Web Audio AnalyserNode running a 1024-sample FFT, splits it into four frequency bands (bass, low-mid, high-mid, treble), and maps each band to directional forces on particle subsets — bass pushes down in red, treble pushes up in white. Without audio, particles hold a breathing sphere; above a signal threshold, the sphere explodes into a directional storm shaped by the spectral content of the sound. A terrain mesh below deforms in sync with the same FFT data.

   What it proves: 150K individually animated particles at 60fps in the browser using WebGL2 instanced buffer geometry — no compute shaders, no WebGPU, no native code. The bottleneck is the CPU-to-GPU data bridge; keeping all per-particle state on the GPU and only sending 2KB of audio uniform data per frame keeps it tractable.

   Built with: WebGL2, Three.js, Web Audio API, GPU instancing
   Key learning: The Web Audio API's AnalyserNode is fast enough to drive real-time visual feedback at animation-loop speeds — the FFT runs at frame rate without blocking the render pipeline.

EXP_002 — Gesture Fluid Wall (beta)
   A 256x256 Eulerian fluid grid running Jos Stam's Stable Fluids algorithm entirely on the CPU, rendered to Canvas 2D. Pointer movement injects velocity and density into the grid — the fluid advects, diffuses, and conserves mass in real time. Four selectable colour palettes map fluid density to visual output.

   Each frame runs four steps: diffusion (20 Jacobi passes), semi-Lagrangian advection with bilinear interpolation, pressure solve (40 Jacobi passes), and projection to enforce mass conservation. The velocity field is processed twice through projection — before and after advection — to maintain a divergence-free field at both stages. When the pointer is idle, density decays faster and ambient currents inject faint wisps to keep the field visually alive.

   What it proves: A full Navier-Stokes solver runs at 60fps in the browser on CPU and Canvas 2D alone. No WebGPU, no WebGL, no WASM. Stam's unconditionally stable semi-Lagrangian advection never blows up regardless of input speed — the core property that makes it safe for a public-facing demo.

   Built with: Canvas 2D, Jos Stam's Stable Fluids, Float64Array
   Key learning: The Jacobi iteration count (60 passes per frame across two solve steps) is the bottleneck, but Float64Array arithmetic on modern JS engines is fast enough for real-time simulation at 256x256.

EXP_003 — Crowd Flow Twin (beta)
   10,000 autonomous agents run a Boids flocking algorithm, leaving density trails on a grid as they move. Those trails feed a Gray-Scott reaction-diffusion system that transforms raw crowd density into emergent organic patterns — coral, lichen, chemical wavefronts. The result visualises crowd density not as a heatmap but as a living pattern.

   Three simulation passes run each frame: agent flocking (separation, alignment, cohesion via spatial hash grid), trail accumulation (agents deposit density that decays over time), and Gray-Scott reaction-diffusion (two virtual chemicals whose interplay produces self-organising structures based on feed rate, kill rate, and diffusion ratios). Clicking creates obstacles that reshape flow corridors in real time.

   What it proves: Three coupled simulation systems — agent flocking, trail accumulation, and reaction-diffusion — run at 60fps in the browser, entirely client-side. Spatial hashing makes 10,000-agent neighbour lookups tractable on the CPU without WASM or native plugins.

   Built with: Canvas 2D, Boids algorithm, Gray-Scott reaction-diffusion, spatial hash grid
   Key learning: The pipeline pattern (multiple simulation passes reading and writing shared data structures each frame) is the foundation for serious browser-based simulation work — fluid dynamics, crowd modelling, procedural generation.

---

ARTICLES

Three editorial pieces published on Labs, covering how the agentic workflow behind all these projects actually works.

1. "Building an Agentic Workflow"
   How the 12-person AI team works — session persistence via Claude Code hooks, context management with explicit compaction at 60% capacity, and cross-project state awareness through automated repository scanning at session start. Documents the role specialisation model and AGENT.md files that turn a generic assistant into a structured engineering team.

2. "Scaling an Agentic Workflow"
   What broke when the system scaled from one project to fourteen. The fix: a three-layer rule cascade modelled on CSS specificity (global, project, scoped), a dual CLAUDE.md architecture separating planning context from code conventions, and cross-project state files that prevent agents from working in a vacuum.

3. "Designing Rules for AI Agents"
   Information architecture for agent governance. LLM reasoning degrades around 3,000 tokens of instructions — not from context limits but from cognitive load. Covers three inheritance patterns (specificity-based, last-write-wins, value-by-value merge), explicit override declarations, and the five anti-patterns that waste token budget without constraining behaviour.

---

OVERALL THEMES ACROSS EXPERIMENTS

- All projects are deployed on Railway using Docker
- All use OpenAI, Gemini, or Anthropic as the AI backbone — GEO Audit runs all three
- Modern stack across the board: Next.js 16, React 19, TypeScript 5/6, Tailwind CSS 4
- All prioritise security: httpOnly cookies, bcrypt passwords, parameterised queries, input sanitisation, SSRF protection, JWT auth with role hierarchies, no secrets in frontend bundles
- The Playground experiments push client-side computation: GPU instancing, Navier-Stokes fluid solvers, coupled multi-simulation pipelines — all running at 60fps in the browser without WASM or native plugins
- The articles document the methodology behind the work, not just the output — treating agentic workflow design as a first-class engineering discipline
- The experiments reflect a pattern of building full, production-quality products — not throwaway prototypes — with proper auth, payments, admin panels, logging, testing, and deployment from the start
- Every project was built end-to-end through Claude Code using the agentic workflow

These projects sit at the intersection of my professional interests: AI, product thinking, and shipping things that actually work.
