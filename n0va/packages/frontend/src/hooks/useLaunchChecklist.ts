import { useState, useEffect, useCallback } from "react";

export interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  category: "creative" | "audience" | "budget" | "schedule" | "platform" | "tracking" | "approval";
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

const STORAGE_KEY = "n0va_launch_checklists";

function load(): Record<string, CampaignChecklist> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}

function save(data: Record<string, CampaignChecklist>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useLaunchChecklist(campaignId?: string) {
  const [all, setAll] = useState<Record<string, CampaignChecklist>>({});

  useEffect(() => { setAll(load()); }, []);

  const getChecklist = useCallback((id: string): CampaignChecklist => {
    return all[id] || { campaignId: id, completed: [] };
  }, [all]);

  const toggleItem = useCallback((id: string, itemId: string) => {
    setAll((prev) => {
      const current = prev[id] || { campaignId: id, completed: [] };
      const completed = current.completed.includes(itemId)
        ? current.completed.filter((c) => c !== itemId)
        : [...current.completed, itemId];
      const updated = { ...prev, [id]: { ...current, completed } };
      save(updated);
      return updated;
    });
  }, []);

  const resetChecklist = useCallback((id: string) => {
    setAll((prev) => {
      const updated = { ...prev, [id]: { campaignId: id, completed: [] } };
      save(updated);
      return updated;
    });
  }, []);

  const current = campaignId ? getChecklist(campaignId) : null;
  const progress = current ? Math.round((current.completed.length / DEFAULT_ITEMS.length) * 100) : 0;

  return { items: DEFAULT_ITEMS, getChecklist, toggleItem, resetChecklist, current, progress };
}
