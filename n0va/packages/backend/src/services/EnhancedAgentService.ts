import { MemoryStore } from "./MemoryStore";

export interface AgentCapability {
  agentName: string;
  agentType: string;
  frequency: string;
  hitlThreshold: string;
  hitlThresholdValue: number;
  actions: string[];
  crossModuleOutput: string[];
  description: string;
}

export interface AgentFrequencySchedule {
  agentType: string;
  frequencyHours: number;
  lastRun: string | null;
  nextRun: string;
  overdueMinutes: number;
}

export interface AgentDetailedStatus {
  name: string;
  type: string;
  frequency: string;
  hitlThreshold: string;
  actions: string[];
  crossModuleOutputs: string[];
  runs: number;
  successRate: number;
  lastRun: string | null;
  nextScheduledRun: string;
  health: "excellent" | "good" | "fair" | "critical";
}

const AGENT_DEFINITIONS: AgentCapability[] = [
  {
    agentName: "Budget Agent", agentType: "budget",
    frequency: "every_4_hours", hitlThreshold: ">$10K single shift", hitlThresholdValue: 10000,
    actions: ["Shift budget across platforms", "Update daily caps", "Pause underperformers"],
    crossModuleOutput: ["Sheets budget tracker update", "Finance accrual entries"],
    description: "Monitors spend pacing and reallocates budget across Meta/Google/LinkedIn/TikTok",
  },
  {
    agentName: "Creative Agent", agentType: "creative",
    frequency: "every_6_hours", hitlThreshold: "New brand asset upload", hitlThresholdValue: 1,
    actions: ["Detect fatigue (CTR drop >20%)", "Generate new variants via N0VA-Diffusion", "Upload to platforms", "Submit for approval"],
    crossModuleOutput: ["Tasks for legal review", "Docs creative brief update"],
    description: "Detects creative fatigue and generates new variants",
  },
  {
    agentName: "Audience Agent", agentType: "audience",
    frequency: "daily", hitlThreshold: "Audience >50K new records", hitlThresholdValue: 50000,
    actions: ["Analyze segment LTV scores", "Expand high-performing lookalikes", "Pause low-quality segments", "Sync to CRM"],
    crossModuleOutput: ["CRM lead scoring update", "Contacts enrichment"],
    description: "Analyzes segment performance and expands lookalikes",
  },
  {
    agentName: "Bid Agent", agentType: "bid",
    frequency: "every_2_hours", hitlThreshold: "Bid increase >50%", hitlThresholdValue: 50,
    actions: ["Adjust CPC/CPM bids per platform", "Apply dayparting modifiers", "Respond to competitor auction pressure"],
    crossModuleOutput: ["Vault audit trail log", "Command Center KPIs update"],
    description: "Optimizes bids per platform and adjusts for seasonality",
  },
  {
    agentName: "Fraud Agent", agentType: "fraud",
    frequency: "realtime", hitlThreshold: "Brand safety crisis (>5 flagged)", hitlThresholdValue: 5,
    actions: ["Monitor IVT via DoubleVerify/IAS", "Auto-pause placements with risk >90%", "Alert via Chat"],
    crossModuleOutput: ["Tasks for compliance review", "Vault legal hold trigger", "Chat security alert"],
    description: "Monitors invalid traffic and auto-pauses suspicious placements",
  },
];

const FREQUENCY_HOURS: Record<string, number> = {
  realtime: 0.016, every_30_minutes: 0.5, every_hour: 1, every_2_hours: 2,
  every_4_hours: 4, every_6_hours: 6, every_12_hours: 12, daily: 24, weekly: 168,
};

export class EnhancedAgentService {
  private mem(): MemoryStore { return MemoryStore.getInstance(); }

  getAgentDefinitions(): AgentCapability[] {
    return AGENT_DEFINITIONS;
  }

  getAgentDefinition(type: string): AgentCapability | undefined {
    return AGENT_DEFINITIONS.find((a) => a.agentType === type);
  }

  computeSchedules(tenantId: string): AgentFrequencySchedule[] {
    const agents = this.mem().find("agents", (a: any) => a.tenantId === tenantId) as any[];
    return AGENT_DEFINITIONS.map((def) => {
      const agent = agents.find((a: any) => a.type === def.agentType);
      const lastRun = agent?.lastRun || null;
      const freqHours = FREQUENCY_HOURS[def.frequency] || 24;
      const nextRun = lastRun
        ? new Date(new Date(lastRun).getTime() + freqHours * 3600000).toISOString()
        : new Date().toISOString();
      const overdueMinutes = lastRun
        ? Math.round((Date.now() - new Date(lastRun).getTime() - freqHours * 3600000) / 60000)
        : 0;
      return { agentType: def.agentType, frequencyHours: freqHours, lastRun, nextRun, overdueMinutes: Math.max(0, overdueMinutes) };
    });
  }

  getDetailedStatus(tenantId: string): AgentDetailedStatus[] {
    const agents = this.mem().find("agents", (a: any) => a.tenantId === tenantId) as any[];
    const schedules = this.computeSchedules(tenantId);

    return AGENT_DEFINITIONS.map((def) => {
      const agent = agents.find((a: any) => a.type === def.agentType);
      const schedule = schedules.find((s) => s.agentType === def.agentType);
      const m = agent?.metrics || { runs: 0, successes: 0, failures: 0 };
      const total = m.runs || 0;
      const successRate = total > 0 ? Math.round((m.successes / total) * 10000) / 100 : 0;
      const overdue = schedule?.overdueMinutes || 0;
      const health: "excellent" | "good" | "fair" | "critical" =
        successRate >= 90 && overdue < 60 ? "excellent"
        : successRate >= 70 && overdue < 180 ? "good"
        : successRate >= 50 ? "fair"
        : "critical";

      return {
        name: def.agentName, type: def.agentType, frequency: def.frequency,
        hitlThreshold: def.hitlThreshold, actions: def.actions,
        crossModuleOutputs: def.crossModuleOutput,
        runs: total, successRate, lastRun: agent?.lastRun || null,
        nextScheduledRun: schedule?.nextRun || new Date().toISOString(),
        health,
      };
    });
  }

  getComplianceStatus(tenantId: string): { agentName: string; hitlEnabled: boolean; auditTrailCount: number; lastComplianceCheck: string }[] {
    const executions = this.mem().find("swarm_executions", (e: any) => e.tenantId === tenantId) as any[];
    return AGENT_DEFINITIONS.map((def) => {
      const agentExecs = executions.filter((e: any) => e.agentType === def.agentType);
      return {
        agentName: def.agentName, hitlEnabled: def.hitlThresholdValue > 0,
        auditTrailCount: agentExecs.length,
        lastComplianceCheck: agentExecs.length > 0 ? agentExecs[agentExecs.length - 1].startedAt : "never",
      };
    });
  }
}

export const enhancedAgentService = new EnhancedAgentService();
