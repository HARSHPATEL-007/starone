export interface GeneratedVariant {
  headline: string;
  body: string;
  cta: string;
  tone: string;
  platform: string;
  estimatedCtr: number;
  estimatedCvr: number;
  characterCount: number;
  platformFit: "excellent" | "good" | "fair" | "poor";
}

type Tone = "professional" | "casual" | "urgent" | "humorous" | "luxury" | "empathetic" | "authoritative" | "playful";
type Platform = "meta" | "google" | "linkedin" | "tiktok" | "snapchat";

const ALL_TONES: Tone[] = ["professional", "casual", "urgent", "humorous", "luxury", "empathetic", "authoritative", "playful"];

const HEADLINE_TEMPLATES: Record<Tone, string[]> = {
  professional: [
    "Transform Your [benefit] With [product]",
    "Enterprise-Grade [product] For [audience]",
    "Achieve [benefit] With [product] Today",
    "Professional [product] Solutions For [audience]",
    "Optimize Your [area] With [product]",
  ],
  casual: [
    "Hey [audience], Check Out [product]",
    "Get More [benefit] With [product]",
    "[product] Makes [benefit] Easy",
    "Your [audience] Deserves [benefit]",
    "Let's Talk About [product]",
  ],
  urgent: [
    "Limited Time: [benefit] Starting At [price]",
    "Don't Miss Out On [benefit]",
    "Last Chance: Get [benefit] With [product]",
    "Act Now — [benefit] Won't Last",
    "Hurry! [benefit] Ends Soon",
  ],
  humorous: [
    "Our [product] Is Smarter Than Your [something]",
    "[product]: Because Your [something] Needs Help",
    "We Fix [problem] So You Don't Have To",
    "Warning: [product] May Cause [benefit]",
    "Your [audience] Called — They Want [product]",
  ],
  luxury: [
    "Experience The Pinnacle Of [benefit]",
    "Exclusive [product] For Discerning [audience]",
    "Elevate Your [area] With [product]",
    "Refined [benefit] — Only With [product]",
    "The Art Of [benefit]: Introducing [product]",
  ],
  empathetic: [
    "We Understand [audience] — We Built [product]",
    "Your [benefit] Journey Starts Here",
    "Together, Let's Achieve [benefit]",
    "Because [audience] Deserve [benefit]",
    "You're Not Alone — [product] Is Here",
  ],
  authoritative: [
    "Industry Leaders Choose [product]",
    "[benefit]: The [product] Advantage",
    "Trusted By Top [audience] Worldwide",
    "The Definitive [product] For [benefit]",
    "Proven Results: [product] Delivers [benefit]",
  ],
  playful: [
    "Let's Get [benefit] With [product]",
    "Spoiler: [product] Makes [benefit] Fun",
    "[product] — The Fun Way To [benefit]",
    "Ready For [benefit]? [product] Is Too",
    "Psst... [product] Has [benefit]",
  ],
};

