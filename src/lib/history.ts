import type { HistoryItem } from "@/types";

const STORAGE_KEY = "appforge-history";
const MAX_ITEMS = 30;

export function loadHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveHistory(items: HistoryItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
}
