import { DataStore } from "./DataStore";

interface Influencer {
  id: string;
  tenantId: string;
  name: string;
  handle: string;
  platform: "instagram" | "tiktok" | "youtube" | "twitter" | "linkedin";
  category: string[];
  followers: number;
  engagementRate: number;
  avgViews: number;
  priceRange: { min: number; max: number };
  location?: string;
  email?: string;
  bio: string;
  avatarUrl?: string;
  reach: { estimated: number; gender: string; ageGroups: { label: string; pct: number }[]; topCountries: string[] };
  metrics: { totalCampaigns: number; avgROI: number; avgCPE: number; rating: number };
  status: "discovered" | "contacted" | "negotiating" | "contracted" | "active" | "completed" | "declined";
  campaignIds: string[];
  notes: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface CampaignInfluencer {
  id: string;
  campaignId: string;
  influencerId: string;
  influencerName: string;
  influencerHandle: string;
  platform: string;
  deliverables: string[];
  compensation: number;
  status: "proposed" | "accepted" | "delivered" | "approved" | "paid";
  performance?: { impressions: number; engagements: number; conversions: number; revenue: number; roi: number };
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

export class InfluencerService {
  search(query: { category?: string; platform?: string; minFollowers?: number; maxPrice?: number; location?: string }): Influencer[] {
    return ([
      { id: "inf_1", tenantId: "", name: "Alex Chen", handle: "@alexchen", platform: "instagram", category: ["tech", "saas"], followers: 245000, engagementRate: 3.8, avgViews: 52000, priceRange: { min: 1500, max: 3500 }, bio: "Tech entrepreneur sharing SaaS insights", reach: { estimated: 350000, gender: "60% male", ageGroups: [{ label: "25-34", pct: 45 }, { label: "35-44", pct: 30 }], topCountries: ["US", "UK", "Canada"] }, metrics: { totalCampaigns: 28, avgROI: 3.2, avgCPE: 0.45, rating: 4.7 }, status: "discovered", campaignIds: [], notes: "", tags: ["saas", "tech", "b2b"], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: "inf_2", tenantId: "", name: "Sarah Williams", handle: "@sarahw", platform: "tiktok", category: ["marketing", "business"], followers: 512000, engagementRate: 5.2, avgViews: 120000, priceRange: { min: 2000, max: 5000 }, bio: "Marketing tips & business growth", reach: { estimated: 800000, gender: "55% female", ageGroups: [{ label: "18-24", pct: 35 }, { label: "25-34", pct: 40 }], topCountries: ["US", "UK", "Australia"] }, metrics: { totalCampaigns: 45, avgROI: 4.1, avgCPE: 0.32, rating: 4.9 }, status: "discovered", campaignIds: [], notes: "", tags: ["marketing", "business", "growth"], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: "inf_3", tenantId: "", name: "Marcus Johnson", handle: "@marcusj", platform: "youtube", category: ["tech", "reviews"], followers: 890000, engagementRate: 4.5, avgViews: 185000, priceRange: { min: 3000, max: 8000 }, bio: "In-depth tech reviews & tutorials", reach: { estimated: 1.2e6, gender: "70% male", ageGroups: [{ label: "18-24", pct: 25 }, { label: "25-34", pct: 50 }], topCountries: ["US", "India", "UK"] }, metrics: { totalCampaigns: 62, avgROI: 3.8, avgCPE: 0.55, rating: 4.8 }, status: "discovered", campaignIds: [], notes: "", tags: ["tech", "reviews", "youtube"], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: "inf_4", tenantId: "", name: "Emily Park", handle: "@emilypark", platform: "instagram", category: ["lifestyle", "beauty"], followers: 1.2e6, engagementRate: 2.9, avgViews: 98000, priceRange: { min: 5000, max: 12000 }, bio: "Lifestyle & beauty content creator", reach: { estimated: 2.5e6, gender: "80% female", ageGroups: [{ label: "18-24", pct: 40 }, { label: "25-34", pct: 35 }], topCountries: ["US", "Canada", "UK"] }, metrics: { totalCampaigns: 85, avgROI: 2.5, avgCPE: 0.78, rating: 4.5 }, status: "discovered", campaignIds: [], notes: "", tags: ["lifestyle", "beauty", "fashion"], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: "inf_5", tenantId: "", name: "Tech Review Pro", handle: "@techreviewpro", platform: "youtube", category: ["tech", "reviews", "gadgets"], followers: 2.1e6, engagementRate: 3.2, avgViews: 420000, priceRange: { min: 8000, max: 20000 }, bio: "Professional tech reviews & comparisons", reach: { estimated: 5e6, gender: "75% male", ageGroups: [{ label: "18-24", pct: 30 }, { label: "25-34", pct: 45 }], topCountries: ["US", "India", "UK", "Germany"] }, metrics: { totalCampaigns: 120, avgROI: 4.5, avgCPE: 0.42, rating: 4.9 }, status: "discovered", campaignIds: [], notes: "", tags: ["tech", "reviews", "gadgets", "sponsor"], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: "inf_6", tenantId: "", name: "Growth Hacker Daily", handle: "@growthdaily", platform: "twitter", category: ["marketing", "growth", "saas"], followers: 156000, engagementRate: 4.8, avgViews: 45000, priceRange: { min: 800, max: 2000 }, bio: "Growth hacking & SaaS marketing", reach: { estimated: 250000, gender: "65% male", ageGroups: [{ label: "25-34", pct: 50 }, { label: "35-44", pct: 25 }], topCountries: ["US", "UK"] }, metrics: { totalCampaigns: 35, avgROI: 5.2, avgCPE: 0.28, rating: 4.6 }, status: "discovered", campaignIds: [], notes: "", tags: ["growth", "saas", "marketing", "twitter"], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: "inf_7", tenantId: "", name: "LinkedIn Insider", handle: "@linkedininsider", platform: "linkedin", category: ["b2b", "leadership", "saas"], followers: 89000, engagementRate: 5.5, avgViews: 28000, priceRange: { min: 1000, max: 3000 }, bio: "B2B thought leadership & LinkedIn strategy", reach: { estimated: 150000, gender: "55% male", ageGroups: [{ label: "35-44", pct: 40 }, { label: "45-54", pct: 30 }], topCountries: ["US", "UK", "Canada"] }, metrics: { totalCampaigns: 18, avgROI: 6.1, avgCPE: 0.22, rating: 4.8 }, status: "discovered", campaignIds: [], notes: "", tags: ["b2b", "linkedin", "saas", "leadership"], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ] as Influencer[]).filter(i => {
      if (query.platform && i.platform !== query.platform) return false;
      if (query.category && !i.category.some(c => c.includes(query.category!))) return false;
      if (query.minFollowers && i.followers < query.minFollowers) return false;
      if (query.maxPrice && i.priceRange.min > query.maxPrice) return false;
      return true;
    });
  }

  addToCampaign(tenantId: string, data: { campaignId: string; influencerId: string; influencerName: string; influencerHandle: string; platform: string; deliverables: string[]; compensation: number }): CampaignInfluencer {
    const mem = DataStore["mem"]();
    const ci: CampaignInfluencer = {
      id: `ci_${Date.now()}`,
      campaignId: data.campaignId,
      influencerId: data.influencerId,
      influencerName: data.influencerName,
      influencerHandle: data.influencerHandle,
      platform: data.platform,
      deliverables: data.deliverables,
      compensation: data.compensation,
      status: "proposed",
      createdAt: new Date().toISOString(),
    };
    mem.insert("campaign_influencers", ci);
    return ci;
  }

  getCampaignInfluencers(campaignId: string): CampaignInfluencer[] {
    return DataStore["mem"]().find("campaign_influencers", (ci: any) => ci.campaignId === campaignId);
  }

  updateInfluencerStatus(tenantId: string, id: string, status: string, performance?: any): CampaignInfluencer | null {
    const mem = DataStore["mem"]();
    const ci = mem.findOne("campaign_influencers", (c: any) => c.id === id);
    if (!ci) return null;
    const updated = { ...ci, status, ...(performance ? { performance } : {}), updatedAt: new Date().toISOString() };
    mem.update("campaign_influencers", (c: any) => c.id === id, updated);
    return updated;
  }

  getAllCampaignInfluencers(tenantId: string): CampaignInfluencer[] {
    const mem = DataStore["mem"]();
    const campaigns = mem.find("campaigns", (c: any) => c.tenantId === tenantId);
    const campaignIds = campaigns.map((c: any) => c._id);
    return mem.find("campaign_influencers", (ci: any) => campaignIds.includes(ci.campaignId));
  }

  getPlatforms(): { platform: string; label: string; icon: string }[] {
    return [
      { platform: "instagram", label: "Instagram", icon: "camera" },
      { platform: "tiktok", label: "TikTok", icon: "music" },
      { platform: "youtube", label: "YouTube", icon: "video" },
      { platform: "twitter", label: "X (Twitter)", icon: "message-circle" },
      { platform: "linkedin", label: "LinkedIn", icon: "briefcase" },
    ];
  }
}

export const influencerService = new InfluencerService();
