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

interface GeoRegionCluster {
  clusterId: string;
  name: string;
  regions: string[];
  avgCtr: number;
  avgCvr: number;
  avgRoas: number;
  performanceProfile: string;
  recommendations: string[];
}

interface GeoTimeZoneEntry {
  timezone: string;
  countries: string[];
  bestPerformanceHour: number;
  avgCtrByHour: { hour: number; ctr: number }[];
  optimalAdSchedule: { startHour: number; endHour: number; bidMultiplier: number }[];
  recommendations: string[];
}

interface GeoLocalizationScore {
  country: string;
  region: string;
  overallScore: number;
  adCopyLocalization: number;
  landingPageLocalization: number;
  culturalRelevance: number;
  languageAccuracy: number;
  imageryRelevance: number;
  improvementSuggestions: string[];
}

interface GeoCrossBorderEntry {
  countryPair: string;
  originatingCountry: string;
  targetCountry: string;
  crossBorderTraffic: number;
  crossBorderConversions: number;
  crossBorderRevenue: number;
  conversionRate: number;
  averageOrderValue: number;
  recommendations: string[];
}

interface GeoPredictiveEntry {
  country: string;
  region: string;
  currentSimilarityScore: number;
  predictedCtr: number;
  predictedCvr: number;
  predictedRoas: number;
  confidenceLevel: "high" | "medium" | "low";
  recommendedBudget: number;
  riskLevel: "low" | "medium" | "high";
}

