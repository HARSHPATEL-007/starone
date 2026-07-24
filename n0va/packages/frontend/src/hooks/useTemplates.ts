import { useState, useEffect, useCallback } from "react";

export interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  dailyBudget: number;
  lifetimeBudget: number;
  currency: string;
  platforms: string[];
  goal: string;
  tags: string;
  createdAt: string;
  usedCount: number;
}

const STORAGE_KEY = "n0va_campaign_templates";

function loadTemplates(): CampaignTemplate[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveTemplates(templates: CampaignTemplate[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export function useTemplates() {
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);

  useEffect(() => {
    setTemplates(loadTemplates());
  }, []);

  const refresh = useCallback(() => {
    setTemplates(loadTemplates());
  }, []);

  const createTemplate = useCallback((data: Omit<CampaignTemplate, "id" | "createdAt" | "usedCount">) => {
    const template: CampaignTemplate = {
      ...data,
      id: `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
      usedCount: 0,
    };
    const updated = [...loadTemplates(), template];
    saveTemplates(updated);
    setTemplates(updated);
    return template;
  }, []);

  const deleteTemplate = useCallback((id: string) => {
    const updated = loadTemplates().filter((t) => t.id !== id);
    saveTemplates(updated);
    setTemplates(updated);
  }, []);

  const useTemplate = useCallback((id: string) => {
    const all = loadTemplates();
    const idx = all.findIndex((t) => t.id === id);
    if (idx === -1) return;
    all[idx].usedCount += 1;
    saveTemplates(all);
    setTemplates(all);
  }, []);

  const getTemplate = useCallback((id: string): CampaignTemplate | undefined => {
    return loadTemplates().find((t) => t.id === id);
  }, []);

  return { templates, refresh, createTemplate, deleteTemplate, useTemplate, getTemplate };
}
