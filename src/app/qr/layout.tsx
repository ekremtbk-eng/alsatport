import type { Metadata } from "next";
import { RequireLiveSession } from "@/components/security/RequireLiveSession";

export const metadata: Metadata = {
  title: "QR işlemleri",
  robots: { index: false, follow: false },
};

export default async function QrLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireLiveSession>
      <div className="mx-auto w-full max-w-md px-4 py-8">{children}</div>
    </RequireLiveSession>
  );
}
