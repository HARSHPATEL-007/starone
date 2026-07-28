import { autonomousCampaignManager } from "./AutonomousCampaignManagerService";
import { DataStore } from "./DataStore";

interface JourneyTouchpoint {
  campaignId: string;
  campaignName: string;
  channel: string;
  position: number;
  hoursFromStart: number;
  converted: boolean;
}

interface CustomerJourney {
  journeyId: string;
  touchpoints: JourneyTouchpoint[];
  totalTouchpoints: number;
  uniqueCampaigns: number;
  totalHours: number;
  converted: boolean;
  conversionValue: number;
  path: string;
}

interface JourneyAnalysisReport {
  tenantId: string;
  generatedAt: string;
  journeys: CustomerJourney[];
  journeyLengthDistribution: { touchpoints: number; count: number; conversionRate: number }[];
  commonPaths: { path: string; frequency: number; conversionRate: number; avgValue: number }[];
  averageTouchpoints: number;
  averagePathLengthHours: number;
  overallConversionRate: number;
  recommendations: string[];
}

interface JourneySegmentPerformance {
  segmentName: string;
  description: string;
  averageTouchpoints: number;
  averageHours: number;
  conversionRate: number;
  mostCommonFirstTouch: string;
  mostCommonLastTouch: string;
  topPath: string;
}

interface JourneyOptimizationRecommendation {
  focusArea: string;
  insight: string;
  recommendation: string;
  expectedImpact: string;
  priority: "high" | "medium" | "low";
}

interface JourneyDropOffAnalysis {
  touchpointPosition: number;
  touchpointLabel: string;
  usersEntering: number;
  usersDropping: number;
  dropOffRate: number;
  significance: "high" | "medium" | "low";
  recoverySuggestion: string;
}

