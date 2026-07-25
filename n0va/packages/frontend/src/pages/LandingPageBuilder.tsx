import { useState, useEffect, useCallback } from "react";
import { Plus, ExternalLink, Eye, Edit3, Trash2, Send, Globe, Layout, Image, Type, CheckSquare, Palette, ArrowLeft, Copy, X, FileText, Smartphone, Monitor, ChevronDown, ChevronUp, Save, LayoutDashboard, EyeOff, Archive } from "lucide-react";
import { useToast } from "../components/Toast";
import { SkeletonCard, SkeletonRow } from "../components/Skeleton";
import { api } from "../api/client";

type PageStatus = "draft" | "published" | "archived";

interface LandingPage {
  _id: string;
  name: string;
  slug: string;
  status: PageStatus;
  template: string;
  campaignId?: string;
  campaignName?: string;
  sections: Section[];
  publishedUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface Section {
  id: string;
  type: "hero" | "features" | "form" | "testimonials" | "cta" | "footer" | "gallery" | "pricing";
  headline: string;
  subheadline: string;
  ctaText: string;
  ctaUrl: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
  imageUrl?: string;
  content?: Record<string, unknown>;
}

interface Template {
  _id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  color: string;
  sections: Section[];
}

const STATUS_STYLES: Record<PageStatus, string> = {
  draft: "bg-gray-500/10 text-gray-400 border-gray-500/30",
  published: "bg-green-500/10 text-green-400 border-green-500/30",
  archived: "bg-gray-500/10 text-gray-400 border-gray-500/30",
};

const SECTION_ICONS: Record<string, any> = {
  hero: Eye,
  features: Layout,
  form: CheckSquare,
  testimonials: FileText,
  cta: Type,
  footer: Globe,
  gallery: Image,
  pricing: LayoutDashboard,
};

const SECTION_PLACEHOLDER_COLORS: Record<string, string> = {
  hero: "from-violet-600/40 to-indigo-600/40",
  features: "from-blue-600/40 to-cyan-600/40",
  form: "from-emerald-600/40 to-teal-600/40",
  testimonials: "from-amber-600/40 to-orange-600/40",
  cta: "from-pink-600/40 to-rose-600/40",
  footer: "from-gray-600/40 to-slate-600/40",
  gallery: "from-fuchsia-600/40 to-purple-600/40",
  pricing: "from-green-600/40 to-emerald-600/40",
};

const DEFAULT_SECTION_VALUES: Record<string, Partial<Section>> = {
  hero: { headline: "Hero Headline", subheadline: "Compelling subheadline goes here", ctaText: "Get Started", ctaUrl: "#", bgColor: "#0f172a", textColor: "#ffffff", accentColor: "#8b5cf6" },
  features: { headline: "Features", subheadline: "What we offer", ctaText: "Learn More", ctaUrl: "#", bgColor: "#1e293b", textColor: "#f1f5f9", accentColor: "#3b82f6" },
  form: { headline: "Sign Up", subheadline: "Join our newsletter", ctaText: "Subscribe", ctaUrl: "#", bgColor: "#0f172a", textColor: "#ffffff", accentColor: "#10b981" },
  testimonials: { headline: "Testimonials", subheadline: "What people say", ctaText: "", ctaUrl: "#", bgColor: "#1e293b", textColor: "#f1f5f9", accentColor: "#f59e0b" },
  cta: { headline: "Ready to Start?", subheadline: "Take the next step today", ctaText: "Get in Touch", ctaUrl: "#", bgColor: "#8b5cf6", textColor: "#ffffff", accentColor: "#ffffff" },
  footer: { headline: "", subheadline: "© 2025 Your Company. All rights reserved.", ctaText: "", ctaUrl: "#", bgColor: "#020617", textColor: "#94a3b8", accentColor: "#8b5cf6" },
  gallery: { headline: "Gallery", subheadline: "See our work", ctaText: "View All", ctaUrl: "#", bgColor: "#1e293b", textColor: "#f1f5f9", accentColor: "#d946ef" },
  pricing: { headline: "Pricing", subheadline: "Choose your plan", ctaText: "Get Started", ctaUrl: "#", bgColor: "#0f172a", textColor: "#ffffff", accentColor: "#10b981" },
};

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function fmtDate(dateStr: string): string {
  try { return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); } catch { return dateStr; }
}

