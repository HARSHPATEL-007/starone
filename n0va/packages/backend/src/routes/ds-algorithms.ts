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

// ============ DEPTH 5 Routes ============

router.post("/ds/sparse-table-rmq", asyncHandler(async (req, res) => {
  const { values, queries } = req.body;
  if (!values || !queries) return res.status(400).json({ error: "values and queries required" });
  sendSuccess(res, dsAlgorithmService.sparseTableRMQ(values, queries));
}));
router.post("/ds/xor-linked-list", asyncHandler(async (req, res) => {
  const { values } = req.body;
  if (!values) return res.status(400).json({ error: "values required" });
  sendSuccess(res, dsAlgorithmService.xorLinkedListOps(values));
}));
router.post("/ds/bit-2d", asyncHandler(async (req, res) => {
  const { rows, cols, updates, queries } = req.body;
  if (!rows || !cols || !updates || !queries) return res.status(400).json({ error: "rows, cols, updates, queries required" });
  sendSuccess(res, dsAlgorithmService.binaryIndexedTree2D(rows, cols, updates, queries));
}));
router.post("/ds/cartesian-tree-build", asyncHandler(async (req, res) => {
  const { values } = req.body;
  if (!values) return res.status(400).json({ error: "values required" });
  sendSuccess(res, dsAlgorithmService.cartesianTreeBuild(values));
}));
router.post("/ds/dsu", asyncHandler(async (req, res) => {
  const { operations } = req.body;
  if (!operations) return res.status(400).json({ error: "operations required" });
  sendSuccess(res, dsAlgorithmService.disjointSetUnionAdvanced(operations));
}));
router.post("/ds/treap-implicit", asyncHandler(async (req, res) => {
  const { values, operations } = req.body;
  if (!values || !operations) return res.status(400).json({ error: "values and operations required" });
  sendSuccess(res, dsAlgorithmService.treapImplicit(values, operations));
}));

router.post("/graph/min-cost-max-flow", asyncHandler(async (req, res) => {
  const { nodes, edges, source, sink } = req.body;
  if (!nodes || !edges || !source || !sink) return res.status(400).json({ error: "nodes, edges, source, sink required" });
  sendSuccess(res, dsAlgorithmService.minCostMaxFlow(nodes, edges, source, sink));
}));
router.post("/graph/bron-kerbosch", asyncHandler(async (req, res) => {
  const { adjacency } = req.body;
  if (!adjacency) return res.status(400).json({ error: "adjacency required" });
  sendSuccess(res, dsAlgorithmService.bronKerboschMaxClique(adjacency));
}));
router.post("/graph/mst", asyncHandler(async (req, res) => {
  const { nodes, edges } = req.body;
  if (!nodes || !edges) return res.status(400).json({ error: "nodes and edges required" });
  sendSuccess(res, dsAlgorithmService.minimumSpanningTree(nodes, edges));
}));
router.post("/graph/kosaraju", asyncHandler(async (req, res) => {
  const { graph } = req.body;
  if (!graph) return res.status(400).json({ error: "graph required" });
  sendSuccess(res, dsAlgorithmService.kosarajuSCC(graph));
}));
router.post("/graph/articulation-points", asyncHandler(async (req, res) => {
  const { nodes, edges } = req.body;
  if (!nodes || !edges) return res.status(400).json({ error: "nodes and edges required" });
  sendSuccess(res, dsAlgorithmService.articulationPointsAndBridges(nodes, edges));
}));
router.post("/graph/bipartite-matching", asyncHandler(async (req, res) => {
  const { left, right, edges } = req.body;
  if (!left || !right || !edges) return res.status(400).json({ error: "left, right, edges required" });
  sendSuccess(res, dsAlgorithmService.bipartiteMatching(left, right, edges));
}));