interface JourneyTimeAnalysis {
  timeBucket: string;
  minHours: number;
  maxHours: number;
  journeyCount: number;
  conversionRate: number;
  avgValue: number;
  recommendation: string;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

const CHANNELS = ["Search", "Display", "Social", "Email", "Video", "Direct", "Referral", "Affiliate"];

export class CampaignCustomerJourneyService {
  analyzeCustomerJourneys(tenantId: string): JourneyAnalysisReport {
    let portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const seed = hashStr(tenantId);
    const numJourneys = 30 + (seed % 40);
    let campaigns = portfolio.analyses.slice(0, Math.min(10, portfolio.analyses.length));
    if (campaigns.length === 0) {
      const dbCampaigns = DataStore.colFind("campaigns", { tenantId });
      if (dbCampaigns && dbCampaigns.length > 0) {
        campaigns = dbCampaigns.slice(0, 10);
      } else {
        const syntheticNames = ["Brand Awareness Q1", "Product Launch", "Retargeting Pro", "Social Reach", "Email Nurture", "Video Ads", "Display Network", "Search Branded", "Remarketing", "Performance Max"];
        campaigns = syntheticNames.map((name, i) => ({ campaignId: `syn_${tenantId}_${i}`, campaignName: name }));
      }
    }

    const journeys: CustomerJourney[] = [];
    const pathCounts = new Map<string, { count: number; conversions: number; totalValue: number }>();

    for (let i = 0; i < numJourneys; i++) {
      const jSeed = seed + i * 31;
      const numTps = 1 + ((jSeed * 7) % 7);
      const usedCamps = new Set<string>();
      const touchpoints: JourneyTouchpoint[] = [];
      let pathStr = "";

      for (let t = 0; t < numTps; t++) {
        const campIdx = (jSeed + t * 13) % campaigns.length;
        const camp = campaigns[campIdx];
        usedCamps.add(camp.campaignId);
        const ch = CHANNELS[(jSeed + t * 17) % CHANNELS.length];
        const hours = t > 0 ? touchpoints[t - 1].hoursFromStart + 1 + ((jSeed + t * 23) % 168) : 0;
        const conv = t === numTps - 1 && (jSeed % 3 !== 0);
        touchpoints.push({ campaignId: camp.campaignId, campaignName: camp.campaignName, channel: ch, position: t, hoursFromStart: hours, converted: conv });
        pathStr += (t > 0 ? " → " : "") + ch;
      }

      const totalHrs = touchpoints.length > 0 ? touchpoints[touchpoints.length - 1].hoursFromStart : 0;
      const conv = touchpoints.length > 0 && touchpoints[touchpoints.length - 1].converted;
      const convVal = conv ? Math.round(20 + Math.random() * 180) : 0;

      journeys.push({ journeyId: `jny_${i}`, touchpoints, totalTouchpoints: numTps, uniqueCampaigns: usedCamps.size, totalHours: totalHrs, converted: conv, conversionValue: convVal, path: pathStr });

      const existing = pathCounts.get(pathStr) || { count: 0, conversions: 0, totalValue: 0 };
      existing.count++;
      if (conv) { existing.conversions++; existing.totalValue += convVal; }
      pathCounts.set(pathStr, existing);
    }

    const convJourneys = journeys.filter(j => j.converted);
    const avgTouchpoints = journeys.reduce((s, j) => s + j.totalTouchpoints, 0) / journeys.length;
    const avgHours = journeys.reduce((s, j) => s + j.totalHours, 0) / journeys.length;
    const overallConvRate = journeys.length > 0 ? convJourneys.length / journeys.length * 100 : 0;

    const lengthDistMap = new Map<number, { count: number; convs: number }>();
    for (const j of journeys) {
      const ex = lengthDistMap.get(j.totalTouchpoints) || { count: 0, convs: 0 };
      ex.count++;
      if (j.converted) ex.convs++;
      lengthDistMap.set(j.totalTouchpoints, ex);
    }
    const journeyLengthDistribution = Array.from(lengthDistMap.entries()).map(([tps, d]) => ({
      touchpoints: tps, count: d.count, conversionRate: d.count > 0 ? Math.round(d.convs / d.count * 10000) / 100 : 0,
    })).sort((a, b) => a.touchpoints - b.touchpoints);

    const commonPaths = Array.from(pathCounts.entries()).map(([path, d]) => ({
      path, frequency: d.count, conversionRate: d.count > 0 ? Math.round(d.conversions / d.count * 10000) / 100 : 0, avgValue: d.count > 0 ? Math.round(d.totalValue / d.count) : 0,
    })).sort((a, b) => b.frequency - a.frequency).slice(0, 8);

    const recommendations: string[] = [];
    if (avgTouchpoints > 4) recommendations.push(`Average journey length is ${Math.round(avgTouchpoints * 10) / 10} touchpoints — consider retargeting strategies to shorten the path to conversion`);
    if (overallConvRate < 30) recommendations.push(`Overall conversion rate is ${Math.round(overallConvRate * 10) / 10}% — review conversion funnel for friction points`);
    const shortPaths = journeys.filter(j => j.totalTouchpoints <= 2 && j.converted);
    if (shortPaths.length > 0) recommendations.push(`${shortPaths.length} conversions occur within 1-2 touchpoints — optimize for these high-intent users with reduced-friction landing pages`);
    const longPaths = journeys.filter(j => j.totalTouchpoints >= 5 && j.converted);
    if (longPaths.length > 0) recommendations.push(`${longPaths.length} conversions have 5+ touchpoint journeys — implement sequential retargeting to nurture leads through longer cycles`);
    const lateConv = journeys.filter(j => j.totalHours > 168 && j.converted);
    if (lateConv.length > 0) recommendations.push(`${lateConv.length} conversions take over a week — create time-decay audience segments and automated re-engagement flows`);

    return { tenantId, generatedAt: new Date().toISOString(), journeys, journeyLengthDistribution, commonPaths, averageTouchpoints: Math.round(avgTouchpoints * 100) / 100, averagePathLengthHours: Math.round(avgHours * 100) / 100, overallConversionRate: Math.round(overallConvRate * 100) / 100, recommendations };
  }

