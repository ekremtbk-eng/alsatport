"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Ban, CheckCircle2, CircleAlert, ImagePlus, KeyRound, Mail, MessageSquareText, QrCode, ShieldCheck, Smartphone } from "lucide-react";
import { OtpBoxes } from "@/components/auth/OtpBoxes";
import { QrSvg } from "@/components/QrSvg";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/context/I18nContext";
import type { UserProfile } from "@/data/store";
import { dashHref } from "@/lib/dashboardNav";
import { isEmailVerified, isProfileComplete, profileGaps, type ProfileGap } from "@/lib/profile";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/security/client";
import { passwordChecks } from "@/lib/security/passwordPolicy";
import { readReducedMotion, writeReducedMotion } from "@/lib/reducedMotion";
import { NUMBER_LOCALE } from "@/i18n/config";
import { Notice, OtpInput, Pane, SandboxCode, ToggleRow } from "./DashUi";

type ApiUser = { ok: boolean; error?: string; user?: UserProfile; sandboxCode?: string; maskedEmail?: string };

function useAccountCall() {
  const { adoptSession } = useApp();
  return useCallback(
    async <T extends ApiUser>(run: () => Promise<T & { status: number }>) => {
      const res = await run();
      if (res.ok && res.user) adoptSession(res.user);
      return res;
    },
    [adoptSession],
  );
}

const GAP_LABEL: Record<ProfileGap, string> = {
  name: "complete.name",
  phone: "complete.phone",
  email: "bilgi.email",
  address: "bilgi.address",
};

