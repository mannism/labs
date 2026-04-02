"use client";

import { useMemo, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Github } from "lucide-react";
import { Project } from "@/types/project";
import { trackEvent } from "@/lib/analytics";
import { useReducedMotion } from "./useReducedMotion";
import { useTextScramble } from "./useTextScramble";
import { renderWithCodeHighlights } from "./renderWithCodeHighlights";
import projectsData from "../../data/projects.json";

/**
 * ProjectDetailV2 — full content view replacing the drawer pattern for v2.
 * Layout: left metadata sidebar + right content area.
 * Left: version, date, stability status, tech stack tags.
 * Right: large uppercase title, module ID, full description,
 *   key learnings callout (chartreuse left border).
 * CTA buttons: chartreuse-filled "LAUNCH DEMO", outlined "VIEW SOURCE".
 * Motion: fade+slide on mount/unmount (respects prefers-reduced-motion).
 */
export function ProjectDetailV2({
  project,
  onBack,
}: {
  project: Project;
  onBack: () => void;
}) {
  const hasDemo = Boolean(project.demoUrl && project.demoUrl !== "#");
  const hasGithub = Boolean(project.githubUrl && project.githubUrl !== "#");
  const isInternalDemo = project.demoUrl?.includes("dianaismail.me");
  const prefersReduced = useReducedMotion();

  /** Ghost Type scramble on the project title — triggers on mount.
   *  sessionKey ensures each project title only scrambles once per session. */
  const titleScramble = useTextScramble(project.title, {
    delay: 150,
    sessionKey: `ghost-type-project-${project.slug}`,
  });

  const detailRef = useRef<HTMLDivElement>(null);

  /* Scroll to the back button / start of detail content on mount */
  useEffect(() => {
    if (detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: "instant", block: "start" });
    }
  }, [project.id]);

  /** Derive the display index from the sorted visible projects list */
  const moduleIndex = useMemo(() => {
    const visible = (projectsData as Project[])
      .filter((p) => p.display !== false)
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    const idx = visible.findIndex((p) => p.id === project.id);
    return String((idx >= 0 ? idx : 0) + 1).padStart(3, "0");
  }, [project.id]);

  return (
    <motion.div
      ref={detailRef}
      initial={prefersReduced ? undefined : { opacity: 0, y: 16 }}
      animate={prefersReduced ? undefined : { opacity: 1, y: 0 }}
      exit={prefersReduced ? undefined : { opacity: 0, y: -12 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Back navigation */}
      <button
        onClick={onBack}
        aria-label="Back to modules"
        style={{
          fontFamily: "var(--v2-font-mono)",
          fontSize: "var(--v2-font-size-xs)",
          color: "var(--v2-text-tertiary)",
          background: "none",
          border: "none",
          cursor: "pointer",
          letterSpacing: "var(--v2-letter-spacing-wide)",
          padding: "var(--v2-space-sm) 0",
          minHeight: "44px",
          display: "inline-flex",
          alignItems: "center",
          marginBottom: "var(--v2-space-2xl)",
          transition: "color 0.2s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--v2-text-primary)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--v2-text-tertiary)")}
      >
        &larr; BACK TO MODULES
      </button>

      {/* Category + status badges inline */}
      <div
        className="flex flex-wrap gap-2"
        style={{ marginBottom: "var(--v2-space-lg)" }}
      >
        <span
          style={{
            fontFamily: "var(--v2-font-mono)",
            fontSize: "var(--v2-font-size-xs)",
            color: "var(--v2-text-primary)",
            background: "var(--v2-accent-muted)",
            border: "1px solid var(--v2-accent)",
            borderRadius: "9999px",
            padding: "3px 12px",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {project.category}
        </span>
        <span
          style={{
            fontFamily: "var(--v2-font-mono)",
            fontSize: "var(--v2-font-size-xs)",
            color: "var(--v2-text-secondary)",
            border: "1px solid var(--v2-border)",
            borderRadius: "9999px",
            padding: "3px 12px",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {project.status}
        </span>
      </div>

      {/* Title — dramatically large, uppercase, Space Grotesk */}
      <h1
        style={{
          fontFamily: "var(--v2-font-display)",
          fontSize: "clamp(var(--v2-font-size-3xl), 4vw, var(--v2-font-size-4xl))",
          fontWeight: 700,
          color: "var(--v2-text-primary)",
          letterSpacing: "var(--v2-letter-spacing-tighter)",
          lineHeight: 1.05,
          margin: "0 0 var(--v2-space-xs) 0",
          textTransform: "uppercase",
        }}
      >
        {titleScramble.text}
      </h1>

      {/* Module ID below title */}
      <p
        style={{
          fontFamily: "var(--v2-font-mono)",
          fontSize: "var(--v2-font-size-xs)",
          color: "var(--v2-text-tertiary)",
          letterSpacing: "var(--v2-letter-spacing-wide)",
          margin: "0 0 var(--v2-space-3xl) 0",
          textTransform: "uppercase",
        }}
      >
        MODULE_{moduleIndex}
      </p>

      {/* Two-column layout: metadata sidebar + content */}
      <div
        className="flex flex-col md:flex-row gap-12"
        style={{ alignItems: "flex-start" }}
      >
        {/* Left sidebar — metadata */}
        <aside
          style={{
            width: "100%",
            maxWidth: "220px",
            flexShrink: 0,
          }}
          className="hidden md:block"
        >
          {/* Version */}
          {project.version && (
            <MetaBlock label="VERSION" value={`v${project.version}`} />
          )}

          {/* Last updated */}
          {project.lastUpdated && (
            <MetaBlock
              label="DEPLOYED"
              value={(() => {
                const d = new Date(project.lastUpdated);
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, "0");
                const dd = String(d.getDate()).padStart(2, "0");
                return `${yyyy}.${mm}.${dd}`;
              })()}
            />
          )}

          {/* Status */}
          <MetaBlock label="STABILITY" value={project.status.toUpperCase()} />

          {/* Tech stack — outlined pill tags */}
          <div style={{ marginBottom: "var(--v2-space-xl)" }}>
            <p
              style={{
                fontFamily: "var(--v2-font-mono)",
                fontSize: "var(--v2-font-size-xs)",
                color: "var(--v2-text-tertiary)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                margin: "0 0 var(--v2-space-sm) 0",
              }}
            >
              ARCHITECTURE_STACK
            </p>
            <div className="flex flex-wrap gap-1.5">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontFamily: "var(--v2-font-mono)",
                    fontSize: "var(--v2-font-size-xs)",
                    color: "var(--v2-tag-color)",
                    border: "1px solid var(--v2-tag-border)",
                    background: "var(--v2-tag-bg)",
                    borderRadius: "4px",
                    padding: "3px 10px",
                    display: "inline-block",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </aside>

        {/* Right content area */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Section label */}
          <p
            style={{
              fontFamily: "var(--v2-font-mono)",
              fontSize: "var(--v2-font-size-xs)",
              color: "var(--v2-text-tertiary)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              margin: "0 0 var(--v2-space-md) 0",
              borderBottom: "1px solid var(--v2-border)",
              paddingBottom: "var(--v2-space-sm)",
            }}
          >
            TECHNICAL_OVERVIEW
          </p>

          {/* Mobile-only metadata (shown inline on small screens) */}
          <div
            className="flex flex-wrap gap-3 md:hidden"
            style={{
              marginBottom: "var(--v2-space-lg)",
              fontFamily: "var(--v2-font-mono)",
              fontSize: "var(--v2-font-size-xs)",
              color: "var(--v2-text-tertiary)",
            }}
          >
            {project.version && <span>v{project.version}</span>}
            <span>{project.status}</span>
            <span>{project.category}</span>
          </div>

          {/* Full description */}
          <p
            style={{
              fontFamily: "var(--v2-font-body)",
              fontSize: "var(--v2-font-size-base)",
              color: "var(--v2-text-secondary)",
              lineHeight: 1.75,
              margin: "0 0 var(--v2-space-2xl) 0",
            }}
          >
            {renderWithCodeHighlights(project.detailedDescription)}
          </p>

          {/* Key learnings callout — bordered card with chartreuse left accent */}
          {project.keyLearnings && (
            <div
              style={{
                borderLeft: "3px solid var(--v2-accent)",
                background: "var(--v2-tag-bg)",
                borderRadius: "0 0.5rem 0.5rem 0",
                padding: "var(--v2-space-xl)",
                marginBottom: "var(--v2-space-2xl)",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--v2-font-mono)",
                  fontSize: "var(--v2-font-size-xs)",
                  color: "var(--v2-text-tertiary)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  margin: "0 0 var(--v2-space-sm) 0",
                }}
              >
                KEY_LEARNINGS
              </p>
              <p
                style={{
                  fontFamily: "var(--v2-font-body)",
                  fontSize: "var(--v2-font-size-sm)",
                  color: "var(--v2-text-secondary)",
                  lineHeight: 1.7,
                  margin: 0,
                }}
              >
                {renderWithCodeHighlights(project.keyLearnings!)}
              </p>
            </div>
          )}

          {/* Mobile-only tech tags */}
          <div
            className="flex flex-wrap gap-1.5 md:hidden"
            style={{ marginBottom: "var(--v2-space-xl)" }}
          >
            {project.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontFamily: "var(--v2-font-mono)",
                  fontSize: "var(--v2-font-size-xs)",
                  color: "var(--v2-tag-color)",
                  border: "1px solid var(--v2-tag-border)",
                  background: "var(--v2-tag-bg)",
                  borderRadius: "4px",
                  padding: "3px 10px",
                  textTransform: "uppercase",
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Action buttons — chartreuse primary, outlined secondary */}
          {(hasDemo || hasGithub) && (
            <div className="flex gap-3 flex-wrap">
              {hasDemo && (
                <a
                  href={project.demoUrl}
                  target={isInternalDemo ? "_self" : "_blank"}
                  rel={isInternalDemo ? undefined : "noopener noreferrer"}
                  onClick={() =>
                    trackEvent("demo_launch", {
                      project_title: project.title,
                      demo_url: project.demoUrl,
                    })
                  }
                  style={{
                    fontFamily: "var(--v2-font-mono)",
                    fontSize: "var(--v2-font-size-xs)",
                    color: "var(--v2-text-primary)",
                    background: "var(--v2-accent)",
                    border: "none",
                    borderRadius: "0.25rem",
                    padding: "var(--v2-space-sm) var(--v2-space-lg)",
                    minHeight: "44px",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "var(--v2-space-xs)",
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    transition: "opacity 0.2s ease, transform 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "0.88";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "1";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  LAUNCH DEMO <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              )}
              {hasGithub && (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: "var(--v2-font-mono)",
                    fontSize: "var(--v2-font-size-xs)",
                    color: "var(--v2-text-primary)",
                    background: "none",
                    border: "1px solid var(--v2-border)",
                    borderRadius: "0.25rem",
                    padding: "var(--v2-space-sm) var(--v2-space-lg)",
                    minHeight: "44px",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "var(--v2-space-xs)",
                    fontWeight: 500,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    transition: "border-color 0.2s ease, transform 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--v2-text-primary)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--v2-border)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <Github className="w-3.5 h-3.5" /> VIEW SOURCE
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom spacing to separate CTAs from footer */}
      <div style={{ height: "var(--v2-space-3xl)" }} />
    </motion.div>
  );
}

/**
 * MetaBlock — renders a label/value pair in the metadata sidebar.
 * Label: tiny uppercase monospace. Value: slightly larger monospace.
 */
function MetaBlock({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: "var(--v2-space-lg)" }}>
      <p
        style={{
          fontFamily: "var(--v2-font-mono)",
          fontSize: "var(--v2-font-size-xs)",
          color: "var(--v2-text-tertiary)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          margin: "0 0 var(--v2-space-xs) 0",
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: "var(--v2-font-mono)",
          fontSize: "var(--v2-font-size-sm)",
          color: "var(--v2-text-primary)",
          margin: 0,
          fontWeight: 500,
        }}
      >
        {value}
      </p>
    </div>
  );
}
