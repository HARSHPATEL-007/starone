import { useState, useEffect } from "react";
import { HelpCircle, Search, ChevronDown, ChevronRight, Mail, MessageSquare, FileText, BookOpen, LifeBuoy, Keyboard, CheckCircle, Copy, Megaphone, BarChart3, Users, X, ExternalLink, AlertTriangle, Clock, Send } from "lucide-react";
import { useToast } from "../components/Toast";
import { api } from "../api/client";

const CATEGORIES = [
  { id: "getting-started", label: "Getting Started", icon: BookOpen, articles: ["Platform Overview", "Creating Your First Campaign", "Understanding the Dashboard", "Setting Up Your Brand Kit"] },
  { id: "campaigns", label: "Campaigns", icon: Megaphone, articles: ["How to Create a Campaign", "Campaign Statuses Explained", "Launch Checklist Guide", "Campaign Scheduling"] },
  { id: "creatives", label: "Creatives & Content", icon: FileText, articles: ["Creative Builder Walkthrough", "Content Library Management", "Creative Gallery Overview", "Brand Kit Best Practices"] },
  { id: "audiences", label: "Audiences", icon: Users, articles: ["Audience Builder Guide", "Importing Audiences", "Segmentation Tips", "Audience Overlap Analysis"] },
  { id: "analytics", label: "Analytics & Reports", icon: BarChart3, articles: ["Report Center Overview", "Campaign Insights Guide", "Attribution Modeling", "Exporting Data"] },
  { id: "collaboration", label: "Collaboration", icon: MessageSquare, articles: ["Comments & Discussions", "Approvals Workflow", "Campaign Review Board", "Team Permissions"] },
  { id: "account", label: "Account & Billing", icon: LifeBuoy, articles: ["Managing Your Account", "API Keys & Access", "Billing & Subscriptions", "Connected Accounts"] },
  { id: "shortcuts", label: "Keyboard Shortcuts", icon: Keyboard, articles: [] },
];

const FAQS = [
  { q: "How do I create a new campaign?", a: "Navigate to Campaigns from the sidebar, click 'New Campaign' in the top right, and follow the campaign wizard. You'll set a name, goal, budget, schedule, and add creatives and audiences." },
  { q: "What do the different campaign statuses mean?", a: "Draft: not yet launched. Active: currently running. Paused: temporarily stopped. Completed: finished. Archived: hidden from main view. Pending Approval: awaiting team review." },
  { q: "How do I approve a campaign?", a: "Go to the Approvals page from the sidebar. You'll see all campaigns pending your review. Click 'Approve' to activate or 'Reject' to send back with feedback." },
  { q: "Can I export my campaign data?", a: "Yes! Use the Export Center from the sidebar. You can export campaigns, creatives, audiences, agents, and recipes as CSV or JSON files." },
  { q: "How do A/B tests work?", a: "Create a test with 2+ variants, set a metric and sample size, then launch it. The system tracks each variant's performance and declares a winner when you end the test." },
  { q: "What is a Launch Checklist?", a: "Each campaign has a pre-flight checklist covering creative readiness, audience selection, budget, schedule, platform targeting, tracking setup, and approvals. All items must pass before launch." },
];

