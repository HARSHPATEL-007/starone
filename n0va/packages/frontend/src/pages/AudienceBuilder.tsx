import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { ArrowLeft, Check, ChevronRight, Users, Tag, Globe, Sparkles, Sliders, UserCheck } from "lucide-react";
import { useToast } from "../components/Toast";

const AUDIENCE_TYPES = [
  { id: "custom", label: "Custom Audience", desc: "Build from demographics and interests" },
  { id: "lookalike", label: "Lookalike", desc: "Similar users to existing audience" },
  { id: "retargeting", label: "Retargeting", desc: "Past website or app visitors" },
  { id: "saved", label: "Saved Audience", desc: "Re-use audience from past campaigns" },
];

const PLATFORM_OPTIONS = [
  { id: "meta", label: "Meta Ads", icon: "M" },
  { id: "google", label: "Google Ads", icon: "G" },
  { id: "linkedin", label: "LinkedIn Ads", icon: "L" },
  { id: "tiktok", label: "TikTok Ads", icon: "T" },
  { id: "snapchat", label: "Snapchat Ads", icon: "S" },
  { id: "x", label: "X/Twitter", icon: "X" },
];

const INTEREST_OPTIONS = [
  "Technology", "Fashion", "Travel", "Fitness", "Gaming",
  "Music", "Sports", "Food & Dining", "Finance", "Health & Wellness",
  "Education", "Entertainment", "Real Estate", "Automotive", "Beauty",
];

const GENDER_OPTIONS = ["all", "male", "female", "non-binary"];

const STEPS = ["Basics", "Demographics", "Interests", "Platform", "Review"];

