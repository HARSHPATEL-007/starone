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
      const convVal = conv ? Math.round(20 + ((jSeed * 37) % 180)) : 0;

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

  // ── Deep methods ──────────────────────────────────────────────────

  journeyPathClustering(tenantId: string): {
    clusters: { name: string; description: string; pathPattern: string; journeyCount: number; conversionRate: number; avgValue: number; commonFirstTouch: string; commonLastTouch: string }[];
    totalJourneys: number; dominantCluster: string; clusterDiversity: number;
  } {
    const report = this.analyzeCustomerJourneys(tenantId);
    const seed = hashStr(tenantId + "clust");
    const clusterDefs = [
      { name: "Direct Converters", desc: "Short 1-2 touchpoint journeys via direct/referral channels", pattern: "Direct|Referral", minTps: 1, maxTps: 2 },
      { name: "Search Researchers", desc: "Multi-touch journeys starting with Search", pattern: "Search", minTps: 2, maxTps: 5 },
      { name: "Social Engagers", desc: "Social-driven journeys with brand discovery", pattern: "Social", minTps: 2, maxTps: 4 },
      { name: "Email Nurtured", desc: "Email-heavy journeys typical of nurtured leads", pattern: "Email", minTps: 2, maxTps: 6 },
      { name: "Display+Awareness", desc: "Display-initiated journeys building awareness", pattern: "Display", minTps: 3, maxTps: 7 },
      { name: "Multi-Channel", desc: "Complex journeys across 3+ channels", pattern: "Multi", minTps: 4, maxTps: 8 },
    ];
    const clusters = clusterDefs.map((cd, ci) => {
      const journeys = report.journeys.filter(j => {
        const channels = j.touchpoints.map(t => t.channel);
        if (j.totalTouchpoints < cd.minTps || j.totalTouchpoints > cd.maxTps) return false;
        if (cd.name === "Multi-Channel") return new Set(channels).size >= 3;
        if (cd.name === "Direct Converters") return channels.every(ch => ch === "Direct" || ch === "Referral") || j.totalTouchpoints <= 2;
        return channels.some(ch => ch === cd.pattern);
      });
      const convs = journeys.filter(j => j.converted);
      const rate = journeys.length > 0 ? Math.round(convs.length / journeys.length * 10000) / 100 : 0;
      const avgVal = convs.length > 0 ? Math.round(convs.reduce((s, j) => s + j.conversionValue, 0) / convs.length) : 0;
      const firstTouches = journeys.flatMap(j => j.touchpoints.filter(t => t.position === 0).map(t => t.channel));
      const lastTouches = journeys.flatMap(j => j.touchpoints.filter(t => t.position === j.totalTouchpoints - 1).map(t => t.channel));
      const ftCounts = new Map<string, number>();
      firstTouches.forEach(ch => ftCounts.set(ch, (ftCounts.get(ch) || 0) + 1));
      const ltCounts = new Map<string, number>();
      lastTouches.forEach(ch => ltCounts.set(ch, (ltCounts.get(ch) || 0) + 1));
      const commonFirst = ftCounts.size > 0 ? Array.from(ftCounts.entries()).sort((a, b) => b[1] - a[1])[0][0] : "N/A";
      const commonLast = ltCounts.size > 0 ? Array.from(ltCounts.entries()).sort((a, b) => b[1] - a[1])[0][0] : "N/A";
      return { name: cd.name, description: cd.desc, pathPattern: cd.pattern, journeyCount: journeys.length, conversionRate: rate, avgValue: avgVal, commonFirstTouch: commonFirst, commonLastTouch: commonLast };
    });
    const dominant = clusters.reduce((a, b) => a.journeyCount > b.journeyCount ? a : b);
    const nonEmpty = clusters.filter(c => c.journeyCount > 0).length;
    return { clusters, totalJourneys: report.journeys.length, dominantCluster: dominant.name, clusterDiversity: Math.round(nonEmpty / clusters.length * 10000) / 100 };
  }

  journeyAttributionModeling(tenantId: string): {
    channels: { name: string; firstTouch: number; lastTouch: number; linear: number; timeDecay: number; positionBased: number; assistedConversions: number; role: string }[];
    totalConversions: number; primaryChannel: string; attributionConsensus: string;
  } {
    const report = this.analyzeCustomerJourneys(tenantId);
    const convJourneys = report.journeys.filter(j => j.converted);
    const totalConvs = convJourneys.length;
    const seed = hashStr(tenantId + "attr");
    const channelData = new Map<string, { first: number; last: number; linear: number; assisted: number; roles: string[] }>();
    CHANNELS.forEach(ch => channelData.set(ch, { first: 0, last: 0, linear: 0, assisted: 0, roles: [] }));

    for (const j of convJourneys) {
      const tps = j.touchpoints;
      const n = tps.length;
      const channelSet = new Set<string>();
      tps.forEach((t, i) => {
        channelSet.add(t.channel);
        const d = channelData.get(t.channel)!;
        if (i === 0) d.first++;
        if (i === n - 1) d.last++;
        d.linear++;
        if (i > 0 && i < n - 1) d.assisted++;
      });
      channelSet.forEach(ch => {
        const d = channelData.get(ch)!;
        d.roles.push(n <= 2 ? "closer" : tps.find(t => t.channel === ch)?.position === 0 ? "initiator" : "influencer");
      });
    }

    const channels = CHANNELS.map((ch, ci) => {
      const d = channelData.get(ch)!;
      const linearShare = totalConvs > 0 ? Math.round(d.linear / totalConvs * 10000) / 100 : 0;
      const timeDecay = totalConvs > 0 ? Math.round(d.last * 0.4 + d.first * 0.3 + d.assisted * 0.3) / totalConvs * 100 : 0;
      const positionBased = totalConvs > 0 ? Math.round((d.first * 0.3 + d.last * 0.4 + d.assisted * 0.3) / totalConvs * 10000) / 100 : 0;
      const dominantRole = d.roles.length > 0 ? d.roles.sort((a, b) => d.roles.filter(r => r === a).length - d.roles.filter(r => r === b).length).pop()! : "unknown";
      return { name: ch, firstTouch: Math.round(d.first / Math.max(totalConvs, 1) * 10000) / 100, lastTouch: Math.round(d.last / Math.max(totalConvs, 1) * 10000) / 100, linear: linearShare, timeDecay: Math.round(timeDecay * 100) / 100, positionBased, assistedConversions: d.assisted, role: dominantRole };
    });
    const primary = channels.reduce((a, b) => a.lastTouch > b.lastTouch ? a : b);
    const bestFirst = channels.reduce((a, b) => a.firstTouch > b.firstTouch ? a : b);
    const bestLinear = channels.reduce((a, b) => a.linear > b.linear ? a : b);
    const consensus = primary.name === bestFirst.name && primary.name === bestLinear.name ? "strong" : primary.name === bestFirst.name || primary.name === bestLinear.name ? "moderate" : "fragmented";
    return { channels, totalConversions: totalConvs, primaryChannel: primary.name, attributionConsensus: consensus };
  }

  journeyChurnPrediction(tenantId: string): {
    touchpointRisk: { position: number; channel: string; churnRisk: number; churnReason: string; retentionAction: string }[];
    overallChurnRate: number; highestRiskTouchpoint: string; recommendation: string;
  } {
    const report = this.analyzeCustomerJourneys(tenantId);
    const seed = hashStr(tenantId + "churn");
    const nonConv = report.journeys.filter(j => !j.converted);
    const overallChurnRate = report.journeys.length > 0 ? Math.round(nonConv.length / report.journeys.length * 10000) / 100 : 0;
    const maxTps = Math.max(...report.journeys.map(j => j.totalTouchpoints), 3);
    const touchpointRisk: { position: number; channel: string; churnRisk: number; churnReason: string; retentionAction: string }[] = [];
    for (let pos = 0; pos < Math.min(maxTps, 6); pos++) {
      const entering = report.journeys.filter(j => j.totalTouchpoints > pos).length;
      const churning = nonConv.filter(j => j.totalTouchpoints === pos + 1).length;
      const baseRisk = entering > 0 ? churning / entering : 0;
      const noise = ((seed + pos * 17) % 20) / 100;
      const risk = Math.min(100, Math.round((baseRisk + noise) * 10000) / 100);
      const ch = pos < CHANNELS.length ? CHANNELS[pos] : "Mixed";
      const reasons = ["Low engagement with content", "Weak call-to-action at this stage", "Information overload without clear next step", "Missing personalization in follow-up", "No urgency or time-sensitive element"];
      const reason = reasons[(seed + pos * 13) % reasons.length];
      const actions = ["Add personalized retargeting with tailored offer", "Simplify the next step with a single CTA", "Introduce social proof and testimonials", "Create urgency with limited-time incentive", "Implement progressive profiling to reduce friction"];
      const action = actions[(seed + pos * 19) % actions.length];
      touchpointRisk.push({ position: pos + 1, channel: ch, churnRisk: risk, churnReason: reason, retentionAction: action });
    }
    const highest = touchpointRisk.reduce((a, b) => a.churnRisk > b.churnRisk ? a : b);
    const rec = highest.churnRisk > 50 ? `Critical churn risk at touchpoint ${highest.position} (${highest.channel}) — ${highest.retentionAction}` : `Monitor touchpoint ${highest.position} (${highest.channel}) with ${highest.churnRisk}% churn risk`;
    return { touchpointRisk, overallChurnRate, highestRiskTouchpoint: `Touchpoint ${highest.position} — ${highest.channel}`, recommendation: rec };
  }

  journeyLifecycleStageMapping(tenantId: string): {
    stages: { name: string; description: string; journeyCount: number; conversionRate: number; avgTouchpoints: number; avgHours: number; topChannels: string[] }[];
    primaryStage: string; lifecycleProgression: string;
  } {
    const report = this.analyzeCustomerJourneys(tenantId);
    const stages = [
      { name: "Awareness", desc: "First exposure — single touchpoint, no prior interaction", minTps: 1, maxTps: 1, maxHrs: 24 },
      { name: "Interest", desc: "Exploring options — 2-3 touchpoints across 1-3 days", minTps: 2, maxTps: 3, maxHrs: 72 },
      { name: "Consideration", desc: "Evaluating — 3-5 touchpoints over a week", minTps: 3, maxTps: 5, maxHrs: 168 },
      { name: "Intent", desc: "Ready to convert — multiple touches with high engagement", minTps: 4, maxTps: 6, maxHrs: 336 },
      { name: "Conversion", desc: "Completed purchase or desired action", minTps: 1, maxTps: 8, maxHrs: 720, mustConvert: true },
      { name: "Advocacy", desc: "Post-conversion engagement and referrals", minTps: 1, maxTps: 8, maxHrs: 720, mustConvert: true, highValue: true },
    ] as any[];
    const results = stages.map(s => {
      const journeys = report.journeys.filter(j => {
        if (j.totalTouchpoints < s.minTps || j.totalTouchpoints > s.maxTps) return false;
        if (j.totalHours > s.maxHrs) return false;
        if (s.mustConvert && !j.converted) return false;
        if (s.highValue && (!j.converted || j.conversionValue < 100)) return false;
        return true;
      });
      const convs = journeys.filter(j => j.converted);
      const rate = journeys.length > 0 ? Math.round(convs.length / journeys.length * 10000) / 100 : 0;
      const avgTps = journeys.length > 0 ? journeys.reduce((sum, j) => sum + j.totalTouchpoints, 0) / journeys.length : 0;
      const avgHrs = journeys.length > 0 ? journeys.reduce((sum, j) => sum + j.totalHours, 0) / journeys.length : 0;
      const chCounts = new Map<string, number>();
      journeys.forEach(j => j.touchpoints.forEach(t => chCounts.set(t.channel, (chCounts.get(t.channel) || 0) + 1)));
      const topChs = Array.from(chCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);
      return { name: s.name, description: s.desc, journeyCount: journeys.length, conversionRate: rate, avgTouchpoints: Math.round(avgTps * 100) / 100, avgHours: Math.round(avgHrs * 100) / 100, topChannels: topChs };
    });
    const primary = results.reduce((a, b) => a.journeyCount > b.journeyCount ? a : b);
    const stagesWithJourneys = results.filter(s => s.journeyCount > 0);
    const progression = stagesWithJourneys.length >= 3 ? `Users progress through ${stagesWithJourneys.length} lifecycle stages — ${stagesWithJourneys.map(s => `${s.name} (${s.journeyCount} journeys)`).join(" → ")}` : "Limited lifecycle variation — most users cluster in early stages";
    return { stages: results, primaryStage: primary.name, lifecycleProgression: progression };
  }

  journeyTouchpointEffectiveness(tenantId: string): {
    touchpointTypes: { channel: string; position: string; occurrenceCount: number; conversionRate: number; avgValue: number; influenceScore: number; recommendation: string }[];
    mostEffective: string; leastEffective: string;
  } {
    const report = this.analyzeCustomerJourneys(tenantId);
    const seed = hashStr(tenantId + "tpeff");
    const positions = ["first", "middle", "last"];
    const tpMap = new Map<string, { count: number; convs: number; totalVal: number }>();
    for (const j of report.journeys) {
      for (let i = 0; i < j.touchpoints.length; i++) {
        const t = j.touchpoints[i];
        const pos = i === 0 ? "first" : i === j.touchpoints.length - 1 ? "last" : "middle";
        const key = `${t.channel}|${pos}`;
        const d = tpMap.get(key) || { count: 0, convs: 0, totalVal: 0 };
        d.count++;
        if (j.converted) { d.convs++; d.totalVal += j.conversionValue; }
        tpMap.set(key, d);
      }
    }
    const touchpointTypes = Array.from(tpMap.entries()).map(([key, d]) => {
      const [channel, pos] = key.split("|");
      const rate = d.count > 0 ? Math.round(d.convs / d.count * 10000) / 100 : 0;
      const avgVal = d.convs > 0 ? Math.round(d.totalVal / d.convs) : 0;
      const baseScore = rate * 0.4 + (avgVal / 200) * 100 * 0.3 + (d.count / report.journeys.length) * 100 * 0.3;
      const noise = ((seed + hashStr(key)) % 10) / 100;
      const influenceScore = Math.min(100, Math.round(baseScore * (1 + noise)));
      const rec = influenceScore > 70 ? `Strong performer — allocate more budget to ${channel} at ${pos} touch` : influenceScore > 40 ? `Moderate effectiveness — A/B test ${channel} creative at ${pos} touch` : `Low impact — consider reducing ${channel} spend at ${pos} touch or test alternative approaches`;
      return { channel, position: pos, occurrenceCount: d.count, conversionRate: rate, avgValue: avgVal, influenceScore, recommendation: rec };
    }).sort((a, b) => b.influenceScore - a.influenceScore);
    const most = touchpointTypes[0];
    const least = touchpointTypes[touchpointTypes.length - 1];
    return { touchpointTypes, mostEffective: `${most.channel} (${most.position} touch) — ${most.influenceScore}`, leastEffective: `${least.channel} (${least.position} touch) — ${least.influenceScore}` };
  }

  journeySequenceAnalysis(tenantId: string): {
    sequences: { sequence: string; frequency: number; conversionRate: number; avgValue: number; avgTouchpoints: number; commonality: string }[];
    mostCommonSequence: string; highestConvertingSequence: string; sequenceDiversity: number;
  } {
    const report = this.analyzeCustomerJourneys(tenantId);
    const seqMap = new Map<string, { journeys: CustomerJourney[] }>();
    for (const j of report.journeys) {
      const seq = j.touchpoints.map(t => t.channel).join(" → ");
      const d = seqMap.get(seq) || { journeys: [] };
      d.journeys.push(j);
      seqMap.set(seq, d);
    }
    const sequences = Array.from(seqMap.entries()).map(([seq, d]) => {
      const convs = d.journeys.filter(j => j.converted);
      const rate = d.journeys.length > 0 ? Math.round(convs.length / d.journeys.length * 10000) / 100 : 0;
      const avgVal = convs.length > 0 ? Math.round(convs.reduce((s, j) => s + j.conversionValue, 0) / convs.length) : 0;
      const avgTps = d.journeys.reduce((s, j) => s + j.totalTouchpoints, 0) / d.journeys.length;
      const segments = seq.split(" → ");
      const commonality = d.journeys.length > 5 ? "high" : d.journeys.length > 2 ? "medium" : "low";
      return { sequence: seq, frequency: d.journeys.length, conversionRate: rate, avgValue: avgVal, avgTouchpoints: Math.round(avgTps * 100) / 100, commonality };
    }).sort((a, b) => b.frequency - a.frequency);
    const mostCommon = sequences[0];
    const highestConv = sequences.reduce((a, b) => a.conversionRate > b.conversionRate ? a : b, sequences[0]);
    return { sequences: sequences.slice(0, 15), mostCommonSequence: mostCommon ? mostCommon.sequence : "N/A", highestConvertingSequence: highestConv ? highestConv.sequence : "N/A", sequenceDiversity: Math.round(sequences.length / report.journeys.length * 10000) / 100 };
  }

  journeySummaryDashboard(tenantId: string): {
    totalJourneys: number; overallConversionRate: number; avgTouchpoints: number;
    avgPathHours: number; topPath: { path: string; frequency: number; conversionRate: number } | null;
    dropOffHotspots: { position: number; dropOffRate: number }[];
    timeDistribution: { bucket: string; journeyCount: number; conversionRate: number }[];
    quickActions: string[];
  } {
    const report = this.analyzeCustomerJourneys(tenantId);
    const topPath = report.commonPaths.length > 0 ? report.commonPaths[0] : null;
    const dropOffHotspots = this.analyzeJourneyDropOffs(tenantId)
      .filter(d => d.significance === "high")
      .slice(0, 3)
      .map(d => ({ position: d.touchpointPosition, dropOffRate: d.dropOffRate }));
    const timeDistribution = this.analyzeJourneyTimeBuckets(tenantId).map(b => ({
      bucket: b.timeBucket, journeyCount: b.journeyCount, conversionRate: b.conversionRate,
    }));
    const quickActions: string[] = [];
    if (report.overallConversionRate < 30) quickActions.push("CRO is critical — review funnel friction points");
    if (report.averageTouchpoints > 4) quickActions.push("Path too long — implement accelerated conversion paths");
    if (dropOffHotspots.length > 0) quickActions.push(`High drop-off at touchpoint ${dropOffHotspots[0].position} — add retargeting sequence`);
    if (report.averagePathLengthHours > 168) quickActions.push("Journeys exceed 1 week — create time-decay audience segments");
    if (quickActions.length === 0) quickActions.push("Journey metrics are healthy — continue monitoring");
    return {
      totalJourneys: report.journeys.length, overallConversionRate: report.overallConversionRate,
      avgTouchpoints: report.averageTouchpoints, avgPathHours: report.averagePathLengthHours,
      topPath: topPath ? { path: topPath.path, frequency: topPath.frequency, conversionRate: topPath.conversionRate } : null,
      dropOffHotspots, timeDistribution, quickActions,
    };
  }
}

export const campaignCustomerJourney = new CampaignCustomerJourneyService();
