import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { api } from "../api/client";
import { RefreshCw, Users, Plus, ExternalLink } from "lucide-react";
import { SkeletonCard } from "../components/Skeleton";

interface Audience {
  id: string;
  name: string;
  description: string;
  size: number;
  source: string;
  tags: string[];
}

interface OverlapResult {
  audienceA: string;
  audienceB: string;
  overlapSize: number;
  overlapPercentage: number;
  uniqueToA: number;
  uniqueToB: number;
}

export default function AudienceOverlap() {
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [overlaps, setOverlaps] = useState<OverlapResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>([]);
  const [savedSegments, setSavedSegments] = useState<{ name: string; audiences: string[] }[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [audienceData, overlapData] = await Promise.all([
        api.audiences.list(),
        api.analytics.overlap(),
      ]);
      setAudiences(audienceData || []);
      setOverlaps(overlapData || []);
      if (audienceData && audienceData.length > 0) {
        // Pre-select first 3 audiences (max for comparison)
        setSelectedAudiences(audienceData.slice(0, Math.min(3, audienceData.length)).map((a: Audience) => a.id));
      }
    } finally {
      setLoading(false);
    }
  }

  function toggleAudience(id: string) {
    setSelectedAudiences((prev) => {
      if (prev.includes(id)) return prev.filter((a) => a !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  function getOverlapMatrix() {
    const matrix: { name: string; [key: string]: any }[] = [];
    const selected = audiences.filter((a) => selectedAudiences.includes(a.id));
    for (const a of selected) {
      const row: { name: string; [key: string]: any } = { name: a.name };
      for (const b of selected) {
        if (a.id === b.id) {
          row[b.name] = 100;
        } else {
          const overlap = overlaps.find(
            (o) =>
              (o.audienceA === a.id && o.audienceB === b.id) ||
              (o.audienceA === b.id && o.audienceB === a.id)
          );
          row[b.name] = overlap ? overlap.overlapPercentage : 0;
        }
      }
      matrix.push(row);
    }
    return matrix;
  }

  function getOverlapPairs() {
    const pairs: { a: string; b: string; overlap: number; uniqueA: number; uniqueB: number; aName: string; bName: string }[] = [];
    const selected = audiences.filter((a) => selectedAudiences.includes(a.id));
    for (let i = 0; i < selected.length; i++) {
      for (let j = i + 1; j < selected.length; j++) {
        const overlap = overlaps.find(
          (o) =>
            (o.audienceA === selected[i].id && o.audienceB === selected[j].id) ||
            (o.audienceA === selected[j].id && o.audienceB === selected[i].id)
        );
        if (overlap) {
          pairs.push({
            a: selected[i].id,
            b: selected[j].id,
            overlap: overlap.overlapPercentage,
            uniqueA: overlap.uniqueToA,
            uniqueB: overlap.uniqueToB,
            aName: selected[i].name,
            bName: selected[j].name,
          });
        }
      }
    }
    return pairs;
  }

  function saveSegment() {
    const name = `Segment ${savedSegments.length + 1}`;
    setSavedSegments((prev) => [...prev, { name, audiences: [...selectedAudiences] }]);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonCard />
      </div>
    );
  }

  const overlapPairs = getOverlapPairs();
  const matrixData = getOverlapMatrix();

  const maxOverlap = overlaps.length > 0 ? Math.max(...overlaps.map((o) => o.overlapPercentage)) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Audience Overlap Analysis</h1>
          <p className="text-gray-500 mt-1">Visualize overlap between audience segments</p>
        </div>
        <button className="btn-secondary flex items-center gap-2" onClick={loadData}>
          <RefreshCw className="w-4 h-4" /> New Sample
        </button>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-3">Select Audiences (up to 3)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {audiences.map((a) => (
            <button
              key={a.id}
              className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                selectedAudiences.includes(a.id)
                  ? "border-n0va-600/40 bg-n0va-600/20"
                  : selectedAudiences.length >= 3 && !selectedAudiences.includes(a.id)
                  ? "border-gray-800 bg-gray-800/30 opacity-50 cursor-not-allowed"
                  : "border-gray-800 bg-gray-800/30 hover:border-gray-700"
              }`}
              onClick={() => toggleAudience(a.id)}
              disabled={selectedAudiences.length >= 3 && !selectedAudiences.includes(a.id)}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${
                selectedAudiences.includes(a.id) ? "bg-n0va-600/30 text-n0va-400" : "bg-gray-800 text-gray-500"
              }`}>
                {a.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{a.name}</p>
                <p className="text-xs text-gray-500">{(a.size / 1000).toFixed(1)}K users</p>
              </div>
              {selectedAudiences.includes(a.id) && (
                <div className="w-5 h-5 bg-n0va-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {selectedAudiences.length >= 2 && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Overlap Heatmap</h3>
                <span className="text-xs text-gray-500">% overlap between segments</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="py-2 pr-4"></th>
                      {matrixData.map((row) => (
                        <th key={row.name} className="py-2 px-3 text-center text-gray-500 font-medium text-xs">{row.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrixData.map((row) => (
                      <tr key={row.name}>
                        <td className="py-2 pr-4 text-gray-300 font-medium text-xs whitespace-nowrap">{row.name}</td>
                        {matrixData.map((col) => {
                          const val = row[col.name] as number | undefined;
                          const isSelf = row.name === col.name;
                          const intensity = val !== undefined ? Math.min(val / (maxOverlap || 1), 1) : 0;
                          return (
                            <td key={col.name} className="py-2 px-3 text-center">
                              <div
                                className="rounded-lg py-2 px-3 text-xs font-medium"
                                style={{
                                  backgroundColor: isSelf
                                    ? "rgba(139, 92, 246, 0.3)"
                                    : `rgba(26, 109, 255, ${intensity * 0.4 + 0.05})`,
                                  color: isSelf ? "#c4b5fd" : val !== undefined && val > 50 ? "#60a5fa" : "#9ca3af",
                                }}
                              >
                                {isSelf ? "—" : val !== undefined ? `${val.toFixed(1)}%` : "—"}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Overlap Breakdown</h3>
              <div className="space-y-4">
                {overlapPairs.map((pair) => {
                  const total = pair.overlap + pair.uniqueA + pair.uniqueB;
                  return (
                    <div key={`${pair.a}-${pair.b}`} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-300">{pair.aName}</span>
                        <span className="text-gray-500">vs</span>
                        <span className="text-gray-300">{pair.bName}</span>
                      </div>
                      <div className="h-6 bg-gray-800 rounded-full flex overflow-hidden text-xs">
                        <div
                          className="bg-n0va-500 flex items-center justify-center text-xs text-white font-medium"
                          style={{ width: `${pair.overlap}%` }}
                          title={`Overlap: ${pair.overlap.toFixed(1)}%`}
                        >
                          {pair.overlap > 15 ? `${pair.overlap.toFixed(0)}%` : ""}
                        </div>
                        <div
                          className="bg-blue-500 flex items-center justify-center text-xs text-white font-medium"
                          style={{ width: `${pair.uniqueA}%` }}
                          title={`Unique to ${pair.aName}: ${pair.uniqueA.toFixed(1)}%`}
                        >
                          {pair.uniqueA > 15 ? `${pair.uniqueA.toFixed(0)}%` : ""}
                        </div>
                        <div
                          className="bg-green-500 flex items-center justify-center text-xs text-white font-medium"
                          style={{ width: `${pair.uniqueB}%` }}
                          title={`Unique to ${pair.bName}: ${pair.uniqueB.toFixed(1)}%`}
                        >
                          {pair.uniqueB > 15 ? `${pair.uniqueB.toFixed(0)}%` : ""}
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{(pair.uniqueA + pair.overlap).toFixed(0)}% total</span>
                        <span className="text-n0va-400">{pair.overlap.toFixed(1)}% overlap</span>
                        <span>{(pair.uniqueB + pair.overlap).toFixed(0)}% total</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Pairwise Overlap Chart</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overlapPairs.map((p) => ({
                  name: `${p.aName} / ${p.bName}`,
                  Overlap: parseFloat(p.overlap.toFixed(1)),
                  uniqueA: parseFloat(p.uniqueA.toFixed(1)),
                  uniqueB: parseFloat(p.uniqueB.toFixed(1)),
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={10} />
                  <YAxis stroke="#6b7280" fontSize={11} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }} />
                  <Bar dataKey="UniqueA" stackId="a" fill="#1a6dff" name="Unique to A" />
                  <Bar dataKey="Overlap" stackId="a" fill="#8b5cf6" name="Overlap" />
                  <Bar dataKey="UniqueB" stackId="a" fill="#10b981" name="Unique to B" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {selectedAudiences.length < 2 && (
        <div className="card text-center py-12">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Select at least 2 audiences to view overlap analysis</p>
          <p className="text-gray-600 text-sm mt-1">Select up to 3 audiences for pairwise comparison</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Saved Segments</h3>
            {selectedAudiences.length >= 2 && (
              <button className="btn-secondary text-xs flex items-center gap-1.5" onClick={saveSegment}>
                <Plus className="w-3.5 h-3.5" /> Save Current
              </button>
            )}
          </div>
          {savedSegments.length === 0 ? (
            <p className="text-gray-500 text-sm">No saved segments yet. Compare audiences and save them here.</p>
          ) : (
            <div className="space-y-2">
              {savedSegments.map((seg, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div>
                    <p className="text-sm text-white font-medium">{seg.name}</p>
                    <p className="text-xs text-gray-500">{seg.audiences.length} audiences</p>
                  </div>
                  <button className="text-gray-500 hover:text-n0va-400">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Insights</h3>
          <div className="space-y-3">
            {overlapPairs.length > 0 ? (
              <>
                {overlapPairs.some((p) => p.overlap > 50) && (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <p className="text-sm text-yellow-300">
                      <strong>High Overlap Detected:</strong> {overlapPairs.filter((p) => p.overlap > 50).map((p) => `${p.aName} & ${p.bName}`).join(", ")} share more than 50% of their audience.
                    </p>
                  </div>
                )}
                {overlapPairs.some((p) => p.overlap < 15) && (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-sm text-green-300">
                      <strong>Low Overlap:</strong> {overlapPairs.filter((p) => p.overlap < 15).map((p) => `${p.aName} & ${p.bName}`).join(", ")} — these segments are highly distinct.
                    </p>
                  </div>
                )}
                {overlapPairs.some((p) => p.overlap >= 15 && p.overlap <= 50) && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-sm text-blue-300">
                      <strong>Moderate Overlap:</strong> Some segments have moderate overlap — consider creating a combined segment for retargeting.
                    </p>
                  </div>
                )}
                <div className="p-3 bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-400">
                    <strong className="text-gray-300">Tip:</strong> Audiences with less than 30% overlap are ideal for A/B testing creative or messaging variants.
                  </p>
                </div>
              </>
            ) : (
              <p className="text-gray-500 text-sm">Select 2+ audiences to see overlap insights</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
