import { Router, Request, Response, NextFunction } from "express";
import { dsAlgorithmService } from "../services/DSAlgorithmService";
import { sendSuccess } from "./route-utils";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}

router.post(
  "/trie",
  asyncHandler(async (req: Request, res: Response) => {
    const { words, prefixes } = req.body;
    if (!words || !Array.isArray(words)) return res.status(400).json({ error: "words array required" });
    const result = dsAlgorithmService.trieOperations(words, prefixes || []);
    sendSuccess(res, result, { insertions: result.insertions, totalWords: result.totalWords });
  }),
);

router.post(
  "/fenwick",
  asyncHandler(async (req: Request, res: Response) => {
    const { values, queries } = req.body;
    if (!values || !Array.isArray(values)) return res.status(400).json({ error: "values array required" });
    const result = dsAlgorithmService.fenwickTreeOperations(values, queries || []);
    sendSuccess(res, result);
  }),
);

router.post(
  "/segment-tree",
  asyncHandler(async (req: Request, res: Response) => {
    const { values, queries } = req.body;
    if (!values || !Array.isArray(values)) return res.status(400).json({ error: "values array required" });
    const result = dsAlgorithmService.segmentTreeOperations(values, queries || []);
    sendSuccess(res, result);
  }),
);

router.post(
  "/union-find",
  asyncHandler(async (req: Request, res: Response) => {
    const { elements, unions, queries } = req.body;
    if (!elements || !Array.isArray(elements)) return res.status(400).json({ error: "elements array required" });
    const result = dsAlgorithmService.unionFindOperations(elements, unions || [], queries || []);
    sendSuccess(res, result);
  }),
);

router.post(
  "/bloom-filter",
  asyncHandler(async (req: Request, res: Response) => {
    const { items, testItems, falsePositiveRate } = req.body;
    if (!items || !Array.isArray(items)) return res.status(400).json({ error: "items array required" });
    const result = dsAlgorithmService.bloomFilterOperations(items, testItems || [], falsePositiveRate || 0.01);
    sendSuccess(res, result);
  }),
);

router.post(
  "/min-heap",
  asyncHandler(async (req: Request, res: Response) => {
    const { values, k } = req.body;
    if (!values || !Array.isArray(values)) return res.status(400).json({ error: "values array required" });
    const result = dsAlgorithmService.minHeapOperations(values, k || values.length);
    sendSuccess(res, result);
  }),
);

router.post(
  "/lru-cache",
  asyncHandler(async (req: Request, res: Response) => {
    const { capacity, operations } = req.body;
    if (!capacity || !operations) return res.status(400).json({ error: "capacity and operations required" });
    const result = dsAlgorithmService.lruCacheOperations(capacity, operations);
    sendSuccess(res, result);
  }),
);

router.post(
  "/sort",
  asyncHandler(async (req: Request, res: Response) => {
    const { array, algorithm } = req.body;
    if (!array || !Array.isArray(array)) return res.status(400).json({ error: "array required" });
    const alg = algorithm || "quickSort";
    let result: any;
    switch (alg) {
      case "mergeSort": result = dsAlgorithmService.mergeSort(array); break;
      case "heapSort": result = dsAlgorithmService.heapSort(array); break;
      default: result = dsAlgorithmService.quickSort(array); break;
    }
    sendSuccess(res, result);
  }),
);

router.post(
  "/quick-select",
  asyncHandler(async (req: Request, res: Response) => {
    const { array, k } = req.body;
    if (!array || !Array.isArray(array) || !k) return res.status(400).json({ error: "array and k required" });
    const result = dsAlgorithmService.quickSelect(array, k);
    sendSuccess(res, result);
  }),
);

router.post(
  "/binary-search",
  asyncHandler(async (req: Request, res: Response) => {
    const { array, target } = req.body;
    if (!array || !Array.isArray(array) || target === undefined) return res.status(400).json({ error: "array and target required" });
    const result = dsAlgorithmService.binarySearch(array, target);
    sendSuccess(res, result);
  }),
);

router.post(
  "/ternary-search",
  asyncHandler(async (req: Request, res: Response) => {
    const { lo, hi, funcType } = req.body;
    if (lo === undefined || hi === undefined) return res.status(400).json({ error: "lo and hi required" });
    const f = funcType === "negative" ? (x: number) => -(x - 5) * (x - 5) + 25 : (x: number) => -(x - lo) * (x - hi) + lo * hi;
    const result = dsAlgorithmService.ternarySearch(f, lo, hi);
    sendSuccess(res, result);
  }),
);

router.post(
  "/graph/bfs",
  asyncHandler(async (req: Request, res: Response) => {
    const { nodes, edges, start } = req.body;
    if (!nodes || !edges || !start) return res.status(400).json({ error: "nodes, edges, start required" });
    const result = dsAlgorithmService.bfsTraverse(nodes, edges, start);
    sendSuccess(res, result);
  }),
);

router.post(
  "/graph/dfs",
  asyncHandler(async (req: Request, res: Response) => {
    const { nodes, edges, start } = req.body;
    if (!nodes || !edges || !start) return res.status(400).json({ error: "nodes, edges, start required" });
    const result = dsAlgorithmService.dfsTraverse(nodes, edges, start);
    sendSuccess(res, result);
  }),
);

router.post(
  "/graph/dijkstra",
  asyncHandler(async (req: Request, res: Response) => {
    const { nodes, edges, start, end } = req.body;
    if (!nodes || !edges || !start) return res.status(400).json({ error: "nodes, edges, start required" });
    const result = dsAlgorithmService.dijkstra(nodes, edges, start, end);
    sendSuccess(res, result);
  }),
);

