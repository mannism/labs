/**
 * Next.js instrumentation hook — runs once when the server process starts.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * This is the approved architecture for EXP_005 (Option 2 — instrumentation.ts):
 * the BullMQ worker runs inside the Next.js server process rather than a
 * separate Docker container, keeping the deployment footprint minimal for a
 * project at this scale.
 *
 * Guard: the worker import must only run in the Node.js runtime.
 *   - `process.env.NEXT_RUNTIME === 'nodejs'` is set by Next.js for Node.js
 *     server-side execution and is absent in the Edge runtime.
 *   - Without this guard, Next.js would attempt to import the worker (and its
 *     ioredis + BullMQ dependencies) in the Edge runtime, which does not
 *     support Node.js built-ins.
 *
 * Failure mode: if Redis is unavailable at startup, the worker will log an
 * error and BullMQ will retry the connection. The Next.js server continues
 * starting normally — worker unavailability does not crash the server.
 */

export async function register(): Promise<void> {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        // Dynamic import keeps the worker and its Node.js dependencies out of
        // Edge runtime bundles entirely — not just guarded at runtime.
        const { brandPipelineWorker } = await import(
            "@/lib/workers/brandPipelineWorker"
        );

        console.log(
            "[instrumentation] brand pipeline worker started — queue: brand-pipeline, " +
            `concurrency: ${brandPipelineWorker.opts.concurrency ?? 1}`
        );
    }
}
