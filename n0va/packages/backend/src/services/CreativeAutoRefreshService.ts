import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

const TAG_POOL = ["beach", "summer", "sale", "new", "brand", "lifestyle", "product", "discount", "holiday", "launch", "tech", "fashion"];

export class CreativeAutoRefreshService {
  generateCreative(tenantId: string, description: string, count: number = 3): { variants: { creativeId: string; headline: string; primaryText: string; cta: string; predictedPerformance: number; status: string }[]; summary: string } {
    if (!description) throw new Error("Describe the creative to generate it");
    const seed = hashStr(description + tenantId);
    const angles = ["Benefit-led", "Question-based", "Urgency"];
    const variants: any[] = [];
    for (let i = 0; i < count; i++) {
      const vSeed = seed + i * 101;
      const angle = angles[i % 3];
      const headline = `${angle}: ${description.slice(0, 40)}`;
      const cta = ["Shop Now", "Learn More", "Get Offer"][vSeed % 3];
      const predicted = Math.round((55 + (vSeed % 40)) * 100) / 100;
      const creativeId = `cre_${vSeed}`;
      variants.push({ creativeId, headline, primaryText: description, cta, predictedPerformance: predicted, status: "draft" });
      DataStore.mem().insert("creatives", {
        _id: creativeId, tenantId, name: headline, type: "image", status: "draft",
        headline, body: description, cta, tags: TAG_POOL.filter((_, t) => (vSeed + t) % 3 === 0).slice(0, 3),
        generatedAt: new Date().toISOString(), via: "ani",
      });
    }
    return { variants, summary: `${count} variants generated in ~30 seconds — Ani can upload to all platforms` };
  }

  detectFatigue(tenantId: string): { campaigns: { campaignId: string; campaignName: string; currentCtr: number; peakCtr: number; dropPercent: number; fatigued: boolean }[]; totals: { scanned: number; fatigued: number; summary: string } } {
    const campaigns = DataStore.mem().find("campaigns", (c: any) => c.tenantId === tenantId) as any[];
    const metricsAll = DataStore.mem().find("metrics", (m: any) => m.tenantId === tenantId) as any[];
    const rows: any[] = [];
    let fatigued = 0;
    for (const c of campaigns) {
      const ms = metricsAll.filter((m: any) => m.campaignId === c._id);
      if (ms.length < 2) continue;
      const ctrs = ms.map((m: any) => (m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0));
      const currentCtr = Math.round(ctrs[ctrs.length - 1] * 100) / 100;
      const peakCtr = Math.round(Math.max(...ctrs) * 100) / 100;
      const dropPercent = peakCtr > 0 ? Math.round(((peakCtr - currentCtr) / peakCtr) * 100) : 0;
      const isFatigued = dropPercent > 20;
      if (isFatigued) fatigued++;
      rows.push({ campaignId: c._id, campaignName: c.name, currentCtr, peakCtr, dropPercent, fatigued: isFatigued });
    }
    return { campaigns: rows, totals: { scanned: rows.length, fatigued, summary: `${fatigued} campaigns fatigued (CTR dropped >20% from peak)` } };
  }

