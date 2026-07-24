import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { ArrowLeft, Check, ChevronRight, Image, Video, Layout, AlignLeft, Palette, FileText, Eye } from "lucide-react";
import { useToast } from "../components/Toast";

const CREATIVE_TYPES = [
  { id: "image", label: "Image", desc: "Single image ad with headline and CTA", icon: Image },
  { id: "video", label: "Video", desc: "Video ad with accompanying text", icon: Video },
  { id: "carousel", label: "Carousel", desc: "Multi-image swipeable ad", icon: Layout },
  { id: "text", label: "Text", desc: "Text-only ad with optional CTA", icon: AlignLeft },
];

const STEPS = ["Basics", "Content", "Review"];

export default function CreativeBuilder() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [step, setStep] = useState(0);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "image",
    headline: "",
    body: "",
    cta: "",
    assetUrl: "",
    tags: "",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function canProceed(): boolean {
    switch (step) {
      case 0: return form.name.trim().length > 0;
      default: return true;
    }
  }

  async function handleCreate() {
    setCreating(true);
    try {
      await api.creatives.create({
        name: form.name,
        type: form.type,
        headline: form.headline,
        body: form.body,
        cta: form.cta,
        assetUrl: form.assetUrl,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      addToast("success", "Creative created");
      navigate("/creatives");
    } catch {
      addToast("error", "Failed to create creative");
    } finally {
      setCreating(false);
    }
  }

  const selectedType = CREATIVE_TYPES.find((t) => t.id === form.type);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Creative Builder</h1>
          <p className="text-sm text-gray-500">Create a new ad creative</p>
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
                <Palette className="w-4 h-4 text-n0va-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Creative Name & Type</h2>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Creative Name *</label>
              <input className="input" placeholder="e.g., Summer Sale Hero Image" value={form.name} onChange={(e) => update("name", e.target.value)} />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Format *</label>
              <div className="grid grid-cols-2 gap-2">
                {CREATIVE_TYPES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button key={t.id} onClick={() => update("type", t.id)} className={`p-4 rounded-lg border text-left transition-all ${
                      form.type === t.id ? "border-n0va-500 bg-n0va-600/10" : "border-gray-800 bg-gray-800/50 hover:border-gray-700"
                    }`}>
                      <Icon className={`w-6 h-6 mb-2 ${form.type === t.id ? "text-n0va-400" : "text-gray-500"}`} />
                      <p className="text-sm text-white font-medium">{t.label}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{t.desc}</p>
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
                <FileText className="w-4 h-4 text-n0va-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Content</h2>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Headline</label>
              <input className="input" placeholder="e.g., Summer Sale — 50% Off Everything" value={form.headline} onChange={(e) => update("headline", e.target.value)} />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Body Text</label>
              <textarea className="input h-24 resize-none" placeholder="Describe your offer..." value={form.body} onChange={(e) => update("body", e.target.value)} />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Call to Action</label>
              <input className="input" placeholder="e.g., Shop Now, Sign Up, Learn More" value={form.cta} onChange={(e) => update("cta", e.target.value)} />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Asset URL (optional)</label>
              <input className="input" placeholder="https://example.com/image.jpg" value={form.assetUrl} onChange={(e) => update("assetUrl", e.target.value)} />
            </div>

            {form.headline || form.body || form.cta ? (
              <div className="border border-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="w-4 h-4 text-gray-500" />
                  <p className="text-xs text-gray-500 font-medium">PREVIEW</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                  <p className="text-base font-bold text-white">{form.headline || "Headline"}</p>
                  <p className="text-sm text-gray-400 mt-1">{form.body || "Body text will appear here..."}</p>
                  {form.cta && (
                    <div className="mt-3 inline-block bg-n0va-600 text-white text-xs font-medium px-4 py-2 rounded-lg">
                      {form.cta}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-n0va-600/20 rounded-lg flex items-center justify-center">
                <Check className="w-4 h-4 text-n0va-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Review & Create</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <ReviewField label="Name" value={form.name} />
              <ReviewField label="Format" value={selectedType?.label || form.type} />
              <ReviewField label="Headline" value={form.headline || "—"} />
              <ReviewField label="CTA" value={form.cta || "—"} />
              <div className="col-span-2">
                <ReviewField label="Body" value={form.body || "—"} />
              </div>
              <ReviewField label="Asset URL" value={form.assetUrl || "—"} />
              <ReviewField label="Tags" value={form.tags || "None"} />
            </div>

            {form.headline && (
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Ad Preview</p>
                <p className="text-base font-bold text-white">{form.headline}</p>
                {form.body && <p className="text-sm text-gray-400 mt-1">{form.body}</p>}
                {form.cta && (
                  <div className="mt-3 inline-block bg-n0va-600 text-white text-xs font-medium px-4 py-2 rounded-lg">
                    {form.cta}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm text-gray-400 mb-1">Tags (comma-separated)</label>
              <input className="input" placeholder="e.g., summer, sale, evergreen" value={form.tags} onChange={(e) => update("tags", e.target.value)} />
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
              {creating ? "Creating..." : "Create Creative"}
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