const BODY_TEMPLATES: Record<Tone, string[]> = {
  professional: [
    "Streamline your workflow with [product] — built for [audience] who demand results. Experience seamless integration and measurable outcomes that drive real business growth.",
    "[product] empowers [audience] to achieve [benefit] through cutting-edge technology and proven methodologies. Join thousands of satisfied customers who've made the switch.",
    "Stop settling for less. [product] delivers [benefit] with enterprise-grade security, dedicated support, and a platform that scales as you grow. Trusted by industry leaders worldwide.",
    "Designed specifically for [audience], [product] combines powerful analytics with intuitive controls. Make data-driven decisions that maximize your ROI and streamline operations.",
  ],
  casual: [
    "Let's be real — you've got better things to do. [product] handles the heavy lifting so you can focus on what matters. It's that simple.",
    "Wanna know a secret? [product] makes [benefit] actually fun. No complicated setups, no steep learning curves. Just results, delivered.",
    "Look, we kept it simple. [product] does the work, you get the credit. Perfect for [audience] who want [benefit] without the headache.",
    "Here's the deal: [product] helps [audience] get [benefit] fast. No fluff, no nonsense, just a tool that works. Give it a shot.",
  ],
  urgent: [
    "Time is running out! [audience] everywhere are switching to [product] and unlocking [benefit] at unprecedented rates. This limited-time offer won't last — secure your spot now.",
    "Act now and claim exclusive [benefit] with [product]. Early adopters are seeing results in record time. Don't let this opportunity pass you by — spots are filling fast.",
    "Attention [audience]: Your competitors are already using [product] to gain [benefit]. Every day you wait is a day of missed revenue. Start today.",
    "Flash sale ends soon! Get [product] at a fraction of the cost and start seeing [benefit] immediately. No risk, no obligation — but only for the next 48 hours.",
  ],
  humorous: [
    "If your current workflow was a person, it'd still be using dial-up. Meet [product] — the upgrade your [something] has been begging for. Results may include spontaneous [benefit].",
    "Warning: Side effects of [product] include extreme productivity, uncontrollable smiling, and sudden [benefit]. Ask your [audience] if [product] is right for them.",
    "[product] does for [benefit] what coffee does for Mondays. It just works. Your [something] will thank you. Probably.",
    "Our competitors hate this one weird trick. Actually, they hate a lot of things. But mostly that [product] makes [benefit] so easy for [audience].",
  ],
  luxury: [
    "Indulge in the unparalleled sophistication of [product]. Every detail crafted for [audience] who demand nothing less than perfection. Elevate your experience of [benefit].",
    "Step into a world where [benefit] meets elegance. [product] offers discerning [audience] a curated experience that transcends the ordinary. This is more than a tool — it's a statement.",
    "The pursuit of [benefit] has never been more refined. [product] delivers bespoke solutions for [audience] who understand that true quality is measured in outcomes, not features.",
    "Where [benefit] becomes an art form. [product] is the choice of [audience] who recognize that excellence is not a destination — it's the standard. Welcome to a higher tier.",
  ],
  empathetic: [
    "We know [audience] face unique challenges every day. That's why we built [product] — to help you achieve [benefit] without adding to your plate. You've got enough on your mind.",
    "It's not easy navigating [area] alone. [product] is here to support [audience] every step of the way. Your success is personal to us, and we're committed to helping you find [benefit].",
    "You deserve [benefit], and we're here to make that happen. [product] was created with [audience] in mind — because we believe everyone deserves tools that work as hard as they do.",
    "At the heart of [product] is a simple truth: we care about [audience]. Every feature is designed to reduce stress and deliver [benefit]. You're not just a customer — you're our mission.",
  ],
  authoritative: [
    "According to industry data, [benefit] is the #1 priority for [audience] in 2026. [product] delivers with a proven track record across thousands of deployments. The numbers speak for themselves.",
    "Certified. Tested. Trusted. [product] meets the rigorous standards demanded by [audience] worldwide. Our methodology has been vetted by leading experts in [area].",
    "Set the standard for excellence in your field. [product] provides [audience] with the authoritative tools needed to achieve [benefit]. Backed by research and validated by results.",
    "Leading [audience] organizations rely on [product] to drive [benefit]. With a 99.9% uptime SLA and enterprise-grade compliance, it's the definitive choice for mission-critical operations.",
  ],
  playful: [
    "Ready to have some fun? [product] turns [benefit] into an adventure. Built for [audience] who believe work and play are better together. Let's get started!",
    "Brace yourself for [benefit] like you've never experienced. [product] is here to make your day brighter, your work lighter, and your [something] happier. You're welcome.",
    "Spoiler alert: [product] is about to become your new favorite thing. It's fun, it's fast, and it delivers [benefit] with a smile. [audience] love it. You will too.",
    "Who said [benefit] has to be boring? Definitely not us. [product] brings the fun factor to [audience] who want results and a good time. Come play.",
  ],
};

const CTA_TEMPLATES: Record<Tone, string[]> = {
  professional: ["Get Started Now", "Request a Demo", "Learn More", "Schedule a Consultation", "Try Enterprise Free"],
  casual: ["Give It a Try", "Check It Out", "Get Yours Now", "See for Yourself", "Jump In"],
  urgent: ["Act Now", "Limited Offer", "Claim Your Spot", "Don't Wait", "Get It Before It's Gone"],
  humorous: ["Try It (You'll Thank Us Later)", "Go On, Click It", "Join the Fun", "You Know You Want To", "Do It for Your [something]"],
  luxury: ["Enquire Now", "Access the Collection", "Begin Your Experience", "Request an Invitation", "Join the Elite"],
  empathetic: ["Start Your Journey", "Let's Help You", "Get the Support You Need", "Take the First Step", "We're Here for You"],
  authoritative: ["Get the Report", "Join Industry Leaders", "Schedule a Demo", "Access the Whitepaper", "Talk to an Expert"],
  playful: ["Let's Go!", "Get in on the Fun", "Yes, Please!", "Ready, Set, Go", "Do the Thing"],
};

const platformConstraints: Record<Platform, { maxHeadline: number; maxBody: number; maxCta: number; preferredTones: Tone[] }> = {
  meta: { maxHeadline: 40, maxBody: 125, maxCta: 30, preferredTones: ["casual", "playful", "professional"] },
  google: { maxHeadline: 30, maxBody: 90, maxCta: 25, preferredTones: ["urgent", "professional"] },
  linkedin: { maxHeadline: 70, maxBody: 150, maxCta: 40, preferredTones: ["professional", "authoritative"] },
  tiktok: { maxHeadline: 35, maxBody: 100, maxCta: 20, preferredTones: ["casual", "playful", "humorous"] },
  snapchat: { maxHeadline: 25, maxBody: 60, maxCta: 15, preferredTones: ["playful", "casual"] },
};

const COMMON_NOUNS = ["coffee maker", "smartphone", "pet hamster", "office plant", "spreadsheet", "to-do list", "email inbox", "calendar", "meeting schedule", "WiFi router"];

const NOTABLE_BENEFITS = [
  "save time", "increase revenue", "boost productivity", "reduce costs", "streamline operations",
  "gain insights", "improve efficiency", "accelerate growth", "enhance performance", "simplify workflows",
  "drive conversions", "maximize ROI", "scale faster", "automate tasks", "optimize spend",
];

