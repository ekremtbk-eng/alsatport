import { prefStorage } from "@/lib/consent";

const KEY = "alsatport-special-day-seen-v1";

function readMap(): Record<string, number> {
  try {
    const raw = prefStorage.get(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function specialDaySeenKey(who: string, id: string, dateKey: string) {
  return `${who}:${id}:${dateKey}`;
}

export function hasSeenSpecialDay(who: string, id: string, dateKey: string) {
  if (typeof window === "undefined") return true;
  return Boolean(readMap()[specialDaySeenKey(who, id, dateKey)]);
}

export function markSpecialDaySeen(who: string, id: string, dateKey: string) {
  if (typeof window === "undefined") return;
  const map = readMap();
  map[specialDaySeenKey(who, id, dateKey)] = Date.now();
  const recent = Object.fromEntries(Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 60));
  prefStorage.set(KEY, JSON.stringify(recent));
}
