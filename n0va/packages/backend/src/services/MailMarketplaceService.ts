import { DataStore } from "./DataStore";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export const MARKETPLACE_CATEGORIES: any[] = [
  { id: "ai_agents", name: "AI Agents", devShare: 70, novaShare: 30, description: "Autonomous mail assistants" },
  { id: "integrations", name: "Integrations", devShare: 80, novaShare: 20, description: "Connectors and sync bridges" },
  { id: "themes", name: "Themes", devShare: 90, novaShare: 10, description: "Mailbox and brand themes" },
  { id: "templates", name: "Templates", devShare: 85, novaShare: 15, description: "Email and campaign templates" },
  { id: "plugins", name: "Plugins", devShare: 75, novaShare: 25, description: "In-app extensions" },
  { id: "training", name: "Training", devShare: 60, novaShare: 40, description: "Courses and certification" },
];

export const SEED_LISTINGS: any[] = [
  { _id: "mkt_sales_agent", title: "Sales Assistant Agent", description: "Automates follow-ups and deal-stage updates from inbox activity", category: "ai_agents", price: 19, devId: "n0va-studio", installs: 1240, rating: 4.6, reviewCount: 96, featured: true, verified: true },
  { _id: "mkt_legal_reviewer", title: "Legal Reviewer Agent", description: "Flags contract risks and routes redlines to legal", category: "ai_agents", price: 29, devId: "n0va-studio", installs: 640, rating: 4.8, reviewCount: 41, featured: true, verified: true },
  { _id: "mkt_hr_onboarding", title: "HR Onboarding Agent", description: "Sends onboarding sequences and collects e-signatures", category: "ai_agents", price: 15, devId: "peopleflow", installs: 380, rating: 4.3, reviewCount: 18, featured: false, verified: true },
  { _id: "mkt_salesforce_link", title: "Salesforce Sync", description: "Two-way CRM sync with deal and contact matching", category: "integrations", price: 0, devId: "crmhub", installs: 4820, rating: 4.5, reviewCount: 210, featured: true, verified: true },
  { _id: "mkt_jira_sync", title: "Jira Bridge", description: "Turn emails into issues and post comments back", category: "integrations", price: 9, devId: "atlassian-partners", installs: 1250, rating: 4.2, reviewCount: 64, featured: false, verified: true },
  { _id: "mkt_sap_connector", title: "SAP Concur Connector", description: "Expense and invoice routing for finance teams", category: "integrations", price: 25, devId: "erp-lab", installs: 210, rating: 4.1, reviewCount: 12, featured: false, verified: true },
  { _id: "mkt_theme_dark", title: "Midnight Theme", description: "Dark-first theme tuned for low-light workflows", category: "themes", price: 4, devId: "pixelcraft", installs: 3350, rating: 4.7, reviewCount: 150, featured: true, verified: true },
  { _id: "mkt_theme_minimal", title: "Minimalist Theme", description: "Reduced chrome, high density, focus on triage", category: "themes", price: 3, devId: "pixelcraft", installs: 1980, rating: 4.4, reviewCount: 88, featured: false, verified: true },
  { _id: "mkt_tpl_newsletter", title: "Newsletter Pack (12)", description: "Twelve responsive newsletter templates with blocks", category: "templates", price: 12, devId: "mailmint", installs: 2760, rating: 4.6, reviewCount: 121, featured: false, verified: true },
  { _id: "mkt_tpl_invoice", title: "Invoice & Billing Pack (8)", description: "Invoice, reminder and dunning templates", category: "templates", price: 10, devId: "mailmint", installs: 1890, rating: 4.5, reviewCount: 74, featured: false, verified: true },
  { _id: "mkt_plugin_rt", title: "Real-time Chat Plugin", description: "Inline live chat inside the reader pane", category: "plugins", price: 8, devId: "chatstack", installs: 920, rating: 4.2, reviewCount: 45, featured: false, verified: false },
  { _id: "mkt_plugin_translate", title: "Translate on Read", description: "One-click translation of incoming messages", category: "plugins", price: 6, devId: "lingo-labs", installs: 1530, rating: 4.8, reviewCount: 92, featured: true, verified: true },
  { _id: "mkt_course_specialist", title: "N0VA Mail Certified Specialist", description: "12 modules + exam, certificate issued", category: "training", price: 199, devId: "n0va-academy", installs: 540, rating: 4.9, reviewCount: 37, featured: true, verified: true },
  { _id: "mkt_course_automation", title: "Automation Masterclass", description: "Build production automation flows in 4 hours", category: "training", price: 49, devId: "workflow-wiz", installs: 810, rating: 4.4, reviewCount: 58, featured: false, verified: true },
];

