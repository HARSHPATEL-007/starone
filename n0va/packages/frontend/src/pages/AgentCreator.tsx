import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { ArrowLeft, Check, ChevronRight, Bot, Clock, Shield, Zap, Palette, Users, SearchX, DollarSign } from "lucide-react";
import { useToast } from "../components/Toast";

const AGENT_TYPES = [
  { id: "budget", label: "Budget Agent", desc: "Monitors spend pacing and reallocates budget across platforms", icon: DollarSign, color: "text-green-400" },
  { id: "creative", label: "Creative Agent", desc: "Detects creative fatigue and generates new variants", icon: Palette, color: "text-purple-400" },
  { id: "audience", label: "Audience Agent", desc: "Analyzes segment performance and expands lookalikes", icon: Users, color: "text-blue-400" },
  { id: "bid", label: "Bid Agent", desc: "Optimizes bids per platform and adjusts for seasonality", icon: Zap, color: "text-yellow-400" },
  { id: "fraud", label: "Fraud Agent", desc: "Monitors invalid traffic and auto-pauses suspicious placements", icon: SearchX, color: "text-red-400" },
];

const FREQUENCY_OPTIONS = [
  { id: "realtime", label: "Real-time", desc: "Continuous monitoring" },
  { id: "every_2_hours", label: "Every 2 Hours", desc: "12 checks per day" },
  { id: "every_4_hours", label: "Every 4 Hours", desc: "6 checks per day" },
  { id: "every_6_hours", label: "Every 6 Hours", desc: "4 checks per day" },
  { id: "daily", label: "Daily", desc: "1 check per day" },
  { id: "weekly", label: "Weekly", desc: "1 check per week" },
];

const STEPS = ["Basics", "Schedule", "Guardrails", "Review"];

export default function AgentCreator() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [step, setStep] = useState(0);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "budget",
    frequency: "every_4_hours",
    hitlThreshold: 10000,
    description: "",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function canProceed(): boolean {
    switch (step) {
      case 0: return form.name.trim().length > 0 && form.type.length > 0;
      case 1: return form.frequency.length > 0;
      default: return true;
    }
  }

  async function handleCreate() {
    setCreating(true);
    try {
      await api.agents.create({
        name: form.name,
        type: form.type,
        frequency: form.frequency,
        config: {},
        hitlThreshold: form.hitlThreshold,
      });
      addToast("success", "Agent created");
      navigate("/agents");
    } catch {
      addToast("error", "Failed to create agent");
    } finally {
      setCreating(false);
    }
  }

  const selectedType = AGENT_TYPES.find((t) => t.id === form.type);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Agent Creator</h1>
          <p className="text-sm text-gray-500">Deploy a new autonomous AI agent</p>
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
                <Bot className="w-4 h-4 text-n0va-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Agent Type & Name</h2>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Agent Name *</label>
              <input className="input" placeholder="e.g., Weekend Budget Optimizer" value={form.name} onChange={(e) => update("name", e.target.value)} />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Agent Type *</label>
              <div className="grid grid-cols-1 gap-2">
                {AGENT_TYPES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button key={t.id} onClick={() => update("type", t.id)} className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                      form.type === t.id ? "border-n0va-500 bg-n0va-600/10" : "border-gray-800 bg-gray-800/50 hover:border-gray-700"
                    }`}>
                      <div className={`w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center ${t.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-white font-medium">{t.label}</p>
                        <p className="text-xs text-gray-500">{t.desc}</p>
                      </div>
                      {form.type === t.id && <Check className="w-4 h-4 text-n0va-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-n0va-600/20 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-n0va-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Schedule</h2>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Check Frequency</label>
              <div className="grid grid-cols-2 gap-2">
                {FREQUENCY_OPTIONS.map((f) => (
                  <button key={f.id} onClick={() => update("frequency", f.id)} className={`p-3 rounded-lg border text-left transition-all ${
                    form.frequency === f.id ? "border-n0va-500 bg-n0va-600/10" : "border-gray-800 bg-gray-800/50 hover:border-gray-700"
                  }`}>
                    <p className="text-sm text-white font-medium">{f.label}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{f.desc}</p>
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
                <Shield className="w-4 h-4 text-n0va-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Guardrails</h2>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Human-in-the-Loop Threshold</label>
              <p className="text-xs text-gray-600 mb-3">Agents will request human approval for actions exceeding this dollar amount.</p>
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-gray-500" />
                <input type="range" min={100} max={100000} step={100} value={form.hitlThreshold} onChange={(e) => update("hitlThreshold", Number(e.target.value))} className="flex-1" />
                <span className="text-sm text-white font-medium w-20 text-right">${form.hitlThreshold.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                <span>$100</span>
                <span>$100K</span>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-xs text-gray-400">
                <Shield className="w-3 h-3 inline mr-1" />
                When an action exceeds the threshold, the agent will pause and notify you for approval before proceeding.
              </p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-n0va-600/20 rounded-lg flex items-center justify-center">
                <Bot className="w-4 h-4 text-n0va-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Review & Deploy</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <ReviewField label="Name" value={form.name} />
              <ReviewField label="Type" value={selectedType?.label || form.type} />
              <ReviewField label="Frequency" value={FREQUENCY_OPTIONS.find((f) => f.id === form.frequency)?.label || form.frequency} />
              <ReviewField label="HITL Threshold" value={`$${form.hitlThreshold.toLocaleString()}`} />
            </div>

            {selectedType && (
              <div className={`p-4 rounded-lg border ${form.type === "fraud" ? "border-red-600/30 bg-red-500/5" : "border-n0va-600/30 bg-n0va-600/10"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <selectedType.icon className={`w-4 h-4 ${selectedType.color}`} />
                  <p className="text-sm text-white font-medium">{selectedType.label}</p>
                </div>
                <p className="text-xs text-gray-400">{selectedType.desc}</p>
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
              {creating ? "Deploying..." : "Deploy Agent"}
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