router.post(
  "/graph/topological-sort",
  asyncHandler(async (req: Request, res: Response) => {
    const { nodes, edges } = req.body;
    if (!nodes || !edges) return res.status(400).json({ error: "nodes and edges required" });
    const result = dsAlgorithmService.topologicalSort(nodes, edges);
    sendSuccess(res, result);
  }),
);

router.post(
  "/graph/detect-cycle",
  asyncHandler(async (req: Request, res: Response) => {
    const { nodes, edges } = req.body;
    if (!nodes || !edges) return res.status(400).json({ error: "nodes and edges required" });
    const result = dsAlgorithmService.detectCycle(nodes, edges);
    sendSuccess(res, result);
  }),
);

router.post(
  "/string/kmp",
  asyncHandler(async (req: Request, res: Response) => {
    const { text, pattern } = req.body;
    if (!text || !pattern) return res.status(400).json({ error: "text and pattern required" });
    const result = dsAlgorithmService.kmpSearch(text, pattern);
    sendSuccess(res, result);
  }),
);

router.post(
  "/string/rabin-karp",
  asyncHandler(async (req: Request, res: Response) => {
    const { text, pattern } = req.body;
    if (!text || !pattern) return res.status(400).json({ error: "text and pattern required" });
    const result = dsAlgorithmService.rabinKarpSearch(text, pattern);
    sendSuccess(res, result);
  }),
);

router.post(
  "/string/levenshtein",
  asyncHandler(async (req: Request, res: Response) => {
    const { a, b } = req.body;
    if (!a || !b) return res.status(400).json({ error: "a and b required" });
    const result = dsAlgorithmService.levenshteinDistance(a, b);
    sendSuccess(res, result);
  }),
);

router.post(
  "/string/z-algorithm",
  asyncHandler(async (req: Request, res: Response) => {
    const { text, pattern } = req.body;
    if (!text || !pattern) return res.status(400).json({ error: "text and pattern required" });
    const result = dsAlgorithmService.zAlgorithm(text, pattern);
    sendSuccess(res, result);
  }),
);

router.post(
  "/dp/knapsack",
  asyncHandler(async (req: Request, res: Response) => {
    const { capacity, items } = req.body;
    if (!capacity || !items) return res.status(400).json({ error: "capacity and items required" });
    const result = dsAlgorithmService.knapSack01(capacity, items);
    sendSuccess(res, result);
  }),
);

router.post(
  "/dp/lcs",
  asyncHandler(async (req: Request, res: Response) => {
    const { a, b } = req.body;
    if (!a || !b) return res.status(400).json({ error: "a and b required" });
    const result = dsAlgorithmService.longestCommonSubsequence(a, b);
    sendSuccess(res, result);
  }),
);

router.post(
  "/dp/lis",
  asyncHandler(async (req: Request, res: Response) => {
    const { array } = req.body;
    if (!array || !Array.isArray(array)) return res.status(400).json({ error: "array required" });
    const result = dsAlgorithmService.longestIncreasingSubsequence(array);
    sendSuccess(res, result);
  }),
);

router.post(
  "/dp/coin-change",
  asyncHandler(async (req: Request, res: Response) => {
    const { coins, amount } = req.body;
    if (!coins || !Array.isArray(coins) || amount === undefined) return res.status(400).json({ error: "coins and amount required" });
    const result = dsAlgorithmService.coinChange(coins, amount);
    sendSuccess(res, result);
  }),
);

router.post(
  "/dp/max-subarray",
  asyncHandler(async (req: Request, res: Response) => {
    const { array } = req.body;
    if (!array || !Array.isArray(array)) return res.status(400).json({ error: "array required" });
    const result = dsAlgorithmService.maxSubarraySum(array);
    sendSuccess(res, result);
  }),
);

router.post(
  "/convex-hull",
  asyncHandler(async (req: Request, res: Response) => {
    const { points } = req.body;
    if (!points || !Array.isArray(points)) return res.status(400).json({ error: "points array required" });
    const result = dsAlgorithmService.convexHull(points);
    sendSuccess(res, result);
  }),
);

router.post(
  "/k-closest",
  asyncHandler(async (req: Request, res: Response) => {
    const { points, k, target } = req.body;
    if (!points || !k || !target) return res.status(400).json({ error: "points, k, target required" });
    const result = dsAlgorithmService.kClosestPoints(points, k, target);
    sendSuccess(res, result);
  }),
);

router.post(
  "/avl",
  asyncHandler(async (req: Request, res: Response) => {
    const { operations } = req.body;
    if (!operations) return res.status(400).json({ error: "operations array required" });
    const result = dsAlgorithmService.avlTreeOperations(operations);
    sendSuccess(res, result);
  }),
);

router.post(
  "/deque-sliding-window",
  asyncHandler(async (req: Request, res: Response) => {
    const { values, windowSize } = req.body;
    if (!values || !windowSize) return res.status(400).json({ error: "values and windowSize required" });
    const result = dsAlgorithmService.dequeSlidingWindow(values, windowSize);
    sendSuccess(res, result);
  }),
);

router.post(
  "/sparse-table",
  asyncHandler(async (req: Request, res: Response) => {
    const { values, queries } = req.body;
    if (!values || !queries) return res.status(400).json({ error: "values and queries required" });
    const result = dsAlgorithmService.sparseTableRangeQueries(values, queries);
    sendSuccess(res, result);
  }),
);

router.post(
  "/counting-bloom",
  asyncHandler(async (req: Request, res: Response) => {
    const { items, falsePositiveRate } = req.body;
    if (!items) return res.status(400).json({ error: "items array required" });
    const result = dsAlgorithmService.countingBloomFilter(items, falsePositiveRate || 0.01);
    sendSuccess(res, result);
  }),
);