export class CreativeAIService {
  generateVariants(input: {
    productDescription: string;
    targetAudience: string;
    tone: Tone;
    platform: Platform;
    count?: number;
  }): GeneratedVariant[] {
    const count = Math.max(1, Math.min(8, input.count ?? 3));
    const tokens = this.parseTokens(input.productDescription, input.targetAudience);
    const variants: GeneratedVariant[] = [];

    const usedHeadlines = new Set<string>();
    const usedBodies = new Set<string>();
    const usedCtas = new Set<string>();

    for (let i = 0; i < count; i++) {
      const headline = this.pickUnique(HEADLINE_TEMPLATES[input.tone], usedHeadlines);
      const body = this.pickUnique(BODY_TEMPLATES[input.tone], usedBodies);
      const ctaTemplate = this.pickUnique(CTA_TEMPLATES[input.tone], usedCtas);

      const filledHeadline = this.fillTemplate(headline, tokens);
      const filledBody = this.fillTemplate(body, tokens);
      const filledCta = this.fillTemplate(ctaTemplate, tokens);

      const characterCount = filledHeadline.length + filledBody.length + filledCta.length;
      const platformFit = this.evaluatePlatformFit(filledHeadline, filledBody, filledCta, input.tone, input.platform);
      const tonePlatformModifier = this.getTonePlatformModifier(input.tone, input.platform);

      variants.push({
        headline: filledHeadline,
        body: filledBody,
        cta: filledCta,
        tone: input.tone,
        platform: input.platform,
        estimatedCtr: parseFloat((Math.random() * 3 + 1.5 + tonePlatformModifier).toFixed(2)),
        estimatedCvr: parseFloat((Math.random() * 2.5 + 0.5 + tonePlatformModifier * 0.5).toFixed(2)),
        characterCount,
        platformFit,
      });
    }

    return variants;
  }

  generateHeadlines(productDescription: string, audience: string, count?: number): string[] {
    const n = Math.max(1, Math.min(10, count ?? 5));
    const tokens = this.parseTokens(productDescription, audience);
    const used = new Set<string>();
    const result: string[] = [];

    for (let i = 0; i < n; i++) {
      const tone = ALL_TONES[i % ALL_TONES.length];
      const template = this.pickUnique(HEADLINE_TEMPLATES[tone], used);
      result.push(this.fillTemplate(template, tokens));
    }

    return result;
  }

  generateBody(productDescription: string, audience: string, tone: string, count?: number): string[] {
    const n = Math.max(1, Math.min(8, count ?? 3));
    const tokens = this.parseTokens(productDescription, audience);
    const toneKey = ALL_TONES.includes(tone as Tone) ? (tone as Tone) : "professional";
    const used = new Set<string>();
    const result: string[] = [];

    for (let i = 0; i < n; i++) {
      const template = this.pickUnique(BODY_TEMPLATES[toneKey], used);
      result.push(this.fillTemplate(template, tokens));
    }

    return result;
  }

  suggestTone(productDescription: string, platform: string): string {
    const platformKey = platform as Platform;
    const preferred = platformConstraints[platformKey]?.preferredTones ?? ["professional"];

    const lower = productDescription.toLowerCase();
    if (/\b(luxury|premium|exclusive|high.?end|designer)\b/.test(lower)) return "luxury";
    if (/\b(urgent|limited|hurry|last chance|expires|deadline)\b/.test(lower)) return "urgent";
    if (/\b(fun|play|game|enjoy|delight|exciting)\b/.test(lower)) return "playful";
    if (/\b(enterprise|corporate|b2b|business|professional|solution)\b/.test(lower)) return "professional";
    if (/\b(support|care|help|community|together|compassion)\b/.test(lower)) return "empathetic";
    if (/\b(funny|hilarious|laugh|joke|humor)\b/.test(lower)) return "humorous";
    if (/\b(leader|expert|authority|trusted|proven|industry)\b/.test(lower)) return "authoritative";
    if (/\b(casual|easy|simple|relax|everyday)\b/.test(lower)) return "casual";

    if (preferred.includes("professional")) return "professional";
    return preferred[0];
  }

  expandHeadline(headline: string): string[] {
    const expansions = [
      `${headline} — Discover What's Possible`,
      `Introducing ${headline}. Your [area] Will Never Be The Same.`,
      `Ready For ${headline}? Let's Make It Happen.`,
    ];

    const tokens = this.parseTokens(headline, "your team");
    return expansions.map((e) => this.fillTemplate(e, tokens));
  }

  private parseTokens(productDescription: string, audience: string) {
    const words = productDescription.split(/\s+/).filter(Boolean);
    const product = words.slice(0, 3).join(" ") || productDescription;
    const benefit = this.extractBenefit(productDescription);
    const area = this.extractArea(productDescription);
    const problem = words.length > 4 ? words.slice(-2).join(" ") : "common problems";
    const price = `$${(Math.random() * 90 + 9.99).toFixed(2)}`;
    const something = COMMON_NOUNS[Math.floor(Math.random() * COMMON_NOUNS.length)];

    return { product, audience, benefit, area, problem, price, something };
  }

