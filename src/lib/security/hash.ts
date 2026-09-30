import "server-only";
import { getAuthSecret } from "@/lib/security/secret";

export async function sha256Secret(namespace: string, value: string) {
  const data = new TextEncoder().encode(`${getAuthSecret()}:${namespace}:${value}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
