import { useState } from "react";
import { api } from "../api/client";
import { TreePine, ArrowUpDown, Search, GitGraph, Type, Workflow, Box, Database, Brain, LineChart, DollarSign } from "lucide-react";

const tabs = [
  { id: "structures", label: "Data Structures", icon: Box },
  { id: "sorting", label: "Sorting", icon: ArrowUpDown },
  { id: "searching", label: "Searching", icon: Search },
  { id: "graph", label: "Graph", icon: GitGraph },
  { id: "string", label: "String", icon: Type },
  { id: "dp", label: "Dynamic Prog.", icon: Workflow },
  { id: "optimization", label: "Optimization", icon: TreePine },
  { id: "depth8", label: "Depth 8", icon: Database },
  { id: "depth9", label: "Depth 9 Marketing", icon: Brain },
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
  depth8: [
    { id: "hllCardinality", label: "HLL Cardinality" },
    { id: "countMinSketch", label: "Count-Min Sketch" },
    { id: "weightedBloomFilter", label: "Weighted Bloom" },
    { id: "segmentTreeBeats", label: "SegTree Beats" },
    { id: "lcaBinaryLifting", label: "LCA Lifting" },
    { id: "kuhnMunkres", label: "Kuhn-Munkres" },
    { id: "geneticAlgorithm", label: "Genetic" },
    { id: "antColony", label: "Ant Colony" },
    { id: "edmondsKarp", label: "Edmonds-Karp" },
    { id: "twoSat", label: "2-SAT" },
    { id: "wordBreak", label: "Word Break" },
    { id: "burstBalloon", label: "Burst Balloon" },
    { id: "maxSlidingWindow", label: "Max Sliding Win" },
    { id: "skylineProblem", label: "Skyline" },
    { id: "syntheticControl", label: "Synth Control" },
    { id: "survivalAnalysis", label: "Survival" },
    { id: "marketBasketAnalysis", label: "Market Basket" },
    { id: "priceElasticity", label: "Price Elasticity" },
    { id: "cohortRetention", label: "Cohort Retention" },
  ],
  depth9: [
    { id: "campaignAttributionShapley", label: "Shapley Attr." },
    { id: "budgetPacingKalman", label: "Kalman Pacing" },
    { id: "creativePerformanceForecast", label: "Creative Forecast" },
    { id: "adFrequencyOptimizer", label: "Ad Frequency" },
    { id: "customerJourneyClustering", label: "Journey Cluster" },
    { id: "rfmSegmentation", label: "RFM Segment" },
    { id: "predictiveLeadScoring", label: "Lead Scoring" },
    { id: "budgetReallocator", label: "Budget Realloc." },
    { id: "multiTouchAttributionTimeDecay", label: "Time Decay Attr." },
    { id: "campaignOptimizerEvolutionary", label: "Evolve Optimize" },
    { id: "costCurveFitting", label: "Cost Curve" },
    { id: "marginalROICalculation", label: "Marginal ROI" },
    { id: "mediaMixDecomposer", label: "Media Mix" },
    { id: "incrementalLiftAnalysis", label: "Incremental Lift" },
    { id: "campaignHealthComposite", label: "Health Composite" },
    { id: "anomalyDetectionMarketing", label: "KPI Anomaly" },
    { id: "adCopyEffectiveness", label: "Ad Copy Eff." },
    { id: "demandForecastSeasonal", label: "Seasonal Demand" },
    { id: "revenueForecastMonteCarlo", label: "Revenue MC" },
    { id: "marketingRoiDecomposition", label: "ROI Decomp" },
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
        // Depth 8
        case "hllCardinality":
          res = await api.dsAlgorithms.hllCardinality({ values: [1,2,3,4,5,1,2,3,4,5,6,7,8,9,10], numRegisters: 64 });
          break;
        case "countMinSketch":
          res = await api.dsAlgorithms.countMinSketch({ operations: [{type:"add",item:"apple",count:10},{type:"add",item:"banana",count:5},{type:"estimate",item:"apple"},{type:"estimate",item:"cherry"}], width:100, depth:5 });
          break;
        case "weightedBloomFilter":
          res = await api.dsAlgorithms.weightedBloomFilter({ operations: [{type:"add",item:"foo",weight:2},{type:"add",item:"bar"},{type:"test",item:"foo"},{type:"test",item:"baz"}], falsePositiveRate: 0.01 });
          break;
        case "segmentTreeBeats":
          res = await api.dsAlgorithms.segmentTreeBeats({ values: [1,5,3,7,2,9,4,6], operations: [{type:"min",l:0,r:2,val:3},{type:"max",l:2,r:4,val:6},{type:"sum",l:0,r:4}] });
          break;
        case "lcaBinaryLifting":
          res = await api.dsAlgorithms.lcaBinaryLifting({ nodes:["A","B","C","D"], edges:[["A","B"],["A","C"],["B","D"]], queries:[["D","C"],["D","B"]] });
          break;
        case "kuhnMunkres":
          res = await api.dsAlgorithms.kuhnMunkres({ costMatrix:[[4,1,3],[2,0,5],[3,2,2]] });
          break;
        case "geneticAlgorithm":
          res = await api.dsAlgorithms.geneticAlgorithm({ params: { populationSize:30, generations:20, mutationRate:0.1, crossoverRate:0.8 } });
          break;
        case "antColony":
          res = await api.dsAlgorithms.antColony({ distances: [[0,2,9,10],[1,0,6,4],[15,7,0,8],[6,3,12,0]], params: { nAnts:4, nIterations:10 } });
          break;
        case "edmondsKarp":
          res = await api.dsAlgorithms.edmondsKarp({ capacity:[[0,10,10,0],[0,0,2,10],[0,0,0,10],[0,0,0,0]], source:0, sink:3 });
          break;
        case "twoSat":
          res = await api.dsAlgorithms.twoSat({ nVariables:3, clauses:[{a:0,b:1},{a:4,b:2},{a:5,b:3}] });
          break;
        case "wordBreak":
          res = await api.dsAlgorithms.wordBreak({ s:"leetcode", wordDict:["leet","code"] });
          break;
        case "burstBalloon":
          res = await api.dsAlgorithms.burstBalloon({ nums:[3,1,5,8] });
          break;
        case "maxSlidingWindow":
          res = await api.dsAlgorithms.maxSlidingWindow({ nums:[1,3,-1,-3,5,3,6,7], k:3 });
          break;
        case "skylineProblem":
          res = await api.dsAlgorithms.skylineProblem({ buildings:[{l:0,r:2,h:3},{l:1,r:3,h:2},{l:2,r:4,h:4}] });
          break;
        case "syntheticControl":
          res = await api.dsAlgorithms.syntheticControl({ treated:[10,12,15,18,22], donors:[[9,11,14,17,20],[11,13,16,19,24]] });
          break;
        case "survivalAnalysis":
          res = await api.dsAlgorithms.survivalAnalysis({ times:[1,3,5,7,9], events:[1,1,0,1,0] });
          break;
        case "marketBasketAnalysis":
          res = await api.dsAlgorithms.marketBasketAnalysis({ transactions:[["milk","bread","eggs"],["milk","bread"],["bread","eggs"],["milk","eggs"]], minSupport:0.01, minConfidence:0.5 });
          break;
        case "priceElasticity":
          res = await api.dsAlgorithms.priceElasticity({ prices:[10,12,15,20,25], demands:[100,90,75,55,40] });
          break;
        case "cohortRetention":
          res = await api.dsAlgorithms.cohortRetention({ cohorts:[{period:"2024-01",total:100,retained:[80,60,45]},{period:"2024-02",total:120,retained:[95,70,50]}] });
          break;
        // Depth 9
        case "campaignAttributionShapley":
          res = await api.dsAlgorithms.campaignAttributionShapley({ channels:["email","social","search"], conversions:[{channel:"email",value:10,interactions:["email","search"]}] });
          break;
        case "budgetPacingKalman":
          res = await api.dsAlgorithms.budgetPacingKalman({ spendHistory:[100,95,110,105,98], targetSpend:100 });
          break;
        case "creativePerformanceForecast":
          res = await api.dsAlgorithms.creativePerformanceForecast({ metrics:[10,12,15,13,16], alpha:0.3, beta:0.1, horizon:3 });
          break;
        case "adFrequencyOptimizer":
          res = await api.dsAlgorithms.adFrequencyOptimizer({ impressions:[1,2,3,4,5], conversions:[0.1,0.2,0.3,0.25,0.15], maxFrequency:5 });
          break;
        case "customerJourneyClustering":
          res = await api.dsAlgorithms.customerJourneyClustering({ journeys:[{id:"u1",touchpoints:["email","search"],conversions:1},{id:"u2",touchpoints:["social"],conversions:0},{id:"u3",touchpoints:["email","social","search"],conversions:2}], nClusters:2 });
          break;
        case "rfmSegmentation":
          res = await api.dsAlgorithms.rfmSegmentation({ customers:[{id:"c1",recency:1,frequency:10,monetary:500},{id:"c2",recency:30,frequency:2,monetary:50}] });
          break;
        case "predictiveLeadScoring":
          res = await api.dsAlgorithms.predictiveLeadScoring({ leads:[{features:[1,2],converted:1},{features:[0,1],converted:0},{features:[2,3],converted:1},{features:[0,0],converted:0}] });
          break;
        case "budgetReallocator":
          res = await api.dsAlgorithms.budgetReallocator({ channels:[{name:"search",currentBudget:100,marginalRoi:3,maxBudget:200},{name:"social",currentBudget:100,marginalRoi:2,maxBudget:150}], totalBudget:250 });
          break;
        case "multiTouchAttributionTimeDecay":
          res = await api.dsAlgorithms.multiTouchAttributionTimeDecay({ paths:[{channels:["email","search"],conversion:true,timeToConvert:5}], decayHalfLife:7 });
          break;
        case "campaignOptimizerEvolutionary":
          res = await api.dsAlgorithms.campaignOptimizerEvolutionary({ campaigns:[{name:"search",budget:100,roas:3,risk:0.2},{name:"social",budget:100,roas:2,risk:0.5}], generations:10 });
          break;
        case "costCurveFitting":
          res = await api.dsAlgorithms.costCurveFitting({ spendLevels:[100,200,300,400], costs:[10,18,24,28] });
          break;
        case "marginalROICalculation":
          res = await api.dsAlgorithms.marginalROICalculation({ channelData:[{channel:"search",spend:100,conversions:10,conversionValue:50},{channel:"social",spend:50,conversions:4,conversionValue:40}] });
          break;
        case "mediaMixDecomposer":
          res = await api.dsAlgorithms.mediaMixDecomposer({ spendData:[{channel:"tv",spend:[100,200,150]},{channel:"digital",spend:[50,80,60]}], conversions:[20,35,25] });
          break;
        case "incrementalLiftAnalysis":
          res = await api.dsAlgorithms.incrementalLiftAnalysis({ controlConversions:[5,6,4,7], treatmentConversions:[8,9,10,7] });
          break;
        case "campaignHealthComposite":
          res = await api.dsAlgorithms.campaignHealthComposite({ metrics:[{kpi:"ctr",value:0.05,weight:1,threshold:0.03},{kpi:"cvr",value:0.02,weight:2,threshold:0.01}] });
          break;
        case "anomalyDetectionMarketing":
          res = await api.dsAlgorithms.anomalyDetectionMarketing({ kpiValues:[10,12,11,13,50,12,11], windowSize:3, zThreshold:2 });
          break;
        case "adCopyEffectiveness":
          res = await api.dsAlgorithms.adCopyEffectiveness({ variants:[{variant:"A",impressions:1000,clicks:50,conversions:5},{variant:"B",impressions:1000,clicks:60,conversions:8}] });
          break;
        case "demandForecastSeasonal":
          res = await api.dsAlgorithms.demandForecastSeasonal({ historical:[100,120,110,130,105,125,115,135], seasonLength:4, horizon:3 });
          break;
        case "revenueForecastMonteCarlo":
          res = await api.dsAlgorithms.revenueForecastMonteCarlo({ historicalRevenue:[50000,52000,48000,55000,62000,58000,56000,59000,61000,64000,60000,65000], nSimulations:200, horizon:6 });
          break;
        case "marketingRoiDecomposition":
          res = await api.dsAlgorithms.marketingRoiDecomposition({ campaigns:[{name:"campaign1",spend:100,incrementalConversions:10,brandConversions:5,directConversions:3,conversionValue:50}] });
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
        <p className="text-gray-400 text-sm mt-1">Trie, Fenwick, Segment Tree, Union-Find, Bloom Filter, Min Heap, LRU Cache, Sorting, Searching, Graph, String, DP, Optimization + Depth 8/9 (70 algorithms)</p>
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
