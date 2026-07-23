export enum CampaignStatus {
  Draft = "draft",
  Active = "active",
  Paused = "paused",
  Archived = "archived",
  Completed = "completed",
}

export enum CampaignType {
  Performance = "performance",
  Brand = "brand",
  Retargeting = "retargeting",
  Prospecting = "prospecting",
}

export enum CreativeStatus {
  Draft = "draft",
  PendingApproval = "pending_approval",
  Approved = "approved",
  Rejected = "rejected",
  Active = "active",
  Paused = "paused",
}

export enum AgentType {
  Budget = "budget",
  Creative = "creative",
  Audience = "audience",
  Bid = "bid",
  Fraud = "fraud",
}

export enum AgentStatus {
  Running = "running",
  Paused = "paused",
  Error = "error",
  Idle = "idle",
}

export interface MetricValue {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  date: Date;
}

export interface BudgetAllocation {
  daily: number;
  lifetime: number;
  currency: string;
  spent: number;
  remaining: number;
}
