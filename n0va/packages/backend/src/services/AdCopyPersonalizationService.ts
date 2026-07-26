export interface CreativeElement {
  type: "headline" | "body" | "cta" | "image" | "description" | "offer";
  content: string;
  variants: string[];
}

export interface ElementScore {
  elementType: string;
  content: string;
  relevanceScore: number;
  engagementScore: number;
  personalizationScore: number;
  overallScore: number;
}

export interface PersonalizedVariant {
  elements: Record<string, string>;
  personalizationScore: number;
  expectedCtr: number;
  expectedCvr: number;
  segments: string[];
}

export interface MVTVariant {
  name: string;
  elements: Record<string, string>;
  impressions: number;
  conversions: number;
  conversionRate: number;
  lift: number;
  probabilityBest: number;
}

export interface MVTResult {
  variants: MVTVariant[];
  winner: string;
  totalImpressions: number;
  significanceLevel: number;
  interactions: Record<string, Record<string, number>>;
}

export interface UserContext {
  userId: string;
  deviceType: string;
  timeOfDay: number;
  dayOfWeek: number;
  recentPages: string[];
  pastPurchases: string[];
  segments: string[];
  location?: string;
}

export class AdCopyPersonalizationService {
  private elementEmbeddings: Map<string, number[]> = new Map();
  private mvtHistory: Map<string, { alpha: number; beta: number }> = new Map();

  private tfidf(text: string): Record<string, number> {
    const words = text.toLowerCase().split(/\W+/).filter(Boolean);
    const freq: Record<string, number> = {};
    for (const w of words) {
      freq[w] = (freq[w] || 0) + 1;
    }
    const maxFreq = Math.max(...Object.values(freq), 1);
    const result: Record<string, number> = {};
    for (const [word, count] of Object.entries(freq)) {
      result[word] = count / maxFreq;
    }
    return result;
  }

  private cosineSimilarity(a: Record<string, number>, b: Record<string, number>): number {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    let dot = 0, normA = 0, normB = 0;
    for (const k of keys) {
      const va = a[k] || 0;
      const vb = b[k] || 0;
      dot += va * vb;
      normA += va * va;
      normB += vb * vb;
    }
    return normA > 0 && normB > 0 ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
  }

  scoreElement(element: CreativeElement, userContext: UserContext): ElementScore {
    const contentVec = this.tfidf(element.content);
    const userProfile: Record<string, number> = {};
    for (const seg of userContext.segments) userProfile[seg] = 1;
    for (const page of userContext.recentPages) {
      for (const w of page.toLowerCase().split(/\W+/).filter(Boolean)) {
        userProfile[w] = (userProfile[w] || 0) + 0.5;
      }
    }
    for (const purchase of userContext.pastPurchases) {
      for (const w of purchase.toLowerCase().split(/\W+/).filter(Boolean)) {
        userProfile[w] = (userProfile[w] || 0) + 0.3;
      }
    }
    const relevanceScore = this.cosineSimilarity(contentVec, userProfile);
    const hasPersonalPronoun = /\b(you|your|yours)\b/i.test(element.content);
    const hasUrgency = /\b(now|today|limited|exclusive|hurry)\b/i.test(element.content);
    const lengthScore = element.content.length > 10 && element.content.length < 100 ? 0.8 : 0.3;
    const engagementScore = (hasPersonalPronoun ? 0.4 : 0) + (hasUrgency ? 0.3 : 0) + lengthScore * 0.3;

    const segmentBoost = userContext.segments.length > 0 ? 0.2 : 0;
    const timeBoost = userContext.timeOfDay >= 18 || userContext.timeOfDay <= 6 ? 0.1 : 0;
    const personalizationScore = Math.min(1, relevanceScore * 0.5 + segmentBoost + timeBoost + 0.1);

    const overallScore = Math.round((relevanceScore * 0.3 + engagementScore * 0.35 + personalizationScore * 0.35) * 10000) / 100;

    return {
      elementType: element.type, content: element.content,
      relevanceScore: Math.round(relevanceScore * 10000) / 100,
      engagementScore: Math.round(engagementScore * 10000) / 100,
      personalizationScore: Math.round(personalizationScore * 10000) / 100,
      overallScore,
    };
  }

