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
  hyperContext: {
    linkedTasks: string[];
    linkedDocs: string[];
    linkedSheets: string[];
    linkedCalendar: string[];
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Creative {
  _id: string;
  tenantId: string;
  name: string;
  type: "image" | "video" | "carousel" | "text";
  status: "draft" | "pending_approval" | "approved" | "rejected" | "active" | "paused";
  headline?: string;
  body?: string;
  cta?: string;
  assetUrl?: string;
  tags: string[];
  platformVariants?: Record<string, { headline?: string; body?: string; cta?: string; assetUrl?: string }>;
  performance: { impressions: number; clicks: number; ctr: number };
  createdAt: string;
  updatedAt: string;
}

export interface Audience {
  _id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: "lookalike" | "retargeting" | "custom" | "saved";
  platform: string;
  size: number;
  criteria: Record<string, unknown>;
  status: "active" | "paused" | "building";
  performance?: { impressions: number; conversions: number; spend: number; revenue: number; roas: number };
  tags?: string[];
  source?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Agent {
  _id: string;
  tenantId: string;
  name: string;
  type: "budget" | "creative" | "audience" | "bid" | "fraud";
  status: "running" | "paused" | "error" | "idle";
  frequency: string;
  config: Record<string, unknown>;
  lastRun?: string;
  lastError?: string;
  metrics: { runs: number; successes: number; failures: number; actionsTaken: number };
  hitlThreshold?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
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

export interface Task {
  _id: string;
  tenantId: string;
  campaignId?: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "done" | "cancelled";
  priority: "low" | "medium" | "high" | "critical";
  assignee?: string;
  dueDate?: string;
  source: "n0va" | "external";
  externalUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Doc {
  _id: string;
  tenantId: string;
  campaignId?: string;
  title: string;
  content?: string;
  type: "brief" | "report" | "strategy" | "analysis" | "other";
  source: "n0va" | "external";
  externalUrl?: string;
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Sheet {
  _id: string;
  tenantId: string;
  campaignId?: string;
  title: string;
  type: "budget" | "performance" | "forecast" | "custom";
  rows: number;
  columns: number;
  source: "n0va" | "external";
  externalUrl?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  _id: string;
  tenantId: string;
  campaignId?: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  type: "review" | "launch" | "meeting" | "deadline" | "milestone" | "other";
  source: "n0va" | "external";
  externalUrl?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  tenantId: string;
  type: "fraud_alert" | "budget_alert" | "campaign_update" | "agent_status" | "system";
  title: string;
  message: string;
  severity: "info" | "warning" | "error" | "success";
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface ActivityEvent {
  id: string;
  tenantId: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  details?: string;
  userId: string;
  userName: string;
  timestamp: string;
}
