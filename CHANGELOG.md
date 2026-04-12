## [2.13.4] - 2026-04-12

### Fix
* Crowd Flow always running — removed idle/active mode system. Agents flow continuously, RD patterns always grow. Obstacles redirect flow, not "activate" the simulation.
* Obstacles now clearly visible with chartreuse border and inner glow

## [2.13.3] - 2026-04-12

### Feature
* Integrate Vera's experiment descriptions — concept statements, How It Works sections, and What This Proves sections rendered below the canvas on experiment detail pages

## [2.13.2] - 2026-04-12

### Feature
* Add audio threshold toggle (LOW/DEFAULT/HIGH) to Voice Particle Instrument control panel

## [2.13.0] - 2026-04-12

### Feature
* Crowd Flow Twin (EXP_003) — Canvas 2D agent-based crowd simulation with Boids flocking (spatial-hash O(n*k) neighbor search), trail density system, and Gray-Scott reaction-diffusion visualization. Click to place obstacles, right-click to remove. Dual idle/active modes: idle shows gentle agent drift on dark background, interaction triggers dynamic flocking and organic RD pattern growth. Glass overlay control panel with agent count, speed, RD feed/kill rates, trail persistence, agent visibility toggle, and 4 color palettes (Coral, Ocean, Acid, Mono). Desktop: 5K agents, 512x512 RD grid, 60fps target. Mobile: 2K agents, 256x256 grid, 30fps target. Respects prefers-reduced-motion.

## [2.12.1] - 2026-04-12

### Content
* Add article 20: "Designing Rules for AI Agents" — Part 3 of the Agentic Workflow series

## [2.12.0] - 2026-04-11

### Feature
* Overhauled Voice Particle visualization with dual idle/active modes — idle shows a cohesive breathing sphere; audio input explodes particles per frequency band with directional forces, dynamic colors (bass=red, low-mid=chartreuse, high-mid=cyan, treble=white), radial explosion, swirl, and chaotic turbulence

## [2.11.4] - 2026-04-11

### Fix
* Fix Permissions-Policy header: catch-all `/(.*)`  route was overriding `/experiments/*` microphone=(self) with microphone=(). Changed catch-all to exclude experiments via negative lookahead.

## [2.11.3] - 2026-04-11

### Fix
* Guard `navigator.mediaDevices.getUserMedia` availability before calling — undefined on non-secure origins, causing silent failure with no browser prompt
* Improved mic error message to mention HTTPS/localhost requirement

## [2.11.2] - 2026-04-11

### Fix
* Fix WebGL context race condition in VoiceParticleCanvas — removed test context creation that raced with Three.js renderer initialization

## [2.11.0] - 2026-04-11

### Feature
* Voice Particle Instrument (EXP_001) — microphone-driven GPU particle system with 150K instanced points, spectral centroid pitch mapping, RMS loudness turbulence, onset-detected rhythm cohesion, and FFT-driven terrain mesh deformation. Glass overlay control panel with sensitivity slider, FPS counter, and mic toggle. WebGL2 with reduced-motion support.
* Three.js 0.172.0 added as dependency
* CSP headers split: `/experiments/*` routes allow microphone access and `worker-src blob:`

## [2.10.0] - 2026-04-11

### Feature
* scaffold `/experiments/` section — route group, landing page, individual experiment pages, data file, TypeScript types, CSS tokens, experiment card grid, WebGPU capability detection, and NavbarV2 experiments link
* add `src/data/experiments.json` with 3 concept experiments: Voice Particle Instrument, Gesture Fluid Wall, Crowd Flow Twin
* add `ExperimentCard`, `StatusIndicator`, `WebGPUCheck`, `ExperimentsLanding`, `ExperimentDetail`, and `ExperimentsShell` components
* add `--exp-*` CSS custom properties (status colours, glass overlay, canvas background) to `globals.css` within `html.v2` scope

## [2.9.1] - 2026-04-11

### Chore
* add `createdDate` field to Project interface — articles display publication date as `PUBLISHED`, projects keep `DEPLOYED` with `lastUpdated`. Backfilled on existing articles (id:18, id:19). Added `datePublished` to article JSON-LD.

## [2.9.0] - 2026-04-11

### Feature
* add "Scaling an Agentic Workflow" article (id:19) — sequel to Part 1, covering 3-layer rule cascade, dual CLAUDE.md architecture, folder standardisation, and cross-project coordination

## [2.8.2] - 2026-04-05

### Data
* add GitHub repository URLs for Labs, Portfolio, and Slack ↔ Claude CLI Bridge in projects.json

## [2.8.0] - 2026-04-05

### Feature
* per-project SEO: keywords from tags, SoftwareApplication/Article JSON-LD, and unique OG social preview images for every project page

## [2.7.0] - 2026-04-05

### Feature
* add IG Autopilot project entry to projects.json — automated Instagram content pipeline (Node.js, Puppeteer, Cloudflare R2, Instagram Graph API)

## [1.11.0] - 2026-03-31