  selectBestElements(elements: CreativeElement[], userContext: UserContext): PersonalizedVariant {
    const bestElements: Record<string, string> = {};
    let totalScore = 0;
    for (const el of elements) {
      let bestVariant = el.content;
      let bestScore = -1;
      const allVariants = [el.content, ...el.variants.filter((v) => v !== el.content)];
      for (const v of allVariants) {
        const scored = this.scoreElement({ type: el.type, content: v, variants: [] }, userContext);
        if (scored.overallScore > bestScore) {
          bestScore = scored.overallScore;
          bestVariant = v;
        }
      }
      bestElements[el.type] = bestVariant;
      totalScore += bestScore;
    }

    const avgScore = elements.length > 0 ? totalScore / elements.length : 0;
    const expectedCtr = Math.round((2.5 + avgScore * 3) * 100) / 100;
    const expectedCvr = Math.round((1.5 + avgScore * 2.5) * 100) / 100;

    return {
      elements: bestElements,
      personalizationScore: Math.round(avgScore * 10000) / 100,
      expectedCtr, expectedCvr,
      segments: userContext.segments,
    };
  }

  runMVTest(
    variants: { name: string; elements: Record<string, string> }[],
    totalVisitors: number,
  ): MVTResult {
    const visitorPerVariant = Math.floor(totalVisitors / variants.length);
    const results: MVTVariant[] = [];
    let totalConversions = 0;
    let totalImpressions = 0;

    for (const v of variants) {
      const key = `mvt_${v.name}`;
      const prior = this.mvtHistory.get(key) || { alpha: 1, beta: 1 };
      const baseCvr = prior.alpha / (prior.alpha + prior.beta);
      const noise = (Math.random() - 0.5) * 0.02;
      const trueCvr = Math.max(0.001, baseCvr + noise);
      const conversions = Math.round(this.binomialSample(visitorPerVariant, trueCvr));
      const conversionRate = visitorPerVariant > 0 ? (conversions / visitorPerVariant) * 100 : 0;

      results.push({
        name: v.name, elements: v.elements,
        impressions: visitorPerVariant, conversions, conversionRate: Math.round(conversionRate * 100) / 100,
        lift: 0, probabilityBest: 0,
      });
      totalConversions += conversions;
      totalImpressions += visitorPerVariant;
    }

    const bestCvr = Math.max(...results.map((r) => r.conversionRate));
    for (const r of results) {
      r.lift = bestCvr > 0 ? Math.round(((r.conversionRate - bestCvr) / bestCvr) * 10000) / 100 : 0;
    }

    const probs = this.monteCarloMVTWinProb(variants.map((v) => {
      const r = results.find((rr) => rr.name === v.name)!;
      return { name: v.name, alpha: 1 + r.conversions, beta: 1 + r.impressions - r.conversions };
    }));
    for (const r of results) {
      r.probabilityBest = Math.round((probs[r.name] || 0) * 10000) / 100;
    }

    results.sort((a, b) => b.conversionRate - a.conversionRate);
    const winner = results[0].name;

    const interactions: Record<string, Record<string, number>> = {};
    for (let i = 0; i < variants.length; i++) {
      for (let j = i + 1; j < variants.length; j++) {
        const comboKey = `${variants[i].name}_x_${variants[j].name}`;
        if (!interactions[variants[i].name]) interactions[variants[i].name] = {};
        if (!interactions[variants[j].name]) interactions[variants[j].name] = {};
        const combinedCvr = (results[i].conversionRate + results[j].conversionRate) / 2;
        interactions[variants[i].name][variants[j].name] = Math.round(combinedCvr * 100) / 100;
        interactions[variants[j].name][variants[i].name] = Math.round(combinedCvr * 100) / 100;
      }
    }

    const significanceLevel = Math.round((probs[winner] || 0) * 100) / 100;

    return { variants: results, winner, totalImpressions, significanceLevel, interactions };
  }

