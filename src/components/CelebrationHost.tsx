"use client";

import { useCallback, useState } from "react";
import { LoyaltyMilestone } from "./LoyaltyMilestone";
import { SpecialDayCelebration } from "./SpecialDayCelebration";

export function CelebrationHost() {
  const [specialOpen, setSpecialOpen] = useState(false);
  const [specialReady, setSpecialReady] = useState(false);
  const onReady = useCallback((open: boolean) => {
    setSpecialOpen(open);
    setSpecialReady(true);
  }, []);

  return (
    <>
      <SpecialDayCelebration onReady={onReady} />
      {specialReady && !specialOpen ? <LoyaltyMilestone /> : null}
    </>
  );
}
