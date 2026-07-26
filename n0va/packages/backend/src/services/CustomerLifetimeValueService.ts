export interface CustomerTransaction {
  customerId: string;
  customerName: string;
  firstPurchase: string;
  lastPurchase: string;
  frequency: number;
  monetaryValue: number;
  recency: number;
  tenure: number;
}

export interface CLVPrediction {
  customerId: string;
  customerName: string;
  predictedTransactions: number;
  predictedMonetaryValue: number;
  predictedCLV: number;
  probabilityAlive: number;
  confidenceInterval: [number, number];
  segment: "high_value" | "medium_value" | "low_value" | "at_risk" | "new";
}

export interface CohortAnalysis {
  cohortName: string;
  period: string;
  customerCount: number;
  averageCLV: number;
  retentionRate: number;
  averageTransactions: number;
  revenueShare: number;
}

export class CustomerLifetimeValueService {
  private readonly gamma = 0.3;
  private readonly r = 1.5;
  private readonly alpha = 3.0;
  private readonly a = 1.0;
  private readonly b = 2.0;

  /**
   * Predict CLV using a simplified BG/NBD model.
   * - r, alpha: Gamma distribution parameters for transaction rate lambda
   * - a, b: Beta distribution parameters for dropout probability p
   * - gamma: Gamma distribution scale for monetary value
   *
   * E[X(t)] = (r * alpha) / (r - 1) * (1 - (alpha / (alpha + t))^(r - 1))
   * P(alive) = 1 / (1 + (a / (b + frequency - 1)) * (alpha + tenure) / (alpha + recency))^r
   */
  predictCLV(customer: CustomerTransaction, forecastPeriodDays = 365): CLVPrediction {
    const { frequency, recency, tenure, monetaryValue } = customer;

    // Expected remaining transactions over forecast period
    // BG/NBD conditional expectation: E[Y(t) | r, alpha, a, b, frequency, recency, tenure]
    const expectedTransactions = ((this.a + this.b + frequency - 1) / (this.a - 1)) *
      (1 - Math.pow((this.alpha + tenure) / (this.alpha + tenure + forecastPeriodDays), this.r + frequency)) /
      (1 + (this.b + frequency - 1) / (this.a - 1) * Math.pow((this.alpha + tenure) / (this.alpha + recency), this.r + frequency));

    const expectedTransactionsClean = Math.max(0, isNaN(expectedTransactions) ? frequency * (forecastPeriodDays / Math.max(tenure, 1)) : expectedTransactions);

    // Monetary value using Gamma-Gamma model
    const predictedMonetaryValue = frequency > 0
      ? ((this.gamma * monetaryValue + (this.r + 1) * this.alpha) / (this.gamma * frequency + this.r * this.alpha - 1)) * this.alpha
      : (this.r / (this.r - 1)) * this.alpha;

    const predictedCLV = expectedTransactionsClean * Math.max(0, predictedMonetaryValue);

    // Probability alive: P(alive | frequency, recency, tenure)
    const probAlive = 1 / (1 + (this.a / (this.b + Math.max(0, frequency - 1))) * Math.pow((this.alpha + tenure) / (this.alpha + recency), this.r + frequency));
    const probAliveClean = isNaN(probAlive) ? (frequency > 0 ? 0.9 : 0.5) : Math.min(1, Math.max(0, probAlive));

    // Confidence interval using Gamma approximation
    const stdErr = predictedCLV * 0.2 / Math.sqrt(Math.max(1, frequency + 1));
    const ci: [number, number] = [
      Math.round(Math.max(0, predictedCLV - 1.96 * stdErr) * 100) / 100,
      Math.round((predictedCLV + 1.96 * stdErr) * 100) / 100,
    ];

    // Segment
    const segment = this.segmentCustomer(predictedCLV, expectedTransactionsClean, probAliveClean, frequency);

    return {
      customerId: customer.customerId,
      customerName: customer.customerName,
      predictedTransactions: Math.round(expectedTransactionsClean * 100) / 100,
      predictedMonetaryValue: Math.round(Math.max(0, predictedMonetaryValue) * 100) / 100,
      predictedCLV: Math.round(Math.max(0, predictedCLV) * 100) / 100,
      probabilityAlive: Math.round(probAliveClean * 10000) / 10000,
      confidenceInterval: ci,
      segment,
    };
  }

  private segmentCustomer(clv: number, txns: number, probAlive: number, frequency: number): CLVPrediction["segment"] {
    if (frequency === 0) return "new";
    if (probAlive < 0.2 && frequency > 0) return "at_risk";
    if (clv > 10000) return "high_value";
    if (clv > 3000) return "medium_value";
    return "low_value";
  }

  private hypergeometricFunc(p: number, q: number, s: number): number {
    // Simplified Gauss hypergeometric 2F1 approximation for large s
    if (s >= q) return Math.pow(q / s, p) * (q / (q - p));
    let sum = 0;
    let term = 1;
    for (let k = 0; k < 50; k++) {
      sum += term;
      term *= (p + k) / (q + k) * (1 - q / s) / (k + 1);
      if (Math.abs(term) < 1e-8) break;
    }
    return sum;
  }

