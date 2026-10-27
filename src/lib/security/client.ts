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

/**
 * apiUpload with upload progress (fetch cannot report it). Same CSRF header, device fingerprint and one
 * retry with a fresh token; a dropped connection comes back as status 0 with `photo.err.network`.
 */
export async function apiUploadWithProgress<T>(
  url: string,
  file: File,
  extra: Record<string, string> | undefined,
  onProgress: (fraction: number) => void,
): Promise<T & { status: number }> {
  const fp = await deviceFingerprint();
  const send = (token: string) =>
    new Promise<{ status: number; body: string }>((resolve) => {
      const body = new FormData();
      body.append("file", file);
      for (const [key, value] of Object.entries(extra ?? {})) if (value) body.append(key, value);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      xhr.withCredentials = true;
      xhr.timeout = 120_000;
      xhr.setRequestHeader("X-CSRF-Token", token);
      if (fp) xhr.setRequestHeader("X-Device-Fp", fp);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && e.total > 0) onProgress(Math.min(1, e.loaded / e.total));
      };
      xhr.onload = () => resolve({ status: xhr.status, body: xhr.responseText });
      xhr.onerror = xhr.ontimeout = xhr.onabort = () => resolve({ status: 0, body: "" });
      xhr.send(body);
    });
  const parse = (raw: string) => {
    try {
      return JSON.parse(raw) as T & { error?: string };
    } catch {
      return null;
    }
  };
  const used = await getCsrfToken();
  let res = await send(used);
  if (res.status === 403 && parse(res.body)?.error === "auth.err.csrf") {
    if ((await getCsrfToken()) === used) resetCsrfToken();
    onProgress(0);
    res = await send(await getCsrfToken());
  }
  const data = parse(res.body) ?? ({ ok: false, error: res.status === 0 ? "photo.err.network" : "auth.err.server" } as T);
  return { ...data, status: res.status };
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include", cache: "no-store" });
  return (await res.json()) as T;
}

export type SessionCheck<T> =
  | { kind: "ok"; data: T }
  | { kind: "signedOut" }
  | { kind: "rateLimit" | "unavailable"; retryAfter: number };

/**
 * Only a real answer may sign the user out: 200 with `user: null` (the server also drops its cookies)
 * or 401/403. Rate limiting, server errors and dropped connections say nothing about the session.
 */
export async function checkSession<T extends { user?: unknown }>(url = "/api/auth/session"): Promise<SessionCheck<T>> {
  let res: Response;
  try {
    res = await fetch(url, { credentials: "include", cache: "no-store" });
  } catch {
    return { kind: "unavailable", retryAfter: 0 };
  }
  if (res.status === 401 || res.status === 403) return { kind: "signedOut" };
  const retryAfter = Number(res.headers.get("Retry-After")) || 0;
  if (res.status === 429) return { kind: "rateLimit", retryAfter };
  const data = res.ok ? ((await res.json().catch(() => null)) as T | null) : null;
  if (!data || !("user" in data)) return { kind: "unavailable", retryAfter };
  return data.user ? { kind: "ok", data } : { kind: "signedOut" };
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

async function apiSend<T>(method: string, url: string, body?: unknown): Promise<T & { status: number; retryAfter?: number }> {
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
  const data = (await res.json().catch(() => ({ ok: false, error: "auth.err.server" }))) as T & {
    retryAfter?: number;
  };
  const retryAfter =
    typeof data.retryAfter === "number" && data.retryAfter > 0
      ? Math.floor(data.retryAfter)
      : Number(res.headers.get("Retry-After")) || 0;
  return { ...data, status: res.status, ...(retryAfter > 0 ? { retryAfter } : {}) };
}
