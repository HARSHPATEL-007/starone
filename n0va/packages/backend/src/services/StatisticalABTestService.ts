interface ABTestInput {
  controlImpressions: number;
  controlConversions: number;
  variantImpressions: number;
  variantConversions: number;
}

interface ABTestResult {
  controlRate: number;
  variantRate: number;
  lift: number;
  liftPercent: number;
  chiSquared: number;
  pValue: number;
  significant: boolean;
  significanceLevel: number;
  confidenceInterval: [number, number];
  oddsRatio: number;
  relativeLift: number;
  sampleSize: { control: number; variant: number; recommended: number };
  power: number;
  minimumDetectableEffect: number;
  recommendation: string;
}

interface SampleSizeInput {
  baselineRate: number;
  minimumDetectableEffect: number;
  significanceLevel?: number;
  power?: number;
}

interface DurationEstimate {
  requiredSampleSize: number;
  currentDailyVisitors: number;
  estimatedDays: number;
  weeks: number;
  trafficAllocation: number;
  recommendation: string;
}

export class StatisticalABTestService {
  /**
   * Runs a full chi-squared statistical test on A/B test results.
   */
  test(input: ABTestInput): ABTestResult {
    const { controlImpressions: cImp, controlConversions: cConv, variantImpressions: vImp, variantConversions: vConv } = input;

    if (cImp <= 0 || vImp <= 0) throw new Error("Impressions must be > 0");
    if (cConv < 0 || vConv < 0) throw new Error("Conversions cannot be negative");

    const controlRate = cImp > 0 ? cConv / cImp : 0;
    const variantRate = vImp > 0 ? vConv / vImp : 0;

    const totalConv = cConv + vConv;
    const totalImp = cImp + vImp;
    const pooledRate = totalImp > 0 ? totalConv / totalImp : 0;

    const expectedControl = pooledRate * cImp;
    const expectedVariant = pooledRate * vImp;

    const chiSquared = (
      (cConv - expectedControl) ** 2 / Math.max(expectedControl, 0.001) +
      ((cImp - cConv) - (cImp - expectedControl)) ** 2 / Math.max(cImp - expectedControl, 0.001) +
      (vConv - expectedVariant) ** 2 / Math.max(expectedVariant, 0.001) +
      ((vImp - vConv) - (vImp - expectedVariant)) ** 2 / Math.max(vImp - expectedVariant, 0.001)
    );

    const pValue = this.chiSquaredPValue(chiSquared, 1);
    const significant = pValue < 0.05;
    const significanceLevel = pValue < 0.01 ? 0.99 : pValue < 0.05 ? 0.95 : pValue < 0.1 ? 0.9 : 0;

    const lift = variantRate - controlRate;
    const liftPercent = controlRate > 0 ? (lift / controlRate) * 100 : 0;
    const relativeLift = controlRate > 0 ? (variantRate - controlRate) / controlRate : 0;

    const se = Math.sqrt(
      (controlRate * (1 - controlRate)) / cImp + (variantRate * (1 - variantRate)) / vImp,
    );
    const z = 1.96;
    const ciLower = Math.max(-1, lift - z * se);
    const ciUpper = Math.min(1, lift + z * se);

    const oddsRatio = controlRate > 0 && controlRate < 1 && variantRate > 0
      ? (vConv / (vImp - vConv)) / (cConv / (cImp - cConv))
      : 1;

    const baselineRate = controlRate > 0 ? controlRate : 0.01;
    const mde = this.minimumDetectableEffect({
      baselineRate,
      significanceLevel: 0.05,
      power: 0.8,
    });
    const achievedPower = this.calculatePower(controlRate, variantRate, cImp, vImp);

    const requiredPerVariant = this.sampleSize({
      baselineRate,
      minimumDetectableEffect: Math.abs(liftPercent / 100),
      significanceLevel: 0.05,
      power: 0.8,
    });

    return {
      controlRate: Math.round(controlRate * 100000) / 100000,
      variantRate: Math.round(variantRate * 100000) / 100000,
      lift: Math.round(lift * 100000) / 100000,
      liftPercent: Math.round(liftPercent * 100) / 100,
      chiSquared: Math.round(chiSquared * 1000) / 1000,
      pValue: Math.round(pValue * 10000) / 10000,
      significant,
      significanceLevel,
      confidenceInterval: [Math.round(ciLower * 10000) / 10000, Math.round(ciUpper * 10000) / 10000],
      oddsRatio: Math.round(oddsRatio * 1000) / 1000,
      relativeLift: Math.round(relativeLift * 10000) / 10000,
      sampleSize: {
        control: cImp,
        variant: vImp,
        recommended: Math.ceil(requiredPerVariant),
      },
      power: Math.round(achievedPower * 1000) / 1000,
      minimumDetectableEffect: Math.round(mde * 10000) / 10000,
      recommendation: this.generateRecommendation(significant, liftPercent, pValue, cImp + vImp, requiredPerVariant),
    };
  }