router.post("/string/manacher-algo", asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "text required" });
  sendSuccess(res, dsAlgorithmService.manacherAlgorithm(text));
}));
router.post("/string/z-algo", asyncHandler(async (req, res) => {
  const { text, pattern } = req.body;
  if (!text || !pattern) return res.status(400).json({ error: "text and pattern required" });
  sendSuccess(res, dsAlgorithmService.zAlgorithmSearch(text, pattern));
}));
router.post("/string/levenshtein-path", asyncHandler(async (req, res) => {
  const { a, b } = req.body;
  if (!a || !b) return res.status(400).json({ error: "strings a and b required" });
  sendSuccess(res, dsAlgorithmService.levenshteinWithPath(a, b));
}));
router.post("/dp/lis-path", asyncHandler(async (req, res) => {
  const { values } = req.body;
  if (!values) return res.status(400).json({ error: "values required" });
  sendSuccess(res, dsAlgorithmService.lisWithPath(values));
}));
router.post("/dp/tsp-bitmask", asyncHandler(async (req, res) => {
  const { distances } = req.body;
  if (!distances) return res.status(400).json({ error: "distances matrix required" });
  sendSuccess(res, dsAlgorithmService.dpBitmaskTSP(distances));
}));
router.post("/dp/regex-match", asyncHandler(async (req, res) => {
  const { text, pattern } = req.body;
  if (!text || !pattern) return res.status(400).json({ error: "text and pattern required" });
  sendSuccess(res, dsAlgorithmService.regexMatching(text, pattern));
}));
router.post("/dp/damerau-lev", asyncHandler(async (req, res) => {
  const { a, b } = req.body;
  if (!a || !b) return res.status(400).json({ error: "strings a and b required" });
  sendSuccess(res, dsAlgorithmService.damerauLevenshtein(a, b));
}));

router.post("/ds/lru-cache-ops", asyncHandler(async (req, res) => {
  const { capacity, operations } = req.body;
  if (capacity === undefined || !operations) return res.status(400).json({ error: "capacity and operations required" });
  sendSuccess(res, dsAlgorithmService.lruCacheOps(capacity, operations));
}));
router.post("/ds/bloom-filter-advanced", asyncHandler(async (req, res) => {
  const { expectedElements, falsePositiveRate, items, checks } = req.body;
  if (expectedElements === undefined || falsePositiveRate === undefined || !items || !checks)
    return res.status(400).json({ error: "expectedElements, falsePositiveRate, items, checks required" });
  sendSuccess(res, dsAlgorithmService.bloomFilterAdvanced(expectedElements, falsePositiveRate, items, checks));
}));
router.post("/ds/segment-tree-lazy", asyncHandler(async (req, res) => {
  const { values, operations } = req.body;
  if (!values || !operations) return res.status(400).json({ error: "values and operations required" });
  sendSuccess(res, dsAlgorithmService.segmentTreeLazyPropagation(values, operations));
}));
router.post("/ds/deque-ops", asyncHandler(async (req, res) => {
  const { initial, operations } = req.body;
  if (!initial || !operations) return res.status(400).json({ error: "initial and operations required" });
  sendSuccess(res, dsAlgorithmService.dequeOps(initial, operations));
}));
router.post("/ds/priority-queue", asyncHandler(async (req, res) => {
  const { initial, operations } = req.body;
  if (!initial || !operations) return res.status(400).json({ error: "initial and operations required" });
  sendSuccess(res, dsAlgorithmService.priorityQueueOps(initial, operations));
}));
router.post("/ds/hash-map", asyncHandler(async (req, res) => {
  const { capacity, operations } = req.body;
  if (capacity === undefined || !operations) return res.status(400).json({ error: "capacity and operations required" });
  sendSuccess(res, dsAlgorithmService.hashMapChaining(capacity, operations));
}));
router.post("/ds/circular-buffer", asyncHandler(async (req, res) => {
  const { capacity, operations } = req.body;
  if (capacity === undefined || !operations) return res.status(400).json({ error: "capacity and operations required" });
  sendSuccess(res, dsAlgorithmService.circularBufferOps(capacity, operations));
}));

