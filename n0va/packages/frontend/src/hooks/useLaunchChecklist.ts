import { useState, useEffect, useCallback } from "react";

export interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  category: string;
}

export interface CampaignChecklist {
  campaignId: string;
  completed: string[];
}

const DEFAULT_ITEMS: ChecklistItem[] = [
  { id: "creatives", label: "Creative assets ready", description: "At least one creative is created and approved", category: "creative" },
  { id: "audience", label: "Target audience defined", description: "Audience segments are selected and sized", category: "audience" },
  { id: "budget", label: "Budget configured", description: "Daily and lifetime budget are set", category: "budget" },
  { id: "schedule", label: "Schedule configured", description: "Start and end dates are defined", category: "schedule" },
  { id: "platforms", label: "Platform connections verified", description: "Ad platform accounts are connected and active", category: "platform" },
  { id: "tracking", label: "Tracking & UTM parameters set", description: "Campaign tracking URLs include UTM parameters", category: "tracking" },
  { id: "approval", label: "Campaign approved", description: "Campaign has been reviewed and approved", category: "approval" },
];

const ITEMS_KEY = "n0va_checklist_items";
const CHECKLISTS_KEY = "n0va_launch_checklists";

function loadItems(): ChecklistItem[] {
  try {
    const raw = localStorage.getItem(ITEMS_KEY);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(ITEMS_KEY, JSON.stringify(DEFAULT_ITEMS));
    return DEFAULT_ITEMS;
  } catch { return DEFAULT_ITEMS; }
}

function saveItems(items: ChecklistItem[]) {
  localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
}

function loadChecklists(): Record<string, CampaignChecklist> {
  try { return JSON.parse(localStorage.getItem(CHECKLISTS_KEY) || "{}"); }
  catch { return {}; }
}

function saveChecklists(data: Record<string, CampaignChecklist>) {
  localStorage.setItem(CHECKLISTS_KEY, JSON.stringify(data));
}

export function useLaunchChecklist(campaignId?: string) {
  const [items, setItems] = useState<ChecklistItem[]>(() => loadItems());
  const [all, setAll] = useState<Record<string, CampaignChecklist>>(() => loadChecklists());

  useEffect(() => { saveItems(items); }, [items]);
  useEffect(() => { saveChecklists(all); }, [all]);

  const getChecklist = useCallback((id: string): CampaignChecklist => {
    return all[id] || { campaignId: id, completed: [] };
  }, [all]);

  const toggleItem = useCallback((id: string, itemId: string) => {
    setAll((prev) => {
      const current = prev[id] || { campaignId: id, completed: [] };
      const completed = current.completed.includes(itemId)
        ? current.completed.filter((c) => c !== itemId)
        : [...current.completed, itemId];
      return { ...prev, [id]: { ...current, completed } };
    });
  }, []);

  const resetChecklist = useCallback((id: string) => {
    setAll((prev) => ({ ...prev, [id]: { campaignId: id, completed: [] } }));
  }, []);

  const addItem = useCallback((item: { label: string; description: string; category: string }) => {
    const newItem: ChecklistItem = {
      id: "custom-" + Date.now().toString(36),
      label: item.label,
      description: item.description,
      category: item.category,
    };
    setItems((prev) => [...prev, newItem]);
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<ChecklistItem>) => {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, ...updates } : i));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const current = campaignId ? getChecklist(campaignId) : null;
  const progress = current ? Math.round((current.completed.length / items.length) * 100) : 0;

  return { items, getChecklist, toggleItem, resetChecklist, addItem, updateItem, removeItem, current, progress };
}