router.post(
  "/pq-decrease-key",
  asyncHandler(async (req: Request, res: Response) => {
    const { operations } = req.body;
    if (!operations) return res.status(400).json({ error: "operations array required" });
    const result = dsAlgorithmService.priorityQueueDecreaseKey(operations);
    sendSuccess(res, result);
  }),
);

router.post(
  "/rollback-dsu",
  asyncHandler(async (req: Request, res: Response) => {
    const { operations } = req.body;
    if (!operations) return res.status(400).json({ error: "operations array required" });
    const result = dsAlgorithmService.rollbackDsuOperations(operations);
    sendSuccess(res, result);
  }),
);

router.post(
  "/graph/bellman-ford",
  asyncHandler(async (req: Request, res: Response) => {
    const { nodes, edges, start } = req.body;
    if (!nodes || !edges || !start) return res.status(400).json({ error: "nodes, edges, start required" });
    const result = dsAlgorithmService.bellmanFord(nodes, edges, start);
    sendSuccess(res, result);
  }),
);

router.post(
  "/graph/floyd-warshall",
  asyncHandler(async (req: Request, res: Response) => {
    const { nodes, edges } = req.body;
    if (!nodes || !edges) return res.status(400).json({ error: "nodes and edges required" });
    const result = dsAlgorithmService.floydWarshall(nodes, edges);
    sendSuccess(res, result);
  }),
);

router.post(
  "/graph/kruskal-mst",
  asyncHandler(async (req: Request, res: Response) => {
    const { nodes, edges } = req.body;
    if (!nodes || !edges) return res.status(400).json({ error: "nodes and edges required" });
    const result = dsAlgorithmService.kruskalMst(nodes, edges);
    sendSuccess(res, result);
  }),
);

router.post(
  "/graph/max-flow",
  asyncHandler(async (req: Request, res: Response) => {
    const { nodes, edges, source, sink } = req.body;
    if (!nodes || !edges || !source || !sink) return res.status(400).json({ error: "nodes, edges, source, sink required" });
    const result = dsAlgorithmService.maxFlowEdmondsKarp(nodes, edges, source, sink);
    sendSuccess(res, result);
  }),
);

router.post(
  "/graph/a-star",
  asyncHandler(async (req: Request, res: Response) => {
    const { nodes, edges, start, goal, heuristic } = req.body;
    if (!nodes || !edges || !start || !goal || !heuristic) return res.status(400).json({ error: "nodes, edges, start, goal, heuristic required" });
    const result = dsAlgorithmService.aStarSearch(nodes, edges, start, goal, heuristic);
    sendSuccess(res, result);
  }),
);

router.post(
  "/graph/tarjan-scc",
  asyncHandler(async (req: Request, res: Response) => {
    const { nodes, edges } = req.body;
    if (!nodes || !edges) return res.status(400).json({ error: "nodes and edges required" });
    const result = dsAlgorithmService.tarjanScc(nodes, edges);
    sendSuccess(res, result);
  }),
);

router.post(
  "/string/manacher",
  asyncHandler(async (req: Request, res: Response) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "text required" });
    const result = dsAlgorithmService.manacherLongestPalindrome(text);
    sendSuccess(res, result);
  }),
);

router.post(
  "/string/suffix-array",
  asyncHandler(async (req: Request, res: Response) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "text required" });
    const result = dsAlgorithmService.suffixArrayLcp(text);
    sendSuccess(res, result);
  }),
);

router.post(
  "/dp/matrix-chain",
  asyncHandler(async (req: Request, res: Response) => {
    const { dimensions } = req.body;
    if (!dimensions || !Array.isArray(dimensions)) return res.status(400).json({ error: "dimensions array required" });
    const result = dsAlgorithmService.matrixChainMultiplication(dimensions);
    sendSuccess(res, result);
  }),
);

router.post(
  "/dp/edit-distance-full",
  asyncHandler(async (req: Request, res: Response) => {
    const { a, b } = req.body;
    if (!a || !b) return res.status(400).json({ error: "a and b required" });
    const result = dsAlgorithmService.editDistanceFull(a, b);
    sendSuccess(res, result);
  }),
);

router.post(
  "/marketing/pid-pacing",
  asyncHandler(async (req: Request, res: Response) => {
    const { currentSpend, targetSpend, history } = req.body;
    if (currentSpend === undefined || targetSpend === undefined || !history) return res.status(400).json({ error: "currentSpend, targetSpend, history required" });
    const result = dsAlgorithmService.pidBudgetPacing(currentSpend, targetSpend, history);
    sendSuccess(res, result);
  }),
);

router.post(
  "/marketing/shapley",
  asyncHandler(async (req: Request, res: Response) => {
    const { channels, conversions } = req.body;
    if (!channels || !conversions) return res.status(400).json({ error: "channels and conversions required" });
    const result = dsAlgorithmService.shapleyValueAttribution(channels, conversions);
    sendSuccess(res, result);
  }),
);

router.post(
  "/marketing/min-cost-flow",
  asyncHandler(async (req: Request, res: Response) => {
    const { budget, nodes, edges } = req.body;
    if (!budget || !nodes || !edges) return res.status(400).json({ error: "budget, nodes, edges required" });
    const result = dsAlgorithmService.minCostFlowAllocation(budget, nodes, edges);
    sendSuccess(res, result);
  }),
);

router.post(
  "/marketing/frequency-cap",
  asyncHandler(async (req: Request, res: Response) => {
    const { events, windowMs, maxEvents } = req.body;
    if (!events || !windowMs || !maxEvents) return res.status(400).json({ error: "events, windowMs, maxEvents required" });
    const result = dsAlgorithmService.slidingWindowFrequencyCap(events, windowMs, maxEvents);
    sendSuccess(res, result);
  }),
);

