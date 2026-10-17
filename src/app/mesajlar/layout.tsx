import { RequireLiveSession } from "@/components/security/RequireLiveSession";

export default async function MesajlarLayout({ children }: { children: React.ReactNode }) {
  return <RequireLiveSession>{children}</RequireLiveSession>;
}
