const KEY = "alsatport-reduced-motion";

export function readReducedMotion() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function applyReducedMotion(on: boolean) {
  if (on) document.documentElement.dataset.reducedMotion = "1";
  else delete document.documentElement.dataset.reducedMotion;
}

export function writeReducedMotion(on: boolean) {
  try {
    if (on) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: still apply for this page view */
  }
  applyReducedMotion(on);
}

/** Inline, pre-hydration script so the preference applies before the first animation frame. */
export const REDUCED_MOTION_BOOT = `try{if(localStorage.getItem("${KEY}")==="1")document.documentElement.dataset.reducedMotion="1"}catch(e){}`;
