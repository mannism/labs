# CLAUDE.md

## Project

**Diana Ismail Labs** — a static Next.js 16 portfolio (React 19, TypeScript, Tailwind CSS v4, Framer Motion). Single-page, client-side only. No backend, no database, no API routes, no auth.

All project data lives in `src/data/projects.json`. The UI reads this file at build time — adding/editing/hiding a project is a JSON-only change.

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
- Never use `dangerouslySetInnerHTML` with user-controlled content.
- All external links must carry `rel="noopener noreferrer"`.

---

## Code Quality

- Use descriptive names. Add comments only where the logic isn't obvious from the code.
- Do not duplicate the `Project` interface — it is exported from `ProjectCard.tsx` and imported wherever needed.
- Keep components focused. `ProjectGrid` owns filtering state and drawer visibility. Individual cards are stateless display components.

---

## Git Workflow

### Branching
One branch per task: `<type>/<short-description>-v<version>`

| Type | When |
|------|------|
| `feature/` | New functionality |
| `bugfix/` | Bug fixes |
| `refactor/` | Code restructuring |
| `chore/` | Config, deps, tooling |

Start at `v0.1` if no prior version exists.

### Commits
Break large tasks into focused subtasks. Commit after each subtask.

Format: `[v<version>] <type>: <what was done>`

**Examples:**
- `feature/add-search-v0.1` → `[v0.1] feature: add keyword search to project grid`
- `bugfix/fix-drawer-scroll-v1.1` → `[v1.1] bugfix: fix body scroll not restored on drawer close`
