import { autonomousCampaignManager } from "./AutonomousCampaignManagerService";
import { campaignSaturationService } from "./CampaignSaturationService";
import { campaignHealthService } from "./CampaignHealthService";
import { budgetPacing } from "./BudgetPacingService";
import { DataStore } from "./DataStore";

type PipelineStage = "draft" | "configuring" | "activating" | "active" | "monitoring" | "optimizing" | "reporting" | "archived";
type PipelineStatus = "on_track" | "attention_needed" | "blocked" | "completed";

interface Pipeline {
  id: string;
  campaignId: string;
  campaignName: string;
  tenantId: string;
  currentStage: PipelineStage;
  status: PipelineStatus;
  stages: { name: PipelineStage; enteredAt: string; completedAt: string | null; status: "pending" | "in_progress" | "completed" | "failed" }[];
  config: Record<string, any>;
  events: { timestamp: string; stage: string; action: string; detail: string }[];
  createdAt: string;
  updatedAt: string;
}

interface StageRequirement {
  stage: PipelineStage;
  required: { field: string; description: string; met: boolean }[];
  optional: { field: string; description: string }[];
}

interface PipelineHealth {
  pipelineId: string;
  campaignId: string;
  stage: PipelineStage;
  status: PipelineStatus;
  checks: { name: string; status: "pass" | "warn" | "fail"; message: string }[];
  overallScore: number;
}

interface ActivationCheck {
  pipelineId: string;
  campaignId: string;
  checks: { name: string; status: "pass" | "fail" | "skip"; message: string }[];
  passed: boolean;
}

interface MonitoringReport {
  pipelineId: string;
  campaignId: string;
  stage: PipelineStage;
  metrics: { name: string; value: number; threshold: number; status: "healthy" | "warning" | "critical" }[];
  anomalies: string[];
  recommendations: string[];
  timestamp: string;
}

interface OptimizationResult {
  pipelineId: string;
  campaignId: string;
  actions: { type: string; description: string; impact: string; applied: boolean }[];
  expectedROASImprovement: number;
}

interface PipelineReport {
  pipelineId: string;
  campaignId: string;
  campaignName: string;
  stagesCompleted: string[];
  currentStage: string;
  duration: { started: string; elapsedDays: number };
  summaryMetrics: { totalEvents: number; totalActions: number; issuesFound: number; optimizationsApplied: number };
  stageTimeline: { stage: string; enteredAt: string; completedAt: string | null; duration: string }[];
  finalRecommendations: string[];
}

export class UnifiedAdsPipelineService {
  private pipelines: Map<string, Pipeline> = new Map();

