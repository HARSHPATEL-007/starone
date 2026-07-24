import { useState, useEffect } from "react";
import { BarChart3, Search, TrendingUp, TrendingDown, Eye, MousePointerClick, DollarSign, Target, Users, Smartphone, Monitor, Tablet, Globe, Mail } from "lucide-react";
import { useToast } from "../components/Toast";

type Channel = "google_ads" | "facebook" | "instagram" | "linkedin" | "twitter" | "tiktok" | "youtube" | "email" | "display" | "programmatic";

interface ChannelMetrics {
  id: string;
  channel: Channel;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  ctr: number;
  cpc: number;
  cvr: number;
  roas: number;
  reach: number;
  frequency: number;
}

const STORAGE_KEY = "n0va_channel_performance";

const CHANNEL_META: Record<string, { label: string; short: string; color: string; icon: any }> = {
  google_ads: { label: "Google Ads", short: "Google", color: "bg-blue-500", icon: Globe },
  facebook: { label: "Facebook", short: "Facebook", color: "bg-indigo-500", icon: Users },
  instagram: { label: "Instagram", short: "Instagram", color: "bg-pink-500", icon: Smartphone },
  linkedin: { label: "LinkedIn", short: "LinkedIn", color: "bg-blue-600", icon: Users },
  twitter: { label: "Twitter/X", short: "X", color: "bg-sky-500", icon: Globe },
  tiktok: { label: "TikTok", short: "TikTok", color: "bg-rose-500", icon: Smartphone },
  youtube: { label: "YouTube", short: "YouTube", color: "bg-red-500", icon: Monitor },
  email: { label: "Email", short: "Email", color: "bg-green-500", icon: Mail },
  display: { label: "Display", short: "Display", color: "bg-amber-500", icon: Monitor },
  programmatic: { label: "Programmatic", short: "Prog.", color: "bg-purple-500", icon: Globe },
};

const DEFAULT_DATA: ChannelMetrics[] = [
  { id: "ch-1", channel: "google_ads", impressions: 485000, clicks: 14550, conversions: 890, spend: 58700, revenue: 285000, ctr: 0, cpc: 0, cvr: 0, roas: 0, reach: 320000, frequency: 1.52 },
  { id: "ch-2", channel: "facebook", impressions: 320000, clicks: 9600, conversions: 620, spend: 42000, revenue: 186000, ctr: 0, cpc: 0, cvr: 0, roas: 0, reach: 240000, frequency: 1.33 },
  { id: "ch-3", channel: "instagram", impressions: 280000, clicks: 11200, conversions: 540, spend: 35000, revenue: 162000, ctr: 0, cpc: 0, cvr: 0, roas: 0, reach: 195000, frequency: 1.44 },
  { id: "ch-4", channel: "linkedin", impressions: 95000, clicks: 2850, conversions: 180, spend: 28000, revenue: 98000, ctr: 0, cpc: 0, cvr: 0, roas: 0, reach: 72000, frequency: 1.32 },
  { id: "ch-5", channel: "tiktok", impressions: 450000, clicks: 18000, conversions: 320, spend: 22000, revenue: 96000, ctr: 0, cpc: 0, cvr: 0, roas: 0, reach: 380000, frequency: 1.18 },
  { id: "ch-6", channel: "email", impressions: 210000, clicks: 10500, conversions: 780, spend: 8000, revenue: 142000, ctr: 0, cpc: 0, cvr: 0, roas: 0, reach: 195000, frequency: 1.08 },
];

const ALL_CHANNELS = Object.keys(CHANNEL_META) as Channel[];

function compute(metrics: ChannelMetrics[]): ChannelMetrics[] {
  return metrics.map(m => ({
    ...m,
    ctr: m.impressions > 0 ? (m.clicks / m.impressions * 100) : 0,
    cpc: m.clicks > 0 ? (m.spend / m.clicks) : 0,
    cvr: m.clicks > 0 ? (m.conversions / m.clicks * 100) : 0,
    roas: m.spend > 0 ? (m.revenue / m.spend) : 0,
  }));
}

