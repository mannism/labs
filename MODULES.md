# Module Manifests

Module manifests document logical units with clear ownership, dependency rationale, and public API surfaces.
A module qualifies when it has a clear boundary **and at least 2 consumers** (other modules or routes that import from it).

---

## Manifests

| Module | Manifest | Purpose |
|--------|----------|---------|
| [types](src/types/manifest.yaml) | `src/types/` | TypeScript interfaces for Project and Experiment entities — single source of truth, 16 consumers |
| [lib](src/lib/manifest.yaml) | `src/lib/` | Shared utilities — project data loader and analytics event tracker |
| [data](src/data/manifest.yaml) | `src/data/` | Static JSON data files — project entries, experiment entries, SEO metadata, and twin context |
| [twin](src/lib/twin/manifest.yaml) | `src/lib/twin/` | Digital Twin chat engine — OpenAI + Redis, web and Telegram support |
| [api](src/app/api/manifest.yaml) | `src/app/api/` | API route layer — chat streaming, history retrieval, Telegram webhook, OTP linking |
| [v2-hooks](src/components/v2/manifest.yaml) | `src/components/v2/` | Shared React hooks — motion preferences and text scramble animation |

---

## Qualification Table

| Path | Consumers | Qualifies | Reason |
|------|-----------|-----------|--------|
| `src/types/` | 16 components and routes | Yes | Single source of truth for Project and Experiment interfaces |
| `src/lib/` | 10 consumers (projects.ts: 8; analytics.ts: 3) | Yes | Shared data loader and analytics utility |
| `src/data/` | 10 consumers across app, lib, and twin | Yes | Foundational data layer for all app content |
| `src/lib/twin/` | 4 API routes | Yes | Entire chat engine — external calls to OpenAI and Redis |
| `src/app/api/` | ChatWidget + external Telegram Bot API | Yes | Public API surface with rate limiting, CORS, and input validation |
| `src/components/v2/useReducedMotion.ts` | 11 consumers (v2 + playground) | Yes | Consolidated into v2-hooks module |
| `src/components/v2/useTextScramble.ts` | ExperimentsLanding, ChatWidget, HeroV2 | Yes | Consolidated into v2-hooks module |
| `src/lib/twin/prompts.ts` | engine only | No | 1 consumer — internal implementation detail of twin |
| `src/lib/twin/telegram.ts` | telegram/route only | No | 1 consumer — internal to the Telegram route handler |
| `src/components/v2/useProximityField.ts` | ProjectGridV2 only | No | 1 direct consumer |
| `src/components/v2/renderWithCodeHighlights.tsx` | ProjectCardV2, ProjectDetailV2 | No | Internal rendering utility — no independent ownership boundary |
| `src/components/playground/` (individual files) | 1 app route page each | No | Each playground component has a single route consumer |
| `src/components/v2/` (remaining components) | Consumed within v2 layer only | No | Internal component tree — no cross-boundary consumers |
