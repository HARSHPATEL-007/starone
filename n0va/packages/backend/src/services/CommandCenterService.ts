import { DataStore } from "./DataStore";
import { autonomousCampaignManager } from "./AutonomousCampaignManagerService";
import { campaignRealTimeMonitor } from "./CampaignRealTimeMonitorService";
import { campaignCreativeOptimizer } from "./CampaignCreativeOptimizerService";
import { campaignSaturationService } from "./CampaignSaturationService";
import { campaignScorecardService } from "./CampaignScorecardService";

export class CommandCenterService {
  commandCenterSummary(tenantId: string): {
    generatedAt: string;
    cards: {
      roas: { value: number; changePercent: number; direction: "up" | "down" | "flat"; label: string };
      budgetPacing: { percent: number; label: string; dailyBudget: number; spentToday: number };
      alerts: { count: number; top: { id: string; title: string; severity: string }[]; label: string };
      aiSuggestions: { count: number; top: { title: string; action: string }[]; label: string };
    };
  } {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const metricsAll = DataStore.mem().find("metrics", (m: any) => m.tenantId === tenantId) as any[];
    const today = metricsAll[metricsAll.length - 1];
    const yesterday = metricsAll[metricsAll.length - 2];
    const spendToday = metricsAll.reduce((s, m) => s + (m.spend || 0), 0);
    const revenueToday = metricsAll.reduce((s, m) => s + (m.revenue || 0), 0);
    const roasToday = spendToday > 0 ? revenueToday / spendToday : 0;
    const spendPrev = metricsAll.slice(0, Math.max(0, metricsAll.length - 1)).reduce((s, m) => s + (m.spend || 0), 0);
    const revenuePrev = metricsAll.slice(0, Math.max(0, metricsAll.length - 1)).reduce((s, m) => s + (m.revenue || 0), 0);
    const roasPrev = spendPrev > 0 ? revenuePrev / spendPrev : 0;
    const roasChange = roasPrev > 0 ? ((roasToday - roasPrev) / roasPrev) * 100 : 0;

    const campaigns = DataStore.mem().find("campaigns", (c: any) => c.tenantId === tenantId) as any[];
    const dailyBudget = campaigns.reduce((s, c) => s + (c.budget?.daily || 0), 0);
    const pacing = dailyBudget > 0 ? Math.min(100, Math.round((spendToday / dailyBudget) * 100)) : 0;

    const realTime = campaignRealTimeMonitor.portfolioRealTimeSummary(tenantId);
    const top = (realTime.topConcerns || []).slice(0, 3).map((c: any, i: number) => ({
      id: `${c.campaignId || "c"}-${i}`, title: c.concern || c.message || "Concern", severity: c.severity || "medium",
    }));

    const creative = campaignCreativeOptimizer.creativePortfolioHealth(tenantId);
    const saturation = campaignSaturationService.saturationPortfolioOverview(tenantId);
    const suggestions: { title: string; action: string }[] = [];
    if (creative.totals.refreshNeeded > 0) suggestions.push({ title: `${creative.totals.refreshNeeded} campaigns need creative refresh`, action: "Refresh fatigued creatives" });
    if (saturation.totals.criticalOrHigh > 0) suggestions.push({ title: `${saturation.totals.criticalOrHigh} campaigns saturated`, action: "Apply saturation mitigation" });
    if (realTime.alertsActive > 0) suggestions.push({ title: `${realTime.alertsActive} live alerts`, action: "Run alert triage" });
    suggestions.push({ title: "Rebalance portfolio budget", action: "Generate rebalance plan" });

    return {
      generatedAt: new Date().toISOString(),
      cards: {
        roas: {
          value: Math.round(roasToday * 100) / 100,
          changePercent: Math.round(roasChange * 100) / 100,
          direction: roasChange > 1 ? "up" : roasChange < -1 ? "down" : "flat",
          label: "Today's ROAS vs previous period",
        },
        budgetPacing: {
          percent: pacing,
          label: `${pacing}% of daily $${Math.round(dailyBudget).toLocaleString()} budget used`,
          dailyBudget: Math.round(dailyBudget * 100) / 100,
          spentToday: Math.round(spendToday * 100) / 100,
        },
        alerts: { count: realTime.alertsActive, top, label: `${realTime.alertsActive} active alerts` },
        aiSuggestions: { count: suggestions.length, top: suggestions.slice(0, 3), label: `${suggestions.length} suggestions ready` },
      },
    };
  }

