import { useState, useEffect } from "react";
import { Palette, Type, MessageSquare, Image, Save, Undo2, Check, RefreshCw, Plus, X } from "lucide-react";
import { useToast } from "../components/Toast";

interface BrandKitData {
  name: string;
  description: string;
  colors: { label: string; value: string }[];
  fonts: { heading: string; body: string };
  logoUrl: string;
  voice: { tone: string; values: string[] };
  updatedAt: string;
}

const STORAGE_KEY = "n0va_brand_kit";

const DEFAULT: BrandKitData = {
  name: "",
  description: "",
  colors: [
    { label: "Primary", value: "#6366f1" },
    { label: "Secondary", value: "#10b981" },
    { label: "Accent", value: "#f59e0b" },
    { label: "Dark", value: "#0f172a" },
    { label: "Light", value: "#f8fafc" },
  ],
  fonts: { heading: "Inter", body: "Inter" },
  logoUrl: "",
  voice: { tone: "Professional & approachable", values: ["Innovation", "Trust", "Results"] },
  updatedAt: new Date().toISOString(),
};

const fontOptions = ["Inter", "Roboto", "Poppins", "Playfair Display", "Merriweather", "Montserrat", "Open Sans", "Lato", "Source Sans Pro", "Nunito", "Raleway", "DM Sans"];

const toneOptions = [
  "Professional & approachable",
  "Bold & disruptive",
  "Friendly & conversational",
  "Authoritative & expert",
  "Playful & creative",
  "Minimalist & elegant",
  "Educational & helpful",
  "Aspirational & premium",
];

function load(): BrandKitData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT, ...JSON.parse(raw), updatedAt: DEFAULT.updatedAt } : { ...DEFAULT };
  } catch { return { ...DEFAULT }; }
}

function validateHex(hex: string) {
  return /^#[0-9a-fA-F]{6}$/.test(hex);
}