export const PROGRAMS: any[] = [
  { id: "champions", name: "N0VA Champions", requirement: "500+ API calls/mo sustained", benefit: "Profile badge, early features" },
  { id: "certified", name: "Certified Developer", requirement: "Pass developer certification exam", benefit: "Certified badge, listing priority" },
  { id: "partner", name: "Partner", requirement: "10k USD/mo revenue tier", benefit: "Dedicated support, joint marketing" },
  { id: "oss", name: "Open Source Contributor", requirement: "Accepted code contribution", benefit: "Free N0VA1O credits" },
  { id: "student", name: "Student", requirement: "Verified academic email", benefit: "50% platform fees" },
];

export class MailMarketplaceService {
  private ensureSeed() {
    const existing = DataStore.mem().find("mail_marketplace_listings", (l: any) => l._id.startsWith("mkt_"));
    if (existing.length >= SEED_LISTINGS.length) return;
    for (const s of SEED_LISTINGS) {
      const found = DataStore.mem().findOne("mail_marketplace_listings", (l: any) => l._id === s._id);
      if (!found) DataStore.mem().insert("mail_marketplace_listings", { ...s, status: "approved", revenueShare: MARKETPLACE_CATEGORIES.find((c: any) => c.id === s.category).devShare, createdAt: new Date().toISOString() });
    }
  }

  categories() {
    return { categories: MARKETPLACE_CATEGORIES, count: MARKETPLACE_CATEGORIES.length, summary: `${MARKETPLACE_CATEGORIES.length} marketplace categories with revenue share` };
  }

  marketplaceCatalog(tenantId: string, category?: string) {
    this.ensureSeed();
    if (category && !MARKETPLACE_CATEGORIES.some((c: any) => c.id === category)) throw new Error(`Unknown category "${category}"`);
    const rows = DataStore.mem().find("mail_marketplace_listings", (l: any) => l.status === "approved" && (!category || l.category === category));
    const installed = new Set(DataStore.mem().find("mail_marketplace_installs", (i: any) => i.tenantId === tenantId).map((i: any) => i.listingId));
    const list = rows.map((l: any) => ({ listingId: l._id, title: l.title, description: l.description, category: l.category, price: l.price, devId: l.devId, rating: l.rating, reviewCount: l.reviewCount, installs: l.installs, featured: !!l.featured, verified: !!l.verified, installed: installed.has(l._id) }));
    return { listings: list, count: list.length, category: category || "all", summary: `${list.length} listing(s) in ${category || "all categories"}` };
  }

  submitListing(tenantId: string, input: any) {
    const title = String((input && input.title) || "").trim();
    if (!title) throw new Error("title is required");
    const category = String((input && input.category) || "");
    if (!MARKETPLACE_CATEGORIES.some((c: any) => c.id === category)) throw new Error(`Unknown category "${category}"`);
    const listing = DataStore.mem().insert("mail_marketplace_listings", {
      tenantId,
      title,
      description: String((input && input.description) || ""),
      category,
      price: Math.max(0, Number((input && input.price) || 0)),
      devId: String((input && input.devId) || "anonymous"),
      status: "pending",
      revenueShare: MARKETPLACE_CATEGORIES.find((c: any) => c.id === category).devShare,
      installs: 0,
      rating: 0,
      reviewCount: 0,
      featured: false,
      verified: false,
      createdAt: new Date().toISOString(),
    });
    this.log(tenantId, "listing_submitted", `"${listing.title}" submitted - pending review`);
    return { listingId: listing._id, title: listing.title, category: listing.category, status: listing.status, summary: `"${listing.title}" submitted - pending review` };
  }

