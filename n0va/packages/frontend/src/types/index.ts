export interface Campaign {
  _id: string;
  tenantId: string;
  name: string;
  type: "performance" | "brand" | "retargeting" | "prospecting";
  status: "draft" | "active" | "paused" | "archived" | "completed";
  description?: string;
  budget: {
    daily: number;
    lifetime: number;
    currency: string;
    spent: number;
    remaining: number;
  };
  platforms: string[];
  audiences: string[];
  creatives: string[];
  startDate?: string;
  endDate?: string;
  goal?: string;
  kpis: Record<string, number>;
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Creative {
  _id: string;
  name: string;
  type: "image" | "video" | "carousel" | "text";
  status: string;
  headline?: string;
  body?: string;
  cta?: string;
  assetUrl?: string;
  tags: string[];
  performance: { impressions: number; clicks: number; ctr: number };
}

export interface Audience {
  _id: string;
  name: string;
  description?: string;
  type: "lookalike" | "retargeting" | "custom" | "saved";
  platform: string;
  size: number;
  criteria: Record<string, unknown>;
  status: string;
}

export interface Agent {
  _id: string;
  name: string;
  type: "budget" | "creative" | "audience" | "bid" | "fraud";
  status: "running" | "paused" | "error" | "idle";
  frequency: string;
  lastRun?: string;
  lastError?: string;
  metrics: { runs: number; successes: number; failures: number; actionsTaken: number };
}

export interface DashboardMetrics {
  totalCampaigns: number;
  activeCampaigns: number;
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  metrics: {
    totalImpressions: number;
    totalClicks: number;
    totalConversions: number;
    totalSpend: number;
    totalRevenue: number;
    avgCtr: number;
    avgRoas: number;
  };
}

export interface Platform {
  id: string;
  name: string;
  platform: string;
  version: string;
  actions: string[];
  authType: string;
}
