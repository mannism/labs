/** Schema for a single project entry in src/data/projects.json. */
export interface Project {
  id: string;
  /** URL-safe slug used for dynamic routing, e.g. "geo-audit". */
  slug: string;
  /** Controls display order in the grid — lower numbers appear first. */
  order?: number;
  title: string;
  shortDescription: string;
  detailedDescription: string;
  category: string;
  status: string;
  /** Set to false to hide from the grid without deleting the entry. */
  display: boolean;
  tags: string[];
  demoUrl: string;
  githubUrl: string;
  /** Up to 3 key insights or engineering decisions highlighted in the detail view. */
  keyLearnings?: string | string[];
  /** Semver string sourced from the latest GitHub release/tag, e.g. "2.2.5". */
  version?: string;
  /** ISO date string of the last push to the GitHub repo, e.g. "2026-03-25". */
  lastUpdated?: string;
  /** When true, spans 2 columns in the v2 bento grid for emphasis. */
  highlight?: boolean;
  /** Entry type — "project" (default) renders as module detail, "article" renders as long-form article. */
  type?: "project" | "article";
  /** Structured sections for article-type entries. Rendered as titled prose blocks on the detail page. */
  articleSections?: ArticleSection[];
}

/** A single section within an article-type project entry. */
export interface ArticleSection {
  /** Section heading displayed as an uppercase monospace label. */
  title: string;
  /** Section body text — rendered with code highlights, same as detailedDescription. */
  body: string;
}
