Personal Experiments & Side Projects — Diana Ismail

These are personal coding experiments and side projects I've built independently — mostly to learn, prototype ideas, and explore what's possible at the intersection of AI, product, and engineering.

---

1. Diana's Digital Twin — v2.2
   Status: Live & actively maintained
   Repo: telegram-digital-twin

   An AI-powered digital twin of myself — an experiment in building a persistent, multi-interface AI persona that answers questions about my career, skills, and projects.

   What it does:
   - Cross-platform AI persona available via web chat widget and Telegram bot, with shared memory via OTP deep-link pairing
   - Persists conversation history in Redis with 30-day rolling TTL and automatic summarisation

   Built with: Next.js, OpenAI GPT, Redis, Telegram Bot API (now hosted on Labs — labs.dianaismail.me)
   Key learning: Tiered context injection (always-on vs on-demand keyword triggers) reduced token usage by ~57% vs injecting everything.

---

2. RESO (CV/JD Matcher & Application Tool) — v2.6.1
   Status: Live
   Repo: FitCheckerApp

   An AI-powered job search assistant that scores CV-to-job-description fit, generates tailored CV rewrites, and tracks applications through a full pipeline.

   What it does:
   - AI match scoring with tailored CV rewrite and interview prep packs per role
   - Built-in job tracker with 8-stage pipeline and insights dashboard
   - Monetised with credit system via Stripe

   Built with: Next.js 16, React 19, TypeScript, PostgreSQL, NextAuth.js v5, OpenAI GPT, Railway
   Key learning: The sessionStorage navigation pattern (passing job UUIDs via sessionStorage rather than URL params) was a deliberate privacy and UX decision that required careful SSR guard handling in Next.js.

---

3. AI Chat Scheduler — v2.3.4
   Status: Demo / POC
   Repo: EventChatScheduler

   A conference AI assistant demo built to showcase AI-powered event navigation for a client pitch. Designed around XyzCon 2026 sample data.

   What it does:
   - Natural language chat to discover sessions, speakers, and exhibitors, then build a personalised conflict-free itinerary
   - Uses 4 background tools for data retrieval with multi-factor relevance scoring
   - One-click iCalendar export and printable schedule view

   Built with: Next.js 16, Vercel AI SDK, OpenAI GPT-5.1, Framer Motion
   Key learning: Using special AI-emitted markers ([GENERATE_SCHEDULE], schedule_download JSON blocks) to trigger client-side behaviours from within streamed AI responses — a clean way to bridge LLM output and UI state.

---

4. GEO Audit — v1.2.6
   Status: Live
   Repo: GEOAudit

   A tool that scores how well a webpage is optimised for AI search citations — how likely it is to be cited by Perplexity, SearchGPT, Google AI Overviews, or Gemini.

   What it does:
   - Free basic audit (3 metrics) and paid advanced audit (8 metrics, competitor gap analysis, PDF export)
   - Fully decoupled frontend/backend architecture on separate Railway services
   - Supports Gemini or OpenAI as LLM backend with prompt versioning per audit

   Built with: React 19, TypeScript, Vite, Node.js, Express, PostgreSQL, Gemini API, OpenAI API, Stripe, Railway
   Key learning: Building a credible two-tier (free vs paid) SaaS product with a completely decoupled frontend/backend architecture — VITE_* env vars are baked into the browser bundle at build time, so secrets must never touch the frontend.

---

OVERALL THEMES ACROSS EXPERIMENTS

- All projects are deployed on Railway.app using Docker
- All use OpenAI (or Gemini) as the AI backbone, with provider abstraction patterns
- All prioritise security: httpOnly cookies or JWT, bcrypt passwords, parameterised SQL queries, no secrets in frontend bundles
- The experiments reflect a pattern of building full, production-quality products — not just throwaway prototypes — with proper auth, payments, logging, and deployment from the start

These projects sit at the intersection of my professional interests: AI, product thinking, and shipping things that actually work.