router.post(
  "/marketing/jaccard-overlap",
  asyncHandler(async (req: Request, res: Response) => {
    const { sets } = req.body;
    if (!sets) return res.status(400).json({ error: "sets array required" });
    const result = dsAlgorithmService.jaccardAudienceOverlap(sets);
    sendSuccess(res, result);
  }),
);

router.post(
  "/marketing/cosine-lookalike",
  asyncHandler(async (req: Request, res: Response) => {
    const { seed, candidates } = req.body;
    if (!seed || !candidates) return res.status(400).json({ error: "seed and candidates required" });
    const result = dsAlgorithmService.cosineSimilarityLookalike(seed, candidates);
    sendSuccess(res, result);
  }),
);

router.post(
  "/marketing/exp-smoothing",
  asyncHandler(async (req: Request, res: Response) => {
    const { values, alpha, beta, horizon } = req.body;
    if (!values || alpha === undefined || beta === undefined || !horizon) return res.status(400).json({ error: "values, alpha, beta, horizon required" });
    const result = dsAlgorithmService.exponentialSmoothingForecast(values, alpha, beta, horizon);
    sendSuccess(res, result);
  }),
);

router.post(
  "/trie-enhanced",
  asyncHandler(async (req: Request, res: Response) => {
    const { words, operations } = req.body;
    if (!words || !operations) return res.status(400).json({ error: "words and operations required" });
    const result = dsAlgorithmService.trieEnhanced(words, operations);
    sendSuccess(res, result);
  }),
);

router.post(
  "/segment-tree-lazy",
  asyncHandler(async (req: Request, res: Response) => {
    const { values, updates, queries } = req.body;
    if (!values || !updates || !queries) return res.status(400).json({ error: "values, updates, queries required" });
    const result = dsAlgorithmService.segmentTreeLazy(values, updates, queries);
    sendSuccess(res, result);
  }),
);

router.post(
  "/fenwick-2d",
  asyncHandler(async (req: Request, res: Response) => {
    const { values, queries } = req.body;
    if (!values || !queries) return res.status(400).json({ error: "values and queries required" });
    const result = dsAlgorithmService.fenwick2D(values, queries);
    sendSuccess(res, result);
  }),
);

router.post(
  "/graph/bi-dijkstra",
  asyncHandler(async (req: Request, res: Response) => {
    const { nodes, edges, start, end } = req.body;
    if (!nodes || !edges || !start || !end) return res.status(400).json({ error: "nodes, edges, start, end required" });
    const result = dsAlgorithmService.bidirectionalDijkstra(nodes, edges, start, end);
    sendSuccess(res, result);
  }),
);

// ============ DEPTH 3: DEEPER DATA STRUCTURES ============

router.post(
  "/skip-list",
  asyncHandler(async (req: Request, res: Response) => {
    const { operations } = req.body;
    if (!operations) return res.status(400).json({ error: "operations array required" });
    const result = dsAlgorithmService.skipListOperations(operations);
    sendSuccess(res, result);
  }),
);

router.post(
  "/red-black-tree",
  asyncHandler(async (req: Request, res: Response) => {
    const { operations } = req.body;
    if (!operations) return res.status(400).json({ error: "operations array required" });
    const result = dsAlgorithmService.redBlackTreeOperations(operations);
    sendSuccess(res, result);
  }),
);

router.post(
  "/interval-tree",
  asyncHandler(async (req: Request, res: Response) => {
    const { intervals, queries } = req.body;
    if (!intervals || !queries) return res.status(400).json({ error: "intervals and queries required" });
    const result = dsAlgorithmService.intervalTreeOperations(intervals, queries);
    sendSuccess(res, result);
  }),
);

router.post(
  "/treap",
  asyncHandler(async (req: Request, res: Response) => {
    const { operations } = req.body;
    if (!operations) return res.status(400).json({ error: "operations array required" });
    const result = dsAlgorithmService.treapOperations(operations);
    sendSuccess(res, result);
  }),
);

router.post(
  "/fibonacci-heap",
  asyncHandler(async (req: Request, res: Response) => {
    const { operations } = req.body;
    if (!operations) return res.status(400).json({ error: "operations array required" });
    const result = dsAlgorithmService.fibonacciHeapOperations(operations);
    sendSuccess(res, result);
  }),
);

router.post(
  "/radix-tree",
  asyncHandler(async (req: Request, res: Response) => {
    const { words, queries } = req.body;
    if (!words || !queries) return res.status(400).json({ error: "words and queries required" });
    const result = dsAlgorithmService.radixTreeOperations(words, queries);
    sendSuccess(res, result);
  }),
);

// ============ DEPTH 3: DEEPER ALGORITHMS ============

router.post(
  "/graph/dinic-max-flow",
  asyncHandler(async (req: Request, res: Response) => {
    const { nodes, edges, source, sink } = req.body;
    if (!nodes || !edges || !source || !sink) return res.status(400).json({ error: "nodes, edges, source, sink required" });
    const result = dsAlgorithmService.dinicMaxFlow(nodes, edges, source, sink);
    sendSuccess(res, result);
  }),
);

router.post(
  "/hungarian",
  asyncHandler(async (req: Request, res: Response) => {
    const { costMatrix } = req.body;
    if (!costMatrix || !Array.isArray(costMatrix)) return res.status(400).json({ error: "costMatrix array required" });
    const result = dsAlgorithmService.hungarianAlgorithm(costMatrix);
    sendSuccess(res, result);
  }),
);

