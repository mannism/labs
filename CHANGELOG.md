# Changelog

All notable changes to this project will be documented in this file.
Format: `## [x.y.z] - YYYY-MM-DD`

---

## [1.1.0] - 2026-03-20

### Added
- Staggered Framer Motion entry animations on `Hero` (badge → headline → subtitle)
- `whileTap` scale feedback on the Navbar theme toggle button
- "Projects / N experiments" section heading above the project grid filter tabs
- Structured `Status: X / Type: X` metadata row on each `ProjectCard`
- `.custom-scrollbar` CSS for the details drawer scrollable body

### Fixed
- `ProjectDetailsDrawer`: SSR crash caused by `window.innerWidth` read during render — replaced with `useEffect` + `matchMedia` hook; Framer Motion variants now drive mobile vs desktop slide axis correctly
- Removed `onAnimationStart` DOM mutation that was fighting Framer Motion's style ownership

### Changed
- Navbar branding updated from `// Labs` to `Labs by Diana`
- Removed redundant `fontFamily` inline style from `Hero` `<p>` (inherited from `body`)
- `ProjectGrid` container padding increased from `py-8` to `py-16`

---

## [1.0.0] - 2026-03-20

### Added
- Initial public release of Diana Ismail Labs portfolio
- Data-driven project grid with client-side category filtering (`src/data/projects.json`)
- Project details drawer — bottom-sheet on mobile, side-panel on desktop
- Cyber-Minimalist design system: glassmorphism, CSS custom properties, Framer Motion animations
- Self-hosted fonts (Merriweather, Open Sans, Geist Mono) via `next/font/google`
- Strict security headers (HSTS, X-Frame-Options, CSP, Permissions-Policy) in `next.config.ts`
- Docker multi-stage build with Next.js standalone output
- Keyboard accessibility in cards (Enter/Space to open drawer, Escape to close)