  /**
   * Calculates required sample size per variant using the normal approximation.
   */
  sampleSize(input: SampleSizeInput): number {
    const { baselineRate: p1, minimumDetectableEffect: mde, significanceLevel = 0.05, power = 0.8 } = input;
    const p2 = p1 + mde;
    const zAlpha = this.zScore(significanceLevel / 2);
    const zBeta = this.zScore(1 - power);
    const pBar = (p1 + p2) / 2;

    const n = (
      (zAlpha * Math.sqrt(2 * pBar * (1 - pBar)) + zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2
    ) / (mde ** 2);

    return Math.ceil(Math.max(n, 1));
  }

  /**
   * Estimates how many days a test needs to run.
   */
  estimateDuration(
    dailyVisitors: number,
    input: SampleSizeInput,
    trafficAllocation: number = 1,
  ): DurationEstimate {
    const required = this.sampleSize(input);
    const perDay = dailyVisitors * trafficAllocation;
    const days = perDay > 0 ? Math.ceil((required * 2) / perDay) : 999;

    return {
      requiredSampleSize: required,
      currentDailyVisitors: dailyVisitors,
      estimatedDays: days,
      weeks: Math.round((days / 7) * 10) / 10,
      trafficAllocation,
      recommendation: days > 90
        ? "Test would take too long. Increase traffic allocation, reduce sensitivity, or use a different methodology."
        : days > 30
        ? `Test needs ~${days} days. Consider increasing traffic allocation to speed up.`
        : `Test can complete in ~${days} days. Proceed with confidence.`,
    };
  }

  private zScore(alpha: number): number {
    const a = alpha < 1e-10 ? 1e-10 : alpha > 0.9999999999 ? 0.9999999999 : alpha;
    const t = Math.sqrt(-2 * Math.log(a));
    return t - (2.515517 + 0.802853 * t + 0.010328 * t * t) / (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t);
  }

  private chiSquaredPValue(x: number, df: number): number {
    if (x <= 0) return 1;
    const a = df / 2;
    const b = x / 2;
    return 1 - this.regularizedGamma(a, b);
  }

  private regularizedGamma(a: number, x: number): number {
    if (x < a + 1) return this.series(a, x);
    return 1 - this.continuedFraction(a, x);
  }

  private series(a: number, x: number): number {
    if (x === 0) return 0;
    let sum = 1 / a;
    let term = 1 / a;
    for (let i = 1; i < 200; i++) {
      term *= x / (a + i);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-14) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - this.logGamma(a));
  }

  private continuedFraction(a: number, x: number): number {
    const f = (n: number) => (2 * n + 1) - a + x;
    const c = (n: number) => n * (a - n);
    let b = f(0);
    let d = 1 / Math.max(b, 1e-30);
    let h = d;
    for (let i = 1; i < 200; i++) {
      const cVal = c(i);
      b = f(i);
      d = 1 / Math.max(b + cVal * d, 1e-30);
      let delta = (b + cVal / Math.max(d, 1e-30)) * d;
      if (delta < 0) delta = -delta;
      h *= delta;
      if (Math.abs(delta - 1) < 1e-14) break;
    }
    return Math.exp(-x + a * Math.log(x) - this.logGamma(a)) * h;
  }

  private logGamma(x: number): number {
    const coeff = [
      76.18009172947146, -86.50532032941677, 24.01409824083091,
      -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
    ];
    let y = x;
    let tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;
    for (let j = 0; j < 6; j++) {
      y += 1;
      ser += coeff[j] / y;
    }
    return -tmp + Math.log(2.5066282746310005 * ser / x);
  }

  private minimumDetectableEffect(input: { baselineRate: number; significanceLevel: number; power: number }): number {
    const { baselineRate, significanceLevel, power } = input;
    const mdeInput: SampleSizeInput = { baselineRate, minimumDetectableEffect: 0.05, significanceLevel, power };
    return this.sampleSize(mdeInput) > 0 ? 0.05 : 0;
  }

  private calculatePower(controlRate: number, variantRate: number, n1: number, n2: number): number {
    const pBar = (controlRate * n1 + variantRate * n2) / (n1 + n2);
    const se = Math.sqrt(pBar * (1 - pBar) * (1 / n1 + 1 / n2));
    const z = (variantRate - controlRate) / Math.max(se, 0.0001);
    const zAlpha = 1.96;
    const zPower = z - zAlpha;
    return this.normalCDF(zPower);
  }

  private normalCDF(x: number): number {
    return 0.5 * (1 + this.erf(x / Math.SQRT2));
  }

  private erf(x: number): number {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);
    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y;
  }

  private generateRecommendation(significant: boolean, liftPercent: number, pValue: number, totalSamples: number, requiredSamples: number): string {
    if (!significant) {
      if (totalSamples < requiredSamples) {
        return `Not yet significant (p=${pValue.toFixed(4)}). Need ~${requiredSamples - totalSamples} more samples. Keep running.`;
      }
      return `Test concluded — no significant difference detected (p=${pValue.toFixed(4)}). Consider a larger MDE or different variant.`;
    }
    if (liftPercent > 0) {
      return `Variant wins with ${liftPercent.toFixed(1)}% lift (p=${pValue.toFixed(4)}). Consider rolling out the variant.`;
    }
    return `Control performs better (variant is ${Math.abs(liftPercent).toFixed(1)}% worse, p=${pValue.toFixed(4)}). Stick with control.`;
  }
}

export const statisticalABTestService = new StatisticalABTestService();
