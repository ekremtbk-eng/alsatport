import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "QR işlemleri",
  robots: { index: false, follow: false },
};

export default function QrLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-md px-4 py-8">{children}</div>;
}