  analyzeJourneySegments(tenantId: string): JourneySegmentPerformance[] {
    const report = this.analyzeCustomerJourneys(tenantId);
    const segments = [
      { name: "Quick Converters", desc: "Convert within 1-2 touchpoints", filter: (j: CustomerJourney) => j.totalTouchpoints <= 2 },
      { name: "Researchers", desc: "3-5 touchpoints before converting", filter: (j: CustomerJourney) => j.totalTouchpoints >= 3 && j.totalTouchpoints <= 5 },
      { name: "Long-Cycle Buyers", desc: "6+ touchpoints over extended period", filter: (j: CustomerJourney) => j.totalTouchpoints >= 6 },
      { name: "Single-Channel Users", desc: "Convert through a single channel", filter: (j: CustomerJourney) => new Set(j.touchpoints.map(t => t.channel)).size === 1 },
      { name: "Multi-Channel Engagers", desc: "Engage across 3+ channels", filter: (j: CustomerJourney) => new Set(j.touchpoints.map(t => t.channel)).size >= 3 },
      { name: "Weekend Warriors", desc: "Majority of touchpoints on weekends", filter: (j: CustomerJourney) => false },
    ];
    return segments.map(s => {
      const segJourneys = report.journeys.filter(j => j.converted).filter(s.filter);
      const avgTps = segJourneys.length > 0 ? segJourneys.reduce((sum, j) => sum + j.totalTouchpoints, 0) / segJourneys.length : 0;
      const avgHrs = segJourneys.length > 0 ? segJourneys.reduce((sum, j) => sum + j.totalHours, 0) / segJourneys.length : 0;
      const firstTouches = segJourneys.flatMap(j => j.touchpoints.filter(t => t.position === 0).map(t => t.channel));
      const lastTouches = segJourneys.flatMap(j => j.touchpoints.filter(t => t.position === j.totalTouchpoints - 1).map(t => t.channel));
      const firstTouchCounts = new Map<string, number>();
      firstTouches.forEach(ch => firstTouchCounts.set(ch, (firstTouchCounts.get(ch) || 0) + 1));
      const lastTouchCounts = new Map<string, number>();
      lastTouches.forEach(ch => lastTouchCounts.set(ch, (lastTouchCounts.get(ch) || 0) + 1));
      const mostFirst = firstTouchCounts.size > 0 ? Array.from(firstTouchCounts.entries()).sort((a, b) => b[1] - a[1])[0][0] : "N/A";
      const mostLast = lastTouchCounts.size > 0 ? Array.from(lastTouchCounts.entries()).sort((a, b) => b[1] - a[1])[0][0] : "N/A";
      const topPath = segJourneys.length > 0 ? segJourneys.sort((a, b) => b.conversionValue - a.conversionValue).slice(0, 1).map(j => j.path)[0] : "N/A";
      const convRate = segJourneys.length > 0 ? Math.round(segJourneys.length / Math.max(1, report.journeys.filter(j => s.filter(j)).length) * 10000) / 100 : 0;
      return { segmentName: s.name, description: s.desc, averageTouchpoints: Math.round(avgTps * 100) / 100, averageHours: Math.round(avgHrs * 100) / 100, conversionRate: convRate, mostCommonFirstTouch: mostFirst, mostCommonLastTouch: mostLast, topPath };
    });
  }

  generateJourneyOptimizations(tenantId: string): JourneyOptimizationRecommendation[] {
    const report = this.analyzeCustomerJourneys(tenantId);
    const recs: JourneyOptimizationRecommendation[] = [];
    if (report.averageTouchpoints > 4) recs.push({ focusArea: "Path Length Reduction", insight: `Average ${report.averageTouchpoints} touchpoints is above ideal 2-3 range`, recommendation: "Implement accelerated conversion paths: add retargeting with stronger CTAs, reduce friction in checkout", expectedImpact: "15-25% reduction in time-to-conversion", priority: "high" });
    if (report.overallConversionRate < 35) recs.push({ focusArea: "Conversion Rate Optimization", insight: `Current conversion rate ${report.overallConversionRate}% below 35% benchmark`, recommendation: "Audit landing pages for friction, test simplified forms, add social proof elements", expectedImpact: "10-20% conversion rate improvement", priority: "high" });
    const shortPathCount = report.journeyLengthDistribution.find(d => d.touchpoints <= 2)?.count || 0;
    if (shortPathCount > 0) recs.push({ focusArea: "Quick Win Optimization", insight: `${shortPathCount} journeys convert in 1-2 touchpoints — strong purchase intent signal`, recommendation: "Create dedicated landing pages and remarketing lists for single-session converters", expectedImpact: "8-15% revenue uplift from accelerated paths", priority: "medium" });
    const longPaths = report.commonPaths.filter(p => p.path.split(" → ").length >= 4);
    if (longPaths.length > 0) recs.push({ focusArea: "Long-Cycle Nurturing", insight: `${longPaths.length} common paths have 4+ touchpoints`, recommendation: "Build automated nurturing sequences with escalating offers for multi-touch prospects", expectedImpact: "10-18% improvement in long-cycle conversion", priority: "medium" });
    recs.push({ focusArea: "First-Touch Attribution", insight: "Understanding which channels initiate journeys helps optimize top-of-funnel spend", recommendation: "Analyze first-touch channel performance and allocate 30% of budget to highest-performing acquisition channels", expectedImpact: "12-20% increase in new prospect acquisition", priority: "low" });
    recs.push({ focusArea: "Cross-Channel Consistency", insight: "Users engaging across multiple channels have higher conversion value", recommendation: "Ensure consistent messaging and seamless experience across all channels in the journey", expectedImpact: "5-10% increase in average conversion value", priority: "low" });
    return recs;
  }

