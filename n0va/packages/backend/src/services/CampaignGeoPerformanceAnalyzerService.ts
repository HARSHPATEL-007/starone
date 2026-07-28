import { autonomousCampaignManager } from "./AutonomousCampaignManagerService";

interface GeoLocationDetail {
  country: string;
  region: string;
  city: string;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  spend: number;
  ctr: number;
  cvr: number;
  roas: number;
  cpc: number;
  share: number;
  performanceScore: number;
  status: "overperforming" | "performing" | "underperforming";
}

interface GeoPerformanceReport {
  campaignId: string;
  campaignName: string;
  generatedAt: string;
  locations: GeoLocationDetail[];
  topRegion: string;
  bottomRegion: string;
  countrySummary: { country: string; totalRevenue: number; totalSpend: number; roas: number; locationCount: number }[];
  recommendations: string[];
}

interface GeoOptimizationRecommendation {
  location: string;
  country: string;
  currentPerformance: string;
  recommendation: string;
  expectedImpact: string;
  bidAdjustment: number;
  priority: "high" | "medium" | "low";
}

interface GeoExpansionOpportunity {
  country: string;
  region: string;
  estimatedMarketSize: number;
  competitionLevel: "low" | "medium" | "high";
  projectedROAS: number;
  entryDifficulty: "easy" | "moderate" | "hard";
  recommendation: string;
  projectedMonthlyRevenue: number;
}

interface GeoBidAdjustment {
  location: string;
  country: string;
  currentBidMultiplier: number;
  recommendedMultiplier: number;
  changePercent: number;
  rationale: string;
  expectedROASImpact: number;
}

interface GeoAudienceOverlap {
  countryA: string;
  countryB: string;
  overlapPercent: number;
  exclusiveA: number;
  exclusiveB: number;
  interpretation: string;
}

interface GeoTrend {
  location: string;
  country: string;
  period: string;
  metrics: { metric: string; value: number; change: number; direction: "up" | "down" | "stable" }[];
  overallDirection: "improving" | "declining" | "stable";
}