export default function LandingPageBuilder() {
  const { addToast } = useToast();
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "detail">("list");
  const [selectedPage, setSelectedPage] = useState<LandingPage | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    name: "",
    slug: "",
    templateId: "",
    campaignId: "",
  });

  useEffect(() => {
    Promise.all([
      api.landingPageBuilder.list(),
      api.landingPageBuilder.templates(),
    ]).then(([pagesData, templatesData]) => {
      setPages(pagesData || []);
      setTemplates(templatesData || []);
    }).catch(() => {
      addToast("error", "Failed to load landing pages");
    }).finally(() => setLoading(false));
  }, []);

  function resetCreateForm() {
    setCreateForm({ name: "", slug: "", templateId: templates[0]?._id || "", campaignId: "" });
  }

  function handleNameChange(name: string) {
    setCreateForm(prev => ({
      ...prev,
      name,
      slug: slugify(name) || prev.slug,
    }));
  }

  async function handleCreate() {
    if (!createForm.name.trim()) { addToast("error", "Page name is required"); return; }
    if (!createForm.templateId) { addToast("error", "Please select a template"); return; }
    try {
      const newPage = await api.landingPageBuilder.create({
        name: createForm.name.trim(),
        slug: createForm.slug.trim() || slugify(createForm.name.trim()),
        template: createForm.templateId,
        campaignId: createForm.campaignId || undefined,
      });
      setPages(prev => [...prev, newPage]);
      setShowCreate(false);
      resetCreateForm();
      addToast("success", "Landing page created");
    } catch (err: any) {
      addToast("error", err.message || "Failed to create page");
    }
  }

  async function openPage(page: LandingPage) {
    try {
      const full = await api.landingPageBuilder.get(page._id);
      setSelectedPage(full);
      setView("detail");
    } catch {
      setSelectedPage(page);
      setView("detail");
    }
  }

  async function handleSaveSection(pageId: string, sectionId: string, data: Partial<Section>) {
    if (!selectedPage) return;
    const updatedSections = selectedPage.sections.map(s =>
      s.id === sectionId ? { ...s, ...data } : s
    );
    try {
      const updated = await api.landingPageBuilder.update(pageId, { sections: updatedSections });
      setSelectedPage(updated);
      setEditingSection(null);
      setPages(prev => prev.map(p => p._id === pageId ? { ...p, ...updated } : p));
      addToast("success", "Section updated");
    } catch (err: any) {
      addToast("error", err.message || "Failed to update section");
    }
  }

  async function handlePublish(pageId: string) {
    setPublishing(pageId);
    try {
      const published = await api.landingPageBuilder.publish(pageId);
      setSelectedPage(published);
      setPages(prev => prev.map(p => p._id === pageId ? { ...p, ...published, status: "published" } : p));
      addToast("success", `Published! URL: ${published.publishedUrl || ""}`);
    } catch (err: any) {
      addToast("error", err.message || "Failed to publish");
    } finally {
      setPublishing(null);
    }
  }

  async function handleDelete(pageId: string) {
    try {
      await api.landingPageBuilder.delete(pageId);
      setPages(prev => prev.filter(p => p._id !== pageId));
      if (selectedPage?._id === pageId) { setSelectedPage(null); setView("list"); }
      addToast("success", "Page deleted");
    } catch (err: any) {
      addToast("error", err.message || "Failed to delete");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-800 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (view === "detail" && selectedPage) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => { setView("list"); setSelectedPage(null); }} className="p-2 text-gray-500 hover:text-white rounded-lg hover:bg-gray-800 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <LayoutDashboard className="w-6 h-6 text-n0va-400" />
                {selectedPage.name}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                /{selectedPage.slug} · {selectedPage.sections?.length || 0} sections · Created {fmtDate(selectedPage.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded-full border font-medium ${STATUS_STYLES[selectedPage.status] || STATUS_STYLES.draft}`}>
              {selectedPage.status}
            </span>
            {selectedPage.publishedUrl && (
              <a href={selectedPage.publishedUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost text-xs flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" /> Preview
              </a>
            )}
            <button onClick={() => handlePublish(selectedPage._id)} disabled={publishing === selectedPage._id} className="btn-primary text-xs flex items-center gap-1.5">
              {publishing === selectedPage._id ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              {selectedPage.status === "published" ? "Republish" : "Publish"}
            </button>
          </div>
        </div>

        {selectedPage.publishedUrl && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
            <Globe className="w-4 h-4 text-green-400" />
            <span className="text-xs text-gray-400">Published at:</span>
            <a href={selectedPage.publishedUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-green-400 hover:text-green-300 underline truncate">
              {selectedPage.publishedUrl}
            </a>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Layout className="w-4 h-4 text-n0va-400" />
              Page Sections
            </h2>
            <span className="text-xs text-gray-600">{selectedPage.sections?.length || 0} sections</span>
          </div>

          {(selectedPage.sections || []).map((section, idx) => {
            const SectionIcon = SECTION_ICONS[section.type] || FileText;
            const isEditing = editingSection === section.id;
            const editValues = isEditing ? { ...section } : null;

            return (
              <div key={section.id} className="card overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-800/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${SECTION_PLACEHOLDER_COLORS[section.type] || "from-gray-600/40 to-gray-600/40"} flex items-center justify-center`}>
                      <SectionIcon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-white uppercase tracking-wider">{section.type}</span>
                      <span className="text-xs text-gray-600 ml-2">Section {idx + 1}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingSection(isEditing ? null : section.id)}
                    className={`p-1.5 rounded transition-colors ${isEditing ? "bg-n0va-500/20 text-n0va-400" : "text-gray-600 hover:text-gray-300 hover:bg-gray-800"}`}
                  >
                    {isEditing ? <X className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {isEditing ? (
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="label">Headline</label>
                        <input className="input text-sm" value={editValues!.headline} onChange={e => { editValues!.headline = e.target.value; setEditingSection(section.id); }} placeholder="Headline" />
                      </div>
                      <div>
                        <label className="label">Subheadline</label>
                        <input className="input text-sm" value={editValues!.subheadline} onChange={e => { editValues!.subheadline = e.target.value; setEditingSection(section.id); }} placeholder="Subheadline" />
                      </div>
                      <div>
                        <label className="label">CTA Text</label>
                        <input className="input text-sm" value={editValues!.ctaText} onChange={e => { editValues!.ctaText = e.target.value; setEditingSection(section.id); }} placeholder="CTA text" />
                      </div>
                      <div>
                        <label className="label">CTA URL</label>
                        <input className="input text-sm" value={editValues!.ctaUrl} onChange={e => { editValues!.ctaUrl = e.target.value; setEditingSection(section.id); }} placeholder="#" />
                      </div>
                      <div>
                        <label className="label">Background Color</label>
                        <div className="flex items-center gap-2">
                          <input type="color" className="w-8 h-8 rounded cursor-pointer border border-gray-700 bg-transparent" value={editValues!.bgColor} onChange={e => { editValues!.bgColor = e.target.value; setEditingSection(section.id); }} />
                          <input className="input text-sm flex-1 font-mono" value={editValues!.bgColor} onChange={e => { editValues!.bgColor = e.target.value; setEditingSection(section.id); }} />
                        </div>
                      </div>
                      <div>
                        <label className="label">Text Color</label>
                        <div className="flex items-center gap-2">
                          <input type="color" className="w-8 h-8 rounded cursor-pointer border border-gray-700 bg-transparent" value={editValues!.textColor} onChange={e => { editValues!.textColor = e.target.value; setEditingSection(section.id); }} />
                          <input className="input text-sm flex-1 font-mono" value={editValues!.textColor} onChange={e => { editValues!.textColor = e.target.value; setEditingSection(section.id); }} />
                        </div>
                      </div>
                      <div>
                        <label className="label">Accent Color</label>
                        <div className="flex items-center gap-2">
                          <input type="color" className="w-8 h-8 rounded cursor-pointer border border-gray-700 bg-transparent" value={editValues!.accentColor} onChange={e => { editValues!.accentColor = e.target.value; setEditingSection(section.id); }} />
                          <input className="input text-sm flex-1 font-mono" value={editValues!.accentColor} onChange={e => { editValues!.accentColor = e.target.value; setEditingSection(section.id); }} />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button onClick={() => setEditingSection(null)} className="btn-secondary text-xs">Cancel</button>
                      <button
                        onClick={() => handleSaveSection(selectedPage._id, section.id, editValues!)}
                        className="btn-primary text-xs flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" /> Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4">
                    <div
                      className="rounded-lg overflow-hidden border border-gray-800"
                      style={{ backgroundColor: section.bgColor || "#0f172a", color: section.textColor || "#ffffff" }}
                    >
                      <div className="p-6 space-y-3 text-center">
                        {section.headline && (
                          <h3 className="text-lg font-bold" style={{ color: section.textColor }}>{section.headline}</h3>
                        )}
                        {section.subheadline && (
                          <p className="text-sm opacity-80" style={{ color: section.textColor }}>{section.subheadline}</p>
                        )}
                        {section.ctaText && (
                          <div className="pt-2">
                            <span
                              className="inline-block px-5 py-2 rounded-lg text-sm font-semibold"
                              style={{ backgroundColor: section.accentColor || "#8b5cf6", color: section.bgColor && parseInt(section.bgColor.replace("#", ""), 16) > 0x888888 ? "#0f172a" : "#ffffff" }}
                            >
                              {section.ctaText}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {(!selectedPage.sections || selectedPage.sections.length === 0) && (
            <div className="card p-12 flex flex-col items-center justify-center text-center">
              <Layout className="w-10 h-10 text-gray-700 mb-3" />
              <p className="text-sm text-gray-500">No sections defined for this page.</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2 pb-6">
          <button onClick={() => handlePublish(selectedPage._id)} disabled={publishing === selectedPage._id} className="btn-primary text-sm flex items-center gap-1.5">
            {publishing === selectedPage._id ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {selectedPage.status === "published" ? "Republish Page" : "Publish Page"}
          </button>
          {selectedPage.publishedUrl && (
            <a href={selectedPage.publishedUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost text-sm flex items-center gap-1.5">
              <ExternalLink className="w-4 h-4" /> Open Published Page
            </a>
          )}
          <button onClick={() => handleDelete(selectedPage._id)} className="btn-secondary text-sm text-red-400 border-red-500/30 hover:bg-red-500/10 flex items-center gap-1.5 ml-auto">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <LayoutDashboard className="w-6 h-6 text-n0va-400" />
            Campaign Landing Pages
          </h1>
          <p className="text-gray-400 mt-1">
            {pages.length} pages · {templates.length} templates available
          </p>
        </div>
        <button onClick={() => { resetCreateForm(); setShowCreate(true); }} className="btn-primary text-sm">
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Page
        </button>
      </div>

      {pages.length === 0 ? (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <LayoutDashboard className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No landing pages yet</h3>
          <p className="text-sm text-gray-500 mb-6">Create your first campaign landing page from a template.</p>
          <button onClick={() => { resetCreateForm(); setShowCreate(true); }} className="btn-primary text-sm">
            <Plus className="w-4 h-4 mr-1.5" /> Create Your First Page
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {pages.map(page => (
            <div key={page._id} className="card p-4 group cursor-pointer hover:border-gray-700 transition-all" onClick={() => openPage(page)}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-n0va-500/20 to-purple-500/20 flex items-center justify-center">
                    <Globe className="w-4.5 h-4.5 text-n0va-400" style={{ width: "18px", height: "18px" }} />
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${STATUS_STYLES[page.status] || STATUS_STYLES.draft}`}>
                    {page.status}
                  </span>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                  <button onClick={() => openPage(page)} className="p-1.5 text-gray-600 hover:text-gray-300"><Eye className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(page._id)} className="p-1.5 text-gray-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <h3 className="text-sm font-semibold text-white mb-1 truncate">{page.name}</h3>
              <p className="text-xs text-gray-600 mb-3">/{page.slug}</p>
              {page.publishedUrl && (
                <a
                  href={page.publishedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 mb-3 truncate"
                >
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  {page.publishedUrl}
                </a>
              )}
              <div className="flex items-center gap-2 text-[10px] text-gray-600">
                <span>{page.sections?.length || 0} sections</span>
                <span>·</span>
                <span>{fmtDate(page.createdAt)}</span>
                {page.campaignName && (
                  <>
                    <span>·</span>
                    <span className="truncate max-w-[100px]">{page.campaignName}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-n0va-400" />
                Create Landing Page
              </h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="label mb-2">Choose Template</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {templates.map(tmpl => (
                    <button
                      key={tmpl._id}
                      onClick={() => setCreateForm(prev => ({ ...prev, templateId: tmpl._id }))}
                      className={`relative rounded-xl border overflow-hidden text-left transition-all ${
                        createForm.templateId === tmpl._id
                          ? "border-n0va-500 ring-1 ring-n0va-500/30 bg-n0va-500/5"
                          : "border-gray-700 hover:border-gray-600 bg-gray-800/30"
                      }`}
                    >
                      <div
                        className="h-24 flex items-center justify-center gap-1"
                        style={{ background: `linear-gradient(135deg, ${tmpl.color}33, ${tmpl.color}11)` }}
                      >
                        {(tmpl.sections || []).slice(0, 4).map((sec, i) => {
                          const Icon = SECTION_ICONS[sec.type] || FileText;
                          return (
                            <div
                              key={sec.id}
                              className="w-8 h-8 rounded flex items-center justify-center"
                              style={{ backgroundColor: `${tmpl.color}44` }}
                            >
                              <Icon className="w-4 h-4" style={{ color: tmpl.color }} />
                            </div>
                          );
                        })}
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-semibold text-white">{tmpl.name}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{tmpl.sections?.length || 0} sections</p>
                      </div>
                      {createForm.templateId === tmpl._id && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-n0va-500 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                {templates.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No templates available.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Page Name</label>
                  <input
                    className="input text-sm"
                    placeholder="e.g. Q3 Product Launch"
                    value={createForm.name}
                    onChange={e => handleNameChange(e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="label">Slug</label>
                  <input
                    className="input text-sm font-mono"
                    placeholder="auto-generated"
                    value={createForm.slug}
                    onChange={e => setCreateForm(prev => ({ ...prev, slug: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="label">Campaign (optional)</label>
                <input
                  className="input text-sm"
                  placeholder="Campaign ID"
                  value={createForm.campaignId}
                  onChange={e => setCreateForm(prev => ({ ...prev, campaignId: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowCreate(false)} className="btn-secondary text-sm">Cancel</button>
                <button onClick={handleCreate} className="btn-primary text-sm flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> Create Page
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
