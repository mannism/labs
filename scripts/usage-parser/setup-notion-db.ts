/**
 * Notion Database Setup — Usage Tracking
 *
 * Creates the "Usage Tracking" database under the Command Center page in Notion.
 * Run once before activating the n8n pipeline.
 *
 * Prerequisites:
 *   - NOTION_API_KEY env var set to an internal integration token
 *   - The integration must be connected to the Command Center page
 *     (Share → Connections in Notion UI)
 *
 * Usage:
 *   NOTION_API_KEY=secret_xxx npx tsx scripts/usage-parser/setup-notion-db.ts
 */

const NOTION_API_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

interface NotionSearchResult {
  results: Array<{
    id: string;
    object: string;
    title?: Array<{ plain_text: string }>;
    properties?: Record<string, { title?: Array<{ plain_text: string }> }>;
  }>;
}

interface NotionCreateDatabaseResponse {
  id: string;
  url: string;
}

/**
 * Calls the Notion API with consistent headers and error handling.
 */
async function notionRequest<T>(
  path: string,
  method: "GET" | "POST" | "PATCH",
  body?: unknown
): Promise<T> {
  const token = process.env["NOTION_API_KEY"];
  if (!token) {
    throw new Error("NOTION_API_KEY environment variable is not set");
  }

  const response = await fetch(`${NOTION_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Notion API ${method} ${path} failed (${response.status}): ${errorText}`
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Searches Notion for the "Command Center" page and returns its ID.
 * Searches both pages and databases to handle different configurations.
 */
async function findCommandCenterPage(): Promise<string> {
  const result = await notionRequest<NotionSearchResult>("/search", "POST", {
    query: "Command Center",
    filter: { value: "page", property: "object" },
    page_size: 10,
  });

  for (const item of result.results) {
    // Check title property (varies by page type)
    const title =
      item.title?.[0]?.plain_text ??
      item.properties?.["title"]?.title?.[0]?.plain_text ??
      "";
    if (title.toLowerCase().includes("command center")) {
      process.stderr.write(
        `[setup] Found Command Center page: ${item.id} ("${title}")\n`
      );
      return item.id;
    }
  }

  throw new Error(
    'Could not find "Command Center" page. ' +
      "Ensure the integration is connected to it (Share → Connections)."
  );
}

/**
 * Creates the "Usage Tracking" database with all required properties.
 * Returns the database ID and URL.
 */
async function createUsageTrackingDatabase(
  parentPageId: string
): Promise<{ id: string; url: string }> {
  const db = await notionRequest<NotionCreateDatabaseResponse>(
    "/databases",
    "POST",
    {
      parent: { type: "page_id", page_id: parentPageId },
      title: [{ type: "text", text: { content: "Usage Tracking" } }],
      properties: {
        // Date is the primary key / title field
        Date: {
          title: {},
        },
        // Token counts per tier
        "Opus Tokens In": { number: { format: "number" } },
        "Opus Tokens Out": { number: { format: "number" } },
        "Sonnet Tokens In": { number: { format: "number" } },
        "Sonnet Tokens Out": { number: { format: "number" } },
        "Haiku Tokens In": { number: { format: "number" } },
        "Haiku Tokens Out": { number: { format: "number" } },
        // Aggregate
        "Total Tokens": { number: { format: "number" } },
        // Session counts per tier
        "Opus Sessions": { number: { format: "number" } },
        "Sonnet Sessions": { number: { format: "number" } },
        "Haiku Sessions": { number: { format: "number" } },
        // Cost and distribution
        "Estimated Cost USD": { number: { format: "dollar" } },
        "Model Split": { rich_text: {} },
        // Pipeline observability
        "Pipeline Status": {
          select: {
            options: [
              { name: "success", color: "green" },
              { name: "partial", color: "yellow" },
              { name: "failed", color: "red" },
            ],
          },
        },
      },
    }
  );

  return { id: db.id, url: db.url };
}

async function main(): Promise<void> {
  process.stderr.write("[setup] Searching for Command Center page...\n");

  let parentPageId: string;
  try {
    parentPageId = await findCommandCenterPage();
  } catch (err) {
    process.stderr.write(`[setup] ERROR: ${String(err)}\n`);
    process.exit(1);
  }

  process.stderr.write("[setup] Creating Usage Tracking database...\n");

  let db: { id: string; url: string };
  try {
    db = await createUsageTrackingDatabase(parentPageId);
  } catch (err) {
    process.stderr.write(`[setup] ERROR creating database: ${String(err)}\n`);
    process.exit(1);
  }

  process.stderr.write(`[setup] Database created successfully!\n`);
  process.stderr.write(`[setup] ID:  ${db.id}\n`);
  process.stderr.write(`[setup] URL: ${db.url}\n`);
  process.stderr.write(
    `\n[setup] Add this to your .env:\nNOTION_USAGE_DB_ID=${db.id}\n`
  );

  // Also write the DB ID to stdout for scripting
  process.stdout.write(
    JSON.stringify({ databaseId: db.id, url: db.url }) + "\n"
  );
}

main().catch((err: unknown) => {
  process.stderr.write(`[setup] FATAL: ${String(err)}\n`);
  process.exit(1);
});
