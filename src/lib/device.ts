export type DeviceKind = "phone" | "tablet" | "desktop";

/** Phone <768, tablet 768–1023 (and coarse-pointer up to 1280), else desktop. */
export function classifyDevice(width: number, isTouch: boolean): DeviceKind {
  if (width < 768) return "phone";
  if (width < 1024) return "tablet";
  if (isTouch && width < 1280) return "tablet";
  return "desktop";
}

export function applyDeviceDom(device: DeviceKind) {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  el.dataset.device = device;
  el.classList.toggle("is-phone", device === "phone");
  el.classList.toggle("is-tablet", device === "tablet");
  el.classList.toggle("is-desktop", device === "desktop");
}
