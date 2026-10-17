import { RequireLiveSession } from "@/components/security/RequireLiveSession";

export default async function IlanVerLayout({ children }: { children: React.ReactNode }) {
  return <RequireLiveSession>{children}</RequireLiveSession>;
}
