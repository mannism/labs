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
  /** A single key insight or engineering decision highlighted in the drawer. */
  keyLearnings?: string;
  /** Semver string sourced from the latest GitHub release/tag, e.g. "2.2.5". */
  version?: string;
  /** ISO date string of the last push to the GitHub repo, e.g. "2026-03-25". */
  lastUpdated?: string;
  /** When true, spans 2 columns in the v2 bento grid for emphasis. */
  highlight?: boolean;
}
