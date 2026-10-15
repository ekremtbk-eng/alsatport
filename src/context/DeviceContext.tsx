"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { applyDeviceDom, classifyDevice, type DeviceKind } from "@/lib/device";

export type DeviceState = {
  device: DeviceKind;
  width: number;
  height: number;
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;
};

type Snapshot = Pick<DeviceState, "device" | "width" | "height" | "isTouch">;

/** What the server renders with; hydration must start from the same value or the HTML will not match. */
const SERVER_SNAPSHOT: Snapshot = { device: "desktop", width: 1440, height: 900, isTouch: false };

function measure(): Snapshot {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const isTouch = window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
  return { device: classifyDevice(width, isTouch), width, height, isTouch };
}

/** Cached so useSyncExternalStore sees a stable object until the screen really changes. */
let current: Snapshot | null = null;

function getSnapshot(): Snapshot {
  if (!current) current = measure();
  return current;
}

function getServerSnapshot(): Snapshot {
  return SERVER_SNAPSHOT;
}

function subscribe(onChange: () => void) {
  const update = () => {
    const next = measure();
    const prev = current;
    if (
      prev &&
      prev.device === next.device &&
      prev.width === next.width &&
      prev.height === next.height &&
      prev.isTouch === next.isTouch
    ) {
      return;
    }
    current = next;
    onChange();
  };
  update();
  window.addEventListener("resize", update, { passive: true });
  window.addEventListener("orientationchange", update);
  const coarse = window.matchMedia("(pointer: coarse)");
  coarse.addEventListener?.("change", update);
  return () => {
    window.removeEventListener("resize", update);
    window.removeEventListener("orientationchange", update);
    coarse.removeEventListener?.("change", update);
  };
}

const Ctx = createContext<DeviceState>({
  ...SERVER_SNAPSHOT,
  isPhone: false,
  isTablet: false,
  isDesktop: true,
});

/**
 * Screen class for components that must render differently per device. During hydration every consumer gets
 * the server value (desktop), then React re-renders at once with the real one; CSS keyed on html[data-device]
 * (set before paint by the inline script) keeps the first paint right in the meantime.
 */
export function DeviceProvider({ children }: { children: React.ReactNode }) {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    applyDeviceDom(snap.device);
  }, [snap.device]);

  const value = useMemo<DeviceState>(
    () => ({
      ...snap,
      isPhone: snap.device === "phone",
      isTablet: snap.device === "tablet",
      isDesktop: snap.device === "desktop",
    }),
    [snap],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDevice() {
  return useContext(Ctx);
}