  /**
   * Batch predict CLV for multiple customers.
   */
  batchPredictCLV(customers: CustomerTransaction[], forecastPeriodDays = 365): CLVPrediction[] {
    return customers.map((c) => this.predictCLV(c, forecastPeriodDays));
  }

  /**
   * Run cohort analysis grouping customers by their first purchase period.
   */
  cohortAnalysis(customers: CustomerTransaction[]): CohortAnalysis[] {
    const cohorts = new Map<string, { customers: CustomerTransaction[]; totalRevenue: number }>();
    let totalRevenue = 0;

    for (const c of customers) {
      const date = new Date(c.firstPurchase);
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!cohorts.has(period)) cohorts.set(period, { customers: [], totalRevenue: 0 });
      const cohort = cohorts.get(period)!;
      cohort.customers.push(c);
      cohort.totalRevenue += c.monetaryValue * c.frequency;
      totalRevenue += c.monetaryValue * c.frequency;
    }

    return Array.from(cohorts.entries())
      .map(([period, data]) => {
        const avgPred = this.batchPredictCLV(data.customers);
        const avgCLV = avgPred.reduce((s, p) => s + p.predictedCLV, 0) / Math.max(data.customers.length, 1);

        // Retention: customers with frequency > 0 and recency < 90 days
        const retained = data.customers.filter((c) => c.frequency > 0 && c.recency < 90).length;
        const retentionRate = data.customers.length > 0 ? retained / data.customers.length : 0;
        const avgTxns = data.customers.reduce((s, c) => s + c.frequency, 0) / Math.max(data.customers.length, 1);

        return {
          cohortName: period,
          period,
          customerCount: data.customers.length,
          averageCLV: Math.round(avgCLV * 100) / 100,
          retentionRate: Math.round(retentionRate * 10000) / 100,
          averageTransactions: Math.round(avgTxns * 100) / 100,
          revenueShare: totalRevenue > 0 ? Math.round((data.totalRevenue / totalRevenue) * 10000) / 100 : 0,
        };
      })
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * Segment all customers into actionable groups.
   */
  segmentCustomers(customers: CustomerTransaction[]): {
    segment: string; count: number; averageCLV: number; totalValue: number; recommendations: string[];
  }[] {
    const predictions = this.batchPredictCLV(customers);
    const segments = new Map<string, { count: number; totalCLV: number; customers: CLVPrediction[] }>();

    for (const p of predictions) {
      if (!segments.has(p.segment)) segments.set(p.segment, { count: 0, totalCLV: 0, customers: [] });
      const s = segments.get(p.segment)!;
      s.count++;
      s.totalCLV += p.predictedCLV;
      s.customers.push(p);
    }

    const segmentAdvice: Record<string, string[]> = {
      high_value: ["VIP treatment", "Dedicated account manager", "Early access to new features", "Loyalty rewards"],
      medium_value: ["Nurture with targeted content", "Upsell/cross-sell opportunities", "Automated engagement campaigns"],
      low_value: ["Win-back campaigns", "Volume-based discounts", "Self-service resources"],
      at_risk: ["Urgent re-engagement campaign", "Special offer or discount", "Personalized outreach"],
      new: ["Onboarding sequence", "Educational content", "First-purchase follow-up"],
    };

    return Array.from(segments.entries()).map(([segment, data]) => ({
      segment,
      count: data.count,
      averageCLV: data.count > 0 ? Math.round((data.totalCLV / data.count) * 100) / 100 : 0,
      totalValue: Math.round(data.totalCLV * 100) / 100,
      recommendations: segmentAdvice[segment] || ["Standard engagement"],
    })).sort((a, b) => b.totalValue - a.totalValue);
  }

  /**
   * Generate sample customer data for testing.
   */
  generateSampleCustomers(count = 20): CustomerTransaction[] {
    const names = [
      "Alice Johnson", "Bob Smith", "Carol Williams", "David Brown", "Eva Martinez",
      "Frank Garcia", "Grace Lee", "Henry Wilson", "Ivy Anderson", "Jack Taylor",
      "Kate Thomas", "Leo Jackson", "Mia White", "Noah Harris", "Olivia Martin",
      "Peter Thompson", "Quinn Robinson", "Rose Clark", "Sam Lewis", "Tina Walker",
    ];

    return Array.from({ length: count }, (_, i) => {
      const freq = Math.floor(Math.random() * 15);
      const tenure = Math.floor(Math.random() * 730) + 30;
      const recency = freq > 0 ? Math.floor(Math.random() * Math.min(tenure, 180)) : tenure;
      const monetaryValue = Math.round((Math.random() * 500 + 25) * 100) / 100;
      const firstPurchase = new Date(Date.now() - tenure * 86400000).toISOString();
      const lastPurchase = new Date(Date.now() - recency * 86400000).toISOString();

      return {
        customerId: `cust_${i + 1}`,
        customerName: names[i % names.length],
        firstPurchase,
        lastPurchase,
        frequency: freq,
        monetaryValue,
        recency,
        tenure,
      };
    });
  }
}

export const customerLifetimeValueService = new CustomerLifetimeValueService();
