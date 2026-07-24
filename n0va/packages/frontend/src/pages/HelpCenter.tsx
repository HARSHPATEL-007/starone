import { useState } from "react";
import { HelpCircle, Search, ChevronDown, ChevronRight, Mail, MessageSquare, FileText, BookOpen, LifeBuoy, Keyboard, ExternalLink, CheckCircle, Copy, Megaphone, BarChart3, Users, X } from "lucide-react";
import { useToast } from "../components/Toast";

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

  function toggleCat(id: string) { setExpandedCat(prev => prev === id ? "" : id); }

  const filteredFaqs = FAQS.filter(f => !search || f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase()));
  const filteredCats = CATEGORIES.filter(c => {
    if (!search) return true;
    return c.label.toLowerCase().includes(search.toLowerCase()) || c.articles.some(a => a.toLowerCase().includes(search.toLowerCase()));
  });

  function handleContact(e: React.FormEvent) {
    e.preventDefault();
    if (!contactForm.subject.trim() || !contactForm.message.trim()) { addToast("error", "Subject and message are required"); return; }
    addToast("success", "Support ticket submitted. We'll respond within 24 hours.");
    setContactForm({ subject: "", message: "", email: "" });
    setShowContact(false);
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
                      <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-800/30 cursor-pointer text-sm text-gray-400 hover:text-gray-200 transition-colors">
                        <FileText className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                        {article}
                      </div>
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
                    <span className="flex-1 text-sm text-gray-300">{faq.q}</span>
                    {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-gray-600 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-600 shrink-0" />}
                  </button>
                  {isOpen && <div className="px-3 pb-3 text-xs text-gray-500 leading-relaxed">{faq.a}</div>}
                </div>
              );
            })}
          </div>

          <div className="card p-4 space-y-2">
            <p className="text-xs font-medium text-gray-400">System Info</p>
            <div className="flex justify-between text-xs"><span className="text-gray-600">Version</span><span className="text-gray-300">1.0.0</span></div>
            <div className="flex justify-between text-xs"><span className="text-gray-600">Environment</span><span className="text-gray-300">Production</span></div>
            <div className="flex justify-between text-xs"><span className="text-gray-600">API Status</span><span className="text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Online</span></div>
          </div>
        </div>
      </div>

      {showContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowContact(false)}>
          <div className="w-full max-w-md bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-white">Contact Support</h3><button onClick={() => setShowContact(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button></div>
            <form onSubmit={handleContact} className="space-y-4">
              <div><label className="label">Email</label><input className="input" type="email" value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} placeholder="your@email.com" /></div>
              <div><label className="label">Subject</label><input className="input" value={contactForm.subject} onChange={e => setContactForm({ ...contactForm, subject: e.target.value })} placeholder="How can we help?" autoFocus /></div>
              <div><label className="label">Message</label><textarea className="input" rows={4} value={contactForm.message} onChange={e => setContactForm({ ...contactForm, message: e.target.value })} placeholder="Describe your issue in detail..." /></div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowContact(false)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">Submit Ticket</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