router.post(
  "/graph/hopcroft-karp",
  asyncHandler(async (req: Request, res: Response) => {
    const { left, right, edges } = req.body;
    if (!left || !right || !edges) return res.status(400).json({ error: "left, right, edges required" });
    const result = dsAlgorithmService.hopcroftKarpBipartite(left, right, edges);
    sendSuccess(res, result);
  }),
);

router.post(
  "/graph/johnsons",
  asyncHandler(async (req: Request, res: Response) => {
    const { nodes, edges } = req.body;
    if (!nodes || !edges) return res.status(400).json({ error: "nodes and edges required" });
    const result = dsAlgorithmService.johnsonsAlgorithm(nodes, edges);
    sendSuccess(res, result);
  }),
);

router.post(
  "/median-of-medians",
  asyncHandler(async (req: Request, res: Response) => {
    const { array, k } = req.body;
    if (!array || !Array.isArray(array) || k === undefined) return res.status(400).json({ error: "array and k required" });
    const result = dsAlgorithmService.medianOfMedians(array, k);
    sendSuccess(res, result);
  }),
);

router.post(
  "/hp-filter",
  asyncHandler(async (req: Request, res: Response) => {
    const { values, lambda } = req.body;
    if (!values || !Array.isArray(values)) return res.status(400).json({ error: "values array required" });
    const result = dsAlgorithmService.hpFilter(values, lambda || 1600);
    sendSuccess(res, result);
  }),
);

// ============ DEPTH 3: STRING / DP ============

router.post(
  "/string/longest-common-substring",
  asyncHandler(async (req: Request, res: Response) => {
    const { a, b } = req.body;
    if (!a || !b) return res.status(400).json({ error: "a and b required" });
    const result = dsAlgorithmService.longestCommonSubstring(a, b);
    sendSuccess(res, result);
  }),
);

router.post(
  "/string/jaro-winkler",
  asyncHandler(async (req: Request, res: Response) => {
    const { a, b } = req.body;
    if (!a || !b) return res.status(400).json({ error: "a and b required" });
    const result = dsAlgorithmService.jaroWinklerSimilarity(a, b);
    sendSuccess(res, result);
  }),
);

router.post(
  "/string/hamming-distance",
  asyncHandler(async (req: Request, res: Response) => {
    const { a, b } = req.body;
    if (!a || !b) return res.status(400).json({ error: "a and b required" });
    const result = dsAlgorithmService.hammingDistance(a, b);
    sendSuccess(res, result);
  }),
);

router.post(
  "/dp/palindrome-partitioning",
  asyncHandler(async (req: Request, res: Response) => {
    const { s } = req.body;
    if (!s) return res.status(400).json({ error: "s required" });
    const result = dsAlgorithmService.palindromePartitioning(s);
    sendSuccess(res, result);
  }),
);

router.post(
  "/dp/egg-drop",
  asyncHandler(async (req: Request, res: Response) => {
    const { eggs, floors } = req.body;
    if (eggs === undefined || floors === undefined) return res.status(400).json({ error: "eggs and floors required" });
    const result = dsAlgorithmService.eggDrop(eggs, floors);
    sendSuccess(res, result);
  }),
);

router.post(
  "/dp/tsp",
  asyncHandler(async (req: Request, res: Response) => {
    const { cities, distances } = req.body;
    if (cities === undefined || !distances) return res.status(400).json({ error: "cities and distances required" });
    const result = dsAlgorithmService.travelingSalesmanDp(cities, distances);
    sendSuccess(res, result);
  }),
);

// ============ DEPTH 3: ENHANCED EXISTING ============

router.post(
  "/median-heap",
  asyncHandler(async (req: Request, res: Response) => {
    const { values } = req.body;
    if (!values || !Array.isArray(values)) return res.status(400).json({ error: "values array required" });
    const result = dsAlgorithmService.medianHeapOperations(values);
    sendSuccess(res, result);
  }),
);

router.post(
  "/trie-wildcard",
  asyncHandler(async (req: Request, res: Response) => {
    const { words, queries } = req.body;
    if (!words || !queries) return res.status(400).json({ error: "words and queries required" });
    const result = dsAlgorithmService.trieWildcardSearch(words, queries);
    sendSuccess(res, result);
  }),
);

router.post(
  "/fenwick-range-update",
  asyncHandler(async (req: Request, res: Response) => {
    const { values, updates, queries } = req.body;
    if (!values || !updates || !queries) return res.status(400).json({ error: "values, updates, queries required" });
    const result = dsAlgorithmService.fenwickRangeUpdate(values, updates, queries);
    sendSuccess(res, result);
  }),
);

router.post(
  "/segment-tree-advanced",
  asyncHandler(async (req: Request, res: Response) => {
    const { values, operations } = req.body;
    if (!values || !operations) return res.status(400).json({ error: "values and operations required" });
    const result = dsAlgorithmService.segmentTreeAdvanced(values, operations);
    sendSuccess(res, result);
  }),
);

router.post(
  "/bloom-filter-union",
  asyncHandler(async (req: Request, res: Response) => {
    const { filters } = req.body;
    if (!filters || !Array.isArray(filters)) return res.status(400).json({ error: "filters array required" });
    const result = dsAlgorithmService.bloomFilterUnionIntersect(filters);
    sendSuccess(res, result);
  }),
);

router.post(
  "/lfu-cache",
  asyncHandler(async (req: Request, res: Response) => {
    const { capacity, operations } = req.body;
    if (!capacity || !operations) return res.status(400).json({ error: "capacity and operations required" });
    const result = dsAlgorithmService.lfuCacheOperations(capacity, operations);
    sendSuccess(res, result);
  }),
);

