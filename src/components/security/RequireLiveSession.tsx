import { requirePageSession } from "@/lib/security/pageSession";

/** Async server layout helper: blocks revoked JWTs from rendering protected page shells. */
export async function RequireLiveSession({ children }: { children: React.ReactNode }) {
  await requirePageSession();
  return children;
}