export default function AudienceBuilder() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [step, setStep] = useState(0);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "custom",
    ageMin: 18,
    ageMax: 65,
    gender: "all",
    locations: "",
    interests: [] as string[],
    customInterests: "",
    platform: "meta",
    tags: "",
    size: 125000,
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleInterest(interest: string) {
    setForm((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  }

  function canProceed(): boolean {
    switch (step) {
      case 0: return form.name.trim().length > 0 && form.type.length > 0;
      case 1: return form.ageMin >= 13 && form.ageMax >= form.ageMin;
      case 3: return form.platform.length > 0;
      default: return true;
    }
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const allInterests = [...form.interests];
      if (form.customInterests.trim()) {
        allInterests.push(...form.customInterests.split(",").map((s) => s.trim()).filter(Boolean));
      }

      const criteria: Record<string, any> = {
        ageRange: { min: form.ageMin, max: form.ageMax },
        gender: form.gender,
        interests: allInterests,
      };
      if (form.locations.trim()) criteria.locations = form.locations.split(",").map((s) => s.trim());

      const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);

      await api.audiences.create({
        name: form.name,
        description: form.description,
        type: form.type,
        platform: form.platform,
        criteria,
        tags,
      });

      addToast("success", "Audience created");
      navigate("/audiences");
    } catch {
      addToast("error", "Failed to create audience");
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
          <h1 className="text-2xl font-bold text-white">Audience Builder</h1>
          <p className="text-sm text-gray-500">Define a new audience segment</p>
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
                <Users className="w-4 h-4 text-n0va-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Basic Information</h2>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Audience Name *</label>
              <input className="input" placeholder="e.g., High-Value Customers Q3" value={form.name} onChange={(e) => update("name", e.target.value)} />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Description</label>
              <textarea className="input h-20 resize-none" placeholder="Describe this audience segment..." value={form.description} onChange={(e) => update("description", e.target.value)} />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Audience Type *</label>
              <div className="grid grid-cols-2 gap-2">
                {AUDIENCE_TYPES.map((t) => (
                  <button key={t.id} onClick={() => update("type", t.id)} className={`p-3 rounded-lg border text-left transition-all ${
                    form.type === t.id ? "border-n0va-500 bg-n0va-600/10" : "border-gray-800 bg-gray-800/50 hover:border-gray-700"
                  }`}>
                    <p className="text-sm text-white font-medium">{t.label}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-n0va-600/20 rounded-lg flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-n0va-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Demographics</h2>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Age Range</label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Min: {form.ageMin}</p>
                  <input type="range" min={13} max={80} value={form.ageMin} onChange={(e) => update("ageMin", Math.min(Number(e.target.value), form.ageMax))} className="w-full" />
                </div>
                <span className="text-gray-600 text-sm">to</span>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Max: {form.ageMax}</p>
                  <input type="range" min={13} max={80} value={form.ageMax} onChange={(e) => update("ageMax", Math.max(Number(e.target.value), form.ageMin))} className="w-full" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Gender</label>
              <div className="flex gap-2">
                {GENDER_OPTIONS.map((g) => (
                  <button key={g} onClick={() => update("gender", g)} className={`px-4 py-2 rounded-lg text-sm capitalize transition-all ${
                    form.gender === g ? "bg-n0va-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}>
                    {g === "all" ? "All" : g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Locations (comma-separated)</label>
              <input className="input" placeholder="e.g., United States, Canada, United Kingdom" value={form.locations} onChange={(e) => update("locations", e.target.value)} />
              <p className="text-[10px] text-gray-600 mt-1">Leave empty for all locations</p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-n0va-600/20 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-n0va-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Interests & Behaviors</h2>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Select interests ({form.interests.length} selected)</label>
              <div className="flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map((interest) => (
                  <button key={interest} onClick={() => toggleInterest(interest)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    form.interests.includes(interest)
                      ? "bg-n0va-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}>
                    {interest}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Custom interests (comma-separated)</label>
              <input className="input" placeholder="e.g., AI, Machine Learning, Startups" value={form.customInterests} onChange={(e) => update("customInterests", e.target.value)} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-n0va-600/20 rounded-lg flex items-center justify-center">
                <Globe className="w-4 h-4 text-n0va-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Platform & Tags</h2>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Target Platform *</label>
              <div className="grid grid-cols-3 gap-2">
                {PLATFORM_OPTIONS.map((p) => (
                  <button key={p.id} onClick={() => update("platform", p.id)} className={`p-3 rounded-lg border text-center transition-all ${
                    form.platform === p.id ? "border-n0va-500 bg-n0va-600/10" : "border-gray-800 bg-gray-800/50 hover:border-gray-700"
                  }`}>
                    <span className="text-lg font-bold text-white">{p.icon}</span>
                    <p className="text-xs text-gray-300 mt-1">{p.label}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Tags (comma-separated)</label>
              <input className="input" placeholder="e.g., high-value, q3, vip" value={form.tags} onChange={(e) => update("tags", e.target.value)} />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Estimated Audience Size</label>
              <div className="flex items-center gap-3">
                <input type="range" min={1000} max={5000000} step={1000} value={form.size} onChange={(e) => update("size", Number(e.target.value))} className="flex-1" />
                <span className="text-sm text-white font-medium w-28 text-right">{form.size.toLocaleString()} users</span>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-n0va-600/20 rounded-lg flex items-center justify-center">
                <Sliders className="w-4 h-4 text-n0va-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Review & Create</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <ReviewField label="Name" value={form.name} />
              <ReviewField label="Type" value={AUDIENCE_TYPES.find((t) => t.id === form.type)?.label || form.type} />
              <ReviewField label="Age Range" value={`${form.ageMin} - ${form.ageMax}`} />
              <ReviewField label="Gender" value={form.gender === "all" ? "All" : form.gender} />
              <ReviewField label="Locations" value={form.locations || "All locations"} />
              <ReviewField label="Platform" value={PLATFORM_OPTIONS.find((p) => p.id === form.platform)?.label || form.platform} />
              <ReviewField label="Interests" value={form.interests.length > 0 ? form.interests.join(", ") : "None selected"} />
              <ReviewField label="Tags" value={form.tags || "None"} />
              <div className="col-span-2">
                <ReviewField label="Estimated Reach" value={`${form.size.toLocaleString()} users`} />
              </div>
            </div>
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
              {creating ? "Creating..." : "Create Audience"}
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
