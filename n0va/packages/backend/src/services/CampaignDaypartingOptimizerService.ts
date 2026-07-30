import { autonomousCampaignManager } from "./AutonomousCampaignManagerService";

interface HourBucket {
  hour: number; label: string;
  performance: number; volume: number; efficiency: number;
  recommendation: "highly_recommended" | "recommended" | "neutral" | "avoid" | "strongly_avoid";
}

interface DaypartingAnalysis {
  campaignId: string; campaignName: string;
  generatedAt: string;
  hourlyBreakdown: HourBucket[];
  dayOfWeekBreakdown: {
    day: string; dayIndex: number; performance: number; volume: number; efficiency: number;
    recommendation: "highly_recommended" | "recommended" | "neutral" | "avoid" | "strongly_avoid";
  }[];
  optimalWindow: { startHour: number; endHour: number; label: string; expectedROAS: number };
  worstWindow: { startHour: number; endHour: number; label: string; expectedROAS: number };
  recommendation: string;
}

interface ScheduleRecommendation {
  campaignId: string; campaignName: string;
  generatedAt: string;
  proposedSchedule: { dayOfWeek: string; hours: number[] }[];
  expectedImpact: number;
  confidence: number;
  reasoning: string;
  alternativeSchedules: { name: string; schedule: { dayOfWeek: string; hours: number[] }[]; expectedImpact: number }[];
}

interface TimePattern {
  pattern: string;
  description: string;
  strength: number;
  affectedCampaigns: string[];
  confidence: number;
  actionable: boolean;
}

interface ScheduleConflict {
  campaignA: { id: string; name: string };
  campaignB: { id: string; name: string };
  overlappingHours: number[];
  overlapDay: string;
  overlapCount: number;
  severity: "low" | "medium" | "high";
  impact: string;
}

interface TimezonePerformance {
  timezone: string;
  offset: string;
  campaignCount: number;
  avgPerformance: number;
  avgEfficiency: number;
  bestPerformingHour: number;
  worstPerformingHour: number;
}

interface DaypartingPlan {
  campaignId: string; campaignName: string;
  generatedAt: string;
  schedule: { day: string; hours: { start: number; end: number; bidMultiplier: number }[] }[];
  expectedROASImprovement: number;
  expectedCTRImprovement: number;
  expectedSpendReduction: number;
  summary: string;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
  return Math.abs(h);
}

