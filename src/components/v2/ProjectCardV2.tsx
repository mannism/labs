"use client";

import { Project } from "../ProjectCard";

/**
 * ProjectCardV2 — Speculative Interface project card.
 * Displays a module number (MODULE_001), title in Space Grotesk,
 * truncated description, status dot (chartreuse=active, grey=other),
 * tech tags as minimal bordered pills, and version/date metadata.
 * Hover: subtle lift + chartreuse left accent border.
 */
export function ProjectCardV2({
  project,
  index,
  onClick,
}: {
  project: Project;
  index: number;
  onClick?: () => void;
}) {
  /** Zero-padded module number, e.g. MODULE_001 */
  const moduleNumber = String(index + 1).padStart(3, "0");
  const isActive = project.status.toLowerCase() === "active";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      style={{
        background: "var(--v2-bg-surface)",
        border: "1px solid var(--v2-border)",
        borderRadius: "0.5rem",
        padding: "var(--v2-space-lg)",
        cursor: "pointer",
        transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
        position: "relative",
      }}
      /* Hover styles applied via CSS-in-JS events for clean inline approach */
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.transform = "translateY(-2px)";
        el.style.boxShadow = "var(--v2-shadow-hover)";
        el.style.borderLeftColor = "var(--v2-accent)";
        el.style.borderLeftWidth = "3px";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.transform = "translateY(0)";
        el.style.boxShadow = "none";
        el.style.borderLeftColor = "var(--v2-border)";
        el.style.borderLeftWidth = "1px";
      }}
    >
      {/* Module number + status dot */}
      <div className="flex items-center justify-between" style={{ marginBottom: "var(--v2-space-sm)" }}>
        <span
          style={{
            fontFamily: "var(--v2-font-mono)",
            fontSize: "var(--v2-font-size-xs)",
            color: "var(--v2-text-tertiary)",
            letterSpacing: "var(--v2-letter-spacing-wide)",
          }}
        >
          MODULE_{moduleNumber}
        </span>
        {/* Status dot: chartreuse for active, grey for others */}
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: isActive ? "var(--v2-accent)" : "var(--v2-text-tertiary)",
            display: "inline-block",
            flexShrink: 0,
          }}
          title={project.status}
        />
      </div>

      {/* Title — Space Grotesk */}
      <h3
        style={{
          fontFamily: "var(--v2-font-display)",
          fontSize: "var(--v2-font-size-lg)",
          fontWeight: 600,
          color: "var(--v2-text-primary)",
          margin: "0 0 var(--v2-space-sm) 0",
          letterSpacing: "var(--v2-letter-spacing-tight)",
        }}
      >
        {project.title}
      </h3>

      {/* Description — truncated to ~2 lines via line-clamp */}
      <p
        style={{
          fontFamily: "var(--v2-font-body)",
          fontSize: "var(--v2-font-size-sm)",
          color: "var(--v2-text-secondary)",
          lineHeight: 1.6,
          margin: "0 0 var(--v2-space-md) 0",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {project.shortDescription}
      </p>

      {/* Tech tags — minimal bordered pills */}
      <div className="flex flex-wrap gap-1.5" style={{ marginBottom: "var(--v2-space-md)" }}>
        {project.tags.slice(0, 4).map((tag) => (
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
        {project.tags.length > 4 && (
          <span
            style={{
              fontFamily: "var(--v2-font-mono)",
              fontSize: "var(--v2-font-size-xs)",
              color: "var(--v2-text-tertiary)",
            }}
          >
            +{project.tags.length - 4}
          </span>
        )}
      </div>

      {/* Version + date metadata line */}
      <div
        style={{
          fontFamily: "var(--v2-font-mono)",
          fontSize: "var(--v2-font-size-xs)",
          color: "var(--v2-text-tertiary)",
        }}
      >
        {[
          project.version && `v${project.version}`,
          project.lastUpdated &&
            new Date(project.lastUpdated).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
        ]
          .filter(Boolean)
          .join(" // ")}
      </div>
    </div>
  );
}
