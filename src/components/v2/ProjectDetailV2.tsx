"use client";

import { useMemo, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { GithubIcon } from "@/components/icons/GithubIcon";
import { Project } from "@/types/project";
import { trackEvent } from "@/lib/analytics";
import { useReducedMotion } from "./useReducedMotion";
import { useTextScramble } from "./useTextScramble";
import { renderWithCodeHighlights } from "./renderWithCodeHighlights";
import projectsData from "@/lib/projects";

/**
 * ProjectDetailV2 — full content view replacing the drawer pattern for v2.
 * Two layout modes driven by `project.type`:
 *   "project" (default): left metadata sidebar + right content area.
 *   "article": full-width long-form prose with titled sections.
 * Motion: fade+slide on mount/unmount (respects prefers-reduced-motion).
 */
export function ProjectDetailV2({
  project,
  onBack,
}: {
  project: Project;
  onBack: () => void;
}) {
  const isArticle = project.type === "article";
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

  /**
   * Stable numbering + article navigation context.
   * Articles sorted oldest-first by createdDate for consistent numbering and prev/next order.
   * Series total is derived by filtering peers by matching seriesTitle (not stored as a field).
   * Related projects are resolved from relatedSlugs against the full visible dataset.
   */
  const { moduleIndex, prevArticle, nextArticle, relatedProjects, seriesLabel } = useMemo(() => {
    const all = (projectsData as Project[]).filter((p) => p.display !== false);
    const isArticleType = project.type === "article";
    const peers = isArticleType
      ? all.filter((p) => p.type === "article").sort((a, b) => (a.createdDate ?? "").localeCompare(b.createdDate ?? ""))
      : all.filter((p) => p.type !== "article").sort((a, b) => parseInt(a.id) - parseInt(b.id));
    const idx = peers.findIndex((p) => p.id === project.id);
    const index = String((idx >= 0 ? idx : 0) + 1).padStart(3, "0");

    /* Prev/next: series-scoped when article belongs to a series, date-based for standalone */
    let prev: Project | undefined;
    let next: Project | undefined;
    if (isArticleType) {
      const navPeers = project.seriesTitle
        ? all
            .filter((p) => p.type === "article" && p.seriesTitle === project.seriesTitle)
            .sort((a, b) => (a.sequenceNumber ?? 0) - (b.sequenceNumber ?? 0))
        : all
            .filter((p) => p.type === "article" && !p.seriesTitle)
            .sort((a, b) => (a.createdDate ?? "").localeCompare(b.createdDate ?? ""));
      const navIdx = navPeers.findIndex((p) => p.id === project.id);
      prev = navIdx > 0 ? navPeers[navIdx - 1] : undefined;
      next = navIdx < navPeers.length - 1 ? navPeers[navIdx + 1] : undefined;
    }

    /* Series label: derived total from matching seriesTitle across all visible articles */
    let label: string | undefined;
    if (isArticleType && project.seriesTitle && project.sequenceNumber !== undefined) {
      const seriesMembers = all.filter(
        (p) => p.type === "article" && p.seriesTitle === project.seriesTitle
      );
      const total = seriesMembers.length;
      const slug = project.seriesTitle.toUpperCase().replace(/\s+/g, "_");
      label = `${slug} // ${project.sequenceNumber}_OF_${total}`;
    }

    /* Resolve relatedSlugs to full project objects */
    const related = (project.relatedSlugs ?? [])
      .map((s) => all.find((p) => p.slug === s))
      .filter((p): p is Project => p !== undefined);

    return {
      moduleIndex: index,
      prevArticle: prev,
      nextArticle: next,
      relatedProjects: related,
      seriesLabel: label,
    };
  }, [project.id, project.type, project.seriesTitle, project.sequenceNumber, project.relatedSlugs]);

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
        {isArticle ? "ARTICLE" : "MODULE"}_{moduleIndex}
      </p>

      {isArticle ? (
        <ArticleLayout
          project={project}
          seriesLabel={seriesLabel}
          prevArticle={prevArticle}
          nextArticle={nextArticle}
          relatedProjects={relatedProjects}
        />
      ) : (
        <ProjectLayout
          project={project}
          hasDemo={hasDemo}
          hasGithub={hasGithub}
          isInternalDemo={isInternalDemo}
        />
      )}

      {/* Bottom spacing to separate CTAs from footer */}
      <div style={{ height: "var(--v2-space-3xl)" }} />
    </motion.div>
  );
}

