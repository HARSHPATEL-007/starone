import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { ArrowLeft, Check, ChevronRight, DollarSign, Target, Users, FileText } from "lucide-react";
import { useToast } from "../components/Toast";
import { useTemplates } from "../hooks/useTemplates";

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

const METRIC_GOALS = [
  { id: "cpa", label: "Target CPA", desc: "Maximize conversions at a target cost per acquisition", placeholder: "25" },
  { id: "roas", label: "Target ROAS", desc: "Maximize revenue at a target return on ad spend", placeholder: "3.0" },
  { id: "ctr", label: "Target CTR", desc: "Optimize for click-through rate", placeholder: "2.5" },
];

const STEPS = ["Basics", "Budget", "Schedule", "Platforms", "Audience", "Goals", "Review"];

export default function CampaignWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToast } = useToast();
  const { getTemplate } = useTemplates();
  const [step, setStep] = useState(0);
  const [creating, setCreating] = useState(false);
  const [audiences, setAudiences] = useState<any[]>([]);
  const [templateLabel, setTemplateLabel] = useState("");
  const today = new Date().toISOString().split("T")[0];
  const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
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
    audienceId: "",
    metricGoal: "",
    metricTarget: "",
    startDate: today,
    endDate: nextMonth,
  });

  useEffect(() => {
    api.audiences.list().then(setAudiences).catch(() => {});
    const tplId = searchParams.get("template");
    if (tplId) {
      const tpl = getTemplate(tplId);
      if (tpl) {
        setForm((prev) => ({
          ...prev,
          name: tpl.name.replace(" (Template)", ""),
          type: tpl.type,
          dailyBudget: tpl.dailyBudget,
          lifetimeBudget: tpl.lifetimeBudget,
          currency: tpl.currency,
          platforms: tpl.platforms,
          goal: tpl.goal,
          tags: tpl.tags,
          description: tpl.description,
        }));
        setTemplateLabel(tpl.name);
        addToast("info", `Template "${tpl.name}" loaded`);
      }
    }
  }, []);

  function update<T extends keyof typeof form>(key: T, value: (typeof form)[T]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function togglePlatform(id: string) {
    setForm((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(id) ? prev.platforms.filter((p) => p !== id) : [...prev.platforms, id],
    }));
  }

  function canProceed(): boolean {
    switch (step) {
      case 0: return form.name.trim().length > 0;
      case 1: return form.lifetimeBudget > 0;
      case 3: return form.platforms.length > 0;
      default: return true;
    }
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const payload: any = {
        name: form.name,
        type: form.type,
        goal: form.goal || undefined,
        budget: { daily: form.dailyBudget, lifetime: form.lifetimeBudget, currency: form.currency },
        platforms: form.platforms,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        description: form.description || undefined,
        audienceId: form.audienceId || undefined,
      };
      if (form.metricGoal && form.metricTarget) {
        payload.metricGoal = { type: form.metricGoal, target: parseFloat(form.metricTarget) };
      }
      const campaign = await api.campaigns.create(payload);
      navigate(`/campaigns/${campaign._id || campaign.id}`);
    } catch {
      setCreating(false);
      addToast("error", "Failed to create campaign");
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => navigate("/campaigns")} className="flex items-center gap-2 text-gray-500 hover:text-white mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Campaigns
      </button>

      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 shrink-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${i < step ? "bg-green-500 text-white" : i === step ? "bg-n0va-600 text-white" : "bg-gray-800 text-gray-500"}`}>
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:inline ${i <= step ? "text-white" : "text-gray-500"}`}>{s}</span>
            {i < STEPS.length - 1 && <div className={`w-6 h-px ${i < step ? "bg-green-500" : "bg-gray-800"}`} />}
          </div>
        ))}
      </div>

      <div className="card">
        {step === 0 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Campaign Basics</h2>
                <p className="text-sm text-gray-500">Start with a name and goal for your campaign</p>
              </div>
              <button onClick={() => navigate("/templates")} className="btn-secondary text-xs flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> From Template
              </button>
            </div>
            {templateLabel && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-n0va-600/10 border border-n0va-600/30">
                <FileText className="w-4 h-4 text-n0va-400" />
                <p className="text-xs text-n0va-400">Loaded from template: <span className="font-medium">{templateLabel}</span></p>
              </div>
            )}
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
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <input type="number" className="input pl-8" value={form.dailyBudget} onChange={(e) => update("dailyBudget", Number(e.target.value))} min={1} />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Lifetime Budget *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <input type="number" className="input pl-8" value={form.lifetimeBudget} onChange={(e) => update("lifetimeBudget", Number(e.target.value))} min={1} />
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
            <h2 className="text-xl font-bold text-white">Schedule</h2>
            <p className="text-sm text-gray-500">Set the campaign start and end dates</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Start Date</label>
                <input type="date" className="input" value={form.startDate} onChange={(e) => update("startDate", e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">End Date</label>
                <input type="date" className="input" value={form.endDate} onChange={(e) => update("endDate", e.target.value)} min={form.startDate} />
              </div>
            </div>
            {form.startDate && form.endDate && new Date(form.endDate) >= new Date(form.startDate) && (
              <div className="p-4 bg-gray-800/50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Duration</span>
                  <span className="text-white font-medium">
                    {Math.round((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86400000) + 1} days
                  </span>
                </div>
                <div className="mt-3 w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-n0va-600 h-2 rounded-full" style={{ width: `${Math.min(100, ((Date.now() - new Date(form.startDate).getTime()) / (new Date(form.endDate).getTime() - new Date(form.startDate).getTime())) * 100)}%` }} />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{new Date(form.startDate).toLocaleDateString()}</span>
                  <span>{new Date(form.endDate).toLocaleDateString()}</span>
                </div>
                {(new Date(form.startDate).getTime() > Date.now()) && (
                  <p className="text-xs text-n0va-400 mt-2">⏳ Starts in {Math.ceil((new Date(form.startDate).getTime() - Date.now()) / 86400000)} days</p>
                )}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h3 className="text-xl font-bold text-white">Platforms</h3>
            <p className="text-sm text-gray-500">Select the ad platforms for this campaign</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {PLATFORM_OPTIONS.map((p) => (
                <button key={p.id} className={`p-4 rounded-lg border text-center transition-colors ${form.platforms.includes(p.id) ? "border-n0va-600/40 bg-n0va-600/20 ring-1 ring-n0va-600/30" : "border-gray-800 bg-gray-800/30 hover:border-gray-700"}`} onClick={() => togglePlatform(p.id)}>
                  <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center mx-auto mb-2 text-sm font-bold text-n0va-400">{p.icon}</div>
                  <p className="text-sm text-white font-medium">{p.label}</p>
                  {form.platforms.includes(p.id) && <p className="text-xs text-n0va-400 mt-1">Selected</p>}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-white">Audience & Targeting</h2>
            <p className="text-sm text-gray-500">Select a saved audience or describe your targeting</p>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Saved Audience (optional)</label>
              <select className="select" value={form.audienceId} onChange={(e) => update("audienceId", e.target.value)}>
                <option value="">No saved audience</option>
                {audiences.map((a) => (
                  <option key={a._id} value={a._id}>{a.name} — {(a.size || 0).toLocaleString()} users</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Targeting Description</label>
              <textarea className="input" rows={3} value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Describe your target audience, demographics, interests, behaviors..." />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Tags (comma-separated)</label>
              <input className="input" value={form.tags} onChange={(e) => update("tags", e.target.value)} placeholder="e.g., summer, high-intent, video" />
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-white">Metrics & Goals</h2>
            <p className="text-sm text-gray-500">Set a performance target for this campaign</p>
            <div className="grid grid-cols-1 gap-3">
              {METRIC_GOALS.map((mg) => (
                <button key={mg.id} className={`p-4 rounded-lg border text-left transition-colors ${form.metricGoal === mg.id ? "border-n0va-600/40 bg-n0va-600/20 ring-1 ring-n0va-600/30" : "border-gray-800 bg-gray-800/30 hover:border-gray-700"}`} onClick={() => update("metricGoal", mg.id)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white font-medium">{mg.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{mg.desc}</p>
                    </div>
                    {form.metricGoal === mg.id && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Target:</span>
                        <input className="input w-20 text-sm" type="number" step="0.1" placeholder={mg.placeholder} value={form.metricTarget} onChange={(e) => update("metricTarget", e.target.value)} onClick={(e) => e.stopPropagation()} />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-white">Review & Launch</h2>
            <p className="text-sm text-gray-500">Review your campaign settings before creating</p>
            <div className="bg-gray-800 rounded-lg divide-y divide-gray-700">
              <ReviewRow label="Name" value={form.name} />
              <ReviewRow label="Type" value={form.type} />
              <ReviewRow label="Goal" value={form.goal || "Not specified"} />
              <ReviewRow label="Schedule" value={`${new Date(form.startDate).toLocaleDateString()} → ${new Date(form.endDate).toLocaleDateString()} (${Math.round((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86400000) + 1} days)`} />
              <ReviewRow label="Daily Budget" value={`$${form.dailyBudget} ${form.currency}`} />
              <ReviewRow label="Lifetime Budget" value={`$${form.lifetimeBudget} ${form.currency}`} />
              <ReviewRow label="Platforms" value={form.platforms.length > 0 ? form.platforms.join(", ") : "None"} />
              <ReviewRow label="Target Audience" value={audiences.find((a) => a._id === form.audienceId)?.name || "None selected"} />
              <ReviewRow label="Metric Goal" value={form.metricGoal ? `${form.metricGoal.toUpperCase()}: ${form.metricTarget}` : "None"} />
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
      <span className="text-sm text-white font-medium capitalize truncate ml-4 max-w-[60%] text-right">{value}</span>
    </div>
  );
}
