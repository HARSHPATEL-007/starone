import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { ArrowLeft, Check, ChevronRight, FileJson, Zap, ListOrdered, Shield, Plus, Trash2, Lightbulb } from "lucide-react";
import { useToast } from "../components/Toast";

const PLATFORM_OPTIONS = [
  { id: "meta", label: "Meta Ads" },
  { id: "google", label: "Google Ads" },
  { id: "linkedin", label: "LinkedIn Ads" },
  { id: "tiktok", label: "TikTok Ads" },
  { id: "snapchat", label: "Snapchat Ads" },
  { id: "x", label: "X/Twitter" },
  { id: "all", label: "All Platforms" },
];

const ACTION_OPTIONS = [
  { id: "shift_budget", label: "Shift Budget", desc: "Move budget between campaigns" },
  { id: "pause_campaign", label: "Pause Campaign", desc: "Stop underperforming campaigns" },
  { id: "increase_bid", label: "Increase Bid", desc: "Raise bids for top placements" },
  { id: "decrease_bid", label: "Decrease Bid", desc: "Lower bids to control spend" },
  { id: "rotate_creative", label: "Rotate Creative", desc: "Replace fatigued creatives" },
  { id: "expand_audience", label: "Expand Audience", desc: "Broaden targeting criteria" },
  { id: "notify_team", label: "Notify Team", desc: "Send alert to Slack/email" },
];

const TRIGGER_PRESETS = [
  { label: "ROAS drops below 2.0 for 4+ hours", value: "roas < 2.0 duration >= 4h" },
  { label: "Daily budget consumed by noon", value: "budget_spend >= 100% time < 12:00" },
  { label: "CTR falls below 1.5%", value: "ctr < 1.5% window = 24h" },
  { label: "Fraud score exceeds 75", value: "fraud_score > 75" },
  { label: "CPA exceeds target by 20%", value: "cpa > target * 1.2 window = 6h" },
  { label: "Creative fatigue detected", value: "frequency > 3.5 ctr_drop > 30%" },
  { label: "Impression share below 50%", value: "impression_share < 50%" },
];

const STEPS = ["Basics", "Trigger", "Actions", "Guardrails", "Review"];