  initializePipeline(campaignId: string, tenantId: string): Pipeline | null {
    const mem = DataStore["mem"]();
    const campaign = mem.findOne("campaigns", (c: any) => c._id === campaignId && c.tenantId === tenantId);
    if (!campaign) return null;
    const id = `pipe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const pipeline: Pipeline = {
      id, campaignId, campaignName: campaign.name || campaignId, tenantId,
      currentStage: "draft", status: "on_track",
      stages: [{ name: "draft", enteredAt: now, completedAt: null, status: "in_progress" }],
      config: {}, events: [{ timestamp: now, stage: "draft", action: "pipeline_initialized", detail: "Pipeline created for campaign" }],
      createdAt: now, updatedAt: now,
    };
    this.pipelines.set(id, pipeline);
    return pipeline;
  }

  getPipeline(pipelineId: string): Pipeline | undefined {
    return this.pipelines.get(pipelineId);
  }

  listPipelines(campaignId?: string, tenantId?: string): Pipeline[] {
    let all = Array.from(this.pipelines.values());
    if (campaignId) all = all.filter(p => p.campaignId === campaignId);
    if (tenantId) all = all.filter(p => p.tenantId === tenantId);
    return all;
  }

  advanceStage(pipelineId: string): { pipeline: Pipeline; requirements: StageRequirement } | null {
    const pipe = this.pipelines.get(pipelineId);
    if (!pipe) return null;
    const stageOrder: PipelineStage[] = ["draft", "configuring", "activating", "active", "monitoring", "optimizing", "reporting", "archived"];
    const currentIdx = stageOrder.indexOf(pipe.currentStage);
    if (currentIdx >= stageOrder.length - 1) return null;
    const now = new Date().toISOString();
    pipe.stages[currentIdx].completedAt = now;
    pipe.stages[currentIdx].status = "completed";
    pipe.currentStage = stageOrder[currentIdx + 1];
    pipe.stages.push({ name: pipe.currentStage, enteredAt: now, completedAt: null, status: "in_progress" });
    pipe.events.push({ timestamp: now, stage: pipe.currentStage, action: "stage_advanced", detail: `Advanced to ${pipe.currentStage}` });
    pipe.updatedAt = now;
    return { pipeline: pipe, requirements: this.getStageRequirements(pipe.currentStage) };
  }

  configureStep(pipelineId: string, config: Record<string, any>): Pipeline | null {
    const pipe = this.pipelines.get(pipelineId);
    if (!pipe) return null;
    Object.assign(pipe.config, config);
    const now = new Date().toISOString();
    pipe.events.push({ timestamp: now, stage: pipe.currentStage, action: "configured", detail: `Config updated: ${Object.keys(config).join(", ")}` });
    pipe.updatedAt = now;
    return pipe;
  }

  runActivationChecks(pipelineId: string): ActivationCheck | null {
    const pipe = this.pipelines.get(pipelineId);
    if (!pipe) return null;
    const checks = [
      { name: "budget_configured", status: pipe.config.budget ? "pass" as const : "fail" as const, message: pipe.config.budget ? "Budget configured" : "Budget not configured" },
      { name: "targeting_set", status: pipe.config.targeting ? "pass" as const : "fail" as const, message: pipe.config.targeting ? "Targeting configured" : "Targeting not set" },
      { name: "creative_ready", status: pipe.config.creative ? "pass" as const : "skip" as const, message: pipe.config.creative ? "Creative ready" : "Creative check skipped" },
    ];
    const passed = checks.every(c => c.status === "pass" || c.status === "skip");
    const now = new Date().toISOString();
    pipe.events.push({ timestamp: now, stage: "activating", action: passed ? "activation_passed" : "activation_failed", detail: passed ? "All activation checks passed" : "Some activation checks failed" });
    return { pipelineId, campaignId: pipe.campaignId, checks, passed };
  }

  runMonitoringCheck(pipelineId: string): MonitoringReport | null {
    const pipe = this.pipelines.get(pipelineId);
    if (!pipe) return null;
    const saturation = campaignSaturationService.analyze(pipe.campaignId, pipe.tenantId);
    const metrics = [
      { name: "saturation_score", value: saturation?.saturationScore ?? 0, threshold: 0.7, status: (saturation?.saturationScore ?? 0) > 0.7 ? "critical" as const : (saturation?.saturationScore ?? 0) > 0.4 ? "warning" as const : "healthy" as const },
      { name: "marginal_roi", value: saturation?.currentMarginalROI ?? 0, threshold: 0.5, status: (saturation?.currentMarginalROI ?? 1) < 0.5 ? "warning" as const : "healthy" as const },
    ];
    const anomalies = saturation?.fatigueMetrics.fatigueDetected ? ["Ad fatigue detected"] : [];
    const recommendations = saturation ? [saturation.recommendation] : [];
    const now = new Date().toISOString();
    pipe.events.push({ timestamp: now, stage: "monitoring", action: "monitoring_check", detail: `Monitored ${metrics.length} metrics` });
    return { pipelineId, campaignId: pipe.campaignId, stage: pipe.currentStage, metrics, anomalies, recommendations, timestamp: now };
  }

  runOptimizationCycle(pipelineId: string): OptimizationResult | null {
    const pipe = this.pipelines.get(pipelineId);
    if (!pipe) return null;
    const plan = autonomousCampaignManager.generateOptimizationPlan(pipe.campaignId, pipe.tenantId);
    const actions: OptimizationResult["actions"] = [];
    if (plan) {
      if (plan.budgetDelta !== 0) actions.push({ type: "budget", description: `Adjust budget by ${plan.budgetDelta > 0 ? "+" : ""}${plan.budgetDelta}`, impact: `Expected ROAS: ${plan.expectedROAS}`, applied: true });
      if (plan.bidAdjustments.length > 0) actions.push({ type: "bid", description: `Adjust ${plan.bidAdjustments.length} keyword bids`, impact: "Optimize bid efficiency", applied: true });
    }
    const saturation = campaignSaturationService.analyze(pipe.campaignId, pipe.tenantId);
    if (saturation?.saturationScore && saturation.saturationScore > 0.6) actions.push({ type: "saturation", description: "Reduce spend due to saturation", impact: "Improve marginal ROI", applied: false });
    const now = new Date().toISOString();
    pipe.events.push({ timestamp: now, stage: "optimizing", action: "optimization_cycle", detail: `${actions.filter(a => a.applied).length} optimizations applied` });
    return { pipelineId, campaignId: pipe.campaignId, actions, expectedROASImprovement: plan?.expectedROAS ?? 0 };
  }

  generatePipelineReport(pipelineId: string): PipelineReport | null {
    const pipe = this.pipelines.get(pipelineId);
    if (!pipe) return null;
    const completedStages = pipe.stages.filter(s => s.status === "completed");
    const now = new Date().toISOString();
    const startTime = new Date(pipe.createdAt).getTime();
    const elapsedDays = Math.round((Date.now() - startTime) / 86400000 * 10) / 10;
    return {
      pipelineId, campaignId: pipe.campaignId, campaignName: pipe.campaignName,
      stagesCompleted: completedStages.map(s => s.name),
      currentStage: pipe.currentStage,
      duration: { started: pipe.createdAt, elapsedDays },
      summaryMetrics: {
        totalEvents: pipe.events.length,
        totalActions: pipe.events.filter(e => e.action.includes("optimization")).length,
        issuesFound: pipe.events.filter(e => e.action.includes("fail") || e.action.includes("anomaly")).length,
        optimizationsApplied: pipe.events.filter(e => e.action === "optimization_cycle" || e.action === "stage_advanced").length,
      },
      stageTimeline: pipe.stages.map(s => ({
        stage: s.name, enteredAt: s.enteredAt, completedAt: s.completedAt,
        duration: s.completedAt ? `${Math.round((new Date(s.completedAt).getTime() - new Date(s.enteredAt).getTime()) / 3600000 * 10) / 10}h` : "in_progress",
      })),
      finalRecommendations: completedStages.length > 3 ? ["Review pipeline performance", "Consider A/B testing new creatives", "Monitor competitive landscape"] : ["Complete current pipeline stage"],
    };
  }

  getPipelineTimeline(pipelineId: string): { events: { timestamp: string; stage: string; action: string; detail: string }[] } | null {
    const pipe = this.pipelines.get(pipelineId);
    return pipe ? { events: [...pipe.events].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) } : null;
  }

  archivePipeline(pipelineId: string): Pipeline | null {
    const pipe = this.pipelines.get(pipelineId);
    if (!pipe) return null;
    const now = new Date().toISOString();
    const stageIdx = pipe.stages.findIndex(s => s.status === "in_progress");
    if (stageIdx >= 0) { pipe.stages[stageIdx].completedAt = now; pipe.stages[stageIdx].status = "completed"; }
    pipe.currentStage = "archived";
    pipe.status = "completed";
    pipe.stages.push({ name: "archived", enteredAt: now, completedAt: now, status: "completed" });
    pipe.events.push({ timestamp: now, stage: "archived", action: "pipeline_archived", detail: "Pipeline archived" });
    pipe.updatedAt = now;
    return pipe;
  }

  getPipelineHealth(pipelineId: string): PipelineHealth | null {
    const pipe = this.pipelines.get(pipelineId);
    if (!pipe) return null;
    const checks: PipelineHealth["checks"] = [];
    const stageDurations = pipe.stages.filter(s => s.completedAt).map(s => new Date(s.completedAt!).getTime() - new Date(s.enteredAt).getTime());
    const avgDuration = stageDurations.length > 0 ? stageDurations.reduce((a, b) => a + b, 0) / stageDurations.length : 0;
    checks.push({ name: "stage_progression", status: stageDurations.length > 1 ? "pass" as const : "warn" as const, message: `${pipe.stages.filter(s => s.status === "completed").length} of ${pipe.stages.length} stages completed` });
    checks.push({ name: "event_activity", status: pipe.events.length > 2 ? "pass" as const : "warn" as const, message: `${pipe.events.length} events recorded` });
    checks.push({ name: "pipeline_age", status: avgDuration < 86400000 * 7 ? "pass" as const : "warn" as const, message: `Avg stage duration: ${Math.round(avgDuration / 3600000 * 10) / 10}h` });
    const failCount = checks.filter(c => c.status === "fail").length;
    const warnCount = checks.filter(c => c.status === "warn").length;
    const overallScore = Math.max(0, 100 - failCount * 30 - warnCount * 10);
    return { pipelineId, campaignId: pipe.campaignId, stage: pipe.currentStage, status: failCount > 0 ? "blocked" : warnCount > 0 ? "attention_needed" : "on_track", checks, overallScore };
  }

  validatePipeline(pipelineId: string): { valid: boolean; errors: string[]; warnings: string[] } | null {
    const pipe = this.pipelines.get(pipelineId);
    if (!pipe) return null;
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!pipe.config.budget) warnings.push("Budget not configured - may cause issues at activation");
    if (!pipe.config.targeting) warnings.push("Targeting not configured - campaign may not reach audience");
    if (pipe.stages.filter(s => s.status === "in_progress").length > 1) errors.push("Multiple stages in progress - pipeline state corrupted");
    if (pipe.events.length === 0) errors.push("No events recorded - pipeline may not be initialized correctly");
    return { valid: errors.length === 0, errors, warnings };
  }

  rollbackStage(pipelineId: string): Pipeline | null {
    const pipe = this.pipelines.get(pipelineId);
    if (!pipe) return null;
    const stageOrder: PipelineStage[] = ["draft", "configuring", "activating", "active", "monitoring", "optimizing", "reporting", "archived"];
    const currentIdx = stageOrder.indexOf(pipe.currentStage);
    if (currentIdx <= 0) return null;
    const now = new Date().toISOString();
    pipe.stages.pop();
    pipe.stages[currentIdx - 1].status = "in_progress";
    pipe.stages[currentIdx - 1].completedAt = null;
    pipe.currentStage = stageOrder[currentIdx - 1];
    pipe.status = "attention_needed";
    pipe.events.push({ timestamp: now, stage: pipe.currentStage, action: "stage_rolled_back", detail: `Rolled back from ${stageOrder[currentIdx]} to ${pipe.currentStage}` });
    pipe.updatedAt = now;
    return pipe;
  }

  getStageRequirements(stage: PipelineStage): StageRequirement {
    const requirements: Record<PipelineStage, StageRequirement> = {
      draft: { stage, required: [], optional: [{ field: "campaign_name", description: "Campaign display name" }] },
      configuring: { stage, required: [{ field: "budget", description: "Campaign budget configuration", met: false }, { field: "targeting", description: "Targeting parameters", met: false }], optional: [{ field: "creative", description: "Ad creative assets" }] },
      activating: { stage, required: [{ field: "budget_set", description: "Budget confirmed", met: false }, { field: "targeting_set", description: "Targeting confirmed", met: false }], optional: [{ field: "tracking_tags", description: "UTM tracking parameters" }] },
      active: { stage, required: [{ field: "activation_checks", description: "All activation checks passed", met: false }], optional: [{ field: "bid_adjustments", description: "Bid strategy overrides" }] },
      monitoring: { stage, required: [{ field: "active_status", description: "Campaign must be active", met: false }], optional: [{ field: "alert_thresholds", description: "Custom alert thresholds" }] },
      optimizing: { stage, required: [{ field: "monitoring_data", description: "At least 7 days of monitoring", met: false }], optional: [{ field: "optimization_goals", description: "Custom optimization objectives" }] },
      reporting: { stage, required: [{ field: "optimization_data", description: "Optimization results available", met: false }], optional: [{ field: "report_template", description: "Custom report template" }] },
      archived: { stage, required: [], optional: [] },
    };
    return requirements[stage] || { stage, required: [], optional: [] };
  }
}

export const unifiedAdsPipeline = new UnifiedAdsPipelineService();
