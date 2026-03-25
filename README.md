# Diana Ismail Labs

**Version:** 1.6.1

A Next.js 16 portfolio showcasing proof-of-concept projects and experiments in Agentic-AI, Immersive Experiences, and Experimental Technology.

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
| Deployment | Docker (multi-stage, Node 22 Alpine) |

**Security & Privacy:**
- All fonts (Merriweather, Open Sans, Geist Mono) are self-hosted via `next/font/google` — zero external HTTP requests at runtime.
- Strict security headers enforced in `next.config.ts`: HSTS (2-year preload), `X-Frame-Options: DENY`, restrictive `Permissions-Policy`, and a tight CSP.

## Architecture

The app is a single-page client-side React application. All data lives in `src/data/projects.json` — no backend, no database, no API routes.

```
src/
├── app/
│   ├── layout.tsx          # Root layout: fonts, metadata, background orbs
│   ├── page.tsx            # Home page: Hero + ProjectGrid + Footer
│   └── globals.css         # Design tokens, animations, component base styles
├── components/
│   ├── Hero.tsx            # Status badge + headline
│   ├── ProjectGrid.tsx     # Category filtering + grid layout
│   ├── ProjectCard.tsx     # Individual card with Framer Motion animations
│   ├── ProjectDetailsDrawer.tsx  # Slide-out panel (bottom-sheet on mobile, side-panel on desktop)
│   └── Footer.tsx          # Copyright + main site link
└── data/
    └── projects.json       # Single source of truth for all project data
```

## Managing Projects

Add, edit, or hide projects by modifying `src/data/projects.json`. The category filter tabs and grid are generated entirely from this file.

### Project schema

```json
{
  "id": "unique-slug",
  "title": "Project Title",
  "shortDescription": "One-line summary shown on the card.",
  "detailedDescription": "Full description shown in the details drawer.",
  "category": "Agentic-AI",
  "status": "Active",
  "display": true,
  "tags": ["Python", "OpenAI"],
  "demoUrl": "https://project.dianaismail.me",
  "githubUrl": "https://github.com/..."
}
```

**Field notes:**
- `display: false` hides the project from the grid without deleting it.
- `status` accepts `"Active"`, `"Research"`, or `"Archived"` — each maps to a distinct badge colour.
- Setting `demoUrl` or `githubUrl` to `"#"` hides the corresponding action button.
- Demo URLs containing `dianaismail.me` open in the same tab; all other URLs open in a new tab with `noopener noreferrer`.

## Getting Started

```bash
npm install
npm run dev
```

## Docker Deployment

**Recommended (Docker Compose):**
```bash
docker compose up -d --build
```

**Manual:**
```bash
docker build -t labs-app .
docker run -p 3000:3000 labs-app
```

The Docker build uses a three-stage pipeline (deps → builder → runner) with Next.js standalone output for a minimal production image.