export default function RecipeBuilder() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [step, setStep] = useState(0);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    trigger: "",
    hitlThreshold: 0,
    hitlField: "",
  });
  const [recipeSteps, setRecipeSteps] = useState<{ action: string; platform: string }[]>([{ action: "", platform: "" }]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addStep() { setRecipeSteps((prev) => [...prev, { action: "", platform: "" }]); }
  function removeStep(i: number) { setRecipeSteps((prev) => prev.filter((_, idx) => idx !== i)); }
  function updateStep(i: number, key: "action" | "platform", value: string) {
    setRecipeSteps((prev) => prev.map((s, idx) => idx === i ? { ...s, [key]: value } : s));
  }

  function canProceed(): boolean {
    switch (step) {
      case 0: return form.name.trim().length > 0;
      case 1: return form.trigger.trim().length > 0;
      case 2: return recipeSteps.some((s) => s.action && s.platform);
      default: return true;
    }
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const validSteps = recipeSteps.filter((s) => s.action && s.platform);
      const data: any = {
        name: form.name,
        description: form.description,
        trigger: form.trigger,
        steps: validSteps,
      };
      if (form.hitlThreshold > 0 && form.hitlField) {
        data.hitlGate = { threshold: form.hitlThreshold, field: form.hitlField };
      }
      await api.recipes.create(data);
      addToast("success", "Recipe created");
      navigate("/recipes");
    } catch {
      addToast("error", "Failed to create recipe");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Recipe Builder</h1>
          <p className="text-sm text-gray-500">Create an automation recipe with triggers and actions</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <button
              onClick={() => i < step ? setStep(i) : null}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                i === step ? "bg-n0va-600 text-white" : i < step ? "bg-green-600/20 text-green-400" : "bg-gray-800 text-gray-500"
              }`}
            >
              {i < step ? <Check className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full border border-current flex items-center justify-center text-[9px]">{i + 1}</span>}
              {label}
            </button>
            {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-gray-700" />}
          </div>
        ))}
      </div>

      <div className="card">
        {step === 0 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-n0va-600/20 rounded-lg flex items-center justify-center">
                <FileJson className="w-4 h-4 text-n0va-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Basic Information</h2>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Recipe Name *</label>
              <input className="input" placeholder="e.g., Auto Pause Underperforming Campaigns" value={form.name} onChange={(e) => update("name", e.target.value)} />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Description</label>
              <textarea className="input h-20 resize-none" placeholder="What does this recipe do?" value={form.description} onChange={(e) => update("description", e.target.value)} />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-n0va-600/20 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-n0va-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Trigger Condition</h2>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Trigger Expression *</label>
              <textarea className="input h-24 resize-none font-mono text-xs" placeholder="e.g., roas < 2.0 duration >= 4h" value={form.trigger} onChange={(e) => update("trigger", e.target.value)} />
              <p className="text-[10px] text-gray-600 mt-1">Define the condition that activates this recipe.</p>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Preset Triggers</label>
              <div className="space-y-1">
                {TRIGGER_PRESETS.map((preset) => (
                  <button key={preset.value} onClick={() => update("trigger", preset.value)} className="w-full flex items-center gap-2 p-2 rounded-lg bg-gray-800/30 hover:bg-gray-800 transition-colors text-left">
                    <Lightbulb className="w-3 h-3 text-yellow-500 shrink-0" />
                    <span className="text-xs text-gray-400 flex-1">{preset.label}</span>
                    <code className="text-[10px] text-n0va-400 font-mono">{preset.value}</code>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-n0va-600/20 rounded-lg flex items-center justify-center">
                <ListOrdered className="w-4 h-4 text-n0va-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Action Steps</h2>
            </div>

            <div className="space-y-3">
              {recipeSteps.map((s, i) => (
                <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-gray-800/30 border border-gray-800">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-n0va-600/20 text-n0va-400 text-xs font-bold mt-1.5 shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-gray-500 mb-1">Action</p>
                      <select value={s.action} onChange={(e) => updateStep(i, "action", e.target.value)} className="input text-xs">
                        <option value="">Select action...</option>
                        {ACTION_OPTIONS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 mb-1">Platform</p>
                      <select value={s.platform} onChange={(e) => updateStep(i, "platform", e.target.value)} className="input text-xs">
                        <option value="">Select platform...</option>
                        {PLATFORM_OPTIONS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                      </select>
                    </div>
                    {s.action && (
                      <p className="col-span-2 text-[10px] text-gray-600">{ACTION_OPTIONS.find((a) => a.id === s.action)?.desc}</p>
                    )}
                  </div>
                  {recipeSteps.length > 1 && (
                    <button onClick={() => removeStep(i)} className="text-gray-600 hover:text-red-400 mt-1.5 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button onClick={addStep} className="btn-secondary text-xs flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add Step
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-n0va-600/20 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-n0va-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Guardrails</h2>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-4">Configure a human-in-the-loop gate to require approval before high-impact actions.</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm text-gray-400 mb-1">HITL Threshold ($)</label>
                <input type="number" className="input" placeholder="e.g., 5000" value={form.hitlThreshold || ""} onChange={(e) => update("hitlThreshold", Number(e.target.value))} />
              </div>
              <div className="flex-1">
                <label className="block text-sm text-gray-400 mb-1">Monitor Field</label>
                <input className="input" placeholder="e.g., budget, spend, roas" value={form.hitlField} onChange={(e) => update("hitlField", e.target.value)} />
              </div>
            </div>

            <p className="text-xs text-gray-600">Leave threshold at 0 to skip HITL gate.</p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-n0va-600/20 rounded-lg flex items-center justify-center">
                <Check className="w-4 h-4 text-n0va-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Review & Create</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <ReviewField label="Name" value={form.name} />
              <ReviewField label="Description" value={form.description || "—"} />
              <div className="col-span-2">
                <ReviewField label="Trigger" value={form.trigger} />
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-2">Steps ({recipeSteps.filter((s) => s.action && s.platform).length})</p>
              <div className="space-y-1">
                {recipeSteps.filter((s) => s.action && s.platform).map((s, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded bg-gray-800/30">
                    <span className="text-xs font-bold text-n0va-400">{i + 1}.</span>
                    <span className="text-xs text-white capitalize">{s.action.replace(/_/g, " ")}</span>
                    <ChevronRight className="w-3 h-3 text-gray-600" />
                    <span className="text-xs text-gray-400 capitalize">{PLATFORM_OPTIONS.find((p) => p.id === s.platform)?.label || s.platform}</span>
                  </div>
                ))}
              </div>
            </div>

            {form.hitlThreshold > 0 && form.hitlField && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-yellow-400" />
                  <p className="text-xs text-yellow-400">HITL gate: ${form.hitlThreshold.toLocaleString()} on <code className="text-yellow-300">{form.hitlField}</code></p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-800">
          <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="btn-ghost text-sm disabled:opacity-30">
            Back
          </button>

          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()} className="btn-primary text-sm disabled:opacity-30">
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleCreate} disabled={creating} className={`btn-primary text-sm ${creating ? "opacity-50" : ""}`}>
              {creating ? "Creating..." : "Create Recipe"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-3">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm text-white font-medium truncate">{value}</p>
    </div>
  );
}