/**
 * ArticleLayout — two-column editorial layout for article-type entries.
 * Left: series label + article metadata + lead paragraph + titled prose sections + topic tags.
 * Right: sticky key takeaways sidebar (collapses below content on mobile).
 * Footer: prev/next article navigation, then related content.
 */
function ArticleLayout({
  project,
  seriesLabel,
  prevArticle,
  nextArticle,
  relatedProjects,
}: {
  project: Project;
  seriesLabel?: string;
  prevArticle?: Project;
  nextArticle?: Project;
  relatedProjects: Project[];
}) {
  const sections = project.articleSections ?? [];
  const learnings = project.keyLearnings
    ? Array.isArray(project.keyLearnings)
      ? project.keyLearnings
      : [project.keyLearnings]
    : [];

  /* Derive reading time from wordCount at ~200 wpm, rounded up to nearest minute */
  const readingTime = project.wordCount
    ? Math.max(1, Math.ceil(project.wordCount / 200))
    : undefined;

  /* Format published date as YYYY.MM.DD */
  const publishedDate = (() => {
    if (!project.createdDate) return undefined;
    const d = new Date(project.createdDate);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}.${mm}.${dd}`;
  })();

  return (
    <>
      {/* Two-column layout: article content left, takeaways sidebar right */}
      <div
        className="flex flex-col md:flex-row gap-12"
        style={{ alignItems: "flex-start" }}
      >
        {/* Left — article content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Series label — shown above article body when part of a named arc */}
          {seriesLabel && (
            <p
              style={{
                fontFamily: "var(--v2-font-mono)",
                fontSize: "var(--v2-font-size-xs)",
                color: "var(--article-series-color)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                margin: "0 0 var(--v2-space-lg) 0",
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
            >
              {seriesLabel}
            </p>
          )}

          {/* Article metadata: PUBLISHED date + reading time */}
          {(publishedDate || readingTime) && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "var(--v2-space-lg)",
                marginBottom: "var(--v2-space-2xl)",
              }}
            >
              {publishedDate && (
                <MetaBlock label="PUBLISHED" value={publishedDate} />
              )}
              {readingTime && (
                <MetaBlock label="READ" value={`~${readingTime} MIN`} />
              )}
            </div>
          )}

          {/* Lead paragraphs — detailedDescription split on double newline */}
          {project.detailedDescription.split("\n\n").map((para, i) => (
            <p
              key={i}
              style={{
                fontFamily: "var(--v2-font-body)",
                fontSize: "var(--v2-font-size-base)",
                color: "var(--v2-text-secondary)",
                lineHeight: 1.85,
                margin: "0 0 var(--v2-space-3xl) 0",
              }}
            >
              {renderWithCodeHighlights(para)}
            </p>
          ))}

          {/* Article sections — each with an uppercase monospace title */}
          {sections.map((section, i) => (
            <div key={i} style={{ marginBottom: "var(--v2-space-3xl)" }}>
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
                {section.title.replace(/ /g, "_")}
              </p>
              {section.body.split("\n\n").map((para, pi) => (
                <p
                  key={pi}
                  style={{
                    fontFamily: "var(--v2-font-body)",
                    fontSize: "var(--v2-font-size-base)",
                    color: "var(--v2-text-secondary)",
                    lineHeight: 1.85,
                    margin: pi === 0 ? 0 : "var(--v2-space-lg) 0 0 0",
                  }}
                >
                  {renderWithCodeHighlights(para)}
                </p>
              ))}
            </div>
          ))}

          {/* Topic tags */}
          <div
            className="flex flex-wrap gap-1.5"
            style={{ marginBottom: "var(--v2-space-2xl)" }}
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
                  letterSpacing: "0.04em",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Right sidebar — sticky key takeaways (hidden on mobile, shown below content instead) */}
        {learnings.length > 0 && (
          <>
            {/* Desktop: sticky sidebar */}
            <aside
              className="hidden md:block"
              style={{
                width: "100%",
                maxWidth: "300px",
                flexShrink: 0,
                position: "sticky",
                top: "var(--v2-space-2xl)",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--v2-font-mono)",
                  fontSize: "var(--v2-font-size-xs)",
                  color: "var(--v2-text-tertiary)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  margin: "0 0 var(--v2-space-lg) 0",
                  borderBottom: "1px solid var(--v2-border)",
                  paddingBottom: "var(--v2-space-sm)",
                }}
              >
                KEY_TAKEAWAYS
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--v2-space-md)" }}>
                {learnings.map((learning, i) => (
                  <div
                    key={i}
                    style={{
                      borderLeft: "3px solid var(--v2-accent)",
                      background: "var(--v2-tag-bg)",
                      borderRadius: "0 0.5rem 0.5rem 0",
                      padding: "var(--v2-space-lg)",
                    }}
                  >
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
                      TAKEAWAY_{String(i + 1).padStart(2, "0")}
                    </p>
                    <p
                      style={{
                        fontFamily: "var(--v2-font-body)",
                        fontSize: "var(--v2-font-size-xs)",
                        color: "var(--v2-text-secondary)",
                        lineHeight: 1.65,
                        margin: 0,
                        fontStyle: "italic",
                      }}
                    >
                      {renderWithCodeHighlights(learning)}
                    </p>
                  </div>
                ))}
              </div>
            </aside>

            {/* Mobile: key takeaways below content */}
            <div className="md:hidden" style={{ marginBottom: "var(--v2-space-2xl)" }}>
              <p
                style={{
                  fontFamily: "var(--v2-font-mono)",
                  fontSize: "var(--v2-font-size-xs)",
                  color: "var(--v2-text-tertiary)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  margin: "0 0 var(--v2-space-lg) 0",
                  borderBottom: "1px solid var(--v2-border)",
                  paddingBottom: "var(--v2-space-sm)",
                }}
              >
                KEY_TAKEAWAYS
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--v2-space-md)" }}>
                {learnings.map((learning, i) => (
                  <div
                    key={i}
                    style={{
                      borderLeft: "3px solid var(--v2-accent)",
                      background: "var(--v2-tag-bg)",
                      borderRadius: "0 0.5rem 0.5rem 0",
                      padding: "var(--v2-space-xl)",
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
                      TAKEAWAY_{String(i + 1).padStart(2, "0")}
                    </p>
                    <p
                      style={{
                        fontFamily: "var(--v2-font-body)",
                        fontSize: "var(--v2-font-size-sm)",
                        color: "var(--v2-text-secondary)",
                        lineHeight: 1.7,
                        margin: 0,
                        fontStyle: "italic",
                      }}
                    >
                      {renderWithCodeHighlights(learning)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Prev/Next navigation — footer nav below article content */}
      {(prevArticle || nextArticle) && (
        <nav
          aria-label="Article navigation"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "var(--v2-space-md)",
            marginTop: "var(--v2-space-3xl)",
            borderTop: "1px solid var(--article-nav-border)",
            paddingTop: "var(--v2-space-2xl)",
          }}
        >
          {prevArticle && (
            <ArticleNavCard direction="PREV" article={prevArticle} />
          )}
          {nextArticle && (
            <ArticleNavCard
              direction="NEXT"
              article={nextArticle}
              alignRight={!prevArticle}
            />
          )}
        </nav>
      )}

      {/* Related content — shown only when relatedSlugs resolves to actual entries */}
      {relatedProjects.length > 0 && (
        <section
          aria-label="Related articles"
          style={{ marginTop: "var(--v2-space-2xl)" }}
        >
          <p
            style={{
              fontFamily: "var(--v2-font-mono)",
              fontSize: "var(--v2-font-size-xs)",
              color: "var(--v2-text-tertiary)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              margin: "0 0 var(--v2-space-lg) 0",
              borderBottom: "1px solid var(--v2-border)",
              paddingBottom: "var(--v2-space-sm)",
            }}
          >
            RELATED
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: "var(--v2-space-md)",
            }}
          >
            {relatedProjects.map((related) => (
              <a
                key={related.slug}
                href={`/module/${related.slug}`}
                style={{
                  display: "block",
                  background: "var(--article-nav-bg)",
                  border: "1px solid var(--article-nav-border)",
                  borderRadius: "0.5rem",
                  padding: "var(--v2-space-lg)",
                  textDecoration: "none",
                  transition: "border-color 0.2s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--v2-border-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--article-nav-border)")}
              >
                <p
                  style={{
                    fontFamily: "var(--v2-font-mono)",
                    fontSize: "var(--v2-font-size-xs)",
                    color: "var(--v2-text-tertiary)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    margin: "0 0 var(--v2-space-xs) 0",
                  }}
                >
                  {related.type === "article" ? "ARTICLE" : "MODULE"}
                </p>
                <p
                  style={{
                    fontFamily: "var(--v2-font-display)",
                    fontSize: "var(--v2-font-size-sm)",
                    fontWeight: 700,
                    color: "var(--v2-text-primary)",
                    letterSpacing: "var(--v2-letter-spacing-tight)",
                    textTransform: "uppercase",
                    margin: "0 0 var(--v2-space-xs) 0",
                    lineHeight: 1.2,
                  }}
                >
                  {related.title}
                </p>
                <p
                  style={{
                    fontFamily: "var(--v2-font-body)",
                    fontSize: "var(--v2-font-size-xs)",
                    color: "var(--v2-text-secondary)",
                    margin: 0,
                    lineHeight: 1.5,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {related.shortDescription}
                </p>
              </a>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

/**
 * ProjectLayout — two-column layout with metadata sidebar + content area.
 * Standard layout for project-type entries.
 */
function ProjectLayout({
  project,
  hasDemo,
  hasGithub,
  isInternalDemo,
}: {
  project: Project;
  hasDemo: boolean;
  hasGithub: boolean;
  isInternalDemo: boolean | undefined;
}) {
  return (
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
        {project.version && (
          <MetaBlock label="VERSION" value={`v${project.version}`} />
        )}
        {/*
         * Date blocks — project detail shows both dates, clearly labelled,
         * so visitors can see when the project launched and how recently it was maintained.
         * Article detail shows only the published date (lastUpdated is not a meaningful
         * signal for editorial content).
         */}
        {project.type === "article" ? (
          /* Article: published date only */
          (() => {
            if (!project.createdDate) return null;
            const d = new Date(project.createdDate);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            return <MetaBlock label="PUBLISHED" value={`${yyyy}.${mm}.${dd}`} />;
          })()
        ) : (
          /* Project: created date + last-updated date, both labelled */
          <>
            {project.createdDate && (() => {
              const d = new Date(project.createdDate);
              const yyyy = d.getFullYear();
              const mm = String(d.getMonth() + 1).padStart(2, "0");
              const dd = String(d.getDate()).padStart(2, "0");
              return <MetaBlock label="CREATED" value={`${yyyy}.${mm}.${dd}`} />;
            })()}
            {project.lastUpdated && (() => {
              const d = new Date(project.lastUpdated);
              const yyyy = d.getFullYear();
              const mm = String(d.getMonth() + 1).padStart(2, "0");
              const dd = String(d.getDate()).padStart(2, "0");
              return <MetaBlock label="LAST_UPDATED" value={`${yyyy}.${mm}.${dd}`} />;
            })()}
          </>
        )}
        <MetaBlock label="STABILITY" value={project.status.toUpperCase()} />
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

        {project.detailedDescription.split("\n\n").map((para, i) => (
          <p
            key={i}
            style={{
              fontFamily: "var(--v2-font-body)",
              fontSize: "var(--v2-font-size-base)",
              color: "var(--v2-text-secondary)",
              lineHeight: 1.75,
              margin: "0 0 var(--v2-space-2xl) 0",
            }}
          >
            {renderWithCodeHighlights(para)}
          </p>
        ))}

        {project.keyLearnings && (
          <div style={{ marginBottom: "var(--v2-space-2xl)" }}>
            <p
              style={{
                fontFamily: "var(--v2-font-mono)",
                fontSize: "var(--v2-font-size-xs)",
                color: "var(--v2-text-tertiary)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                margin: "0 0 var(--v2-space-lg) 0",
                borderBottom: "1px solid var(--v2-border)",
                paddingBottom: "var(--v2-space-sm)",
              }}
            >
              PROJECT_LEARNINGS_LOG
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--v2-space-md)" }}>
              {(Array.isArray(project.keyLearnings)
                ? project.keyLearnings
                : [project.keyLearnings]
              ).map((learning, i) => (
                <div
                  key={i}
                  style={{
                    borderLeft: "3px solid var(--v2-accent)",
                    background: "var(--v2-tag-bg)",
                    borderRadius: "0 0.5rem 0.5rem 0",
                    padding: "var(--v2-space-xl)",
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
                    KEY_LEARNING_{String(i + 1).padStart(2, "0")}
                  </p>
                  <p
                    style={{
                      fontFamily: "var(--v2-font-body)",
                      fontSize: "var(--v2-font-size-sm)",
                      color: "var(--v2-text-secondary)",
                      lineHeight: 1.7,
                      margin: 0,
                      fontStyle: "italic",
                    }}
                  >
                    {renderWithCodeHighlights(learning)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

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
                <GithubIcon className="w-3.5 h-3.5" /> VIEW SOURCE
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ArticleNavCard — prev/next navigation card for article footer.
 * Shows directional label, article title, and truncated description.
 * alignRight shifts text-align when only a "next" card exists on its own.
 */
function ArticleNavCard({
  direction,
  article,
  alignRight = false,
}: {
  direction: "PREV" | "NEXT";
  article: Project;
  alignRight?: boolean;
}) {
  return (
    <a
      href={`/module/${article.slug}`}
      style={{
        display: "block",
        background: "var(--article-nav-bg)",
        border: "1px solid var(--article-nav-border)",
        borderRadius: "0.5rem",
        padding: "var(--v2-space-lg)",
        textDecoration: "none",
        textAlign: alignRight ? "right" : "left",
        transition: "border-color 0.2s ease",
        gridColumn: alignRight ? "2 / 3" : undefined,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--v2-border-hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--article-nav-border)")}
    >
      <p
        style={{
          fontFamily: "var(--v2-font-mono)",
          fontSize: "var(--v2-font-size-xs)",
          color: "var(--v2-text-tertiary)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          margin: "0 0 var(--v2-space-xs) 0",
        }}
      >
        {direction === "PREV" ? "\u2190 PREV_ARTICLE" : "NEXT_ARTICLE \u2192"}
      </p>
      <p
        style={{
          fontFamily: "var(--v2-font-display)",
          fontSize: "var(--v2-font-size-sm)",
          fontWeight: 700,
          color: "var(--v2-text-primary)",
          letterSpacing: "var(--v2-letter-spacing-tight)",
          textTransform: "uppercase",
          margin: "0 0 var(--v2-space-xs) 0",
          lineHeight: 1.2,
        }}
      >
        {article.title}
      </p>
      <p
        style={{
          fontFamily: "var(--v2-font-body)",
          fontSize: "var(--v2-font-size-xs)",
          color: "var(--v2-text-secondary)",
          margin: 0,
          lineHeight: 1.5,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {article.shortDescription}
      </p>
    </a>
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
