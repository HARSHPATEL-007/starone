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
}

export const landingPageBuilderService = new LandingPageBuilderService();
