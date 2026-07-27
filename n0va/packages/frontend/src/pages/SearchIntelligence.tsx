import { useState } from "react";
import { api } from "../api/client";
import { Hash, Star, TrendingUp, DollarSign, FileText } from "lucide-react";

const tabs = [
  { id: "cluster", label: "Cluster", icon: Hash },
  { id: "quality-score", label: "Quality Score", icon: Star },
  { id: "auction-insights", label: "Auction Insights", icon: TrendingUp },
  { id: "bid-recommendation", label: "Bid Rec", icon: DollarSign },
  { id: "tfidf", label: "TF-IDF", icon: FileText },
];

export default function SearchIntelligence() {
  const [activeTab, setActiveTab] = useState("cluster");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const sampleKeywords = [
    { term: "marketing automation", searchVolume: 12000, competition: 0.7, avgCPC: 4.5 },
    { term: "email marketing", searchVolume: 22000, competition: 0.5, avgCPC: 3.2 },
    { term: "social media management", searchVolume: 15000, competition: 0.6, avgCPC: 3.8 },
    { term: "content marketing", searchVolume: 18000, competition: 0.4, avgCPC: 2.9 },
    { term: "SEO tools", searchVolume: 14000, competition: 0.65, avgCPC: 4.1 },
    { term: "PPC management", searchVolume: 8000, competition: 0.55, avgCPC: 5.2 },
    { term: "lead generation", searchVolume: 25000, competition: 0.75, avgCPC: 6.0 },
    { term: "CRM software", searchVolume: 30000, competition: 0.8, avgCPC: 7.5 },
  ];

  async function handleTabAction() {
    setLoading(true); setError(null); setResult(null);
    try {
      let res: any;
      switch (activeTab) {
        case "cluster":
          res = await api.searchIntelligence.cluster({ keywords: sampleKeywords, nClusters: 3 });
          break;
        case "quality-score":
          res = await api.searchIntelligence.qualityScore({ keyword: "marketing automation", history: [] });
          break;
        case "auction-insights":
          res = await api.searchIntelligence.auctionInsights({
            keyword: "marketing automation",
            competitors: [
              { domain: "hubspot.com", impressionShare: 0.35, overlapRate: 0.6, positionAboveRate: 0.4, outrankingShare: 0.3 },
              { domain: "marketone.com", impressionShare: 0.25, overlapRate: 0.5, positionAboveRate: 0.3, outrankingShare: 0.2 },
              { domain: "activecampaign.com", impressionShare: 0.2, overlapRate: 0.4, positionAboveRate: 0.25, outrankingShare: 0.15 },
            ],
          });
          break;
        case "bid-recommendation":
          res = await api.searchIntelligence.bidRecommendation({ keyword: "marketing automation", currentBid: 3.5, qualityScore: 7, avgCPC: 4.2, conversionRate: 0.035, avgOrderValue: 80, dailyBudget: 150, strategy: "balanced" });
          break;
        case "tfidf":
          res = await api.searchIntelligence.tfidf({ documents: ["marketing automation software for small business", "best email marketing tools 2025", "social media management platform", "content marketing strategy guide", "SEO tools for beginners"] });
          break;
      }
      setResult(res);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  function renderResult() {
    if (!result) return null;
    if (activeTab === "cluster") {
      const clusters = result as any[];
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {clusters.map((c: any, i: number) => (
            <div key={i} className="bg-gray-800/50 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-white mb-1">Cluster {i + 1}</h3>
              <div className="text-xs text-gray-500 mb-2">Keywords: {c.keywords?.length}</div>
              <div className="space-y-1">
                {(c.keywords || []).map((kw: string, j: number) => (
                  <div key={j} className="text-xs text-n0va-400">{kw}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }
    if (activeTab === "quality-score") {
      const qs = result as any;
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="text-4xl font-bold text-n0va-400">{qs.score}</div>
            <span className="text-gray-400">/ 10</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(qs.factors || {}).map(([k, v]) => (
              <div key={k} className="bg-gray-800/50 p-3 rounded-lg text-center">
                <div className="text-xs text-gray-500 capitalize">{k.replace(/([A-Z])/g, " $1")}</div>
                <div className="text-lg font-bold text-white">{(v as number * 10).toFixed(1)}</div>
              </div>
            ))}
          </div>
          {qs.recommendations?.length > 0 && (
            <div className="bg-gray-800/50 p-3 rounded-lg">
              <h4 className="text-xs font-semibold text-gray-400 mb-2">Recommendations</h4>
              <ul className="list-disc list-inside text-xs text-gray-400 space-y-1">
                {qs.recommendations.map((r: string, i: number) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}
        </div>
      );
    }
    if (activeTab === "auction-insights") {
      const insights = result as any[];
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs uppercase border-b border-gray-800">
                <th className="text-left py-2 px-3">Domain</th>
                <th className="text-right py-2 px-3">Impression Share</th>
                <th className="text-right py-2 px-3">Overlap</th>
                <th className="text-right py-2 px-3">Position Above</th>
                <th className="text-right py-2 px-3">Outranking</th>
              </tr>
            </thead>
            <tbody>
              {insights.map((c: any, i: number) => (
                <tr key={i} className="border-b border-gray-800/50">
                  <td className="py-2 px-3 text-white">{c.domain}</td>
                  <td className="text-right py-2 px-3">{(c.impressionShare * 100).toFixed(1)}%</td>
                  <td className="text-right py-2 px-3">{(c.overlapRate * 100).toFixed(1)}%</td>
                  <td className="text-right py-2 px-3">{(c.positionAboveRate * 100).toFixed(1)}%</td>
                  <td className="text-right py-2 px-3">{(c.outrankingShare * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    if (activeTab === "bid-recommendation") {
      const br = result as any;
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[{ label: "Recommended Bid", val: br.recommendedBid, prefix: "$" }, { label: "Strategy", val: br.strategy }, { label: "Expected ROAS", val: br.expectedROAS ? `${(br.expectedROAS * 100).toFixed(0)}%` : "N/A" }, { label: "Confidence", val: br.confidence ? `${(br.confidence * 100).toFixed(0)}%` : "N/A" }].map((item) => (
            <div key={item.label} className="bg-gray-800/50 p-4 rounded-lg text-center">
              <div className="text-xs text-gray-500 mb-1">{item.label}</div>
              <div className="text-xl font-bold text-n0va-400">{item.prefix || ""}{item.val}</div>
            </div>
          ))}
        </div>
      );
    }
    if (activeTab === "tfidf") {
      const tfidf = result as any[];
      return (
        <div className="space-y-4">
          {tfidf.map((doc: any, i: number) => (
            <div key={i} className="bg-gray-800/50 p-3 rounded-lg">
              <h4 className="text-xs font-semibold text-gray-400 mb-1">Document {i + 1}</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(doc.scores || {}).slice(0, 10).map(([word, score]) => (
                  <span key={word} className="bg-gray-700/50 px-2 py-0.5 rounded text-xs text-n0va-400">
                    {word}: {(score as number).toFixed(3)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Search Intelligence</h1>
        <p className="text-gray-400 text-sm mt-1">Keyword clustering, quality score prediction, auction insights & bid optimization</p>
      </div>
      <div className="flex gap-2 border-b border-gray-800 pb-2 flex-wrap">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === t.id ? "bg-n0va-600/20 text-n0va-400 border border-n0va-600/30" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"}`}>
              <Icon className="w-4 h-4" />{t.label}
            </button>
          );
        })}
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <button onClick={handleTabAction} disabled={loading} className="bg-n0va-600 hover:bg-n0va-500 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50 mb-6">
          {loading ? "Running..." : `Run ${activeTab}`}
        </button>
        {error && <div className="bg-red-900/30 border border-red-800 text-red-400 p-3 rounded-lg mb-4 text-sm">{error}</div>}
        {renderResult()}
      </div>
    </div>
  );
}