const ARTICLE_CONTENT: Record<string, { summary: string; steps?: string[] }> = {
  "Platform Overview": { summary: "N0VA is a unified Ads & Marketing platform that combines campaign management, audience intelligence, creative optimization, and cross-channel analytics into a single workspace.", steps: ["The left sidebar provides access to all modules", "The top bar shows notifications, search, and user settings", "The main content area adapts based on your current module", "Use the Quick Actions menu for common tasks"] },
  "Creating Your First Campaign": { summary: "Launch your first campaign in minutes using the Campaign Wizard.", steps: ["Click 'New Campaign' from the Campaigns page", "Choose your campaign goal (awareness, consideration, conversion)", "Set your target audience and budget", "Add creatives and select platforms", "Review and launch"] },
  "Understanding the Dashboard": { summary: "The Dashboard gives you a real-time overview of all your marketing activities across campaigns, channels, and audiences.", steps: ["Top cards show key metrics (spend, impressions, conversions, ROAS)", "Charts display trends over time", "Recent activity feed shows latest changes", "Quick-action buttons for common tasks"] },
  "Setting Up Your Brand Kit": { summary: "A Brand Kit centralizes your brand assets — colors, fonts, logos, and guidelines — so every creative stays on-brand.", steps: ["Navigate to Brand Kit from the sidebar", "Upload your logo and select brand colors", "Define your typography preferences", "Save and apply to all new creatives"] },
  "How to Create a Campaign": { summary: "Use the Campaign Wizard to set up a campaign step by step.", steps: ["Set campaign name and objective", "Define target audience", "Allocate budget and schedule", "Select creative assets", "Choose platforms and launch"] },
  "Campaign Statuses Explained": { summary: "Each campaign has a status that indicates its current lifecycle stage.", steps: ["Draft: not yet launched, still editable", "Pending Approval: awaiting team review", "Active: currently running and delivering", "Paused: temporarily stopped, can be resumed", "Completed: finished its run", "Archived: hidden from main view"] },
  "Launch Checklist Guide": { summary: "The Launch Checklist ensures every campaign has all required elements before going live." },
  "Campaign Scheduling": { summary: "Schedule campaigns to launch and end at specific times, with optional recurring schedules." },
  "Creative Builder Walkthrough": { summary: "The Creative Builder lets you design ad creatives with drag-and-drop simplicity." },
  "Content Library Management": { summary: "Organize and manage all your creative assets in one centralized library." },
  "Creative Gallery Overview": { summary: "View all your creatives in a visual gallery with filtering and bulk actions." },
  "Brand Kit Best Practices": { summary: "Keep your brand consistent across all campaigns with these best practices." },
  "Audience Builder Guide": { summary: "Build and refine audiences using demographic, behavioral, and custom criteria." },
  "Importing Audiences": { summary: "Import existing audience lists from CSV files or connected platforms." },
  "Segmentation Tips": { summary: "Effective segmentation strategies for better campaign targeting." },
  "Audience Overlap Analysis": { summary: "Identify overlap between audience segments to optimize targeting." },
  "Report Center Overview": { summary: "Access pre-built and custom reports for all your marketing data." },
  "Campaign Insights Guide": { summary: "Deep-dive analytics for individual campaign performance." },
  "Attribution Modeling": { summary: "Understand how different touchpoints contribute to conversions." },
  "Exporting Data": { summary: "Export your data as CSV or JSON from any module." },
  "Comments & Discussions": { summary: "Collaborate with your team using inline comments on campaigns and creatives." },
  "Approvals Workflow": { summary: "Set up approval workflows to review campaigns before launch." },
  "Campaign Review Board": { summary: "A centralized board for reviewing and approving campaigns." },
  "Team Permissions": { summary: "Manage team roles and permissions across the platform." },
  "Managing Your Account": { summary: "Update your profile, change password, and manage account settings." },
  "API Keys & Access": { summary: "Generate and manage API keys for programmatic access." },
  "Billing & Subscriptions": { summary: "View your subscription plan, billing history, and payment methods." },
  "Connected Accounts": { summary: "Manage integrations with external platforms and services." },
};

const SHORTCUTS = [
  { keys: ["Cmd/Ctrl", "K"], desc: "Open Command Palette" },
  { keys: ["Cmd/Ctrl", "Enter"], desc: "Submit comment / form" },
  { keys: ["/"], desc: "Focus search" },
  { keys: ["Esc"], desc: "Close modal / cancel" },
  { keys: ["?"], desc: "Open help" },
];