  pendingListings(tenantId: string) {
    const rows = DataStore.mem().find("mail_marketplace_listings", (l: any) => l.status === "pending" && (!l.tenantId || l.tenantId === tenantId));
    return { listings: rows.map((l: any) => ({ listingId: l._id, title: l.title, description: l.description, category: l.category, price: l.price, devId: l.devId, submittedAt: l.createdAt })), count: rows.length, summary: `${rows.length} listing(s) awaiting review` };
  }

  approveListing(tenantId: string, listingId: string) {
    const listing = DataStore.mem().findOne("mail_marketplace_listings", (l: any) => l._id === listingId);
    if (!listing) throw new Error(`Listing "${listingId}" not found`);
    DataStore.mem().update("mail_marketplace_listings", (l: any) => l._id === listing._id, { status: "approved", verified: true, reviewedAt: new Date().toISOString() });
    this.log(tenantId, "listing_approved", `"${listing.title}" approved for the marketplace`);
    return { listingId, title: listing.title, status: "approved", summary: `"${listing.title}" approved and published` };
  }

  rejectListing(tenantId: string, listingId: string, reason?: string) {
    const listing = DataStore.mem().findOne("mail_marketplace_listings", (l: any) => l._id === listingId);
    if (!listing) throw new Error(`Listing "${listingId}" not found`);
    DataStore.mem().update("mail_marketplace_listings", (l: any) => l._id === listing._id, { status: "rejected", rejectionReason: reason || "quality guidelines", reviewedAt: new Date().toISOString() });
    this.log(tenantId, "listing_rejected", `"${listing.title}" rejected - ${reason || "quality guidelines"}`);
    return { listingId, title: listing.title, status: "rejected", summary: `"${listing.title}" rejected` };
  }

  installListing(tenantId: string, listingId: string) {
    const listing = DataStore.mem().findOne("mail_marketplace_listings", (l: any) => l._id === listingId);
    if (!listing) throw new Error(`Listing "${listingId}" not found`);
    const dup = DataStore.mem().findOne("mail_marketplace_installs", (i: any) => i.tenantId === tenantId && i.listingId === listingId);
    if (dup) return { installed: true, alreadyInstalled: true, summary: `"${listing.title}" is already installed` };
    DataStore.mem().insert("mail_marketplace_installs", { tenantId, listingId, installedAt: new Date().toISOString() });
    DataStore.mem().update("mail_marketplace_listings", (l: any) => l._id === listing._id, { installs: listing.installs + 1 });
    this.log(tenantId, "listing_installed", `"${listing.title}" installed`);
    return { listingId, title: listing.title, installed: true, summary: `"${listing.title}" installed` };
  }

  uninstallListing(tenantId: string, listingId: string) {
    const listing = DataStore.mem().findOne("mail_marketplace_listings", (l: any) => l._id === listingId);
    if (!listing) throw new Error(`Listing "${listingId}" not found`);
    const install = DataStore.mem().findOne("mail_marketplace_installs", (i: any) => i.tenantId === tenantId && i.listingId === listingId);
    if (install) DataStore.mem().delete("mail_marketplace_installs", (i: any) => i._id === install._id);
    this.log(tenantId, "listing_uninstalled", `"${listing.title}" uninstalled`);
    return { listingId, title: listing.title, installed: false, summary: `"${listing.title}" uninstalled` };
  }

  installedListings(tenantId: string) {
    const installs = DataStore.mem().find("mail_marketplace_installs", (i: any) => i.tenantId === tenantId);
    const list = installs.map((i: any) => {
      const l = DataStore.mem().findOne("mail_marketplace_listings", (x: any) => x._id === i.listingId);
      return {
        listingId: i.listingId,
        title: l ? l.title : i.listingId,
        category: l ? l.category : "unknown",
        price: l ? l.price : 0,
        installedAt: i.installedAt,
        usageToday: 1 + (hashStr(tenantId + "|" + i.listingId + "|usage") % 40),
      };
    });
    return { listings: list, count: list.length, summary: `${list.length} installed listing(s)` };
  }