router.post("/marketing/exp3", asyncHandler(async (req, res) => {
  const { variants, rewards, gamma } = req.body;
  if (!variants || !rewards) return res.status(400).json({ error: "variants and rewards required" });
  sendSuccess(res, dsAlgorithmService.exp3Bandit(variants, rewards, gamma || 0.1));
}));
router.post("/marketing/thompson-gaussian", asyncHandler(async (req, res) => {
  const { variants, rewards, priorMean, priorVariance } = req.body;
  if (!variants || !rewards) return res.status(400).json({ error: "variants and rewards required" });
  sendSuccess(res, dsAlgorithmService.thompsonSamplingGaussian(variants, rewards, priorMean || 0, priorVariance || 1));
}));
router.post("/marketing/kaplan-meier", asyncHandler(async (req, res) => {
  const { times, events } = req.body;
  if (!times || !events) return res.status(400).json({ error: "times and events required" });
  sendSuccess(res, dsAlgorithmService.kaplanMeierSurvival(times, events));
}));
router.post("/marketing/uplift", asyncHandler(async (req, res) => {
  const { control, treatment } = req.body;
  if (!control || !treatment) return res.status(400).json({ error: "control and treatment required" });
  sendSuccess(res, dsAlgorithmService.upliftModeling(control, treatment));
}));
router.post("/marketing/causal-dml", asyncHandler(async (req, res) => {
  const { treatment, outcome, covariates } = req.body;
  if (!treatment || !outcome || !covariates) return res.status(400).json({ error: "treatment, outcome, covariates required" });
  sendSuccess(res, dsAlgorithmService.causalInferenceDML(treatment, outcome, covariates));
}));
router.post("/marketing/optimal-transport", asyncHandler(async (req, res) => {
  const { source, target, costMatrix, iterations, reg } = req.body;
  if (!source || !target || !costMatrix) return res.status(400).json({ error: "source, target, costMatrix required" });
  sendSuccess(res, dsAlgorithmService.sinkhornOptimalTransport(source, target, costMatrix, iterations || 10, reg || 0.1));
}));
router.post("/marketing/shapley-attr", asyncHandler(async (req, res) => {
  const { channels, conversions, totalConversions } = req.body;
  if (!channels || !conversions || !totalConversions) return res.status(400).json({ error: "channels, conversions, totalConversions required" });
  sendSuccess(res, dsAlgorithmService.shapleyAttribution(channels, conversions, totalConversions));
}));
router.post("/marketing/brier-score", asyncHandler(async (req, res) => {
  const { predictions } = req.body;
  if (!predictions) return res.status(400).json({ error: "predictions required" });
  sendSuccess(res, dsAlgorithmService.brierScoreCalibration(predictions));
}));
router.post("/marketing/funnel-analysis", asyncHandler(async (req, res) => {
  const { stages, conversions } = req.body;
  if (!stages || !conversions) return res.status(400).json({ error: "stages and conversions required" });
  sendSuccess(res, dsAlgorithmService.funnelConversionAnalysis(stages, conversions));
}));
router.post("/marketing/response-surface", asyncHandler(async (req, res) => {
  const { bids, impressions, conversions, revenue } = req.body;
  if (!bids || !impressions || !conversions || !revenue) return res.status(400).json({ error: "bids, impressions, conversions, revenue required" });
  sendSuccess(res, dsAlgorithmService.responseSurfaceBid(bids, impressions, conversions, revenue));
}));

// ============ DEPTH 6 Routes ============

