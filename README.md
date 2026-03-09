# Diana Ismail Labs — Cyber-Minimalist Showcase

A premium Next.js 15 application meticulously showcasing Proof of Concepts (POCs) and experiments in Agentic-AI, Immersive Experiences, and Experimental Tech.

## ✨ Aesthetic: "Cyber-Minimalist"

The Labs UI has been specifically engineered to embody a "Cyber-Minimalist" design system. This system is deeply influenced by high-end, agentic digital interfaces:

- **Atmospheric Depth:** A deep charcoal background (`#0A0C10`) overlaid with a subtle 48x48px CSS grid pattern and large, heavily blurred ambient orbs (electric blue and purple), giving the interface physical depth.
- **Glassmorphism:** High-end, translucent component cards with sharp 16px backdrop blurs. Hover interaction states trigger an electric-blue radiant glow (`#0069FF`).
- **Tactile Typography:** A sophisticated dual-font system. **Merriweather** (serif) handles large display headings with tight tracking for impact, while **Open Sans** (sans-serif) is scaled precisely (16px base, 1.625 leading) for extended readability and accessibility.
- **Micro-Interactions:** Fluid, CSS-driven transitions (avoiding heavy JS re-renders) structure the filter tabs and interactive links, providing instant, tactile feedback to the user.

## 🛠 Features & Tech Stack

- **Framework:** Next.js 15 (App Router, Standalone Output for optimized Dockerization)
- **Styling:** Tailwind CSS v4 + Vanilla CSS Design Tokens (for precision glass/glow effects)
- **Animations:** Framer Motion (for smooth 60fps entry and hover transitions)
- **Security & Privacy:**
  - **Zero External HTTP Requests:** Google Fonts (Open Sans, Merriweather, Geist Mono) are self-hosted via `next/font/google`. This eliminates all mixed-content HTTP risks and CDN tracking.
  - **Enterprise Security Headers:** Fully hardened `next.config.ts` enforcing strict HSTS (2-year preload), X-Frame-Options (Clickjacking defense), and restrictive Permissions-Policies.
- **Data Architecture:** A fully data-driven, client-side filterable grid, populated by a centralized, tightly-typed JSON manifest.

## 🚀 Getting Started

1. **Clone the repository**
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Start the development server:**
   ```bash
   npm run dev
   ```

## 📂 Managing Projects

To seamlessly add, edit, or remove projects, simply modify the `src/data/projects.json` file. The grid architecture and category taxonomy filters will update and re-render automatically.

### Project Schema:
```json
{
  "id": "unique-id",
  "title": "Project Title",
  "description": "Short description of the project, optimized for 16px reading.",
  "category": "e.g., Agentic-AI | Immersive | Creative",
  "status": "Active | Research | Archived",
  "display": true, // toggle visibility in the grid immediately
  "tags": ["Tag1", "Tag2"],
  "demoUrl": "https://...",
  "githubUrl": "https://..."
}
```

## 🐳 Docker Deployment

This project heavily leverages Next.js **standalone output** to generate minimal, production-grade Docker images.

### Build and Run with Docker Compose (Recommended):
```bash
docker compose up -d --build
```

### Manual Docker Build:
```bash
docker build -t labs-app .
docker run -p 3000:3000 labs-app
```