  dailyBriefing(tenantId: string): { generatedAt: string; briefing: string; sections: string[] } {
    const summary = this.commandCenterSummary(tenantId);
    const scorecard = campaignScorecardService.scorecardDailySnapshot(tenantId);
    const sections: string[] = [];
    sections.push(`ROAS is ${summary.cards.roas.value}x (${summary.cards.roas.direction === "up" ? "+" : ""}${summary.cards.roas.changePercent}% vs previous period).`);
    sections.push(`Budget pacing at ${summary.cards.budgetPacing.percent}% of daily budget.`);
    sections.push(`${summary.cards.alerts.count} active alerts — top: ${summary.cards.alerts.top.map(a => a.title).join("; ") || "none"}.`);
    sections.push(`${summary.cards.aiSuggestions.count} suggestions ready — ${summary.cards.aiSuggestions.top.map(s => s.action).join("; ")}.`);
    if (scorecard.averageScore) sections.push(`Portfolio scorecard average: ${Math.round(scorecard.averageScore * 100) / 100}/100 with ${scorecard.needsAttention?.length || 0} campaigns needing attention.`);
    const briefing = `Good morning. ${sections.join(" ")} One-click actions are ready when you are.`;
    return { generatedAt: new Date().toISOString(), briefing, sections };
  }

