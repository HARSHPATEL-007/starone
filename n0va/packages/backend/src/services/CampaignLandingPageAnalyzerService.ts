import { autonomousCampaignManager } from "./AutonomousCampaignManagerService";

interface LandingPage {
  url: string;
  name: string;
  visitors: number;
  conversions: number;
  bounceRate: number;
  avgTimeOnPage: number;
  loadSpeed: number;
  conversionRate: number;
  revenue: number;
  roas: number;
  score: number;
  issues: string[];
}

interface LandingPageAnalysis {
  tenantId: string;
  campaignId: string;
  campaignName: string;
  pages: LandingPage[];
  totalVisitors: number;
  totalConversions: number;
  totalRevenue: number;
  averageConversionRate: number;
  averageBounceRate: number;
  averageLoadSpeed: number;
  averageScore: number;
  topPages: LandingPage[];
  underperformers: LandingPage[];
  criticalIssues: { page: string; issue: string; impact: string; priority: string }[];
}

interface PageSpeedImpact {
  pageUrl: string;
  pageName: string;
  currentSpeed: number;
  targetSpeed: number;
  speedDelta: number;
  estimatedConversionLift: number;
  estimatedRevenueImpact: number;
  recommendation: string;
}

interface ContentGap {
  element: string;
  currentState: string;
  bestPractice: string;
  impact: string;
  priority: "high" | "medium" | "low";
}

interface PageSegmentation {
  segmentName: string;
  visitors: number;
  conversions: number;
  conversionRate: number;
  avgTimeOnPage: number;
  bounceRate: number;
  topPage: string;
}

interface LayoutRecommendation {
  section: string;
  currentLayout: string;
  suggestedLayout: string;
  rationale: string;
  expectedLift: string;
}

interface LandingPageTrend {
  date: string;
  visitors: number;
  conversions: number;
  conversionRate: number;
  avgLoadSpeed: number;
  avgScore: number;
}