  private monteCarloMVTWinProb(variants: { name: string; alpha: number; beta: number }[], samples: number = 10000): Record<string, number> {
    const wins: Record<string, number> = {};
    for (const v of variants) wins[v.name] = 0;
    for (let s = 0; s < samples; s++) {
      let bestVal = -Infinity;
      let bestName = variants[0].name;
      for (const v of variants) {
        const val = this.sampleBeta(v.alpha, v.beta);
        if (val > bestVal) { bestVal = val; bestName = v.name; }
      }
      wins[bestName]++;
    }
    const result: Record<string, number> = {};
    for (const [name, count] of Object.entries(wins)) result[name] = (count / samples) * 100;
    return result;
  }

  private sampleBeta(alpha: number, beta: number): number {
    const a = this.sampleGamma(alpha);
    const b = this.sampleGamma(beta);
    return a / (a + b);
  }

  private sampleGamma(shape: number): number {
    if (shape < 1) {
      const u = Math.random();
      return this.sampleGamma(1 + shape) * Math.pow(u, 1 / shape);
    }
    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    while (true) {
      let x: number, v: number;
      do { x = this.sampleNormal(); v = 1 + c * x; } while (v <= 0);
      v = v * v * v;
      const u = Math.random();
      if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  }

  private sampleNormal(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  private binomialSample(n: number, p: number): number {
    let count = 0;
    for (let i = 0; i < n; i++) { if (Math.random() < p) count++; }
    return count;
  }

  generateSampleElements(): CreativeElement[] {
    return [
      { type: "headline", content: "Transform Your Business Today", variants: ["Grow Faster With AI", "Unlock Your Potential", "The Future Is Here"] },
      { type: "body", content: "Our platform helps you achieve measurable results with cutting-edge technology.", variants: ["Join thousands of satisfied customers using our solution.", "Experience the difference that modern technology makes.", "Stop dreaming and start achieving with our proven platform."] },
      { type: "cta", content: "Get Started Free", variants: ["Try It Now", "Claim Your Demo", "Start Your Journey"] },
      { type: "offer", content: "30-Day Free Trial", variants: ["Limited Time Discount", "Free Consultation", "Money-Back Guarantee"] },
    ];
  }

  generateSampleUserContext(): UserContext {
    const segments = ["tech_savvy", "early_adopter", "high_intent", "budget_conscious", "enterprise"];
    const devices = ["mobile", "desktop", "tablet"];
    const pages = ["/pricing", "/features", "/integrations", "/case-studies", "/blog/ai-trends"];
    const purchases = ["SaaS subscription", "AI tools", "Analytics platform", "Marketing software"];
    return {
      userId: `user_${Math.random().toString(36).substring(2, 8)}`,
      deviceType: devices[Math.floor(Math.random() * devices.length)],
      timeOfDay: Math.floor(Math.random() * 24),
      dayOfWeek: Math.floor(Math.random() * 7),
      recentPages: [pages[Math.floor(Math.random() * pages.length)]],
      pastPurchases: [purchases[Math.floor(Math.random() * purchases.length)]],
      segments: [segments[Math.floor(Math.random() * segments.length)], segments[Math.floor(Math.random() * segments.length)]],
    };
  }

  generateSampleMVTVariants(): { name: string; elements: Record<string, string> }[] {
    return [
      { name: "control", elements: { headline: "Transform Your Business Today", cta: "Get Started Free", offer: "30-Day Free Trial" } },
      { name: "variant_a", elements: { headline: "Grow Faster With AI", cta: "Try It Now", offer: "Limited Time Discount" } },
      { name: "variant_b", elements: { headline: "Unlock Your Potential", cta: "Claim Your Demo", offer: "Free Consultation" } },
      { name: "variant_c", elements: { headline: "The Future Is Here", cta: "Start Your Journey", offer: "Money-Back Guarantee" } },
    ];
  }
}

export const adCopyPersonalizationService = new AdCopyPersonalizationService();
