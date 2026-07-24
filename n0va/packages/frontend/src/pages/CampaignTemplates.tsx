import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Plus, Trash2, Copy, Check, Search, Megaphone, X } from "lucide-react";
import { useTemplates, CampaignTemplate } from "../hooks/useTemplates";
import { useToast } from "../components/Toast";

const PLATFORM_LABELS: Record<string, string> = {
  meta: "Meta Ads", google: "Google Ads", linkedin: "LinkedIn Ads",
  tiktok: "TikTok Ads", snapchat: "Snapchat Ads", x: "X/Twitter",
};

const TYPE_OPTIONS = [
  { id: "performance", label: "Performance", desc: "Drive conversions and ROAS" },
  { id: "brand", label: "Brand Awareness", desc: "Maximize reach and impressions" },
  { id: "retargeting", label: "Retargeting", desc: "Re-engage past visitors" },
  { id: "prospecting", label: "Prospecting", desc: "Find new audiences" },
];

export default function CampaignTemplates() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { templates, createTemplate, deleteTemplate, useTemplate } = useTemplates();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", type: "performance", dailyBudget: 100, lifetimeBudget: 3000,
    currency: "USD", platforms: [] as string[], goal: "", tags: "",
  });

  function togglePlatform(id: string) {
    setForm((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(id) ? prev.platforms.filter((p) => p !== id) : [...prev.platforms, id],
    }));
  }

  function handleSave() {
    if (!form.name.trim()) return;
    createTemplate({
      name: form.name,
      description: form.description,
      type: form.type,
      dailyBudget: form.dailyBudget,
      lifetimeBudget: form.lifetimeBudget,
      currency: form.currency,
      platforms: form.platforms,
      goal: form.goal,
      tags: form.tags,
    });
    setShowCreate(false);
    setForm({ name: "", description: "", type: "performance", dailyBudget: 100, lifetimeBudget: 3000, currency: "USD", platforms: [], goal: "", tags: "" });
    addToast("success", "Template created");
  }

  function handleUse(tpl: CampaignTemplate) {
    useTemplate(tpl.id);
    const params = new URLSearchParams();
    params.set("template", tpl.id);
    navigate(`/campaigns/new?${params.toString()}`);
  }

  const filtered = templates.filter((t) => {
    if (search) return t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Campaign Templates</h1>
            <p className="text-sm text-gray-500">Save and reuse campaign configurations</p>
          </div>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input className="input pl-10" placeholder="Search templates..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {templates.length === 0 && !showCreate ? (
        <div className="card text-center py-12">
          <FileText className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm mb-4">No templates yet. Save a campaign configuration to reuse later.</p>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>Create Your First Template</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((tpl) => (
            <div key={tpl.id} className="card hover:border-gray-700 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 bg-n0va-600/20 rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-n0va-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate">{tpl.name}</h3>
                    <p className="text-[10px] text-gray-500 capitalize">{tpl.type} template</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleUse(tpl)} className="p-1.5 text-gray-500 hover:text-n0va-400 transition-colors" title="Use template">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { deleteTemplate(tpl.id); addToast("success", "Template deleted"); }} className="p-1.5 text-gray-500 hover:text-red-400 transition-colors" title="Delete template">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {tpl.description && <p className="text-xs text-gray-500 mb-3">{tpl.description}</p>}

              <div className="flex flex-wrap gap-1.5 mb-3">
                {tpl.platforms.map((p) => (
                  <span key={p} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">{PLATFORM_LABELS[p] || p}</span>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-800/50 rounded p-2">
                  <p className="text-gray-600">Daily Budget</p>
                  <p className="text-white font-medium">${tpl.dailyBudget}</p>
                </div>
                <div className="bg-gray-800/50 rounded p-2">
                  <p className="text-gray-600">Lifetime</p>
                  <p className="text-white font-medium">${tpl.lifetimeBudget.toLocaleString()}</p>
                </div>
              </div>

              {tpl.goal && <p className="text-[10px] text-gray-600 mt-2">Goal: {tpl.goal}</p>}

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-800">
                <span className="text-[10px] text-gray-600">Used {tpl.usedCount} times</span>
                <button onClick={() => handleUse(tpl)} className="text-xs text-n0va-400 hover:text-n0va-300 flex items-center gap-1">
                  <Copy className="w-3 h-3" /> Use Template
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-lg bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">New Template</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Template Name *</label>
                <input className="input" placeholder="e.g., Q4 Performance Template" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <textarea className="input h-16 resize-none" placeholder="What is this template for?" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Campaign Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {TYPE_OPTIONS.map((t) => (
                    <button key={t.id} onClick={() => setForm((f) => ({ ...f, type: t.id }))} className={`p-2 rounded-lg border text-left text-xs transition-all ${form.type === t.id ? "border-n0va-500 bg-n0va-600/10" : "border-gray-800 bg-gray-800/50"}`}>
                      <p className="text-white font-medium">{t.label}</p>
                      <p className="text-gray-500 mt-0.5">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Daily Budget ($)</label>
                  <input type="number" className="input" value={form.dailyBudget} onChange={(e) => setForm((f) => ({ ...f, dailyBudget: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Lifetime Budget ($)</label>
                  <input type="number" className="input" value={form.lifetimeBudget} onChange={(e) => setForm((f) => ({ ...f, lifetimeBudget: Number(e.target.value) }))} />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(PLATFORM_LABELS).map(([id, label]) => (
                    <button key={id} onClick={() => togglePlatform(id)} className={`px-2.5 py-1 rounded-lg text-xs transition-all ${form.platforms.includes(id) ? "bg-n0va-600 text-white" : "bg-gray-800 text-gray-400"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Goal</label>
                <input className="input" placeholder="e.g., Drive Q4 revenue" value={form.goal} onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Tags</label>
                <input className="input" placeholder="e.g., q4, evergreen, high-budget" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-800">
              <button onClick={() => setShowCreate(false)} className="btn-ghost text-sm">Cancel</button>
              <button onClick={handleSave} disabled={!form.name.trim()} className="btn-primary text-sm">Save Template</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