// ============ DEPTH 3: MARKETING DEPTH ============

router.post(
  "/marketing/vcg",
  asyncHandler(async (req: Request, res: Response) => {
    const { bidders, items, slots } = req.body;
    if (!bidders || items === undefined || slots === undefined) return res.status(400).json({ error: "bidders, items, slots required" });
    const result = dsAlgorithmService.vcgPayments(bidders, items, slots);
    sendSuccess(res, result);
  }),
);

router.post(
  "/marketing/markov-chain",
  asyncHandler(async (req: Request, res: Response) => {
    const { channels, paths } = req.body;
    if (!channels || !paths) return res.status(400).json({ error: "channels and paths required" });
    const result = dsAlgorithmService.markovChainAttribution(channels, paths);
    sendSuccess(res, result);
  }),
);

router.post(
  "/marketing/bang-bang",
  asyncHandler(async (req: Request, res: Response) => {
    const { spendHistory, budget, daysElapsed, totalDays, tolerance } = req.body;
    if (!spendHistory || budget === undefined || daysElapsed === undefined || totalDays === undefined)
      return res.status(400).json({ error: "spendHistory, budget, daysElapsed, totalDays required" });
    const result = dsAlgorithmService.bangBangPacing(spendHistory, budget, daysElapsed, totalDays, tolerance || 0.1);
    sendSuccess(res, result);
  }),
);

router.post(
  "/marketing/page-rank",
  asyncHandler(async (req: Request, res: Response) => {
    const { nodes, edges, damping, iterations } = req.body;
    if (!nodes || !edges) return res.status(400).json({ error: "nodes and edges required" });
    const result = dsAlgorithmService.pageRankAudience(nodes, edges, damping || 0.85, iterations || 20);
    sendSuccess(res, result);
  }),
);

router.post(
  "/marketing/submodular",
  asyncHandler(async (req: Request, res: Response) => {
    const { items, budget } = req.body;
    if (!items || budget === undefined) return res.status(400).json({ error: "items and budget required" });
    const result = dsAlgorithmService.submodularMaximization(items, budget);
    sendSuccess(res, result);
  }),
);

router.post(
  "/marketing/ad-sequence",
  asyncHandler(async (req: Request, res: Response) => {
    const { positions, ads } = req.body;
    if (positions === undefined || !ads) return res.status(400).json({ error: "positions and ads required" });
    const result = dsAlgorithmService.adSequencingDp(positions, ads);
    sendSuccess(res, result);
  }),
);

router.post(
  "/marketing/optimal-stopping",
  asyncHandler(async (req: Request, res: Response) => {
    const { candidates } = req.body;
    if (!candidates || !Array.isArray(candidates)) return res.status(400).json({ error: "candidates array required" });
    const result = dsAlgorithmService.optimalStopping(candidates);
    sendSuccess(res, result);
  }),
);

router.post(
  "/marketing/little-law",
  asyncHandler(async (req: Request, res: Response) => {
    const { arrivalRate, avgServiceTime } = req.body;
    if (arrivalRate === undefined || avgServiceTime === undefined) return res.status(400).json({ error: "arrivalRate and avgServiceTime required" });
    const result = dsAlgorithmService.littleLawInventory(arrivalRate, avgServiceTime);
    sendSuccess(res, result);
  }),
);

router.post(
  "/marketing/thompson-sampling",
  asyncHandler(async (req: Request, res: Response) => {
    const { variants, samples } = req.body;
    if (!variants) return res.status(400).json({ error: "variants required" });
    const result = dsAlgorithmService.thompsonSampling(variants, samples || 1000);
    sendSuccess(res, result);
  }),
);

router.post(
  "/marketing/differential-privacy",
  asyncHandler(async (req: Request, res: Response) => {
    const { rawValues, epsilon, sensitivity } = req.body;
    if (!rawValues || epsilon === undefined) return res.status(400).json({ error: "rawValues and epsilon required" });
    const result = dsAlgorithmService.differentialPrivacy(rawValues, epsilon, sensitivity || 1);
    sendSuccess(res, result);
  }),
);

// ============ DEPTH 4: ADVANCED DATA STRUCTURES ============

router.post(
  "/b-tree",
  asyncHandler(async (req: Request, res: Response) => {
    const { operations, degree } = req.body;
    if (!operations) return res.status(400).json({ error: "operations array required" });
    const result = dsAlgorithmService.bTreeOperations(operations, degree || 3);
    sendSuccess(res, result);
  }),
);

router.post(
  "/kd-tree",
  asyncHandler(async (req: Request, res: Response) => {
    const { points, target } = req.body;
    if (!points || !target) return res.status(400).json({ error: "points and target required" });
    const result = dsAlgorithmService.kdTreeNearestNeighbor(points, target);
    sendSuccess(res, result);
  }),
);

router.post(
  "/quad-tree",
  asyncHandler(async (req: Request, res: Response) => {
    const { points, region } = req.body;
    if (!points || !region) return res.status(400).json({ error: "points and region required" });
    const result = dsAlgorithmService.quadTreeRegionQuery(points, region);
    sendSuccess(res, result);
  }),
);

router.post(
  "/cartesian-tree",
  asyncHandler(async (req: Request, res: Response) => {
    const { values } = req.body;
    if (!values || !Array.isArray(values)) return res.status(400).json({ error: "values array required" });
    const result = dsAlgorithmService.cartesianTreeOperations(values);
    sendSuccess(res, result);
  }),
);

router.post(
  "/bit-array",
  asyncHandler(async (req: Request, res: Response) => {
    const { values } = req.body;
    if (!values || !Array.isArray(values)) return res.status(400).json({ error: "values array required" });
    const result = dsAlgorithmService.bitArrayOperations(values);
    sendSuccess(res, result);
  }),
);

