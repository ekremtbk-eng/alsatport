"use client";

export function Pane({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="dash-pane-title">{title}</h1>
      {children}
    </div>
  );
}

export function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs font-semibold text-orange">{msg}</p>;
}

export function ToggleRow({
  title,
  desc,
  on,
  onChange,
  disabled,
}: {
  title: string;
  desc?: string;
  on: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="dash-info-row">
      <div>
        <p className="text-sm font-semibold">{title}</p>
        {desc ? <p className="text-xs text-muted">{desc}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={title}
        disabled={disabled}
        onClick={() => onChange(!on)}
        className={`relative h-7 w-12 shrink-0 rounded-full disabled:opacity-60 ${on ? "bg-lime" : "bg-elev"}`}
      >
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition ${on ? "start-5" : "start-0.5"}`} />
      </button>
    </div>
  );
}

export function Notice({ error, hint }: { error?: string; hint?: string }) {
  return (
    <>
      {error ? <p className="mt-2 text-xs font-semibold text-orange">{error}</p> : null}
      {hint && !error ? <p className="mt-2 text-xs font-semibold text-lime">{hint}</p> : null}
    </>
  );
}

/** Shown only when MAIL_DEBUG is on outside production (the server omits the code otherwise). */
export function SandboxCode({ code, label }: { code?: string; label: string }) {
  if (!code) return null;
  return (
    <p className="rounded-xl bg-elev px-3 py-2 text-xs">
      {label}: <span className="font-extrabold tracking-widest">{code}</span>
    </p>
  );
}

export function OtpInput({ value, onChange, id }: { value: string; onChange: (v: string) => void; id?: string }) {
  return (
    <input
      id={id}
      className="dash-input text-center tracking-[0.4em]"
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
    />
  );
}
