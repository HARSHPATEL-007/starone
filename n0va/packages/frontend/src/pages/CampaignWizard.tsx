import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { ArrowLeft, Check, ChevronRight, DollarSign, Globe, Target, Tag } from "lucide-react";

const PLATFORM_OPTIONS = [
  { id: "meta", label: "Meta Ads", icon: "M" },
  { id: "google", label: "Google Ads", icon: "G" },
  { id: "linkedin", label: "LinkedIn Ads", icon: "L" },
  { id: "tiktok", label: "TikTok Ads", icon: "T" },
  { id: "snapchat", label: "Snapchat Ads", icon: "S" },
  { id: "x", label: "X/Twitter", icon: "X" },
];

const CAMPAIGN_TYPES = [
  { id: "performance", label: "Performance", desc: "Drive conversions and ROAS" },
  { id: "brand", label: "Brand Awareness", desc: "Maximize reach and impressions" },
  { id: "retargeting", label: "Retargeting", desc: "Re-engage past visitors" },
  { id: "prospecting", label: "Prospecting", desc: "Find new audiences" },
];

const STEPS = ["Basics", "Budget", "Platforms", "Targeting", "Review"];

export default function CampaignWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "performance",
    goal: "",
    dailyBudget: 100,
    lifetimeBudget: 3000,
    currency: "USD",
    platforms: [] as string[],
    tags: "",
    description: "",
  });

  function update<T extends keyof typeof form>(key: T, value: (typeof form)[T]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function togglePlatform(id: string) {
    setForm((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(id)
        ? prev.platforms.filter((p) => p !== id)
        : [...prev.platforms, id],
    }));
  }

  function canProceed(): boolean {
    switch (step) {
      case 0: return form.name.trim().length > 0;
      case 1: return form.lifetimeBudget > 0;
      case 2: return form.platforms.length > 0;
      default: return true;
    }
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const campaign = await api.campaigns.create({
        name: form.name,
        type: form.type,
        goal: form.goal || undefined,
        budget: { daily: form.dailyBudget, lifetime: form.lifetimeBudget, currency: form.currency },
        platforms: form.platforms,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      navigate(`/campaigns/${campaign._id || campaign.id}`);
    } catch {
      setCreating(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => navigate("/campaigns")} className="flex items-center gap-2 text-gray-500 hover:text-white mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Campaigns
      </button>

      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${i < step ? "bg-green-500 text-white" : i === step ? "bg-n0va-600 text-white" : "bg-gray-800 text-gray-500"}`}>
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:inline ${i <= step ? "text-white" : "text-gray-500"}`}>{s}</span>
            {i < STEPS.length - 1 && <div className={`w-8 h-px ${i < step ? "bg-green-500" : "bg-gray-800"}`} />}
          </div>
        ))}
      </div>

      <div className="card">
        {step === 0 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-white">Campaign Basics</h2>
            <p className="text-sm text-gray-500">Start with a name and goal for your campaign</p>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Campaign Name *</label>
              <input className="input" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g., Summer Sale 2026" autoFocus />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Campaign Type</label>
              <div className="grid grid-cols-2 gap-2">
                {CAMPAIGN_TYPES.map((t) => (
                  <button key={t.id} className={`p-3 rounded-lg border text-left transition-colors ${form.type === t.id ? "border-n0va-600/40 bg-n0va-600/20" : "border-gray-800 bg-gray-800/30 hover:border-gray-700"}`} onClick={() => update("type", t.id)}>
                    <p className="text-sm text-white font-medium">{t.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Goal (optional)</label>
              <input className="input" value={form.goal} onChange={(e) => update("goal", e.target.value)} placeholder="e.g., 500 conversions at under $25 CPA" />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-white">Budget</h2>
            <p className="text-sm text-gray-500">Set your campaign budget and currency</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Daily Budget *</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input type="number" className="input pl-9" value={form.dailyBudget} onChange={(e) => update("dailyBudget", Number(e.target.value))} min={1} />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Lifetime Budget *</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input type="number" className="input pl-9" value={form.lifetimeBudget} onChange={(e) => update("lifetimeBudget", Number(e.target.value))} min={1} />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Currency</label>
              <select className="select" value={form.currency} onChange={(e) => update("currency", e.target.value)}>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
                <option value="CAD">CAD — Canadian Dollar</option>
                <option value="AUD">AUD — Australian Dollar</option>
              </select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-white">Platforms</h2>
            <p className="text-sm text-gray-500">Select the ad platforms for this campaign</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {PLATFORM_OPTIONS.map((p) => (
                <button key={p.id} className={`p-4 rounded-lg border text-center transition-colors ${form.platforms.includes(p.id) ? "border-n0va-600/40 bg-n0va-600/20" : "border-gray-800 bg-gray-800/30 hover:border-gray-700"}`} onClick={() => togglePlatform(p.id)}>
                  <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center mx-auto mb-2 text-sm font-bold text-n0va-400">{p.icon}</div>
                  <p className="text-sm text-white font-medium">{p.label}</p>
                  {form.platforms.includes(p.id) && <p className="text-xs text-n0va-400 mt-1">Selected</p>}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-white">Targeting & Tags</h2>
            <p className="text-sm text-gray-500">Add optional targeting description and tags</p>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Description</label>
              <textarea className="input" rows={3} value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Describe your target audience, key messaging, etc." />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Tags (comma-separated)</label>
              <input className="input" value={form.tags} onChange={(e) => update("tags", e.target.value)} placeholder="e.g., summer, high-intent, video" />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-white">Review & Launch</h2>
            <p className="text-sm text-gray-500">Review your campaign settings before creating</p>
            <div className="bg-gray-800 rounded-lg divide-y divide-gray-700">
              <ReviewRow label="Name" value={form.name} />
              <ReviewRow label="Type" value={form.type} />
              <ReviewRow label="Goal" value={form.goal || "Not specified"} />
              <ReviewRow label="Daily Budget" value={`$${form.dailyBudget} ${form.currency}`} />
              <ReviewRow label="Lifetime Budget" value={`$${form.lifetimeBudget} ${form.currency}`} />
              <ReviewRow label="Platforms" value={form.platforms.length > 0 ? form.platforms.join(", ") : "None"} />
              <ReviewRow label="Tags" value={form.tags || "None"} />
            </div>
          </div>
        )}

        <div className="flex justify-between mt-8 pt-6 border-t border-gray-800">
          <button className="btn-secondary" onClick={() => step === 0 ? navigate("/campaigns") : setStep(step - 1)} disabled={creating}>
            {step === 0 ? "Cancel" : "Back"}
          </button>
          {step < STEPS.length - 1 ? (
            <button className="btn-primary flex items-center gap-2" onClick={() => setStep(step + 1)} disabled={!canProceed()}>
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button className="btn-primary flex items-center gap-2" onClick={handleCreate} disabled={creating}>
              {creating ? "Creating..." : <><Check className="w-4 h-4" /> Create Campaign</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm text-white font-medium capitalize">{value}</span>
    </div>
  );
}
