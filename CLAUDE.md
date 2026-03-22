# CLAUDE.md

## Project

**Diana Ismail Labs** — a static Next.js 16 portfolio (React 19, TypeScript, Tailwind CSS v4, Framer Motion). Single-page, client-side only. No backend, no database, no API routes, no auth.

All project data lives in `src/data/projects.json`. The UI reads this file at build time — adding/editing/hiding a project is a JSON-only change.

---

## Conventions

- **Components:** PascalCase, one per file. Props defined as TypeScript interfaces.
- **Functions:** camelCase. Constants: `UPPER_SNAKE_CASE`.
- **CSS classes:** kebab-case with BEM-style prefixes (`glass-*`, `card-*`, `filter-*`).
- **Fonts:** Merriweather (display/headings), Open Sans (body), Geist Mono (badges/code).
- **Colors:** always via CSS custom properties — `var(--bg-primary)`, `var(--accent-blue)`, `var(--text-primary)`. Never raw hex values in components.
- **TypeScript:** strict mode on — no `any` types, no unused locals or parameters.

---

## Architecture Conventions

- **Single source of truth:** `src/data/projects.json` drives the grid, category filters, and drawer content. Never hardcode project data in components.
- **CSS custom properties over Tailwind for design tokens:** Colours, glass effects, and typography variables are defined in `globals.css` (e.g. `var(--accent-blue)`, `var(--bg-glass)`). Use these in components rather than raw hex values.
- **CSS transitions over JS for micro-interactions:** Filter tabs, links, and hover states use CSS `transition` (see `.filter-tab`, `.card-icon-btn` in `globals.css`). Reserve Framer Motion for component entry/exit and card hover lift.
- **`statusClass` duplication is intentional:** Both `ProjectCard` and `ProjectDetailsDrawer` define their own `statusClass` helper to keep components self-contained and independently deployable. Do not extract it to a shared util unless a third component needs it.
- **Internal vs external URLs:** Demo URLs containing `dianaismail.me` open in `_self`; all others use `target="_blank" rel="noopener noreferrer"`. This logic is mirrored in both `ProjectCard` and `ProjectDetailsDrawer` — keep them in sync.

---

## Security

- Never hardcode API keys or environment-specific URLs in source files. Use `.env.local` (already in `.gitignore`). Only prefix with `NEXT_PUBLIC_` when browser exposure is intentional.
- All fonts are self-hosted via `next/font/google` — do not add external CDN links.
- Security headers are configured in `next.config.ts`. Do not weaken them (HSTS, X-Frame-Options, CSP, Permissions-Policy).
- Never use `dangerouslySetInnerHTML` with user-controlled content — React's default escaping is sufficient; don't bypass it.
- All external links must carry `rel="noopener noreferrer"`.
- Never expose stack traces, raw error objects, or internal file paths in UI-visible output.

---

## Code Quality

- Use descriptive names. Add JSDoc comments where the logic isn't obvious from the code.
- Do not duplicate the `Project` interface — it is exported from `ProjectCard.tsx` and imported wherever needed.
- Keep components focused. `ProjectGrid` owns filtering state and drawer visibility. Individual cards are stateless display components.

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
