import mongoose from "mongoose";
import { Campaign } from "../models/Campaign";
import { Creative } from "../models/Creative";
import { Audience } from "../models/Audience";
import { Agent } from "../models/Agent";
import { ConnectedAccountModel } from "../models/ConnectedAccount";
import { Metric } from "../models/Metric";
import { MemoryStore } from "./MemoryStore";

type TenantFilter = { tenantId: any };

export class DataStore {
  static usingMemory(): boolean {
    try {
      return mongoose.connection.readyState !== 1;
    } catch {
      return true;
    }
  }

  private static mem(): MemoryStore {
    return MemoryStore.getInstance();
  }

  // Campaigns
  static async findCampaigns(filter: Record<string, any>, sort: any = { createdAt: -1 }, skip = 0, limit = 20) {
    if (DataStore.usingMemory()) {
      const all = DataStore.mem().find("campaigns", (c: any) => {
        for (const [k, v] of Object.entries(filter)) {
          if (k === "name" && v.$regex) {
            if (!String(c.name).match(new RegExp(v.$options === "i" ? String(v.$regex) : "", "i"))) return false;
          } else if (c[k] !== v) return false;
        }
        return true;
      });
      const total = all.length;
      const campaigns = all.slice(skip, skip + limit).reverse();
      return { campaigns, total };
    }
    const [campaigns, total] = await Promise.all([
      Campaign.find(filter).sort(sort).skip(skip).limit(limit).populate("audiences creatives"),
      Campaign.countDocuments(filter),
    ]);
    return { campaigns, total };
  }

  static async findCampaignById(id: string, tenantId: string) {
    if (DataStore.usingMemory()) {
      return DataStore.mem().findOne("campaigns", (c: any) => c._id === id && c.tenantId === tenantId) || null;
    }
    return Campaign.findOne({ _id: id, tenantId });
  }

  static async createCampaign(data: any) {
    if (DataStore.usingMemory()) {
      return DataStore.mem().insert("campaigns", data);
    }
    return new Campaign(data).save();
  }

  static async updateCampaign(id: string, tenantId: string, update: any) {
    if (DataStore.usingMemory()) {
      return DataStore.mem().update("campaigns", (c: any) => c._id === id && c.tenantId === tenantId, update);
    }
    return Campaign.findOneAndUpdate({ _id: id, tenantId }, { ...update, updatedAt: new Date() }, { new: true });
  }

  static async deleteCampaign(id: string, tenantId: string) {
    if (DataStore.usingMemory()) {
      return DataStore.mem().delete("campaigns", (c: any) => c._id === id && c.tenantId === tenantId);
    }
    const r = await Campaign.deleteOne({ _id: id, tenantId: new mongoose.Types.ObjectId(tenantId) });
    return r.deletedCount > 0;
  }

  static async countCampaigns(filter: Record<string, any>) {
    if (DataStore.usingMemory()) {
      return DataStore.mem().find("campaigns", (c: any) => {
        for (const [k, v] of Object.entries(filter)) if (c[k] !== v) return false;
        return true;
      }).length;
    }
    return Campaign.countDocuments(filter);
  }

  // Creatives
  static async findCreatives(filter: Record<string, any>) {
    if (DataStore.usingMemory()) {
      return DataStore.mem().find("creatives", (c: any) => {
        for (const [k, v] of Object.entries(filter)) if (c[k] !== v) return false;
        return true;
      }).reverse();
    }
    return Creative.find(filter).sort({ createdAt: -1 });
  }

  static async createCreative(data: any) {
    if (DataStore.usingMemory()) return DataStore.mem().insert("creatives", data);
    return new Creative(data).save();
  }

  static async findCreativeById(id: string, tenantId: string) {
    if (DataStore.usingMemory()) {
      return DataStore.mem().findOne("creatives", (c: any) => c._id === id && c.tenantId === tenantId) || null;
    }
    return Creative.findOne({ _id: id, tenantId });
  }

