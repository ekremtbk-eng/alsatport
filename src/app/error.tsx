"use client";

import { StatusScreen } from "@/components/StatusScreen";

export default function RouteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <StatusScreen kind="error" onRetry={reset} />;
}
