import { useState } from "react";
import { api } from "../api/client";
import { TreePine, ArrowUpDown, Search, GitGraph, Type, Workflow, Box } from "lucide-react";

const tabs = [
  { id: "structures", label: "Data Structures", icon: Box },
  { id: "sorting", label: "Sorting", icon: ArrowUpDown },
  { id: "searching", label: "Searching", icon: Search },
  { id: "graph", label: "Graph", icon: GitGraph },
  { id: "string", label: "String", icon: Type },
  { id: "dp", label: "Dynamic Prog.", icon: Workflow },
  { id: "optimization", label: "Optimization", icon: TreePine },
];

const subTabs: Record<string, { id: string; label: string }[]> = {
  structures: [
    { id: "trie", label: "Trie" },
    { id: "fenwick", label: "Fenwick Tree" },
    { id: "segment-tree", label: "Segment Tree" },
    { id: "union-find", label: "Union-Find" },
    { id: "bloom-filter", label: "Bloom Filter" },
    { id: "min-heap", label: "Min Heap" },
    { id: "lru-cache", label: "LRU Cache" },
  ],
  sorting: [
    { id: "quickSort", label: "QuickSort" },
    { id: "mergeSort", label: "MergeSort" },
    { id: "heapSort", label: "HeapSort" },
    { id: "quickSelect", label: "QuickSelect" },
  ],
  searching: [
    { id: "binarySearch", label: "Binary Search" },
    { id: "ternarySearch", label: "Ternary Search" },
  ],
  graph: [
    { id: "bfs", label: "BFS" },
    { id: "dfs", label: "DFS" },
    { id: "dijkstra", label: "Dijkstra" },
    { id: "topologicalSort", label: "Topological Sort" },
    { id: "detectCycle", label: "Cycle Detection" },
  ],
  string: [
    { id: "kmp", label: "KMP" },
    { id: "rabinKarp", label: "Rabin-Karp" },
    { id: "levenshtein", label: "Levenshtein" },
    { id: "zAlgorithm", label: "Z-Algorithm" },
  ],
  dp: [
    { id: "knapSack", label: "0/1 KnapSack" },
    { id: "lcs", label: "LCS" },
    { id: "lis", label: "LIS" },
    { id: "coinChange", label: "Coin Change" },
    { id: "maxSubarray", label: "Max Subarray" },
  ],
  optimization: [
    { id: "convexHull", label: "Convex Hull" },
    { id: "kClosest", label: "K Closest" },
  ],
};

