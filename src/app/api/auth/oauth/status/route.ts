import { NextResponse } from "next/server";
import { oauthConfigured } from "@/lib/oauth/providers";

export async function GET() {
  return NextResponse.json({
    ok: true,
    google: oauthConfigured("google"),
    apple: oauthConfigured("apple"),
    facebook: oauthConfigured("facebook"),
  });
}