const PAGE_POOL = [
  { name: "Homepage", url: "/" },
  { name: "Product Overview", url: "/products" },
  { name: "Pricing Page", url: "/pricing" },
  { name: "Free Trial", url: "/trial" },
  { name: "Demo Request", url: "/demo" },
  { name: "Blog - Top Post", url: "/blog/top-post" },
  { name: "Case Study", url: "/case-study" },
  { name: "About Us", url: "/about" },
  { name: "Contact", url: "/contact" },
  { name: "Features", url: "/features" },
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

const ISSUES_POOL = [
  "Above-fold content too heavy — estimated load impact +1.2s",
  "Missing meta description — affects CTR from search results",
  "No clear CTA above the fold — users may not know next step",
  "Images not optimized — total page size exceeds 3MB",
  "No mobile responsive breakpoint at 768px",
  "Font loading causes layout shift (CLS > 0.25)",
  "No social proof elements (testimonials, reviews, logos)",
  "Form has too many fields (7+) — reduces conversion by 30%",
  "No trust signals (SSL badge, guarantees, awards)",
  "Header contains low-value navigation links that distract from CTA",
];

export class CampaignLandingPageAnalyzerService {
  analyzeLandingPages(campaignId: string, tenantId: string): LandingPageAnalysis {
    const seed = hashStr(campaignId + tenantId);
    const portfolio = autonomousCampaignManager.analyzePortfolio(tenantId);
    const campaign = portfolio.analyses.find((a: any) => a.campaignId === campaignId);
    const campaignName = campaign?.campaignName || `Campaign ${campaignId.slice(0, 8)}`;
    const numPages = 4 + (seed % 5);

    const pages: LandingPage[] = [];
    const used = new Set<number>();
    for (let i = 0; i < numPages; i++) {
      let idx = (seed + i * 13) % PAGE_POOL.length;
      while (used.has(idx)) idx = (idx + 1) % PAGE_POOL.length;
      used.add(idx);
      const pSeed = seed + i * 23;
      const p = PAGE_POOL[idx];
      const visitors = 500 + (pSeed % 4500);
      const speed = 1.2 + ((pSeed * 7) % 50) / 10;
      const bounce = 30 + ((pSeed * 11) % 50);
      const avgTime = 30 + ((pSeed * 13) % 150);
      const convRate = 1.5 + ((pSeed * 17) % 85) / 10;
      const convs = Math.round(visitors * convRate / 100);
      const rev = Math.round(convs * (15 + (pSeed % 135)));
      const score = Math.max(1, Math.min(100, 85 - Math.round(speed * 5) + Math.round(convRate * 2) - ((pSeed * 19) % 20)));
      const numIssues = 1 + (pSeed % 4);
      const issues: string[] = [];
      const usedIssues = new Set<number>();
      for (let j = 0; j < numIssues; j++) {
        const iIdx = (pSeed + j * 29) % ISSUES_POOL.length;
        if (!usedIssues.has(iIdx)) { usedIssues.add(iIdx); issues.push(ISSUES_POOL[iIdx]); }
      }

      pages.push({
        url: p.url, name: p.name, visitors, conversions: convs, bounceRate: Math.round(bounce * 100) / 100,
        avgTimeOnPage: Math.round(avgTime * 100) / 100, loadSpeed: Math.round(speed * 100) / 100,
        conversionRate: Math.round(convRate * 100) / 100, revenue: rev,
        roas: Math.round(rev / Math.max(visitors * 0.1, 1) * 100) / 100,
        score: Math.round(score * 100) / 100, issues,
      });
    }

    const sorted = [...pages].sort((a, b) => b.score - a.score);
    const criticalIssues = pages.flatMap(p =>
      p.issues.slice(0, 2).map(issue => ({
        page: p.name, issue,
        impact: issue.includes("load") ? "High — affects user experience and bounce rate" :
                issue.includes("CTA") ? "High — directly impacts conversion rate" :
                issue.includes("mobile") ? "Medium — affects mobile traffic (50%+ of visitors)" :
                "Medium — incremental improvement opportunity",
        priority: issue.includes("load") || issue.includes("CTA") ? "high" : "medium",
      }))
    );

    return {
      tenantId, campaignId, campaignName, pages,
      totalVisitors: pages.reduce((s, p) => s + p.visitors, 0),
      totalConversions: pages.reduce((s, p) => s + p.conversions, 0),
      totalRevenue: pages.reduce((s, p) => s + p.revenue, 0),
      averageConversionRate: Math.round(pages.reduce((s, p) => s + p.conversionRate, 0) / pages.length * 100) / 100,
      averageBounceRate: Math.round(pages.reduce((s, p) => s + p.bounceRate, 0) / pages.length * 100) / 100,
      averageLoadSpeed: Math.round(pages.reduce((s, p) => s + p.loadSpeed, 0) / pages.length * 100) / 100,
      averageScore: Math.round(pages.reduce((s, p) => s + p.score, 0) / pages.length * 100) / 100,
      topPages: sorted.slice(0, 2),
      underperformers: [...sorted].reverse().slice(0, 2),
      criticalIssues: criticalIssues.slice(0, 5),
    };
  }

  analyzeSpeedImpact(campaignId: string, tenantId: string): PageSpeedImpact[] {
    const analysis = this.analyzeLandingPages(campaignId, tenantId);
    return analysis.pages.map(p => {
      const targetSpeed = Math.max(0.8, p.loadSpeed * 0.6);
      const delta = Math.round((p.loadSpeed - targetSpeed) * 100) / 100;
      const conversionLift = delta > 1 ? 15 + (hashStr(p.url) % 20) : delta > 0.5 ? 7 + (hashStr(p.url) % 13) : 2 + (hashStr(p.url) % 6);
      const revImpact = Math.round(p.revenue * conversionLift / 100);
      return {
        pageUrl: p.url, pageName: p.name, currentSpeed: p.loadSpeed, targetSpeed,
        speedDelta: delta,
        estimatedConversionLift: Math.round(conversionLift * 100) / 100,
        estimatedRevenueImpact: revImpact,
        recommendation: delta > 1 ? `Critical: reduce load time by ${delta}s — compress images, enable CDN, minimize JS` :
                        delta > 0.5 ? `Improve speed by ${delta}s — lazy-load below-fold content, optimize fonts` :
                        `Minor optimizations available — enable browser caching and preconnect to third-party origins`,
      };
    });
  }

  analyzeContentGaps(campaignId: string, tenantId: string): ContentGap[] {
    const seed = hashStr(campaignId + tenantId + "content");
    const gaps: ContentGap[] = [
      { element: "Hero Section", currentState: "Generic stock hero image with headline", bestPractice: "Benefit-driven headline with relevant visual and subheadline", impact: "40-60% improvement in above-fold engagement", priority: "high" as const },
      { element: "Social Proof", currentState: "No testimonials or trust signals visible", bestPractice: "Customer logos, testimonial carousel, and rating badges above fold", impact: "25-35% conversion uplift with visible social proof", priority: "high" as const },
      { element: "CTA Button", currentState: "Generic 'Submit' or 'Learn More' button", bestPractice: "Action-oriented CTA with urgency (Get Started Free, Claim My Discount)", impact: "30-50% increase in click-through rate", priority: "high" as const },
      { element: "Form Fields", currentState: seed % 2 === 0 ? "7+ form fields required" : "No progressive profiling", bestPractice: "Reduce to 3 essential fields, use progressive profiling for returning visitors", impact: "20-40% increase in form completion rate", priority: "medium" as const },
      { element: "Mobile Experience", currentState: seed % 3 === 0 ? "Desktop-only layout" : "Responsive but not mobile-optimized", bestPractice: "Mobile-first design with thumb-friendly CTAs and optimized images", impact: "15-25% improvement in mobile conversion rate", priority: "medium" as const },
      { element: "Value Proposition", currentState: "Feature-focused description", bestPractice: "Problem-agitate-solution framework with quantified benefits", impact: "20-35% improvement in persuasion and recall", priority: "medium" as const },
      { element: "Trust Signals", currentState: "No security badges, guarantees, or awards displayed", bestPractice: "SSL badge, money-back guarantee, and industry awards near CTA", impact: "10-20% increase in conversion for high-consideration offers", priority: "low" as const },
      { element: "Scarcity Elements", currentState: "No urgency indicators present", bestPractice: "Limited-time offer timer, low-stock alerts, or countdown timers", impact: "15-25% conversion lift with authentic scarcity signals", priority: "low" as const },
    ];
    return gaps;
  }

  analyzePageSegmentation(campaignId: string, tenantId: string): PageSegmentation[] {
    const analysis = this.analyzeLandingPages(campaignId, tenantId);
    const segs = [
      { name: "New Visitors", multi: 0.7 },
      { name: "Returning Visitors", multi: 1.4 },
      { name: "Mobile Traffic", multi: 0.8 },
      { name: "Desktop Traffic", multi: 1.2 },
      { name: "Social Traffic", multi: 0.85 },
      { name: "Search Traffic", multi: 1.15 },
    ];
    return segs.map(s => {
      const visitors = Math.round(analysis.totalVisitors * (0.08 + ((hashStr(campaignId + s.name) % 20)) / 100));
      const convRate = analysis.averageConversionRate * s.multi;
      const convs = Math.round(visitors * convRate / 100);
      return {
        segmentName: s.name, visitors, conversions: convs,
        conversionRate: Math.round(convRate * 100) / 100,
        avgTimeOnPage: Math.round((40 + ((hashStr(campaignId + s.name) * 7) % 100)) * 100) / 100,
        bounceRate: Math.round((35 + ((hashStr(campaignId + s.name) * 11) % 40)) * 100) / 100,
        topPage: analysis.pages.sort((a, b) => b.visitors - a.visitors)[0]?.name || "",
      };
    });
  }

  generateLayoutRecommendations(campaignId: string, tenantId: string): LayoutRecommendation[] {
    const recs: LayoutRecommendation[] = [
      { section: "Above Fold", currentLayout: "Hero image + headline + CTA button", suggestedLayout: "Benefit headline → subheadline → social proof strip → CTA → supporting visual", rationale: "Social proof above fold builds trust before CTA decision point", expectedLift: "15-25% conversion improvement" },
      { section: "Form Position", currentLayout: "Form at bottom of page", suggestedLayout: "Floating sticky form or inline form after second benefit section", rationale: "Reduces friction — users don't need to scroll to bottom to convert", expectedLift: "20-30% increase in form submissions" },
      { section: "Navigation", currentLayout: "Full header navigation with all links", suggestedLayout: "Minimal header — logo + primary CTA only", rationale: "Reduces distraction and keeps users focused on conversion goal", expectedLift: "10-15% improvement in CTA click rate" },
      { section: "Content Structure", currentLayout: "Single continuous scroll", suggestedLayout: "Tabbed content sections with anchor navigation", rationale: "Improves scannability and allows users to find relevant info quickly", expectedLift: "8-12% increase in time on page" },
      { section: "Trust Section", currentLayout: "Trust signals at page footer", suggestedLayout: "Trust badges + guarantee near CTA (both above and below fold)", rationale: "Reduces purchase anxiety at the decision moment", expectedLift: "10-20% conversion lift" },
      { section: "Mobile Layout", currentLayout: "Desktop-first layout scaled down", suggestedLayout: "Mobile-first single column with thumb-zone optimized CTAs", rationale: "50%+ of traffic is mobile — desktop-first layouts hurt mobile UX", expectedLift: "15-25% mobile conversion improvement" },
    ];
    return recs;
  }

  analyzeLandingPageTrends(campaignId: string, tenantId: string): LandingPageTrend[] {
    const seed = hashStr(campaignId + tenantId + "lptrend");
    const trends: LandingPageTrend[] = [];
    for (let w = 0; w < 8; w++) {
      const wSeed = seed + w * 11;
      const visitors = 2000 + (wSeed % 6000);
      const convRate = 2 + ((wSeed * 7) % 60) / 10;
      trends.push({
        date: new Date(2025, 0, 1 + w * 7).toISOString().split("T")[0],
        visitors, conversions: Math.round(visitors * convRate / 100),
        conversionRate: Math.round(convRate * 100) / 100,
        avgLoadSpeed: Math.round((1.5 + ((wSeed * 13) % 30) / 10) * 100) / 100,
        avgScore: Math.round((65 + (wSeed % 30)) * 100) / 100,
      });
    }
    return trends;
  }
}

export const campaignLandingPageAnalyzer = new CampaignLandingPageAnalyzerService();
