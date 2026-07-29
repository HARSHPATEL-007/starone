import { autonomousCampaignManager } from "./AutonomousCampaignManagerService";

interface RetargetingAudience {
  name: string;
  size: number;
  source: string;
  conversionRate: number;
  recency: number;
  frequency: number;
  daysSinceLastAction: number;
  value: number;
  decay: number;
}

interface RetargetingAnalysis {
  tenantId: string;
  campaignId: string;
  campaignName: string;
  audiences: RetargetingAudience[];
  totalAudienceSize: number;
  averageConversionRate: number;
  averageFrequency: number;
  averageRecencyDays: number;
  overallDecayRate: number;
  estimatedRecoverableValue: number;
  topAudiences: RetargetingAudience[];
  decayingAudiences: RetargetingAudience[];
  recommendations: string[];
}

interface RetargetingFunnel {
  stage: string;
  users: number;
  conversionRate: number;
  dropOff: number;
  description: string;
}

interface RetargetingChannelPerformance {
  channel: string;
  audienceReached: number;
  conversions: number;
  spend: number;
  roas: number;
  frequency: number;
  effectiveness: string;
}

interface RetargetingBidRecommendation {
  audience: string;
  currentBid: number;
  suggestedBid: number;
  reason: string;
  expectedLift: string;
  priority: "high" | "medium" | "low";
}

interface RetargetingCrossChannel {
  channels: string[];
  audienceOverlap: number;
  uniqueReach: number;
  totalReach: number;
  frequency: number;
  recommendation: string;
}

interface RetargetingTrend {
  date: string;
  audienceSize: number;
  conversions: number;
  conversionRate: number;
  frequency: number;
  decayRate: number;
}

const AUDIENCE_SOURCES = ["Website Visitors", "Cart Abandoners", "Past Purchasers", "Email Subscribers", "Lead Form Fillers", "Video Viewers", "Blog Readers", "Social Followers", "App Users", "Event Attendees"];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

const CHANNELS = ["Display", "Social", "Email", "Search", "Video", "Native"];

export class CampaignRetargetingAnalyzerService {
  analyzeRetargetingAudiences(campaignId: string, tenantId: string): RetargetingAnalysis {
    const seed = hashStr(campaignId + tenantId);
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const campaign = portfolio.analyses.find((a: any) => a.campaignId === campaignId);
    const campaignName = campaign?.campaignName || `Campaign ${campaignId.slice(0, 8)}`;
    const numAud = 5 + (seed % 5);

    const audiences: RetargetingAudience[] = [];
    for (let i = 0; i < numAud; i++) {
      const aSeed = seed + i * 23;
      const size = 500 + (aSeed % 9500);
      const convRate = 1 + ((aSeed * 7) % 90) / 10;
      const freq = 1 + ((aSeed * 11) % 8);
      const recency = 1 + ((aSeed * 13) % 29);
      const decay = 5 + ((aSeed * 17) % 45);
      const value = Math.round(size * convRate / 100 * (20 + (aSeed % 80)));

      audiences.push({
        name: AUDIENCE_SOURCES[(aSeed * 19) % AUDIENCE_SOURCES.length],
        size, source: AUDIENCE_SOURCES[(aSeed * 23) % AUDIENCE_SOURCES.length],
        conversionRate: Math.round(convRate * 100) / 100,
        recency, frequency: freq, daysSinceLastAction: recency,
        value, decay: Math.round(decay * 100) / 100,
      });
    }

    const totalSize = audiences.reduce((s, a) => s + a.size, 0);
    const avgCvr = audiences.reduce((s, a) => s + a.conversionRate, 0) / audiences.length;
    const avgFreq = audiences.reduce((s, a) => s + a.frequency, 0) / audiences.length;
    const avgRec = audiences.reduce((s, a) => s + a.recency, 0) / audiences.length;
    const overallDecay = audiences.reduce((s, a) => s + a.decay, 0) / audiences.length;
    const totalRecoverable = audiences.filter(a => a.decay > 20).reduce((s, a) => s + Math.round(a.value * (1 - a.decay / 100)), 0);

    const sorted = [...audiences].sort((a, b) => b.conversionRate - a.conversionRate);
    const decaying = audiences.filter(a => a.decay > 25).sort((a, b) => b.decay - a.decay);

    const recs: string[] = [];
    if (decaying.length > 0) recs.push(`${decaying.length} audiences showing high decay (>25%) — refresh retargeting creatives and offers immediately`);
    if (avgFreq > 5) recs.push(`Average frequency ${Math.round(avgFreq * 10) / 10} is above 5 — risk of ad fatigue; implement frequency capping`);
    if (avgCvr > 5) recs.push(`Strong average retargeting CVR (${Math.round(avgCvr * 10) / 10}%) — increase budget allocation to retargeting campaigns`);
    if (totalRecoverable > 10000) recs.push(`Estimated $${totalRecoverable.toLocaleString()} in recoverable value from decaying audiences — launch re-engagement campaign`);
    recs.push(`Segment retargeting audiences by recency: 0-7d (hot), 8-14d (warm), 15-30d (cold) with differentiated messaging`);

    return {
      tenantId, campaignId, campaignName, audiences,
      totalAudienceSize: totalSize, averageConversionRate: Math.round(avgCvr * 100) / 100,
      averageFrequency: Math.round(avgFreq * 100) / 100,
      averageRecencyDays: Math.round(avgRec * 100) / 100,
      overallDecayRate: Math.round(overallDecay * 100) / 100,
      estimatedRecoverableValue: totalRecoverable,
      topAudiences: sorted.slice(0, 3), decayingAudiences: decaying.slice(0, 3),
      recommendations: recs,
    };
  }

