"use client";

import { useState } from "react";
import { AuthStage } from "@/components/AuthStage";

export default function LoginPage() {
  const [tab, setTab] = useState<"login" | "signup">("login");
  return <AuthStage tab={tab} onTab={setTab} variant="page" />;
}