function load(): ChannelMetrics[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return compute(JSON.parse(raw));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DATA));
    return compute(DEFAULT_DATA);
  } catch { return []; }
}

function fmt(n: number, decimals = 1): string {
  if (n >= 1000000) return (n / 1000000).toFixed(decimals) + "M";
  if (n >= 1000) return (n / 1000).toFixed(decimals) + "K";
  return n.toLocaleString();
}

function fmtCurrency(n: number): string {
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtRate(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

export default function ChannelPerformance() {
  const { addToast } = useToast();
  const [data, setData] = useState<ChannelMetrics[]>([]);
  const [sortBy, setSortBy] = useState<keyof ChannelMetrics>("spend");
  const [sortDesc, setSortDesc] = useState(true);

  useEffect(() => { setData(load()); }, []);

  const maxImpressions = Math.max(...data.map(d => d.impressions));

  const sorted = [...data].sort((a, b) => {
    const aV = a[sortBy] as number;
    const bV = b[sortBy] as number;
    return sortDesc ? bV - aV : aV - bV;
  });

  const totals = {
    impressions: data.reduce((s, d) => s + d.impressions, 0),
    clicks: data.reduce((s, d) => s + d.clicks, 0),
    conversions: data.reduce((s, d) => s + d.conversions, 0),
    spend: data.reduce((s, d) => s + d.spend, 0),
    revenue: data.reduce((s, d) => s + d.revenue, 0),
  };

  function toggleSort(key: keyof ChannelMetrics) {
    if (sortBy === key) setSortDesc(!sortDesc);
    else { setSortBy(key); setSortDesc(true); }
  }

  function SortIcon({ col }: { col: keyof ChannelMetrics }) {
    if (sortBy !== col) return null;
    return sortDesc ? <TrendingDown className="w-3 h-3 inline ml-0.5" /> : <TrendingUp className="w-3 h-3 inline ml-0.5" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-n0va-400" />
            Channel Performance
          </h1>
          <p className="text-gray-400 mt-1">{data.length} channels tracked</p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-5 gap-4">
        <div className="card p-4"><p className="text-xs text-gray-500">Total Impressions</p><p className="text-lg font-bold text-white mt-1">{fmt(totals.impressions)}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500">Total Clicks</p><p className="text-lg font-bold text-white mt-1">{fmt(totals.clicks)}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500">Total Conversions</p><p className="text-lg font-bold text-white mt-1">{fmt(totals.conversions)}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500">Total Spend</p><p className="text-lg font-bold text-white mt-1">{fmtCurrency(totals.spend)}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500">Total Revenue</p><p className="text-lg font-bold text-white mt-1">{fmtCurrency(totals.revenue)}</p></div>
      </div>

      {/* Bar chart */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Impressions by Channel</h3>
        <div className="space-y-2.5">
          {sorted.map(d => {
            const cm = CHANNEL_META[d.channel];
            const pct = (d.impressions / maxImpressions) * 100;
            return (
              <div key={d.id}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-400">{cm.label}</span>
                  <span className="text-gray-500">{fmt(d.impressions)}</span>
                </div>
                <div className="h-6 bg-gray-800 rounded-sm overflow-hidden flex">
                  <div className={`${cm.color} h-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comparison table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500">
                <th className="p-3 text-left font-medium">Channel</th>
                <th className="p-3 text-right font-medium cursor-pointer hover:text-white" onClick={() => toggleSort("impressions")}>Impressions<SortIcon col="impressions" /></th>
                <th className="p-3 text-right font-medium cursor-pointer hover:text-white" onClick={() => toggleSort("clicks")}>Clicks<SortIcon col="clicks" /></th>
                <th className="p-3 text-right font-medium cursor-pointer hover:text-white" onClick={() => toggleSort("ctr")}>CTR<SortIcon col="ctr" /></th>
                <th className="p-3 text-right font-medium cursor-pointer hover:text-white" onClick={() => toggleSort("cpc")}>CPC<SortIcon col="cpc" /></th>
                <th className="p-3 text-right font-medium cursor-pointer hover:text-white" onClick={() => toggleSort("conversions")}>Conv.<SortIcon col="conversions" /></th>
                <th className="p-3 text-right font-medium cursor-pointer hover:text-white" onClick={() => toggleSort("cvr")}>CVR<SortIcon col="cvr" /></th>
                <th className="p-3 text-right font-medium cursor-pointer hover:text-white" onClick={() => toggleSort("spend")}>Spend<SortIcon col="spend" /></th>
                <th className="p-3 text-right font-medium cursor-pointer hover:text-white" onClick={() => toggleSort("revenue")}>Revenue<SortIcon col="revenue" /></th>
                <th className="p-3 text-right font-medium cursor-pointer hover:text-white" onClick={() => toggleSort("roas")}>ROAS<SortIcon col="roas" /></th>
                <th className="p-3 text-right font-medium cursor-pointer hover:text-white" onClick={() => toggleSort("reach")}>Reach<SortIcon col="reach" /></th>
              </tr>
            </thead>
            <tbody>
              {data.map(d => {
                const cm = CHANNEL_META[d.channel];
                return (
                  <tr key={d.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="p-3"><span className="flex items-center gap-2 text-white font-medium"><div className={`w-2.5 h-2.5 rounded-full ${cm.color}`} />{cm.label}</span></td>
                    <td className="p-3 text-right text-gray-300">{fmt(d.impressions)}</td>
                    <td className="p-3 text-right text-gray-300">{fmt(d.clicks)}</td>
                    <td className="p-3 text-right text-gray-300">{fmtRate(d.ctr, 2)}%</td>
                    <td className="p-3 text-right text-gray-300">${fmtRate(d.cpc, 2)}</td>
                    <td className="p-3 text-right text-gray-300">{fmt(d.conversions)}</td>
                    <td className="p-3 text-right text-gray-300">{fmtRate(d.cvr, 1)}%</td>
                    <td className="p-3 text-right text-gray-300">{fmtCurrency(d.spend)}</td>
                    <td className="p-3 text-right text-green-400">{fmtCurrency(d.revenue)}</td>
                    <td className="p-3 text-right"><span className={`${d.roas >= 3 ? "text-green-400" : d.roas >= 1.5 ? "text-yellow-400" : "text-red-400"}`}>{fmtRate(d.roas, 1)}x</span></td>
                    <td className="p-3 text-right text-gray-300">{fmt(d.reach)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Best/worst performers */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-400" /> Best ROAS</h3>
          {[...data].sort((a, b) => b.roas - a.roas).slice(0, 3).map((d, i) => {
            const cm = CHANNEL_META[d.channel];
            return <div key={d.id} className="flex items-center justify-between py-1.5 border-b border-gray-800/50 last:border-0">
              <span className="flex items-center gap-2 text-sm text-gray-300"><span className="text-gray-600 w-4">{i + 1}.</span><div className={`w-2 h-2 rounded-full ${cm.color}`} />{cm.label}</span>
              <span className="text-sm text-green-400 font-medium">{fmtRate(d.roas, 1)}x</span>
            </div>;
          })}
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><DollarSign className="w-4 h-4 text-amber-400" /> Lowest CPC</h3>
          {[...data].sort((a, b) => a.cpc - b.cpc).slice(0, 3).map((d, i) => {
            const cm = CHANNEL_META[d.channel];
            return <div key={d.id} className="flex items-center justify-between py-1.5 border-b border-gray-800/50 last:border-0">
              <span className="flex items-center gap-2 text-sm text-gray-300"><span className="text-gray-600 w-4">{i + 1}.</span><div className={`w-2 h-2 rounded-full ${cm.color}`} />{cm.label}</span>
              <span className="text-sm text-amber-400 font-medium">${fmtRate(d.cpc, 2)}</span>
            </div>;
          })}
        </div>
      </div>
    </div>
  );
}