export default function DSAlgorithms() {
  const [activeTab, setActiveTab] = useState("structures");
  const [activeSub, setActiveSub] = useState("trie");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setLoading(true); setError(null); setResult(null);
    try {
      let res: any;
      const sampleNums = [38, 27, 43, 3, 9, 82, 10, 25, 17, 51, 6, 94, 1, 72, 33];
      const words = ["campaign", "creative", "conversion", "click", "cost", "customer", "content", "channel"];
      switch (activeSub) {
        case "trie":
          res = await api.dsAlgorithms.trie({ words, prefixes: ["cam", "cre", "con", "cli", "cost"] });
          break;
        case "fenwick":
          res = await api.dsAlgorithms.fenwick({ values: [3, 7, 1, 9, 4, 6, 8, 2, 5, 0], queries: [{ type: "prefix", l: 5 }, { type: "range", l: 3, r: 7 }] });
          break;
        case "segment-tree":
          res = await api.dsAlgorithms.segmentTree({ values: [5, 2, 9, 1, 7, 3, 8, 4, 6, 0], queries: [{ type: "sum", l: 2, r: 6 }, { type: "min", l: 1, r: 5 }, { type: "max", l: 3, r: 8 }] });
          break;
        case "union-find":
          res = await api.dsAlgorithms.unionFind({ elements: ["a", "b", "c", "d", "e", "f", "g"], unions: [["a", "b"], ["b", "c"], ["d", "e"], ["f", "g"]], queries: [["a", "c"], ["a", "d"], ["d", "e"]] });
          break;
        case "bloom-filter":
          res = await api.dsAlgorithms.bloomFilter({ items: ["user_1", "user_2", "user_3", "user_4", "user_5", "user_6", "user_7", "user_8", "user_9", "user_10"], testItems: ["user_1", "user_11", "user_5", "user_20"], falsePositiveRate: 0.01 });
          break;
        case "min-heap":
          res = await api.dsAlgorithms.minHeap({ values: sampleNums, k: 5 });
          break;
        case "lru-cache":
          res = await api.dsAlgorithms.lruCache({ capacity: 3, operations: [{ action: "put", key: "a", value: 1 }, { action: "put", key: "b", value: 2 }, { action: "put", key: "c", value: 3 }, { action: "get", key: "a" }, { action: "put", key: "d", value: 4 }, { action: "get", key: "b" }, { action: "get", key: "c" }] });
          break;
        case "quickSelect":
          res = await api.dsAlgorithms.quickSelect({ array: sampleNums, k: 3 });
          break;
        case "binarySearch":
          res = await api.dsAlgorithms.binarySearch({ array: sampleNums, target: 25 });
          break;
        case "ternarySearch":
          res = await api.dsAlgorithms.ternarySearch({ lo: 0, hi: 10, funcType: "negative" });
          break;
        case "bfs":
        case "dfs":
          res = await api.dsAlgorithms[activeSub]({ nodes: ["A", "B", "C", "D", "E", "F"], edges: [["A", "B"], ["A", "C"], ["B", "D"], ["B", "E"], ["C", "F"]], start: "A" });
          break;
        case "dijkstra":
          res = await api.dsAlgorithms.dijkstra({ nodes: ["A", "B", "C", "D", "E"], edges: [["A", "B", 4], ["A", "C", 2], ["B", "C", 1], ["B", "D", 5], ["C", "D", 8], ["C", "E", 10], ["D", "E", 2]], start: "A", end: "E" });
          break;
        case "topologicalSort":
          res = await api.dsAlgorithms.topologicalSort({ nodes: ["campaign", "creative", "audience", "ad_group", "keyword", "ad"], edges: [["campaign", "ad_group"], ["ad_group", "keyword"], ["ad_group", "ad"], ["creative", "ad"], ["audience", "ad_group"]] });
          break;
        case "detectCycle":
          res = await api.dsAlgorithms.detectCycle({ nodes: ["A", "B", "C", "D"], edges: [["A", "B"], ["B", "C"], ["C", "A"], ["B", "D"]] });
          break;
        case "kmp":
        case "rabinKarp":
        case "zAlgorithm":
          res = await api.dsAlgorithms[activeSub]({ text: "ABCABCABDABCABCABCDABD", pattern: "ABCABD" });
          break;
        case "levenshtein":
          res = await api.dsAlgorithms.levenshtein({ a: "conversion rate optimization", b: "conversion rate" });
          break;
        case "knapSack":
          res = await api.dsAlgorithms.knapSack({ capacity: 50, items: [{ weight: 10, value: 60, name: "Display Ads" }, { weight: 20, value: 100, name: "Social Ads" }, { weight: 30, value: 120, name: "Search Ads" }, { weight: 15, value: 80, name: "Video Ads" }] });
          break;
        case "lcs":
          res = await api.dsAlgorithms.lcs({ a: "ABCDEF", b: "ACDF" });
          break;
        case "lis":
          res = await api.dsAlgorithms.lis({ array: [10, 22, 9, 33, 21, 50, 41, 60, 80] });
          break;
        case "coinChange":
          res = await api.dsAlgorithms.coinChange({ coins: [1, 5, 10, 25], amount: 63 });
          break;
        case "maxSubarray":
          res = await api.dsAlgorithms.maxSubarray({ array: [-2, 1, -3, 4, -1, 2, 1, -5, 4] });
          break;
        case "convexHull":
          res = await api.dsAlgorithms.convexHull({ points: [{ x: 0, y: 3 }, { x: 2, y: 2 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 0 }, { x: 0, y: 0 }, { x: 3, y: 3 }] });
          break;
        case "kClosest":
          res = await api.dsAlgorithms.kClosest({ points: [{ x: 1, y: 2 }, { x: 3, y: 4 }, { x: -1, y: 0 }, { x: 5, y: 6 }, { x: 0, y: 1 }], k: 3, target: { x: 0, y: 0 } });
          break;
        default:
          if (activeSub === "quickSort" || activeSub === "mergeSort" || activeSub === "heapSort") {
            res = await api.dsAlgorithms.sort({ array: sampleNums, algorithm: activeSub });
          }
      }
      setResult(res);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  function renderResult() {
    if (!result) return null;
    return (
      <pre className="text-xs font-mono text-gray-300 bg-gray-800/50 p-4 rounded-lg max-h-96 overflow-auto whitespace-pre-wrap">
        {JSON.stringify(result, null, 2)}
      </pre>
    );
  }

  const subs = subTabs[activeTab] || subTabs.structures;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Data Structures &amp; Algorithms</h1>
        <p className="text-gray-400 text-sm mt-1">Trie, Fenwick, Segment Tree, Union-Find, Bloom Filter, Min Heap, LRU Cache, Sorting, Searching, Graph, String, DP &amp; Optimization</p>
      </div>
      <div className="flex gap-2 border-b border-gray-800 pb-2 flex-wrap">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => { setActiveTab(t.id); setActiveSub(subs[0]?.id || "trie"); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === t.id ? "bg-n0va-600/20 text-n0va-400 border border-n0va-600/30" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"}`}>
              <Icon className="w-4 h-4" />{t.label}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2 flex-wrap">
        {subs.map((s) => (
          <button key={s.id} onClick={() => setActiveSub(s.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeSub === s.id ? "bg-n0va-600/20 text-n0va-400 border border-n0va-600/30" : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"}`}>
            {s.label}
          </button>
        ))}
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <button onClick={handleRun} disabled={loading} className="bg-n0va-600 hover:bg-n0va-500 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50 mb-6">
          {loading ? "Running..." : `Run ${activeSub}`}
        </button>
        {error && <div className="bg-red-900/30 border border-red-800 text-red-400 p-3 rounded-lg mb-4 text-sm">{error}</div>}
        {renderResult()}
      </div>
    </div>
  );
}
