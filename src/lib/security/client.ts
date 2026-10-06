"use client";

import { deviceFingerprint } from "@/lib/security/fingerprint";

let csrfToken = "";

export async function getCsrfToken() {
  if (csrfToken) return csrfToken;
  const res = await fetch("/api/auth/csrf", { credentials: "include", cache: "no-store" });
  const data = (await res.json()) as { token?: string };
  csrfToken = data.token ?? "";
  return csrfToken;
}

export function resetCsrfToken() {
  csrfToken = "";
}

export async function apiUpload<T>(
  url: string,
  file: File,
  extra?: Record<string, string>,
): Promise<T & { status: number }> {
  const token = await getCsrfToken();
  const fp = await deviceFingerprint();
  const body = new FormData();
  body.append("file", file);
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value) body.append(key, value);
    }
  }
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: {
      "X-CSRF-Token": token,
      ...(fp ? { "X-Device-Fp": fp } : {}),
    },
    body,
  });
  const data = (await res.json().catch(() => ({ ok: false, error: "auth.err.server" }))) as T;
  return { ...data, status: res.status };
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include", cache: "no-store" });
  return (await res.json()) as T;
}

export async function apiPost<T>(url: string, body: unknown): Promise<T & { status: number }> {
  return apiSend<T>("POST", url, body);
}

export async function apiPut<T>(url: string, body: unknown): Promise<T & { status: number }> {
  return apiSend<T>("PUT", url, body);
}

export async function apiPatch<T>(url: string, body: unknown): Promise<T & { status: number }> {
  return apiSend<T>("PATCH", url, body);
}

export async function apiDelete<T>(url: string): Promise<T & { status: number }> {
  return apiSend<T>("DELETE", url);
}

async function apiSend<T>(method: string, url: string, body?: unknown): Promise<T & { status: number }> {
  const token = await getCsrfToken();
  const fp = await deviceFingerprint();
  const res = await fetch(url, {
    method,
    credentials: "include",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": token,
      ...(fp ? { "X-Device-Fp": fp } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({ ok: false, error: "auth.err.server" }))) as T;
  return { ...data, status: res.status };
}
