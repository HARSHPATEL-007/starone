import { useState, useEffect, useMemo } from "react";
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Users, Smartphone, Monitor, Globe, Mail, Download, RefreshCw, X, Calendar, Eye } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useToast } from "../components/Toast";
import { api } from "../api/client";
import { SkeletonChart } from "../components/Skeleton";

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

interface ChannelPerformanceTotals {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  ctr: number;
  cpc: number;
  cvr: number;
  roas: number;
  campaignCount: number;
}

interface ChannelPerformanceResponse {
  channels: {
    platform: string;
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
    revenue: number;
    ctr: number;
    cpc: number;
    cvr: number;
    roas: number;
    campaignCount: number;
  }[];
  totals: ChannelPerformanceTotals;
  dailyTrend: Record<string, any>[];
}

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

const DATE_OPTIONS = [
  { label: "All Time", value: 0 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function compute(metrics: ChannelMetrics[]): ChannelMetrics[] {
  return metrics.map(m => ({
    ...m, ctr: m.impressions > 0 ? (m.clicks / m.impressions * 100) : 0,
    cpc: m.clicks > 0 ? (m.spend / m.clicks) : 0,
    cvr: m.clicks > 0 ? (m.conversions / m.clicks * 100) : 0,
    roas: m.spend > 0 ? (m.revenue / m.spend) : 0,
  }));
}

function fmt(n: number, decimals = 1): string {
  if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(decimals) + "M";
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(decimals) + "K";
  return n.toLocaleString();
}

function fmtCurrency(n: number): string { return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
function fmtRate(n: number, decimals = 2): string { return n.toFixed(decimals); }

export default function ChannelPerformance() {
  const { addToast } = useToast();
  const [data, setData] = useState<ChannelMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<keyof ChannelMetrics>("spend");
  const [sortDesc, setSortDesc] = useState(true);
  const [dateFilter, setDateFilter] = useState(0);
  const [drillChannel, setDrillChannel] = useState<ChannelMetrics | null>(null);
  const [trendMetric, setTrendMetric] = useState<"impressions" | "clicks" | "spend" | "conversions">("impressions");

  const [dailyTrend, setDailyTrend] = useState<Record<string, any>[]>([]);
  const [totals, setTotals] = useState<ChannelPerformanceTotals>({ impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0, ctr: 0, cpc: 0, cvr: 0, roas: 0, campaignCount: 0 });

  function mapChannelItem(item: any, index: number): ChannelMetrics {
    const channel = item.platform || item.channel;
    return {
      id: item.id || `ch-${index}`,
      channel: channel as Channel,
      impressions: item.impressions || 0,
      clicks: item.clicks || 0,
      conversions: item.conversions || 0,
      spend: item.spend || 0,
      revenue: item.revenue || 0,
      ctr: item.ctr || 0,
      cpc: item.cpc || 0,
      cvr: item.cvr || 0,
      roas: item.roas || 0,
      reach: item.reach || item.impressions || 0,
      frequency: item.frequency || 1,
    };
  }

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const resp: ChannelPerformanceResponse = await api.channelPerformance.list();
      setData((resp.channels || []).map((c, i) => mapChannelItem(c, i)));
      setTotals(resp.totals || { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0, ctr: 0, cpc: 0, cvr: 0, roas: 0, campaignCount: 0 });
      setDailyTrend(resp.dailyTrend || []);
    } catch {
      try {
        const raw = await api.entities.list("channel_performance");
        if (raw && raw.length > 0) {
          setData(compute(raw.map((c: any, i: number) => mapChannelItem(c, i))));
        }
      } catch {}
    }
    setLoading(false);
  }

  const maxImpressions = data.length > 0 ? Math.max(...data.map(d => d.impressions)) : 1;
  const sorted = useMemo(() => [...data].sort((a, b) => { const aV = a[sortBy] as number; const bV = b[sortBy] as number; return sortDesc ? bV - aV : aV - bV; }), [data, sortBy, sortDesc]);
  const computedTotals = useMemo(() => ({
    impressions: totals.impressions || data.reduce((s, d) => s + d.impressions, 0),
    clicks: totals.clicks || data.reduce((s, d) => s + d.clicks, 0),
    conversions: totals.conversions || data.reduce((s, d) => s + d.conversions, 0),
    spend: totals.spend || data.reduce((s, d) => s + d.spend, 0),
    revenue: totals.revenue || data.reduce((s, d) => s + d.revenue, 0),
  }), [data, totals]);

  const trendData = useMemo(() => {
    if (dailyTrend.length > 0) {
      return dailyTrend.map((d: Record<string, any>) => {
        const row: Record<string, any> = { month: d.date ? d.date.slice(5, 10) : "" };
        let impressions = 0, clicks = 0, spend = 0, conversions = 0;
        for (const key of Object.keys(d)) {
          if (key === "date") continue;
          const v = d[key];
          if (v && typeof v === "object") {
            impressions += v.impressions || 0;
            clicks += v.clicks || 0;
            spend += v.spend || 0;
            conversions += v.conversions || 0;
          }
        }
        row.impressions = impressions;
        row.clicks = clicks;
        row.spend = spend;
        row.conversions = conversions;
        return row;
      });
    }
    return MONTHS.map((m) => ({ month: m, impressions: 0, clicks: 0, spend: 0, conversions: 0 }));
  }, [dailyTrend]);

  function toggleSort(key: keyof ChannelMetrics) {
    if (sortBy === key) setSortDesc(!sortDesc);
    else { setSortBy(key); setSortDesc(true); }
  }

  function SortIcon({ col }: { col: keyof ChannelMetrics }) {
    if (sortBy !== col) return null;
    return sortDesc ? <TrendingDown className="w-3 h-3 inline ml-0.5" /> : <TrendingUp className="w-3 h-3 inline ml-0.5" />;
  }

  function handleExport() {
    const headers = ["Channel", "Impressions", "Clicks", "CTR", "CPC", "Conversions", "CVR", "Spend", "Revenue", "ROAS", "Reach", "Frequency"];
    const rows = data.map(d => {
      const cm = CHANNEL_META[d.channel];
      return [cm.label, d.impressions, d.clicks, fmtRate(d.ctr, 2) + "%", "$" + fmtRate(d.cpc, 2), d.conversions, fmtRate(d.cvr, 1) + "%", d.spend, d.revenue, fmtRate(d.roas, 1) + "x", d.reach, d.frequency];
    });
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "channel-performance.csv"; a.click();
    URL.revokeObjectURL(url);
    addToast("success", "Exported channel data");
  }

  if (loading) {
    return <div className="space-y-6"><SkeletonChart /><SkeletonChart /></div>;
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
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar className="w-3 h-3" /> Range:
          </div>
          {DATE_OPTIONS.map((d) => (
            <button key={d.value} className={`text-xs px-2 py-1 rounded border ${dateFilter === d.value ? "border-n0va-600/40 bg-n0va-600/20 text-n0va-400" : "border-gray-700 text-gray-500 hover:border-gray-600"}`} onClick={() => setDateFilter(d.value)}>{d.label}</button>
          ))}
          <button className="btn-secondary text-xs flex items-center gap-1.5" onClick={handleExport}><Download className="w-3.5 h-3.5" /> Export</button>
          <button className="btn-secondary text-xs flex items-center gap-1.5" onClick={loadData}><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="card p-4"><p className="text-xs text-gray-500">Total Impressions</p><p className="text-lg font-bold text-white mt-1">{fmt(computedTotals.impressions)}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500">Total Clicks</p><p className="text-lg font-bold text-white mt-1">{fmt(computedTotals.clicks)}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500">Total Conversions</p><p className="text-lg font-bold text-white mt-1">{fmt(computedTotals.conversions)}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500">Total Spend</p><p className="text-lg font-bold text-white mt-1">{fmtCurrency(computedTotals.spend)}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500">Total Revenue</p><p className="text-lg font-bold text-white mt-1">{fmtCurrency(computedTotals.revenue)}</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Impressions by Channel</h3>
          </div>
          <div className="space-y-2.5">
            {sorted.map(d => {
              const cm = CHANNEL_META[d.channel];
              const pct = (d.impressions / maxImpressions) * 100;
              return (
                <div key={d.id} className="cursor-pointer hover:bg-gray-800/20 rounded px-1 py-0.5" onClick={() => setDrillChannel(d)}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-400 flex items-center gap-1.5"><div className={`w-2 h-2 rounded-full ${cm.color}`} />{cm.label}</span>
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

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Performance Trend</h3>
            <select className="input py-1 text-xs w-auto" value={trendMetric} onChange={e => setTrendMetric(e.target.value as any)}>
              <option value="impressions">Impressions</option>
              <option value="clicks">Clicks</option>
              <option value="spend">Spend</option>
              <option value="conversions">Conversions</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9ca3af" }} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
              <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px", fontSize: "12px" }} />
              <Line type="monotone" dataKey={trendMetric} stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

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
                <th className="p-3 w-10" />
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
                    <td className="p-3">
                      <button onClick={() => setDrillChannel(d)} className="text-gray-600 hover:text-n0va-400"><Eye className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

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

      {/* Drill-down modal */}
      {drillChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setDrillChannel(null)}>
          <div className="w-full max-w-lg bg-n0va-800 rounded-xl border border-gray-800 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${CHANNEL_META[drillChannel.channel]?.color || "bg-gray-500"}`} />
                {CHANNEL_META[drillChannel.channel]?.label || drillChannel.channel}
              </h3>
              <button onClick={() => setDrillChannel(null)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="card p-3"><p className="text-[10px] text-gray-500">Impressions</p><p className="text-lg font-bold text-white">{fmt(drillChannel.impressions)}</p></div>
              <div className="card p-3"><p className="text-[10px] text-gray-500">Clicks</p><p className="text-lg font-bold text-white">{fmt(drillChannel.clicks)}</p></div>
              <div className="card p-3"><p className="text-[10px] text-gray-500">CTR</p><p className="text-lg font-bold text-white">{fmtRate(drillChannel.ctr, 2)}%</p></div>
              <div className="card p-3"><p className="text-[10px] text-gray-500">CPC</p><p className="text-lg font-bold text-white">${fmtRate(drillChannel.cpc, 2)}</p></div>
              <div className="card p-3"><p className="text-[10px] text-gray-500">Conversions</p><p className="text-lg font-bold text-white">{fmt(drillChannel.conversions)}</p></div>
              <div className="card p-3"><p className="text-[10px] text-gray-500">CVR</p><p className="text-lg font-bold text-white">{fmtRate(drillChannel.cvr, 1)}%</p></div>
              <div className="card p-3"><p className="text-[10px] text-gray-500">Spend</p><p className="text-lg font-bold text-white">{fmtCurrency(drillChannel.spend)}</p></div>
              <div className="card p-3"><p className="text-[10px] text-gray-500">Revenue</p><p className="text-lg font-bold text-green-400">{fmtCurrency(drillChannel.revenue)}</p></div>
              <div className="card p-3"><p className="text-[10px] text-gray-500">ROAS</p><p className="text-lg font-bold text-white">{fmtRate(drillChannel.roas, 1)}x</p></div>
              <div className="card p-3"><p className="text-[10px] text-gray-500">Reach</p><p className="text-lg font-bold text-white">{fmt(drillChannel.reach)}</p></div>
              <div className="card p-3"><p className="text-[10px] text-gray-500">Frequency</p><p className="text-lg font-bold text-white">{fmtRate(drillChannel.frequency, 1)}</p></div>
              <div className="card p-3"><p className="text-[10px] text-gray-500">Revenue/Spend</p><p className="text-lg font-bold text-white">{fmtRate(drillChannel.revenue / (drillChannel.spend || 1), 1)}x</p></div>
            </div>
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-gray-400 mb-2">12-Month Trend</h4>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={trendData.length > 0 ? trendData : MONTHS.map((m) => ({ month: m, impressions: 0 }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#9ca3af" }} />
                  <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px", fontSize: "11px" }} />
                  <Line type="monotone" dataKey="impressions" stroke="#6366f1" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
