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
}

export const creativeAI = new CreativeAIService();
