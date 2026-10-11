/**
 * One-time "get the app" welcome. The visitor's choice is kept only in this browser's localStorage;
 * nothing is sent to the server. Clearing site data shows the screen again.
 */
const KEY = "alsatport-install-welcome-v1";

/**
 * dismissed = X / Esc, later = "Not now", prompted = download pressed (install dialog or steps shown,
 * not proof of installation), installed = the browser confirmed an installed app.
 */
export type WelcomeChoice = "dismissed" | "later" | "prompted" | "installed";

/** True once a choice is stored. Unreadable storage also counts, so the screen can't reappear on every page. */
export function welcomeDecided(): boolean {
  try {
    return localStorage.getItem(KEY) !== null;
  } catch {
    return true;
  }
}

export function rememberWelcome(choice: WelcomeChoice) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ choice, at: Date.now() }));
  } catch {
    /* private mode: the in-memory guard in the component still stops repeats in this tab */
  }
}

/** Pages where an interruption would get in the way of a task (auth, posting, payment, admin…). */
const SKIP_PREFIXES = [
  "/giris",
  "/kayit",
  "/welcome",
  "/hesap-tamamla",
  "/hizmet-vermek-istiyorum",
  "/sifre-sifirla",
  "/sifre-unuttum",
  "/eposta-dogrula",
  "/qr",
  "/ilan-ver",
  "/odeme",
  "/paketler",
  "/admin",
  "/profil/bilgilerim",
];

export function welcomeAllowedOn(path: string): boolean {
  return !SKIP_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

/** Another dialog, the cookie banner or the phone splash is on screen: wait instead of stacking on top. */
export function screenBusy(): boolean {
  return !!document.querySelector('[aria-modal="true"], .cookie-banner, .m-splash');
}