/** Account verification is derived from profile completeness; no identity number is involved. */
export function VerificationStatusCard() {
  const { user } = useApp();
  const { t } = useI18n();
  if (!user) return null;
  const verified = user.verified && isProfileComplete(user);
  const gaps = profileGaps(user);
  return (
    <div className={`acct-status ${verified ? "is-ok" : "is-off"}`}>
      {verified ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-lime" aria-hidden />
      ) : (
        <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-orange" aria-hidden />
      )}
      <div className="min-w-0">
        <p className="text-sm font-extrabold">{verified ? t("acct.verify.ok") : t("acct.verify.off")}</p>
        <p className="text-xs text-muted">{verified ? t("acct.verify.okP") : t("acct.verify.offP")}</p>
        {!verified && gaps.length ? (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {gaps.map((g) => (
              <li key={g}>
                <Link href={dashHref("kisisel")} className="chip text-xs">
                  {t(GAP_LABEL[g])}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function SummaryRow({ icon: Icon, label, value, href, action }: { icon: typeof Mail; label: string; value: string; href: string; action: string }) {
  return (
    <div className="dash-info-row">
      <div className="flex min-w-0 items-start gap-2.5">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-lime" aria-hidden />
        <div className="min-w-0">
          <p className="dash-row-label">{label}</p>
          <p className="text-sm">{value}</p>
        </div>
      </div>
      <Link href={href} className="dash-link shrink-0 text-sm font-semibold">
        {action}
      </Link>
    </div>
  );
}

export function SecurityPanel() {
  const { user } = useApp();
  const { t } = useI18n();
  if (!user) return null;
  return (
    <Pane title={t("acct.sec.overview")}>
      <VerificationStatusCard />
      <div className="mt-4">
        <SummaryRow
          icon={KeyRound}
          label={t("dash.sec.pass")}
          value={user.hasPassword ? t("acct.pw.has") : t("acct.pw.none")}
          href={dashHref("sifre")}
          action={user.hasPassword ? t("dash.update") : t("acct.pw.set")}
        />
        <SummaryRow
          icon={ShieldCheck}
          label={t("acct.2fa.h")}
          value={user.twoFactorEnabled ? t("acct.on") : t("acct.off")}
          href={dashHref("iki-asama")}
          action={t("dash.update")}
        />
        <SummaryRow
          icon={Ban}
          label={t("acct.blocks.h")}
          value={t("acct.blocks.p")}
          href={dashHref("engellenenler")}
          action={t("acct.view")}
        />
        <SummaryRow
          icon={Smartphone}
          label={t("dash.sec.devices")}
          value={t("dash.device.active")}
          href={dashHref("cihazlar")}
          action={t("acct.view")}
        />
      </div>
      <RecoveryEmailSection />
    </Pane>
  );
}

export function PasswordPanel() {
  const { user } = useApp();
  const { t } = useI18n();
  const call = useAccountCall();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);
  const checks = passwordChecks(next);
  if (!user) return null;
  const hasPassword = !!user.hasPassword;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setHint("");
    if (next !== again) {
      setError(t("dash.pw.match"));
      return;
    }
    setBusy(true);
    const res = await call(() => apiPost<ApiUser>("/api/account/password", hasPassword ? { current, next } : { next }));
    setBusy(false);
    if (!res.ok) {
      setError(t(res.error ?? "auth.err.server"));
      return;
    }
    setHint(hasPassword ? t("dash.pw.ok") : t("acct.pw.setOk"));
    setCurrent("");
    setNext("");
    setAgain("");
  }

  return (
    <Pane title={hasPassword ? t("dash.sec.pass") : t("acct.pw.set")}>
      {!hasPassword ? <p className="mb-3 text-sm text-muted">{t("acct.pw.setP")}</p> : null}
      <form className="max-w-md space-y-3" onSubmit={(e) => void submit(e)}>
        {hasPassword ? (
          <label className="block">
            <span className="dash-row-label">{t("dash.pw.current")}</span>
            <input
              type="password"
              autoComplete="current-password"
              className="dash-input"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
          </label>
        ) : null}
        <label className="block">
          <span className="dash-row-label">{t("dash.pw.next")}</span>
          <input type="password" autoComplete="new-password" className="dash-input" value={next} onChange={(e) => setNext(e.target.value)} required />
        </label>
        <ul className="text-xs text-muted">
          {checks.map((c) => (
            <li key={c.id} className={c.ok ? "text-lime" : ""}>
              {t(`dash.pw.${c.id}`)}
            </li>
          ))}
        </ul>
        <label className="block">
          <span className="dash-row-label">{t("dash.pw.again")}</span>
          <input type="password" autoComplete="new-password" className="dash-input" value={again} onChange={(e) => setAgain(e.target.value)} required />
        </label>
        <Notice error={error} hint={hint} />
        <button className="btn-primary h-11 px-5" disabled={busy}>
          {hasPassword ? t("complete.save") : t("acct.pw.set")}
        </button>
      </form>
    </Pane>
  );
}

type TwoFactorChange = "enable" | "disable" | "method";

type TwoFactorStatus = {
  enabled: boolean;
  method: "email" | "sms";
  maskedEmail: string;
  maskedPhone: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  smsProvider: boolean;
  smsAvailable: boolean;
};

function MethodOption({
  icon: Icon,
  title,
  desc,
  selected,
  current,
  currentLabel,
  disabled,
  onSelect,
}: {
  icon: typeof Mail;
  title: string;
  desc: string;
  selected: boolean;
  current: boolean;
  currentLabel: string;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={`tfa-method${selected ? " is-on" : ""}`}
      disabled={disabled}
      onClick={onSelect}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <span className="min-w-0 text-start">
        <span className="flex flex-wrap items-center gap-2 text-sm font-extrabold">
          {title}
          {current ? <span className="tfa-badge">{currentLabel}</span> : null}
        </span>
        <span className="block text-xs text-muted">{desc}</span>
      </span>
    </button>
  );
}

export function TwoFactorPanel() {
  const { user } = useApp();
  const { t } = useI18n();
  const call = useAccountCall();
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [pick, setPick] = useState<"email" | "sms">("email");
  const [pending, setPending] = useState<{ change: TwoFactorChange; method: "email" | "sms"; via: "email" | "sms"; masked: string } | null>(null);
  const [otp, setOtp] = useState("");
  const [sandbox, setSandbox] = useState("");
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void apiGet<{ ok: boolean } & TwoFactorStatus>("/api/account/2fa").then((res) => {
      if (!alive || !res.ok) return;
      setStatus(res);
      setPick(res.method);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!user) return null;
  const on = status ? status.enabled : !!user.twoFactorEnabled;
  const method = status?.method ?? "email";
  const emailOk = isEmailVerified(user);

  async function start(change: TwoFactorChange, m: "email" | "sms") {
    setBusy(true);
    setError("");
    setHint("");
    const res = await apiPost<ApiUser & { via?: "email" | "sms"; maskedTarget?: string }>("/api/account/2fa", {
      action: "start",
      change,
      method: m,
    });
    setBusy(false);
    if (!res.ok) {
      setError(t(res.error ?? "auth.err.server"));
      return;
    }
    setPending({ change, method: m, via: res.via ?? "email", masked: res.maskedTarget ?? res.maskedEmail ?? "" });
    setSandbox(res.sandboxCode ?? "");
    setOtp("");
  }

  async function confirm(code = otp) {
    if (!pending || code.length !== 6) return;
    setBusy(true);
    setError("");
    const res = await call(() =>
      apiPost<ApiUser & Partial<TwoFactorStatus>>("/api/account/2fa", {
        action: "confirm",
        change: pending.change,
        method: pending.method,
        otp: code,
      }),
    );
    setBusy(false);
    if (!res.ok) {
      setError(t(res.error ?? "auth.err.server"));
      setOtp("");
      return;
    }
    if (typeof res.enabled === "boolean" && res.method) {
      setStatus(res as TwoFactorStatus);
      setPick(res.method);
    }
    setHint(t(pending.change === "disable" ? "acct.2fa.offOk" : pending.change === "enable" ? "acct.2fa.onOk" : "acct.2fa.methodOk"));
    setPending(null);
    setSandbox("");
  }

  const smsBlocked = !status?.smsProvider ? t("acct.2fa.smsSoon") : !status.smsAvailable ? t("acct.2fa.smsNeedPhone") : "";

  return (
    <Pane title={t("acct.2fa.h")}>
      <p className="mb-3 text-sm text-muted">{t("acct.2fa.p")}</p>
      <div className={`acct-status ${on ? "is-ok" : ""}`}>
        <ShieldCheck className={`mt-0.5 h-5 w-5 shrink-0 ${on ? "text-lime" : "text-muted"}`} aria-hidden />
        <div>
          <p className="text-sm font-extrabold">{on ? t("acct.2fa.isOn") : t("acct.2fa.isOff")}</p>
          <p className="text-xs text-muted">{t("acct.2fa.note")}</p>
        </div>
      </div>

      <div className="mt-4">
        <p className="dash-row-label">{t("acct.2fa.method")}</p>
        <p className="mb-2 text-xs text-muted">{t("acct.2fa.pick")}</p>
        <div className="tfa-methods" role="radiogroup" aria-label={t("acct.2fa.method")}>
          <MethodOption
            icon={Mail}
            title={t("acct.2fa.email")}
            desc={t("acct.2fa.emailP").replace("{email}", status?.maskedEmail ?? user.email ?? "")}
            selected={pick === "email"}
            current={on && method === "email"}
            currentLabel={t("acct.2fa.current")}
            disabled={busy || !!pending}
            onSelect={() => setPick("email")}
          />
          <MethodOption
            icon={MessageSquareText}
            title={t("acct.2fa.sms")}
            desc={smsBlocked || t("acct.2fa.smsP").replace("{phone}", status?.maskedPhone ?? "")}
            selected={pick === "sms"}
            current={on && method === "sms"}
            currentLabel={t("acct.2fa.current")}
            disabled={busy || !!pending || !!smsBlocked}
            onSelect={() => setPick("sms")}
          />
        </div>
      </div>

      {pick === "email" && !emailOk && !(on && method === "email") ? (
        <p className="mt-3 text-xs font-semibold text-orange">{t("acct.2fa.needEmail")}</p>
      ) : null}

      {pending ? (
        <div className="dash-inline-form mt-4 max-w-md">
          <p className="text-xs text-muted">
            {pending.via === "sms"
              ? t("acct.codeSentPhone").replace("{phone}", pending.masked)
              : t("acct.codeSent").replace("{email}", pending.masked)}
          </p>
          <SandboxCode code={sandbox} label={t("bilgi.inbox")} />
          <OtpBoxes value={otp} onChange={setOtp} onComplete={(v) => void confirm(v)} disabled={busy} invalid={!!error} autoFocus label={t("auth.2fa.digit")} />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary h-10 px-4 text-sm" disabled={busy || otp.length !== 6} onClick={() => void confirm()}>
              {t("acct.confirm")}
            </button>
            <button
              type="button"
              className="chip"
              disabled={busy}
              onClick={() => {
                setPending(null);
                setError("");
              }}
            >
              {t("acct.cancel")}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {!on ? (
            <button
              type="button"
              className="btn-primary h-10 px-4 text-sm"
              disabled={busy || !status || (pick === "email" ? !emailOk : !!smsBlocked)}
              onClick={() => void start("enable", pick)}
            >
              {t("acct.2fa.enable")}
            </button>
          ) : (
            <>
              {pick !== method ? (
                <button
                  type="button"
                  className="btn-primary h-10 px-4 text-sm"
                  disabled={busy || (pick === "email" ? !emailOk : !!smsBlocked)}
                  onClick={() => void start("method", pick)}
                >
                  {t("acct.2fa.use")}
                </button>
              ) : null}
              <button type="button" className="btn-blue h-10 px-4 text-sm" disabled={busy || !status} onClick={() => void start("disable", method)}>
                {t("acct.2fa.disable")}
              </button>
            </>
          )}
        </div>
      )}
      <Notice error={error} hint={hint} />
      <div className="mt-6">
        <RecoveryEmailSection />
      </div>
    </Pane>
  );
}

function RecoveryEmailSection() {
  const { user } = useApp();
  const { t } = useI18n();
  const call = useAccountCall();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"idle" | "form" | "code">("idle");
  const [sandbox, setSandbox] = useState("");
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  const current = user.recoveryEmailVerified ? user.recoveryEmailMasked : undefined;

  async function send() {
    setBusy(true);
    setError("");
    const res = await apiPost<ApiUser>("/api/account/recovery-email", { action: "start", email });
    setBusy(false);
    if (!res.ok) {
      setError(t(res.error ?? "auth.err.server"));
      return;
    }
    setSandbox(res.sandboxCode ?? "");
    setOtp("");
    setStep("code");
  }

  async function confirm() {
    setBusy(true);
    setError("");
    const res = await call(() => apiPost<ApiUser>("/api/account/recovery-email", { action: "confirm", email, otp }));
    setBusy(false);
    if (!res.ok) {
      setError(t(res.error ?? "auth.err.server"));
      return;
    }
    setStep("idle");
    setEmail("");
    setSandbox("");
    setHint(t("acct.recovery.ok"));
  }

  async function remove() {
    setBusy(true);
    setError("");
    const res = await call(() => apiPost<ApiUser>("/api/account/recovery-email", { action: "remove" }));
    setBusy(false);
    if (!res.ok) setError(t(res.error ?? "auth.err.server"));
    else setHint(t("acct.recovery.removed"));
  }

  return (
    <section className="mt-4">
      <div className="dash-info-row">
        <div className="flex min-w-0 items-start gap-2.5">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-lime" aria-hidden />
          <div className="min-w-0">
            <p className="dash-row-label">{t("acct.recovery.h")}</p>
            <p className="text-sm">{current ?? t("acct.recovery.none")}</p>
            <p className="text-xs text-muted">{t("acct.recovery.p")}</p>
          </div>
        </div>
        {step === "idle" ? (
          <div className="flex shrink-0 flex-col items-end gap-1">
            <button type="button" className="dash-link text-sm font-semibold" onClick={() => setStep("form")}>
              {current ? t("dash.update") : t("acct.add")}
            </button>
            {current ? (
              <button type="button" className="text-xs font-semibold text-orange" disabled={busy} onClick={() => void remove()}>
                {t("acct.remove")}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      {step !== "idle" ? (
        <div className="dash-inline-form max-w-md">
          <label className="block">
            <span className="dash-row-label">{t("acct.recovery.new")}</span>
            <input
              type="email"
              autoComplete="email"
              className="dash-input"
              value={email}
              disabled={step === "code"}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          {step === "code" ? (
            <>
              <SandboxCode code={sandbox} label={t("bilgi.inbox")} />
              <OtpInput value={otp} onChange={setOtp} />
            </>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {step === "form" ? (
              <button type="button" className="btn-primary h-10 px-4 text-sm" disabled={busy || !email.includes("@")} onClick={() => void send()}>
                {t("acct.sendCode")}
              </button>
            ) : (
              <button type="button" className="btn-primary h-10 px-4 text-sm" disabled={busy || otp.length !== 6} onClick={() => void confirm()}>
                {t("acct.confirm")}
              </button>
            )}
            <button type="button" className="chip" onClick={() => setStep("idle")}>
              {t("acct.cancel")}
            </button>
          </div>
        </div>
      ) : null}
      <Notice error={error} hint={hint} />
    </section>
  );
}

type BlockRow = { id: string; name: string; avatar: string; at: number };

export function BlocksPanel() {
  const { t } = useI18n();
  const [rows, setRows] = useState<BlockRow[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await apiGet<{ ok: boolean; blocks?: BlockRow[]; error?: string }>("/api/account/blocks").catch(() => null);
    if (!res?.ok) {
      setError(t(res?.error ?? "auth.err.server"));
      setRows([]);
      return;
    }
    setRows(res.blocks ?? []);
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function unblock(id: string) {
    const res = await apiDelete<{ ok: boolean; error?: string }>(`/api/account/blocks?id=${encodeURIComponent(id)}`);
    if (!res.ok) {
      setError(t(res.error ?? "auth.err.server"));
      return;
    }
    setRows((prev) => (prev ?? []).filter((r) => r.id !== id));
  }

  return (
    <Pane title={t("acct.blocks.h")}>
      <p className="mb-3 text-sm text-muted">{t("acct.blocks.info")}</p>
      {rows === null ? (
        <p className="dash-empty">{t("auth.connecting")}</p>
      ) : rows.length === 0 ? (
        <p className="dash-empty">{t("acct.blocks.empty")}</p>
      ) : (
        <ul>
          {rows.map((r) => (
            <li key={r.id} className="dash-info-row">
              <div className="flex min-w-0 items-center gap-2.5">
                {r.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.avatar} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-elev text-sm font-bold">{r.name.slice(0, 1)}</span>
                )}
                <span className="truncate text-sm font-semibold">{r.name}</span>
              </div>
              <button type="button" className="chip shrink-0" onClick={() => void unblock(r.id)}>
                {t("acct.unblock")}
              </button>
            </li>
          ))}
        </ul>
      )}
      <Notice error={error} />
    </Pane>
  );
}

type SessionRow = { id: string; device: string; method: string; ip: string | null; createdAt: string; lastSeenAt: string; current: boolean };

export function SessionsPanel() {
  const { t, locale } = useI18n();
  const [rows, setRows] = useState<SessionRow[] | null>(null);
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await apiGet<{ ok: boolean; sessions?: SessionRow[]; error?: string }>("/api/account/sessions").catch(() => null);
    if (!res?.ok) {
      setError(t(res?.error ?? "auth.err.server"));
      setRows([]);
      return;
    }
    setRows(res.sessions ?? []);
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function revoke(body: { scope: "others" } | { scope: "one"; id: string }) {
    setBusy(true);
    setError("");
    setHint("");
    const res = await apiDelete<{ ok: boolean; ended?: number; error?: string }>("/api/account/sessions", body);
    setBusy(false);
    if (!res.ok) {
      setError(t(res.error ?? "auth.err.server"));
      return;
    }
    if (body.scope === "others") setHint(t("sess.endedN", { n: res.ended ?? 0 }));
    await load();
  }

  const fmt = (iso: string) => new Date(iso).toLocaleString(NUMBER_LOCALE[locale], { dateStyle: "medium", timeStyle: "short" });
  const others = (rows ?? []).filter((r) => !r.current).length;

  return (
    <Pane title={t("dash.sec.devices")}>
      <p className="mb-3 text-sm text-muted">{t("sess.info")}</p>
      {rows === null ? (
        <p className="dash-empty">{t("auth.connecting")}</p>
      ) : (
        <ul>
          {rows.map((r) => (
            <li key={r.id} className="dash-info-row">
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {r.device}
                  {r.current ? <span className="ml-2 chip text-xs">{t("dash.device.this")}</span> : null}
                </p>
                <p className="text-xs text-muted">
                  {t("sess.started")}: {fmt(r.createdAt)} · {t("sess.seen")}: {fmt(r.lastSeenAt)}
                  {r.ip ? ` · ${r.ip}` : ""}
                </p>
              </div>
              {r.current ? null : (
                <button type="button" className="chip shrink-0" disabled={busy} onClick={() => void revoke({ scope: "one", id: r.id })}>
                  {t("sess.end")}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {rows && others === 0 ? <p className="mt-2 text-xs text-muted">{t("sess.none")}</p> : null}
      <button type="button" className="btn-primary mt-4 h-10 px-4 text-sm" disabled={busy || others === 0} onClick={() => void revoke({ scope: "others" })}>
        {t("sess.endOthers")}
      </button>
      <Notice error={error} hint={hint} />
    </Pane>
  );
}

export function useServerSetting() {
  const { user } = useApp();
  const call = useAccountCall();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = useCallback(
    async (patch: Partial<Pick<UserProfile, "readReceipts" | "marketingEmail" | "marketingSms" | "marketingPush">>) => {
      setBusy(true);
      setError("");
      const res = await call(() => apiPatch<ApiUser>("/api/account/settings", patch));
      setBusy(false);
      if (!res.ok) setError(res.error ?? "auth.err.server");
    },
    [call],
  );
  return { user, busy, error, save };
}

export function ReadReceiptPanel() {
  const { t } = useI18n();
  const { user, busy, error, save } = useServerSetting();
  if (!user) return null;
  return (
    <Pane title={t("dash.app.read")}>
      <p className="mb-3 text-sm text-muted">{t("dash.read.p")}</p>
      <ToggleRow
        title={t("dash.read.on")}
        desc={t("dash.read.d")}
        on={user.readReceipts !== false}
        disabled={busy}
        onChange={(v) => void save({ readReceipts: v })}
      />
      <Notice error={error ? t(error) : ""} />
    </Pane>
  );
}

export function MarketingPanel() {
  const { t } = useI18n();
  const { user, busy, error, save } = useServerSetting();
  if (!user) return null;
  return (
    <Pane title={t("dash.app.mkt")}>
      <p className="mb-3 text-sm text-muted">{t("dash.mkt.p")}</p>
      <ToggleRow title={t("dash.mkt.email")} on={!!user.marketingEmail} disabled={busy} onChange={(v) => void save({ marketingEmail: v })} />
      <ToggleRow title={t("dash.mkt.sms")} on={!!user.marketingSms} disabled={busy} onChange={(v) => void save({ marketingSms: v })} />
      <ToggleRow title={t("dash.mkt.push")} on={!!user.marketingPush} disabled={busy} onChange={(v) => void save({ marketingPush: v })} />
      <p className="mt-3 text-xs text-muted">{t("acct.mkt.note")}</p>
      <Notice error={error ? t(error) : ""} />
    </Pane>
  );
}

export function MotionPanel() {
  const { t } = useI18n();
  const [on, setOn] = useState(false);
  const [system, setSystem] = useState(false);
  useEffect(() => {
    setOn(readReducedMotion());
    setSystem(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  return (
    <Pane title={t("acct.motion.h")}>
      <p className="mb-3 text-sm text-muted">{t("acct.motion.p")}</p>
      <ToggleRow
        title={t("acct.motion.on")}
        desc={t("acct.motion.d")}
        on={on}
        onChange={(v) => {
          setOn(v);
          writeReducedMotion(v);
        }}
      />
      {system ? <p className="mt-3 text-xs text-muted">{t("acct.motion.system")}</p> : null}
    </Pane>
  );
}

type PhotoPairing = { token: string; expiresAt: number; images: number; max: number; uploads: number };

export function QrPanel() {
  const { user, listings, refreshSession } = useApp();
  const { t } = useI18n();
  const mine = user ? listings.filter((l) => l.sellerId === user.id && l.status !== "rejected") : [];
  const [listingId, setListingId] = useState("");
  const [pair, setPair] = useState<PhotoPairing | null>(null);
  const [left, setLeft] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const baseline = useRef(0);

  useEffect(() => {
    if (!listingId && mine[0]) setListingId(mine[0].id);
  }, [listingId, mine]);

  useEffect(() => {
    if (!pair) return;
    let stop = false;
    const tick = window.setInterval(() => setLeft(Math.max(0, Math.ceil((pair.expiresAt - Date.now()) / 1000))), 1000);
    const poll = window.setInterval(async () => {
      if (stop) return;
      if (Date.now() > pair.expiresAt) {
        window.clearInterval(poll);
        return;
      }
      const res = await apiGet<{ ok: boolean; images?: number; uploads?: number }>(`/api/qr/photo?t=${encodeURIComponent(pair.token)}`).catch(
        () => null,
      );
      if (stop || !res?.ok) return;
      setPair((p) => (p ? { ...p, images: res.images ?? p.images, uploads: res.uploads ?? p.uploads } : p));
    }, 3000);
    return () => {
      stop = true;
      window.clearInterval(tick);
      window.clearInterval(poll);
    };
  }, [pair?.token, pair?.expiresAt]); // eslint-disable-line react-hooks/exhaustive-deps

  async function startPairing() {
    if (!listingId) return;
    setBusy(true);
    setError("");
    const res = await apiPost<{ ok: boolean; error?: string; token?: string; ttl?: number; images?: number; max?: number }>(
      "/api/qr/photo",
      { listingId },
    );
    setBusy(false);
    if (!res.ok || !res.token) {
      setError(t(res.error ?? "auth.err.server"));
      return;
    }
    baseline.current = res.images ?? 0;
    const ttl = res.ttl ?? 600000;
    setLeft(Math.ceil(ttl / 1000));
    setPair({ token: res.token, expiresAt: Date.now() + ttl, images: res.images ?? 0, max: res.max ?? 16, uploads: 0 });
  }

  const expired = !!pair && left <= 0;
  const link = pair && typeof window !== "undefined" ? `${window.location.origin}/qr/foto?t=${encodeURIComponent(pair.token)}` : "";

  return (
    <Pane title={t("acct.qr.h")}>
      <section className="dash-inline-form">
        <p className="flex items-center gap-2 text-sm font-extrabold">
          <QrCode className="h-4 w-4 text-lime" aria-hidden /> {t("acct.qr.login.h")}
        </p>
        <p className="text-xs text-muted">{t("acct.qr.login.p")}</p>
        <ol className="qr-login-steps">
          <li>{t("acct.qr.login.s1")}</li>
          <li>{t("acct.qr.login.s2")}</li>
          <li>{t("acct.qr.login.s3")}</li>
        </ol>
      </section>

      <section className="dash-inline-form mt-4">
        <p className="flex items-center gap-2 text-sm font-extrabold">
          <ImagePlus className="h-4 w-4 text-lime" aria-hidden /> {t("acct.qr.photo.h")}
        </p>
        <p className="text-xs text-muted">{t("acct.qr.photo.p")}</p>
        {!user || user.role === "member" ? (
          <p className="text-xs font-semibold text-orange">{t("acct.qr.photo.seller")}</p>
        ) : mine.length === 0 ? (
          <p className="text-xs text-muted">
            {t("acct.qr.photo.none")}{" "}
            <Link href="/ilan-ver" className="dash-link">
              {t("acct.qr.photo.post")}
            </Link>
          </p>
        ) : (
          <>
            <label className="block">
              <span className="dash-row-label">{t("acct.qr.photo.pick")}</span>
              <select
                className="dash-input"
                value={listingId}
                onChange={(e) => {
                  setListingId(e.target.value);
                  setPair(null);
                }}
              >
                {mine.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
              </select>
            </label>
            {pair && !expired ? (
              <div className="grid gap-2 text-center">
                <div className="qr-panel-code">
                  <QrSvg value={link} className="qr-login-svg" label={t("acct.qr.photo.h")} />
                </div>
                <p className="text-xs text-muted">{t("qr.login.left").replace("{s}", String(left))}</p>
                <p className="text-sm font-semibold">
                  {t("acct.qr.photo.count").replace("{n}", String(pair.images)).replace("{max}", String(pair.max))}
                </p>
                {pair.images > baseline.current ? (
                  <a href={`/ilan/${listingId}`} className="dash-link text-sm font-semibold" onClick={() => void refreshSession()}>
                    {t("acct.qr.photo.view")}
                  </a>
                ) : null}
              </div>
            ) : (
              <button type="button" className="btn-primary h-10 px-4 text-sm" disabled={busy || !listingId} onClick={() => void startPairing()}>
                {expired ? t("qr.login.refresh") : t("acct.qr.photo.start")}
              </button>
            )}
          </>
        )}
        <Notice error={error} />
      </section>
    </Pane>
  );
}
