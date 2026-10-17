import { RequireLiveSession } from "@/components/security/RequireLiveSession";

export default async function IlanlarimLayout({ children }: { children: React.ReactNode }) {
  return <RequireLiveSession>{children}</RequireLiveSession>;
}