### Feature
* add Google Analytics with custom event tracking
  * Integrate `@next/third-parties` `<GoogleAnalytics>` component in root layout, conditionally loaded from `NEXT_PUBLIC_GA_ID` env var
  * Update CSP in `next.config.ts` to allow Google Analytics and Tag Manager domains
  * Add `src/lib/analytics.ts` — lightweight `trackEvent` wrapper around `window.gtag()`
  * Track `card_click` event with project title and category (ProjectGrid)
  * Track `demo_launch` event with project title and URL (ProjectCard + ProjectDetailsDrawer)
  * Track `chat_open` event when chat widget is toggled open (ChatWidget)

## [1.10.5] - 2026-03-30

### Chore
* update twin context — rewrite `profile-summary.md` with new positioning, track record, and headline; update `personal.md` professional traits

## [1.10.4] - 2026-03-29

### Fix
* replace View Details button with text CTA, pin to card bottom
  * Removed the filled pill button block (`<div className="mb-6 relative z-10">`) from `ProjectCard.tsx`
  * Added lightweight text CTA (`View Details →`) with `mt-auto` to pin it above the tags row
  * Removed `mt-auto` from the tags div (now carried by the CTA div above it)
  * Added `items-stretch` to the grid container in `ProjectGrid.tsx` to make equal-height cards explicit

## [1.10.3] - 2026-03-29

### Fix
* redesign drawer interior layout per Maya UX audit (2026-03-29)
  * Fix 1 — reading order: `detailedDescription` moved immediately below title; meta badges (category + status) moved below description
  * Fix 2 — drag handle removed: visual-only indicator was a false affordance with no gesture backing; removed rather than half-implementing
  * Fix 3 — version + date merged: version badge removed from meta row; standalone updated line removed; both consolidated into a single monospaced muted line (`v2.2.5 · Updated 25 Mar 2026`)
  * Fix 4 — empty footer suppressed: sticky footer only renders when at least one of `demoUrl` or `githubUrl` is a real URL
  * Fix 5 — Key Learnings heading: colour changed from `var(--text-muted)` to `var(--accent-blue)` to match the left-border callout and distinguish from Technologies heading
  * Fix 6 — scrollbar layout shift: scroll lock now compensates `padding-right` with measured scrollbar width before setting `overflow: hidden`; both reset on close

## [1.10.2] - 2026-03-29

### Chore
* clear `demoUrl` for labs project entry in `projects.json`

## [1.10.1] - 2026-03-26

### Bugfix
* fix OG image build failure — satori requires `display: flex` on any element with more than one child; headline `<div>` had a text node + `<span>` with no display property; restructured to two `<span>` children inside a flex wrapper

## [1.10.0] - 2026-03-26

### Feature
* add `robots.ts` — generates `/robots.txt` allowing all crawlers and blocking `/api/`; links to sitemap
* add `sitemap.ts` — generates `/sitemap.xml` for Google and other search engine discovery
* add JSON-LD structured data to `layout.tsx` — WebSite, Person, and ItemList/SoftwareApplication schema for AI and search engine parsing
* add `manifest.ts` — generates `/manifest.json` for PWA signals and browser discoverability
* add `llms.txt/route.ts` — serves `/llms.txt` for AI crawlers (llmstxt.org standard); content sourced from `seo.json` and `projects.json`
* fix `seo.json` `twitterHandle` from `@dianaismail` to `@fkzl78`

## [1.9.1] - 2026-03-25

### Bugfix
* remove explicit `openGraph.images` and `twitter.images` from layout.tsx — `opengraph-image.tsx` file convention already injects `og:image` automatically; keeping both caused duplicate meta tags
* fix Twitter card type from `summary` to `summary_large_image` to display the 1200×630 image as a full-width preview on Twitter/X

## [1.9.0] - 2026-03-25

### Feature
* chat widget auto-focuses input on open and after each AI response completes
* use `flushSync` to guarantee DOM is committed before scroll measurement — fixes user message not pinning to top of chat on submit

### Chore
* update seo.json og:image to dynamic `/opengraph-image` route at 1200×630

## [1.8.1] - 2026-03-25

### Chore
* upgrade TypeScript ^5 → ^6 (eslint ^10 incompatible with eslint-config-next; lucide-react ^1 dropped Github brand icon — both held at current)
* fix lint errors surfaced by updated eslint-config-next: eslint-disable comments for valid setState-in-effect patterns; fix JSX comment text node in opengraph-image.tsx

## [1.8.0] - 2026-03-25

### Feature
* add subtitle to Hero: "Side projects that got out of hand. AI tools built for problems I kept tripping over — now live, now yours."

### Chore
* update shortDescription for all four projects in projects.json
* update SEO meta description in seo.json

## [1.7.0] - 2026-03-25

### Feature
* chat widget lifts above footer when scrolling near bottom of page — scroll/resize listener computes footer visibility and updates `bottom` offset dynamically (default 30px; rises to footerVisiblePx + 12px clearance)
* chat window on mobile (≤480px) now fills 75svh so it feels native and doesn't leave dead space

## [1.6.0] - 2026-03-25

### Feature
* update hero headline to "Labs by Diana — Experiments that ship."
* remove subtitle paragraph
* reduce hero vertical padding (py-12/md:py-20) to bring project cards higher up the page

