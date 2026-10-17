import { RequireLiveSession } from "@/components/security/RequireLiveSession";

export default async function OdemeLayout({ children }: { children: React.ReactNode }) {
  return <RequireLiveSession>{children}</RequireLiveSession>;
}