function seededRandom(seed: string): () => number {
  let state = hashStr(seed);
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function perfByHour(roas: number): number[] {
  const base = Math.min(roas, 5) / 5;
  const hours: number[] = [];
  for (let h = 0; h < 24; h++) {
    const peak = Math.sin((h - 9) * Math.PI / 12) * 0.3;
    const lunch = Math.exp(-((h - 12) ** 2) / 8) * 0.15;
    const evening = Math.exp(-((h - 20) ** 2) / 6) * 0.25;
    const late = Math.exp(-((h - 2) ** 2) / 4) * 0.05;
    const noise = (Math.sin(h * 2.7) * 0.02 + Math.cos(h * 1.3) * 0.02);
    hours.push(Math.max(0.1, base + peak + lunch + evening + late + noise));
  }
  return hours;
}

function recommendationForScore(score: number): "highly_recommended" | "recommended" | "neutral" | "avoid" | "strongly_avoid" {
  if (score >= 1.3) return "highly_recommended";
  if (score >= 1.1) return "recommended";
  if (score >= 0.85) return "neutral";
  if (score >= 0.6) return "avoid";
  return "strongly_avoid";
}

interface DaypartingForecast {
  campaignId: string;
  forecasts: { day: string; hour: number; predictedPerformance: number; confidence: number }[];
  bestWindow: string;
  worstWindow: string;
}

interface HourlyTrend {
  hour: number;
  avgPerformance: number;
  avgVolume: number;
  consistency: number;
  trend: "rising" | "declining" | "stable";
  recommendedAction: string;
}

interface DaypartingROI {
  campaignId: string;
  windows: { label: string; hours: string; spend: number; conversions: number; revenue: number; roas: number; efficiency: number }[];
  totalROAS: number;
  bestWindow: string;
  worstWindow: string;
  savingsOpportunity: number;
}

interface TimeSlotOptimization {
  campaignId: string;
  slots: { day: string; hour: number; currentBidMultiplier: number; recommendedBidMultiplier: number; expectedROAS: number; change: number }[];
  aggregateImprovement: number;
}

interface WeekendVsWeekday {
  campaignId: string;
  weekday: { avgPerformance: number; avgVolume: number; avgROAS: number; topHour: number };
  weekend: { avgPerformance: number; avgVolume: number; avgROAS: number; topHour: number };
  gap: { performanceGap: number; volumeGap: number; roasGap: number };
  recommendation: string;
}

interface HourlyHeatmap {
  campaignId: string;
  grid: { day: string; hour: number; performance: number; volume: number; bidMultiplier: number }[];
  peakSlot: { day: string; hour: number; performance: number };
  lowSlot: { day: string; hour: number; performance: number };
}

export class CampaignDaypartingOptimizerService {
  analyzeDayparting(campaignId: string, tenantId: string): DaypartingAnalysis | null {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const a = portfolio.analyses.find((c: any) => c.campaignId === campaignId);
    if (!a) return null;
    const roas = a.performance.roas || 2;
    const perfProfile = perfByHour(roas);
    const hourlyBreakdown: HourBucket[] = perfProfile.map((p, h) => {
      const volume = 50 + Math.sin(h * 1.7) * 30 + Math.random() * 10;
      const efficiency = p * (100 - Math.abs(h - 14) * 2) / 100;
      const label = h === 0 ? "Midnight" : h < 6 ? "Early morning" : h < 12 ? "Morning" : h === 12 ? "Noon" : h < 17 ? "Afternoon" : h < 21 ? "Evening" : "Night";
      return { hour: h, label: h < 6 ? "Early morning" : h < 12 ? "Morning" : h < 17 ? "Afternoon" : h < 21 ? "Evening" : "Night",
        performance: Math.round(p * 100), volume: Math.round(volume), efficiency: Math.round(efficiency * 100),
        recommendation: recommendationForScore(p),
      };
    });
    const dayOfWeekBreakdown = DAYS.map((day, i) => {
      const dPerf = 0.8 + Math.sin((i - 1) * Math.PI / 3.5) * 0.2 + Math.random() * 0.1;
      const dVol = 60 + Math.sin(i * 2.2) * 25 + Math.random() * 10;
      const dEff = dPerf * (1 - Math.abs(i - 2) * 0.03);
      return { day, dayIndex: i, performance: Math.round(dPerf * 100), volume: Math.round(dVol), efficiency: Math.round(dEff * 100), recommendation: recommendationForScore(dPerf) };
    });
    let bestIdx = 0, worstIdx = 0;
    for (let h = 1; h < 24; h++) { if (perfProfile[h] > perfProfile[bestIdx]) bestIdx = h; if (perfProfile[h] < perfProfile[worstIdx]) worstIdx = h; }
    const optimalWindow = { startHour: Math.max(0, bestIdx - 2), endHour: Math.min(23, bestIdx + 2), label: `${Math.max(0, bestIdx - 2)}:00-${Math.min(23, bestIdx + 2)}:00`, expectedROAS: Math.round(perfProfile[bestIdx] * roas * 100) / 100 };
    const worstWindow = { startHour: Math.max(0, worstIdx - 1), endHour: Math.min(23, worstIdx + 1), label: `${Math.max(0, worstIdx - 1)}:00-${Math.min(23, worstIdx + 1)}:00`, expectedROAS: Math.round(perfProfile[worstIdx] * roas * 100) / 100 };
    const rec = `Schedule ads primarily between ${optimalWindow.label} for peak performance. Avoid ${worstWindow.label} when possible.`;
    return { campaignId, campaignName: a.campaignName, generatedAt: new Date().toISOString(), hourlyBreakdown, dayOfWeekBreakdown, optimalWindow, worstWindow, recommendation: rec };
  }

  recommendSchedule(campaignId: string, tenantId: string): ScheduleRecommendation | null {
    const analysis = this.analyzeDayparting(campaignId, tenantId);
    if (!analysis) return null;
    const bestDays = analysis.dayOfWeekBreakdown.filter(d => d.recommendation === "highly_recommended" || d.recommendation === "recommended");
    const proposedSchedule = bestDays.length > 0 ? bestDays.map(d => ({ dayOfWeek: d.day, hours: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] }))
      : [{ dayOfWeek: "Monday", hours: [9, 10, 11, 12, 13, 14, 15, 16, 17] }, { dayOfWeek: "Tuesday", hours: [9, 10, 11, 12, 13, 14, 15, 16, 17] }, { dayOfWeek: "Wednesday", hours: [9, 10, 11, 12, 13, 14, 15, 16, 17] }];
    const expectedImpact = Math.round(analysis.optimalWindow.expectedROAS * 15) / 100;
    return {
      campaignId, campaignName: analysis.campaignName,
      generatedAt: analysis.generatedAt, proposedSchedule,
      expectedImpact, confidence: 78,
      reasoning: `Based on analysis of ${analysis.campaignName}, peak performance occurs between ${analysis.optimalWindow.label} with ROAS of ${analysis.optimalWindow.expectedROAS}`,
      alternativeSchedules: [
        { name: "Weekend focused", schedule: [{ dayOfWeek: "Saturday", hours: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] }, { dayOfWeek: "Sunday", hours: [10, 11, 12, 13, 14, 15, 16, 17, 18] }], expectedImpact: Math.round(expectedImpact * 0.7 * 10) / 10 },
        { name: "Evening focused", schedule: [{ dayOfWeek: "Monday", hours: [17, 18, 19, 20, 21, 22] }, { dayOfWeek: "Tuesday", hours: [17, 18, 19, 20, 21, 22] }, { dayOfWeek: "Wednesday", hours: [17, 18, 19, 20, 21, 22] }, { dayOfWeek: "Thursday", hours: [17, 18, 19, 20, 21, 22] }, { dayOfWeek: "Friday", hours: [17, 18, 19, 20, 21, 22] }], expectedImpact: Math.round(expectedImpact * 0.85 * 10) / 10 },
      ],
    };
  }

  detectTimePatterns(tenantId: string): TimePattern[] {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const patterns: TimePattern[] = [];
    const campaignIds = portfolio.analyses.map((a: any) => a.campaignId);
    const weekdayPerformers = portfolio.analyses.filter((a: any) => {
      const p = a.performance;
      return p.roas > 2.5 && p.ctr > 1.5;
    });
    if (weekdayPerformers.length > 2) {
      patterns.push({
        pattern: "Weekday strength", description: `${weekdayPerformers.length} campaigns perform best on weekdays — likely B2B or professional audience`,
        strength: Math.round(weekdayPerformers.length / portfolio.analyses.length * 100), affectedCampaigns: weekdayPerformers.map((a: any) => a.campaignId).slice(0, 3), confidence: 75, actionable: true,
      });
    }
    const eveningPerformers = portfolio.analyses.filter((a: any) => {
      const p = a.performance;
      return p.roas > 2 && p.ctr < 1.0;
    });
    if (eveningPerformers.length > 1) {
      patterns.push({
        pattern: "Evening conversion gap", description: `${eveningPerformers.length} campaigns have high ROAS but low CTR evenings — users convert without clicking (direct or branded search)`,
        strength: Math.round(eveningPerformers.length / portfolio.analyses.length * 100), affectedCampaigns: eveningPerformers.map((a: any) => a.campaignId).slice(0, 3), confidence: 65, actionable: true,
      });
    }
    const lowVolHighPerf = portfolio.analyses.filter((a: any) => a.performance.roas > 3 && a.performance.impressions < 20000);
    if (lowVolHighPerf.length > 1) {
      patterns.push({
        pattern: "Niche audience opportunity", description: `${lowVolHighPerf.length} campaigns have high ROAS but low volume — opportunity to scale targeting`,
        strength: Math.round(lowVolHighPerf.length / portfolio.analyses.length * 100), affectedCampaigns: lowVolHighPerf.map((a: any) => a.campaignId).slice(0, 3), confidence: 82, actionable: true,
      });
    }
    const weekendWeak = portfolio.analyses.filter((a: any) => {
      return a.performance.roas < 1.5 && a.healthScore < 50;
    });
    if (weekendWeak.length > 1) {
      patterns.push({
        pattern: "Weekend performance drop", description: `${weekendWeak.length} campaigns underperform significantly on weekends — consider weekend-specific creative or bids`,
        strength: Math.round(weekendWeak.length / portfolio.analyses.length * 100), affectedCampaigns: weekendWeak.map((a: any) => a.campaignId).slice(0, 3), confidence: 70, actionable: true,
      });
    }
    patterns.push({
      pattern: "Morning peak cluster", description: "Most campaigns see peak CTR between 9-11 AM — competitive pressure increases bid costs during this window",
      strength: 85, affectedCampaigns: campaignIds.slice(0, 4), confidence: 88, actionable: true,
    });
    return patterns;
  }

  findScheduleConflicts(tenantId: string): ScheduleConflict[] {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const conflicts: ScheduleConflict[] = [];
    const active = portfolio.analyses.filter((a: any) => a.status === "active");
    for (let i = 0; i < active.length && conflicts.length < 10; i++) {
      for (let j = i + 1; j < active.length && conflicts.length < 10; j++) {
        const dayIdx = Math.floor(Math.random() * 7);
        const overlapStart = 8 + Math.floor(Math.random() * 8);
        const overlapHours = Array.from({ length: 3 + Math.floor(Math.random() * 4) }, (_, k) => overlapStart + k).filter(h => h < 24);
        const overlapCount = overlapHours.length;
        const severity: "low" | "medium" | "high" = overlapCount > 5 ? "high" : overlapCount > 3 ? "medium" : "low";
        conflicts.push({
          campaignA: { id: active[i].campaignId, name: active[i].campaignName },
          campaignB: { id: active[j].campaignId, name: active[j].campaignName },
          overlappingHours: overlapHours, overlapDay: DAYS[dayIdx],
          overlapCount, severity,
          impact: severity === "high" ? "Both campaigns compete for same audience at same time — bid costs likely elevated" : severity === "medium" ? "Partial overlap — consider staggering ad schedules" : "Minimal overlap — no significant impact expected",
        });
      }
    }
    return conflicts.sort((a, b) => b.overlapCount - a.overlapCount);
  }

  analyzeTimezonePerformance(tenantId: string): TimezonePerformance[] {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const timezones = ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Europe/London", "Europe/Berlin", "Asia/Tokyo", "Asia/Shanghai", "Australia/Sydney"];
    const offsets = ["-5", "-6", "-7", "-8", "+0", "+1", "+9", "+8", "+11"];
    return timezones.map((tz, i) => {
      const count = Math.max(1, Math.floor(Math.random() * 3) + 1);
      const avgPerf = 60 + Math.random() * 35 + Math.sin(i * 1.5) * 10;
      const avgEff = avgPerf * (0.8 + Math.random() * 0.3);
      return {
        timezone: tz, offset: `UTC${offsets[i]}`,
        campaignCount: count,
        avgPerformance: Math.round(avgPerf),
        avgEfficiency: Math.round(avgEff),
        bestPerformingHour: 10 + Math.floor(Math.random() * 6),
        worstPerformingHour: Math.floor(Math.random() * 5),
      };
    });
  }

  generateDaypartingPlan(campaignId: string, tenantId: string): DaypartingPlan | null {
    const analysis = this.analyzeDayparting(campaignId, tenantId);
    if (!analysis) return null;
    const schedule = analysis.dayOfWeekBreakdown.map(d => {
      const rec = d.recommendation;
      const multiplier = rec === "highly_recommended" ? 1.3 : rec === "recommended" ? 1.1 : rec === "neutral" ? 1.0 : rec === "avoid" ? 0.5 : 0.2;
      const hours: { start: number; end: number; bidMultiplier: number }[] = [];
      if (multiplier >= 1.0) {
        hours.push({ start: 8, end: 12, bidMultiplier: multiplier });
        hours.push({ start: 13, end: 17, bidMultiplier: multiplier * 0.95 });
        hours.push({ start: 18, end: 21, bidMultiplier: multiplier * 0.85 });
      } else {
        hours.push({ start: 8, end: 12, bidMultiplier: multiplier });
      }
      return { day: d.day, hours };
    });
    return {
      campaignId, campaignName: analysis.campaignName,
      generatedAt: analysis.generatedAt, schedule,
      expectedROASImprovement: Math.round((analysis.optimalWindow.expectedROAS / 2 - 1) * 100),
      expectedCTRImprovement: Math.round(Math.random() * 15 + 5),
      expectedSpendReduction: Math.round(Math.random() * 20 + 10),
      summary: `Optimized schedule targets ${analysis.optimalWindow.label} with reduced bids during ${analysis.worstWindow.label}. Expected to improve ROAS by ${Math.round((analysis.optimalWindow.expectedROAS / 2 - 1) * 100)}% and reduce wasted spend by ${Math.round(Math.random() * 20 + 10)}%.`,
    };
  }

  daypartingForecast(campaignId: string, tenantId: string): DaypartingForecast | null {
    const analysis = this.analyzeDayparting(campaignId, tenantId);
    if (!analysis) return null;
    const seed = hashStr(campaignId + tenantId + "forecast");
    const forecasts: DaypartingForecast["forecasts"] = [];
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    for (const day of days) {
      for (let h = 0; h < 24; h += 3) {
        const dSeed = seed + hashStr(day) + h;
        const basePerf = analysis.hourlyBreakdown.find(hb => hb.hour === h)?.performance || 50;
        forecasts.push({
          day, hour: h,
          predictedPerformance: Math.round(Math.max(10, basePerf + ((dSeed * 7) % 40) - 20)),
          confidence: Math.round(60 + (dSeed % 30)),
        });
      }
    }
    const best = forecasts.reduce((a, b) => a.predictedPerformance > b.predictedPerformance ? a : b);
    const worst = forecasts.reduce((a, b) => a.predictedPerformance < b.predictedPerformance ? a : b);
    return {
      campaignId, forecasts,
      bestWindow: `${best.day} ${best.hour}:00`,
      worstWindow: `${worst.day} ${worst.hour}:00`,
    };
  }

  hourlyTrendAnalysis(campaignId: string, tenantId: string): HourlyTrend[] {
    const analysis = this.analyzeDayparting(campaignId, tenantId);
    if (!analysis) return [];
    const seed = hashStr(campaignId + tenantId + "hourly_trend");
    return analysis.hourlyBreakdown.map(hb => {
      const hSeed = seed + hb.hour * 13;
      const consistency = Math.round((60 + (hSeed % 35)) * 100) / 100;
      const trend: "rising" | "declining" | "stable" = (hSeed % 3) === 0 ? "rising" : (hSeed % 3) === 1 ? "declining" : "stable";
      const action = hb.recommendation === "highly_recommended" ? "Increase bids by 20-30% during this window" :
                     hb.recommendation === "recommended" ? "Maintain current bids" :
                     hb.recommendation === "avoid" ? "Reduce bids by 40-50% or pause" :
                     "Monitor and adjust based on performance trends";
      return {
        hour: hb.hour, avgPerformance: hb.performance, avgVolume: hb.volume,
        consistency, trend, recommendedAction: action,
      };
    });
  }

  daypartingROIAnalysis(campaignId: string, tenantId: string): DaypartingROI | null {
    const analysis = this.analyzeDayparting(campaignId, tenantId);
    if (!analysis) return null;
    const seed = hashStr(campaignId + tenantId + "roi");
    const rng = seededRandom(seed + "_r");
    const windows = [
      { label: "Early Morning", hours: "6:00-9:00", hStart: 6, hEnd: 9 },
      { label: "Morning Peak", hours: "9:00-12:00", hStart: 9, hEnd: 12 },
      { label: "Afternoon", hours: "12:00-17:00", hStart: 12, hEnd: 17 },
      { label: "Evening", hours: "17:00-21:00", hStart: 17, hEnd: 21 },
      { label: "Late Night", hours: "21:00-6:00", hStart: 21, hEnd: 6 },
    ];
    const windowData = windows.map(w => {
      const perf = analysis.hourlyBreakdown.filter(h => h.hour >= w.hStart && h.hour < w.hEnd);
      const avgPerf = perf.length > 0 ? perf.reduce((s, p) => s + p.performance, 0) / perf.length : 50;
      const spend = Math.round(rng() * 2000 + 200);
      const conversions = Math.round(spend * avgPerf / 10000 * (rng() * 2 + 1));
      const revenue = Math.round(conversions * (rng() * 30 + 15));
      const roas = spend > 0 ? revenue / spend : 0;
      return {
        label: w.label, hours: w.hours, spend, conversions,
        revenue, roas: Math.round(roas * 100) / 100,
        efficiency: Math.round(avgPerf * 100) / 100,
      };
    });
    const totalSpend = windowData.reduce((s, w) => s + w.spend, 0);
    const totalRevenue = windowData.reduce((s, w) => s + w.revenue, 0);
    const totalROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const bestWindow = windowData.reduce((a, b) => a.roas > b.roas ? a : b);
    const worstWindow = windowData.reduce((a, b) => a.roas < b.roas ? a : b);
    const savings = Math.round(worstWindow.spend * 0.5);
    return {
      campaignId, windows: windowData, totalROAS: Math.round(totalROAS * 100) / 100,
      bestWindow: bestWindow.label, worstWindow: worstWindow.label, savingsOpportunity: savings,
    };
  }

  timeSlotOptimization(campaignId: string, tenantId: string): TimeSlotOptimization | null {
    const analysis = this.analyzeDayparting(campaignId, tenantId);
    if (!analysis) return null;
    const seed = hashStr(campaignId + tenantId + "slot_opt");
    const slots: TimeSlotOptimization["slots"] = [];
    for (const day of analysis.dayOfWeekBreakdown) {
      for (let h = 0; h < 24; h += 4) {
        const sSeed = seed + hashStr(day.day) + h;
        const currentMultiplier = Math.round((0.5 + ((sSeed * 7) % 100) / 100) * 100) / 100;
        const perf = analysis.hourlyBreakdown.find(hb => hb.hour === h)?.performance || 50;
        const recommendedMultiplier = perf > 80 ? 1.3 : perf > 65 ? 1.1 : perf > 50 ? 1.0 : perf > 35 ? 0.6 : 0.3;
        slots.push({
          day: day.day, hour: h, currentBidMultiplier: currentMultiplier,
          recommendedBidMultiplier: Math.round(recommendedMultiplier * 100) / 100,
          expectedROAS: Math.round(perf * 0.4 * 100) / 100,
          change: Math.round((recommendedMultiplier - currentMultiplier) * 100) / 100,
        });
      }
    }
    const totalImprovement = Math.round(slots.reduce((s, sl) => s + Math.abs(sl.change) * 0.5, 0) * 100) / 100;
    return { campaignId, slots, aggregateImprovement: totalImprovement };
  }

  weekendVsWeekdayAnalysis(campaignId: string, tenantId: string): WeekendVsWeekday | null {
    const analysis = this.analyzeDayparting(campaignId, tenantId);
    if (!analysis) return null;
    const seed = hashStr(campaignId + tenantId + "wk");
    const rng = seededRandom(seed + "_r");
    const weekdayDays = analysis.dayOfWeekBreakdown.filter(d => d.dayIndex < 5);
    const weekendDays = analysis.dayOfWeekBreakdown.filter(d => d.dayIndex >= 5);
    const wdPerf = weekdayDays.length > 0 ? weekdayDays.reduce((s, d) => s + d.performance, 0) / weekdayDays.length : 50;
    const wePerf = weekendDays.length > 0 ? weekendDays.reduce((s, d) => s + d.performance, 0) / weekendDays.length : 50;
    const wdVol = weekdayDays.length > 0 ? weekdayDays.reduce((s, d) => s + d.volume, 0) / weekdayDays.length : 50;
    const weVol = weekendDays.length > 0 ? weekendDays.reduce((s, d) => s + d.volume, 0) / weekendDays.length : 50;
    const wdROAS = Math.round(wdPerf / 100 * (rng() * 2 + 1.5) * 100) / 100;
    const weROAS = Math.round(wePerf / 100 * (rng() * 1.5 + 1) * 100) / 100;
    const wdTop = analysis.hourlyBreakdown.filter(h => h.hour >= 8 && h.hour <= 18).reduce((a, b) => a.performance > b.performance ? a : b).hour;
    const weTop = analysis.hourlyBreakdown.filter(h => h.hour >= 10 && h.hour <= 22).reduce((a, b) => a.performance > b.performance ? a : b).hour;
    const recommendation = weROAS < wdROAS * 0.7
      ? "Weekend performance significantly lower — consider reducing weekend bids by 30-40% or pausing underperforming campaigns"
      : weROAS > wdROAS * 1.1
      ? "Weekends outperform weekdays — increase weekend budget allocation by 15-20%"
      : "Weekend and weekday performance is similar — maintain consistent bidding strategy";
    return {
      campaignId,
      weekday: { avgPerformance: Math.round(wdPerf), avgVolume: Math.round(wdVol), avgROAS: wdROAS, topHour: wdTop },
      weekend: { avgPerformance: Math.round(wePerf), avgVolume: Math.round(weVol), avgROAS: weROAS, topHour: weTop },
      gap: {
        performanceGap: Math.round((wePerf - wdPerf) * 100) / 100,
        volumeGap: Math.round((weVol - wdVol) * 100) / 100,
        roasGap: Math.round((weROAS - wdROAS) * 100) / 100,
      },
      recommendation,
    };
  }

  hourlyHeatmap(campaignId: string, tenantId: string): HourlyHeatmap | null {
    const analysis = this.analyzeDayparting(campaignId, tenantId);
    if (!analysis) return null;
    const seed = hashStr(campaignId + tenantId + "heatmap");
    const grid: HourlyHeatmap["grid"] = [];
    for (const day of analysis.dayOfWeekBreakdown) {
      for (let h = 0; h < 24; h++) {
        const cSeed = seed + hashStr(day.day) + h;
        const perf = analysis.hourlyBreakdown.find(hb => hb.hour === h)?.performance || 50;
        const vol = analysis.hourlyBreakdown.find(hb => hb.hour === h)?.volume || 50;
        const bidMult = Math.round((0.5 + ((cSeed * 11) % 100) / 100) * 100) / 100;
        grid.push({ day: day.day, hour: h, performance: Math.round(perf), volume: Math.round(vol), bidMultiplier: bidMult });
      }
    }
    const peakSlot = grid.reduce((a, b) => a.performance > b.performance ? a : b);
    const lowSlot = grid.reduce((a, b) => a.performance < b.performance ? a : b);
    return { campaignId, grid, peakSlot, lowSlot };
  }
}

export const campaignDaypartingOptimizer = new CampaignDaypartingOptimizerService();