  analyzeRetargetingFunnel(campaignId: string, tenantId: string): RetargetingFunnel[] {
    const seed = hashStr(campaignId + tenantId + "rtfunnel");
    return [
      { stage: "Audience Identified", users: 10000 + (seed % 15000), conversionRate: 100, dropOff: 0, description: "Users identified for retargeting" },
      { stage: "Ad Delivered", users: 8000 + (seed % 12000), conversionRate: 80, dropOff: 20, description: "Users who saw at least one retargeting ad" },
      { stage: "Ad Engaged", users: 1200 + (seed % 3000), conversionRate: 15, dropOff: 85, description: "Users who clicked or engaged with retargeting ad" },
      { stage: "Visit Initiated", users: 800 + (seed % 2000), conversionRate: 10, dropOff: 33, description: "Users who visited site after retargeting ad" },
      { stage: "Action Started", users: 300 + (seed % 700), conversionRate: 3.75, dropOff: 62.5, description: "Users who started desired action (form, cart, etc.)" },
      { stage: "Converted", users: 150 + (seed % 350), conversionRate: 1.5, dropOff: 50, description: "Users who completed conversion" },
    ].map((s, i, arr) => ({
      ...s,
      users: Math.round(s.users * (0.8 + ((seed + i * 13) % 40) / 100)),
      dropOff: i > 0 ? Math.round((1 - (s.users / arr[i].users)) * 100 * 100) / 100 : 0,
      conversionRate: Math.round(s.users / arr[0].users * 10000) / 100,
    }));
  }

  analyzeRetargetingChannels(campaignId: string, tenantId: string): RetargetingChannelPerformance[] {
    const seed = hashStr(campaignId + tenantId + "rtch");
    return CHANNELS.map((ch, i) => {
      const cSeed = seed + i * 17;
      const reached = 1000 + (cSeed % 9000);
      const convs = Math.round(reached * (0.01 + ((cSeed * 7) % 50) / 1000));
      const spend = Math.round(reached * (0.1 + (cSeed % 90) / 100));
      const roas = spend > 0 ? Math.round(convs * (15 + (cSeed % 85)) / spend * 100) / 100 : 0;
      return {
        channel: ch, audienceReached: reached, conversions: convs, spend, roas,
        frequency: 1 + ((cSeed * 11) % 7),
        effectiveness: roas > 3 ? "High — efficient retargeting channel, consider increasing allocation" :
                      roas > 1.5 ? "Moderate — maintain current spend, test creative optimization" :
                      "Low — review targeting precision and frequency caps",
      };
    }).sort((a, b) => b.roas - a.roas);
  }

