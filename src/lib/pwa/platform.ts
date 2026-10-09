export type DevicePlatform = "android" | "ios" | "windows" | "mac" | "linux" | "other";

/** How this browser can add AlsatPort as an app. */
export type InstallPath =
  | "prompt" // Chromium beforeinstallprompt
  | "ios-share" // Safari / iOS browsers: Share → Add to Home Screen
  | "mac-safari" // Safari 17+ on macOS: File → Add to Dock
  | "android-menu" // Android browsers without a prompt (Firefox, Samsung…): menu → Install / Add to Home screen
  | "desktop-menu" // Chromium desktop without a captured prompt: address-bar install icon / menu
  | "unsupported"; // e.g. Firefox desktop: suggest Chrome or Edge

export type PlatformInfo = {
  platform: DevicePlatform;
  isSafari: boolean;
  isFirefox: boolean;
  isChromium: boolean;
};

export function detectPlatform(ua: string, uaPlatform = "", maxTouchPoints = 0): PlatformInfo {
  const s = ua.toLowerCase();
  const p = uaPlatform.toLowerCase();
  let platform: DevicePlatform = "other";
  if (/android/.test(s) || p === "android") platform = "android";
  else if (/iphone|ipad|ipod/.test(s) || p === "ios") platform = "ios";
  // iPadOS 13+ asks for the desktop site and reports "Macintosh"; only a touch screen tells it apart.
  else if (/macintosh|mac os x/.test(s) || p === "macos") platform = maxTouchPoints > 1 ? "ios" : "mac";
  else if (/windows/.test(s) || p === "windows") platform = "windows";
  else if (/cros/.test(s) || p === "chrome os" || p === "chromeos") platform = "linux";
  else if (/linux|x11/.test(s) || p === "linux") platform = "linux";

  const isFirefox = /firefox|fxios/.test(s);
  const isChromium = !isFirefox && /chrome|chromium|crios|edg\//.test(s);
  const isSafari = !isFirefox && !isChromium && /safari/.test(s) && /version\//.test(s);
  return { platform, isSafari, isFirefox, isChromium };
}

export function installPath(info: PlatformInfo, hasPrompt: boolean): InstallPath {
  if (hasPrompt) return "prompt";
  if (info.platform === "ios") return "ios-share";
  if (info.platform === "mac" && info.isSafari) return "mac-safari";
  if (info.platform === "android") return "android-menu";
  if (info.isChromium) return "desktop-menu";
  return "unsupported";
}