  parseVoiceCommand(text: string): { intent: string; params: Record<string, any>; confidence: number; action: string; summary: string } {
    const t = String(text || "").trim().toLowerCase();
    const dollar = t.match(/\$([\d,.]+)\s*k?/);
    const amount = dollar ? parseFloat(dollar[1].replace(/,/g, "")) * (dollar[0].toLowerCase().includes("k") ? 1000 : 1) : 0;
    const platformMatch = t.match(/(meta|facebook|google|tiktok|linkedin|youtube|snapchat|pinterest|all platforms)/);
    const platform = platformMatch ? platformMatch[1] : null;

    if (/pause|stop|halt/.test(t) && platform) {
      return { intent: "pause_platform", params: { platform }, confidence: 0.95, action: "pause_campaigns", summary: `Pause all ${platform} campaigns` };
    }
    if (/pause|stop|halt/.test(t) && /campaign/.test(t)) {
      return { intent: "pause_campaign", params: { campaign: t.replace(/.*pause\s*(the\s*)?/, "").trim() }, confidence: 0.8, action: "pause_campaign", summary: "Pause campaign" };
    }
    if (/shift|move|transfer/.test(t) && amount > 0 && platform) {
      const from = t.match(/from\s+(meta|facebook|google|tiktok|linkedin|youtube)/);
      return { intent: "shift_budget", params: { amount, to: platform, from: from ? from[1] : null }, confidence: 0.92, action: "shift_budget", summary: `Shift $${amount.toLocaleString()} to ${platform}` };
    }
    if (/how.*roas|roas.*(today|this week|this month)/.test(t) || /how.*(performance|doing)/.test(t)) {
      const period = /this month/.test(t) ? "month" : /this week/.test(t) ? "week" : "today";
      return { intent: "query_metric", params: { metric: "roas", period }, confidence: 0.9, action: "show_metric", summary: `Show ROAS for ${period}` };
    }
    if (/fatigued creatives|creative.*fatigue/.test(t)) {
      return { intent: "show_fatigued", params: {}, confidence: 0.95, action: "show_fatigued_creatives", summary: "Show fatigued creatives" };
    }
    if (/best audience|worst audience/.test(t)) {
      return { intent: "query_audience", params: { quality: /worst/.test(t) ? "worst" : "best" }, confidence: 0.85, action: "rank_audiences", summary: `Rank audiences by ROAS (${/worst/.test(t) ? "worst" : "best"})` };
    }
    if (/generate.*(banner|creative|ad)/.test(t) || /create.*(banner|creative|ad)/.test(t)) {
      const topic = t.replace(/.*(generate|create)\s*/, "").replace(/\s*(banner|creative|ad).*/, "").trim();
      return { intent: "generate_creative", params: { topic }, confidence: 0.85, action: "generate_creative", summary: `Generate ${topic || "new"} creative (3 variants)` };
    }
    if (/email me/.test(t) && /report/.test(t)) {
      return { intent: "email_report", params: { period: /yesterday/.test(t) ? "yesterday" : /last week/.test(t) ? "last_week" : "current" }, confidence: 0.9, action: "email_report", summary: "Email report" };
    }
    if (/schedule.*(review|meeting)/.test(t)) {
      const day = (t.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/) || [])[1] || "this week";
      return { intent: "schedule_review", params: { day }, confidence: 0.85, action: "create_calendar_event", summary: `Schedule campaign review for ${day}` };
    }
    if (/launch|create.*campaign/.test(t)) {
      const budget = /with\s+(\$[\d,.]+)/.test(t) ? amount : 0;
      const audience = t.match(/for\s+([a-z\s]+?)(\s+with|\s+budget|$)/);
      return { intent: "launch_campaign", params: { audience: audience ? audience[1].trim() : "general", budget }, confidence: 0.75, action: "launch_campaign", summary: `Launch campaign for ${audience ? audience[1].trim() : "general"}${budget > 0 ? ` with $${budget.toLocaleString()}` : ""}` };
    }
    if (/fix\s+(.+)/.test(t)) {
      return { intent: "fix_campaign", params: { campaign: t.replace(/fix\s+/, "").trim() }, confidence: 0.7, action: "diagnose_and_fix", summary: `Diagnose and fix ${t.replace(/fix\s+/, "").trim()}` };
    }
    return { intent: "unknown", params: {}, confidence: 0.2, action: "clarify", summary: "I couldn't parse that command — try one of the quick actions" };
  }

  quickActions(tenantId: string): { generatedAt: string; actions: { id: string; label: string; icon: string; endpoint: string; method: string; count?: number }[] } {
    const creative = campaignCreativeOptimizer.creativePortfolioHealth(tenantId);
    const saturation = campaignSaturationService.saturationPortfolioOverview(tenantId);
    const realTime = campaignRealTimeMonitor.portfolioRealTimeSummary(tenantId);
    return {
      generatedAt: new Date().toISOString(),
      actions: [
        { id: "new_campaign", label: "New campaign", icon: "🚀", endpoint: "/campaign-templates", method: "GET" },
        { id: "apply_bids", label: "Apply bid adjustments", icon: "💰", endpoint: "/bidding-batch-apply-adjustments", method: "POST", count: realTime.alertsActive },
        { id: "refresh_creatives", label: "Refresh creatives", icon: "🎨", endpoint: "/creative-batch-refresh-plan", method: "GET", count: creative.totals.refreshNeeded },
        { id: "mitigate_saturation", label: "Mitigate saturation", icon: "🛡️", endpoint: "/saturation-batch-mitigation", method: "GET", count: saturation.totals.criticalOrHigh },
        { id: "rebalance_budget", label: "Rebalance budget", icon: "⚖️", endpoint: "/budget-rebalance-plan", method: "GET" },
        { id: "daily_report", label: "Daily report", icon: "📊", endpoint: "/daily-execution-dashboard", method: "GET" },
      ],
    };
  }
}

export const commandCenter = new CommandCenterService();
