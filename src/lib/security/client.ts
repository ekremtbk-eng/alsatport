"use client";

import { deviceFingerprint } from "@/lib/security/fingerprint";

/**
 * Every /api/auth/csrf response rotates the cookie, so concurrent callers must share one request:
 * otherwise an earlier caller keeps a token the cookie no longer matches and its POST gets a 403.
 */
let csrfRequest: Promise<string> | null = null;

async function fetchCsrfToken() {
  const res = await fetch("/api/auth/csrf", { credentials: "include", cache: "no-store" });
  const data = (await res.json()) as { token?: string };
  return data.token ?? "";
}

export function getCsrfToken() {
  if (!csrfRequest) {
    const pending = fetchCsrfToken().then(
      (token) => {
        if (!token && csrfRequest === pending) csrfRequest = null;
        return token;
      },
      () => {
        if (csrfRequest === pending) csrfRequest = null;
        return "";
      },
    );
    csrfRequest = pending;
  }
  return csrfRequest;
}

export function resetCsrfToken() {
  csrfRequest = null;
}

/** The cookie can be dropped or rotated (another tab, storage cleanup); one retry with a fresh token. */
async function withCsrfRetry(send: (token: string) => Promise<Response>) {
  const used = await getCsrfToken();
  const res = await send(used);
  if (res.status !== 403) return res;
  const data = (await res.clone().json().catch(() => null)) as { error?: string } | null;
  if (data?.error !== "auth.err.csrf") return res;
  if ((await getCsrfToken()) === used) resetCsrfToken();
  return send(await getCsrfToken());
}

export async function apiUpload<T>(
  url: string,
  file: File,
  extra?: Record<string, string>,
): Promise<T & { status: number }> {
  const fp = await deviceFingerprint();
  const body = new FormData();
  body.append("file", file);
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value) body.append(key, value);
    }
  }
  const res = await withCsrfRetry((token) =>
    fetch(url, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: {
        "X-CSRF-Token": token,
        ...(fp ? { "X-Device-Fp": fp } : {}),
      },
      body,
    }),
  );
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

export async function apiDelete<T>(url: string, body?: unknown): Promise<T & { status: number }> {
  return apiSend<T>("DELETE", url, body);
}

async function apiSend<T>(method: string, url: string, body?: unknown): Promise<T & { status: number }> {
  const fp = await deviceFingerprint();
  const payload = body === undefined ? undefined : JSON.stringify(body);
  const res = await withCsrfRetry((token) =>
    fetch(url, {
      method,
      credentials: "include",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": token,
        ...(fp ? { "X-Device-Fp": fp } : {}),
      },
      body: payload,
    }),
  );
  const data = (await res.json().catch(() => ({ ok: false, error: "auth.err.server" }))) as T;
  return { ...data, status: res.status };
}
