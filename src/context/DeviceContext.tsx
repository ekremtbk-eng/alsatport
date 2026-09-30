"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
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

function snapshot(): Pick<DeviceState, "device" | "width" | "height" | "isTouch"> {
  if (typeof window === "undefined") {
    return { device: "desktop", width: 1440, height: 900, isTouch: false };
  }
  const width = window.innerWidth;
  const height = window.innerHeight;
  const isTouch =
    window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
  return {
    device: classifyDevice(width, isTouch),
    width,
    height,
    isTouch,
  };
}

const Ctx = createContext<DeviceState>({
  device: "desktop",
  width: 1440,
  height: 900,
  isPhone: false,
  isTablet: false,
  isDesktop: true,
  isTouch: false,
});

export function DeviceProvider({ children }: { children: React.ReactNode }) {
  const [snap, setSnap] = useState(snapshot);

  useEffect(() => {
    const update = () => {
      const next = snapshot();
      setSnap(next);
      applyDeviceDom(next.device);
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
  }, []);

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
