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

### Branching (GitHub Flow)
One branch per task: `<type>/<short-description>` — no version in the branch name.

Common types: `feature/`, `fix/`, `refactor/`, `chore/`

### Commits (Conventional Commits)
Format: `<type>(<optional scope>): <description>`

| Prefix | When to use | Version bump |
|--------|-------------|--------------|
| `feat` | New functionality | Minor (`X.Y → X.Y+1`) |
| `fix` | Bug fixes | Patch (`X.Y.Z → X.Y.Z+1`) |
| `refactor` | Code restructuring (no API change) | Patch |
| `chore` | Config, deps, tooling | Patch |
| `feat!` / `BREAKING CHANGE:` footer | Breaking changes | Major (`X → X+1`) |

**Examples:**
- Branch: `feature/add-search` → Commit: `feat: add keyword search to project grid`
- Branch: `fix/drawer-scroll` → Commit: `fix: restore body scroll on drawer close`

### Versioning & Releases (automated)
On every merge to `main`, `semantic-release` automatically:
1. Bumps `"version"` in `package.json`
2. Generates / appends `CHANGELOG.md`
3. Creates a `vX.Y.Z` Git tag
4. Publishes a GitHub Release

**No manual version bumps, tags, or changelog edits needed.**
Configuration: `.releaserc.json` — workflow: `.github/workflows/release.yml`
