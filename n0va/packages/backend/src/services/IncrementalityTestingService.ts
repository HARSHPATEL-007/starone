interface GeoExperimentResult {
  experimentId: string;
  name: string;
  treatmentRegions: string[];
  controlRegions: string[];
  method: "did" | "synthetic-control" | "cuped";
  metric: string;
  treatmentStart: string;
  treatmentEnd: string;
  observedLift: number;
  confidenceInterval95: { lower: number; upper: number };
  pValue: number;
  significant: boolean;
  power: number;
  minimumDetectableEffect: number;
  sampleSizePerArm: number;
  summary: string;
}

interface DiDResult {
  preTreatmentAvg: { treatment: number; control: number };
  postTreatmentAvg: { treatment: number; control: number };
  rawLift: number;
  didEstimate: number;
  standardError: number;
  tStatistic: number;
  pValue: number;
  significant: boolean;
}

interface SyntheticControlResult {
  syntheticWeights: { region: string; weight: number }[];
  preTreatmentFit: { date: string; actual: number; synthetic: number }[];
  postTreatmentEffect: { date: string; actual: number; synthetic: number; lift: number }[];
  averageLift: number;
  rSquared: number;
  mse: number;
}

interface CUPEDResult {
  adjustedMetrics: { date: string; raw: number; adjusted: number }[];
  varianceReduction: number;
  adjustedLift: number;
  pValue: number;
  significant: boolean;
}

interface PowerAnalysisResult {
  requiredSamplePerArm: number;
  achievablePower: number;
  minimumDetectableEffect: number;
  alpha: number;
  beta: number;
}

export class IncrementalityTestingService {
  runDiD(
    experimentId: string,
    name: string,
    treatmentRegions: string[],
    controlRegions: string[],
    metric: string,
    treatmentStart: string,
    treatmentEnd: string,
    prePeriodData: { date: string; region: string; value: number }[],
    postPeriodData: { date: string; region: string; value: number }[],
  ): DiDResult {
    const treatmentPre = prePeriodData.filter((d) => treatmentRegions.includes(d.region));
    const controlPre = prePeriodData.filter((d) => controlRegions.includes(d.region));
    const treatmentPost = postPeriodData.filter((d) => treatmentRegions.includes(d.region));
    const controlPost = postPeriodData.filter((d) => controlRegions.includes(d.region));

    const avgTreatmentPre = treatmentPre.reduce((s, d) => s + d.value, 0) / Math.max(1, treatmentPre.length);
    const avgControlPre = controlPre.reduce((s, d) => s + d.value, 0) / Math.max(1, controlPre.length);
    const avgTreatmentPost = treatmentPost.reduce((s, d) => s + d.value, 0) / Math.max(1, treatmentPost.length);
    const avgControlPost = controlPost.reduce((s, d) => s + d.value, 0) / Math.max(1, controlPost.length);

    const treatmentDiff = avgTreatmentPost - avgTreatmentPre;
    const controlDiff = avgControlPost - avgControlPre;
    const didEstimate = treatmentDiff - controlDiff;
    const rawLift = treatmentRegions.length > 0 ? didEstimate : 0;

    const allValues = [...treatmentPre, ...controlPre, ...treatmentPost, ...controlPost].map((d) => d.value);
    const n = allValues.length;
    const mean = allValues.reduce((a, b) => a + b, 0) / n;
    const variance = allValues.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, n - 1);
    const seTreatmentPre = Math.sqrt(variance / Math.max(1, treatmentPre.length));
    const seControlPre = Math.sqrt(variance / Math.max(1, controlPre.length));
    const seTreatmentPost = Math.sqrt(variance / Math.max(1, treatmentPost.length));
    const seControlPost = Math.sqrt(variance / Math.max(1, controlPost.length));
    const seDid = Math.sqrt(seTreatmentPre ** 2 + seControlPre ** 2 + seTreatmentPost ** 2 + seControlPost ** 2);
    const tStat = seDid > 0 ? didEstimate / seDid : 0;
    const df = n - 4;
    const pValue = 2 * (1 - this.tCdf(Math.abs(tStat), Math.max(1, df)));