router.post("/ds/sqrt-decomposition", asyncHandler(async (req, res) => {
  const { values, queries } = req.body;
  if (!values || !queries) return res.status(400).json({ error: "values and queries required" });
  sendSuccess(res, dsAlgorithmService.sqrtDecomposition(values, queries));
}));
router.post("/ds/wavelet-tree", asyncHandler(async (req, res) => {
  const { array, ops } = req.body;
  if (!array || !ops) return res.status(400).json({ error: "array and ops required" });
  sendSuccess(res, dsAlgorithmService.waveletTree(array, ops));
}));
router.post("/ds/dancing-links", asyncHandler(async (req, res) => {
  const { matrix } = req.body;
  if (!matrix) return res.status(400).json({ error: "matrix required" });
  sendSuccess(res, dsAlgorithmService.dancingLinks(matrix));
}));
router.post("/ds/link-cut-tree", asyncHandler(async (req, res) => {
  const { ops } = req.body;
  if (!ops) return res.status(400).json({ error: "ops required" });
  sendSuccess(res, dsAlgorithmService.linkCutTree(ops));
}));
router.post("/ds/van-emde-boas", asyncHandler(async (req, res) => {
  const { universe, ops } = req.body;
  if (universe === undefined || !ops) return res.status(400).json({ error: "universe and ops required" });
  sendSuccess(res, dsAlgorithmService.vanEmdeBoas(universe, ops));
}));
router.post("/ds/pairing-heap", asyncHandler(async (req, res) => {
  const { ops } = req.body;
  if (!ops) return res.status(400).json({ error: "ops required" });
  sendSuccess(res, dsAlgorithmService.pairingHeap(ops));
}));
router.post("/ds/interval-map-stabbing", asyncHandler(async (req, res) => {
  const { intervals, points } = req.body;
  if (!intervals || !points) return res.status(400).json({ error: "intervals and points required" });
  sendSuccess(res, dsAlgorithmService.intervalMapStabbing(intervals, points));
}));

router.post("/graph/blossom", asyncHandler(async (req, res) => {
  const { nodes, edges } = req.body;
  if (!nodes || !edges) return res.status(400).json({ error: "nodes and edges required" });
  sendSuccess(res, dsAlgorithmService.blossomMatching(nodes, edges));
}));
router.post("/graph/gomory-hu", asyncHandler(async (req, res) => {
  const { nodes, edges } = req.body;
  if (!nodes || !edges) return res.status(400).json({ error: "nodes and edges required" });
  sendSuccess(res, dsAlgorithmService.gomoryHuTree(nodes, edges));
}));
router.post("/algo/fft", asyncHandler(async (req, res) => {
  const { a, b } = req.body;
  if (!a || !b) return res.status(400).json({ error: "arrays a and b required" });
  sendSuccess(res, dsAlgorithmService.fftMultiply(a, b));
}));
router.post("/graph/karger", asyncHandler(async (req, res) => {
  const { nodes, edges, trials } = req.body;
  if (!nodes || !edges) return res.status(400).json({ error: "nodes and edges required" });
  sendSuccess(res, dsAlgorithmService.kargerMinCut(nodes, edges, trials || 10));
}));
router.post("/algo/n-queens", asyncHandler(async (req, res) => {
  const { n } = req.body;
  if (n === undefined) return res.status(400).json({ error: "n required" });
  sendSuccess(res, dsAlgorithmService.nQueensSolver(n));
}));
router.post("/algo/majority-element", asyncHandler(async (req, res) => {
  const { nums } = req.body;
  if (!nums) return res.status(400).json({ error: "nums required" });
  sendSuccess(res, dsAlgorithmService.majorityElementMoore(nums));
}));

router.post("/string/suffix-automaton", asyncHandler(async (req, res) => {
  const { text, patterns } = req.body;
  if (!text || !patterns) return res.status(400).json({ error: "text and patterns required" });
  sendSuccess(res, dsAlgorithmService.suffixAutomaton(text, patterns));
}));
router.post("/string/lyndon", asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "text required" });
  sendSuccess(res, dsAlgorithmService.lyndonFactorization(text));
}));
router.post("/string/rle", asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "text required" });
  sendSuccess(res, dsAlgorithmService.runLengthEncoding(text));
}));
router.post("/string/soundex", asyncHandler(async (req, res) => {
  const { word } = req.body;
  if (!word) return res.status(400).json({ error: "word required" });
  sendSuccess(res, dsAlgorithmService.soundexPhonetic(word));
}));
router.post("/dp/rod-cutting", asyncHandler(async (req, res) => {
  const { prices, length } = req.body;
  if (!prices || length === undefined) return res.status(400).json({ error: "prices and length required" });
  sendSuccess(res, dsAlgorithmService.dpRodCutting(prices, length));
}));
router.post("/dp/optimal-bst", asyncHandler(async (req, res) => {
  const { keys, freq } = req.body;
  if (!keys || !freq) return res.status(400).json({ error: "keys and freq required" });
  sendSuccess(res, dsAlgorithmService.dpOptimalBST(keys, freq));
}));

