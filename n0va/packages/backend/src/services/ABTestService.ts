export class ABTestService {
  static chiSquaredPValue(control: { impressions: number; conversions: number }, variant: { impressions: number; conversions: number }): number {
    const t = [
      [control.conversions, control.impressions - control.conversions],
      [variant.conversions, variant.impressions - variant.conversions],
    ];
    const rowTotals = t.map((r) => r[0] + r[1]);
    const colTotals = [t[0][0] + t[1][0], t[0][1] + t[1][1]];
    const total = rowTotals[0] + rowTotals[1];
    if (total === 0 || colTotals[0] === 0 || colTotals[1] === 0) return 1;
    let chi2 = 0;
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        const expected = (rowTotals[i] * colTotals[j]) / total;
        if (expected > 0) chi2 += (t[i][j] - expected) ** 2 / expected;
      }
    }
    return this.chiSquareCdf(chi2, 1);
  }

  private static chiSquareCdf(x: number, k: number): number {
    if (x <= 0) return 1;
    return 1 - this.regularizedGammaP(k / 2, x / 2);
  }

  private static regularizedGammaP(a: number, x: number): number {
    if (x < 0 || a <= 0) return 0;
    if (x < a + 1) return this.series(a, x);
    return 1 - this.cfraction(a, x);
  }

  private static series(a: number, x: number): number {
    let s = 1 / a;
    let t = s;
    for (let i = 1; i <= 100; i++) {
      t *= x / (a + i);
      s += t;
      if (Math.abs(t) < 1e-14) break;
    }
    return s * Math.exp(-x + a * Math.log(x) - this.logGamma(a));
  }

  private static cfraction(a: number, x: number): number {
    let f = 1 + x * (1 - a) / (1 + 1);
    let c = f;
    let d = 0;
    for (let i = 2; i <= 200; i += 2) {
      const ai = (i / 2) * (a - i / 2);
      d = 1 + ai / (x + d * (1 + 1));
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = 1 + ai / (x + c * (i % 2 === 0 ? 1 : -1));
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      f *= c * d;
    }
    return f * Math.exp(-x + a * Math.log(x) - this.logGamma(a));
  }

  private static logGamma(x: number): number {
    const coeff = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
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

  static computeSignificance(variants: { impressions: number; conversions: number; name?: string }[]): { confidence: number; winner: string | null; pValues: number[]; uplift: number[] } {
    if (variants.length < 2) return { confidence: 0, winner: null, pValues: [], uplift: [] };
    const control = variants[0];
    const pValues = [1];
    const uplift = [0];
    for (let i = 1; i < variants.length; i++) {
      const p = this.chiSquaredPValue(control, variants[i]);
      pValues.push(p);
      const controlCvr = control.impressions > 0 ? control.conversions / control.impressions : 0;
      const variantCvr = variants[i].impressions > 0 ? variants[i].conversions / variants[i].impressions : 0;
      uplift.push(controlCvr > 0 ? ((variantCvr - controlCvr) / controlCvr) * 100 : 0);
    }
    const bestP = Math.min(...pValues.slice(1));
    const confidence = parseFloat(((1 - bestP) * 100).toFixed(1));
    const bestIdx = variants.slice(1).reduce((a, b, i, arr) => {
      const cvrA = variants[a + 1].impressions > 0 ? variants[a + 1].conversions / variants[a + 1].impressions : 0;
      const cvrB = b.impressions > 0 ? b.conversions / b.impressions : 0;
      return cvrB > cvrA ? i : a;
    }, 0);
    const winner = confidence > 90 ? variants[bestIdx + 1].impressions > 0 ? `${variants[bestIdx + 1].name as string}` : null : null;
    return { confidence, winner, pValues, uplift };
  }

  static computeBayesianProbability(control: { impressions: number; conversions: number }, variant: { impressions: number; conversions: number }): number {
    const sims = 50000;
    const alphaC = control.conversions + 1;
    const betaC = control.impressions - control.conversions + 1;
    const alphaV = variant.conversions + 1;
    const betaV = variant.impressions - variant.conversions + 1;
    let wins = 0;
    for (let i = 0; i < sims; i++) {
      const c = this.sampleBeta(alphaC, betaC);
      const v = this.sampleBeta(alphaV, betaV);
      if (v > c) wins++;
    }
    return wins / sims;
  }

  private static sampleBeta(alpha: number, beta: number): number {
    const x = this.sampleGamma(alpha);
    const y = this.sampleGamma(beta);
    return x / (x + y);
  }

  private static sampleGamma(shape: number): number {
    if (shape < 1) return this.sampleGamma(shape + 1) * Math.pow(Math.random(), 1 / shape);
    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    while (true) {
      let x: number; let v: number;
      do {
        x = this.normalSample();
        v = 1 + c * x;
      } while (v <= 0);
      v = v * v * v;
      const u = Math.random();
      if (u < 1 - 0.0331 * x * x * x * x || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
        return d * v;
      }
    }
  }

  private static normalSample(): number {
    let u = 0; let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  static generateMockVariant(name: string, baseImp: number, multiplier: number) {
    const impressions = Math.round(baseImp * (0.85 + Math.random() * 0.3));
    const ctr = (0.01 + Math.random() * 0.02) * multiplier * (0.9 + Math.random() * 0.2);
    const clicks = Math.round(impressions * ctr);
    const cvr = (0.02 + Math.random() * 0.02) * multiplier * (0.85 + Math.random() * 0.3);
    const conversions = Math.round(clicks * cvr);
    const spend = Math.round(impressions * 0.005 * (0.8 + Math.random() * 0.4));
    const revenue = Math.round(conversions * 45 * (0.8 + Math.random() * 0.4));
    return { id: `var_${name.toLowerCase().replace(/\s+/g, "_")}`, name, impressions, clicks, conversions, spend, revenue, ctr: parseFloat(ctr.toFixed(4)), cvr: parseFloat(cvr.toFixed(4)), roas: spend > 0 ? parseFloat((revenue / spend).toFixed(2)) : 0 };
  }

  static generateRecommendation(variants: any[], winner: string | null, confidence: number): string {
    if (!winner || confidence < 90) return "No significant winner yet. Let the test continue until 95% confidence is reached.";
    const winning = variants.find((v: any) => v.name === winner || v.id === winner);
    const control = variants[0];
    if (!winning || !control || control.conversions === 0) return "Promote the winning variant to 100% of traffic.";
    const uplift = ((winning.cvr - control.cvr) / control.cvr) * 100;
    return `${winner} outperforms the control by ${uplift.toFixed(1)}% in CVR (${confidence.toFixed(1)}% confidence). Recommend scaling ${winner} to 70% of traffic with 30% holdout for validation.`;
  }
}
