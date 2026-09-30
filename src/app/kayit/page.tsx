"use client";

import { useState } from "react";
import { AuthStage } from "@/components/AuthStage";

export default function RegisterPage() {
  const [tab, setTab] = useState<"login" | "signup">("signup");
  return <AuthStage tab={tab} onTab={setTab} variant="page" />;
}
