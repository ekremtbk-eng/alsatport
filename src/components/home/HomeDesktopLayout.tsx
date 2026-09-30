"use client";

import { Suspense, type ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";

export function HomeDesktopLayout({ children }: { children: ReactNode }) {
  return (
    <div className="home-desk">
      <Suspense fallback={null}>
        <Sidebar />
      </Suspense>
      <div className="home-desk-main">{children}</div>
    </div>
  );
}