export default function BrandKit() {
  const { addToast } = useToast();
  const [data, setData] = useState<BrandKitData>({ ...DEFAULT });
  const [loaded, setLoaded] = useState(false);
  const [newColorLabel, setNewColorLabel] = useState("");
  const [newColorValue, setNewColorValue] = useState("#6366f1");
  const [newValue, setNewValue] = useState("");
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  useEffect(() => {
    setData(load());
    setLoaded(true);
  }, []);

  function save() {
    const updated = { ...data, updatedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setData(updated);
    addToast("success", "Brand Kit saved");
  }

  function reset() {
    setData({ ...DEFAULT });
    localStorage.removeItem(STORAGE_KEY);
    addToast("success", "Brand Kit reset to defaults");
  }

  function updateField<K extends keyof BrandKitData>(key: K, value: BrandKitData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function updateColor(i: number, field: "label" | "value", val: string) {
    if (field === "value" && !validateHex(val) && val.length === 7) return;
    setData((prev) => {
      const colors = [...prev.colors];
      colors[i] = { ...colors[i], [field]: val };
      return { ...prev, colors };
    });
  }

  function addColor() {
    if (!newColorLabel.trim()) { addToast("error", "Enter a color label"); return; }
    if (!validateHex(newColorValue)) { addToast("error", "Enter a valid hex color"); return; }
    if (data.colors.length >= 12) { addToast("error", "Maximum 12 colors"); return; }
    setData((prev) => ({ ...prev, colors: [...prev.colors, { label: newColorLabel.trim(), value: newColorValue }] }));
    setNewColorLabel("");
    setNewColorValue("#6366f1");
  }

  function removeColor(i: number) {
    setData((prev) => ({ ...prev, colors: prev.colors.filter((_, idx) => idx !== i) }));
  }

  function copyHex(hex: string) {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 1500);
  }

  function addValue() {
    if (!newValue.trim()) return;
    if (data.voice.values.length >= 8) { addToast("error", "Maximum 8 brand values"); return; }
    setData((prev) => ({ ...prev, voice: { ...prev.voice, values: [...prev.voice.values, newValue.trim()] } }));
    setNewValue("");
  }

  function removeValue(i: number) {
    setData((prev) => ({ ...prev, voice: { ...prev.voice, values: prev.voice.values.filter((_, idx) => idx !== i) } }));
  }

  if (!loaded) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Palette className="w-6 h-6 text-n0va-400" />
            Brand Kit
          </h1>
          <p className="text-gray-400 mt-1">Your brand identity, colors, typography, and voice — centralized</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={reset} className="btn-ghost text-sm flex items-center gap-1.5"><Undo2 className="w-3.5 h-3.5" /> Reset</button>
          <button onClick={save} className="btn-primary text-sm flex items-center gap-1.5"><Save className="w-3.5 h-3.5" /> Save Brand Kit</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Brand Name & Description */}
        <div className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Palette className="w-4 h-4 text-n0va-400" /> Brand Identity</h2>
          <div>
            <label className="label">Brand Name</label>
            <input className="input" placeholder="e.g. Acme Inc." value={data.name} onChange={(e) => updateField("name", e.target.value)} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input min-h-[80px] resize-none" placeholder="Describe your brand in a few sentences..." value={data.description} onChange={(e) => updateField("description", e.target.value)} />
          </div>
          <div>
            <label className="label">Logo URL</label>
            <input className="input" placeholder="https://example.com/logo.png" value={data.logoUrl} onChange={(e) => updateField("logoUrl", e.target.value)} />
            {data.logoUrl && (
              <div className="mt-3 p-4 bg-gray-800/50 rounded-lg flex items-center justify-center border border-gray-800">
                <img src={data.logoUrl} alt="Logo preview" className="max-h-20 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
            )}
          </div>
        </div>

        {/* Color Palette */}
        <div className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Palette className="w-4 h-4 text-n0va-400" /> Color Palette</h2>
          <div className="space-y-3">
            {data.colors.map((c, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="color"
                    className="w-9 h-9 rounded-lg cursor-pointer border border-gray-700 bg-transparent p-0.5"
                    value={c.value}
                    onChange={(e) => updateColor(i, "value", e.target.value)}
                  />
                  <div className="absolute inset-0 rounded-lg border border-white/5 pointer-events-none" />
                </div>
                <input
                  className="input flex-1 text-sm"
                  placeholder="Color label"
                  value={c.label}
                  onChange={(e) => updateColor(i, "label", e.target.value)}
                />
                <div className="relative w-28">
                  <input
                    className="input text-xs font-mono pr-8 w-full"
                    value={c.value}
                    onChange={(e) => updateColor(i, "value", e.target.value)}
                  />
                  <button
                    onClick={() => copyHex(c.value)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {copiedHex === c.value ? <Check className="w-3.5 h-3.5 text-green-400" /> : <CopyIcon className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {data.colors.length > 3 && (
                  <button onClick={() => removeColor(i)} className="text-gray-600 hover:text-red-400"><X className="w-4 h-4" /></button>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-gray-800">
            <input className="input flex-1 text-sm" placeholder="Label" value={newColorLabel} onChange={(e) => setNewColorLabel(e.target.value)} />
            <input type="color" className="w-9 h-9 rounded-lg cursor-pointer border border-gray-700 bg-transparent p-0.5" value={newColorValue} onChange={(e) => setNewColorValue(e.target.value)} />
            <button onClick={addColor} className="btn-ghost text-sm flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add</button>
          </div>
        </div>

        {/* Typography */}
        <div className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Type className="w-4 h-4 text-n0va-400" /> Typography</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Heading Font</label>
              <select className="input" value={data.fonts.heading} onChange={(e) => setData((prev) => ({ ...prev, fonts: { ...prev.fonts, heading: e.target.value } }))}>
                {fontOptions.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              <p className="text-lg font-bold mt-2 text-white" style={{ fontFamily: data.fonts.heading }}>Heading Example</p>
            </div>
            <div>
              <label className="label">Body Font</label>
              <select className="input" value={data.fonts.body} onChange={(e) => setData((prev) => ({ ...prev, fonts: { ...prev.fonts, body: e.target.value } }))}>
                {fontOptions.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              <p className="text-sm mt-2 text-gray-400" style={{ fontFamily: data.fonts.body }}>The quick brown fox jumps over the lazy dog. 1234567890</p>
            </div>
          </div>
        </div>

        {/* Brand Voice */}
        <div className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2"><MessageSquare className="w-4 h-4 text-n0va-400" /> Brand Voice</h2>
          <div>
            <label className="label">Tone</label>
            <select className="input" value={data.voice.tone} onChange={(e) => setData((prev) => ({ ...prev, voice: { ...prev.voice, tone: e.target.value } }))}>
              {toneOptions.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Brand Values</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {data.voice.values.map((v, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 text-sm bg-gray-800 text-gray-300 px-3 py-1.5 rounded-full border border-gray-700">
                  {v}
                  <button onClick={() => removeValue(i)} className="text-gray-500 hover:text-red-400"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input className="input flex-1 text-sm" placeholder="e.g. Innovation" value={newValue} onChange={(e) => setNewValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addValue()} />
              <button onClick={addValue} className="btn-ghost text-sm flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}
