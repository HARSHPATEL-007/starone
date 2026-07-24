import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wand2, Target, Globe, Users, DollarSign, Calendar, Lightbulb, Layers, BarChart3, MessageSquare, Copy, Check, Save, RefreshCw, Sparkles, Loader } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";

const objectives = [
  "Brand Awareness", "Lead Generation", "Website Traffic", "Engagement",
  "Sales / Conversions", "App Installs", "Retargeting", "Product Launch",
];

interface BriefResult {
  platforms: string[];
  creativeDirections: string[];
  audienceSegments: string[];
  budgetAllocation: { platform: string; pct: number }[];
  kpis: string[];
  keyMessaging: string[];
  summary: string;
}

export default function CampaignBriefGenerator() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [audience, setAudience] = useState("");
  const [budgetMin, setBudgetMin] = useState<number>(1000);
  const [budgetMax, setBudgetMax] = useState<number>(10000);
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<BriefResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  function generateBrief() {
    if (!name || !objective || !audience) {
      addToast("error", "Please fill in campaign name, objective, and target audience");
      return;
    }
    setGenerating(true);
    setResult(null);

    const platformOptions = ["Meta Ads", "Google Ads", "LinkedIn Ads", "TikTok Ads", "Twitter/X Ads", "Pinterest Ads", "Snapchat Ads", "Programmatic Display"];
    const directionTemplates: Record<string, string[]> = {
      "Brand Awareness": ["Hero storytelling", "Educational carousel", "Short-form brand film", "Influencer collaboration"],
      "Lead Generation": ["Lead magnet gated content", "Webinar signup campaign", "Free consultation CTA", "Case study download"],
      "Website Traffic": ["High-CTE newsfeed creative", "Link-in-bio strategy", "Article promotion", "Product teaser sequence"],
      "Engagement": ["Polls & interactive content", "User-generated content campaign", "Community challenge", "Live Q&A session"],
      "Sales / Conversions": ["Product demo video", "Customer testimonial series", "Limited-time offer creative", "Abandoned cart retargeting"],
      "App Installs": ["App preview video", "Feature spotlight carousel", "Incentivized install ad", "TikTok Spark Ads"],
      "Retargeting": ["Dynamic product ads", "Cross-sell recommendation", "Time-sensitive discount", "Loyalty program highlight"],
      "Product Launch": ["Teaser countdown", "Launch event stream", "Early adopter exclusive", "Unboxing influencer series"],
    };

    setTimeout(() => {
      const selected = platformOptions.sort(() => Math.random() - 0.5).slice(0, 3 + Math.floor(Math.random() * 2));
      const directions = (directionTemplates[objective] || directionTemplates["Brand Awareness"]).sort(() => Math.random() - 0.5).slice(0, 3);
      const segments = [
        `Lookalike — ${audience.split(" ").slice(0, 3).join(" ")}`,
        `Interest-based: ${["Tech enthusiasts", "Early adopters", "Value shoppers", "Premium buyers", "Mobile-first users"][Math.floor(Math.random() * 5)]}`,
        `Demographic: ${["25-44", "18-35", "35-55", "25-54"][Math.floor(Math.random() * 4)]} ${["Urban professionals", "Suburban families", "Remote workers", "Students"][Math.floor(Math.random() * 4)]}`,
        `Retargeting: 30-day site visitors + 90-day past purchasers`,
      ];
      const allocation = selected.map((p) => ({
        platform: p,
        pct: Math.floor(100 / selected.length + (Math.random() * 10 - 5)),
      }));
      const totalPct = allocation.reduce((s, a) => s + a.pct, 0);
      allocation[0].pct += 100 - totalPct;

      setResult({
        platforms: selected,
        creativeDirections: directions,
        audienceSegments: segments,
        budgetAllocation: allocation,
        kpis: [
          objective === "Brand Awareness" ? "Reach & Frequency, CPM, Brand Lift" :
          objective === "Lead Generation" ? "CPA, CPL, Lead-to-Customer Rate" :
          objective === "Sales / Conversions" ? "ROAS, CPA, Conversion Rate, AOV" :
          objective === "Website Traffic" ? "CPC, CTR, Bounce Rate, Pages/Session" :
          objective === "Engagement" ? "Engagement Rate, Shares, Comments, DMs" :
          objective === "App Installs" ? "CPI, Install Rate, D1/D7 Retention" :
          objective === "Retargeting" ? "ROAS, Frequency, Add-to-Cart Rate" :
          "CTR, CPA, ROAS, Impression Share",
          "Cost per incremental conversion",
          "Return on ad spend (ROAS)",
          "Quality Score / Relevance Score",
        ],
        keyMessaging: [
          `Core: ${["Drive", "Unlock", "Discover", "Transform", "Accelerate"][Math.floor(Math.random() * 5)]} ${["growth", "results", "performance", "engagement", "reach"][Math.floor(Math.random() * 5)]}`,
          `Secondary: ${["Data-driven insights", "AI-powered optimization", "Seamless integration", "Proven ROI", "Enterprise-grade"][Math.floor(Math.random() * 5)]}`,
          `Tone: ${["Professional & authoritative", "Friendly & approachable", "Bold & disruptive", "Educational & helpful", "Aspirational & premium"][Math.floor(Math.random() * 5)]}`,
        ],
        summary: `A ${duration}-day ${objective.toLowerCase()} campaign targeting ${audience} across ${selected.length} platforms. Total budget ${formatCurrency(budgetMin)}–${formatCurrency(budgetMax)}. Focus on ${directions[0].toLowerCase()} to drive maximum impact.`,
      });
      setGenerating(false);
    }, 1800 + Math.random() * 1200);
  }

  function formatCurrency(v: number) { return "$" + v.toLocaleString(); }

  function getPlatformIcon(_p: string) { return Globe; }

  async function saveAsDraft() {
    if (!result) return;
    setSaving(true);
    try {
      const campaign = await api.campaigns.create({
        name: name + " (Brief)",
        goal: objective,
        status: "draft",
        type: "brand",
        budget: { daily: Math.round(budgetMax / duration), lifetime: budgetMax },
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date(Date.now() + duration * 86400000).toISOString().split("T")[0],
        description: result.summary,
        tags: ["brief-generated", objective.toLowerCase().replace(/\s+/g, "-")],
        platforms: result.platforms,
      });
      addToast("success", `Brief saved as draft campaign: "${campaign.name}"`);
      navigate(`/campaigns/${campaign._id || campaign.id}`);
    } catch {
      addToast("error", "Failed to save campaign");
    } finally {
      setSaving(false);
    }
  }

  function copyBrief() {
    if (!result) return;
    const text = [
      `CAMPAIGN BRIEF: ${name}`,
      `Objective: ${objective}`,
      `Audience: ${audience}`,
      `Budget: ${formatCurrency(budgetMin)} – ${formatCurrency(budgetMax)}`,
      `Duration: ${duration} days`,
      "",
      "PLATFORMS",
      result.platforms.map((p) => `  • ${p}`).join("\n"),
      "",
      "CREATIVE DIRECTIONS",
      result.creativeDirections.map((d) => `  • ${d}`).join("\n"),
      "",
      "AUDIENCE SEGMENTS",
      result.audienceSegments.map((s) => `  • ${s}`).join("\n"),
      "",
      "BUDGET ALLOCATION",
      result.budgetAllocation.map((a) => `  • ${a.platform}: ${a.pct}%`).join("\n"),
      "",
      "KPIs",
      result.kpis.map((k) => `  • ${k}`).join("\n"),
      "",
      "KEY MESSAGING",
      result.keyMessaging.map((m) => `  • ${m}`).join("\n"),
    ].join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addToast("success", "Brief copied to clipboard");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Wand2 className="w-6 h-6 text-n0va-400" />
            Campaign Brief Generator
          </h1>
          <p className="text-gray-400 mt-1">AI-powered campaign planning in seconds</p>
        </div>
        <button className="btn-ghost text-sm" onClick={() => navigate(-1)}>Back</button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="space-y-4">
          <div className="card p-6 space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Target className="w-4 h-4 text-n0va-400" /> Campaign Details</h2>

            <div>
              <label className="label">Campaign Name</label>
              <input className="input" placeholder="e.g. Summer Product Launch" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div>
              <label className="label">Objective</label>
              <div className="grid grid-cols-2 gap-2">
                {objectives.map((o) => (
                  <button
                    key={o}
                    onClick={() => setObjective(o)}
                    className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                      objective === o
                        ? "border-n0va-500 bg-n0va-500/10 text-n0va-400"
                        : "border-gray-800 text-gray-400 hover:border-gray-700"
                    }`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Target Audience</label>
              <textarea
                className="input min-h-[80px] resize-none"
                placeholder="Describe your target audience — demographics, interests, behaviors..."
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label text-xs">Min Budget ($)</label>
                <input type="number" className="input" min={0} value={budgetMin} onChange={(e) => setBudgetMin(Number(e.target.value))} />
              </div>
              <div>
                <label className="label text-xs">Max Budget ($)</label>
                <input type="number" className="input" min={0} value={budgetMax} onChange={(e) => setBudgetMax(Number(e.target.value))} />
              </div>
            </div>

            <div>
              <label className="label">Duration (days)</label>
              <input type="range" min={7} max={90} step={1} className="w-full accent-n0va-500" value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>7 days</span>
                <span className="text-white font-medium">{duration} days</span>
                <span>90 days</span>
              </div>
            </div>

            <div>
              <label className="label">Additional Notes</label>
              <textarea
                className="input min-h-[60px] resize-none"
                placeholder="Any specific requirements, brand guidelines, or constraints..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button
              onClick={generateBrief}
              disabled={generating}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {generating ? (
                <><Loader className="w-4 h-4 animate-spin" /> Generating Brief...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Generate Brief</>
              )}
            </button>
          </div>
        </div>

        {/* Results Panel */}
        <div className="space-y-4">
          {!result && !generating && (
            <div className="card p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
              <Wand2 className="w-12 h-12 text-gray-700 mb-4" />
              <h3 className="text-lg font-semibold text-gray-300 mb-2">Ready to generate</h3>
              <p className="text-sm text-gray-500 max-w-sm">
                Fill in your campaign details on the left, then click "Generate Brief" to get an AI-powered campaign plan.
              </p>
            </div>
          )}

          {generating && (
            <div className="card p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
              <div className="w-16 h-16 rounded-full bg-n0va-500/10 flex items-center justify-center mb-4 animate-pulse">
                <Sparkles className="w-8 h-8 text-n0va-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Analyzing your requirements</h3>
              <p className="text-sm text-gray-500 max-w-sm">
                Generating platform recommendations, creative directions, audience segments, and more...
              </p>
              <div className="flex gap-1.5 mt-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-n0va-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}

          {result && (
            <>
              <div className="card p-6 space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-n0va-400" /> {name}
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">{objective} &middot; {duration} days &middot; {formatCurrency(budgetMin)}–{formatCurrency(budgetMax)}</p>
                  </div>
                  <span className="text-xs bg-n0va-500/10 text-n0va-400 px-2.5 py-1 rounded-full font-medium">AI-Generated</span>
                </div>

                <p className="text-sm text-gray-400 bg-gray-800/50 rounded-lg p-3 italic">"{result.summary}"</p>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2"><Globe className="w-3 h-3" /> Recommended Platforms</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.platforms.map((p) => (
                      <span key={p} className="text-sm bg-gray-800 text-gray-300 px-3 py-1.5 rounded-lg border border-gray-700">{p}</span>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2"><Layers className="w-3 h-3" /> Creative Directions</h3>
                  <ul className="space-y-1.5">
                    {result.creativeDirections.map((d, i) => (
                      <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-n0va-500 mt-1.5 shrink-0" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2"><Users className="w-3 h-3" /> Audience Segments</h3>
                  <ul className="space-y-1.5">
                    {result.audienceSegments.map((s, i) => (
                      <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2"><DollarSign className="w-3 h-3" /> Budget Allocation</h3>
                  <div className="space-y-2">
                    {result.budgetAllocation.map((a) => (
                      <div key={a.platform} className="flex items-center gap-3">
                        <span className="text-sm text-gray-300 w-32 shrink-0">{a.platform}</span>
                        <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-n0va-500 rounded-full transition-all" style={{ width: `${a.pct}%` }} />
                        </div>
                        <span className="text-sm text-gray-400 w-10 text-right">{a.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2"><BarChart3 className="w-3 h-3" /> Key KPIs</h3>
                  <ul className="space-y-1.5">
                    {result.kpis.map((k, i) => (
                      <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                        {k}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2"><MessageSquare className="w-3 h-3" /> Key Messaging</h3>
                  <ul className="space-y-1.5">
                    {result.keyMessaging.map((m, i) => (
                      <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>

                {notes && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Additional Considerations</h3>
                    <p className="text-sm text-gray-400 bg-gray-800/50 rounded-lg p-3">{notes}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button onClick={saveAsDraft} disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? "Saving..." : "Save as Draft Campaign"}
                </button>
                <button onClick={copyBrief} className="btn-ghost flex items-center gap-2">
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy Brief"}
                </button>
                <button onClick={generateBrief} disabled={generating} className="btn-ghost flex items-center gap-2">
                  <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
                  Regenerate
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
