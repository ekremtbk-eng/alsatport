import { RequireLiveSession } from "@/components/security/RequireLiveSession";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RequireLiveSession>{children}</RequireLiveSession>;
}
