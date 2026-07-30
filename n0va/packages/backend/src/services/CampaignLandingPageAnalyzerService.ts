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

interface ABTestVariant {
  variantName: string;
  pageUrl: string;
  visitors: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
  improvement: number;
  confidence: number;
  winner: boolean;
}

interface ABTestAnalysis {
  campaignId: string;
  variants: ABTestVariant[];
  winningVariant: string;
  estimatedLift: number;
  recommendation: string;
}

interface FormFieldAnalysis {
  fieldName: string;
  type: string;
  completionRate: number;
  abandonmentRate: number;
  avgTimeToComplete: number;
  optimization: string;
  priority: "high" | "medium" | "low";
}

interface FormAnalysisResult {
  campaignId: string;
  totalForms: number;
  overallCompletionRate: number;
  fields: FormFieldAnalysis[];
  recommendations: string[];
}

interface HeatmapZone {
  zone: string;
  predictedAttention: number;
  expectedCTR: number;
  currentElement: string;
  recommendation: string;
}

interface AccessibilityIssue {
  issue: string;
  wcagCriterion: string;
  severity: "critical" | "serious" | "moderate" | "minor";
  affectedElements: number;
  impact: string;
  fix: string;
}

interface AccessibilityAudit {
  campaignId: string;
  score: number;
  grade: string;
  issues: AccessibilityIssue[];
  topFixes: string[];
}

interface ConversionPathStep {
  step: string;
  page: string;
  entrants: number;
  completions: number;
  dropOff: number;
  dropOffRate: number;
}

interface ConversionPathAnalysis {
  campaignId: string;
  path: ConversionPathStep[];
  overallConversionRate: number;
  biggestDropOff: { step: string; rate: number; recommendation: string };
}

interface IndustryBenchmark {
  metric: string;
  pageValue: number;
  industryAverage: number;
  topQuartile: number;
  percentile: number;
  status: "above" | "at" | "below";
  recommendation: string;
}

