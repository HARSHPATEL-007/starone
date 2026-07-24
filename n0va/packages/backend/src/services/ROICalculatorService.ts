export interface ROIInput {
  campaignName: string;
  totalSpend: number;
  totalRevenue: number;
  leadsGenerated: number;
  conversionRate: number;
  averageDealSize: number;
  platformFees: number;
  creativeCosts: number;
  laborCosts: number;
  timeframeDays: number;
}

export interface ROIResult {
  campaignName: string;
  roas: number;
  roi: number;
  netProfit: number;
  totalCost: number;
  totalRevenue: number;
  cpa: number;
  cpl: number;
  customersAcquired: number;
  paybackDays: number;
  profitMargin: number;
  isProfitable: boolean;
  breakdown: {
    revenue: number;
    adSpend: number;
    platformFees: number;
    creativeCosts: number;
    laborCosts: number;
    totalCosts: number;
    netProfit: number;
  };
}

export class ROICalculatorService {
  calculate(input: ROIInput): ROIResult {
    const totalAdCost = input.totalSpend + input.platformFees;
    const totalCosts = totalAdCost + input.creativeCosts + input.laborCosts;
    const netProfit = input.totalRevenue - totalCosts;

    const customersAcquired = Math.round(input.leadsGenerated * (input.conversionRate / 100));
    const cpa = customersAcquired > 0 ? totalCosts / customersAcquired : 0;
    const cpl = input.leadsGenerated > 0 ? totalCosts / input.leadsGenerated : 0;

    const roas = input.totalSpend > 0 ? input.totalRevenue / input.totalSpend : 0;
    const roi = totalCosts > 0 ? ((input.totalRevenue - totalCosts) / totalCosts) * 100 : 0;
    const profitMargin = input.totalRevenue > 0 ? (netProfit / input.totalRevenue) * 100 : 0;

    const dailyNet = input.timeframeDays > 0 ? netProfit / input.timeframeDays : 0;
    const paybackDays = dailyNet > 0 ? Math.round(totalCosts / dailyNet) : 0;

    return {
      campaignName: input.campaignName,
      roas: parseFloat(roas.toFixed(2)),
      roi: parseFloat(roi.toFixed(1)),
      netProfit: parseFloat(netProfit.toFixed(2)),
      totalCost: parseFloat(totalCosts.toFixed(2)),
      totalRevenue: parseFloat(input.totalRevenue.toFixed(2)),
      cpa: parseFloat(cpa.toFixed(2)),
      cpl: parseFloat(cpl.toFixed(2)),
      customersAcquired,
      paybackDays,
      profitMargin: parseFloat(profitMargin.toFixed(1)),
      isProfitable: netProfit > 0,
      breakdown: {
        revenue: input.totalRevenue,
        adSpend: input.totalSpend,
        platformFees: input.platformFees,
        creativeCosts: input.creativeCosts,
        laborCosts: input.laborCosts,
        totalCosts,
        netProfit,
      },
    };
  }

  compare(inputs: ROIInput[]): ROIResult[] {
    return inputs.map((i) => this.calculate(i));
  }

  generateSample(input: Partial<ROIInput>): ROIResult {
    const defaults: ROIInput = {
      campaignName: "Q3 Campaign",
      totalSpend: 50000,
      totalRevenue: 150000,
      leadsGenerated: 1200,
      conversionRate: 5,
      averageDealSize: 2500,
      platformFees: 5000,
      creativeCosts: 10000,
      laborCosts: 15000,
      timeframeDays: 90,
      ...input,
    };
    return this.calculate(defaults);
  }

  generateComparisonScenarios(): ROIResult[] {
    return [
      this.calculate({
        campaignName: "Conservative",
        totalSpend: 30000,
        totalRevenue: 75000,
        leadsGenerated: 600,
        conversionRate: 4,
        averageDealSize: 2500,
        platformFees: 3000,
        creativeCosts: 5000,
        laborCosts: 10000,
        timeframeDays: 90,
      }),
      this.calculate({
        campaignName: "Balanced",
        totalSpend: 50000,
        totalRevenue: 150000,
        leadsGenerated: 1200,
        conversionRate: 5,
        averageDealSize: 2500,
        platformFees: 5000,
        creativeCosts: 10000,
        laborCosts: 15000,
        timeframeDays: 90,
      }),
      this.calculate({
        campaignName: "Aggressive",
        totalSpend: 100000,
        totalRevenue: 350000,
        leadsGenerated: 2500,
        conversionRate: 6,
        averageDealSize: 2800,
        platformFees: 10000,
        creativeCosts: 20000,
        laborCosts: 25000,
        timeframeDays: 90,
      }),
    ];
  }
}

export const roiCalculatorService = new ROICalculatorService();