export default function HelpCenter() {
  const { addToast } = useToast();
  const [search, setSearch] = useState("");
  const [expandedCat, setExpandedCat] = useState<string>("getting-started");
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [showContact, setShowContact] = useState(false);
  const [contactForm, setContactForm] = useState({ subject: "", message: "", email: "" });
  const [submitting, setSubmitting] = useState(false);
  const [systemInfo, setSystemInfo] = useState<{ version: string; environment: string; apiStatus: string; uptime: string } | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [articleModal, setArticleModal] = useState<{ title: string; content: { summary: string; steps?: string[] } } | null>(null);

  useEffect(() => {
    async function loadSystemInfo() {
      try {
        const tenant = await api.settings.tenant();
        setSystemInfo({
          version: tenant?.version || "1.0.0",
          environment: tenant?.environment || "Production",
          apiStatus: "Online",
          uptime: tenant?.uptime || "—",
        });
      } catch {
        setSystemInfo({ version: "1.0.0", environment: "Production", apiStatus: "Online", uptime: "—" });
      }
      setLoadingInfo(false);
    }
    loadSystemInfo();
  }, []);

  function toggleCat(id: string) { setExpandedCat(prev => prev === id ? "" : id); }

  const filteredFaqs = FAQS.filter(f => !search || f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase()));
  const filteredCats = CATEGORIES.filter(c => {
    if (!search) return true;
    return c.label.toLowerCase().includes(search.toLowerCase()) || c.articles.some(a => a.toLowerCase().includes(search.toLowerCase()));
  });

  function highlightText(text: string, query: string) {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? <span key={i} className="text-yellow-400 bg-yellow-400/10 rounded px-0.5">{part}</span> : part
    );
  }

  async function handleContact(e: React.FormEvent) {
    e.preventDefault();
    if (!contactForm.subject.trim() || !contactForm.message.trim()) { addToast("error", "Subject and message are required"); return; }
    setSubmitting(true);
    try {
      await api.activity.create({
        type: "support_ticket",
        action: "submitted",
        details: `Subject: ${contactForm.subject}\nMessage: ${contactForm.message}\nEmail: ${contactForm.email}`,
        entityType: "support",
        entityName: contactForm.subject,
      });
      addToast("success", "Support ticket submitted. We'll respond within 24 hours.");
      setContactForm({ subject: "", message: "", email: "" });
      setShowContact(false);
    } catch {
      addToast("error", "Failed to submit ticket. Please try again.");
    }
    setSubmitting(false);
  }

  function handleArticleClick(title: string) {
    const content = ARTICLE_CONTENT[title];
    if (content) setArticleModal({ title, content });
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <LifeBuoy className="w-6 h-6 text-n0va-400" />
            Help & Support
          </h1>
          <p className="text-gray-400 mt-1">Documentation, FAQs, and support resources</p>
        </div>
        <button onClick={() => setShowContact(true)} className="btn-primary text-sm flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Contact Support</button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
        <input className="input pl-12 pr-4 py-3 w-full text-base" placeholder="Search help articles, FAQs, and topics..." value={search} onChange={e => setSearch(e.target.value)} autoFocus />
      </div>

      {!search && (
        <div className="grid grid-cols-4 gap-3">
          {CATEGORIES.slice(0, 4).map(cat => {
            const Icon = cat.icon;
            return (
              <button key={cat.id} onClick={() => toggleCat(cat.id)} className="card p-4 text-left hover:bg-gray-800/50 transition-colors">
                <Icon className="w-5 h-5 text-n0va-400 mb-2" />
                <p className="text-sm font-medium text-white">{cat.label}</p>
                <p className="text-xs text-gray-600 mt-1">{cat.articles.length || 0} articles</p>
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-3">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2"><BookOpen className="w-5 h-5 text-n0va-400" /> Documentation</h2>
          {filteredCats.length === 0 && <p className="text-sm text-gray-600 py-4">No articles match your search.</p>}
          {filteredCats.map(cat => {
            const Icon = cat.icon;
            const isOpen = expandedCat === cat.id;
            return (
              <div key={cat.id} className="card overflow-hidden">
                <button onClick={() => toggleCat(cat.id)} className="w-full flex items-center gap-3 p-4 text-left">
                  <Icon className="w-4 h-4 text-n0va-400 shrink-0" />
                  <span className="flex-1 text-sm font-medium text-white">{cat.label}</span>
                  <span className="text-xs text-gray-600">{cat.articles.length > 0 && `${cat.articles.length} articles`}</span>
                  {isOpen ? <ChevronDown className="w-4 h-4 text-gray-600" /> : <ChevronRight className="w-4 h-4 text-gray-600" />}
                </button>
                {isOpen && cat.id === "shortcuts" ? (
                  <div className="px-4 pb-4 space-y-2">
                    {SHORTCUTS.map((s, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 px-3 bg-gray-800/50 rounded-lg">
                        <span className="text-sm text-gray-300">{s.desc}</span>
                        <div className="flex gap-1">{s.keys.map((k, j) => <span key={j} className="text-xs font-mono bg-gray-800 text-gray-400 px-2 py-0.5 rounded border border-gray-700">{k}</span>)}</div>
                      </div>
                    ))}
                  </div>
                ) : isOpen && (
                  <div className="px-4 pb-4 space-y-1">
                    {cat.articles.map((article, i) => (
                      <button key={i} onClick={() => handleArticleClick(article)} className="w-full flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-800/30 cursor-pointer text-sm text-gray-400 hover:text-gray-200 transition-colors text-left">
                        <FileText className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                        <span className="flex-1">{search ? highlightText(article, search) : article}</span>
                        <ExternalLink className="w-3 h-3 text-gray-700 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2"><HelpCircle className="w-5 h-5 text-n0va-400" /> FAQ</h2>
            {filteredFaqs.length === 0 && <p className="text-sm text-gray-600 py-4">No FAQs match your search.</p>}
            {filteredFaqs.map((faq, i) => {
              const isOpen = expandedFaq === `faq-${i}`;
              return (
                <div key={i} className="card overflow-hidden">
                  <button onClick={() => setExpandedFaq(isOpen ? null : `faq-${i}`)} className="w-full flex items-center gap-3 p-3 text-left">
                    <span className="flex-1 text-sm text-gray-300">{search ? highlightText(faq.q, search) : faq.q}</span>
                    {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-gray-600 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-600 shrink-0" />}
                  </button>
                  {isOpen && <div className="px-3 pb-3 text-xs text-gray-500 leading-relaxed">{search ? highlightText(faq.a, search) : faq.a}</div>}
                </div>
              );
            })}
          </div>

          <div className="card p-4 space-y-2">
            <p className="text-xs font-medium text-gray-400">System Info</p>
            {loadingInfo ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-4 bg-gray-800 rounded animate-pulse" />)}
              </div>
            ) : systemInfo ? (
              <>
                <div className="flex justify-between text-xs"><span className="text-gray-600">Version</span><span className="text-gray-300">{systemInfo.version}</span></div>
                <div className="flex justify-between text-xs"><span className="text-gray-600">Environment</span><span className="text-gray-300">{systemInfo.environment}</span></div>
                <div className="flex justify-between text-xs"><span className="text-gray-600">API Status</span><span className="text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {systemInfo.apiStatus}</span></div>
                {systemInfo.uptime !== "—" && <div className="flex justify-between text-xs"><span className="text-gray-600">Uptime</span><span className="text-gray-300 flex items-center gap-1"><Clock className="w-3 h-3" /> {systemInfo.uptime}</span></div>}
              </>
            ) : (
              <p className="text-xs text-gray-600">Unable to fetch system info</p>
            )}
          </div>
        </div>
      </div>

      {/* Contact modal */}
      {showContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowContact(false)}>
          <div className="w-full max-w-md bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-white">Contact Support</h3><button onClick={() => setShowContact(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button></div>
            <form onSubmit={handleContact} className="space-y-4">
              <div><label className="label">Email</label><input className="input" type="email" value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} placeholder="your@email.com" /></div>
              <div><label className="label">Subject</label><input className="input" value={contactForm.subject} onChange={e => setContactForm({ ...contactForm, subject: e.target.value })} placeholder="How can we help?" autoFocus /></div>
              <div><label className="label">Message</label><textarea className="input" rows={4} value={contactForm.message} onChange={e => setContactForm({ ...contactForm, message: e.target.value })} placeholder="Describe your issue in detail..." /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowContact(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary flex items-center gap-1.5" disabled={submitting}>
                  {submitting ? <><Clock className="w-3.5 h-3.5 animate-spin" /> Submitting...</> : <><Send className="w-3.5 h-3.5" /> Submit Ticket</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Article detail modal */}
      {articleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setArticleModal(null)}>
          <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2"><FileText className="w-5 h-5 text-n0va-400" /> {articleModal.title}</h3>
              <button onClick={() => setArticleModal(null)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed mb-4">{articleModal.content.summary}</p>
            {articleModal.content.steps && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Steps</h4>
                <ol className="space-y-1.5">
                  {articleModal.content.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                      <span className="w-5 h-5 rounded-full bg-n0va-600/20 text-n0va-400 text-xs flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
