import mongoose from "mongoose";
import { Campaign, ICampaign } from "../models/Campaign";
import { Metric } from "../models/Metric";
import { CampaignStatus } from "../types";

interface CreateCampaignInput {
  tenantId: string;
  name: string;
  type: string;
  budget: { daily: number; lifetime: number; currency: string };
  platforms: string[];
  goal?: string;
  startDate?: string;
  endDate?: string;
  createdBy: string;
}

interface CampaignFilters {
  tenantId: string;
  status?: string;
  type?: string;
  search?: string;
  page: number;
  limit: number;
}

export class CampaignService {
  async create(input: CreateCampaignInput): Promise<ICampaign> {
    const budget = {
      ...input.budget,
      spent: 0,
      remaining: input.budget.lifetime,
    };

    const campaign = new Campaign({
      tenantId: new mongoose.Types.ObjectId(input.tenantId),
      name: input.name,
      type: input.type,
      status: CampaignStatus.Draft,
      budget,
      platforms: input.platforms,
      goal: input.goal,
      startDate: input.startDate,
      endDate: input.endDate,
      createdBy: new mongoose.Types.ObjectId(input.createdBy),
      hyperContext: {
        linkedTasks: [],
        linkedDocs: [],
        linkedSheets: [],
        linkedCalendar: [],
      },
    });

    return campaign.save();
  }

  async findById(id: string, tenantId: string): Promise<ICampaign | null> {
    return Campaign.findOne({
      _id: new mongoose.Types.ObjectId(id),
      tenantId: new mongoose.Types.ObjectId(tenantId),
    }).populate("audiences creatives");
  }

  async find(filters: CampaignFilters) {
    const query: Record<string, unknown> = {
      tenantId: new mongoose.Types.ObjectId(filters.tenantId),
    };

    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;
    if (filters.search) {
      query.name = { $regex: filters.search, $options: "i" };
    }

    const skip = (filters.page - 1) * filters.limit;
    const [campaigns, total] = await Promise.all([
      Campaign.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(filters.limit)
        .populate("audiences creatives"),
      Campaign.countDocuments(query),
    ]);

    return { campaigns, total, page: filters.page, limit: filters.limit };
  }

  async updateStatus(id: string, tenantId: string, status: CampaignStatus): Promise<ICampaign | null> {
    return Campaign.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(id), tenantId: new mongoose.Types.ObjectId(tenantId) },
      { status, updatedAt: new Date() },
      { new: true }
    );
  }

  async updateBudget(
    id: string,
    tenantId: string,
    budget: { daily: number; lifetime: number }
  ): Promise<ICampaign | null> {
    const campaign = await Campaign.findOne({
      _id: new mongoose.Types.ObjectId(id),
      tenantId: new mongoose.Types.ObjectId(tenantId),
    });
    if (!campaign) return null;

    campaign.budget.daily = budget.daily;
    campaign.budget.lifetime = budget.lifetime;
    campaign.budget.remaining = budget.lifetime - campaign.budget.spent;
    campaign.markModified("budget");
    return campaign.save();
  }

  async getDashboardMetrics(tenantId: string) {
    const campaigns = await Campaign.find({
      tenantId: new mongoose.Types.ObjectId(tenantId),
    });

    const totalBudget = campaigns.reduce((s, c) => s + c.budget.lifetime, 0);
    const totalSpent = campaigns.reduce((s, c) => s + c.budget.spent, 0);
    const activeCampaigns = campaigns.filter(
      (c) => c.status === CampaignStatus.Active
    ).length;

    const recentMetrics = await Metric.aggregate([
      {
        $match: {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: null,
          totalImpressions: { $sum: "$impressions" },
          totalClicks: { $sum: "$clicks" },
          totalConversions: { $sum: "$conversions" },
          totalSpend: { $sum: "$spend" },
          totalRevenue: { $sum: "$revenue" },
          avgCtr: { $avg: "$ctr" },
          avgRoas: { $avg: "$roas" },
        },
      },
    ]);

    return {
      totalCampaigns: campaigns.length,
      activeCampaigns,
      totalBudget,
      totalSpent,
      remaining: totalBudget - totalSpent,
      metrics: recentMetrics[0] || {
        totalImpressions: 0,
        totalClicks: 0,
        totalConversions: 0,
        totalSpend: 0,
        totalRevenue: 0,
        avgCtr: 0,
        avgRoas: 0,
      },
    };
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const result = await Campaign.deleteOne({
      _id: new mongoose.Types.ObjectId(id),
      tenantId: new mongoose.Types.ObjectId(tenantId),
    });
    return result.deletedCount > 0;
  }
}

export const campaignService = new CampaignService();