router.post("/ds/multi-set-bag", asyncHandler(async (req, res) => {
  const { ops } = req.body;
  if (!ops) return res.status(400).json({ error: "ops required" });
  sendSuccess(res, dsAlgorithmService.multiSetBag(ops));
}));
router.post("/ds/fenwick-range-point", asyncHandler(async (req, res) => {
  const { size, ops } = req.body;
  if (size === undefined || !ops) return res.status(400).json({ error: "size and ops required" });
  sendSuccess(res, dsAlgorithmService.fenwickTreeRangePoint(size, ops));
}));
router.post("/ds/union-by-size", asyncHandler(async (req, res) => {
  const { ops } = req.body;
  if (!ops) return res.status(400).json({ error: "ops required" });
  sendSuccess(res, dsAlgorithmService.unionBySize(ops));
}));
router.post("/ds/binary-trie-xor", asyncHandler(async (req, res) => {
  const { nums, queries } = req.body;
  if (!nums || !queries) return res.status(400).json({ error: "nums and queries required" });
  sendSuccess(res, dsAlgorithmService.binaryTrieXor(nums, queries));
}));

router.post("/marketing/holt-winters", asyncHandler(async (req, res) => {
  const { data, alpha, beta, gamma, seasonPeriod, forecastPeriods } = req.body;
  if (!data) return res.status(400).json({ error: "data required" });
  sendSuccess(res, dsAlgorithmService.holtWintersForecast(data, alpha || 0.3, beta || 0.1, gamma || 0.1, seasonPeriod || 4, forecastPeriods || 4));
}));
router.post("/marketing/garch", asyncHandler(async (req, res) => {
  const { returns, omega, alpha, beta } = req.body;
  if (!returns) return res.status(400).json({ error: "returns required" });
  sendSuccess(res, dsAlgorithmService.garchVolatility(returns, omega || 0.01, alpha || 0.1, beta || 0.8));
}));
router.post("/marketing/bayesian-ab", asyncHandler(async (req, res) => {
  const { control, treatment, simulations } = req.body;
  if (!control || !treatment) return res.status(400).json({ error: "control and treatment required" });
  sendSuccess(res, dsAlgorithmService.bayesianABTest(control, treatment, simulations || 10000));
}));
router.post("/marketing/confidence-interval", asyncHandler(async (req, res) => {
  const { successes, trials, confidence } = req.body;
  if (successes === undefined || trials === undefined) return res.status(400).json({ error: "successes and trials required" });
  sendSuccess(res, dsAlgorithmService.confidenceIntervalCalc(successes, trials, confidence || 0.95));
}));
router.post("/marketing/t-test", asyncHandler(async (req, res) => {
  const { sample1, sample2 } = req.body;
  if (!sample1 || !sample2) return res.status(400).json({ error: "sample1 and sample2 required" });
  sendSuccess(res, dsAlgorithmService.tTestTwoSample(sample1, sample2));
}));
router.post("/marketing/monte-carlo-clv", asyncHandler(async (req, res) => {
  const { avgPurchaseValue, purchaseFrequency, churnRate, discountRate, simulations } = req.body;
  if (avgPurchaseValue === undefined || purchaseFrequency === undefined || churnRate === undefined)
    return res.status(400).json({ error: "avgPurchaseValue, purchaseFrequency, churnRate required" });
  sendSuccess(res, dsAlgorithmService.monteCarloCLV(avgPurchaseValue, purchaseFrequency, churnRate, discountRate || 0.1, simulations || 1000));
}));
router.post("/marketing/adstock", asyncHandler(async (req, res) => {
  const { spend, decayRate, lag } = req.body;
  if (!spend) return res.status(400).json({ error: "spend required" });
  sendSuccess(res, dsAlgorithmService.adstockModel(spend, decayRate || 0.5, lag || 1));
}));
router.post("/marketing/efficient-frontier", asyncHandler(async (req, res) => {
  const { assets, returns, risks, correlations, steps } = req.body;
  if (!assets || !returns || !risks || !correlations) return res.status(400).json({ error: "assets, returns, risks, correlations required" });
  sendSuccess(res, dsAlgorithmService.efficientFrontierAlloc(assets, returns, risks, correlations, steps || 10));
}));
router.post("/marketing/media-saturation", asyncHandler(async (req, res) => {
  const { spend, response } = req.body;
  if (!spend || !response) return res.status(400).json({ error: "spend and response required" });
  sendSuccess(res, dsAlgorithmService.mediaSaturationCurve(spend, response));
}));
router.post("/marketing/time-decay-attr", asyncHandler(async (req, res) => {
  const { touchpoints, decayFactor } = req.body;
  if (!touchpoints) return res.status(400).json({ error: "touchpoints required" });
  sendSuccess(res, dsAlgorithmService.timeDecayAttribution(touchpoints, decayFactor || 0.5));
}));