  static async updateCreative(id: string, tenantId: string, update: any) {
    if (DataStore.usingMemory()) {
      return DataStore.mem().update("creatives", (c: any) => c._id === id && c.tenantId === tenantId, update);
    }
    return Creative.findOneAndUpdate({ _id: id, tenantId }, update, { new: true });
  }

  // Audiences
  static async findAudiences(filter: Record<string, any>) {
    if (DataStore.usingMemory()) {
      return DataStore.mem().find("audiences", (c: any) => {
        for (const [k, v] of Object.entries(filter)) if (c[k] !== v) return false;
        return true;
      }).reverse();
    }
    return Audience.find(filter).sort({ createdAt: -1 });
  }

  static async createAudience(data: any) {
    if (DataStore.usingMemory()) return DataStore.mem().insert("audiences", data);
    return new Audience(data).save();
  }

  static async findAudienceById(id: string, tenantId: string) {
    if (DataStore.usingMemory()) {
      return DataStore.mem().findOne("audiences", (a: any) => a._id === id && a.tenantId === tenantId) || null;
    }
    return Audience.findOne({ _id: id, tenantId });
  }

  static async updateAudience(id: string, tenantId: string, update: any) {
    if (DataStore.usingMemory()) {
      return DataStore.mem().update("audiences", (a: any) => a._id === id && a.tenantId === tenantId, update);
    }
    return Audience.findOneAndUpdate({ _id: id, tenantId }, update, { new: true });
  }

  // Agents
  static async findAgents(filter: Record<string, any>) {
    if (DataStore.usingMemory()) {
      return DataStore.mem().find("agents", (c: any) => {
        for (const [k, v] of Object.entries(filter)) if (c[k] !== v) return false;
        return true;
      }).reverse();
    }
    return Agent.find(filter).sort({ createdAt: -1 });
  }

  static async createAgent(data: any) {
    if (DataStore.usingMemory()) return DataStore.mem().insert("agents", data);
    return new Agent(data).save();
  }

  static async updateAgent(id: string, tenantId: string, update: any) {
    if (DataStore.usingMemory()) {
      return DataStore.mem().update("agents", (a: any) => a._id === id && a.tenantId === tenantId, update);
    }
    return Agent.findOneAndUpdate({ _id: id, tenantId }, update, { new: true });
  }

  static async deleteAgent(id: string, tenantId: string) {
    if (DataStore.usingMemory()) {
      return DataStore.mem().delete("agents", (a: any) => a._id === id && a.tenantId === tenantId);
    }
    const r = await Agent.deleteOne({ _id: id, tenantId: new mongoose.Types.ObjectId(tenantId) });
    return r.deletedCount > 0;
  }

  // Metrics
  static async findMetrics(filter: Record<string, any>) {
    if (DataStore.usingMemory()) {
      return DataStore.mem().find("metrics", (m: any) => {
        for (const [k, v] of Object.entries(filter)) if (m[k] !== v) return false;
        return true;
      });
    }
    return Metric.find(filter);
  }

  static async aggregateMetrics(pipeline: any[]) {
    if (DataStore.usingMemory()) {
      const all = DataStore.mem().find("metrics", () => true);
      const match = pipeline[0]?.$match || {};
      const group = pipeline[1]?.$group || {};
      let filtered = all;
      if (match.tenantId) filtered = filtered.filter((m: any) => String(m.tenantId) === String(match.tenantId));
      if (match.date?.$gte) filtered = filtered.filter((m: any) => new Date(m.date) >= new Date(match.date.$gte));
      const result = filtered.reduce(
        (acc: any, m: any) => {
          acc.totalImpressions += m.impressions || 0;
          acc.totalClicks += m.clicks || 0;
          acc.totalConversions += m.conversions || 0;
          acc.totalSpend += m.spend || 0;
          acc.totalRevenue += m.revenue || 0;
          acc.count++;
          return acc;
        },
        { _id: null, totalImpressions: 0, totalClicks: 0, totalConversions: 0, totalSpend: 0, totalRevenue: 0, count: 0 }
      );
      if (result.count > 0) {
        result.avgCtr = parseFloat(((result.totalClicks / result.totalImpressions) * 100).toFixed(2));
        result.avgRoas = parseFloat((result.totalRevenue / result.totalSpend).toFixed(2));
      }
      // @ts-ignore
      return [group._id ? result._id === null && result : [result]];
    }
    return Metric.aggregate(pipeline);
  }

