"use client";

import { ArrowUpRight, Github } from "lucide-react";
import { Project } from "../ProjectCard";
import { trackEvent } from "@/lib/analytics";

/**
 * ProjectDetailV2 — full content view replacing the drawer pattern for v2.
 * Layout: left metadata sidebar + right content area.
 * Left: version, date, stability status, tech stack.
 * Right: title, full description, key learnings callout (chartreuse left border).
 * Action buttons (Demo, GitHub) shown only when URLs exist.
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

  return (
    <div>
      {/* Back navigation */}
      <button
        onClick={onBack}
        style={{
          fontFamily: "var(--v2-font-mono)",
          fontSize: "var(--v2-font-size-xs)",
          color: "var(--v2-text-tertiary)",
          background: "none",
          border: "none",
          cursor: "pointer",
          letterSpacing: "var(--v2-letter-spacing-wide)",
          padding: 0,
          marginBottom: "var(--v2-space-2xl)",
          transition: "color 0.2s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--v2-text-primary)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--v2-text-tertiary)")}
      >
        &larr; BACK TO MODULES
      </button>

      {/* Two-column layout: metadata sidebar + content */}
      <div
        className="flex flex-col md:flex-row gap-8"
        style={{ alignItems: "flex-start" }}
      >
        {/* Left sidebar — metadata */}
        <aside
          style={{
            width: "100%",
            maxWidth: "240px",
            flexShrink: 0,
            borderRight: "1px solid var(--v2-border)",
            paddingRight: "var(--v2-space-xl)",
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
              value={new Date(project.lastUpdated).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            />
          )}

          {/* Status */}
          <MetaBlock label="STATUS" value={project.status} />

          {/* Category */}
          <MetaBlock label="CATEGORY" value={project.category} />

          {/* Tech stack */}
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
              TECH STACK
            </p>
            <div className="flex flex-wrap gap-1.5">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontFamily: "var(--v2-font-mono)",
                    fontSize: "var(--v2-font-size-xs)",
                    color: "var(--v2-text-secondary)",
                    border: "1px solid var(--v2-border)",
                    borderRadius: "9999px",
                    padding: "2px 8px",
                    display: "inline-block",
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
          {/* Title */}
          <h1
            style={{
              fontFamily: "var(--v2-font-display)",
              fontSize: "var(--v2-font-size-2xl)",
              fontWeight: 700,
              color: "var(--v2-text-primary)",
              letterSpacing: "var(--v2-letter-spacing-tight)",
              margin: "0 0 var(--v2-space-lg) 0",
            }}
          >
            {project.title}
          </h1>

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
              lineHeight: 1.7,
              margin: "0 0 var(--v2-space-2xl) 0",
            }}
          >
            {project.detailedDescription}
          </p>

          {/* Key learnings callout — chartreuse left border */}
          {project.keyLearnings && (
            <div
              style={{
                borderLeft: "3px solid var(--v2-accent)",
                paddingLeft: "var(--v2-space-lg)",
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
                KEY LEARNINGS
              </p>
              <p
                style={{
                  fontFamily: "var(--v2-font-body)",
                  fontSize: "var(--v2-font-size-sm)",
                  color: "var(--v2-text-secondary)",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {project.keyLearnings}
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
                  color: "var(--v2-text-tertiary)",
                  border: "1px solid var(--v2-border)",
                  borderRadius: "9999px",
                  padding: "2px 8px",
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Action buttons — only shown when URLs exist */}
          {(hasDemo || hasGithub) && (
            <div className="flex gap-3">
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
                    border: "1px solid var(--v2-border)",
                    borderRadius: "0.25rem",
                    padding: "var(--v2-space-sm) var(--v2-space-md)",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "var(--v2-space-xs)",
                    transition: "border-color 0.2s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--v2-accent)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--v2-border)")}
                >
                  Launch Demo <ArrowUpRight className="w-3.5 h-3.5" />
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
                    border: "1px solid var(--v2-border)",
                    borderRadius: "0.25rem",
                    padding: "var(--v2-space-sm) var(--v2-space-md)",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "var(--v2-space-xs)",
                    transition: "border-color 0.2s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--v2-accent)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--v2-border)")}
                >
                  <Github className="w-3.5 h-3.5" /> Source
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * MetaBlock — renders a label/value pair in the metadata sidebar.
 * Reusable within ProjectDetailV2 to reduce repetition.
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
        }}
      >
        {value}
      </p>
    </div>
  );
}