// ============ DEPTH 7 Routes ============

router.post("/ds/cuckoo-filter", asyncHandler(async (req, res) => {
  const { items, testItems } = req.body;
  if (!items) return res.status(400).json({ error: "items required" });
  sendSuccess(res, dsAlgorithmService.cuckooFilter(items, testItems || []));
}));
router.post("/ds/suffix-tree-sim", asyncHandler(async (req, res) => {
  const { text, patterns } = req.body;
  if (!text || !patterns) return res.status(400).json({ error: "text and patterns required" });
  sendSuccess(res, dsAlgorithmService.suffixTreeSimulation(text, patterns));
}));
router.post("/ds/r-tree", asyncHandler(async (req, res) => {
  const { operations } = req.body;
  if (!operations) return res.status(400).json({ error: "operations required" });
  sendSuccess(res, dsAlgorithmService.rTreeSpatial(operations));
}));
router.post("/ds/persistent-array", asyncHandler(async (req, res) => {
  const { operations } = req.body;
  if (!operations) return res.status(400).json({ error: "operations required" });
  sendSuccess(res, dsAlgorithmService.persistentArray(operations));
}));
router.post("/ds/min-max-stack", asyncHandler(async (req, res) => {
  const { operations } = req.body;
  if (!operations) return res.status(400).json({ error: "operations required" });
  sendSuccess(res, dsAlgorithmService.minMaxStack(operations));
}));
router.post("/ds/d-ary-heap", asyncHandler(async (req, res) => {
  const { values, degree, operations } = req.body;
  if (!values || !operations) return res.status(400).json({ error: "values, degree, operations required" });
  sendSuccess(res, dsAlgorithmService.dAryHeap(values, degree || 3, operations));
}));
router.post("/ds/interval-tree-dynamic", asyncHandler(async (req, res) => {
  const { operations } = req.body;
  if (!operations) return res.status(400).json({ error: "operations required" });
  sendSuccess(res, dsAlgorithmService.intervalTreeDynamic(operations));
}));

router.post("/algo/longest-path-dag", asyncHandler(async (req, res) => {
  const { nodes, edges } = req.body;
  if (!nodes || !edges) return res.status(400).json({ error: "nodes and edges required" });
  sendSuccess(res, dsAlgorithmService.longestPathDag(nodes, edges));
}));
router.post("/algo/graph-coloring", asyncHandler(async (req, res) => {
  const { nodes, edges } = req.body;
  if (!nodes || !edges) return res.status(400).json({ error: "nodes and edges required" });
  sendSuccess(res, dsAlgorithmService.graphColoringGreedy(nodes, edges));
}));
router.post("/algo/vertex-cover", asyncHandler(async (req, res) => {
  const { left, right, edges } = req.body;
  if (!left || !right || !edges) return res.status(400).json({ error: "left, right, edges required" });
  sendSuccess(res, dsAlgorithmService.minimumVertexCover(left, right, edges));
}));
router.post("/algo/hamiltonian-path", asyncHandler(async (req, res) => {
  const { nodes, edges } = req.body;
  if (!nodes || !edges) return res.status(400).json({ error: "nodes and edges required" });
  sendSuccess(res, dsAlgorithmService.hamiltonianPath(nodes, edges));
}));
router.post("/algo/baum-welch", asyncHandler(async (req, res) => {
  const { observations, nStates, maxIterations } = req.body;
  if (!observations || nStates === undefined) return res.status(400).json({ error: "observations and nStates required" });
  sendSuccess(res, dsAlgorithmService.baumWelchHmm(observations, nStates, maxIterations || 50));
}));
router.post("/graph/ford-fulkerson", asyncHandler(async (req, res) => {
  const { nodes, edges, source, sink } = req.body;
  if (!nodes || !edges || !source || !sink) return res.status(400).json({ error: "nodes, edges, source, sink required" });
  sendSuccess(res, dsAlgorithmService.fordFulkersonMaxFlow(nodes, edges, source, sink));
}));