// ============ DEPTH 4: ADVANCED ALGORITHMS ============

router.post(
  "/graph/stoer-wagner",
  asyncHandler(async (req: Request, res: Response) => {
    const { nodes, edges } = req.body;
    if (!nodes || !edges) return res.status(400).json({ error: "nodes and edges required" });
    const result = dsAlgorithmService.stoerWagnerMinCut(nodes, edges);
    sendSuccess(res, result);
  }),
);

router.post(
  "/graph/gale-shapley",
  asyncHandler(async (req: Request, res: Response) => {
    const { proposers, reviewers } = req.body;
    if (!proposers || !reviewers) return res.status(400).json({ error: "proposers and reviewers required" });
    const result = dsAlgorithmService.galeShapleyMatching(proposers, reviewers);
    sendSuccess(res, result);
  }),
);

router.post(
  "/graph/push-relabel",
  asyncHandler(async (req: Request, res: Response) => {
    const { nodes, edges, source, sink } = req.body;
    if (!nodes || !edges || !source || !sink) return res.status(400).json({ error: "nodes, edges, source, sink required" });
    const result = dsAlgorithmService.pushRelabelMaxFlow(nodes, edges, source, sink);
    sendSuccess(res, result);
  }),
);

router.post(
  "/simulated-annealing",
  asyncHandler(async (req: Request, res: Response) => {
    const { initialSolution, costFn, tempStart, tempEnd, coolingRate } = req.body;
    if (!initialSolution || !costFn) return res.status(400).json({ error: "initialSolution and costFn required" });
    const fn = typeof costFn === "string" ? new Function("return " + costFn)() : costFn;
    const result = dsAlgorithmService.simulatedAnnealing(initialSolution, fn, tempStart || 100, tempEnd || 0.01, coolingRate || 0.95);
    sendSuccess(res, result);
  }),
);

router.post(
  "/beam-search",
  asyncHandler(async (req: Request, res: Response) => {
    const { start, goal, expand, beamWidth } = req.body;
    if (!start || !goal || !expand) return res.status(400).json({ error: "start, goal, expand required" });
    const expandFn = typeof expand === "string" ? new Function("return " + expand)() : expand;
    const result = dsAlgorithmService.beamSearch(start, goal, expandFn, beamWidth || 3);
    sendSuccess(res, result);
  }),
);

router.post(
  "/graph/eulerian-path",
  asyncHandler(async (req: Request, res: Response) => {
    const { nodes, edges } = req.body;
    if (!nodes || !edges) return res.status(400).json({ error: "nodes and edges required" });
    const result = dsAlgorithmService.eulerianPath(nodes, edges);
    sendSuccess(res, result);
  }),
);

router.post(
  "/graph/chinese-postman",
  asyncHandler(async (req: Request, res: Response) => {
    const { nodes, edges } = req.body;
    if (!nodes || !edges) return res.status(400).json({ error: "nodes and edges required" });
    const result = dsAlgorithmService.chinesePostman(nodes, edges);
    sendSuccess(res, result);
  }),
);

// ============ DEPTH 4: STRING / DP ============

router.post(
  "/string/aho-corasick",
  asyncHandler(async (req: Request, res: Response) => {
    const { text, patterns } = req.body;
    if (!text || !patterns) return res.status(400).json({ error: "text and patterns required" });
    const result = dsAlgorithmService.ahoCorasickSearch(text, patterns);
    sendSuccess(res, result);
  }),
);

router.post(
  "/string/bwt",
  asyncHandler(async (req: Request, res: Response) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "text required" });
    const result = dsAlgorithmService.burrowsWheelerTransform(text);
    sendSuccess(res, result);
  }),
);

router.post(
  "/string/needleman-wunsch",
  asyncHandler(async (req: Request, res: Response) => {
    const { a, b, matchScore, gapPenalty, mismatchPenalty } = req.body;
    if (!a || !b) return res.status(400).json({ error: "a and b required" });
    const result = dsAlgorithmService.needlemanWunschAlignment(a, b, matchScore || 2, gapPenalty || -1, mismatchPenalty || -1);
    sendSuccess(res, result);
  }),
);

router.post(
  "/string/min-window",
  asyncHandler(async (req: Request, res: Response) => {
    const { s, t } = req.body;
    if (!s || !t) return res.status(400).json({ error: "s and t required" });
    const result = dsAlgorithmService.minWindowSubstring(s, t);
    sendSuccess(res, result);
  }),
);

router.post(
  "/dp/lps",
  asyncHandler(async (req: Request, res: Response) => {
    const { s } = req.body;
    if (!s) return res.status(400).json({ error: "s required" });
    const result = dsAlgorithmService.longestPalindromicSubsequence(s);
    sendSuccess(res, result);
  }),
);

router.post(
  "/dp/balloon-burst",
  asyncHandler(async (req: Request, res: Response) => {
    const { nums } = req.body;
    if (!nums || !Array.isArray(nums)) return res.status(400).json({ error: "nums array required" });
    const result = dsAlgorithmService.balloonBurst(nums);
    sendSuccess(res, result);
  }),
);

router.post(
  "/dp/wildcard-match",
  asyncHandler(async (req: Request, res: Response) => {
    const { s, pattern } = req.body;
    if (!s || !pattern) return res.status(400).json({ error: "s and pattern required" });
    const result = dsAlgorithmService.wildcardMatching(s, pattern);
    sendSuccess(res, result);
  }),
);

// ============ DEPTH 4: ENHANCED EXISTING ============