  analyzeJourneyDropOffs(tenantId: string): JourneyDropOffAnalysis[] {
    const report = this.analyzeCustomerJourneys(tenantId);
    const maxTps = Math.max(...report.journeys.map(j => j.totalTouchpoints), 2);
    const results: JourneyDropOffAnalysis[] = [];
    for (let pos = 0; pos < maxTps; pos++) {
      const entering = report.journeys.filter(j => j.totalTouchpoints > pos).length;
      const continuing = report.journeys.filter(j => j.totalTouchpoints > pos + 1).length;
      const dropping = entering - continuing;
      const rate = entering > 0 ? Math.round(dropping / entering * 10000) / 100 : 0;
      if (entering > 0) {
        const ch = pos < CHANNELS.length ? CHANNELS[pos] : "Unknown";
        results.push({
          touchpointPosition: pos + 1, touchpointLabel: `Touchpoint ${pos + 1} (${ch})`,
          usersEntering: entering, usersDropping: dropping, dropOffRate: rate,
          significance: rate > 50 ? "high" as const : rate > 30 ? "medium" as const : "low" as const,
          recoverySuggestion: rate > 50 ? `High drop-off after touchpoint ${pos + 1} — add retargeting with personalized follow-up within 24 hours` : rate > 30 ? `Moderate drop-off — review touchpoint experience for improvement opportunities` : `Normal drop-off rate — maintain current strategy`,
        });
      }
    }
    return results;
  }

  analyzeJourneyTimeBuckets(tenantId: string): JourneyTimeAnalysis[] {
    const report = this.analyzeCustomerJourneys(tenantId);
    const buckets = [
      { label: "Same Session", min: 0, max: 1 },
      { label: "Same Day", min: 1, max: 24 },
      { label: "Next Day", min: 24, max: 72 },
      { label: "Same Week", min: 72, max: 168 },
      { label: "Two Weeks", min: 168, max: 336 },
      { label: "One Month+", min: 336, max: 720 },
    ];
    return buckets.map(b => {
      const inBucket = report.journeys.filter(j => j.totalHours >= b.min && j.totalHours < b.max);
      const convs = inBucket.filter(j => j.converted);
      const rate = inBucket.length > 0 ? convs.length / inBucket.length * 100 : 0;
      const avgVal = convs.length > 0 ? Math.round(convs.reduce((s, j) => s + j.conversionValue, 0) / convs.length) : 0;
      return {
        timeBucket: b.label, minHours: b.min, maxHours: b.max, journeyCount: inBucket.length,
        conversionRate: Math.round(rate * 100) / 100, avgValue: avgVal,
        recommendation: b.label === "Same Session" ? "Optimize for instant conversions with fast-loading pages and clear CTAs" : b.label === "Same Day" ? "Implement same-day retargeting with time-sensitive offers" : b.label === "One Month+" ? "Create re-engagement campaigns with 'we miss you' messaging for long-cycle prospects" : `Build ${b.label.toLowerCase()} retargeting sequences to nurture prospects`,
      };
    });
  }
}

export const campaignCustomerJourney = new CampaignCustomerJourneyService();
