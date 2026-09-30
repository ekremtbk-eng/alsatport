"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { COMPLETE_PATH, safeNextPath } from "@/lib/profile";

function CompleteAccountRedirectInner() {
  const router = useRouter();
  const search = useSearchParams();
  useEffect(() => {
    const next = search.get("next");
    const dest = next
      ? `${COMPLETE_PATH}?next=${encodeURIComponent(safeNextPath(next))}`
      : COMPLETE_PATH;
    router.replace(dest);
  }, [router, search]);
  return null;
}

export default function CompleteAccountRedirect() {
  return (
    <Suspense fallback={null}>
      <CompleteAccountRedirectInner />
    </Suspense>
  );
}
