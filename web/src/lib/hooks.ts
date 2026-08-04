import { useQuery } from "@tanstack/react-query";
import { useEffect, useSyncExternalStore } from "react";
import type { PlanDetail, PlanSummary } from "shared";
import { api, qk } from "./api";

export function usePlans() {
  return useQuery({ queryKey: qk.plans, queryFn: () => api<PlanSummary[]>("/api/plans") });
}

export function usePlan(slug: string) {
  return useQuery({ queryKey: qk.plan(slug), queryFn: () => api<PlanDetail>(`/api/plans/${slug}`) });
}

export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · Meal Prep` : "Meal Prep — the weekly archive";
    return () => {
      document.title = "Meal Prep — the weekly archive";
    };
  }, [title]);
}

/* ------------------------------------------------------------------------- */
/* Prep check-off state — localStorage per plan, keyed by stable DB task ids  */
/* ------------------------------------------------------------------------- */

type PrepChecks = Record<string, true>;

const listeners = new Set<() => void>();
const cache = new Map<string, PrepChecks>();

function storageKey(slug: string) {
  return `prep:${slug}`;
}

function read(slug: string): PrepChecks {
  const cached = cache.get(slug);
  if (cached) return cached;
  let value: PrepChecks = {};
  try {
    const raw = localStorage.getItem(storageKey(slug));
    if (raw) value = JSON.parse(raw) as PrepChecks;
  } catch {
    // corrupted or unavailable storage — start clean
  }
  cache.set(slug, value);
  return value;
}

function write(slug: string, value: PrepChecks) {
  cache.set(slug, value);
  try {
    localStorage.setItem(storageKey(slug), JSON.stringify(value));
  } catch {
    // storage full/unavailable — state still works in-memory
  }
  for (const listener of listeners) listener();
}

export function usePrepState(slug: string) {
  const checks = useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => read(slug),
  );

  return {
    isChecked: (id: string) => checks[id] === true,
    checkedCount: Object.keys(checks).length,
    toggle: (id: string) => {
      const next: PrepChecks = { ...read(slug) };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = true;
      }
      write(slug, next);
    },
    reset: () => write(slug, {}),
  };
}