interface GeoCompetitiveEntry {
  country: string;
  region: string;
  competitiveDensity: "low" | "medium" | "high";
  estimatedCompetitors: number;
  marketShare: number;
  adPriceIndex: number;
  saturationLevel: "low" | "medium" | "high";
  barriersToEntry: string[];
  strategicPosition: string;
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
    const trendSeed = hashStr(campaignId + tenantId + "trends");
    let idx = 0;
    for (const loc of report.locations) {
      const key = loc.country + loc.region;
      if (seen.has(key)) continue;
      seen.add(key);
      const metrics = ["ctr", "cvr", "roas", "cpc"].map((m, mi) => {
        const val = (loc as any)[m] || 0;
        const chg = Math.round(((trendSeed + idx * 7 + mi * 13) % 25 - 12) * 10) / 10;
        idx++;
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

  geoRegionClustering(campaignId: string, tenantId: string): GeoRegionCluster[] {
    const report = this.analyzeGeoPerformance(campaignId, tenantId);
    if (!report) return [];
    const seen = new Set<string>();
    const clusters: GeoRegionCluster[] = [];
    const regionProfiles: { region: string; country: string; ctr: number; cvr: number; roas: number }[] = [];
    for (const loc of report.locations) {
      const key = loc.country + loc.region;
      if (seen.has(key)) continue;
      seen.add(key);
      regionProfiles.push({ region: `${loc.region}, ${loc.country}`, country: loc.country, ctr: loc.ctr, cvr: loc.cvr, roas: loc.roas });
    }
    const clusterSeed = hashStr(campaignId + tenantId + "clusters");
    const clustersRaw = [
      { name: "High Performers", minCtr: 4, minCvr: 5, minRoas: 2.5 },
      { name: "Volume Drivers", minCtr: 2, minCvr: 2, minRoas: 1.2 },
      { name: "Conversion Focused", minCtr: 0, minCvr: 4, minRoas: 1.5 },
      { name: "Growth Opportunities", minCtr: 0, minCvr: 0, minRoas: 0 },
    ];
    for (let ci = 0; ci < clustersRaw.length; ci++) {
      const c = clustersRaw[ci];
      const members = regionProfiles.filter(r => r.ctr >= c.minCtr && r.cvr >= c.minCvr && r.roas >= c.minRoas);
      if (members.length === 0) continue;
      const avgCtr = Math.round(members.reduce((s, r) => s + r.ctr, 0) / members.length * 100) / 100;
      const avgCvr = Math.round(members.reduce((s, r) => s + r.cvr, 0) / members.length * 100) / 100;
      const avgRoas = Math.round(members.reduce((s, r) => s + r.roas, 0) / members.length * 100) / 100;
      const recs: string[] = [];
      if (ci === 0) recs.push("Increase budgets in these regions to maximize ROAS");
      if (ci === 1) recs.push("Optimize creative to improve conversion rates in high-volume regions");
      if (ci === 2) recs.push("Expand lookalike audiences from these conversion-rich regions");
      if (ci === 3) recs.push("Apply learnings from high-performers to boost CTR and CVR");
      clusters.push({
        clusterId: `cluster_${ci}_${clusterSeed % 1000}`,
        name: c.name,
        regions: members.map(r => r.region),
        avgCtr, avgCvr, avgRoas,
        performanceProfile: ci === 0 ? "Star" : ci === 1 ? "Volume" : ci === 2 ? "Converter" : "Developing",
        recommendations: recs,
      });
    }
    return clusters;
  }

  geoTimeZoneAnalysis(campaignId: string, tenantId: string): GeoTimeZoneEntry[] {
    const report = this.analyzeGeoPerformance(campaignId, tenantId);
    if (!report) return [];
    const tzSeed = hashStr(campaignId + tenantId + "timezone");
    const timezones = [
      { tz: "America/New_York", countries: ["US (East)", "CA (East)"], offset: -5 },
      { tz: "America/Chicago", countries: ["US (Central)"], offset: -6 },
      { tz: "America/Denver", countries: ["US (Mountain)"], offset: -7 },
      { tz: "America/Los_Angeles", countries: ["US (West)", "CA (West)"], offset: -8 },
      { tz: "Europe/London", countries: ["UK"], offset: 0 },
      { tz: "Europe/Berlin", countries: ["DE"], offset: 1 },
      { tz: "Australia/Sydney", countries: ["AU"], offset: 11 },
    ];
    const entries: GeoTimeZoneEntry[] = [];
    for (let ti = 0; ti < timezones.length; ti++) {
      const tz = timezones[ti];
      const baseHour = 8 + ((tzSeed + ti * 17) % 12);
      const hours: { hour: number; ctr: number }[] = [];
      for (let h = 0; h < 24; h++) {
        const dist = Math.abs(h - baseHour);
        const ctr = Math.round((2.5 - dist * 0.08 + ((tzSeed + ti * 31 + h * 7) % 30) / 50) * 100) / 100;
        hours.push({ hour: h, ctr: Math.max(0.1, ctr) });
      }
      const sorted = [...hours].sort((a, b) => b.ctr - a.ctr);
      const peakHour = sorted[0].hour;
      const schedule = [
        { startHour: Math.max(0, peakHour - 3), endHour: Math.min(23, peakHour + 3), bidMultiplier: 1.3 },
        { startHour: Math.max(0, peakHour - 6), endHour: peakHour - 3, bidMultiplier: 1.1 },
        { startHour: peakHour + 3, endHour: Math.min(23, peakHour + 6), bidMultiplier: 1.1 },
      ];
      entries.push({
        timezone: tz.tz,
        countries: tz.countries,
        bestPerformanceHour: peakHour,
        avgCtrByHour: hours,
        optimalAdSchedule: schedule,
        recommendations: [
          `Schedule 70% of daily budget between ${peakHour - 3}:00-${peakHour + 3}:00 for ${tz.tz}`,
          `Reduce bids by 20% during off-peak hours (${peakHour + 6}:00-${peakHour - 6 < 0 ? peakHour + 18 : peakHour - 6}:00)`,
        ],
      });
    }
    return entries;
  }

  geoLocalizationScore(campaignId: string, tenantId: string): GeoLocalizationScore[] {
    const report = this.analyzeGeoPerformance(campaignId, tenantId);
    if (!report) return [];
    const seen = new Set<string>();
    const scores: GeoLocalizationScore[] = [];
    for (const loc of report.locations) {
      const key = loc.country + loc.region;
      if (seen.has(key)) continue;
      seen.add(key);
      const seed = hashStr(campaignId + tenantId + loc.country + loc.region);
      const adCopyLoc = 40 + ((seed * 13) % 55);
      const lpLoc = 35 + ((seed * 17) % 50);
      const cultural = 45 + ((seed * 19) % 40);
      const language = 50 + ((seed * 23) % 40);
      const imagery = 40 + ((seed * 29) % 50);
      const overall = Math.round((adCopyLoc + lpLoc + cultural + language + imagery) / 5);
      const suggestions: string[] = [];
      if (adCopyLoc < 60) suggestions.push("Localize ad copy with region-specific idioms and references");
      if (lpLoc < 60) suggestions.push("Create dedicated landing pages with local imagery and testimonials");
      if (cultural < 60) suggestions.push("Review cultural references for relevance in this region");
      if (language < 60) suggestions.push("Improve language accuracy — consider native translator");
      if (imagery < 60) suggestions.push("Use region-representative imagery and color schemes");
      if (suggestions.length === 0) suggestions.push("Localization is strong — maintain current approach");
      scores.push({
        country: loc.country,
        region: loc.region,
        overallScore: overall,
        adCopyLocalization: adCopyLoc,
        landingPageLocalization: lpLoc,
        culturalRelevance: cultural,
        languageAccuracy: language,
        imageryRelevance: imagery,
        improvementSuggestions: suggestions,
      });
    }
    return scores.sort((a, b) => a.overallScore - b.overallScore);
  }

  geoCrossBorderAnalysis(campaignId: string, tenantId: string): GeoCrossBorderEntry[] {
    const report = this.analyzeGeoPerformance(campaignId, tenantId);
    if (!report) return [];
    const countries = [...new Set(report.locations.map(l => l.country))];
    const entries: GeoCrossBorderEntry[] = [];
    const cbSeed = hashStr(campaignId + tenantId + "crossborder");
    for (let i = 0; i < countries.length; i++) {
      for (let j = i + 1; j < countries.length; j++) {
        const pairSeed = cbSeed + hashStr(countries[i] + countries[j]);
        const traffic = 500 + ((pairSeed * 31) % 9500);
        const cvr = 1.5 + ((pairSeed * 13) % 60) / 20;
        const convs = Math.round(traffic * cvr / 100);
        const aov = 40 + ((pairSeed * 17) % 160);
        const rev = convs * aov;
        entries.push({
          countryPair: `${countries[i]} ↔ ${countries[j]}`,
          originatingCountry: countries[i],
          targetCountry: countries[j],
          crossBorderTraffic: traffic,
          crossBorderConversions: convs,
          crossBorderRevenue: rev,
          conversionRate: Math.round(cvr * 100) / 100,
          averageOrderValue: aov,
          recommendations: [
            cvr > 4 ? `High cross-border conversion — create ${countries[j]}-specific landing pages for ${countries[i]} traffic` : `Optimize cross-border experience — ${countries[i]} to ${countries[j]} conversion rate is ${cvr}%`,
            traffic > 5000 ? `Significant traffic volume — consider dedicated ${countries[j]} campaigns targeting ${countries[i]} audience` : `Test ${countries[j]} offers with ${countries[i]} audience to gauge demand`,
          ],
        });
      }
    }
    return entries;
  }

  geoPredictiveExpansion(campaignId: string, tenantId: string): GeoPredictiveEntry[] {
    const report = this.analyzeGeoPerformance(campaignId, tenantId);
    if (!report) return [];
    const expansionTargets = [
      { country: "JP", region: "Tokyo Metro" }, { country: "JP", region: "Kansai" },
      { country: "BR", region: "Sao Paulo State" }, { country: "BR", region: "Rio de Janeiro" },
      { country: "IN", region: "Maharashtra" }, { country: "IN", region: "Karnataka" },
      { country: "MX", region: "Mexico City Area" }, { country: "FR", region: "Ile-de-France" },
      { country: "ES", region: "Madrid Area" }, { country: "IT", region: "Lombardy" },
      { country: "KR", region: "Seoul Capital" },
    ];
    const predSeed = hashStr(campaignId + tenantId + "predictive");
    const results: GeoPredictiveEntry[] = [];
    const existingPerf = report.locations.reduce((acc, l) => { acc[l.country] = l.roas; return acc; }, {} as Record<string, number>);
    for (let ti = 0; ti < expansionTargets.length; ti++) {
      const t = expansionTargets[ti];
      const similarity = 20 + ((predSeed + ti * 13) % 65);
      const baseRoas = existingPerf[t.country] || 1.5;
      const predictedRoas = Math.round((baseRoas * (similarity / 100) + ((predSeed + ti * 17) % 100) / 100) * 100) / 100;
      const predictedCtr = Math.round((2 + ((predSeed + ti * 19) % 40) / 10 + similarity / 50) * 100) / 100;
      const predictedCvr = Math.round((1.5 + ((predSeed + ti * 23) % 30) / 10 + similarity / 80) * 100) / 100;
      const confidence: "high" | "medium" | "low" = similarity > 60 ? "high" : similarity > 35 ? "medium" : "low";
      const budget = 500 + ((predSeed + ti * 29) % 4500);
      const risk: "low" | "medium" | "high" = similarity > 60 ? "low" : similarity > 35 ? "medium" : "high";
      results.push({
        country: t.country,
        region: t.region,
        currentSimilarityScore: similarity,
        predictedCtr, predictedCvr, predictedRoas,
        confidenceLevel: confidence,
        recommendedBudget: budget,
        riskLevel: risk,
      });
    }
    return results.sort((a, b) => b.predictedRoas - a.predictedRoas);
  }

  geoCompetitiveLandscape(campaignId: string, tenantId: string): GeoCompetitiveEntry[] {
    const report = this.analyzeGeoPerformance(campaignId, tenantId);
    if (!report) return [];
    const seen = new Set<string>();
    const entries: GeoCompetitiveEntry[] = [];
    const compSeed = hashStr(campaignId + tenantId + "competitive");
    for (const loc of report.locations) {
      const key = loc.country + loc.region;
      if (seen.has(key)) continue;
      seen.add(key);
      const ci = hashStr(loc.country + loc.region + "ci") % 100;
      const density: "low" | "medium" | "high" = ci > 66 ? "high" : ci > 33 ? "medium" : "low";
      const competitors = density === "high" ? 15 + (ci % 20) : density === "medium" ? 6 + (ci % 10) : 2 + (ci % 5);
      const share = 1 + ((compSeed + hashStr(loc.country + loc.region)) % 20);
      const priceIdx = 80 + ((compSeed + loc.performanceScore * 7) % 60);
      const saturation: "low" | "medium" | "high" = priceIdx > 120 ? "high" : priceIdx > 100 ? "medium" : "low";
      const barriers: string[] = [];
      if (density === "high") barriers.push("Strong incumbent presence with established brand loyalty");
      if (priceIdx > 110) barriers.push("High CPC environment — requires competitive budgeting");
      if (saturation === "high") barriers.push("Market is saturated with similar offerings");
      if (barriers.length === 0) barriers.push("Low barriers — favorable entry conditions");
      const pos = density === "low" ? "First-mover advantage possible" : density === "medium" ? "Differentiation through niche positioning" : "Compete on quality score and ad relevance";
      entries.push({
        country: loc.country,
        region: loc.region,
        competitiveDensity: density,
        estimatedCompetitors: competitors,
        marketShare: share,
        adPriceIndex: priceIdx,
        saturationLevel: saturation,
        barriersToEntry: barriers,
        strategicPosition: pos,
      });
    }
    return entries;
  }
}

export const campaignGeoPerformanceAnalyzer = new CampaignGeoPerformanceAnalyzerService();