router.post("/string/kmp-2d", asyncHandler(async (req, res) => {
  const { grid, pattern } = req.body;
  if (!grid || !pattern) return res.status(400).json({ error: "grid and pattern required" });
  sendSuccess(res, dsAlgorithmService.kmp2dSearch(grid, pattern));
}));
router.post("/string/longest-repeated", asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "text required" });
  sendSuccess(res, dsAlgorithmService.longestRepeatedSubstring(text));
}));
router.post("/string/text-justify", asyncHandler(async (req, res) => {
  const { words, maxWidth } = req.body;
  if (!words || maxWidth === undefined) return res.status(400).json({ error: "words and maxWidth required" });
  sendSuccess(res, dsAlgorithmService.textJustification(words, maxWidth));
}));
router.post("/string/affine-edit", asyncHandler(async (req, res) => {
  const { a, b, gapOpen, gapExtend } = req.body;
  if (!a || !b) return res.status(400).json({ error: "strings a and b required" });
  sendSuccess(res, dsAlgorithmService.affineGapEditDistance(a, b, gapOpen || 2, gapExtend || 1));
}));
router.post("/dp/box-stacking", asyncHandler(async (req, res) => {
  const { boxes } = req.body;
  if (!boxes) return res.status(400).json({ error: "boxes required" });
  sendSuccess(res, dsAlgorithmService.dpBoxStacking(boxes));
}));
router.post("/dp/longest-chain", asyncHandler(async (req, res) => {
  const { pairs } = req.body;
  if (!pairs) return res.status(400).json({ error: "pairs required" });
  sendSuccess(res, dsAlgorithmService.dpLongestChain(pairs));
}));
router.post("/dp/max-sum-rectangle", asyncHandler(async (req, res) => {
  const { matrix } = req.body;
  if (!matrix) return res.status(400).json({ error: "matrix required" });
  sendSuccess(res, dsAlgorithmService.dpMaxSumRectangle(matrix));
}));

router.post("/ds/segment-tree-persistent", asyncHandler(async (req, res) => {
  const { values, operations } = req.body;
  if (!values || !operations) return res.status(400).json({ error: "values and operations required" });
  sendSuccess(res, dsAlgorithmService.segmentTreePersistent(values, operations));
}));
router.post("/ds/dsu-persistent", asyncHandler(async (req, res) => {
  const { operations } = req.body;
  if (!operations) return res.status(400).json({ error: "operations required" });
  sendSuccess(res, dsAlgorithmService.dsuPersistentRollback(operations));
}));
router.post("/ds/scalable-bloom", asyncHandler(async (req, res) => {
  const { operations } = req.body;
  if (!operations) return res.status(400).json({ error: "operations required" });
  sendSuccess(res, dsAlgorithmService.scalableBloomFilter(operations));
}));
router.post("/ds/lfu-advanced", asyncHandler(async (req, res) => {
  const { capacity, operations } = req.body;
  if (capacity === undefined || !operations) return res.status(400).json({ error: "capacity and operations required" });
  sendSuccess(res, dsAlgorithmService.lfuCacheAdvanced(capacity, operations));
}));
router.post("/ds/treap-order-stats", asyncHandler(async (req, res) => {
  const { values, operations } = req.body;
  if (!values || !operations) return res.status(400).json({ error: "values and operations required" });
  sendSuccess(res, dsAlgorithmService.treapOrderStatistics(values, operations));
}));

