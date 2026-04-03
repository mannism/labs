/**
 * Canonical project data loader.
 * Resolves the Labs entry's version from package.json (managed by semantic-release)
 * so it stays in sync without a self-referencing GitHub API workflow.
 */
import type { Project } from "@/types/project";
import rawProjects from "@/data/projects.json";
import packageJson from "../../package.json";

const LABS_SLUG = "labs";

/** All displayable projects with Labs version resolved from package.json. */
const projects: Project[] = (rawProjects as Project[]).map((p) =>
  p.slug === LABS_SLUG ? { ...p, version: packageJson.version } : p
);

export default projects;
