import { RequireLiveSession } from "@/components/security/RequireLiveSession";

export default async function BildirimlerLayout({ children }: { children: React.ReactNode }) {
  return <RequireLiveSession>{children}</RequireLiveSession>;
}
