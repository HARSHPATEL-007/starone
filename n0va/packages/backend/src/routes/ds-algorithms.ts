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

export default router;