router.post("/marketing/doubly-robust", asyncHandler(async (req, res) => {
  const { treatment, outcome, propensity } = req.body;
  if (!treatment || !outcome || !propensity) return res.status(400).json({ error: "treatment, outcome, propensity required" });
  sendSuccess(res, dsAlgorithmService.doublyRobustATE(treatment, outcome, propensity));
}));
router.post("/marketing/linucb", asyncHandler(async (req, res) => {
  const { arms, contexts, rewards } = req.body;
  if (!arms || !contexts || !rewards) return res.status(400).json({ error: "arms, contexts, rewards required" });
  sendSuccess(res, dsAlgorithmService.linUcbBandit(arms, contexts, rewards));
}));
router.post("/marketing/bid-shading", asyncHandler(async (req, res) => {
  const { bid, marketCompetitiveness, historicalWinRate } = req.body;
  if (bid === undefined || marketCompetitiveness === undefined || !historicalWinRate)
    return res.status(400).json({ error: "bid, marketCompetitiveness, historicalWinRate required" });
  sendSuccess(res, dsAlgorithmService.optimalBidShading(bid, marketCompetitiveness, historicalWinRate));
}));
router.post("/marketing/markov-complete", asyncHandler(async (req, res) => {
  const { channels, touchpoints, conversions } = req.body;
  if (!channels || !touchpoints || !conversions) return res.status(400).json({ error: "channels, touchpoints, conversions required" });
  sendSuccess(res, dsAlgorithmService.multiTouchMarkovComplete(channels, touchpoints, conversions));
}));
router.post("/marketing/roas-portfolio", asyncHandler(async (req, res) => {
  const { channels, targetReturn } = req.body;
  if (!channels || targetReturn === undefined) return res.status(400).json({ error: "channels and targetReturn required" });
  sendSuccess(res, dsAlgorithmService.roasPortfolioRiskOptimization(channels, targetReturn));
}));
router.post("/marketing/causal-impact", asyncHandler(async (req, res) => {
  const { target, controls, nSimulations } = req.body;
  if (!target || !controls) return res.status(400).json({ error: "target and controls required" });
  sendSuccess(res, dsAlgorithmService.bayesianCausalImpact(target, controls, nSimulations || 200));
}));
router.post("/marketing/multi-period-budget", asyncHandler(async (req, res) => {
  const { periods, totalBudget, channelReturns } = req.body;
  if (periods === undefined || totalBudget === undefined || !channelReturns)
    return res.status(400).json({ error: "periods, totalBudget, channelReturns required" });
  sendSuccess(res, dsAlgorithmService.multiPeriodBudgetOptimization(periods, totalBudget, channelReturns));
}));
router.post("/marketing/lookalike-ensemble", asyncHandler(async (req, res) => {
  const { seedFeatures, candidateFeatures, topK } = req.body;
  if (!seedFeatures || !candidateFeatures) return res.status(400).json({ error: "seedFeatures and candidateFeatures required" });
  sendSuccess(res, dsAlgorithmService.audienceLookalikeEnsemble(seedFeatures, candidateFeatures, topK || 10));
}));
router.post("/marketing/churn-logistic", asyncHandler(async (req, res) => {
  const { features, labels } = req.body;
  if (!features || !labels) return res.status(400).json({ error: "features and labels required" });
  sendSuccess(res, dsAlgorithmService.churnPredictionLogisticRegression(features, labels));
}));
router.post("/marketing/keyword-portfolio", asyncHandler(async (req, res) => {
  const { keywords, budget } = req.body;
  if (!keywords || budget === undefined) return res.status(400).json({ error: "keywords and budget required" });
  sendSuccess(res, dsAlgorithmService.keywordBidPortfolioOptimization(keywords, budget));
}));

export default router;