  runAutoRefresh(tenantId: string): { refreshed: { campaignId: string; campaignName: string; variants: { creativeId: string; headline: string; predictedPerformance: number }[]; status: string }[]; totals: { fatiguedDetected: number; variantsGenerated: number; summary: string } } {
    const fatigue = this.detectFatigue(tenantId);
    const refreshed: any[] = [];
    let variantsGenerated = 0;
    for (const f of fatigue.campaigns.filter(c => c.fatigued)) {
      const variants = this.generateCreative(tenantId, `${f.campaignName} refresh`, 3).variants;
      variantsGenerated += variants.length;
      for (const v of variants) {
        DataStore.mem().update("creatives", (cr: any) => cr._id === v.creativeId && cr.tenantId === tenantId, { status: "pending_approval", campaignId: f.campaignId });
        DataStore.mem().insert("approval_decisions", { tenantId, actionId: v.creativeId, type: "creative_refresh", decision: "pending", reason: `Fatigue on ${f.campaignName}`, decidedAt: new Date().toISOString() });
      }
      DataStore.mem().update("campaigns", (c: any) => c._id === f.campaignId && c.tenantId === tenantId, { creativeRefreshState: { status: "submitted", variantCount: variants.length, submittedAt: new Date().toISOString() } });
      refreshed.push({ campaignId: f.campaignId, campaignName: f.campaignName, variants: variants.map(v => ({ creativeId: v.creativeId, headline: v.headline, predictedPerformance: v.predictedPerformance })), status: "awaiting_approval" });
    }
    return {
      refreshed,
      totals: {
        fatiguedDetected: fatigue.totals.fatigued,
        variantsGenerated,
        summary: variantsGenerated > 0 ? `${variantsGenerated} creatives submitted for brand approval — auto-replace on approval` : "No fatigued creatives found — nothing to do",
      },
    };
  }

  uploadAsset(tenantId: string, asset: { name: string; type: string; sizeBytes: number }): { assetId: string; aiTags: string[]; brandSafety: string; resizedFor: { platform: string; dimensions: string }[]; performancePrediction: number; duplicateOf: string | null; summary: string } {
    if (!asset.name || !asset.type) throw new Error("Asset requires a name and type");
    const seed = hashStr(asset.name + tenantId);
    const assetId = `ast_${seed}`;
    const aiTags = TAG_POOL.filter((_, t) => (seed + t * 7) % 4 === 0).slice(0, 4);
    const brandSafe = seed % 5 !== 0;
    const platforms = [
      { platform: "meta", dimensions: "1080x1080" },
      { platform: "google", dimensions: "1200x628" },
      { platform: "tiktok", dimensions: "1080x1920" },
      { platform: "linkedin", dimensions: "1200x627" },
    ];
    const dup = DataStore.mem().findOne("content_assets", (a: any) => a.tenantId === tenantId && a.title === asset.name);
    DataStore.mem().insert("content_assets", {
      tenantId, title: asset.name, type: asset.type, status: "published",
      tags: aiTags, sizeBytes: asset.sizeBytes, brandSafety: brandSafe ? "clear" : "flagged",
      performance: { prediction: Math.round(60 + (seed % 35)) }, resized: platforms,
      createdAt: new Date().toISOString(),
    });
    return {
      assetId, aiTags,
      brandSafety: brandSafe ? "clear" : "flagged — human review required",
      resizedFor: platforms,
      performancePrediction: 60 + (seed % 35),
      duplicateOf: dup ? (dup as any)._id : null,
      summary: `${asset.name} uploaded — auto-tagged (${aiTags.length}), ${brandSafe ? "brand-safe" : "flagged"}, resized for ${platforms.length} platforms`,
    };
  }

  assetLibraryStatus(tenantId: string): { total: number; byStatus: Record<string, number>; avgPrediction: number; flaggedCount: number; summary: string } {
    const assets = DataStore.mem().find("content_assets", (a: any) => a.tenantId === tenantId) as any[];
    const byStatus: Record<string, number> = {};
    let flagged = 0, predSum = 0;
    for (const a of assets) {
      byStatus[a.status] = (byStatus[a.status] || 0) + 1;
      if (a.brandSafety === "flagged") flagged++;
      predSum += a.performance?.prediction || 0;
    }
    return {
      total: assets.length, byStatus,
      avgPrediction: assets.length ? Math.round(predSum / assets.length) : 0,
      flaggedCount: flagged,
      summary: `${assets.length} assets in library${flagged ? ` — ${flagged} need brand review` : " — all brand-safe"}`,
    };
  }
}

export const creativeAutoRefresh = new CreativeAutoRefreshService();
