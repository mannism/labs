# CLAUDE.md

> Global rules (TypeScript, security, git workflow, accessibility baseline) are in ~/.claude/CLAUDE.md

## Project

**Diana Ismail Labs** — a Next.js 16 portfolio (React 19, TypeScript, Tailwind CSS v4, Framer Motion) with an embedded AI chat engine.

The app has two layers:
- **UI layer:** Single-page client-side React app. Project data lives in `src/data/projects.json` — adding/editing/hiding a project is a JSON-only change.
- **Chat engine layer:** Three API routes (`/api/chat/stream`, `/api/link`, `/api/telegram`) backed by OpenAI and Redis. Powers the floating ChatWidget and Telegram bot with shared cross-platform conversation history.

---

## Conventions

- **CSS classes:** kebab-case with BEM-style prefixes (`glass-*`, `card-*`, `filter-*`).
- **Fonts:** Merriweather (display/headings), Open Sans (body), Geist Mono (badges/code).
- **Colors:** always via CSS custom properties — `var(--bg-primary)`, `var(--accent-blue)`, `var(--text-primary)`. Never raw hex values in components.

---

## Architecture Conventions

### UI layer
- **Single source of truth:** `src/data/projects.json` drives the grid, category filters, and drawer content. Never hardcode project data in components.
- **`version` and `lastUpdated` fields in `projects.json`** are populated automatically by the GitHub Actions workflow (see below). Do not edit them by hand — the next sync run will overwrite manual changes. These fields are optional; both the card and drawer render gracefully when absent.
- **`.github/workflows/sync-project-versions.yml`** — runs daily at 02:00 UTC. For each project listed in `REPO_MAP` it fetches the latest release tag (falling back to the first repo tag) and writes it to `version`, then reads `pushed_at` and writes it to `lastUpdated`. If either value changed, it auto-commits `src/data/projects.json` to `main` with `[skip ci]`. To add a new project: add a `"Exact project title": "owner/repo"` entry to `REPO_MAP` in the workflow file — the title must match the `title` field in `projects.json` exactly.
- **CSS custom properties over Tailwind for design tokens:** Colours, glass effects, and typography variables are defined in `globals.css` (e.g. `var(--accent-blue)`, `var(--bg-glass)`). Use these in components rather than raw hex values.
- **CSS transitions over JS for micro-interactions:** Filter tabs, links, and hover states use CSS `transition` (see `.filter-tab`, `.card-icon-btn` in `globals.css`). Reserve Framer Motion for component entry/exit and card hover lift.
- **`statusClass` duplication is intentional:** Both `ProjectCard` and `ProjectDetailsDrawer` define their own `statusClass` helper to keep components self-contained and independently deployable. Do not extract it to a shared util unless a third component needs it.
- **Internal vs external URLs:** Demo URLs containing `dianaismail.me` open in `_self`; all others use `target="_blank" rel="noopener noreferrer"`. This logic is mirrored in both `ProjectCard` and `ProjectDetailsDrawer` — keep them in sync.
- **Article type entries:** Projects with `type: "article"` render a full-width editorial layout (`ArticleLayout`) with titled prose sections and a sticky right sidebar for key takeaways (collapses below content on mobile). Article cards in the grid show an `ARTICLE_` prefix and dashed chartreuse top border. Standard project entries default to `type: "project"` and render the sidebar+content `ProjectLayout`.
- **Per-project SEO:** Each `/module/[slug]` page generates unique keywords (from `project.tags`), JSON-LD structured data (`SoftwareApplication` for projects, `Article` for articles), and a dynamic OG social preview image via `opengraph-image.tsx` in the `[slug]` directory.

### Playground layer (`src/app/playground/`, `src/components/playground/`)
- **Data source:** `src/data/experiments.json` — same pattern as `projects.json`. Typed by `src/types/experiment.ts`.
- **Route structure:** `/playground/` (landing grid) and `/playground/[slug]` (individual experiment pages). Both are App Router pages with a shared layout.
- **CSS tokens:** `--exp-*` custom properties defined in `globals.css` under `html.v2` — status colours, dark glass overlay, and canvas background.
- **WebGPU capability:** `WebGPUProvider` (context) wraps the playground layout. Components use `useWebGPU()` to conditionally render fallbacks. `WebGPUBanner` shows an amber info bar when unsupported.
- **Experiment pages use `next/dynamic` with `ssr: false`** for Three.js / WebGPU / Canvas 2D components.
- **NavbarV2 PLAYGROUND link:** Uses `usePathname()` to highlight with a chartreuse underline when active. "L A B S" is now a `<Link>` back to `/`.