  rateListing(tenantId: string, listingId: string, rating: number, review?: string) {
    const listing = DataStore.mem().findOne("mail_marketplace_listings", (l: any) => l._id === listingId);
    if (!listing) throw new Error(`Listing "${listingId}" not found`);
    const value = Number(rating);
    if (isNaN(value) || value < 1 || value > 5) throw new Error("rating must be between 1 and 5");
    const install = DataStore.mem().findOne("mail_marketplace_installs", (i: any) => i.tenantId === tenantId && i.listingId === listingId);
    if (!install) throw new Error("Install the listing before rating it");
    DataStore.mem().insert("mail_marketplace_reviews", { tenantId, listingId, rating: value, review: review || "", createdAt: new Date().toISOString() });
    const reviews = DataStore.mem().find("mail_marketplace_reviews", (r: any) => r.listingId === listingId);
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    DataStore.mem().update("mail_marketplace_listings", (l: any) => l._id === listing._id, { rating: Math.round(avg * 10) / 10, reviewCount: reviews.length });
    this.log(tenantId, "listing_rated", `"${listing.title}" rated ${value}/5`);
    return { listingId, rating: value, newAverage: Math.round(avg * 10) / 10, summary: `"${listing.title}" rated ${value}/5 - now ${Math.round(avg * 10) / 10} avg` };
  }

  developerPrograms() {
    return { programs: PROGRAMS, count: PROGRAMS.length, summary: `${PROGRAMS.length} developer programs` };
  }

  joinProgram(tenantId: string, programId: string) {
    const program = PROGRAMS.find((p: any) => p.id === programId);
    if (!program) throw new Error(`Unknown program "${programId}"`);
    const dup = DataStore.mem().findOne("mail_marketplace_programs", (p: any) => p.tenantId === tenantId && p.programId === programId);
    if (dup) return { joined: true, alreadyMember: true, summary: `Already a ${program.name}` };
    DataStore.mem().insert("mail_marketplace_programs", { tenantId, programId, name: program.name, joinedAt: new Date().toISOString() });
    this.log(tenantId, "program_joined", `Joined ${program.name} developer program`);
    return { programId, name: program.name, joined: true, summary: `Joined the ${program.name} program` };
  }

  revenueOverview(tenantId: string) {
    const listings = DataStore.mem().find("mail_marketplace_listings", (l: any) => (l.tenantId === tenantId || l.devId === tenantId) && l.status === "approved");
    const revenue = listings.reduce((s, l) => s + l.installs * l.price, 0);
    const byCategory = MARKETPLACE_CATEGORIES.map((c: any) => ({
      category: c.id,
      name: c.name,
      listings: listings.filter((l: any) => l.category === c.id).length,
      revenue: listings.filter((l: any) => l.category === c.id).reduce((s, l) => s + l.installs * l.price, 0),
      devShare: c.devShare,
    }));
    const devEarnings = Math.round(revenue * 0.7 * 100) / 100;
    return {
      listings: listings.length,
      grossRevenue: revenue,
      devEarnings,
      pendingPayouts: Math.round(devEarnings * 0.2 * 100) / 100,
      byCategory,
      summary: `${listings.length} listing(s), $${revenue} gross, $${devEarnings} developer earnings`,
    };
  }

  marketplaceDashboard(tenantId: string) {
    const catalog = this.marketplaceCatalog(tenantId);
    const installed = this.installedListings(tenantId);
    const revenue = this.revenueOverview(tenantId);
    const log = this.marketplaceLog(tenantId, 10);
    return {
      categories: MARKETPLACE_CATEGORIES,
      catalog: catalog.listings,
      installed: installed.listings,
      installedCount: installed.count,
      revenue,
      recentLog: log.entries,
      generatedAt: new Date().toISOString(),
      summary: `${catalog.count} listing(s), ${installed.count} installed, $${revenue.devEarnings} earned`,
    };
  }

  marketplaceLog(tenantId: string, limit = 20) {
    const n = Math.max(1, parseInt(String(limit), 10));
    const entries = DataStore.mem().find("mail_marketplace_log", (l: any) => l.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, n)
      .map((l: any) => ({ entryId: l._id, category: l.category, detail: l.detail, at: l.at }));
    return { entries, count: entries.length, summary: `${entries.length} marketplace event(s)` };
  }

  private log(tenantId: string, category: string, detail: string) {
    DataStore.mem().insert("mail_marketplace_log", { tenantId, category, detail, at: new Date().toISOString() });
  }
}

export const mailMarketplace = new MailMarketplaceService();