import { DataStore } from "./DataStore";

interface LandingPageTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail: string;
  sections: { type: string; label: string; defaultContent: Record<string, any> }[];
}

interface LandingPage {
  id: string;
  tenantId: string;
  campaignId?: string;
  name: string;
  slug: string;
  template: string;
  sections: { type: string; content: Record<string, any>; order: number }[];
  seo: { title: string; description: string; keywords: string[]; ogImage?: string };
  styles: { primaryColor: string; fontFamily: string; borderRadius: string };
  status: "draft" | "published" | "archived";
  publishedUrl?: string;
  metrics?: { views: number; clicks: number; conversions: number; conversionRate: number };
  createdAt: string;
  updatedAt: string;
}

export class LandingPageBuilderService {
  getTemplates(): LandingPageTemplate[] {
    return [
      { id: "tpl_lead_gen", name: "Lead Generation", description: "Optimized for capturing leads with form", category: "conversion", thumbnail: "lead_gen", sections: [
        { type: "hero", label: "Hero Section", defaultContent: { headline: "Headline", subheadline: "Subheadline", cta: "Get Started", bgColor: "#1e1b4b" } },
        { type: "features", label: "Features", defaultContent: { items: [{ title: "Feature 1", description: "Description" }, { title: "Feature 2", description: "Description" }] } },
        { type: "form", label: "Contact Form", defaultContent: { fields: ["name", "email", "company"], buttonText: "Submit" } },
        { type: "testimonials", label: "Testimonials", defaultContent: { items: [{ quote: "Great product!", author: "John D." }] } },
        { type: "footer", label: "Footer", defaultContent: { copyright: "2024 Company", links: [] } },
      ]},
      { id: "tpl_webinar", name: "Webinar Registration", description: "Drive webinar signups", category: "event", thumbnail: "webinar", sections: [
        { type: "hero", label: "Hero", defaultContent: { headline: "Webinar Title", subheadline: "Date & Time", cta: "Register Now", bgColor: "#0f172a" } },
        { type: "agenda", label: "Agenda", defaultContent: { items: [{ time: "10:00", topic: "Introduction" }] } },
        { type: "speakers", label: "Speakers", defaultContent: { items: [{ name: "Speaker Name", title: "Title", bio: "Bio" }] } },
        { type: "form", label: "Registration Form", defaultContent: { fields: ["name", "email"], buttonText: "Register" } },
      ]},
      { id: "tpl_product_launch", name: "Product Launch", description: "Showcase a new product or feature", category: "brand", thumbnail: "product", sections: [
        { type: "hero", label: "Hero", defaultContent: { headline: "Introducing Product", subheadline: "Tagline", cta: "Learn More", bgColor: "#020617" } },
        { type: "features", label: "Features", defaultContent: { items: [{ title: "Feature", description: "Description", icon: "star" }] } },
        { type: "pricing", label: "Pricing", defaultContent: { plans: [{ name: "Basic", price: "$19", features: ["Feature A", "Feature B"] }] } },
        { type: "cta", label: "Call to Action", defaultContent: { headline: "Ready to Start?", cta: "Get Started Now" } },
      ]},
      { id: "tpl_sales", name: "Sales Page", description: "High-converting sales page", category: "conversion", thumbnail: "sales", sections: [
        { type: "hero", label: "Hero", defaultContent: { headline: "Headline", subheadline: "Subheadline", cta: "Buy Now", bgColor: "#111827" } },
        { type: "pain_points", label: "Pain Points", defaultContent: { items: [{ problem: "Problem", solution: "Solution" }] } },
        { type: "features", label: "Benefits", defaultContent: { items: [{ title: "Benefit", description: "Description" }] } },
        { type: "testimonials", label: "Social Proof", defaultContent: { items: [{ quote: "Quote", author: "Customer", role: "Role" }] } },
        { type: "pricing", label: "Pricing", defaultContent: { plans: [{ name: "Plan", price: "$49", features: ["A", "B", "C"] }] } },
        { type: "cta", label: "Final CTA", defaultContent: { headline: "Don't Wait!", cta: "Get It Now" } },
      ]},
      { id: "tpl_thank_you", name: "Thank You Page", description: "Post-conversion thank you page", category: "utility", thumbnail: "thankyou", sections: [
        { type: "hero", label: "Hero", defaultContent: { headline: "Thank You!", subheadline: "What happens next", cta: "Go to Dashboard", bgColor: "#065f46" } },
        { type: "next_steps", label: "Next Steps", defaultContent: { items: [{ step: "Step 1", description: "Description" }] } },
      ]},
    ];
  }

