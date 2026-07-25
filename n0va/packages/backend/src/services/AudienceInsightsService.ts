import { DataStore } from "./DataStore";

export class AudienceInsightsService {
  getInsights(tenantId: string, audienceId?: string) {
    const mem = DataStore["mem"]();
    const audiences = audienceId
      ? [mem.findOne("audiences", (a: any) => a._id === audienceId)].filter(Boolean)
      : mem.find("audiences", (a: any) => a.tenantId === tenantId);

    const campaigns = mem.find("campaigns", (c: any) => c.tenantId === tenantId);

    const demographics = {
      ageGroups: [
        { label: "18-24", percentage: 22, size: 45000, ctr: 2.8, cvr: 3.2 },
        { label: "25-34", percentage: 35, size: 72000, ctr: 3.4, cvr: 4.1 },
        { label: "35-44", percentage: 24, size: 49000, ctr: 2.9, cvr: 3.8 },
        { label: "45-54", percentage: 13, size: 27000, ctr: 2.1, cvr: 2.5 },
        { label: "55+", percentage: 6, size: 12000, ctr: 1.5, cvr: 1.8 },
      ],
      genders: [
        { label: "Male", percentage: 48, ctr: 2.9, cvr: 3.1 },
        { label: "Female", percentage: 50, ctr: 3.2, cvr: 3.9 },
        { label: "Other", percentage: 2, ctr: 2.5, cvr: 2.8 },
      ],
      income: [
        { label: "< $25K", percentage: 12, size: 18000 },
        { label: "$25K - $50K", percentage: 28, size: 42000 },
        { label: "$50K - $75K", percentage: 32, size: 48000 },
        { label: "$75K - $100K", percentage: 18, size: 27000 },
        { label: "$100K+", percentage: 10, size: 15000 },
      ],
    };

    const geoDistribution = [
      { region: "North America", percentage: 42, impressions: 320000, conversions: 4800 },
      { region: "Europe", percentage: 28, impressions: 210000, conversions: 2900 },
      { region: "Asia Pacific", percentage: 18, impressions: 135000, conversions: 1600 },
      { region: "Latin America", percentage: 8, impressions: 60000, conversions: 700 },
      { region: "Middle East & Africa", percentage: 4, impressions: 30000, conversions: 300 },
    ];

    const deviceBreakdown = [
      { device: "Mobile", percentage: 62, ctr: 3.5, cvr: 4.2 },
      { device: "Desktop", percentage: 28, ctr: 2.8, cvr: 3.5 },
      { device: "Tablet", percentage: 10, ctr: 2.2, cvr: 2.8 },
    ];

    const interests = [
      { category: "Technology", affinity: 85, reach: 95000 },
      { category: "Business & Finance", affinity: 72, reach: 82000 },
      { category: "Software Development", affinity: 68, reach: 74000 },
      { category: "Digital Marketing", affinity: 65, reach: 71000 },
      { category: "SaaS", affinity: 60, reach: 65000 },
      { category: "AI & Machine Learning", affinity: 55, reach: 58000 },
      { category: "eCommerce", affinity: 48, reach: 52000 },
      { category: "Startups", affinity: 45, reach: 48000 },
    ];

    const lookalikeSuggestions = [
      { id: "la_1", name: "High-Value Converters Lookalike", sourceAudience: "Top 10% Converters", estimatedReach: 85000, matchRate: 88, similarity: 0.92 },
      { id: "la_2", name: "Engaged Users Expansion", sourceAudience: "Last 30 Day Engagers", estimatedReach: 120000, matchRate: 76, similarity: 0.84 },
      { id: "la_3", name: "Cart Abandoners LAL", sourceAudience: "Cart Abandoners", estimatedReach: 65000, matchRate: 82, similarity: 0.88 },
      { id: "la_4", name: "Newsletter Subscribers Lookalike", sourceAudience: "Email Subscribers", estimatedReach: 95000, matchRate: 79, similarity: 0.86 },
    ];

    const audiencePerformance = audiences.map((aud: any) => {
      const campMatch = campaigns.filter((c: any) => c._id === aud.campaignId || (aud.tags || []).some((t: string) => (c.tags || []).includes(t)));
      const totalSpend = campMatch.reduce((s: number, c: any) => s + (c.budget?.spent || 0), 0);
      return {
        id: aud._id,
        name: aud.name,
        type: aud.type || "custom",
        size: aud.size || Math.floor(Math.random() * 50000) + 10000,
        reach: Math.floor((aud.size || 50000) * 0.7),
        engagement: (Math.random() * 5 + 2).toFixed(1),
        conversionRate: (Math.random() * 4 + 1).toFixed(1),
        cpa: Math.floor(Math.random() * 40) + 15,
        spend: totalSpend,
        campaigns: campMatch.length,
      };
    });

    return {
      demographics,
      geoDistribution,
      deviceBreakdown,
      interests,
      lookalikeSuggestions,
      audiencePerformance,
      totalAudiences: audiences.length,
      totalReach: audiences.reduce((s: number, a: any) => s + (a.size || 0), 0),
      topAudience: audiences.sort((a: any, b: any) => (b.size || 0) - (a.size || 0))[0]?.name || "None",
    };
  }

  getLookalikeInsights(tenantId: string) {
    const insights = this.getInsights(tenantId);
    return {
      suggestions: insights.lookalikeSuggestions,
      recommendation: "Create a lookalike audience from your top 10% of converters to reach new users with similar behavior patterns. Expected match rate: 82-88%.",
    };
  }
}

export const audienceInsightsService = new AudienceInsightsService();