interface CompetitiveBenchmark {
  campaignId: string;
  benchmarks: IndustryBenchmark[];
  overallScore: number;
  overallGrade: string;
}

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

  landingPageABTestAnalysis(campaignId: string, tenantId: string): ABTestAnalysis {
    const analysis = this.analyzeLandingPages(campaignId, tenantId);
    const seed = hashStr(campaignId + tenantId + "abtest");
    const variants: ABTestVariant[] = analysis.pages.slice(0, 4).map((page, i) => {
      const vSeed = seed + i * 31;
      const baseCvr = analysis.averageConversionRate;
      const improvement = (vSeed % 40) - 10;
      const cvr = Math.round((baseCvr * (1 + improvement / 100)) * 100) / 100;
      const convs = Math.round(page.visitors * cvr / 100);
      const rev = Math.round(convs * (20 + (vSeed % 80)));
      return {
        variantName: `Variant ${String.fromCharCode(65 + i)}`,
        pageUrl: page.url, visitors: page.visitors, conversions: convs,
        conversionRate: cvr, revenue: rev, improvement,
        confidence: Math.round((65 + (vSeed % 30)) * 100) / 100,
        winner: false,
      };
    });
    const maxImp = variants.reduce((m, v) => Math.max(m, v.improvement), -Infinity);
    variants.forEach(v => { v.winner = v.improvement === maxImp; });
    const winner = variants.reduce((best, v) => v.improvement > best.improvement ? v : best, variants[0]);
    return { campaignId, variants, winningVariant: winner.variantName, estimatedLift: winner.improvement, recommendation: winner.improvement > 0 ? `Variant ${winner.variantName} outperforms control by ${winner.improvement}% — roll out to all traffic` : `No variant significantly outperforms — continue testing with new hypotheses` };
  }

  landingPageFormAnalysis(campaignId: string, tenantId: string): FormAnalysisResult {
    const seed = hashStr(campaignId + tenantId + "form");
    const fieldDefs = [
      { name: "Full Name", type: "text" }, { name: "Email Address", type: "email" },
      { name: "Phone Number", type: "tel" }, { name: "Company Name", type: "text" },
      { name: "Job Title", type: "text" }, { name: "Company Size", type: "dropdown" },
      { name: "Industry", type: "dropdown" }, { name: "Message", type: "textarea" },
    ];
    const overallCompletion = Math.round((45 + (seed % 35)) * 100) / 100;
    const fields: FormFieldAnalysis[] = fieldDefs.map((f, i) => {
      const fSeed = seed + i * 23;
      const completionRate = Math.max(20, Math.round((90 - i * 8 - (fSeed % 15)) * 100) / 100);
      const abandonmentRate = Math.round((100 - completionRate) * 100) / 100;
      return {
        fieldName: f.name, type: f.type, completionRate, abandonmentRate,
        avgTimeToComplete: Math.round((5 + i * 3 + (fSeed % 10)) * 100) / 100,
        optimization: i >= 5 ? `Consider removing or making optional — high abandonment after field ${i + 1}` : i >= 3 ? `Use autocomplete or inline validation to speed completion` : `Field performs well — maintain current position`,
        priority: i >= 5 ? "high" as const : i >= 3 ? "medium" as const : "low" as const,
      };
    });
    const recommendations = overallCompletion < 60 ? [`Form completion rate is ${overallCompletion}% — reduce to 3-5 fields`, "Add progress indicator for multi-step forms", "Use inline validation to reduce errors"] : [`Form completion rate is ${overallCompletion}% — performing well`, "Consider A/B testing button color and copy", "Add trust badges near submit button"];
    return { campaignId, totalForms: fieldDefs.length, overallCompletionRate: overallCompletion, fields, recommendations };
  }

  landingPageHeatmapPrediction(campaignId: string, tenantId: string): HeatmapZone[] {
    const seed = hashStr(campaignId + tenantId + "heat");
    const zones: HeatmapZone[] = [
      { zone: "Hero Section (Above Fold)", baseAttn: 85, baseCTR: 3.5, element: "Hero image + headline" },
      { zone: "Value Proposition", baseAttn: 65, baseCTR: 2.8, element: "Feature bullets" },
      { zone: "Social Proof Area", baseAttn: 55, baseCTR: 2.2, element: "Testimonials section" },
      { zone: "CTA Button (Primary)", baseAttn: 75, baseCTR: 4.5, element: "Primary CTA button" },
      { zone: "Pricing Section", baseAttn: 60, baseCTR: 3.0, element: "Pricing table" },
      { zone: "Form Area", baseAttn: 70, baseCTR: 3.2, element: "Lead capture form" },
      { zone: "Trust Badges (Footer)", baseAttn: 30, baseCTR: 1.0, element: "Footer trust signals" },
      { zone: "Navigation Bar", baseAttn: 50, baseCTR: 1.8, element: "Header navigation" },
    ];
    return zones.map((z, i) => {
      const zSeed = seed + i * 29;
      const attnVar = (zSeed % 15) - 7;
      const attn = Math.max(5, Math.min(100, z.baseAttn + attnVar));
      const ctr = Math.round((z.baseCTR + ((zSeed * 7) % 15 - 7) / 10) * 100) / 100;
      return {
        zone: z.zone, predictedAttention: Math.round(attn * 100) / 100, expectedCTR: ctr,
        currentElement: z.element,
        recommendation: attn < 40 ? `Low attention zone — move ${z.element} higher or make it more visually prominent` :
                       attn < 60 ? `Moderate attention — consider adding motion or contrast to ${z.element}` :
                       `High attention zone — optimize ${z.element} for maximum conversion impact`,
      };
    });
  }

  landingPageAccessibilityAudit(campaignId: string, tenantId: string): AccessibilityAudit {
    const seed = hashStr(campaignId + tenantId + "a11y");
    const baseScore = 55 + (seed % 35);
    const allIssues: AccessibilityIssue[] = [
      { issue: "Missing alt text on images", wcagCriterion: "WCAG 1.1.1 (Level A)", severity: "serious" as const, affectedElements: 3 + (seed % 5), impact: "Screen reader users cannot understand image content", fix: "Add descriptive alt text to all images" },
      { issue: "Low color contrast on text", wcagCriterion: "WCAG 1.4.3 (Level AA)", severity: "serious" as const, affectedElements: 5 + ((seed * 7) % 8), impact: "Users with low vision struggle to read content", fix: "Ensure contrast ratio of at least 4.5:1 for normal text" },
      { issue: "Missing heading hierarchy", wcagCriterion: "WCAG 1.3.1 (Level A)", severity: "moderate" as const, affectedElements: 2 + ((seed * 11) % 4), impact: "Screen reader navigation is impaired", fix: "Use proper h1-h6 hierarchy with no skipped levels" },
      { issue: "No focus indicators on interactive elements", wcagCriterion: "WCAG 2.4.7 (Level AA)", severity: "moderate" as const, affectedElements: 8 + ((seed * 13) % 7), impact: "Keyboard-only users cannot see focus position", fix: "Add visible :focus styles to all interactive elements" },
      { issue: "Form inputs missing labels", wcagCriterion: "WCAG 1.3.1 (Level A)", severity: "critical" as const, affectedElements: 2 + ((seed * 17) % 3), impact: "Screen reader users cannot identify form fields", fix: "Associate label elements with all form inputs" },
      { issue: "Non-text content lacks text alternatives", wcagCriterion: "WCAG 1.1.1 (Level A)", severity: "serious" as const, affectedElements: 4 + ((seed * 19) % 6), impact: "Users cannot access information conveyed by icons/charts", fix: "Provide text alternatives for all non-text content" },
      { issue: "Keyboard trap in navigation", wcagCriterion: "WCAG 2.1.2 (Level A)", severity: "critical" as const, affectedElements: 1 + ((seed * 23) % 3), impact: "Keyboard users cannot navigate away from certain elements", fix: "Ensure all elements can be navigated with Tab/Shift+Tab" },
      { issue: "Missing ARIA landmarks", wcagCriterion: "WCAG 1.3.1 (Level A)", severity: "minor" as const, affectedElements: 3 + ((seed * 29) % 5), impact: "Screen reader navigation efficiency is reduced", fix: "Add ARIA landmark roles (banner, main, navigation, contentinfo)" },
      { issue: "Auto-playing video without controls", wcagCriterion: "WCAG 1.4.2 (Level A)", severity: "serious" as const, affectedElements: 1 + ((seed * 31) % 2), impact: "Users cannot stop or control media playback", fix: "Add play/pause controls and do not autoplay" },
      { issue: "Resize text limited to 200%", wcagCriterion: "WCAG 1.4.4 (Level AA)", severity: "moderate" as const, affectedElements: 6 + ((seed * 37) % 5), impact: "Users who need larger text cannot resize without loss", fix: "Use relative units (rem/em) instead of fixed px for text" },
    ];
    const score = Math.max(0, Math.min(100, baseScore - allIssues.filter(i => i.severity === "critical").length * 8 - allIssues.filter(i => i.severity === "serious").length * 4));
    const grade = score >= 85 ? "A" : score >= 70 ? "B" : score >= 55 ? "C" : score >= 40 ? "D" : "F";
    const topFixes = allIssues.filter(i => i.severity === "critical" || i.severity === "serious").slice(0, 3).map(i => i.fix);
    return { campaignId, score, grade, issues: allIssues.slice(0, 6), topFixes };
  }

  landingPageConversionPathAnalysis(campaignId: string, tenantId: string): ConversionPathAnalysis {
    const analysis = this.analyzeLandingPages(campaignId, tenantId);
    const seed = hashStr(campaignId + tenantId + "convpath");
    const pages = analysis.pages;
    const sorted = [...pages].sort((a, b) => b.visitors - a.visitors);
    const steps: ConversionPathStep[] = sorted.slice(0, 5).map((page, i) => {
      const sSeed = seed + i * 41;
      const entrants = i === 0 ? analysis.totalVisitors : Math.round(sorted[i - 1].conversions * (0.6 + (sSeed % 30) / 100));
      const completions = page.conversions;
      const dropOff = entrants - completions;
      const dropOffRate = entrants > 0 ? Math.round((dropOff / entrants) * 10000) / 100 : 0;
      return { step: `Step ${i + 1}`, page: page.name, entrants, completions: page.conversions, dropOff, dropOffRate };
    });
    const overallCvr = steps.length > 0 && steps[0].entrants > 0 ? Math.round((steps[steps.length - 1].completions / steps[0].entrants) * 10000) / 100 : 0;
    const biggestDropOff = steps.reduce((worst, s) => s.dropOffRate > worst.rate ? { step: s.page, rate: s.dropOffRate, recommendation: `${s.page} has ${s.dropOffRate}% drop-off — optimize page content, add clearer CTAs, reduce friction` } : worst, { step: "", rate: 0, recommendation: "" });
    return { campaignId, path: steps, overallConversionRate: overallCvr, biggestDropOff };
  }

  landingPageCompetitiveBenchmark(campaignId: string, tenantId: string): CompetitiveBenchmark {
    const analysis = this.analyzeLandingPages(campaignId, tenantId);
    const seed = hashStr(campaignId + tenantId + "bench");
    const benchmarks: IndustryBenchmark[] = [
      { metric: "Conversion Rate", pageValue: analysis.averageConversionRate, industryAverage: 2.5, topQuartile: 5.0, basePct: 50, higherIsBetter: true },
      { metric: "Bounce Rate", pageValue: analysis.averageBounceRate, industryAverage: 45, topQuartile: 30, basePct: 40, higherIsBetter: false },
      { metric: "Page Load Speed (s)", pageValue: analysis.averageLoadSpeed, industryAverage: 2.5, topQuartile: 1.5, basePct: 50, higherIsBetter: false },
      { metric: "Avg. Time on Page (s)", pageValue: analysis.pages.length > 0 ? analysis.pages.reduce((s, p) => s + p.avgTimeOnPage, 0) / analysis.pages.length : 0, industryAverage: 60, topQuartile: 120, basePct: 50, higherIsBetter: true },
      { metric: "Page Score", pageValue: analysis.averageScore, industryAverage: 65, topQuartile: 85, basePct: 55, higherIsBetter: true },
      { metric: "Revenue per Visitor ($)", pageValue: analysis.totalVisitors > 0 ? Math.round((analysis.totalRevenue / analysis.totalVisitors) * 100) / 100 : 0, industryAverage: 0.45, topQuartile: 1.2, basePct: 40, higherIsBetter: true },
    ].map(b => {
      const bSeed = seed + hashStr(b.metric);
      const ratio = b.higherIsBetter ? b.pageValue / Math.max(b.industryAverage, 0.01) : b.industryAverage / Math.max(b.pageValue, 0.01);
      const percentile = Math.min(99, Math.round((b.basePct + (ratio - 1) * 20 + ((bSeed * 7) % 10 - 5)) * 100) / 100);
      const status: "above" | "at" | "below" = b.higherIsBetter ? (b.pageValue > b.industryAverage * 1.1 ? "above" : b.pageValue > b.industryAverage * 0.9 ? "at" : "below") : (b.pageValue < b.industryAverage * 0.9 ? "above" : b.pageValue < b.industryAverage * 1.1 ? "at" : "below");
      return {
        metric: b.metric, pageValue: Math.round(b.pageValue * 100) / 100,
        industryAverage: b.industryAverage, topQuartile: b.topQuartile,
        percentile: Math.max(1, Math.min(99, percentile)),
        status, recommendation: status === "above" ? `Strong performance — maintain and use as benchmark for other pages` : status === "at" ? `At industry average — incremental improvements can push to top quartile` : `Below average — prioritize improvements to reach industry baseline`,
      };
    });
    const overallScore = Math.round(benchmarks.reduce((s, b) => s + b.percentile, 0) / benchmarks.length);
    const overallGrade = overallScore >= 80 ? "A" : overallScore >= 65 ? "B" : overallScore >= 50 ? "C" : overallScore >= 35 ? "D" : "F";
    return { campaignId, benchmarks, overallScore, overallGrade };
  }
}

export const campaignLandingPageAnalyzer = new CampaignLandingPageAnalyzerService();