  // Daily metrics (memory-only)
  static findDailyMetrics(tenantId: string, days: number) {
    return DataStore.mem().find("daily_metrics", () => true).slice(-days);
  }

  // Recipes (memory-only)
  static findRecipes(tenantId: string) {
    return DataStore.mem().find("recipes", (r: any) => r.tenantId === tenantId).reverse();
  }

  static createRecipe(data: any) {
    return DataStore.mem().insert("recipes", data);
  }

  static updateRecipe(id: string, tenantId: string, update: any) {
    return DataStore.mem().update("recipes", (r: any) => r._id === id && r.tenantId === tenantId, update);
  }

  static deleteRecipe(id: string, tenantId: string): boolean {
    return DataStore.mem().delete("recipes", (r: any) => r._id === id && r.tenantId === tenantId);
  }

  // Generic collection CRUD for new entity types
  private static colFind(collection: string, filter: Record<string, any>) {
    return DataStore.mem().find(collection, (d: any) => {
      for (const [k, v] of Object.entries(filter)) if (d[k] !== v) return false;
      return true;
    }).reverse();
  }

  private static colFindOne(collection: string, id: string, tenantId: string) {
    return DataStore.mem().findOne(collection, (d: any) => d._id === id && d.tenantId === tenantId) || null;
  }

  private static colCreate(collection: string, data: any) {
    return DataStore.mem().insert(collection, data);
  }

  private static colUpdate(collection: string, id: string, tenantId: string, update: any) {
    return DataStore.mem().update(collection, (d: any) => d._id === id && d.tenantId === tenantId, update);
  }

  private static colDelete(collection: string, id: string, tenantId: string): boolean {
    return DataStore.mem().delete(collection, (d: any) => d._id === id && d.tenantId === tenantId);
  }

  // Costs
  static async findCosts(filter: Record<string, any>) { return DataStore.colFind("costs", filter); }
  static async createCost(data: any) { return DataStore.colCreate("costs", data); }

  // Funnel
  static async findFunnelData(filter: Record<string, any>) { return DataStore.colFind("funnel_data", filter); }
  static async createFunnelData(data: any) { return DataStore.colCreate("funnel_data", data); }

  // Goals
  static async findGoals(filter: Record<string, any>) { return DataStore.colFind("goals", filter); }
  static async findGoalById(id: string, tenantId: string) { return DataStore.colFindOne("goals", id, tenantId); }
  static async createGoal(data: any) { return DataStore.colCreate("goals", data); }
  static async updateGoal(id: string, tenantId: string, update: any) { return DataStore.colUpdate("goals", id, tenantId, update); }
  static async deleteGoal(id: string, tenantId: string): Promise<boolean> { return DataStore.colDelete("goals", id, tenantId); }

  // Keywords
  static async findKeywords(filter: Record<string, any>) { return DataStore.colFind("keywords", filter); }
  static async createKeyword(data: any) { return DataStore.colCreate("keywords", data); }
  static async updateKeyword(id: string, tenantId: string, update: any) { return DataStore.colUpdate("keywords", id, tenantId, update); }
  static async deleteKeyword(id: string, tenantId: string): Promise<boolean> { return DataStore.colDelete("keywords", id, tenantId); }

  // Landing Pages
  static async findLandingPages(filter: Record<string, any>) { return DataStore.colFind("landing_pages", filter); }
  static async findLandingPageById(id: string, tenantId: string) { return DataStore.colFindOne("landing_pages", id, tenantId); }
  static async createLandingPage(data: any) { return DataStore.colCreate("landing_pages", data); }
  static async updateLandingPage(id: string, tenantId: string, update: any) { return DataStore.colUpdate("landing_pages", id, tenantId, update); }
  static async deleteLandingPage(id: string, tenantId: string): Promise<boolean> { return DataStore.colDelete("landing_pages", id, tenantId); }

