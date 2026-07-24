import { useState, useEffect, useCallback } from "react";

export interface RecentItem {
  type: string;
  id: string;
  label: string;
  subtitle?: string;
  route: string;
  timestamp?: number;
}

const STORAGE_KEY = "n0va_recent_items";
const MAX_ITEMS = 20;

function load(): RecentItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function save(items: RecentItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
}

export function useRecentItems() {
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => { setItems(load()); }, []);

  const track = useCallback((item: RecentItem) => {
    setItems((prev) => {
      const filtered = prev.filter((i) => !(i.type === item.type && i.id === item.id));
      const stamped = { ...item, timestamp: item.timestamp ?? Date.now() };
      const updated = [stamped, ...filtered].slice(0, MAX_ITEMS);
      save(updated);
      return updated;
    });
  }, []);

  const clear = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setItems([]);
  }, []);

  const recent = items.slice(0, 8);

  return { recent, track, clear };
}
