"use client";

import { ReactNode } from "react";
import { VersionProvider } from "./VersionProvider";

/**
 * ClientProviders — wraps client-side context providers around the app tree.
 * Used in layout.tsx (a server component) to inject client-only providers
 * without making the root layout a client component.
 */
export function ClientProviders({ children }: { children: ReactNode }) {
  return <VersionProvider>{children}</VersionProvider>;
}
