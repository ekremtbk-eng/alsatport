import { RequireLiveSession } from "@/components/security/RequireLiveSession";

export default async function BildirimAyarlariLayout({ children }: { children: React.ReactNode }) {
  return <RequireLiveSession>{children}</RequireLiveSession>;
}
