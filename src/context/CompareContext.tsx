"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { prefStorage } from "@/lib/consent";

const KEY = "alsatport-compare-v1";
export const COMPARE_MAX = 4;

type CompareState = {
  ids: string[];
  add: (id: string) => "ok" | "full" | "has";
  remove: (id: string) => void;
  toggle: (id: string) => "ok" | "full" | "has" | "removed";
  clear: () => void;
  has: (id: string) => boolean;
};

const Ctx = createContext<CompareState | null>(null);

function readIds() {
  try {
    const raw = JSON.parse(prefStorage.get(KEY) || "[]") as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.filter((x): x is string => typeof x === "string").slice(0, COMPARE_MAX);
  } catch {
    return [];
  }
}

export function CompareProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setIds(readIds());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (ids.length) prefStorage.set(KEY, JSON.stringify(ids));
    else if (prefStorage.get(KEY)) prefStorage.set(KEY, "[]");
  }, [ids, loaded]);

  const add = useCallback((id: string) => {
    if (ids.includes(id)) return "has" as const;
    if (ids.length >= COMPARE_MAX) return "full" as const;
    setIds((prev) => (prev.includes(id) || prev.length >= COMPARE_MAX ? prev : [...prev, id]));
    return "ok" as const;
  }, [ids]);

  const remove = useCallback((id: string) => {
    setIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const toggle = useCallback(
    (id: string) => {
      if (ids.includes(id)) {
        setIds((prev) => prev.filter((x) => x !== id));
        return "removed" as const;
      }
      if (ids.length >= COMPARE_MAX) return "full" as const;
      setIds((prev) => (prev.includes(id) || prev.length >= COMPARE_MAX ? prev : [...prev, id]));
      return "ok" as const;
    },
    [ids],
  );

  const clear = useCallback(() => setIds([]), []);
  const has = useCallback((id: string) => ids.includes(id), [ids]);

  const value = useMemo(
    () => ({ ids, add, remove, toggle, clear, has }),
    [ids, add, remove, toggle, clear, has],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCompare() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
}