  // Segmentation
  static async findSegments(filter: Record<string, any>) { return DataStore.colFind("segments", filter); }
  static async createSegment(data: any) { return DataStore.colCreate("segments", data); }
  static async updateSegment(id: string, tenantId: string, update: any) { return DataStore.colUpdate("segments", id, tenantId, update); }
  static async deleteSegment(id: string, tenantId: string): Promise<boolean> { return DataStore.colDelete("segments", id, tenantId); }

  // UTM Links
  static async findUtmLinks(filter: Record<string, any>) { return DataStore.colFind("utm_links", filter); }
  static async createUtmLink(data: any) { return DataStore.colCreate("utm_links", data); }

  // Media Kits
  static async findMediaKits(filter: Record<string, any>) { return DataStore.colFind("media_kits", filter); }
  static async createMediaKit(data: any) { return DataStore.colCreate("media_kits", data); }
  static async updateMediaKit(id: string, tenantId: string, update: any) { return DataStore.colUpdate("media_kits", id, tenantId, update); }

  // Competitive Intel
  static async findCompetitiveIntel(filter: Record<string, any>) { return DataStore.colFind("competitive_intel", filter); }
  static async createCompetitiveIntel(data: any) { return DataStore.colCreate("competitive_intel", data); }

  // Content Library
  static async findContentAssets(filter: Record<string, any>) { return DataStore.colFind("content_assets", filter); }
  static async findContentAssetById(id: string, tenantId: string) { return DataStore.colFindOne("content_assets", id, tenantId); }
  static async createContentAsset(data: any) { return DataStore.colCreate("content_assets", data); }
  static async updateContentAsset(id: string, tenantId: string, update: any) { return DataStore.colUpdate("content_assets", id, tenantId, update); }
  static async deleteContentAsset(id: string, tenantId: string): Promise<boolean> { return DataStore.colDelete("content_assets", id, tenantId); }

  // Marketing Forms
  static async findMarketingForms(filter: Record<string, any>) { return DataStore.colFind("marketing_forms", filter); }
  static async findMarketingFormById(id: string, tenantId: string) { return DataStore.colFindOne("marketing_forms", id, tenantId); }
  static async createMarketingForm(data: any) { return DataStore.colCreate("marketing_forms", data); }
  static async updateMarketingForm(id: string, tenantId: string, update: any) { return DataStore.colUpdate("marketing_forms", id, tenantId, update); }
  static async deleteMarketingForm(id: string, tenantId: string): Promise<boolean> { return DataStore.colDelete("marketing_forms", id, tenantId); }

  // Form Submissions
  static async findFormSubmissions(filter: Record<string, any>) { return DataStore.colFind("form_submissions", filter); }
  static async createFormSubmission(data: any) { return DataStore.colCreate("form_submissions", data); }

  // Customer Journey Stages
  static async findCustomerJourneys(filter: Record<any, any>) { return DataStore.colFind("customer_journeys", filter); }
  static async createCustomerJourney(data: any) { return DataStore.colCreate("customer_journeys", data); }
  static async updateCustomerJourney(id: string, tenantId: string, update: any) { return DataStore.colUpdate("customer_journeys", id, tenantId, update); }
  static async deleteCustomerJourney(id: string, tenantId: string): Promise<boolean> { return DataStore.colDelete("customer_journeys", id, tenantId); }

  // Search
  static async globalSearch(tenantId: string, q: string) {
    const results: any[] = [];
    const collections = ["campaigns", "creatives", "audiences", "agents", "recipes", "landing_pages", "content_assets", "keywords", "goals"];
    const query = q.toLowerCase();
    for (const col of collections) {
      const items = DataStore.mem().find(col, () => true);
      for (const item of items) {
        if (!item.tenantId || item.tenantId !== tenantId) continue;
        const matchable = `${item.name || item.title || ""} ${item.description || ""} ${item.headline || ""} ${(item.tags || []).join(" ")}`.toLowerCase();
        if (matchable.includes(query)) {
          results.push({ _id: item._id, type: col.slice(0, -1), name: item.name || item.title, match: col });
        }
      }
    }
    return results.slice(0, 20);
  }
}