  private extractBenefit(text: string): string {
    const lower = text.toLowerCase();
    const found = NOTABLE_BENEFITS.find((b) => lower.includes(b));
    if (found) return found;
    const words = text.split(/\s+/);
    if (words.length >= 3) return words.slice(-3).join(" ");
    return text;
  }

  private extractArea(text: string): string {
    const lower = text.toLowerCase();
    const areaPatterns = [" in ", " for ", " with ", " of "];
    for (const p of areaPatterns) {
      const idx = lower.lastIndexOf(p);
      if (idx >= 0) {
        const after = text.slice(idx + p.length).split(/[,.]/)[0].trim();
        if (after.length < 30) return after;
      }
    }
    const words = text.split(/\s+/);
    return words.slice(-2).join(" ") || text;
  }

  private fillTemplate(template: string, tokens: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(tokens)) {
      result = result.replaceAll(`[${key}]`, value);
    }
    return result;
  }

  private pickUnique(pool: string[], used: Set<string>): string {
    const available = pool.filter((t) => !used.has(t));
    if (available.length === 0) {
      used.clear();
      return pool[Math.floor(Math.random() * pool.length)];
    }
    const pick = available[Math.floor(Math.random() * available.length)];
    used.add(pick);
    return pick;
  }

  private evaluatePlatformFit(
    headline: string,
    body: string,
    cta: string,
    tone: Tone,
    platform: Platform
  ): GeneratedVariant["platformFit"] {
    const constraints = platformConstraints[platform];
    if (!constraints) return "fair";

    let score = 0;

    if (headline.length <= constraints.maxHeadline) score += 2;
    else if (headline.length <= constraints.maxHeadline * 1.3) score += 1;

    if (body.length <= constraints.maxBody) score += 2;
    else if (body.length <= constraints.maxBody * 1.3) score += 1;

    if (cta.length <= constraints.maxCta) score += 1;

    if (constraints.preferredTones.includes(tone)) score += 2;
    else if (ALL_TONES.indexOf(tone) >= 0) score += 0;

    const characterCount = headline.length + body.length + cta.length;
    if (platform === "snapchat" && characterCount > 100) score -= 1;
    if (platform === "linkedin" && characterCount < 50) score -= 1;

    if (score >= 6) return "excellent";
    if (score >= 4) return "good";
    if (score >= 2) return "fair";
    return "poor";
  }

  private getTonePlatformModifier(tone: Tone, platform: Platform): number {
    const modifierMap: Partial<Record<Platform, Partial<Record<Tone, number>>>> = {
      meta: { professional: 0.3, casual: 0.5, urgent: 0.2, humorous: -0.1, luxury: 0.1, empathetic: 0.2, authoritative: 0.1, playful: 0.3 },
      google: { professional: 0.4, casual: -0.2, urgent: 0.6, humorous: -0.5, luxury: -0.3, empathetic: -0.1, authoritative: 0.3, playful: -0.3 },
      linkedin: { professional: 0.7, casual: -0.3, urgent: -0.1, humorous: -0.6, luxury: 0.1, empathetic: 0.3, authoritative: 0.6, playful: -0.5 },
      tiktok: { professional: -0.4, casual: 0.6, urgent: 0.1, humorous: 0.5, luxury: -0.5, empathetic: 0.1, authoritative: -0.3, playful: 0.7 },
      snapchat: { professional: -0.5, casual: 0.5, urgent: -0.1, humorous: 0.4, luxury: -0.4, empathetic: 0.0, authoritative: -0.4, playful: 0.6 },
    };

    return modifierMap[platform]?.[tone] ?? 0;
  }

  // ─── Text Analysis ─────────────────────────────────────────────────

  analyzeText(text: string): {
    wordCount: number;
    sentenceCount: number;
    syllableCount: number;
    avgWordsPerSentence: number;
    avgSyllablesPerWord: number;
    fleschKincaidGrade: number;
    fleschReadingEase: number;
    sentiment: "positive" | "negative" | "neutral";
    sentimentScore: number;
    emotionalTone: string;
    characterCount: number;
    readingTime: number;
  } {
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const wordCount = words.length;
    const sentenceCount = Math.max(1, sentences.length);
    const avgWordsPerSentence = wordCount / sentenceCount;

    const syllables = words.map((w) => this.countSyllables(w));
    const totalSyllables = syllables.reduce((a, b) => a + b, 0);
    const avgSyllablesPerWord = wordCount > 0 ? totalSyllables / wordCount : 0;

    const grade = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;
    const readingEase = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;

    const sentimentScore = this.computeSentiment(text);
    const sentiment = sentimentScore > 0.15 ? "positive" : sentimentScore < -0.15 ? "negative" : "neutral";

    const emotionalTone = this.detectEmotionalTone(text);

    return {
      wordCount,
      sentenceCount,
      syllableCount: totalSyllables,
      avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
      avgSyllablesPerWord: Math.round(avgSyllablesPerWord * 100) / 100,
      fleschKincaidGrade: Math.max(0, Math.round(grade * 10) / 10),
      fleschReadingEase: Math.max(0, Math.min(100, Math.round(readingEase * 10) / 10)),
      sentiment,
      sentimentScore: Math.round(sentimentScore * 100) / 100,
      emotionalTone,
      characterCount: text.length,
      readingTime: Math.ceil(wordCount / 200),
    };
  }

  private countSyllables(word: string): number {
    const w = word.toLowerCase().replace(/[^a-z]/g, "");
    if (w.length <= 3) return 1;
    const vowels = w.match(/[aeiouy]+/gi);
    if (!vowels) return 1;
    let count = vowels.length;
    if (w.endsWith("e")) count--;
    if (w.endsWith("le") && w.length > 2) count++;
    if (w.endsWith("es") || w.endsWith("ed")) count = Math.max(1, count - 1);
    return Math.max(1, count);
  }

  private computeSentiment(text: string): number {
    const positive = [
      "amazing", "excellent", "great", "love", "perfect", "best", "awesome", "fantastic",
      "happy", "wonderful", "brilliant", "outstanding", "superb", "delighted", "thrilled",
      "impressive", "remarkable", "exceptional", "magnificent", "splendid", "marvelous",
      "terrific", "glorious", "joyful", "wonderful", "phenomenal", "incredible", "beautiful",
      "success", "profit", "growth", "benefit", "advantage", "improve", "boost", "win",
    ];
    const negative = [
      "terrible", "awful", "horrible", "bad", "worst", "hate", "poor", "ugly",
      "disgusting", "dreadful", "atrocious", "horrendous", "abysmal", "painful",
      "frustrating", "annoying", "disappointing", "mediocre", "inferior", "lousy",
      "appalling", "shameful", "miserable", "rotten", "nasty", "gross", "dismal",
      "failure", "loss", "decline", "problem", "risk", "danger", "threat", "crisis",
      "expensive", "costly", "waste", "broken", "damage",
    ];

    const words = text.toLowerCase().split(/\W+/);
    let score = 0;
    words.forEach((w) => {
      if (positive.includes(w)) score += 0.15;
      if (negative.includes(w)) score -= 0.2;
    });
    const intensifiers = ["very", "extremely", "incredibly", "absolutely", "totally", "really", "highly"];
    words.forEach((w, i) => {
      if (intensifiers.includes(w) && i + 1 < words.length) {
        if (positive.includes(words[i + 1])) score += 0.1;
        if (negative.includes(words[i + 1])) score -= 0.1;
      }
    });
    return Math.max(-1, Math.min(1, score));
  }

  private detectEmotionalTone(text: string): string {
    const lower = text.toLowerCase();
    const tones: [string, RegExp][] = [
      ["urgent", /\b(now|hurry|limited|last chance|act|immediate|urgent|deadline|expires)\b/],
      ["trustworthy", /\b(trust|guarantee|secure|proven|certified|reliable|safe|protected)\b/],
      ["excited", /\b(exciting|thrilling|amazing|incredible|phenomenal|fantastic)\b/],
      ["fearful", /\b(afraid|worried|concerned|risk|danger|threat|lose|miss out)\b/],
      ["curious", /\b(discover|learn|explore|find out|reveal|uncover|see how)\b/],
      ["confident", /\b(confident|sure|certain|guaranteed|definitely|absolutely)\b/],
      ["empathetic", /\b(understand|care|support|help|together|compassion|we know)\b/],
      ["authoritative", /\b(industry leader|expert|authority|trusted by|leading|#1|top rated)\b/],
    ];
    for (const [tone, pattern] of tones) {
      if (pattern.test(lower)) return tone;
    }
    return "neutral";
  }

  // ─── Thompson Sampling MAB ─────────────────────────────────────────

  private mabState: Map<string, { alpha: number; beta: number; impressions: number; conversions: number }> = new Map();

  mabGetOrCreateVariant(variantKey: string): { alpha: number; beta: number } {
    if (!this.mabState.has(variantKey)) {
      this.mabState.set(variantKey, { alpha: 1, beta: 1, impressions: 0, conversions: 0 });
    }
    const s = this.mabState.get(variantKey)!;
    return { alpha: s.alpha, beta: s.beta };
  }

  mabSelectVariant(variantKeys: string[]): { selectedKey: string; probabilities: Record<string, number> } {
    const samples: Record<string, number> = {};
    let maxSample = -Infinity;
    let selectedKey = variantKeys[0];

    for (const key of variantKeys) {
      const { alpha, beta } = this.mabGetOrCreateVariant(key);
      const sample = this.sampleBeta(alpha, beta);
      samples[key] = Math.round(sample * 10000) / 100;
      if (sample > maxSample) {
        maxSample = sample;
        selectedKey = key;
      }
    }

    const total = Object.values(samples).reduce((s, v) => s + v, 0);
    const probabilities: Record<string, number> = {};
    for (const [k, v] of Object.entries(samples)) {
      probabilities[k] = total > 0 ? Math.round((v / total) * 10000) / 100 : 0;
    }

    return { selectedKey, probabilities };
  }

  mabRecordResult(variantKey: string, converted: boolean): void {
    const state = this.mabGetOrCreateVariant(variantKey);
    this.mabState.set(variantKey, {
      alpha: state.alpha + (converted ? 1 : 0),
      beta: state.beta + (converted ? 0 : 1),
      impressions: this.mabState.get(variantKey)!.impressions + 1,
      conversions: this.mabState.get(variantKey)!.conversions + (converted ? 1 : 0),
    });
  }

  mabGetAllVariants(): { variantKey: string; alpha: number; beta: number; impressions: number; conversions: number; ctr: number; posteriorMean: number }[] {
    const results: any[] = [];
    for (const [key, state] of this.mabState.entries()) {
      results.push({
        variantKey: key,
        alpha: state.alpha,
        beta: state.beta,
        impressions: state.impressions,
        conversions: state.conversions,
        ctr: state.impressions > 0 ? Math.round((state.conversions / state.impressions) * 10000) / 100 : 0,
        posteriorMean: Math.round((state.alpha / (state.alpha + state.beta)) * 10000) / 100,
      });
    }
    return results.sort((a, b) => b.posteriorMean - a.posteriorMean);
  }

  private sampleBeta(alpha: number, beta: number): number {
    const alphaSample = this.sampleGamma(alpha);
    const betaSample = this.sampleGamma(beta);
    return alphaSample / (alphaSample + betaSample);
  }

  private sampleGamma(shape: number): number {
    if (shape < 1) {
      const u = Math.random();
      return this.sampleGamma(1 + shape) * Math.pow(u, 1 / shape);
    }
    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    while (true) {
      let x: number;
      let v: number;
      do {
        x = this.sampleNormal();
        v = 1 + c * x;
      } while (v <= 0);
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

  // ─── Creative Fatigue Detection ─────────────────────────────────────

  detectFatigue(
    creativeHistory: { day: number; impressions: number; clicks: number; conversions: number }[],
  ): {
    fatigueScore: number;
    saturationPoint: number;
    decayRate: number;
    recommendedRefresh: boolean;
    expectedLift: number;
    stage: "growth" | "maturity" | "decline" | "exhausted";
    dailyDecay: { day: number; predictedCTR: number; actualCTR: number }[];
  } {
    if (creativeHistory.length < 3) {
      return {
        fatigueScore: 0, saturationPoint: 0, decayRate: 0,
        recommendedRefresh: false, expectedLift: 0, stage: "growth",
        dailyDecay: creativeHistory.map((d) => ({ day: d.day, predictedCTR: d.clicks / Math.max(1, d.impressions), actualCTR: d.clicks / Math.max(1, d.impressions) })),
      };
    }

    const ctrs = creativeHistory.map((d) => d.clicks / Math.max(1, d.impressions));
    const n = ctrs.length;
    const xMean = (n - 1) / 2;
    const yMean = ctrs.reduce((s, v) => s + v, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += (i - xMean) * (ctrs[i] - yMean);
      den += (i - xMean) ** 2;
    }
    const decayRate = den > 0 ? num / den : 0;

    const totalImpressions = creativeHistory.reduce((s, d) => s + d.impressions, 0);
    const initialCTR = ctrs[0];
    const currentCTR = ctrs[n - 1];
    const ctrDrop = initialCTR > 0 ? (initialCTR - currentCTR) / initialCTR : 0;
    const saturationPoint = Math.round(totalImpressions * ctrDrop * 100) / 100;

    const fatigueScore = Math.round(Math.min(100, Math.max(0, ctrDrop * 100 + (decayRate < 0 ? Math.abs(decayRate) * 50 : 0))) * 100) / 100;

    let stage: "growth" | "maturity" | "decline" | "exhausted";
    if (fatigueScore < 15) stage = "growth";
    else if (fatigueScore < 40) stage = "maturity";
    else if (fatigueScore < 70) stage = "decline";
    else stage = "exhausted";

    const recommendedRefresh = fatigueScore > 40;
    const expectedLift = recommendedRefresh ? Math.round(Math.min(80, fatigueScore * 0.6 + 10) * 100) / 100 : 0;

    const dailyDecay = creativeHistory.map((d, i) => {
      const predictedCTR = Math.max(0, initialCTR + decayRate * i);
      return { day: d.day, predictedCTR: Math.round(predictedCTR * 10000) / 100, actualCTR: Math.round(ctrs[i] * 10000) / 100 };
    });

    return { fatigueScore, saturationPoint, decayRate: Math.round(decayRate * 10000) / 100, recommendedRefresh, expectedLift, stage, dailyDecay };
  }

  // ─── Bayesian A/B Test Simulator ────────────────────────────────────

  simulateABTest(
    variants: { name: string; baselineCtr: number; lift: number }[],
    visitorsPerDay: number,
    days: number,
  ): {
    winner: string;
    confidence: number;
    daysToSignificance: number;
    dailyResults: { day: number; variant: string; visitors: number; conversions: number; ctr: number; probabilityWinning: number }[];
    summary: { variant: string; totalVisitors: number; totalConversions: number; observedCtr: number; probabilityWinning: number }[];
  } {
    const dailyResults: any[] = [];
    const totals: Record<string, { visitors: number; conversions: number }> = {};
    const probWinning: Record<string, number[]> = {};

    for (const v of variants) {
      totals[v.name] = { visitors: 0, conversions: 0 };
      probWinning[v.name] = [];
    }

    for (let day = 0; day < days; day++) {
      for (const v of variants) {
        const visitors = Math.round(visitorsPerDay / variants.length * (0.8 + Math.random() * 0.4));
        const trueCtr = v.baselineCtr * (1 + v.lift / 100);
        const conversions = Math.round(this.binomialSample(visitors, trueCtr));
        totals[v.name].visitors += visitors;
        totals[v.name].conversions += conversions;
        const observedCtr = totals[v.name].visitors > 0
          ? totals[v.name].conversions / totals[v.name].visitors : 0;

        const prob = this.monteCarloWinProb(
          variants.map((vv) => ({
            name: vv.name,
            alpha: 1 + totals[vv.name].conversions,
            beta: 1 + totals[vv.name].visitors - totals[vv.name].conversions,
          })),
        );

        dailyResults.push({
          day: day + 1, variant: v.name, visitors, conversions,
          ctr: Math.round(observedCtr * 10000) / 100,
          probabilityWinning: Math.round((prob[v.name] || 0) * 10000) / 100,
        });
      }
    }

    const finalProbs = this.monteCarloWinProb(
      variants.map((v) => ({
        name: v.name,
        alpha: 1 + totals[v.name].conversions,
        beta: 1 + totals[v.name].visitors - totals[v.name].conversions,
      })),
    );

    let winner = variants[0].name;
    let maxProb = 0;
    for (const [name, prob] of Object.entries(finalProbs)) {
      if (prob > maxProb) { maxProb = prob; winner = name; }
    }

    let daysToSignificance = days;
    for (let d = 0; d < days; d++) {
      const dayProbs: Record<string, number[]> = {};
      for (const v of variants) dayProbs[v.name] = [];
      for (const r of dailyResults) {
        if (r.day <= d + 1) dayProbs[r.variant].push(r.probabilityWinning);
      }
      const lastProbs: Record<string, number> = {};
      for (const [name, vals] of Object.entries(dayProbs)) {
        lastProbs[name] = vals[vals.length - 1] || 0;
      }
      if ((lastProbs[winner] || 0) > 95) {
        daysToSignificance = d + 1;
        break;
      }
    }

    const summary = variants.map((v) => ({
      variant: v.name,
      totalVisitors: totals[v.name].visitors,
      totalConversions: totals[v.name].conversions,
      observedCtr: totals[v.name].visitors > 0
        ? Math.round((totals[v.name].conversions / totals[v.name].visitors) * 10000) / 100
        : 0,
      probabilityWinning: Math.round((finalProbs[v.name] || 0) * 10000) / 100,
    }));

    return { winner, confidence: Math.round(maxProb * 10000) / 100, daysToSignificance, dailyResults, summary };
  }

  private monteCarloWinProb(
    variants: { name: string; alpha: number; beta: number }[],
    samples: number = 50000,
  ): Record<string, number> {
    let wins: Record<string, number> = {};
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
    for (const [name, count] of Object.entries(wins)) {
      result[name] = (count / samples) * 100;
    }
    return result;
  }

  private binomialSample(n: number, p: number): number {
    let count = 0;
    for (let i = 0; i < n; i++) {
      if (Math.random() < p) count++;
    }
    return count;
  }

  // ─── Performance Prediction ─────────────────────────────────────────

  predictPerformance(input: {
    headline: string;
    body?: string;
    cta?: string;
    platform: Platform;
    tone: Tone;
  }): {
    estimatedCtr: number;
    estimatedCvr: number;
    qualityScore: number;
    engagementPotential: number;
    platformAlignment: number;
    readabilityScore: number;
    persuasionScore: number;
    suggestions: string[];
  } {
    const { headline, body, cta, platform, tone } = input;
    const fullText = [headline, body, cta].filter(Boolean).join(" ");
    const analysis = this.analyzeText(fullText);

    // Readability score: Flesch Reading Ease mapped 0-100
    const readabilityScore = analysis.fleschReadingEase;

    // Platform alignment: 0-100
    const constraints = platformConstraints[platform];
    let alignmentScore = 50;
    if (constraints) {
      if (headline.length <= constraints.maxHeadline) alignmentScore += 15;
      else alignmentScore -= 10;
      if (body && body.length <= constraints.maxBody) alignmentScore += 10;
      else if (body) alignmentScore -= 5;
      if (cta && cta.length <= constraints.maxCta) alignmentScore += 10;
      if (constraints.preferredTones.includes(tone)) alignmentScore += 15;
    }
    alignmentScore = Math.max(0, Math.min(100, alignmentScore));

    // Persuasion: emotion + urgency + CTA strength
    let persuasionScore = 40;
    const lower = fullText.toLowerCase();
    if (/\b(you|your)\b/.test(lower)) persuasionScore += 15;
    if (/\b(now|today|limited|exclusive)\b/.test(lower)) persuasionScore += 10;
    if (/\b(free|save|guaranteed|results)\b/.test(lower)) persuasionScore += 10;
    if (/\b(click|start|get|try|shop|sign)\b/.test(lower)) persuasionScore += 10;
    if (analysis.sentiment === "positive") persuasionScore += 8;
    if (analysis.avgWordsPerSentence < 12) persuasionScore += 7;
    persuasionScore = Math.min(100, persuasionScore);

    // Engagement potential
    const engagementPotential = Math.round((alignmentScore * 0.3 + persuasionScore * 0.3 + readabilityScore * 0.2 + (analysis.sentimentScore > 0 ? 50 : 20) * 0.2));

    // CTR estimation: based on features instead of random
    let baseCtr = 2.0;
    if (readabilityScore > 60) baseCtr += 0.5;
    if (readabilityScore > 80) baseCtr += 0.3;
    if (alignmentScore > 70) baseCtr += 0.8;
    if (persuasionScore > 70) baseCtr += 0.6;
    if (analysis.sentiment === "positive") baseCtr += 0.4;
    if (headline.length < 20) baseCtr += 0.3;
    if (analysis.avgWordsPerSentence < 10) baseCtr += 0.2;
    if (tone === "urgent") baseCtr += 0.5;
    if (tone === "casual" && (platform === "meta" || platform === "tiktok")) baseCtr += 0.4;

    const estimatedCtr = Math.round(baseCtr * 100) / 100;

    // CVR estimation
    let baseCvr = 1.5;
    if (persuasionScore > 70) baseCvr += 0.8;
    if (analysis.sentiment === "positive") baseCvr += 0.5;
    if (cta && cta.length >= 10 && cta.length <= 25) baseCvr += 0.5;
    if (body && body.length > 50) baseCvr += 0.3;
    if (platform === "google" && tone === "professional") baseCvr += 0.4;
    if (analysis.fleschKincaidGrade >= 6 && analysis.fleschKincaidGrade <= 10) baseCvr += 0.3;

    const estimatedCvr = Math.round(baseCvr * 100) / 100;

    // Quality score: composite 0-100
    const qualityScore = Math.round(alignmentScore * 0.25 + readabilityScore * 0.2 + persuasionScore * 0.25 + (estimatedCtr / 5 * 100) * 0.15 + (estimatedCvr / 4 * 100) * 0.15);

    // Suggestions
    const suggestions: string[] = [];
    if (headline.length > 40) suggestions.push("Headline may be too long for most platforms. Consider shortening to under 40 characters.");
    if (body && body.length > 150) suggestions.push("Body copy exceeds 150 characters. Some platforms may truncate.");
    if (analysis.fleschKincaidGrade > 12) suggestions.push("Reading level is advanced (grade ${analysis.fleschKincaidGrade}). Consider simplifying language for wider appeal.");
    if (analysis.fleschReadingEase < 40) suggestions.push("Text is difficult to read. Use shorter sentences and simpler words.");
    if (analysis.sentiment === "negative") suggestions.push("Sentiment is negative. Consider more positive framing to improve engagement.");
    if (!/\b(you|your)\b/.test(lower)) suggestions.push("Add personal pronouns ('you'/'your') to increase relatability.");
    if (!cta || cta.length < 5) suggestions.push("CTA is too short. Use actionable language (e.g., 'Get Started', 'Learn More').");
    if (analysis.avgWordsPerSentence > 20) suggestions.push("Sentences are very long (${analysis.avgWordsPerSentence} words avg). Break into shorter sentences.");
    if (!/\b(now|today)\b/.test(lower) && persuasionScore < 50) suggestions.push("Add urgency words ('now', 'today') to increase conversion rates.");
    if (alignmentScore < 40) suggestions.push("Text doesn't align well with platform constraints. Consider a different tone or shorter copy for ${platform}.");

    return {
      estimatedCtr,
      estimatedCvr,
      qualityScore,
      engagementPotential,
      platformAlignment: alignmentScore,
      readabilityScore: Math.round(readabilityScore),
      persuasionScore,
      suggestions,
    };
  }

  /**
   * Predict performance for multiple variant combinations and return the best.
   */
  optimizeVariant(input: {
    productDescription: string;
    targetAudience: string;
    platform: Platform;
    tone?: Tone;
  }): {
    bestVariant: GeneratedVariant;
    performance: ReturnType<CreativeAIService["predictPerformance"]>;
    alternatives: { variant: GeneratedVariant; score: number }[];
  } {
    const tonesToTry = input.tone ? [input.tone] : ALL_TONES;
    const alternatives: { variant: GeneratedVariant; score: number }[] = [];

    for (const t of tonesToTry) {
      const variants = this.generateVariants({ productDescription: input.productDescription, targetAudience: input.targetAudience, tone: t, platform: input.platform, count: 1 });
      for (const v of variants) {
        const perf = this.predictPerformance({ headline: v.headline, body: v.body, cta: v.cta, platform: input.platform, tone: t });
        const score = perf.qualityScore * 0.5 + perf.estimatedCtr * 10 + perf.estimatedCvr * 10 + perf.platformAlignment * 0.2;
        alternatives.push({ variant: v, score: Math.round(score) });
      }
    }

    alternatives.sort((a, b) => b.score - a.score);
    const best = alternatives[0];
    return {
      bestVariant: best.variant,
      performance: this.predictPerformance({
        headline: best.variant.headline,
        body: best.variant.body,
        cta: best.variant.cta,
        platform: input.platform,
        tone: best.variant.tone as Tone,
      }),
      alternatives: alternatives.slice(0, 5),
    };
  }
}

export const creativeAI = new CreativeAIService();