router.post(
  "/persistent-segment-tree",
  asyncHandler(async (req: Request, res: Response) => {
    const { values, operations } = req.body;
    if (!values || !operations) return res.status(400).json({ error: "values and operations required" });
    const result = dsAlgorithmService.persistentSegmentTree(values, operations);
    sendSuccess(res, result);
  }),
);

router.post(
  "/min-max-heap",
  asyncHandler(async (req: Request, res: Response) => {
    const { values } = req.body;
    if (!values || !Array.isArray(values)) return res.status(400).json({ error: "values array required" });
    const result = dsAlgorithmService.minMaxHeapOperations(values);
    sendSuccess(res, result);
  }),
);

router.post(
  "/order-statistic-tree",
  asyncHandler(async (req: Request, res: Response) => {
    const { values } = req.body;
    if (!values || !Array.isArray(values)) return res.status(400).json({ error: "values array required" });
    const result = dsAlgorithmService.orderStatisticTree(values);
    sendSuccess(res, result);
  }),
);

router.post(
  "/concurrent-lru",
  asyncHandler(async (req: Request, res: Response) => {
    const { capacity, operations } = req.body;
    if (!capacity || !operations) return res.status(400).json({ error: "capacity and operations required" });
    const result = dsAlgorithmService.concurrentLRUCache(capacity, operations);
    sendSuccess(res, result);
  }),
);

router.post(
  "/rope-string",
  asyncHandler(async (req: Request, res: Response) => {
    const { s, operations } = req.body;
    if (!s || !operations) return res.status(400).json({ error: "s and operations required" });
    const result = dsAlgorithmService.ropeStringOperations(s, operations);
    sendSuccess(res, result);
  }),
);

// ============ DEPTH 4: MARKETING DEPTH ============

router.post(
  "/marketing/multi-touch",
  asyncHandler(async (req: Request, res: Response) => {
    const { paths, model } = req.body;
    if (!paths) return res.status(400).json({ error: "paths required" });
    const result = dsAlgorithmService.multiTouchAttribution(paths, model || "linear");
    sendSuccess(res, result);
  }),
);

router.post(
  "/marketing/budget-smoothing",
  asyncHandler(async (req: Request, res: Response) => {
    const { values, windowSize } = req.body;
    if (!values || !Array.isArray(values)) return res.status(400).json({ error: "values array required" });
    const result = dsAlgorithmService.budgetSmoothing(values, windowSize || 3);
    sendSuccess(res, result);
  }),
);

router.post(
  "/marketing/ad-fatigue",
  asyncHandler(async (req: Request, res: Response) => {
    const { impressions, responses } = req.body;
    if (!impressions || !responses) return res.status(400).json({ error: "impressions and responses required" });
    const result = dsAlgorithmService.adFatigueSaturation(impressions, responses);
    sendSuccess(res, result);
  }),
);

router.post(
  "/marketing/churn-heuristic",
  asyncHandler(async (req: Request, res: Response) => {
    const { users } = req.body;
    if (!users) return res.status(400).json({ error: "users required" });
    const result = dsAlgorithmService.churnHeuristic(users);
    sendSuccess(res, result);
  }),
);

router.post(
  "/marketing/chi-square",
  asyncHandler(async (req: Request, res: Response) => {
    const { control, variant } = req.body;
    if (!control || !variant) return res.status(400).json({ error: "control and variant required" });
    const result = dsAlgorithmService.chiSquareSignificance(control, variant);
    sendSuccess(res, result);
  }),
);

router.post(
  "/marketing/bid-landscape",
  asyncHandler(async (req: Request, res: Response) => {
    const { historicalBids, targetImpressions } = req.body;
    if (!historicalBids || targetImpressions === undefined) return res.status(400).json({ error: "historicalBids and targetImpressions required" });
    const result = dsAlgorithmService.bidLandscapeForecast(historicalBids, targetImpressions);
    sendSuccess(res, result);
  }),
);

router.post(
  "/marketing/incrementality",
  asyncHandler(async (req: Request, res: Response) => {
    const { control, treatment } = req.body;
    if (!control || !treatment) return res.status(400).json({ error: "control and treatment required" });
    const result = dsAlgorithmService.incrementalityTest(control, treatment);
    sendSuccess(res, result);
  }),
);

router.post(
  "/marketing/clv",
  asyncHandler(async (req: Request, res: Response) => {
    const { avgPurchaseValue, purchaseFrequency, churnRate, discountRate } = req.body;
    if (avgPurchaseValue === undefined || purchaseFrequency === undefined || churnRate === undefined)
      return res.status(400).json({ error: "avgPurchaseValue, purchaseFrequency, churnRate required" });
    const result = dsAlgorithmService.clvCalculation(avgPurchaseValue, purchaseFrequency, churnRate, discountRate || 0.1);
    sendSuccess(res, result);
  }),
);

router.post(
  "/marketing/reach-frequency",
  asyncHandler(async (req: Request, res: Response) => {
    const { budget, cpm, frequencyCap } = req.body;
    if (budget === undefined || cpm === undefined || frequencyCap === undefined)
      return res.status(400).json({ error: "budget, cpm, frequencyCap required" });
    const result = dsAlgorithmService.reachFrequencyEstimate(budget, cpm, frequencyCap);
    sendSuccess(res, result);
  }),
);

router.post(
  "/marketing/mmm",
  asyncHandler(async (req: Request, res: Response) => {
    const { channels, responseValues } = req.body;
    if (!channels || !responseValues) return res.status(400).json({ error: "channels and responseValues required" });
    const result = dsAlgorithmService.marketingMixModel(channels, responseValues);
    sendSuccess(res, result);
  }),
);

export default router;
