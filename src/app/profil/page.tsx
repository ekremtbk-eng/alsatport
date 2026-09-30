"use client";

import { Suspense } from "react";
import { DashboardApp } from "@/components/dashboard/DashboardApp";

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="dash-page min-h-96" />}>
      <DashboardApp />
    </Suspense>
  );
}