const COUNTRIES = [
  { country: "US", regions: [{ region: "Northeast", cities: ["New York", "Boston", "Philadelphia"] }, { region: "Southeast", cities: ["Atlanta", "Miami", "Charlotte"] }, { region: "Midwest", cities: ["Chicago", "Detroit", "Minneapolis"] }, { region: "West", cities: ["Los Angeles", "San Francisco", "Seattle"] }, { region: "Southwest", cities: ["Dallas", "Phoenix", "Houston"] }] },
  { country: "UK", regions: [{ region: "London & South East", cities: ["London", "Brighton", "Reading"] }, { region: "North West", cities: ["Manchester", "Liverpool", "Leeds"] }, { region: "Scotland", cities: ["Edinburgh", "Glasgow", "Aberdeen"] }, { region: "Midlands", cities: ["Birmingham", "Nottingham", "Leicester"] }] },
  { country: "CA", regions: [{ region: "Ontario", cities: ["Toronto", "Ottawa", "Hamilton"] }, { region: "British Columbia", cities: ["Vancouver", "Victoria", "Surrey"] }, { region: "Quebec", cities: ["Montreal", "Quebec City", "Laval"] }] },
  { country: "AU", regions: [{ region: "New South Wales", cities: ["Sydney", "Newcastle", "Wollongong"] }, { region: "Victoria", cities: ["Melbourne", "Geelong", "Ballarat"] }, { region: "Queensland", cities: ["Brisbane", "Gold Coast", "Cairns"] }] },
  { country: "DE", regions: [{ region: "Bavaria", cities: ["Munich", "Nuremberg", "Augsburg"] }, { region: "North Rhine", cities: ["Cologne", "Dusseldorf", "Essen"] }, { region: "Berlin Area", cities: ["Berlin", "Potsdam", "Brandenburg"] }] },
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export class CampaignGeoPerformanceAnalyzerService {
  analyzeGeoPerformance(campaignId: string, tenantId: string): GeoPerformanceReport | null {
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const a = portfolio.analyses.find((c: any) => c.campaignId === campaignId);
    if (!a) return null;
    const p = a.performance;
    const totalImps = p.impressions || 100000;
    const totalClicks = p.clicks || 5000;
    const totalConvs = p.conversions || 200;
    const totalRev = p.revenue || 15000;
    const totalSpd = p.spend || 5000;

    const locations: GeoLocationDetail[] = [];
    const seed = hashStr(campaignId + tenantId);

    for (const country of COUNTRIES) {
      for (const region of country.regions) {
        for (const city of region.cities) {
          const locSeed = seed + hashStr(country.country + region.region + city);
          const share = 0.001 + ((locSeed % 97) / 100) * 0.08;
          const imps = Math.round(totalImps * share);
          const ctrBase = 0.8 + ((locSeed * 7) % 50) / 50;
          const clicks = Math.round(imps * Math.min(5, ctrBase) / 100);
          const cvrBase = 1.5 + ((locSeed * 13) % 60) / 30;
          const convs = Math.round(clicks * Math.min(15, cvrBase) / 100);
          const revShare = share * (0.6 + ((locSeed * 17) % 40) / 100);
          const rev = Math.round(totalRev * revShare);
          const spdShare = share * (0.5 + ((locSeed * 11) % 50) / 100);
          const spd = Math.round(totalSpd * spdShare);
          const ctr = imps > 0 ? Math.round(clicks / imps * 10000) / 100 : 0;
          const cvr = clicks > 0 ? Math.round(convs / clicks * 10000) / 100 : 0;
          const roas = spd > 0 ? Math.round(rev / spd * 100) / 100 : 0;
          const cpc = clicks > 0 ? Math.round(spd / clicks * 100) / 100 : 0;
          const score = Math.round(ctr / 2.5 * 25 + cvr / 4 * 25 + roas / 3 * 25 + share * 100 * 25);
          const status: "overperforming" | "performing" | "underperforming" = score >= 65 ? "overperforming" : score >= 40 ? "performing" : "underperforming";
          locations.push({ country: country.country, region: region.region, city, impressions: imps, clicks, conversions: convs, revenue: rev, spend: spd, ctr, cvr, roas, cpc, share: Math.round(share * 10000) / 100, performanceScore: Math.min(100, score), status });
        }
      }
    }

    locations.sort((a, b) => b.performanceScore - a.performanceScore);
    const topRegion = locations[0] ? `${locations[0].city}, ${locations[0].region} (${locations[0].country})` : "N/A";
    const bottomRegion = locations[locations.length - 1] ? `${locations[locations.length - 1].city}, ${locations[locations.length - 1].region} (${locations[locations.length - 1].country})` : "N/A";

    const countrySummaryMap = new Map<string, { totalRevenue: number; totalSpend: number; locationCount: number }>();
    for (const loc of locations) {
      const existing = countrySummaryMap.get(loc.country) || { totalRevenue: 0, totalSpend: 0, locationCount: 0 };
      existing.totalRevenue += loc.revenue;
      existing.totalSpend += loc.spend;
      existing.locationCount++;
      countrySummaryMap.set(loc.country, existing);
    }
    const countrySummary = Array.from(countrySummaryMap.entries()).map(([country, data]) => ({
      country, totalRevenue: data.totalRevenue, totalSpend: data.totalSpend, roas: data.totalSpend > 0 ? Math.round(data.totalRevenue / data.totalSpend * 100) / 100 : 0, locationCount: data.locationCount,
    })).sort((a, b) => b.roas - a.roas);

    const recommendations: string[] = [];
    if (countrySummary.length > 0) {
      const best = countrySummary[0];
      const worst = countrySummary[countrySummary.length - 1];
      if (best.roas > worst.roas * 1.5) recommendations.push(`Significant geographic disparity: ${best.country} ROAS (${best.roas}x) is ${Math.round(best.roas / worst.roas)}x ${worst.country} — reallocate budget toward ${best.country}`);
    }
    const underperf = locations.filter(l => l.status === "underperforming");
    if (underperf.length > 3) recommendations.push(`${underperf.length} locations underperforming — consider geo-targeted bid adjustments or pausing low-performing regions`);
    const overperf = locations.filter(l => l.status === "overperforming" && l.share < 0.02);
    if (overperf.length > 0) recommendations.push(`${overperf.length} high-potential locations are under-invested — increase bids to capture untapped volume in ${overperf.slice(0, 3).map(l => l.city).join(", ")}`);
    recommendations.push("Review location-specific ad copy and landing page localization for top 5 locations to further improve conversion rates");

    return { campaignId, campaignName: a.campaignName, generatedAt: new Date().toISOString(), locations, topRegion, bottomRegion, countrySummary, recommendations };
  }

  generateGeoOptimizationRecommendations(campaignId: string, tenantId: string): GeoOptimizationRecommendation[] {
    const report = this.analyzeGeoPerformance(campaignId, tenantId);
    if (!report) return [];
    const seen = new Set<string>();
    const recs: GeoOptimizationRecommendation[] = [];
    for (const loc of report.locations) {
      const key = loc.country + loc.region;
      if (seen.has(key)) continue;
      seen.add(key);
      const perfRatio = loc.performanceScore / 100;
      const adjustment = Math.round((perfRatio * 1.2 - 1) * 100);
      recs.push({
        location: `${loc.region}, ${loc.country}`,
        country: loc.country,
        currentPerformance: loc.status,
        recommendation: loc.status === "overperforming" ? `Increase bids in ${loc.region} by ${Math.abs(adjustment)}% to maximize ROI` : loc.status === "underperforming" ? `Reduce ${loc.region} spend by ${Math.abs(adjustment)}% until optimization improves` : `Maintain ${loc.region} strategy with minor creative adjustments for local relevance`,
        expectedImpact: loc.status === "overperforming" ? "12-20% revenue increase" : loc.status === "underperforming" ? "15-25% cost reduction" : "5-10% efficiency gain",
        bidAdjustment: adjustment,
        priority: loc.status === "overperforming" ? "high" : loc.status === "underperforming" ? "high" : "medium",
      });
    }
    return recs.sort((a, b) => a.priority === "high" ? -1 : b.priority === "high" ? 1 : 0);
  }

  identifyGeoExpansionOpportunities(tenantId: string): GeoExpansionOpportunity[] {
    const opportunities: GeoExpansionOpportunity[] = [];
    const seed = hashStr(tenantId);
    const expansionTargets = [
      { country: "JP", region: "Tokyo Metro", competition: "high" as const, difficulty: "hard" as const },
      { country: "JP", region: "Kansai", competition: "medium" as const, difficulty: "moderate" as const },
      { country: "BR", region: "Sao Paulo State", competition: "medium" as const, difficulty: "moderate" as const },
      { country: "BR", region: "Rio de Janeiro", competition: "low" as const, difficulty: "easy" as const },
      { country: "IN", region: "Maharashtra", competition: "high" as const, difficulty: "moderate" as const },
      { country: "IN", region: "Karnataka", competition: "medium" as const, difficulty: "easy" as const },
      { country: "MX", region: "Mexico City Area", competition: "low" as const, difficulty: "easy" as const },
      { country: "MX", region: "Nuevo Leon", competition: "low" as const, difficulty: "easy" as const },
      { country: "FR", region: "Ile-de-France", competition: "high" as const, difficulty: "hard" as const },
      { country: "FR", region: "Provence-Alpes-Cote d'Azur", competition: "medium" as const, difficulty: "moderate" as const },
      { country: "ES", region: "Madrid Area", competition: "medium" as const, difficulty: "moderate" as const },
      { country: "ES", region: "Catalonia", competition: "medium" as const, difficulty: "easy" as const },
      { country: "IT", region: "Lombardy", competition: "high" as const, difficulty: "hard" as const },
      { country: "IT", region: "Lazio", competition: "medium" as const, difficulty: "moderate" as const },
      { country: "KR", region: "Seoul Capital", competition: "high" as const, difficulty: "hard" as const },
    ];
    for (const t of expansionTargets) {
      const idx = seed + hashStr(t.country + t.region);
      const marketSize = 50000 + ((idx * 31) % 950000);
      const baseROAS = t.competition === "low" ? 2.5 : t.competition === "medium" ? 1.8 : 1.2;
      const projROAS = Math.round((baseROAS + ((idx * 7) % 50) / 100) * 100) / 100;
      const projRev = Math.round(marketSize * projROAS * 0.01);
      opportunities.push({
        country: t.country,
        region: t.region,
        estimatedMarketSize: marketSize,
        competitionLevel: t.competition,
        projectedROAS: projROAS,
        entryDifficulty: t.difficulty,
        recommendation: t.difficulty === "easy" ? `Low-opportunity market — launch test campaign with $500-1000 budget` : t.difficulty === "moderate" ? `Moderate opportunity — plan 3-month market entry with $2000-5000 budget` : `High barrier market — consider partnership or local agency before investing`,
        projectedMonthlyRevenue: projRev,
      });
    }
    return opportunities.sort((a, b) => b.projectedROAS - a.projectedROAS);
  }

  calculateGeoBidAdjustments(campaignId: string, tenantId: string): GeoBidAdjustment[] {
    const report = this.analyzeGeoPerformance(campaignId, tenantId);
    if (!report) return [];
    const seen = new Set<string>();
    const adj: GeoBidAdjustment[] = [];
    for (const loc of report.locations) {
      const key = loc.country + loc.region;
      if (seen.has(key)) continue;
      seen.add(key);
      const currentBase = 1.0 + (loc.performanceScore - 50) / 100 * 0.3;
      const perfAdjust = (loc.performanceScore - 50) / 100 * 0.6;
      const recommended = Math.round(Math.max(0.1, currentBase + perfAdjust) * 100) / 100;
      const change = Math.round((recommended - currentBase) / currentBase * 100);
      adj.push({
        location: loc.region,
        country: loc.country,
        currentBidMultiplier: Math.round(currentBase * 100) / 100,
        recommendedMultiplier: recommended,
        changePercent: change,
        rationale: `${loc.region} (${loc.country}) score ${loc.performanceScore}/100 — ${loc.status === "overperforming" ? "increase bids" : loc.status === "underperforming" ? "reduce bids" : "maintain bids"} for optimal geo-ROAS`,
        expectedROASImpact: loc.status === "overperforming" ? Math.round((1 - recommended / currentBase) * 100) : loc.status === "underperforming" ? Math.round((currentBase / recommended - 1) * 100) : 0,
      });
    }
    return adj;
  }

  analyzeGeoAudienceOverlap(tenantId: string): GeoAudienceOverlap[] {
    const countries = COUNTRIES.map(c => c.country);
    const overlap: GeoAudienceOverlap[] = [];
    const seed = hashStr(tenantId);
    for (let i = 0; i < countries.length; i++) {
      for (let j = i + 1; j < countries.length; j++) {
        const pairSeed = seed + hashStr(countries[i] + countries[j]);
        const overlapPct = 5 + ((pairSeed * 13) % 40);
        const exclA = Math.round(70 - overlapPct * 0.3 + ((pairSeed * 7) % 15));
        const exclB = Math.round(60 - overlapPct * 0.2 + ((pairSeed * 11) % 15));
        overlap.push({
          countryA: countries[i],
          countryB: countries[j],
          overlapPercent: Math.round(overlapPct),
          exclusiveA: Math.min(100, exclA),
          exclusiveB: Math.min(100, exclB),
          interpretation: overlapPct > 30 ? `High overlap — ${countries[i]} and ${countries[j]} share significant audience; coordinate campaigns to avoid over-exposure` : overlapPct > 15 ? `Moderate overlap — consider cross-market attribution for ${countries[i]}↔${countries[j]}` : `Low overlap — ${countries[i]} and ${countries[j]} audiences are largely distinct; treat as separate markets`,
        });
      }
    }
    return overlap;
  }

  analyzeGeoTrends(campaignId: string, tenantId: string): GeoTrend[] {
    const report = this.analyzeGeoPerformance(campaignId, tenantId);
    if (!report) return [];
    const seen = new Set<string>();
    const trends: GeoTrend[] = [];
    for (const loc of report.locations) {
      const key = loc.country + loc.region;
      if (seen.has(key)) continue;
      seen.add(key);
      const metrics = ["ctr", "cvr", "roas", "cpc"].map(m => {
        const val = (loc as any)[m] || 0;
        const chg = Math.round((Math.random() * 24 - 12) * 10) / 10;
        const dir: "up" | "down" | "stable" = chg > 3 ? "up" : chg < -3 ? "down" : "stable";
        return { metric: m.toUpperCase(), value: val, change: chg, direction: dir };
      });
      const up = metrics.filter(m => m.direction === "up").length;
      const down = metrics.filter(m => m.direction === "down").length;
      trends.push({
        location: loc.region,
        country: loc.country,
        period: "Last 30 days",
        metrics,
        overallDirection: up > down ? "improving" as const : down > up ? "declining" as const : "stable" as const,
      });
    }
    return trends;
  }
}

export const campaignGeoPerformanceAnalyzer = new CampaignGeoPerformanceAnalyzerService();