    return {
      preTreatmentAvg: { treatment: Math.round(avgTreatmentPre * 100) / 100, control: Math.round(avgControlPre * 100) / 100 },
      postTreatmentAvg: { treatment: Math.round(avgTreatmentPost * 100) / 100, control: Math.round(avgControlPost * 100) / 100 },
      rawLift: Math.round(rawLift * 100) / 100,
      didEstimate: Math.round(didEstimate * 100) / 100,
      standardError: Math.round(seDid * 100) / 100,
      tStatistic: Math.round(tStat * 100) / 100,
      pValue: Math.round(pValue * 10000) / 10000,
      significant: pValue < 0.05,
    };
  }

  runSyntheticControl(
    experimentId: string,
    name: string,
    treatedRegion: string,
    donorPool: string[],
    metric: string,
    treatmentStart: string,
    treatmentEnd: string,
    prePeriodData: { date: string; region: string; value: number }[],
    postPeriodData: { date: string; region: string; value: number }[],
  ): SyntheticControlResult {
    const allData = [...prePeriodData, ...postPeriodData];
    const dates = [...new Set(allData.map((d) => d.date))].sort();
    const preDates = [...new Set(prePeriodData.map((d) => d.date))].sort();

    const treatedSeries = dates.map((date) => {
      const match = allData.find((d) => d.region === treatedRegion && d.date === date);
      return match ? match.value : 0;
    });

    const donorSeriesMap: Record<string, number[]> = {};
    for (const region of donorPool) {
      donorSeriesMap[region] = dates.map((date) => {
        const match = allData.find((d) => d.region === region && d.date === date);
        return match ? match.value : 0;
      });
    }

    const prePeriodLen = preDates.length;
    const treatedPre = treatedSeries.slice(0, prePeriodLen);
    const treatedPost = treatedSeries.slice(prePeriodLen);

    const numCombinations = Math.min(100, 2 ** donorPool.length);
    let bestR2 = -Infinity;
    let bestWeights: number[] = new Array(donorPool.length).fill(0);

    for (let c = 0; c < Math.min(numCombinations, 50); c++) {
      const weights = donorPool.map(() => Math.random());
      const totalW = weights.reduce((a, b) => a + b, 0);
      const normalized = totalW > 0 ? weights.map((w) => w / totalW) : weights;

      const syntheticPre = treatedPre.map((_, i) =>
        donorPool.reduce((sum, _, di) => sum + normalized[di] * (donorSeriesMap[donorPool[di]]?.[i] || 0), 0),
      );

      const ssRes = treatedPre.reduce((s, v, i) => s + (v - syntheticPre[i]) ** 2, 0);
      const ssTot = treatedPre.reduce((s, v) => s + (v - treatedPre.reduce((a, b) => a + b, 0) / treatedPre.length) ** 2, 0);
      const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

      if (r2 > bestR2) {
        bestR2 = r2;
        bestWeights = normalized;
      }
    }

    const syntheticAll = dates.map((_, i) =>
      donorPool.reduce((sum, region, di) => sum + bestWeights[di] * (donorSeriesMap[region]?.[i] || 0), 0),
    );

    const preFit = preDates.map((date, i) => ({
      date,
      actual: treatedPre[i],
      synthetic: Math.round(syntheticAll[i] * 100) / 100,
    }));

    const postEffect = dates.slice(prePeriodLen).map((date, i) => ({
      date,
      actual: treatedPost[i],
      synthetic: Math.round(syntheticAll[prePeriodLen + i] * 100) / 100,
      lift: Math.round((treatedPost[i] - syntheticAll[prePeriodLen + i]) * 100) / 100,
    }));

    const avgLift = postEffect.reduce((s, d) => s + d.lift, 0) / Math.max(1, postEffect.length);
    const preMse = treatedPre.reduce((s, v, i) => s + (v - syntheticAll[i]) ** 2, 0) / prePeriodLen;

    return {
      syntheticWeights: donorPool.map((region, i) => ({ region, weight: Math.round(bestWeights[i] * 1000) / 1000 })),
      preTreatmentFit: preFit,
      postTreatmentEffect: postEffect,
      averageLift: Math.round(avgLift * 100) / 100,
      rSquared: Math.round(bestR2 * 1000) / 1000,
      mse: Math.round(preMse * 100) / 100,
    };
  }

  runCUPED(
    experimentId: string,
    name: string,
    metric: string,
    prePeriodData: { user: string; value: number }[],
    postPeriodData: { user: string; value: number; treatment: boolean }[],
  ): CUPEDResult {
    const userMap = new Map<string, number>();
    for (const d of prePeriodData) userMap.set(d.user, d.value);

    const covariateValues: number[] = [];
    const treatmentValues: number[] = [];
    const controlValues: number[] = [];

    for (const d of postPeriodData) {
      const preVal = userMap.get(d.user);
      if (preVal === undefined) continue;
      covariateValues.push(preVal);
      if (d.treatment) {
        treatmentValues.push(d.value);
      } else {
        controlValues.push(d.value);
      }
    }

    const n = covariateValues.length;
    if (n < 5) {
      return {
        adjustedMetrics: postPeriodData.map((d) => ({ date: d.user, raw: d.value, adjusted: d.value })),
        varianceReduction: 0,
        adjustedLift: 0,
        pValue: 1,
        significant: false,
      };
    }

    const meanPre = covariateValues.reduce((a, b) => a + b, 0) / n;
    const allPost = [...treatmentValues, ...controlValues];
    const meanPost = allPost.reduce((a, b) => a + b, 0) / allPost.length;

    let covPrePost = 0, varPre = 0;
    for (let i = 0; i < n; i++) {
      covPrePost += (covariateValues[i] - meanPre) * (allPost[i] - meanPost);
      varPre += (covariateValues[i] - meanPre) ** 2;
    }
    covPrePost /= Math.max(1, n - 1);
    varPre /= Math.max(1, n - 1);

    const theta = varPre > 0 ? covPrePost / varPre : 0;

    const treatmentMean = treatmentValues.reduce((a, b) => a + b, 0) / Math.max(1, treatmentValues.length);
    const controlMean = controlValues.reduce((a, b) => a + b, 0) / Math.max(1, controlValues.length);

    const treatmentPreMean = postPeriodData
      .filter((d) => d.treatment)
      .reduce((s, d) => s + (userMap.get(d.user) || 0), 0) / Math.max(1, treatmentValues.length);

    const controlPreMean = postPeriodData
      .filter((d) => !d.treatment)
      .reduce((s, d) => s + (userMap.get(d.user) || 0), 0) / Math.max(1, controlValues.length);

    const adjustedTreatment = treatmentMean - theta * (treatmentPreMean - meanPre);
    const adjustedControl = controlMean - theta * (controlPreMean - meanPre);
    const adjustedLift = adjustedTreatment - adjustedControl;

    const rawVar = allPost.reduce((s, v) => s + (v - meanPost) ** 2, 0) / Math.max(1, n - 1);
    const adjustedVar = rawVar * (1 - theta * theta);
    const varianceReduction = rawVar > 0 ? (1 - adjustedVar / rawVar) * 100 : 0;

    const se = Math.sqrt(adjustedVar * (1 / treatmentValues.length + 1 / controlValues.length));
    const tStat = se > 0 ? adjustedLift / se : 0;
    const df = treatmentValues.length + controlValues.length - 2;
    const pValue = 2 * (1 - this.tCdf(Math.abs(tStat), Math.max(1, df)));

    const adjustedMetrics = postPeriodData.map((d) => {
      const preVal = userMap.get(d.user) || 0;
      return { date: d.user, raw: d.value, adjusted: Math.round((d.value - theta * (preVal - meanPre)) * 100) / 100 };
    });

    return {
      adjustedMetrics,
      varianceReduction: Math.round(varianceReduction * 100) / 100,
      adjustedLift: Math.round(adjustedLift * 100) / 100,
      pValue: Math.round(pValue * 10000) / 10000,
      significant: pValue < 0.05,
    };
  }

  powerAnalysis(
    baselineMean: number,
    baselineStd: number,
    minimumLift: number = 0.1,
    alpha: number = 0.05,
    beta: number = 0.2,
    sampleSizePerArm?: number,
  ): PowerAnalysisResult {
    const effectSize = baselineMean > 0 ? minimumLift * baselineMean / baselineStd : minimumLift;
    const zAlpha = this.tCdfInv(1 - alpha / 2);
    const zBeta = this.tCdfInv(1 - beta);

    const requiredPerArm = sampleSizePerArm || Math.ceil(2 * ((zAlpha + zBeta) / effectSize) ** 2);
    const achievablePower = sampleSizePerArm
      ? this.calculatePower(effectSize, sampleSizePerArm, alpha)
      : 1 - beta;

    const minDetectable = baselineMean > 0
      ? (zAlpha + this.tCdfInv(1 - beta)) * Math.sqrt(2 * baselineStd ** 2 / Math.max(1, requiredPerArm)) / baselineMean
      : 0;

    return {
      requiredSamplePerArm: requiredPerArm,
      achievablePower: Math.round(achievablePower * 1000) / 1000,
      minimumDetectableEffect: Math.round(minDetectable * 1000) / 1000,
      alpha,
      beta,
    };
  }

  runGeoExperiment(
    experimentId: string,
    name: string,
    treatmentRegions: string[],
    controlRegions: string[],
    metric: string,
    treatmentStart: string,
    treatmentEnd: string,
    prePeriodData: { date: string; region: string; value: number }[],
    postPeriodData: { date: string; region: string; value: number }[],
    method: "did" | "synthetic-control" | "cuped" = "did",
  ): GeoExperimentResult {
    let lift: number;
    let pValue: number;
    let ci95: { lower: number; upper: number };

    if (method === "synthetic-control" && treatmentRegions.length === 1) {
      const sc = this.runSyntheticControl(experimentId, name, treatmentRegions[0], controlRegions, metric, treatmentStart, treatmentEnd, prePeriodData, postPeriodData);
      lift = sc.averageLift;
      const postValues = sc.postTreatmentEffect.map((d) => d.lift);
      const std = Math.sqrt(postValues.reduce((s, v) => s + (v - lift) ** 2, 0) / Math.max(1, postValues.length));
      const se = std / Math.sqrt(postValues.length);
      pValue = se > 0 ? 2 * (1 - this.tCdf(Math.abs(lift / se), postValues.length - 1)) : 1;
      ci95 = { lower: Math.round((lift - 1.96 * se) * 100) / 100, upper: Math.round((lift + 1.96 * se) * 100) / 100 };
    } else {
      const did = this.runDiD(experimentId, name, treatmentRegions, controlRegions, metric, treatmentStart, treatmentEnd, prePeriodData, postPeriodData);
      lift = did.didEstimate;
      pValue = did.pValue;
      ci95 = { lower: Math.round((lift - 1.96 * did.standardError) * 100) / 100, upper: Math.round((lift + 1.96 * did.standardError) * 100) / 100 };
    }

    const powerResult = this.powerAnalysis(100, 30, 0.1, 0.05, 0.2, prePeriodData.length / 2);

    return {
      experimentId,
      name,
      treatmentRegions,
      controlRegions,
      method,
      metric,
      treatmentStart,
      treatmentEnd,
      observedLift: Math.round(lift * 100) / 100,
      confidenceInterval95: ci95,
      pValue: Math.round(pValue * 10000) / 10000,
      significant: pValue < 0.05,
      power: powerResult.achievablePower,
      minimumDetectableEffect: powerResult.minimumDetectableEffect,
      sampleSizePerArm: Math.min(prePeriodData.length / 2, postPeriodData.length / 2),
      summary: pValue < 0.05
        ? `Significant ${lift > 0 ? "positive" : "negative"} lift of ${(lift).toFixed(2)} (p=${(pValue).toFixed(4)}).`
        : `No significant effect detected. Observed lift: ${(lift).toFixed(2)} (p=${(pValue).toFixed(4)}).`,
    };
  }

  generateSamplePrePeriodData(regions: string[], days: number): { date: string; region: string; value: number }[] {
    const data: { date: string; region: string; value: number }[] = [];
    const baseValues: Record<string, number> = {};
    for (const r of regions) baseValues[r] = 80 + Math.random() * 40;
    const now = new Date();
    for (let d = days; d > 0; d--) {
      const date = new Date(now);
      date.setDate(date.getDate() - d);
      const ds = date.toISOString().split("T")[0];
      for (const r of regions) {
        data.push({ date: ds, region: r, value: Math.round((baseValues[r] + (Math.random() - 0.5) * 20) * 100) / 100 });
      }
    }
    return data;
  }

  generateSamplePostPeriodData(regions: string[], treatmentRegions: string[], days: number, treatmentEffect: number = 15): { date: string; region: string; value: number }[] {
    const data: { date: string; region: string; value: number }[] = [];
    const baseValues: Record<string, number> = {};
    for (const r of regions) baseValues[r] = 80 + Math.random() * 40;
    const now = new Date();
    for (let d = 0; d < days; d++) {
      const date = new Date(now);
      date.setDate(date.getDate() + d - days);
      const ds = date.toISOString().split("T")[0];
      for (const r of regions) {
        const effect = treatmentRegions.includes(r) ? treatmentEffect : 0;
        data.push({ date: ds, region: r, value: Math.round((baseValues[r] + effect + (Math.random() - 0.5) * 20) * 100) / 100 });
      }
    }
    return data;
  }

  private tCdf(x: number, df: number): number {
    const a = df / 2;
    const b = 0.5;
    const t = x / Math.sqrt(df + x * x);
    return this.regularizedIncompleteBeta(t, a, b);
  }

  private tCdfInv(p: number, df: number = 1000): number {
    let x = 0;
    let low = -10, high = 10;
    for (let i = 0; i < 50; i++) {
      x = (low + high) / 2;
      const cdf = this.tCdf(x, df);
      if (cdf < p) low = x;
      else high = x;
    }
    return x;
  }

  private regularizedIncompleteBeta(x: number, a: number, b: number): number {
    if (x < 0 || x > 1) return 0;
    if (x === 0 || x === 1) return x;
    const bt = Math.exp(this.lgamma(a + b) - this.lgamma(a) - this.lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    if (x < (a + 1) / (a + b + 2)) return bt * this.contFrac(a, b, x) / a;
    return 1 - bt * this.contFrac(b, a, 1 - x) / b;
  }

  private contFrac(a: number, b: number, x: number): number {
    const maxIter = 100;
    let result = 1;
    for (let m = 1; m <= maxIter; m++) {
      const num = m * (b - m) * x / ((a + 2 * m - 1) * (a + 2 * m));
      result = 1 + num / result;
    }
    return 1 / result;
  }

  private lgamma(x: number): number {
    const g = 7;
    const c = [
      0.99999999999980993, 676.5203681218851, -1259.1392167224028,
      771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
    ];
    if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - this.lgamma(1 - x);
    x -= 1;
    let a = c[0];
    for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
    const t = x + g + 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }

  private calculatePower(effectSize: number, n: number, alpha: number): number {
    const zAlpha = this.tCdfInv(1 - alpha / 2);
    const se = Math.sqrt(2 / n);
    const t = effectSize / se - zAlpha;
    return this.tCdf(t, 2 * n - 2);
  }
}

export const incrementalityTestingService = new IncrementalityTestingService();
