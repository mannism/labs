/**
 * relativeTime — lightweight relative-time formatter for card secondary date lines.
 *
 * Rules (per brief):
 *   - Returns null when delta is zero (suppress "updated 0d ago" noise).
 *   - Returns null when delta exceeds SIX_MONTH_THRESHOLD_DAYS (suppress stale signals).
 *   - Format: "updated 3d ago", "updated 2w ago", "updated 4mo ago" — short, lowercase.
 *
 * No external dependencies — uses only arithmetic and Intl-free string formatting.
 * Designed for the project card's secondary date line; not a general-purpose util.
 */

/** Days before the secondary updated-line is hidden entirely. */
const SIX_MONTH_THRESHOLD_DAYS = 183;

/**
 * Formats a relative-time string for a secondary "updated X ago" card line.
 *
 * @param createdDateStr  ISO date string of the item's creation date (source of truth primary date).
 * @param lastUpdatedStr  ISO date string of the last-updated timestamp.
 * @returns               Formatted string like "updated 3d ago", or null to suppress the line.
 */
export function formatRelativeUpdated(
  createdDateStr: string | undefined,
  lastUpdatedStr: string | undefined
): string | null {
  if (!createdDateStr || !lastUpdatedStr) return null;

  /* Parse both dates — strip to date-only to avoid timezone-induced false deltas */
  const created = new Date(createdDateStr.slice(0, 10));
  const updated = new Date(lastUpdatedStr.slice(0, 10));

  /* Suppress when dates are equal — project was never edited after creation */
  if (created.getTime() === updated.getTime()) return null;

  /* Calculate delta in whole days from lastUpdated to today */
  const now = new Date();
  const now_date = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const updated_date = new Date(
    updated.getFullYear(),
    updated.getMonth(),
    updated.getDate()
  );

  const deltaDays = Math.floor(
    (now_date.getTime() - updated_date.getTime()) / (1000 * 60 * 60 * 24)
  );

  /* Suppress when lastUpdated is more than ~6 months ago */
  if (deltaDays > SIX_MONTH_THRESHOLD_DAYS) return null;

  /* Suppress when lastUpdated is in the future (defensive) */
  if (deltaDays < 0) return null;

  /* Suppress when delta is zero (updated today — not a meaningful signal) */
  if (deltaDays === 0) return "updated today";

  /* Format: days → weeks → months, in short lowercase */
  if (deltaDays < 7) {
    return `updated ${deltaDays}d ago`;
  }

  if (deltaDays < 30) {
    const weeks = Math.floor(deltaDays / 7);
    return `updated ${weeks}w ago`;
  }

  const months = Math.floor(deltaDays / 30);
  return `updated ${months}mo ago`;
}
