import { NextResponse } from "next/server";
import { readLocalObject } from "@/lib/storage/media";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ key: string[] }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { key } = await ctx.params;
  const file = await readLocalObject(key ?? []);
  if (!file) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
