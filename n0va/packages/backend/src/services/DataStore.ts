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
}
