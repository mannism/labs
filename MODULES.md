# Module Manifests

Module manifests document logical units with clear ownership, dependency rationale, and public API surfaces.
A module qualifies when it has a clear boundary **and at least 2 consumers** (other modules or routes that import from it).

---

## Manifests

| Module | Manifest | Purpose |
|--------|----------|---------|
| [twin-config](src/lib/twin/manifest.config.yaml) | `src/lib/twin/config.ts` | Single env-var entry point — all twin modules import from here, never `process.env` directly |
| [twin-redis](src/lib/twin/manifest.redis.yaml) | `src/lib/twin/redis.ts` | ioredis singleton — one connection per process, shared across route handler invocations |
| [twin-memory](src/lib/twin/manifest.memory.yaml) | `src/lib/twin/memory.ts` | Redis interactions — chat history, rate limiting, OTP pairing |
| [twin-messages](src/lib/twin/manifest.messages.yaml) | `src/lib/twin/messages.ts` | User-facing string constants — single source of truth for all error and reply copy |
| [twin-engine](src/lib/twin/manifest.engine.yaml) | `src/lib/twin/engine.ts` | Core chat orchestrator — rate limit → history → OpenAI → summarize → persist |
| [api-cors](src/app/api/manifest.cors.yaml) | `src/app/api/cors.ts` | CORS header utilities for API routes — dianaismail.me allowlist and preflight responses |
| [lib-projects](src/lib/manifest.projects.yaml) | `src/lib/projects.ts` | Canonical project data loader — resolves Labs version from package.json |
| [lib-analytics](src/lib/manifest.analytics.yaml) | `src/lib/analytics.ts` | gtag wrapper — type-safe trackEvent for client components |
| [types-project](src/types/manifest.project.yaml) | `src/types/project.ts` | Project and ArticleSection TypeScript interfaces |
| [types-experiment](src/types/manifest.experiment.yaml) | `src/types/experiment.ts` | Experiment and ExperimentStatus TypeScript types |
| [use-reduced-motion](src/components/v2/manifest.useReducedMotion.yaml) | `src/components/v2/useReducedMotion.ts` | prefers-reduced-motion hook — canonical implementation shared across v2 and playground |

---

## Qualification Table

| Path | Consumers | Qualifies | Reason |
|------|-----------|-----------|--------|
| `src/lib/twin/config.ts` | engine, memory, redis, telegram, telegram/route | Yes | 5 consumers |
| `src/lib/twin/redis.ts` | memory, engine | Yes | 2 consumers |
| `src/lib/twin/memory.ts` | engine, chat/history, link, telegram/route | Yes | 4 consumers |
| `src/lib/twin/messages.ts` | engine, chat/stream, link, telegram/route | Yes | 4 consumers |
| `src/lib/twin/engine.ts` | chat/stream, telegram/route | Yes | 2 consumers |
| `src/app/api/cors.ts` | chat/stream, chat/history, link | Yes | 3 consumers |
| `src/lib/projects.ts` | layout, sitemap, llms.txt, module/[slug], opengraph-image, ProjectGridV2, ProjectDetailV2, SystemBoot | Yes | 8 consumers |
| `src/lib/analytics.ts` | ChatWidget, ProjectCard, ProjectDetailV2 | Yes | 3 consumers |
| `src/types/project.ts` | projects.ts + 9 components/routes | Yes | 10+ consumers |
| `src/types/experiment.ts` | playground/[slug], ExperimentsLanding, ExperimentDetail, ExperimentCard, StatusIndicator | Yes | 5 consumers |
| `src/components/v2/useReducedMotion.ts` | 8 v2 components + 3 playground components | Yes | 11 consumers |
| `src/lib/twin/prompts.ts` | engine only | No | 1 consumer — internal implementation detail of twin-engine |
| `src/lib/twin/telegram.ts` | telegram/route only | No | 1 consumer — internal to the Telegram route handler |
| `src/components/v2/useTextScramble.ts` | ExperimentsLanding, SystemBoot | No | 2 consumers but composes useReducedMotion internally — not an independent boundary |
| `src/components/v2/useProximityField.ts` | ProjectGridV2 only | No | 1 direct consumer |
| `src/components/v2/renderWithCodeHighlights.tsx` | ProjectCardV2, ProjectDetailV2 | No | Internal rendering utility — no independent ownership boundary |
| `src/components/playground/` (individual files) | 1 app route page each | No | Each playground component has a single route consumer |
| `src/data/projects.json` | lib/projects.ts + direct consumers | No | Data file, not a code module — typed by types-project |
| `src/data/experiments.json` | playground/[slug], ExperimentsLanding | No | Data file, not a code module — typed by types-experiment |
| `src/components/v2/` (remaining components) | Consumed within v2 layer only | No | Internal component tree — no cross-boundary consumers |