### Chat engine layer (`src/lib/twin/`)
- **`config.ts` is the single env var entry point.** All modules import from `config.ts` — never call `process.env` directly anywhere else.
- **`engine.ts` owns the full message flow:** rate limit → history → context injection → OpenAI → summarize → save. Do not scatter these steps across other modules.
- **Tiered context injection:** Always-on context (7 files) is injected every request. On-demand context (2 files) is injected only when keywords match. Do not promote on-demand files to always-on without considering token cost.
- **`memory.ts` fails closed for rate limiting, open for OTP.** Rate limit errors block the request (safe default). OTP errors allow through (OTP won't work anyway without Redis). Preserve this asymmetry.
- **Redis singleton in `redis.ts`:** One ioredis instance per process. `enableOfflineQueue: true` (commands queue during async connection window — do not set to `false`). All Redis calls are wrapped in try-catch in `memory.ts`.
- **Context markdown files get individual commits.** Changes to `src/data/twin/` (context files, `System-prompt.md`, `summarise-prompt.md`) must be committed separately from code changes, for clear prompt/context history tracking.

---

## Error Handling & Observability

- Non-critical failures (Telegram delivery, Redis summarization) must log and continue — never crash the request.
- API routes must return safe, user-friendly error messages (sourced from `messages.ts`).
- The chat widget and Telegram bot must always show a graceful error state when the engine fails — never a blank screen or unhandled rejection.

---

## Security

- All fonts are self-hosted — do not add external CDN links (runtime font fetches from external CDNs create availability dependencies).
- Security headers are configured in `next.config.ts`. Do not weaken them (HSTS, X-Frame-Options, CSP, Permissions-Policy).
- All external links must carry `rel="noopener noreferrer"`.
- API routes validate input length and enforce rate limiting before touching OpenAI or Redis. Maintain these guards on any new routes.

---

## Code Quality

- Do not duplicate the `Project` interface — it is exported from `src/types/project.ts` and imported wherever needed.
- Keep components focused. `ProjectGridV2` owns filtering state and category tabs. Individual cards are stateless display components.
- Keep `src/lib/twin/messages.ts` as the single source for all user-facing strings. Do not inline error or reply text in route handlers or engine code.

---

## Git Workflow

### Branching
One branch per task: `<type>/<short-description>-v<new-version>`

| Type | When to use | Version bump |
|------|-------------|--------------|
| `feature/` | New functionality | Minor: `1.0.0 → 1.1.0` |
| `bugfix/` | Bug fixes | Patch: `1.0.0 → 1.0.1` |
| `refactor/` | Code restructuring | Patch: `1.0.0 → 1.0.1` |
| `chore/` | Config, deps, tooling | Patch: `1.0.0 → 1.0.1` |

**Examples:**
- `feature/add-search-v1.2.0`
- `bugfix/fix-drawer-scroll-v1.1.4`

### Commits
Format: `[v<new-version>] <type>: <what was done>`

**Examples:**
- `[v1.2.0] feature: add keyword search to project grid`
- `[v1.1.4] bugfix: restore body scroll on drawer close`

### Versioning steps (manual, on every commit)
1. Bump `"version"` in `package.json` to the new version
2. Add an entry to `CHANGELOG.md` under `## [x.y.z] - YYYY-MM-DD`
3. Tag the commit: `git tag v<version>`
4. Update code comments in any changed files to reflect new behavior
5. Update `README.md` if the change affects usage, setup, features, or configuration

### Merge to main
**Never push or merge directly to `main`.** Only merge when explicitly requested.

### Automated GitHub Releases (semantic-release)
On every merge to `main`, semantic-release automatically creates a GitHub Release using the commit history since the last tag. It does **not** bump `package.json`, update `CHANGELOG.md`, or push tags — those are done manually as part of the versioning steps above.

**Override: This project uses manual versioning steps. semantic-release only creates GitHub Releases.**

Configuration: `.releaserc.json` — workflow: `.github/workflows/release.yml`
