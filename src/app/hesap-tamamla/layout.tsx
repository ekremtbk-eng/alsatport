import type { Metadata } from "next";
import { RequireLiveSession } from "@/components/security/RequireLiveSession";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function CompleteAccountLayout({ children }: { children: React.ReactNode }) {
  return <RequireLiveSession>{children}</RequireLiveSession>;
}