## [1.5.5] - 2026-03-25

### Bugfix
* use absolute URL for `og:image` in `seo.json` — WhatsApp's crawler does not reliably resolve relative paths against `metadataBase`

## [1.5.4] - 2026-03-25

### Chore
* rewrite README.md to reflect chat engine, API routes, env vars, Telegram bot, and Docker setup
* update CLAUDE.md: remove stale "no backend/no API routes" claim; add chat engine architecture conventions, env var policy, Redis rules, and context file commit rule
* fix outdated inline comment in `engine.ts` (was "only streaming path implemented")

## [1.5.3] - 2026-03-25

### Chore
* move favicon and OG image files from `src/app/` to `public/` so they are served as static assets at the `/` path that `metadata` references

## [1.5.2] - 2026-03-25

### Bugfix
* add `suppressHydrationWarning` to the Framer Motion `motion.div` in `ProjectCard` to silence React hydration mismatch caused by Framer Motion injecting inline animation styles (`opacity: 0; transform: translateY(24px)`) on the client before hydration completes

## [1.5.1] - 2026-03-25

### Bugfix
* fix chat scroll-to-user: `scrollIntoView` silently no-ops inside a `position:fixed` widget; replace with explicit `container.scrollTo()` using `getBoundingClientRect` delta so the user message correctly lands at the top of the chat container

## [1.5.0] - 2026-03-25

### Feature
* replace mid-stream token display with silent SSE accumulation; loading dots hold for the full response duration
* reveal completed assistant response using a typewriter character-by-character animation (~1.3s target, preserving markdown formatting throughout)
* scroll last user message to top of chat viewport on submit; no auto-scroll during or after typewriter animation
* show "Thinking…" placeholder in input while response is in flight

## [1.4.0] - 2026-03-24

### Feature
* move "Return to portfolio" link into Navbar as "Labs by Diana | Portfolio" with theme-aware text colors (--text-primary dark/light)
* increase navbar font size from text-sm to text-base
* remove portfolio link from Footer; simplify to copyright only with theme-aware border
* set chat widget (toggle + window) bottom to 30px from viewport edge

## [1.3.7] - 2026-03-24

### Bugfix
* raise chat widget bottom from 120px to 160px to clear footer on mobile (stacked 2-row footer is ~120px tall); update max-height accordingly

## [1.3.6] - 2026-03-24

### Bugfix
* raise chat toggle bottom from 56px to 100px and window from 116px to 160px to clear the footer (py-10 ≈ 100px tall)

## [1.3.5] - 2026-03-24

### Bugfix
* align chat widget right edge to max-w-7xl content container using CSS max() so it tracks the page body width on wide viewports
* raise chat toggle bottom from 28px to 56px (mobile: 48px) and window bottom from 96px to 116px so the footer is not obscured when scrolled to bottom

## [1.3.4] - 2026-03-24

### Bugfix
* lower chat widget z-index from 60 to 45 so the project details drawer (z-50) renders on top of the chat toggle and chat window

## [1.3.3] - 2026-03-24

### Bugfix
* chat toggle button: expand to pill shape with "Talk to AI Diana" label alongside icon
* chat header: match project card title style (Merriweather text-xl font-bold tracking-tight)
* chat header: remove subheader "Ask me anything"

## [1.3.2] - 2026-03-24

### Chore
* add issues: write and pull-requests: write permissions to release workflow so semantic-release can comment on PRs/issues after publishing a GitHub Release

## [1.3.1] - 2026-03-24

### Bugfix
* chat widget mobile: stretch window to ≥80% viewport width on screens ≤480px via left/right anchoring
* chat widget WCAG AA: bump subheader from 11.2px (0.7rem) to 13px (0.8125rem); title to 17px (1.0625rem)
* chat widget legibility: increase chat window background opacity (0.96/0.97) and assistant bubble opacity for improved contrast over background orbs

## [1.3.0] - 2026-03-24

### Feature
* add floating AI Diana chat widget with SSE streaming, glassmorphic styling, dark/light mode, Telegram deep-link, and inline account linking

## [1.2.2] - 2026-03-24

### Bugfix
* fix drawer light mode: replace all hardcoded dark hex/rgba values with CSS custom properties and shared globals.css classes; add drawer-btn-primary and drawer-btn-secondary CSS classes for theme-aware action buttons

## [1.2.1] - 2026-03-24

### Bugfix
* render inline code chips for backtick-wrapped terms in keyLearnings; mark sessionStorage, SSR, [GENERATE_SCHEDULE], schedule_download, and VITE_* as code in project data

## [1.2.0] - 2026-03-24

### Feature
* add keyLearnings field to Project interface, populate all four projects, and render Key Learnings section in drawer before Technologies

### Chore
* update framer-motion to 12.38.0, tailwindcss/postcss to 4.2.2, @types/node to 25.5.0
* tighten engines.node to >=22.14.0 to match semantic-release v25 requirement

## [1.1.9] - 2026-03-22

### Chore
* wire semantic-release to update README.md version on every release

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