  generateRetargetingBidRecommendations(campaignId: string, tenantId: string): RetargetingBidRecommendation[] {
    const analysis = this.analyzeRetargetingAudiences(campaignId, tenantId);
    return analysis.audiences.slice(0, 5).map(a => {
      const baseBid = 0.5 + (hashStr(a.name) % 200) / 100;
      const suggestedBid = a.decay > 30 ? Math.round(baseBid * 1.3 * 100) / 100 :
                           a.decay > 20 ? Math.round(baseBid * 1.15 * 100) / 100 :
                           a.conversionRate > 5 ? Math.round(baseBid * 1.2 * 100) / 100 :
                           Math.round(baseBid * 0.85 * 100) / 100;
      return {
        audience: a.name, currentBid: baseBid, suggestedBid,
        reason: a.decay > 30 ? `High decay (${a.decay}%) — increase bid to re-engage before audience expires` :
                a.conversionRate > 5 ? `High converting audience (${a.conversionRate}%) — justify premium bid` :
                `Standard optimization based on audience dynamics`,
        expectedLift: suggestedBid > baseBid ? `${Math.round((suggestedBid / baseBid - 1) * 100)}% increase in reach expected` :
                       `${Math.round((1 - suggestedBid / baseBid) * 100)}% cost savings expected`,
        priority: a.decay > 30 ? "high" as const : a.conversionRate > 5 ? "high" as const : "medium" as const,
      };
    });
  }

  analyzeCrossChannelRetargeting(campaignId: string, tenantId: string): RetargetingCrossChannel[] {
    const pairs: { channels: string[] }[] = [
      { channels: ["Display", "Social"] },
      { channels: ["Email", "Display"] },
      { channels: ["Social", "Search"] },
      { channels: ["Video", "Display"] },
      { channels: ["Email", "Social", "Display"] },
    ];
    const seed = hashStr(campaignId + tenantId + "xch");
    return pairs.map((p, i) => {
      const pSeed = seed + i * 19;
      const overlap = 15 + (pSeed % 45);
      const totalReach = 5000 + (pSeed % 15000);
      const uniqueReach = Math.round(totalReach * (1 - overlap / 100));
      return {
        channels: p.channels, audienceOverlap: Math.round(overlap * 100) / 100,
        uniqueReach, totalReach, frequency: 2 + ((pSeed * 7) % 5),
        recommendation: overlap > 35 ? `High overlap (${Math.round(overlap)}%) between ${p.channels.join(" & ")} — coordinate frequency capping and message sequencing` :
                        overlap > 20 ? `Moderate overlap — sequence ${p.channels.join(" → ")} for sequential retargeting` :
                        `Low overlap — ${p.channels.join(" & ")} reach distinct audiences; maintain separate strategies`,
      };
    });
  }

  analyzeRetargetingTrends(campaignId: string, tenantId: string): RetargetingTrend[] {
    const seed = hashStr(campaignId + tenantId + "rttrend");
    const trends: RetargetingTrend[] = [];
    for (let w = 0; w < 8; w++) {
      const wSeed = seed + w * 13;
      const audSize = 5000 + (wSeed % 10000);
      const convRate = 1.5 + ((wSeed * 7) % 70) / 10;
      trends.push({
        date: new Date(2025, 0, 1 + w * 7).toISOString().split("T")[0],
        audienceSize: audSize,
        conversions: Math.round(audSize * convRate / 100),
        conversionRate: Math.round(convRate * 100) / 100,
        frequency: 2 + ((wSeed * 11) % 6),
        decayRate: Math.round((10 + (wSeed % 30)) * 100) / 100,
      });
    }
    return trends;
  }
}

export const campaignRetargetingAnalyzer = new CampaignRetargetingAnalyzerService();
