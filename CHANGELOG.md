## [1.1.8] - 2026-03-22

### Chore
* update project descriptions and tags for Digital Twin, CV/JD Matcher, and GEO Audit

## [1.1.7] - 2026-03-22

### Chore
* reconfigure semantic-release to only create GitHub Releases; manual versioning now owns package.json, CHANGELOG, and tags
* update CLAUDE.md to document new semantic-release role

## [1.1.6] - 2026-03-22

### Chore
* update AI Chat Scheduler project description and tags

## [1.1.5](https://github.com/mannism/labs/compare/v1.1.4...v1.1.5) (2026-03-22)


### Bug Fixes

* **icons:** rename apple-touch-icon to remove duplicate extension ([60be858](https://github.com/mannism/labs/commit/60be8584096a559069a25ce551993eb468444f0c))

### Chore

* update CLAUDE.md git workflow to manual versioned branching convention

## [1.1.4](https://github.com/mannism/labs/compare/v1.1.3...v1.1.4) (2026-03-21)


### Bug Fixes

* **seo:** update siteName and imageAlt to 'Labs by Diana' ([86dd53e](https://github.com/mannism/labs/commit/86dd53ed6e3b319148843a778698cb14b1cc2726))

## [1.1.3](https://github.com/mannism/labs/compare/v1.1.2...v1.1.3) (2026-03-21)


### Bug Fixes

* **ui:** update hero label to '// Labs by Diana' ([94465a1](https://github.com/mannism/labs/commit/94465a125d9537cadd633d921cc6381f9cfb78bf))

## [1.1.2](https://github.com/mannism/labs/compare/v1.1.1...v1.1.2) (2026-03-21)


### Bug Fixes

* **favicon:** remove incorrect favicon.ico and drop its metadata reference ([303668a](https://github.com/mannism/labs/commit/303668a3ebb091920130a9a54525a8d6d6c9dc5f))

## [1.1.1](https://github.com/mannism/labs/compare/v1.1.0...v1.1.1) (2026-03-21)


### Bug Fixes

* **data:** correct demoUrl for Diana's Digital Twin ([402e289](https://github.com/mannism/labs/commit/402e2898a5ac83b25fafbb8cb3868f1dca35fd02))

# [1.1.0](https://github.com/mannism/labs/compare/v1.0.0...v1.1.0) (2026-03-21)


### Features

* add favicon pack and SEO metadata ([47769f9](https://github.com/mannism/labs/commit/47769f9a07e2deb9ae17b375d3407a99751a7d7f))

# 1.0.0 (2026-03-21)


### Bug Fixes

* **ci:** bump Node.js to 22 in release workflow ([6e22ecf](https://github.com/mannism/labs/commit/6e22ecf0e26235d991be26a5f0ac1936d8789a2b))
* **docker:** use JSON CMD form and disable Next.js telemetry ([6a69609](https://github.com/mannism/labs/commit/6a69609b6b4f593b10a5d48d0630e38f5347a3a1))
* restore Navbar import and usage in page.tsx ([54bfe96](https://github.com/mannism/labs/commit/54bfe96dee1111a9966c6e05643a4f9b7768fb95))
* restore top badges, remove metadata bullets and ping feature ([71e0876](https://github.com/mannism/labs/commit/71e0876eb39f7b93e34cf9ce02c6385dafda8814))
* Revert ESLint to v9 to fix Docker build & increment Node req to v21+ ([ac0363b](https://github.com/mannism/labs/commit/ac0363b7b193b1e833cce69efda96499004f16e4))
* upgrade Next.js to 16.2.1 to resolve 5 CVEs ([80dacca](https://github.com/mannism/labs/commit/80dacca7c1cc3966d514db09750c09ca5b44c894))

# Changelog

All notable changes to this project will be documented in this file.
Format: `## [x.y.z] - YYYY-MM-DD`

---

## [1.2.0] - 2026-03-20

### Added
- Live site-reachability ping on each `ProjectCard` — fetches `demoUrl` with `no-cors` on mount; status badge turns green ("Active") if reachable, muted ("Not Active") if unreachable
- `connect-src 'self' https://*.dianaismail.me` added to CSP in `next.config.ts` to allow outbound pings

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