  createPage(tenantId: string, data: { name: string; slug: string; template: string; campaignId?: string }): LandingPage {
    const mem = DataStore["mem"]();
    const tpl = this.getTemplates().find(t => t.id === data.template);
    const page: LandingPage = {
      id: `lp_${Date.now()}`,
      tenantId,
      campaignId: data.campaignId,
      name: data.name,
      slug: data.slug || data.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      template: data.template,
      sections: (tpl?.sections || []).map((s, i) => ({ type: s.type, content: { ...s.defaultContent }, order: i })),
      seo: { title: data.name, description: "", keywords: [], ogImage: "" },
      styles: { primaryColor: "#4f46e5", fontFamily: "Inter", borderRadius: "8px" },
      status: "draft",
      metrics: { views: 0, clicks: 0, conversions: 0, conversionRate: 0 },
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    mem.insert("landing_pages_built", page);
    return page;
  }

  getPages(tenantId: string): LandingPage[] {
    return DataStore["mem"]().find("landing_pages_built", (p: any) => p.tenantId === tenantId);
  }

  getPage(tenantId: string, id: string): LandingPage | undefined {
    return DataStore["mem"]().findOne("landing_pages_built", (p: any) => p.tenantId === tenantId && p.id === id);
  }

  updatePage(tenantId: string, id: string, data: Partial<LandingPage>): LandingPage | null {
    const mem = DataStore["mem"]();
    const existing = mem.findOne("landing_pages_built", (p: any) => p.tenantId === tenantId && p.id === id);
    if (!existing) return null;
    const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
    mem.update("landing_pages_built", (p: any) => p.id === id, updated);
    return updated;
  }

  publishPage(tenantId: string, id: string): LandingPage | null {
    const mem = DataStore["mem"]();
    const page = mem.findOne("landing_pages_built", (p: any) => p.tenantId === tenantId && p.id === id) as LandingPage | undefined;
    if (!page) return null;
    const slug = page.slug || page.name.toLowerCase().replace(/\s+/g, "-");
    const publishedUrl = `https://pages.n0va.ai/${tenantId}/${slug}`;
    const updated = { ...page, status: "published" as const, publishedUrl, updatedAt: new Date().toISOString() };
    mem.update("landing_pages_built", (p: any) => p.id === id, updated);
    return updated;
  }

  deletePage(tenantId: string, id: string): boolean {
    return DataStore["mem"]().delete("landing_pages_built", (p: any) => p.tenantId === tenantId && p.id === id);
  }

  // ─── Conversion Prediction ───────────────────────────────────────────

  /**
   * Predict conversion rate for a landing page based on its structural
   * characteristics: section types, SEO quality, form complexity, etc.
   */
  predictConversion(page: Partial<LandingPage>): {
    predictedCvr: number; confidence: number; factors: { name: string; score: number; impact: number }[];
    optimizationTips: string[];
  } {
    const factors: { name: string; score: number; impact: number }[] = [];
    let logit = -1.5; // base log-odds
    const tips: string[] = [];

    // Factor 1: Hero section presence and quality
    const heroSection = (page.sections || []).find((s) => s.type === "hero");
    if (heroSection) {
      const headlineLen = String(heroSection.content?.headline || "").length;
      const hasCta = !!(heroSection.content?.cta);
      const heroScore = (headlineLen >= 10 && headlineLen <= 60 ? 0.5 : 0) + (hasCta ? 0.5 : -0.3);
      factors.push({ name: "Hero Section Quality", score: Math.round(heroScore * 100) / 100, impact: 0.25 });
      logit += heroScore * 0.4;
      if (!hasCta) tips.push("Add a clear call-to-action button in the hero section.");
      if (headlineLen < 10) tips.push("Hero headline is too short — aim for 10-60 characters for impact.");
      if (headlineLen > 60) tips.push("Hero headline is too long — keep under 60 characters.");
    } else {
      factors.push({ name: "Hero Section", score: 0, impact: 0.25 });
      logit -= 0.5;
      tips.push("Add a hero section with headline and CTA to improve conversion rates.");
    }

    // Factor 2: Form fields count (fewer = better for conversion)
    const formSection = (page.sections || []).find((s) => s.type === "form");
    if (formSection) {
      const fields = (formSection.content?.fields || []).length;
      const formScore = fields <= 3 ? 0.8 : fields <= 5 ? 0.4 : 0;
      factors.push({ name: "Form Simplicity", score: formScore, impact: 0.2 });
      logit += formScore * 0.35;
      if (fields > 5) tips.push(`Form has ${fields} fields — reducing to 3-5 fields can increase conversions by 20-30%.`);
    } else {
      factors.push({ name: "Form", score: 0, impact: 0.2 });
    }

    // Factor 3: Social proof (testimonials)
    const testimonialSection = (page.sections || []).find((s) => s.type === "testimonials");
    if (testimonialSection) {
      const items = (testimonialSection.content?.items || []).length;
      const proofScore = Math.min(1, items / 3);
      factors.push({ name: "Social Proof", score: proofScore, impact: 0.15 });
      logit += proofScore * 0.3;
      if (items === 0) tips.push("Add customer testimonials or case studies to build trust.");
    } else {
      factors.push({ name: "Social Proof", score: 0, impact: 0.15 });
      tips.push("Include a testimonials section with real customer quotes.");
    }

    // Factor 4: SEO quality
    const seoTitleLen = (page.seo?.title || "").length;
    const seoDescLen = (page.seo?.description || "").length;
    const seoScore = (seoTitleLen >= 30 && seoTitleLen <= 60 ? 0.4 : 0) + (seoDescLen >= 50 && seoDescLen <= 160 ? 0.3 : 0) + ((page.seo?.keywords || []).length >= 3 ? 0.3 : 0);
    factors.push({ name: "SEO Quality", score: Math.round(seoScore * 100) / 100, impact: 0.15 });
    logit += seoScore * 0.25;
    if (seoTitleLen < 30 || seoTitleLen > 60) tips.push("SEO title should be 30-60 characters for optimal search display.");
    if (seoDescLen < 50 || seoDescLen > 160) tips.push("Meta description should be 50-160 characters.");

    // Factor 5: Page structure (number of sections)
    const sectionCount = (page.sections || []).length;
    const structureScore = sectionCount >= 3 && sectionCount <= 7 ? 0.7 : sectionCount > 7 ? 0.3 : 0.2;
    factors.push({ name: "Page Structure", score: structureScore, impact: 0.1 });
    logit += structureScore * 0.15;

    // Factor 6: CTA sections
    const ctaSections = (page.sections || []).filter((s) => s.type === "cta").length;
    const ctaScore = Math.min(1, ctaSections / 2);
    factors.push({ name: "CTA Presence", score: ctaScore, impact: 0.15 });
    logit += ctaScore * 0.2;
    if (ctaSections === 0) tips.push("Add at least one dedicated CTA section to drive conversions.");

    const probability = 1 / (1 + Math.exp(-logit));
    const predictedCvr = Math.round(probability * 10000) / 100;
    const confidence = Math.min(0.9, 0.4 + sectionCount * 0.05);

    return {
      predictedCvr,
      confidence: Math.round(confidence * 100) / 100,
      factors,
      optimizationTips: tips,
    };
  }

  // ─── SEO Scoring ─────────────────────────────────────────────────────

  /**
   * Score a landing page for SEO readiness across multiple dimensions.
   */
  seoScore(page: Partial<LandingPage>): {
    overallScore: number; dimensions: { name: string; score: number; weight: number; details: string }[];
    actionableItems: string[];
  } {
    const dimensions: { name: string; score: number; weight: number; details: string }[] = [];
    const items: string[] = [];

    // Title
    const titleLen = (page.seo?.title || "").length;
    let titleScore = 0;
    if (titleLen >= 30 && titleLen <= 60) { titleScore = 1; items.push("SEO title length is optimal."); }
    else if (titleLen > 0) { titleScore = 0.5; items.push(`SEO title is ${titleLen} chars — optimal is 30-60.`); }
    else { titleScore = 0; items.push("Missing SEO title."); }
    dimensions.push({ name: "Title Tag", score: titleScore, weight: 0.25, details: `${titleLen} characters` });

    // Meta description
    const descLen = (page.seo?.description || "").length;
    let descScore = 0;
    if (descLen >= 50 && descLen <= 160) { descScore = 1; items.push("Meta description length is optimal."); }
    else if (descLen > 0) { descScore = 0.4; items.push(`Meta description is ${descLen} chars — optimal is 50-160.`); }
    else { descScore = 0; items.push("Missing meta description."); }
    dimensions.push({ name: "Meta Description", score: descScore, weight: 0.2, details: `${descLen} characters` });

    // Keywords
    const kwCount = (page.seo?.keywords || []).length;
    let kwScore = 0;
    if (kwCount >= 5) { kwScore = 1; items.push("Good keyword coverage."); }
    else if (kwCount >= 3) { kwScore = 0.7; items.push(`${kwCount} keywords — add 2-3 more for better coverage.`); }
    else if (kwCount > 0) { kwScore = 0.3; items.push(`Only ${kwCount} keywords — target at least 3-5.`); }
    else { kwScore = 0; items.push("No keywords defined."); }
    dimensions.push({ name: "Keywords", score: kwScore, weight: 0.15, details: `${kwCount} keywords` });

    // Content length (estimated from sections)
    const contentText = (page.sections || []).map((s) => JSON.stringify(s.content)).join(" ");
    const wordCount = contentText.split(/\s+/).length;
    let contentScore = 0;
    if (wordCount >= 500) { contentScore = 1; items.push("Good content depth for SEO."); }
    else if (wordCount >= 200) { contentScore = 0.6; items.push(`${wordCount} words — aim for 500+ for better rankings.`); }
    else { contentScore = 0.2; items.push(`Only ${wordCount} words — thin content hurts SEO.`); }
    dimensions.push({ name: "Content Depth", score: contentScore, weight: 0.2, details: `~${wordCount} words` });

    // URL slug quality
    const slug = page.slug || "";
    const slugWords = slug.split("-").length;
    let slugScore = 0;
    if (slugWords >= 2 && slugWords <= 5 && !/[^a-z0-9-]/.test(slug)) { slugScore = 1; items.push("URL slug is clean and descriptive."); }
    else if (slug.length > 0) { slugScore = 0.5; items.push(`Slug "${slug}" could be more descriptive (2-5 hyphenated words).`); }
    else { slugScore = 0; items.push("Missing URL slug."); }
    dimensions.push({ name: "URL Structure", score: slugScore, weight: 0.1, details: slug || "N/A" });

    // OG image
    const hasOgImage = !!(page.seo?.ogImage);
    dimensions.push({ name: "Open Graph", score: hasOgImage ? 1 : 0, weight: 0.1, details: hasOgImage ? "Present" : "Missing" });
    if (!hasOgImage) items.push("Add an Open Graph image for better social sharing.");

    const overallScore = Math.round(dimensions.reduce((s, d) => s + d.score * d.weight, 0) * 100);

    return {
      overallScore,
      dimensions,
      actionableItems: items,
    };
  }

  // ─── Element Optimization Scoring ────────────────────────────────────

  /**
   * Score individual page elements and suggest improvements.
   */
  optimizeElements(page: LandingPage): {
    elements: { section: string; element: string; score: number; suggestion: string }[];
    overallOptimizationScore: number;
    priorityActions: string[];
  } {
    const elements: { section: string; element: string; score: number; suggestion: string }[] = [];
    const actions: string[] = [];

    for (const section of page.sections) {
      const content = section.content;

      // CTA button text
      const cta = content.cta || content.buttonText;
      if (cta) {
        const ctaLen = String(cta).length;
        const score = ctaLen >= 2 && ctaLen <= 30 ? 0.9 : ctaLen > 30 ? 0.4 : 0.2;
        elements.push({ section: section.type, element: "CTA Text", score: Math.round(score * 100), suggestion: ctaLen > 30 ? "Shorten CTA text to under 30 characters." : ctaLen < 2 ? "Write a compelling CTA (e.g., 'Get Started')." : "Good CTA length and clarity." });
        if (ctaLen > 30) actions.push(`Shorten "${section.type}" CTA from ${ctaLen} to under 30 characters.`);
      }

      // Headline
      const headline = content.headline;
      if (headline) {
        const hLen = String(headline).length;
        const hasNumbers = /\d/.test(String(headline));
        const hasPowerWords = /free|new|now|get|best|top|easy|fast|limited|exclusive/i.test(String(headline));
        let score = hLen >= 10 && hLen <= 60 ? 0.6 : 0.3;
        if (hasNumbers) score += 0.2;
        if (hasPowerWords) score += 0.2;
        elements.push({ section: section.type, element: "Headline", score: Math.round(score * 100), suggestion: !hasNumbers ? "Add numbers to headlines for 36% more engagement." : !hasPowerWords ? "Use power words (free, new, now) to increase impact." : "Effective headline structure." });
        if (!hasNumbers) actions.push(`Add numbers to "${section.type}" headline for better engagement.`);
      }

      // Form fields
      const fields = content.fields;
      if (Array.isArray(fields)) {
        const fCount = fields.length;
        const score = fCount <= 3 ? 90 : fCount <= 5 ? 60 : 30;
        elements.push({ section: section.type, element: "Form Fields", score, suggestion: fCount > 5 ? `Reduce from ${fCount} to 3-5 fields to increase form completion rates.` : fCount <= 3 ? "Optimal form length." : "Consider reducing to 3 fields for higher conversion." });
        if (fCount > 5) actions.push(`Reduce ${section.type} form from ${fCount} to 3-5 fields.`);
      }

      // Testimonial count
      const testimonials = content.items;
      if (Array.isArray(testimonials) && section.type === "testimonials") {
        const score = testimonials.length >= 3 ? 90 : testimonials.length >= 1 ? 50 : 0;
        elements.push({ section: section.type, element: "Testimonial Count", score, suggestion: testimonials.length < 3 ? `Add ${3 - testimonials.length} more testimonials for stronger social proof.` : "Good volume of social proof." });
        if (testimonials.length < 3) actions.push(`Collect ${3 - testimonials.length} more customer testimonials for "${section.type}" section.`);
      }
    }

    const overallOptimizationScore = elements.length > 0
      ? Math.round(elements.reduce((s, e) => s + e.score, 0) / elements.length)
      : 0;

    return {
      elements,
      overallOptimizationScore,
      priorityActions: actions.slice(0, 5),
    };
  }

  // ─── A/B Test Variant Recommendation ────────────────────────────────

  /**
   * Generate A/B test variants for a landing page by varying
   * high-impact elements.
   */
  suggestVariants(page: LandingPage): {
    variants: { name: string; changes: { section: string; field: string; from: string; to: string }[]; predictedLift: number }[];
  } {
    const variants: { name: string; changes: { section: string; field: string; from: string; to: string }[]; predictedLift: number }[] = [];
    const ctaSection = page.sections.find((s) => s.content?.cta || s.content?.buttonText);
    const heroSection = page.sections.find((s) => s.type === "hero");

    // Variant 1: CTA color change (simulated)
    if (ctaSection) {
      variants.push({
        name: "CTA Color/Text Variant",
        changes: [{ section: ctaSection.type, field: "cta", from: ctaSection.content?.cta || "Submit", to: "Get Started Free →" }],
        predictedLift: 15,
      });
    }

    // Variant 2: Headline rewrite
    if (heroSection?.content?.headline) {
      variants.push({
        name: "Headline Variant",
        changes: [{ section: "hero", field: "headline", from: heroSection.content.headline, to: `${heroSection.content.headline} — [Benefit-Driven Twist]` }],
        predictedLift: 12,
      });
    }

    // Variant 3: Form field reduction
    const formSection = page.sections.find((s) => s.type === "form");
    if (formSection && Array.isArray(formSection.content?.fields) && formSection.content.fields.length > 3) {
      const reduced = formSection.content.fields.slice(0, 3);
      variants.push({
        name: "Simplified Form Variant",
        changes: [{ section: "form", field: "fields", from: formSection.content.fields.join(", "), to: reduced.join(", ") }],
        predictedLift: 25,
      });
    }

    // Variant 4: Social proof positioning
    const testimonialSection = page.sections.find((s) => s.type === "testimonials");
    if (testimonialSection && heroSection) {
      variants.push({
        name: "Social Proof Above Fold",
        changes: [{ section: "layout", field: "order", from: "hero → features → testimonials", to: "hero → testimonials → features" }],
        predictedLift: 10,
      });
    }

    return { variants };
  }

  // ─── Page Performance Projection ─────────────────────────────────────

  /**
   * Project landing page performance based on current SEO score and conversion prediction.
   */
  projectPerformance(page: LandingPage): {
    current: { views: number; conversions: number; cvr: number };
    projected30Days: { views: number; conversions: number; cvr: number };
    projectionBasis: string;
  } {
    const cvrPrediction = this.predictConversion(page);
    const seoScore = this.seoScore(page);
    const currentMetrics = page.metrics || { views: 0, clicks: 0, conversions: 0, conversionRate: 0 };

    // Estimate daily organic views based on SEO score
    const baseDailyViews = currentMetrics.views > 0 ? currentMetrics.views / 30 : 50;
    const seoMultiplier = 0.5 + (seoScore.overallScore / 100) * 1.5;
    const projectedDailyViews = baseDailyViews * seoMultiplier;

    const projectedViews30 = Math.round(projectedDailyViews * 30);
    const projectedCvr = cvrPrediction.predictedCvr / 100;
    const projectedConversions30 = Math.round(projectedViews30 * projectedCvr);

    return {
      current: {
        views: currentMetrics.views || 0,
        conversions: currentMetrics.conversions || 0,
        cvr: currentMetrics.conversionRate || 0,
      },
      projected30Days: {
        views: projectedViews30,
        conversions: projectedConversions30,
        cvr: Math.round(projectedCvr * 10000) / 100,
      },
      projectionBasis: `Based on SEO score (${seoScore.overallScore}/100) and predicted CVR (${cvrPrediction.predictedCvr}%)`,
    };
  }
}

export const landingPageBuilderService = new LandingPageBuilderService();
