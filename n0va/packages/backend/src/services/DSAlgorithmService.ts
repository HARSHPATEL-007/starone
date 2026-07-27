interface TrieNode {
  children: Map<string, TrieNode>;
  isEnd: boolean;
  count: number;
}

interface FenwickTreeResult {
  type: string;
  size: number;
  operations: { query: number[]; prefix: number[] }[];
}

interface SegmentTreeResult {
  type: string;
  size: number;
  buildTime: number;
  operations: { type: string; range: [number, number]; result: number }[];
}

interface UnionFindResult {
  elements: string[];
  sets: { root: string; members: string[] }[];
  operations: { type: string; a: string; b: string; connected?: boolean }[];
}

interface MinHeapResult {
  initial: number[];
  sorted: number[];
  operations: { action: string; value?: number; heapSize: number }[];
}

interface LRUCacheResult {
  capacity: number;
  operations: { action: string; key: string; value?: number; evicted?: boolean }[];
  finalState: { key: string; value: number }[];
}

interface SortResult {
  algorithm: string;
  input: number[];
  output: number[];
  comparisons: number;
  timeMs: number;
}

interface SearchResult {
  algorithm: string;
  array: number[];
  target: number;
  index: number;
  found: boolean;
  iterations: number;
}

interface GraphResult {
  algorithm: string;
  nodes: string[];
  edges: [string, string, number?][];
  traversal: string[];
  distances?: Record<string, number>;
  path?: string[];
  hasCycle?: boolean;
}

interface StringMatchResult {
  algorithm: string;
  text: string;
  pattern: string;
  matches: number[];
  comparisons: number;
}

interface DPResult {
  algorithm: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  table?: number[][];
}

interface AVLNode {
  key: number;
  left: AVLNode | null;
  right: AVLNode | null;
  height: number;
  value?: string;
}

interface DequeResult {
  type: string;
  initial: number[];
  operations: { action: string; value?: number; result?: number | number[] }[];
}

interface SparseTableResult {
  type: string;
  size: number;
  operations: { l: number; r: number; result: number }[];
}

interface CountingBloomResult {
  size: number;
  hashCount: number;
  counters: number[];
  operations: { action: string; item: string; count?: number; probablyPresent?: boolean }[];
}

interface MaxFlowResult {
  algorithm: string;
  source: string;
  sink: string;
  maxFlow: number;
  flowEdges: { from: string; to: string; flow: number; capacity: number }[];
}

interface TarjanSCCResult {
  algorithm: string;
  sccCount: number;
  components: string[][];
}

interface ManacherResult {
  algorithm: string;
  text: string;
  centers: number[];
  longestPalindrome: string;
  length: number;
}

interface SuffixArrayResult {
  algorithm: string;
  text: string;
  suffixArray: number[];
  lcpArray: number[];
  uniqueSubstrings: number;
}

interface MarketingResult {
  algorithm: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
}

interface SkipListNode {
  key: number;
  value: string;
  forward: SkipListNode[];
}

interface RedBlackNode {
  key: number;
  value?: string;
  left: RedBlackNode | null;
  right: RedBlackNode | null;
  parent: RedBlackNode | null;
  red: boolean;
}

interface IntervalNode {
  low: number;
  high: number;
  max: number;
  left: IntervalNode | null;
  right: IntervalNode | null;
}

interface FibonacciNode {
  key: number;
  value: string;
  degree: number;
  marked: boolean;
  parent: FibonacciNode | null;
  child: FibonacciNode | null;
  left: FibonacciNode;
  right: FibonacciNode;
}

interface RadixNode {
  children: Map<string, RadixNode>;
  isEnd: boolean;
  value?: string;
  prefix: string;
}

interface HungarianResult {
  algorithm: string;
  cost: number;
  assignment: [number, number][];
}

interface MarketingDepthResult {
  algorithm: string;
  output: Record<string, unknown>;
}

interface HopcroftKarpResult {
  algorithm: string;
  matching: [string, string][];
  cardinality: number;
  iterations: number;
}

interface DinicResult {
  algorithm: string;
  maxFlow: number;
  flowEdges: { from: string; to: string; flow: number; capacity: number }[];
  levels: number;
}

interface JohnsonResult {
  algorithm: string;
  distances: number[][];
  nodes: string[];
  hasNegativeCycle: boolean;
}

interface KDTreeResult {
  type: string;
  tree: { point: number[]; left: KDTreeResult["tree"] | null; right: KDTreeResult["tree"] | null } | null;
  nearestNeighbor?: { point: number[]; distance: number };
  rangeSearch?: { point: number[]; distance: number }[];
  nodes: number;
}

interface XorLinkedListResult {
  type: string;
  elements: number[];
  operations: { action: string; value?: number; result?: number[] }[];
}

interface BinaryIndexedTree2DResult {
  type: string;
  rows: number;
  cols: number;
  operations: { type: string; x: number; y: number; x2?: number; y2?: number; value?: number; result?: number }[];
}

interface CartesianTreeResult {
  type: string;
  root: number;
  parent: number[];
  leftChild: number[];
  rightChild: number[];
}

interface MinCostMaxFlowResult {
  algorithm: string;
  maxFlow: number;
  minCost: number;
  flowEdges: { from: string; to: string; flow: number; capacity: number; cost: number }[];
}

interface BronKerboschResult {
  algorithm: string;
  cliques: string[][];
  maxClique: string[];
  cliqueCount: number;
}

interface MSTResult {
  algorithm: string;
  edges: { from: string; to: string; weight: number }[];
  totalWeight: number;
  nodes: number;
}

interface SqrtDecompositionResult {
  type: string;
  size: number;
  blockSize: number;
  operations: { type: string; l: number; r: number; value?: number; result?: number }[];
}

interface WaveletTreeResult {
  type: string;
  array: number[];
  alphabet: number;
  operations: { type: string; l: number; r: number; k?: number; value?: number; result?: number | number[] }[];
}

interface DancingLinksResult {
  type: string;
  rows: number;
  cols: number;
  solutions: number[][][];
  solutionCount: number;
}

interface LinkCutTreeResult {
  type: string;
  operations: { action: string; u: string; v?: string; result?: boolean | number }[];
}

interface VanEmdeBoasResult {
  type: string;
  universe: number;
  operations: { action: string; key?: number; result?: boolean | number | null }[];
}

interface PairingHeapResult {
  type: string;
  operations: { action: string; value?: number; result?: number | null; size: number }[];
}

interface IntervalMapResult {
  type: string;
  intervals: { low: number; high: number; value: string }[];
  queries: { point: number; result: string | null }[];
}

interface BlossomResult {
  algorithm: string;
  matching: [string, string][];
  cardinality: number;
}

interface GomoryHuResult {
  algorithm: string;
  tree: { from: string; to: string; weight: number }[];
  cuts: { s: string; t: string; minCut: number }[];
}

interface FFTResult {
  algorithm: string;
  a: number[];
  b: number[];
  product: number[];
}

interface KargerResult {
  algorithm: string;
  cutEdges: [string, string][];
  cutWeight: number;
  trials: number;
}

interface NQueensResult {
  algorithm: string;
  n: number;
  solutions: number[][][];
  solutionCount: number;
}

interface MajorityElementResult {
  algorithm: string;
  array: number[];
  majority: number | null;
  frequency: number;
}

interface SuffixAutomatonResult {
  type: string;
  text: string;
  states: number;
  operations: { pattern: string; occurrences: number; positions: number[] }[];
}

interface LyndonResult {
  algorithm: string;
  text: string;
  factors: string[];
}

interface RunLengthResult {
  type: string;
  original: string;
  encoded: { char: string; count: number }[];
  decoded: string;
  compressionRatio: string;
}

interface SoundexResult {
  algorithm: string;
  word: string;
  code: string;
}

interface RodCuttingResult {
  algorithm: string;
  prices: number[];
  length: number;
  maxValue: number;
  cuts: number[];
}

interface OptimalBSTResult {
  algorithm: string;
  keys: string[];
  expectedCost: number;
  root: number[][];
}

interface MultiSetBagResult {
  type: string;
  operations: { action: string; value?: number; count?: number; result?: number | boolean | number[] }[];
}

interface FenwickTreeRangePointResult {
  type: string;
  size: number;
  operations: { type: string; l?: number; r?: number; idx?: number; value?: number; result?: number }[];
}

interface UnionBySizeResult {
  type: string;
  operations: { action: string; a: number; b?: number; result?: boolean | number; sizes: number[] }[];
}

interface BinaryTrieXorResult {
  type: string;
  numbers: number[];
  queries: { xorWith: number; maxXor: number; maxXorValue: number }[];
}

interface HoltWintersResult {
  algorithm: string;
  data: number[];
  forecast: number[];
  components: { level: number[]; trend: number[]; seasonal: number[] };
  mse: number;
}

interface GARCHResult {
  algorithm: string;
  returns: number[];
  params: { omega: number; alpha: number; beta: number };
  conditionalVariance: number[];
}

interface BayesianABResult {
  algorithm: string;
  control: { successes: number; trials: number; mean: number };
  treatment: { successes: number; trials: number; mean: number };
  probTreatmentBetter: number;
  expectedLift: number;
}

interface ConfidenceIntervalResult {
  algorithm: string;
  successes: number;
  trials: number;
  rate: number;
  lower: number;
  upper: number;
  confidence: number;
}

interface TTestResult {
  algorithm: string;
  sample1: number[];
  sample2: number[];
  tStatistic: number;
  pValue: number;
  significant: boolean;
}

interface MonteCarloCLVResult {
  algorithm: string;
  params: Record<string, unknown>;
  simulations: number;
  meanCLV: number;
  medianCLV: number;
  percentiles: { p5: number; p25: number; p50: number; p75: number; p95: number };
}

interface AdstockResult {
  algorithm: string;
  spend: number[];
  adstocked: number[];
  decayRate: number;
  totalCarryover: number;
}

interface EfficientFrontierResult {
  algorithm: string;
  portfolios: { risk: number; return_: number; weights: number[] }[];
  optimalPortfolio: { risk: number; return_: number; sharpe: number; weights: number[] };
}

interface MediaSaturationResult {
  algorithm: string;
  spend: number[];
  response: number[];
  fitted: number[];
  saturationPoint: number;
  elasticity: number;
}

interface TimeDecayAttributionResult {
  algorithm: string;
  touchpoints: { channel: string; time: number }[];
  decayFactor: number;
  attributed: { channel: string; weight: number; share: string }[];
}

interface TopologicalSortResult {
  algorithm: string;
  order: string[];
  hasCycle: boolean;
}

interface KosarajuResult {
  algorithm: string;
  components: string[][];
  componentCount: number;
}

interface ArticulationResult {
  algorithm: string;
  articulationPoints: string[];
  bridges: [string, string][];
  nodes: number;
}

interface BipartiteMatchingResult {
  algorithm: string;
  matching: [string, string][];
  cardinality: number;
}

interface ZAlgorithmResult {
  algorithm: string;
  text: string;
  pattern: string;
  matches: number[];
  zArray: number[];
  comparisons: number;
}

interface LevenshteinResult {
  algorithm: string;
  distance: number;
  matrix: number[][];
  operations: { type: string; chars: string }[];
}

interface LISResult {
  algorithm: string;
  sequence: number[];
  length: number;
  subsequence: number[];
  comparisons: number;
}

interface BitmaskTSPResult {
  algorithm: string;
  distance: number;
  path: number[];
  nodes: number;
  statesExplored: number;
}

interface RegexMatchingResult {
  algorithm: string;
  text: string;
  pattern: string;
  matches: boolean;
  matchPositions: number[];
}

interface SegmentTreeLazyResult {
  type: string;
  size: number;
  operations: { type: string; range: [number, number]; value?: number; result?: number }[];
}

interface PriorityQueueResult {
  type: string;
  initial: number[];
  operations: { action: string; value?: number; result?: number; size: number }[];
}

interface HashMapChainingResult {
  type: string;
  capacity: number;
  loadFactor: string;
  operations: { action: string; key: string; value?: number; result?: number | null; collision?: boolean }[];
}

interface CircularBufferResult {
  type: string;
  capacity: number;
  elements: number[];
  operations: { action: string; value?: number; result?: number | number[] | null; head: number; tail: number }[];
}

// Phase 7 interfaces
interface CuckooFilterResult {
  type: string;
  size: number;
  operations: { action: string; item?: number; result?: boolean | number }[];
}
interface SuffixTreeSimResult {
  type: string;
  text: string;
  queries: { pattern: string; found: boolean; positions: number[] }[];
}
interface RTreeSpatialResult {
  type: string;
  operations: { action: string; point?: { x: number; y: number }; rect?: { x1: number; y1: number; x2: number; y2: number }; result?: any }[];
}
interface PersistentArrayResult {
  type: string;
  operations: { action: string; version?: number; index?: number; value?: number; result?: number | null }[];
}
interface MinMaxStackResult {
  type: string;
  operations: { action: string; value?: number; min?: number | null; max?: number | null; size: number }[];
}
interface DAryHeapResult {
  type: string;
  degree: number;
  operations: { action: string; value?: number; result?: number | null; size: number }[];
}
interface IntervalTreeDynamicResult {
  type: string;
  operations: { action: string; low?: number; high?: number; value?: string; point?: number; result?: any }[];
}
interface LongestPathDagResult {
  algorithm: string;
  nodes: string[];
  edges: { from: string; to: string; weight: number }[];
  longestPath: string[];
  maxDistance: number;
}
interface GraphColoringResult {
  algorithm: string;
  nodes: string[];
  colors: { node: string; color: number }[];
  chromaticNumber: number;
}
interface MinimumVertexCoverResult {
  algorithm: string;
  left: string[];
  right: string[];
  cover: string[];
  size: number;
}
interface HamiltonianPathResult {
  algorithm: string;
  nodes: string[];
  path: string[];
  found: boolean;
}
interface BaumWelchResult {
  algorithm: string;
  observations: number[];
  nStates: number;
  iterations: number;
  logLikelihood: number;
}
interface FordFulkersonResult {
  algorithm: string;
  nodes: string[];
  maxFlow: number;
  flowEdges: { from: string; to: string; flow: number; capacity: number }[];
}
interface KnuthMorrisPratt2DResult {
  algorithm: string;
  grid: number[][];
  pattern: number[][];
  matches: { row: number; col: number }[];
}
interface LongestRepeatedSubstringResult {
  algorithm: string;
  text: string;
  longestRepeated: string;
  length: number;
}
interface TextJustificationResult {
  algorithm: string;
  words: string[];
  maxWidth: number;
  lines: string[];
}
interface AffineGapEditResult {
  algorithm: string;
  a: string;
  b: string;
  distance: number;
  alignment: { a: string; b: string };
}
interface BoxStackingResult {
  algorithm: string;
  boxes: { w: number; d: number; h: number }[];
  maxHeight: number;
  sequence: number[];
}
interface LongestChainResult {
  algorithm: string;
  pairs: { a: number; b: number }[];
  longestChain: number;
  chain: number[];
}
interface MaxSumRectangleResult {
  algorithm: string;
  matrix: number[][];
  maxSum: number;
  rect: { top: number; left: number; bottom: number; right: number };
}
interface SegmentTreePersistentResult {
  type: string;
  operations: { action: string; version?: number; index?: number; value?: number; l?: number; r?: number; result?: number | null }[];
}
interface DsuPersistentRollbackResult {
  type: string;
  operations: { action: string; a?: number; b?: number; result?: boolean | number; version: number }[];
}
interface ScalableBloomFilterResult {
  type: string;
  operations: { action: string; item?: number; result?: boolean; capacity?: number; errorRate?: number }[];
}
interface LfuCacheAdvancedResult {
  type: string;
  capacity: number;
  operations: { action: string; key?: string; value?: number; result?: number | null; frequency?: number }[];
}
interface TreapOrderStatsResult {
  type: string;
  operations: { action: string; value?: number; k?: number; result?: number | null | boolean }[];
}
interface DoublyRobustATEResult {
  algorithm: string;
  treatment: number[];
  outcome: number[];
  propensity: number[];
  ate: number;
  se: number;
  ci95: { lower: number; upper: number };
}
interface LinUcbBanditResult {
  algorithm: string;
  arms: string[];
  selections: { arm: string; context: number[]; reward: number }[];
  armCounts: { arm: string; selections: number; totalReward: number }[];
}
interface OptimalBidShadingResult {
  algorithm: string;
  bid: number;
  marketCompetitiveness: number;
  optimalShadedBid: number;
  expectedSavings: number;
}
interface MultiTouchMarkovCompleteResult {
  algorithm: string;
  channels: string[];
  touchpoints: string[][];
  conversions: number[];
  attributions: { channel: string; removalEffect: number; share: string }[];
}
interface RoasPortfolioRiskResult {
  algorithm: string;
  channels: { name: string; roas: number; risk: number }[];
  allocations: { channel: string; weight: number }[];
  portfolioRoas: number;
  portfolioRisk: number;
}
interface BayesianCausalImpactResult {
  algorithm: string;
  target: number[];
  controls: number[][];
  impact: number;
  pValue: number;
  ci95: { lower: number; upper: number };
}
interface MultiPeriodBudgetResult {
  algorithm: string;
  periods: number;
  totalBudget: number;
  allocations: { period: number; channels: { name: string; amount: number }[]; expectedReturn: number }[];
  totalReturn: number;
}
interface AudienceLookalikeEnsembleResult {
  algorithm: string;
  seedSize: number;
  candidateSize: number;
  scored: { id: number; score: number }[];
  topCandidates: { id: number; score: number }[];
}
interface ChurnPredictionLogisticResult {
  algorithm: string;
  features: number[][];
  labels: number[];
  predictions: { actual: number; predicted: number; probability: number }[];
  accuracy: number;
  coefficients: number[];
}
interface KeywordBidPortfolioResult {
  algorithm: string;
  keywords: { term: string; conversions: number; cost: number; ctr: number }[];
  budget: number;
  bids: { term: string; optimalBid: number; expectedConversions: number; efficiency: number }[];
  expectedTotalConversions: number;
}

export class DSAlgorithmService {
  // ============ DATA STRUCTURES ============

  trieOperations(words: string[], prefixes: string[]): { insertions: number; searchResults: { word: string; found: boolean }[]; startsWithResults: { prefix: string; words: string[] }[]; totalWords: number } {
    const root: TrieNode = { children: new Map(), isEnd: false, count: 0 };
    for (const w of words) {
      let node = root;
      for (const ch of w) {
        if (!node.children.has(ch)) node.children.set(ch, { children: new Map(), isEnd: false, count: 0 });
        node = node.children.get(ch)!;
        node.count++;
      }
      node.isEnd = true;
    }
    const searchResults = prefixes.slice(0, 5).map((p) => {
      let node = root;
      for (const ch of p) { if (!node.children.has(ch)) return { word: p, found: false }; node = node.children.get(ch)!; }
      return { word: p, found: node.isEnd };
    });
    const startsWithResults = prefixes.slice(0, 3).map((p) => {
      let node = root;
      for (const ch of p) { if (!node.children.has(ch)) return { prefix: p, words: [] }; node = node.children.get(ch)!; }
      const wordsList: string[] = [];
      const dfs = (n: TrieNode, path: string) => {
        if (wordsList.length >= 5) return;
        if (n.isEnd) wordsList.push(p + path);
        for (const [ch, child] of n.children) dfs(child, path + ch);
      };
      dfs(node, "");
      return { prefix: p, words: wordsList };
    });
    return { insertions: words.length, searchResults, startsWithResults, totalWords: words.length };
  }

  fenwickTreeOperations(values: number[], queries: { type: "prefix" | "range"; l: number; r?: number }[]): FenwickTreeResult {
    const n = values.length;
    const bit = new Array(n + 1).fill(0);
    const add = (idx: number, delta: number) => { for (let i = idx; i <= n; i += i & -i) bit[i] += delta; };
    const sum = (idx: number) => { let s = 0; for (let i = idx; i > 0; i -= i & -i) s += bit[i]; return s; };
    values.forEach((v, i) => add(i + 1, v));
    const prefixSums: number[] = [];
    for (let i = 1; i <= n; i++) prefixSums.push(sum(i));
    const ops = queries.map((q) => {
      if (q.type === "prefix") return { query: [q.l], prefix: [sum(q.l)] };
      const rr = q.r!;
      return { query: [q.l, rr], prefix: [sum(rr) - sum(q.l - 1)] };
    });
    return { type: "fenwick", size: n, operations: ops };
  }

  segmentTreeOperations(values: number[], queries: { type: "min" | "max" | "sum"; l: number; r: number }[]): SegmentTreeResult {
    const n = values.length;
    const size = 4 * n;
    const tree = new Array(size).fill(0);
    const build = (idx: number, l: number, r: number) => {
      if (l === r) { tree[idx] = values[l]; return; }
      const mid = (l + r) >> 1;
      build(idx * 2, l, mid);
      build(idx * 2 + 1, mid + 1, r);
      tree[idx] = 0;
    };
    const t0 = Date.now();
    if (n > 0) build(1, 0, n - 1);
    const bt = Date.now() - t0;
    const ops = queries.map((q) => {
      let result = 0;
      const queryFn = (idx: number, l: number, r: number, ql: number, qr: number) => {
        if (ql > r || qr < l) return;
        if (ql <= l && r <= qr) { if (q.type === "sum") result += tree[idx]; else if (q.type === "min") result = Math.min(result, tree[idx] || Infinity); else result = Math.max(result, tree[idx]); return; }
        const mid = (l + r) >> 1;
        queryFn(idx * 2, l, mid, ql, qr);
        queryFn(idx * 2 + 1, mid + 1, r, ql, qr);
      };
      if (q.type === "min") result = Infinity;
      else if (q.type === "max") result = -Infinity;
      queryFn(1, 0, n - 1, q.l, q.r);
      return { type: q.type, range: [q.l, q.r], result };
    });
    return { type: "segment", size: n, buildTime: bt, operations: ops as { type: string; range: [number, number]; result: number }[] };
  }

  unionFindOperations(elements: string[], unions: [string, string][], queries: [string, string][]): UnionFindResult {
    const parent = new Map<string, string>();
    const rank = new Map<string, number>();
    for (const e of elements) { parent.set(e, e); rank.set(e, 0); }
    const find = (x: string): string => {
      if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!));
      return parent.get(x)!;
    };
    const union = (a: string, b: string) => {
      const ra = find(a), rb = find(b);
      if (ra === rb) return;
      const rka = rank.get(ra) || 0, rkb = rank.get(rb) || 0;
      if (rka < rkb) parent.set(ra, rb);
      else if (rka > rkb) parent.set(rb, ra);
      else { parent.set(rb, ra); rank.set(ra, rka + 1); }
    };
    const ops = queries.map(([a, b]) => {
      const before = find(a) === find(b);
      return { type: "query", a, b, connected: before };
    });
    for (const [a, b] of unions) union(a, b);
    const roots = new Map<string, string[]>();
    for (const e of elements) {
      const r = find(e);
      if (!roots.has(r)) roots.set(r, []);
      roots.get(r)!.push(e);
    }
    const sets = [...roots.entries()].map(([root, members]) => ({ root, members }));
    return { elements, sets, operations: ops };
  }

  bloomFilterOperations(items: string[], testItems: string[], falsePositiveRate: number = 0.01): { size: number; hashCount: number; inserted: number; testResults: { item: string; probablyPresent: boolean }[]; falsePositiveRate: number } {
    const m = Math.ceil(-(items.length * Math.log(falsePositiveRate)) / (Math.LN2 * Math.LN2));
    const k = Math.ceil((m / items.length) * Math.LN2);
    const bits = new Uint8Array(Math.ceil(m / 8));
    const hash = (s: string, seed: number) => {
      let h = seed;
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff;
      return h % m;
    };
    for (const item of items) {
      for (let i = 0; i < k; i++) {
        const idx = hash(item, i);
        bits[Math.floor(idx / 8)] |= 1 << (idx % 8);
      }
    }
    const testResults = testItems.map((item) => {
      let allSet = true;
      for (let i = 0; i < k; i++) {
        const idx = hash(item, i);
        if (!(bits[Math.floor(idx / 8)] & (1 << (idx % 8)))) { allSet = false; break; }
      }
      return { item, probablyPresent: allSet };
    });
    return { size: m, hashCount: k, inserted: items.length, testResults, falsePositiveRate };
  }

  minHeapOperations(values: number[], k: number): MinHeapResult {
    const heap: number[] = [];
    const swap = (i: number, j: number) => { [heap[i], heap[j]] = [heap[j], heap[i]]; };
    const push = (v: number) => {
      heap.push(v);
      let i = heap.length - 1;
      while (i > 0) { const p = (i - 1) >> 1; if (heap[p] <= heap[i]) break; swap(p, i); i = p; }
    };
    const pop = (): number | undefined => {
      if (heap.length === 0) return undefined;
      const top = heap[0];
      const last = heap.pop()!;
      if (heap.length > 0) {
        heap[0] = last;
        let i = 0;
        while (true) {
          let smallest = i;
          const l = 2 * i + 1, r = 2 * i + 2;
          if (l < heap.length && heap[l] < heap[smallest]) smallest = l;
          if (r < heap.length && heap[r] < heap[smallest]) smallest = r;
          if (smallest === i) break;
          swap(i, smallest); i = smallest;
        }
      }
      return top;
    };
    const ops: { action: string; value?: number; heapSize: number }[] = [];
    for (const v of values) { push(v); ops.push({ action: "push", value: v, heapSize: heap.length }); }
    const sorted: number[] = [];
    while (heap.length > 0) { const v = pop()!; sorted.push(v); ops.push({ action: "pop", value: v, heapSize: heap.length }); }
    const topK = sorted.slice(0, k);
    return { initial: values, sorted: topK, operations: ops };
  }

  lruCacheOperations(capacity: number, ops: { action: "get" | "put"; key: string; value?: number }[]): LRUCacheResult {
    const cache = new Map<string, number>();
    const opResults: { action: string; key: string; value?: number; evicted?: boolean }[] = [];
    for (const op of ops) {
      if (op.action === "get") {
        if (cache.has(op.key)) {
          const v = cache.get(op.key)!;
          cache.delete(op.key);
          cache.set(op.key, v);
          opResults.push({ action: "get", key: op.key, value: v });
        } else opResults.push({ action: "get", key: op.key });
      } else if (op.action === "put" && op.value !== undefined) {
        let evicted = false;
        if (cache.has(op.key)) cache.delete(op.key);
        else if (cache.size >= capacity) {
          const firstKey = cache.keys().next().value;
          if (firstKey !== undefined) { cache.delete(firstKey); evicted = true; }
        }
        cache.set(op.key, op.value);
        opResults.push({ action: "put", key: op.key, value: op.value, evicted });
      }
    }
    return { capacity, operations: opResults, finalState: [...cache.entries()].map(([k, v]) => ({ key: k, value: v })) };
  }

  // ============ SORTING & SELECTION ============

  quickSort(arr: number[]): SortResult {
    const a = [...arr];
    let comparisons = 0;
    const sort = (lo: number, hi: number) => {
      if (lo >= hi) return;
      const pivot = a[hi];
      let i = lo;
      for (let j = lo; j < hi; j++) { comparisons++; if (a[j] <= pivot) { [a[i], a[j]] = [a[j], a[i]]; i++; } }
      [a[i], a[hi]] = [a[hi], a[i]];
      sort(lo, i - 1);
      sort(i + 1, hi);
    };
    const t0 = Date.now();
    sort(0, a.length - 1);
    return { algorithm: "quickSort", input: arr, output: a, comparisons, timeMs: Date.now() - t0 };
  }

  mergeSort(arr: number[]): SortResult {
    const a = [...arr];
    let comparisons = 0;
    const merge = (lo: number, mid: number, hi: number) => {
      const left = a.slice(lo, mid + 1), right = a.slice(mid + 1, hi + 1);
      let i = 0, j = 0, k = lo;
      while (i < left.length && j < right.length) { comparisons++; a[k++] = left[i] <= right[j] ? left[i++] : right[j++]; }
      while (i < left.length) a[k++] = left[i++];
      while (j < right.length) a[k++] = right[j++];
    };
    const sort = (lo: number, hi: number) => {
      if (lo >= hi) return;
      const mid = (lo + hi) >> 1;
      sort(lo, mid);
      sort(mid + 1, hi);
      merge(lo, mid, hi);
    };
    const t0 = Date.now();
    sort(0, a.length - 1);
    return { algorithm: "mergeSort", input: arr, output: a, comparisons, timeMs: Date.now() - t0 };
  }

  quickSelect(arr: number[], k: number): { algorithm: string; input: number[]; k: number; value: number | null; comparisons: number } {
    const a = [...arr];
    let comparisons = 0;
    const select = (lo: number, hi: number, target: number): number | null => {
      if (lo === hi) return a[lo];
      const pivot = a[hi];
      let i = lo;
      for (let j = lo; j < hi; j++) { comparisons++; if (a[j] <= pivot) { [a[i], a[j]] = [a[j], a[i]]; i++; } }
      [a[i], a[hi]] = [a[hi], a[i]];
      if (target === i) return a[i];
      if (target < i) return select(lo, i - 1, target);
      return select(i + 1, hi, target);
    };
    const idx = k >= 1 && k <= a.length ? select(0, a.length - 1, a.length - k) : null;
    return { algorithm: "quickSelect", input: arr, k, value: idx, comparisons };
  }

  heapSort(arr: number[]): SortResult {
    const a = [...arr];
    let comparisons = 0;
    const heapify = (n: number, i: number) => {
      let largest = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n) { comparisons++; if (a[l] > a[largest]) largest = l; }
      if (r < n) { comparisons++; if (a[r] > a[largest]) largest = r; }
      if (largest !== i) { [a[i], a[largest]] = [a[largest], a[i]]; heapify(n, largest); }
    };
    const t0 = Date.now();
    for (let i = Math.floor(a.length / 2) - 1; i >= 0; i--) heapify(a.length, i);
    for (let i = a.length - 1; i > 0; i--) { [a[0], a[i]] = [a[i], a[0]]; heapify(i, 0); }
    return { algorithm: "heapSort", input: arr, output: a, comparisons, timeMs: Date.now() - t0 };
  }

  // ============ SEARCHING ============

  binarySearch(arr: number[], target: number): SearchResult {
    const sorted = [...arr].sort((a, b) => a - b);
    let lo = 0, hi = sorted.length - 1;
    let iterations = 0;
    while (lo <= hi) {
      iterations++;
      const mid = (lo + hi) >> 1;
      if (sorted[mid] === target) return { algorithm: "binarySearch", array: sorted, target, index: mid, found: true, iterations };
      if (sorted[mid] < target) lo = mid + 1;
      else hi = mid - 1;
    }
    return { algorithm: "binarySearch", array: sorted, target, index: -1, found: false, iterations };
  }

  ternarySearch(f: (x: number) => number, lo: number, hi: number, precision: number = 0.001): { algorithm: string; range: [number, number]; maximum: number; argmax: number; iterations: number } {
    let iterations = 0;
    while (hi - lo > precision) {
      iterations++;
      const m1 = lo + (hi - lo) / 3;
      const m2 = hi - (hi - lo) / 3;
      if (f(m1) < f(m2)) lo = m1;
      else hi = m2;
    }
    const argmax = (lo + hi) / 2;
    return { algorithm: "ternarySearch", range: [lo, hi], maximum: f(argmax), argmax, iterations };
  }

  // ============ GRAPH ALGORITHMS ============

  bfsTraverse(nodes: string[], edges: [string, string][], start: string): GraphResult {
    const adj = new Map<string, string[]>();
    for (const n of nodes) adj.set(n, []);
    for (const [a, b] of edges) { adj.get(a)?.push(b); adj.get(b)?.push(a); }
    const visited = new Set<string>();
    const queue = [start];
    const traversal: string[] = [];
    visited.add(start);
    while (queue.length > 0) {
      const node = queue.shift()!;
      traversal.push(node);
      for (const neighbor of adj.get(node) || []) {
        if (!visited.has(neighbor)) { visited.add(neighbor); queue.push(neighbor); }
      }
    }
    return { algorithm: "bfs", nodes, edges, traversal };
  }

  dfsTraverse(nodes: string[], edges: [string, string][], start: string): GraphResult {
    const adj = new Map<string, string[]>();
    for (const n of nodes) adj.set(n, []);
    for (const [a, b] of edges) { adj.get(a)?.push(b); adj.get(b)?.push(a); }
    const visited = new Set<string>();
    const traversal: string[] = [];
    const dfs = (node: string) => {
      visited.add(node);
      traversal.push(node);
      for (const neighbor of adj.get(node) || []) { if (!visited.has(neighbor)) dfs(neighbor); }
    };
    dfs(start);
    return { algorithm: "dfs", nodes, edges, traversal };
  }

  dijkstra(nodes: string[], edges: [string, string, number][], start: string, end?: string): GraphResult {
    const adj = new Map<string, [string, number][]>();
    for (const n of nodes) adj.set(n, []);
    for (const [a, b, w] of edges) { adj.get(a)?.push([b, w]); adj.get(b)?.push([a, w]); }
    const dist = new Map<string, number>();
    const prev = new Map<string, string | null>();
    const pq: [number, string][] = [];
    for (const n of nodes) { dist.set(n, Infinity); prev.set(n, null); }
    dist.set(start, 0);
    pq.push([0, start]);
    while (pq.length > 0) {
      pq.sort((a, b) => a[0] - b[0]);
      const [d, u] = pq.shift()!;
      if (d > (dist.get(u) ?? Infinity)) continue;
      if (u === end) break;
      for (const [v, w] of adj.get(u) || []) {
        const nd = d + w;
        if (nd < (dist.get(v) ?? Infinity)) { dist.set(v, nd); prev.set(v, u); pq.push([nd, v]); }
      }
    }
    const distances: Record<string, number> = {};
    for (const [k, v] of dist) distances[k] = v;
    let path: string[] = [];
    if (end && dist.get(end) !== Infinity) {
      let cur: string | null = end;
      while (cur) { path.unshift(cur); cur = prev.get(cur) ?? null; }
    }
    return { algorithm: "dijkstra", nodes, edges, traversal: [start, ...(end ? [end] : [])], distances, path };
  }

  topologicalSort(nodes: string[], edges: [string, string][]): GraphResult {
    const adj = new Map<string, string[]>();
    const inDeg = new Map<string, number>();
    for (const n of nodes) { adj.set(n, []); inDeg.set(n, 0); }
    for (const [a, b] of edges) { adj.get(a)?.push(b); inDeg.set(b, (inDeg.get(b) || 0) + 1); }
    const queue: string[] = [];
    for (const [n, d] of inDeg) if (d === 0) queue.push(n);
    const traversal: string[] = [];
    while (queue.length > 0) {
      const node = queue.shift()!;
      traversal.push(node);
      for (const neighbor of adj.get(node) || []) {
        inDeg.set(neighbor, (inDeg.get(neighbor) || 0) - 1);
        if (inDeg.get(neighbor) === 0) queue.push(neighbor);
      }
    }
    const hasCycle = traversal.length !== nodes.length;
    return { algorithm: "topologicalSort", nodes, edges, traversal, hasCycle };
  }

  detectCycle(nodes: string[], edges: [string, string][]): GraphResult {
    const adj = new Map<string, string[]>();
    for (const n of nodes) adj.set(n, []);
    for (const [a, b] of edges) adj.get(a)?.push(b);
    const white = new Set(nodes);
    const gray = new Set<string>();
    const black = new Set<string>();
    let hasCycle = false;
    const dfs = (node: string) => {
      white.delete(node);
      gray.add(node);
      for (const neighbor of adj.get(node) || []) {
        if (gray.has(neighbor)) { hasCycle = true; return; }
        if (white.has(neighbor)) dfs(neighbor);
      }
      gray.delete(node);
      black.add(node);
    };
    for (const n of [...white]) if (white.has(n)) dfs(n);
    return { algorithm: "detectCycle", nodes, edges, traversal: [...black], hasCycle };
  }

  // ============ STRING ALGORITHMS ============

  kmpSearch(text: string, pattern: string): StringMatchResult {
    if (pattern.length === 0) return { algorithm: "kmp", text, pattern, matches: [], comparisons: 0 };
    const lps = new Array(pattern.length).fill(0);
    let len = 0, i = 1;
    while (i < pattern.length) {
      if (pattern[i] === pattern[len]) { len++; lps[i] = len; i++; }
      else if (len > 0) len = lps[len - 1];
      else { lps[i] = 0; i++; }
    }
    const matches: number[] = [];
    let j = 0, comparisons = 0;
    for (let ti = 0; ti < text.length; ti++) {
      comparisons++;
      while (j > 0 && text[ti] !== pattern[j]) { j = lps[j - 1]; comparisons++; }
      if (text[ti] === pattern[j]) j++;
      if (j === pattern.length) { matches.push(ti - j + 1); j = lps[j - 1]; }
    }
    return { algorithm: "kmp", text, pattern, matches, comparisons };
  }

  rabinKarpSearch(text: string, pattern: string, prime: number = 101): StringMatchResult {
    if (pattern.length === 0 || pattern.length > text.length) return { algorithm: "rabinKarp", text, pattern, matches: [], comparisons: 0 };
    const d = 256;
    let pHash = 0, tHash = 0, h = 1;
    for (let i = 0; i < pattern.length - 1; i++) h = (h * d) % prime;
    for (let i = 0; i < pattern.length; i++) { pHash = (d * pHash + pattern.charCodeAt(i)) % prime; tHash = (d * tHash + text.charCodeAt(i)) % prime; }
    const matches: number[] = [];
    let comparisons = 0;
    for (let i = 0; i <= text.length - pattern.length; i++) {
      comparisons++;
      if (pHash === tHash) {
        let match = true;
        for (let j = 0; j < pattern.length; j++) { comparisons++; if (text[i + j] !== pattern[j]) { match = false; break; } }
        if (match) matches.push(i);
      }
      if (i < text.length - pattern.length) {
        tHash = (d * (tHash - text.charCodeAt(i) * h) + text.charCodeAt(i + pattern.length)) % prime;
        if (tHash < 0) tHash += prime;
      }
    }
    return { algorithm: "rabinKarp", text, pattern, matches, comparisons };
  }

  levenshteinDistance(a: string, b: string): { algorithm: string; a: string; b: string; distance: number; similarity: number; operations: string[] } {
    const m = a.length, n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
        else dp[i][j] = Math.min(dp[i - 1][j - 1], dp[i][j - 1], dp[i - 1][j]) + 1;
      }
    }
    const maxLen = Math.max(m, n);
    const similarity = maxLen > 0 ? Math.round((1 - dp[m][n] / maxLen) * 10000) / 100 : 100;
    const ops: string[] = [];
    let i = m, j = n;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) { ops.unshift(`keep '${a[i - 1]}'`); i--; j--; }
      else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) { ops.unshift(`replace '${a[i - 1]}' → '${b[j - 1]}'`); i--; j--; }
      else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) { ops.unshift(`delete '${a[i - 1]}'`); i--; }
      else { ops.unshift(`insert '${b[j - 1]}'`); j--; }
    }
    return { algorithm: "levenshtein", a, b, distance: dp[m][n], similarity, operations: ops.slice(0, 10) };
  }

  zAlgorithm(text: string, pattern: string): StringMatchResult {
    const concat = pattern + "$" + text;
    const n = concat.length;
    const z = new Array(n).fill(0);
    let l = 0, r = 0;
    for (let i = 1; i < n; i++) {
      if (i <= r) z[i] = Math.min(r - i + 1, z[i - l]);
      while (i + z[i] < n && concat[z[i]] === concat[i + z[i]]) z[i]++;
      if (i + z[i] - 1 > r) { l = i; r = i + z[i] - 1; }
    }
    const matches: number[] = [];
    const pl = pattern.length;
    for (let i = pl + 1; i < n; i++) if (z[i] >= pl) matches.push(i - pl - 1);
    return { algorithm: "zAlgorithm", text, pattern, matches, comparisons: n };
  }

  // ============ DYNAMIC PROGRAMMING ============

  knapSack01(capacity: number, items: { weight: number; value: number; name: string }[]): DPResult {
    const n = items.length;
    const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(capacity + 1).fill(0));
    for (let i = 1; i <= n; i++) {
      for (let w = 0; w <= capacity; w++) {
        if (items[i - 1].weight <= w) dp[i][w] = Math.max(dp[i - 1][w], dp[i - 1][w - items[i - 1].weight] + items[i - 1].value);
        else dp[i][w] = dp[i - 1][w];
      }
    }
    const selected: string[] = [];
    let w = capacity;
    for (let i = n; i > 0 && w > 0; i--) {
      if (dp[i][w] !== dp[i - 1][w]) { selected.push(items[i - 1].name); w -= items[i - 1].weight; }
    }
    return { algorithm: "knapSack01", input: { capacity, items: items.length }, output: { maxValue: dp[n][capacity], selected, totalWeight: items.filter((_, i) => selected.includes(items[i].name)).reduce((s, i) => s + i.weight, 0) }, table: dp };
  }

  longestCommonSubsequence(a: string, b: string): DPResult {
    const m = a.length, n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
        else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
    let lcs = "";
    let i = m, j = n;
    while (i > 0 && j > 0) {
      if (a[i - 1] === b[j - 1]) { lcs = a[i - 1] + lcs; i--; j--; }
      else if (dp[i - 1][j] > dp[i][j - 1]) i--;
      else j--;
    }
    return { algorithm: "lcs", input: { a, b }, output: { length: dp[m][n], sequence: lcs }, table: dp };
  }

  longestIncreasingSubsequence(arr: number[]): DPResult {
    const n = arr.length;
    if (n === 0) return { algorithm: "lis", input: { array: arr }, output: { length: 0, sequence: [] } };
    const dp = new Array(n).fill(1);
    const prev = new Array(n).fill(-1);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < i; j++) {
        if (arr[j] < arr[i] && dp[j] + 1 > dp[i]) { dp[i] = dp[j] + 1; prev[i] = j; }
      }
    }
    let maxIdx = 0;
    for (let i = 0; i < n; i++) if (dp[i] > dp[maxIdx]) maxIdx = i;
    const seq: number[] = [];
    let cur = maxIdx;
    while (cur >= 0) { seq.unshift(arr[cur]); cur = prev[cur]; }
    return { algorithm: "lis", input: { array: arr }, output: { length: dp[maxIdx], sequence: seq } };
  }

  coinChange(coins: number[], amount: number): DPResult {
    const dp = new Array(amount + 1).fill(Infinity);
    const used = new Array(amount + 1).fill(-1);
    dp[0] = 0;
    for (let i = 1; i <= amount; i++) {
      for (const coin of coins) {
        if (i >= coin && dp[i - coin] + 1 < dp[i]) { dp[i] = dp[i - coin] + 1; used[i] = coin; }
      }
    }
    const selected: number[] = [];
    let rem = amount;
    while (rem > 0 && used[rem] > 0) { selected.push(used[rem]); rem -= used[rem]; }
    return { algorithm: "coinChange", input: { coins, amount }, output: { minCoins: dp[amount] === Infinity ? -1 : dp[amount], coins: dp[amount] === Infinity ? [] : selected } };
  }

  maxSubarraySum(arr: number[]): DPResult {
    if (arr.length === 0) return { algorithm: "maxSubarray", input: { array: arr }, output: { maxSum: 0, subarray: [] } };
    let maxEnding = arr[0], maxSoFar = arr[0];
    let start = 0, end = 0, tempStart = 0;
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] > maxEnding + arr[i]) { maxEnding = arr[i]; tempStart = i; }
      else maxEnding = maxEnding + arr[i];
      if (maxEnding > maxSoFar) { maxSoFar = maxEnding; start = tempStart; end = i; }
    }
    return { algorithm: "maxSubarray", input: { array: arr }, output: { maxSum: maxSoFar, subarray: arr.slice(start, end + 1) } };
  }

  // ============ OPTIMIZATION ============

  convexHull(points: { x: number; y: number }[]): { algorithm: string; points: { x: number; y: number }[]; hull: { x: number; y: number }[]; area: number } {
    if (points.length < 3) return { algorithm: "convexHull", points, hull: [...points], area: 0 };
    const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
    const cross = (o: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lower: typeof points = [];
    for (const p of sorted) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
    const upper: typeof points = [];
    for (const p of sorted.reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
    lower.pop(); upper.pop();
    const hull = [...lower, ...upper];
    let area = 0;
    for (let i = 0; i < hull.length; i++) {
      const j = (i + 1) % hull.length;
      area += hull[i].x * hull[j].y - hull[j].x * hull[i].y;
    }
    area = Math.abs(area) / 2;
    return { algorithm: "convexHull", points, hull, area: Math.round(area * 100) / 100 };
  }

  kClosestPoints(points: { x: number; y: number }[], k: number, target: { x: number; y: number }): { algorithm: string; points: { x: number; y: number }[]; k: number; target: { x: number; y: number }; closest: { x: number; y: number; distance: number }[] } {
    const withDist = points.map((p) => ({ ...p, distance: Math.sqrt((p.x - target.x) ** 2 + (p.y - target.y) ** 2) }));
    withDist.sort((a, b) => a.distance - b.distance);
    const closest = withDist.slice(0, Math.min(k, withDist.length));
    return { algorithm: "kClosest", points, k, target, closest };
  }

  // ============ DEEP ENHANCEMENT: ADVANCED DATA STRUCTURES ============

  avlTreeOperations(ops: { action: "insert" | "delete" | "search"; key: number; value?: string }[]): { type: string; operations: { action: string; key: number; found?: boolean; treeHeight?: number; treeSize?: number }[]; finalKeys: number[] } {
    let root: AVLNode | null = null;
    const height = (n: AVLNode | null): number => n ? n.height : 0;
    const rotR = (y: AVLNode): AVLNode => { const x = y.left!; y.left = x.right; x.right = y; y.height = Math.max(height(y.left), height(y.right)) + 1; x.height = Math.max(height(x.left), height(x.right)) + 1; return x; };
    const rotL = (x: AVLNode): AVLNode => { const y = x.right!; x.right = y.left; y.left = x; x.height = Math.max(height(x.left), height(x.right)) + 1; y.height = Math.max(height(y.left), height(y.right)) + 1; return y; };
    const ins = (node: AVLNode | null, key: number, val?: string): AVLNode => {
      if (!node) return { key, left: null, right: null, height: 1, value: val };
      if (key < node.key) node.left = ins(node.left, key, val);
      else if (key > node.key) node.right = ins(node.right, key, val);
      else { node.value = val || node.value; return node; }
      node.height = Math.max(height(node.left), height(node.right)) + 1;
      const bf = height(node.left) - height(node.right);
      if (bf > 1 && key < node.left!.key) return rotR(node);
      if (bf < -1 && key > node.right!.key) return rotL(node);
      if (bf > 1 && key > node.left!.key) { node.left = rotL(node.left!); return rotR(node); }
      if (bf < -1 && key < node.right!.key) { node.right = rotR(node.right!); return rotL(node); }
      return node;
    };
    const minNode = (n: AVLNode): AVLNode => n.left ? minNode(n.left) : n;
    const del = (node: AVLNode | null, key: number): AVLNode | null => {
      if (!node) return null;
      if (key < node.key) node.left = del(node.left, key);
      else if (key > node.key) node.right = del(node.right, key);
      else {
        if (!node.left) return node.right;
        if (!node.right) return node.left;
        const succ = minNode(node.right);
        node.key = succ.key; node.value = succ.value;
        node.right = del(node.right, succ.key);
      }
      if (!node) return node;
      node.height = Math.max(height(node.left), height(node.right)) + 1;
      const bf = height(node.left) - height(node.right);
      if (bf > 1 && (height(node.left!.left) - height(node.left!.right)) >= 0) return rotR(node);
      if (bf > 1) { node.left = rotL(node.left!); return rotR(node); }
      if (bf < -1 && (height(node.right!.right) - height(node.right!.left)) >= 0) return rotL(node);
      if (bf < -1) { node.right = rotR(node.right!); return rotL(node); }
      return node;
    };
    const search = (node: AVLNode | null, key: number): boolean => { while (node) { if (key === node.key) return true; node = key < node.key ? node.left : node.right; } return false; };
    const inorder = (node: AVLNode | null, acc: number[]) => { if (!node) return; inorder(node.left, acc); acc.push(node.key); inorder(node.right, acc); };
    const opResults: { action: string; key: number; found?: boolean; treeHeight?: number; treeSize?: number }[] = [];
    for (const op of ops) {
      if (op.action === "insert") { root = ins(root, op.key, op.value); const h = root ? root.height : 0; let size = 0; inorder(root, (size = 0, [])); const keys: number[] = []; inorder(root, keys); opResults.push({ action: "insert", key: op.key, treeHeight: h, treeSize: keys.length }); }
      else if (op.action === "delete") { root = del(root, op.key); const h = root ? root.height : 0; const keys: number[] = []; inorder(root, keys); opResults.push({ action: "delete", key: op.key, treeHeight: h, treeSize: keys.length }); }
      else if (op.action === "search") { const found = search(root, op.key); opResults.push({ action: "search", key: op.key, found }); }
    }
    const finalKeys: number[] = [];
    inorder(root, finalKeys);
    return { type: "avl", operations: opResults, finalKeys };
  }

  dequeSlidingWindow(values: number[], windowSize: number): DequeResult {
    const ops: { action: string; value?: number; result?: number | number[] }[] = [];
    const maxDeque: number[] = [];
    const minDeque: number[] = [];
    const maxResult: number[] = [];
    const minResult: number[] = [];
    for (let i = 0; i < values.length; i++) {
      while (maxDeque.length > 0 && maxDeque[maxDeque.length - 1] < i - windowSize + 1) maxDeque.pop();
      while (maxDeque.length > 0 && values[maxDeque[maxDeque.length - 1]] <= values[i]) maxDeque.pop();
      maxDeque.push(i);
      while (minDeque.length > 0 && minDeque[minDeque.length - 1] < i - windowSize + 1) minDeque.pop();
      while (minDeque.length > 0 && values[minDeque[minDeque.length - 1]] >= values[i]) minDeque.pop();
      minDeque.push(i);
      if (i >= windowSize - 1) { maxResult.push(values[maxDeque[0]]); minResult.push(values[minDeque[0]]); }
      ops.push({ action: "slide", value: values[i], result: i >= windowSize - 1 ? [values[maxDeque[0]], values[minDeque[0]]] : undefined });
    }
    return { type: "dequeSlidingWindow", initial: values, operations: ops };
  }

  sparseTableRangeQueries(values: number[], queries: { l: number; r: number; type: "min" | "max" | "gcd" | "lcm" }[]): SparseTableResult {
    const n = values.length;
    if (n === 0) return { type: "sparseTable", size: 0, operations: [] };
    const k = Math.floor(Math.log2(n)) + 1;
    const gcd = (a: number, b: number): number => b === 0 ? Math.abs(a) : gcd(b, a % b);
    const lcm = (a: number, b: number): number => a === 0 || b === 0 ? 0 : Math.abs(a * b) / gcd(a, b);
    const st: number[][] = Array.from({ length: k }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) st[0][i] = values[i];
    for (let j = 1; j < k; j++) {
      for (let i = 0; i + (1 << j) <= n; i++) {
        const prev = st[j - 1];
        if (prev[i] <= prev[i + (1 << (j - 1))]) st[j][i] = prev[i]; else st[j][i] = prev[i + (1 << (j - 1))];
      }
    }
    const ops = queries.map((q) => {
      const len = q.r - q.l + 1;
      const j = Math.floor(Math.log2(len));
      let result = 0;
      if (q.type === "min") result = Math.min(st[j][q.l], st[j][q.r - (1 << j) + 1]);
      else if (q.type === "max") result = Math.max(st[j][q.l], st[j][q.r - (1 << j) + 1]);
      else if (q.type === "gcd") { let g = 0; for (let i = q.l; i <= q.r; i++) g = gcd(g, values[i]); result = g; }
      else if (q.type === "lcm") { let l = 1; for (let i = q.l; i <= q.r; i++) l = lcm(l, values[i]); result = l; }
      return { l: q.l, r: q.r, result };
    });
    return { type: "sparseTable", size: n, operations: ops };
  }

  countingBloomFilter(items: { item: string; action: "add" | "remove" | "test" }[], falsePositiveRate: number = 0.01): CountingBloomResult {
    const m = Math.ceil(-(items.filter(i => i.action === "add").length * Math.log(falsePositiveRate)) / (Math.LN2 * Math.LN2)) || 64;
    const k = Math.ceil((m / Math.max(items.filter(i => i.action === "add").length, 1)) * Math.LN2) || 4;
    const counters = new Array(m).fill(0);
    const hash = (s: string, seed: number) => { let h = seed; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff; return h % m; };
    const ops: { action: string; item: string; count?: number; probablyPresent?: boolean }[] = [];
    for (const { item, action } of items) {
      if (action === "add") { for (let i = 0; i < k; i++) counters[hash(item, i)]++; ops.push({ action: "add", item, count: counters[hash(item, 0)] }); }
      else if (action === "remove") { let allPositive = true; for (let i = 0; i < k; i++) { if (counters[hash(item, i)] <= 0) allPositive = false; else counters[hash(item, i)]--; } ops.push({ action: "remove", item, count: counters[hash(item, 0)] }); }
      else if (action === "test") { let allSet = true; for (let i = 0; i < k; i++) { if (counters[hash(item, i)] <= 0) { allSet = false; break; } } ops.push({ action: "test", item, probablyPresent: allSet }); }
    }
    return { size: m, hashCount: k, counters, operations: ops };
  }

  priorityQueueDecreaseKey(ops: { action: "push" | "pop" | "decrease-key"; key?: string; priority?: number }[]): { type: string; operations: { action: string; key?: string; priority?: number; heapSize: number }[]; finalHeap: { key: string; priority: number }[] } {
    const heap: { key: string; priority: number }[] = [];
    const map = new Map<string, number>();
    const swap = (i: number, j: number) => { const tmp = heap[i]; heap[i] = heap[j]; heap[j] = tmp; map.set(heap[i].key, i); map.set(heap[j].key, j); };
    const push = (key: string, priority: number) => { heap.push({ key, priority }); let i = heap.length - 1; map.set(key, i); while (i > 0) { const p = (i - 1) >> 1; if (heap[p].priority <= heap[i].priority) break; swap(p, i); i = p; } };
    const pop = (): { key: string; priority: number } | undefined => {
      if (heap.length === 0) return undefined;
      const top = heap[0]; map.delete(top.key);
      const last = heap.pop()!;
      if (heap.length > 0) { heap[0] = last; map.set(last.key, 0); let i = 0;
        while (true) { let smallest = i; const l = 2 * i + 1, r = 2 * i + 2; if (l < heap.length && heap[l].priority < heap[smallest].priority) smallest = l; if (r < heap.length && heap[r].priority < heap[smallest].priority) smallest = r; if (smallest === i) break; swap(i, smallest); i = smallest; }
      }
      return top;
    };
    const opResults: { action: string; key?: string; priority?: number; heapSize: number }[] = [];
    for (const op of ops) {
      if (op.action === "push" && op.key !== undefined && op.priority !== undefined) { push(op.key, op.priority); opResults.push({ action: "push", key: op.key, priority: op.priority, heapSize: heap.length }); }
      else if (op.action === "pop") { const item = pop(); opResults.push({ action: "pop", key: item?.key, priority: item?.priority, heapSize: heap.length }); }
      else if (op.action === "decrease-key" && op.key !== undefined && op.priority !== undefined) { const idx = map.get(op.key); if (idx !== undefined && op.priority < heap[idx].priority) { heap[idx].priority = op.priority; let i = idx; while (i > 0) { const p = (i - 1) >> 1; if (heap[p].priority <= heap[i].priority) break; swap(p, i); i = p; } } opResults.push({ action: "decrease-key", key: op.key, priority: op.priority, heapSize: heap.length }); }
    }
    return { type: "decreaseKeyPQ", operations: opResults, finalHeap: heap };
  }

  rollbackDsuOperations(ops: { action: "union" | "query"; a: string; b: string }[]): { type: string; operations: { action: string; a: string; b: string; result?: boolean | string; snapshotSize?: number }[]; finalSets: number } {
    const parent = new Map<string, string>();
    const rank = new Map<string, number>();
    const history: { a: string; b: string; ra: string; rb: string; merged: boolean }[] = [];
    const find = (x: string): string => { if (parent.get(x) !== x) return find(parent.get(x)!); return parent.get(x)!; };
    const opResults: { action: string; a: string; b: string; result?: boolean | string; snapshotSize?: number }[] = [];
    let snapshotCount = 0;
    for (const op of ops) {
      if (op.action === "union") {
        if (!parent.has(op.a)) { parent.set(op.a, op.a); rank.set(op.a, 0); }
        if (!parent.has(op.b)) { parent.set(op.b, op.b); rank.set(op.b, 0); }
        const ra = find(op.a), rb = find(op.b);
        const merged = ra !== rb;
        if (merged) {
          if ((rank.get(ra) || 0) < (rank.get(rb) || 0)) { parent.set(ra, rb); } else if ((rank.get(ra) || 0) > (rank.get(rb) || 0)) { parent.set(rb, ra); } else { parent.set(rb, ra); rank.set(ra, (rank.get(ra) || 0) + 1); }
        }
        history.push({ a: op.a, b: op.b, ra, rb, merged });
        snapshotCount++;
        opResults.push({ action: "union", a: op.a, b: op.b, result: merged ? "merged" : "already-connected", snapshotSize: snapshotCount });
      } else if (op.action === "query") {
        if (!parent.has(op.a) || !parent.has(op.b)) opResults.push({ action: "query", a: op.a, b: op.b, result: false });
        else opResults.push({ action: "query", a: op.a, b: op.b, result: find(op.a) === find(op.b) });
      }
    }
    const roots = new Set<string>(); for (const [k] of parent) roots.add(find(k));
    return { type: "rollbackDsu", operations: opResults, finalSets: roots.size };
  }

  // ============ DEEP ENHANCEMENT: ADVANCED GRAPH ============

  bellmanFord(nodes: string[], edges: [string, string, number][], start: string): { algorithm: string; nodes: string[]; start: string; distances: Record<string, number>; hasNegativeCycle: boolean; path: Record<string, string | null> } {
    const dist = new Map<string, number>();
    const prev = new Map<string, string | null>();
    for (const n of nodes) { dist.set(n, Infinity); prev.set(n, null); }
    dist.set(start, 0);
    for (let i = 0; i < nodes.length - 1; i++) {
      for (const [u, v, w] of edges) {
        const du = dist.get(u) ?? Infinity;
        if (du !== Infinity && du + w < (dist.get(v) ?? Infinity)) { dist.set(v, du + w); prev.set(v, u); }
      }
    }
    let hasNegativeCycle = false;
    for (const [u, v, w] of edges) {
      const du = dist.get(u) ?? Infinity;
      if (du !== Infinity && du + w < (dist.get(v) ?? Infinity)) { hasNegativeCycle = true; break; }
    }
    const distances: Record<string, number> = {};
    for (const [k, v] of dist) distances[k] = v;
    const path: Record<string, string | null> = {};
    for (const [k, v] of prev) path[k] = v;
    return { algorithm: "bellmanFord", nodes, start, distances, hasNegativeCycle, path };
  }

  floydWarshall(nodes: string[], edges: [string, string, number][]): { algorithm: string; nodes: string[]; distances: number[][]; next: number[][]; hasNegativeCycle: boolean } {
    const n = nodes.length;
    const idx = new Map<string, number>();
    nodes.forEach((v, i) => idx.set(v, i));
    const dist: number[][] = Array.from({ length: n }, () => new Array(n).fill(Infinity));
    const nxt: number[][] = Array.from({ length: n }, () => new Array(n).fill(-1));
    for (let i = 0; i < n; i++) { dist[i][i] = 0; nxt[i][i] = i; }
    for (const [u, v, w] of edges) { const i = idx.get(u)!, j = idx.get(v)!; if (w < dist[i][j]) { dist[i][j] = w; nxt[i][j] = j; } }
    for (let k = 0; k < n; k++) {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (dist[i][k] !== Infinity && dist[k][j] !== Infinity && dist[i][k] + dist[k][j] < dist[i][j]) { dist[i][j] = dist[i][k] + dist[k][j]; nxt[i][j] = nxt[i][k]; }
        }
      }
    }
    let hasNegativeCycle = false;
    for (let i = 0; i < n; i++) if (dist[i][i] < 0) { hasNegativeCycle = true; break; }
    return { algorithm: "floydWarshall", nodes, distances: dist, next: nxt, hasNegativeCycle };
  }

  kruskalMst(nodes: string[], edges: [string, string, number][]): { algorithm: string; mstEdges: [string, string, number][]; totalWeight: number; edgesConsidered: number } {
    const sorted = [...edges].sort((a, b) => a[2] - b[2]);
    const parent = new Map<string, string>();
    const find = (x: string): string => { if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!)); return parent.get(x)!; };
    const union = (a: string, b: string) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); };
    for (const n of nodes) parent.set(n, n);
    const mstEdges: [string, string, number][] = [];
    let totalWeight = 0, considered = 0;
    for (const [u, v, w] of sorted) {
      considered++;
      if (find(u) !== find(v)) { union(u, v); mstEdges.push([u, v, w]); totalWeight += w; }
    }
    return { algorithm: "kruskalMst", mstEdges, totalWeight, edgesConsidered: considered };
  }

  maxFlowEdmondsKarp(nodes: string[], edges: [string, string, number][], source: string, sink: string): MaxFlowResult {
    const adj = new Map<string, { v: string; rev: number }[]>();
    const cap = new Map<string, Map<string, number>>();
    for (const n of nodes) { adj.set(n, []); cap.set(n, new Map()); }
    for (const [u, v, c] of edges) {
      adj.get(u)!.push({ v, rev: adj.get(v)!.length });
      adj.get(v)!.push({ v: u, rev: adj.get(u)!.length - 1 });
      cap.get(u)!.set(v, (cap.get(u)!.get(v) || 0) + c);
      cap.get(v)!.set(u, (cap.get(v)!.get(u) || 0));
    }
    const flow = new Map<string, Map<string, number>>();
    for (const n of nodes) flow.set(n, new Map());
    let maxFlow = 0;
    const flowEdges: { from: string; to: string; flow: number; capacity: number }[] = [];
    while (true) {
      const parent = new Map<string, string | null>();
      const parentEdge = new Map<string, string>();
      const queue: string[] = [source];
      parent.set(source, null);
      let found = false;
      while (queue.length > 0 && !found) {
        const u = queue.shift()!;
        for (const { v } of adj.get(u) || []) {
          if (!parent.has(v) && (cap.get(u)?.get(v) || 0) > 0) { parent.set(v, u); parentEdge.set(v, u); if (v === sink) { found = true; break; } queue.push(v); }
        }
      }
      if (!found) break;
      let addFlow = Infinity;
      let cur = sink;
      while (cur !== source) {
        const p = parent.get(cur)!;
        addFlow = Math.min(addFlow, cap.get(p)?.get(cur) || 0);
        cur = p;
      }
      cur = sink;
      while (cur !== source) {
        const p = parent.get(cur)!;
        cap.get(p)!.set(cur, (cap.get(p)!.get(cur) || 0) - addFlow);
        cap.get(cur)!.set(p, (cap.get(cur)!.get(p) || 0) + addFlow);
        cur = p;
      }
      maxFlow += addFlow;
    }
    for (const [u, v, c] of edges) {
      const f = c - (cap.get(u)?.get(v) || 0);
      if (f > 0) flowEdges.push({ from: u, to: v, flow: f, capacity: c });
    }
    return { algorithm: "edmondsKarp", source, sink, maxFlow, flowEdges };
  }

  aStarSearch(nodes: string[], edges: [string, string, number][], start: string, goal: string, heuristic: Record<string, number>): { algorithm: string; path: string[]; cost: number; nodesExplored: number; openSetSize: number } {
    const adj = new Map<string, [string, number][]>();
    for (const n of nodes) adj.set(n, []);
    for (const [a, b, w] of edges) { adj.get(a)?.push([b, w]); adj.get(b)?.push([a, w]); }
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();
    const prev = new Map<string, string | null>();
    const open = new Set<string>([start]);
    const closed = new Set<string>();
    for (const n of nodes) { gScore.set(n, Infinity); fScore.set(n, Infinity); prev.set(n, null); }
    gScore.set(start, 0);
    fScore.set(start, heuristic[start] || 0);
    let nodesExplored = 0;
    while (open.size > 0) {
      let current = "";
      let minF = Infinity;
      for (const n of open) { const f = fScore.get(n) ?? Infinity; if (f < minF) { minF = f; current = n; } }
      if (current === goal) {
        const path: string[] = []; let cur: string | null = goal;
        while (cur) { path.unshift(cur); cur = prev.get(cur) ?? null; }
        return { algorithm: "aStar", path, cost: gScore.get(goal) ?? 0, nodesExplored, openSetSize: open.size };
      }
      open.delete(current);
      closed.add(current);
      nodesExplored++;
      for (const [neighbor, weight] of adj.get(current) || []) {
        if (closed.has(neighbor)) continue;
        const tentativeG = (gScore.get(current) ?? Infinity) + weight;
        if (tentativeG < (gScore.get(neighbor) ?? Infinity)) {
          prev.set(neighbor, current);
          gScore.set(neighbor, tentativeG);
          fScore.set(neighbor, tentativeG + (heuristic[neighbor] || 0));
          open.add(neighbor);
        }
      }
    }
    return { algorithm: "aStar", path: [], cost: Infinity, nodesExplored, openSetSize: 0 };
  }

  tarjanScc(nodes: string[], edges: [string, string][]): TarjanSCCResult {
    const adj = new Map<string, string[]>();
    for (const n of nodes) adj.set(n, []);
    for (const [a, b] of edges) adj.get(a)?.push(b);
    let index = 0;
    const idx = new Map<string, number>();
    const low = new Map<string, number>();
    const stack: string[] = [];
    const onStack = new Set<string>();
    const components: string[][] = [];
    const strongconnect = (v: string) => {
      idx.set(v, index); low.set(v, index); index++;
      stack.push(v); onStack.add(v);
      for (const w of adj.get(v) || []) {
        if (!idx.has(w)) { strongconnect(w); low.set(v, Math.min(low.get(v) ?? Infinity, low.get(w) ?? Infinity)); }
        else if (onStack.has(w)) low.set(v, Math.min(low.get(v) ?? Infinity, idx.get(w) ?? Infinity));
      }
      if (low.get(v) === idx.get(v)) {
        const comp: string[] = [];
        while (true) { const w = stack.pop()!; onStack.delete(w); comp.push(w); if (w === v) break; }
        components.push(comp);
      }
    };
    for (const n of nodes) if (!idx.has(n)) strongconnect(n);
    return { algorithm: "tarjanScc", sccCount: components.length, components };
  }

  // ============ DEEP ENHANCEMENT: STRING / DP ============

  manacherLongestPalindrome(text: string): ManacherResult {
    const t = "^#" + text.split("").join("#") + "#$";
    const p = new Array(t.length).fill(0);
    let c = 0, r = 0;
    for (let i = 1; i < t.length - 1; i++) {
      const mir = 2 * c - i;
      if (i < r) p[i] = Math.min(r - i, p[mir]);
      while (t[i + p[i] + 1] === t[i - p[i] - 1]) p[i]++;
      if (i + p[i] > r) { c = i; r = i + p[i]; }
    }
    let maxLen = 0, center = 0;
    for (let i = 1; i < t.length - 1; i++) { if (p[i] > maxLen) { maxLen = p[i]; center = i; } }
    const start = (center - maxLen) / 2;
    const longestPalindrome = text.substring(start, start + maxLen);
    const centers = p.slice(1, t.length - 1).filter(v => v > 0);
    return { algorithm: "manacher", text, centers, longestPalindrome, length: maxLen };
  }

  suffixArrayLcp(text: string): SuffixArrayResult {
    const n = text.length;
    const suffixes: { idx: number; suffix: string }[] = [];
    for (let i = 0; i < n; i++) suffixes.push({ idx: i, suffix: text.substring(i) });
    suffixes.sort((a, b) => a.suffix.localeCompare(b.suffix));
    const suffixArray = suffixes.map(s => s.idx);
    const rank = new Array(n).fill(0);
    for (let i = 0; i < n; i++) rank[suffixArray[i]] = i;
    const lcp = new Array(n - 1).fill(0);
    let k = 0;
    for (let i = 0; i < n; i++) {
      if (rank[i] === n - 1) { k = 0; continue; }
      let j = suffixArray[rank[i] + 1];
      while (i + k < n && j + k < n && text[i + k] === text[j + k]) k++;
      lcp[rank[i]] = k;
      if (k > 0) k--;
    }
    const totalSubstrings = n * (n + 1) / 2;
    const lcpSum = lcp.reduce((a, b) => a + b, 0);
    return { algorithm: "suffixArrayLcp", text, suffixArray, lcpArray: lcp, uniqueSubstrings: totalSubstrings - lcpSum };
  }

  matrixChainMultiplication(dimensions: number[]): { algorithm: string; input: number[]; output: { minOps: number; order: string } } {
    const n = dimensions.length - 1;
    const dp: number[][] = Array.from({ length: n }, () => new Array(n).fill(Infinity));
    const bracket: string[][] = Array.from({ length: n }, () => new Array(n).fill(""));
    for (let i = 0; i < n; i++) dp[i][i] = 0;
    for (let len = 2; len <= n; len++) {
      for (let i = 0; i < n - len + 1; i++) {
        const j = i + len - 1;
        for (let k = i; k < j; k++) {
          const cost = dp[i][k] + dp[k + 1][j] + dimensions[i] * dimensions[k + 1] * dimensions[j + 1];
          if (cost < dp[i][j]) { dp[i][j] = cost; bracket[i][j] = String.fromCharCode(65 + k); }
        }
      }
    }
    return { algorithm: "matrixChain", input: dimensions, output: { minOps: dp[0][n - 1] === Infinity ? 0 : dp[0][n - 1], order: bracket[0][n - 1] || "A1" } };
  }

  editDistanceFull(a: string, b: string): { algorithm: string; distance: number; alignment: { a: string; b: string; op: string }[] } {
    const m = a.length, n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
      else dp[i][j] = Math.min(dp[i - 1][j - 1], dp[i][j - 1], dp[i - 1][j]) + 1;
    }
    const alignment: { a: string; b: string; op: string }[] = [];
    let i = m, j = n;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) { alignment.unshift({ a: a[i - 1], b: b[j - 1], op: "match" }); i--; j--; }
      else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) { alignment.unshift({ a: a[i - 1], b: b[j - 1], op: "replace" }); i--; j--; }
      else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) { alignment.unshift({ a: a[i - 1], b: "-", op: "delete" }); i--; }
      else if (j > 0) { alignment.unshift({ a: "-", b: b[j - 1], op: "insert" }); j--; }
    }
    return { algorithm: "editDistanceFull", distance: dp[m][n], alignment };
  }

  // ============ DEEP ENHANCEMENT: MARKETING-SPECIFIC ============

  pidBudgetPacing(currentSpend: number, targetSpend: number, history: { spend: number[]; kp: number; ki: number; kd: number }): { algorithm: string; output: { pTerm: number; iTerm: number; dTerm: number; adjustment: number; pacingRate: number }; history: { error: number; p: number; i: number; d: number }[] } {
    const { spend, kp, ki, kd } = history;
    const error = targetSpend - currentSpend;
    let integral = 0;
    const n = spend.length;
    for (let i = 0; i < n; i++) integral += (targetSpend - spend[i]);
    const derivative = n >= 2 ? spend[n - 1] - spend[n - 2] : 0;
    const pTerm = kp * error;
    const iTerm = ki * integral;
    const dTerm = kd * derivative;
    const adjustment = pTerm + iTerm + dTerm;
    const pacingRate = targetSpend > 0 ? Math.max(0, Math.min(2, (currentSpend + adjustment) / targetSpend)) : 1;
    const hist = spend.map((s, idx) => {
      const e = targetSpend - s;
      let acc = 0; for (let k = 0; k <= idx; k++) acc += (targetSpend - spend[k]);
      const d = idx >= 1 ? spend[idx] - spend[idx - 1] : 0;
      return { error: Math.round(e * 100) / 100, p: Math.round(kp * e * 100) / 100, i: Math.round(ki * acc * 100) / 100, d: Math.round(kd * d * 100) / 100 };
    });
    return { algorithm: "pidBudgetPacing", output: { pTerm: Math.round(pTerm * 100) / 100, iTerm: Math.round(iTerm * 100) / 100, dTerm: Math.round(dTerm * 100) / 100, adjustment: Math.round(adjustment * 100) / 100, pacingRate: Math.round(pacingRate * 1000) / 1000 }, history: hist };
  }

  shapleyValueAttribution(channels: string[], conversions: { channel: string; value: number; interactions: string[] }[]): { algorithm: string; output: Record<string, number>; totalValue: number; channelCount: number } {
    const n = channels.length;
    const contributions: Record<string, number> = {};
    for (const ch of channels) contributions[ch] = 0;
    for (const conv of conversions) {
      const chSet = new Set(conv.interactions);
      for (const ch of channels) {
        if (!chSet.has(ch)) continue;
        const relevant = conv.interactions.filter(i => i !== ch);
        const m = relevant.length;
        for (let k = 0; k < (1 << m); k++) {
          const subset: string[] = [];
          for (let j = 0; j < m; j++) if (k & (1 << j)) subset.push(relevant[j]);
          const weight = subset.length;
          const marg = conv.value;
          const coeff = (weight * (n - weight - 1)) / (n * factorial(n));
          contributions[ch] += marg * coeff;
        }
      }
    }
    for (const ch of channels) contributions[ch] = Math.round(contributions[ch] * 10000) / 10000;
    const totalValue = conversions.reduce((s, c) => s + c.value, 0);
    return { algorithm: "shapleyValue", output: contributions, totalValue, channelCount: channels.length };
  }

  minCostFlowAllocation(budget: number, nodes: string[], edges: [string, string, number, number][]): { algorithm: string; output: { allocations: { from: string; to: string; flow: number; cost: number }[]; totalCost: number; utilizedBudget: number }; source: string; sink: string } {
    const source = "SUPPLY_" + nodes[0];
    const sink = "DEMAND_" + nodes[nodes.length - 1];
    const allNodes = [source, ...nodes, sink];
    const adj = new Map<string, { to: string; rev: number }[]>();
    const cap = new Map<string, Map<string, number>>();
    const cost = new Map<string, Map<string, number>>();
    for (const n of allNodes) { adj.set(n, []); cap.set(n, new Map()); cost.set(n, new Map()); }
    adj.get(source)!.push({ to: nodes[0], rev: 0 });
    cap.get(source)!.set(nodes[0], budget);
    cost.get(source)!.set(nodes[0], 0);
    adj.get(nodes[0])!.push({ to: source, rev: 0 });
    cap.get(nodes[0])!.set(source, 0);
    cost.get(nodes[0])!.set(source, 0);
    for (const [u, v, c, capVal] of edges) {
      adj.get(u)!.push({ to: v, rev: adj.get(v)!.length });
      adj.get(v)!.push({ to: u, rev: adj.get(u)!.length - 1 });
      cap.get(u)!.set(v, capVal);
      cap.get(v)!.set(u, 0);
      cost.get(u)!.set(v, c);
      cost.get(v)!.set(u, -c);
    }
    const lastNode = nodes[nodes.length - 1];
    adj.get(lastNode)!.push({ to: sink, rev: 0 });
    cap.get(lastNode)!.set(sink, Infinity);
    cost.get(lastNode)!.set(sink, 0);
    adj.get(sink)!.push({ to: lastNode, rev: 0 });
    cap.get(sink)!.set(lastNode, 0);
    cost.get(sink)!.set(lastNode, 0);
    let flow = 0, totalCost = 0;
    const potentials = new Map<string, number>();
    for (const n of allNodes) potentials.set(n, 0);
    while (flow < budget) {
      const dist = new Map<string, number>();
      const prevv = new Map<string, string | null>();
      const preve = new Map<string, { to: string; rev: number } | null>();
      for (const n of allNodes) dist.set(n, Infinity);
      dist.set(source, 0);
      const pq: [number, string][] = [[0, source]];
      while (pq.length > 0) {
        pq.sort((a, b) => a[0] - b[0]);
        const [d, v] = pq.shift()!;
        if (dist.get(v)! < d) continue;
        for (let i = 0; i < (adj.get(v)?.length || 0); i++) {
          const e = adj.get(v)![i];
          const residual = cap.get(v)?.get(e.to) || 0;
          if (residual > 0) {
            const nd = d + (cost.get(v)?.get(e.to) || 0) + (potentials.get(v) || 0) - (potentials.get(e.to) || 0);
            if (nd < (dist.get(e.to) ?? Infinity)) { dist.set(e.to, nd); prevv.set(e.to, v); preve.set(e.to, e); pq.push([nd, e.to]); }
          }
        }
      }
      if (dist.get(sink) === Infinity) break;
      for (const n of allNodes) potentials.set(n, (potentials.get(n) || 0) + (dist.get(n) || 0));
      let add = budget - flow;
      let cur = sink;
      while (cur !== source) {
        const p = prevv.get(cur)!;
        add = Math.min(add, cap.get(p)?.get(cur) || 0);
        cur = p;
      }
      flow += add;
      totalCost += add * (potentials.get(sink) || 0);
      cur = sink;
      while (cur !== source) {
        const p = prevv.get(cur)!;
        cap.get(p)!.set(cur, (cap.get(p)!.get(cur) || 0) - add);
        cap.get(cur)!.set(p, (cap.get(cur)!.get(p) || 0) + add);
        cur = p;
      }
    }
    const allocations: { from: string; to: string; flow: number; cost: number }[] = [];
    for (const [u, v, c, capVal] of edges) {
      const f = capVal - (cap.get(u)?.get(v) || 0);
      if (f > 0) allocations.push({ from: u, to: v, flow: f, cost: c * f });
    }
    return { algorithm: "minCostFlow", output: { allocations, totalCost, utilizedBudget: flow }, source, sink };
  }

  slidingWindowFrequencyCap(events: { timestamp: number; id: string }[], windowMs: number, maxEvents: number): { algorithm: string; output: { blocked: number; allowed: number; state: { id: string; count: number; windowStart: number }[] } } {
    const counter = new Map<string, { count: number; windowStart: number }>();
    let blocked = 0, allowed = 0;
    for (const evt of events) {
      const entry = counter.get(evt.id);
      if (!entry || evt.timestamp - entry.windowStart >= windowMs) {
        counter.set(evt.id, { count: 1, windowStart: evt.timestamp });
        allowed++;
      } else if (entry.count < maxEvents) {
        entry.count++;
        allowed++;
      } else { blocked++; }
    }
    const state: { id: string; count: number; windowStart: number }[] = [];
    for (const [id, s] of counter) state.push({ id, count: s.count, windowStart: s.windowStart });
    return { algorithm: "slidingWindowFrequencyCap", output: { blocked, allowed, state } };
  }

  jaccardAudienceOverlap(sets: { name: string; members: string[] }[]): { algorithm: string; output: { pairs: { a: string; b: string; jaccard: number; intersection: number; union: number }[]; matrix: number[][] } } {
    const n = sets.length;
    const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    const pairs: { a: string; b: string; jaccard: number; intersection: number; union: number }[] = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const setA = new Set(sets[i].members);
        const setB = new Set(sets[j].members);
        let intersection = 0;
        for (const m of setA) if (setB.has(m)) intersection++;
        const unionV = sets[i].members.length + sets[j].members.length - intersection;
        const jaccard = unionV > 0 ? intersection / unionV : 0;
        matrix[i][j] = Math.round(jaccard * 10000) / 10000;
        matrix[j][i] = matrix[i][j];
        pairs.push({ a: sets[i].name, b: sets[j].name, jaccard: Math.round(jaccard * 10000) / 10000, intersection, union: unionV });
      }
    }
    return { algorithm: "jaccardAudienceOverlap", output: { pairs, matrix } };
  }

  cosineSimilarityLookalike(seed: number[], candidates: { id: string; features: number[] }[]): { algorithm: string; output: { scores: { id: string; similarity: number }[]; seedNorm: number } } {
    const dot = (a: number[], b: number[]) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
    const norm = (a: number[]) => Math.sqrt(dot(a, a));
    const seedNorm = norm(seed);
    const scores = candidates.map(c => {
      const sim = seedNorm > 0 ? dot(seed, c.features) / (seedNorm * norm(c.features)) : 0;
      return { id: c.id, similarity: Math.round(sim * 10000) / 10000 };
    }).sort((a, b) => b.similarity - a.similarity);
    return { algorithm: "cosineSimilarityLookalike", output: { scores, seedNorm } };
  }

  exponentialSmoothingForecast(values: number[], alpha: number, beta: number, forecastHorizon: number): { algorithm: string; output: { smoothed: number[]; trend: number[]; forecast: number[]; mse: number; mae: number } } {
    if (values.length < 2) return { algorithm: "expSmoothing", output: { smoothed: values, trend: [], forecast: new Array(forecastHorizon).fill(values[0] || 0), mse: 0, mae: 0 } };
    const n = values.length;
    const smoothed: number[] = [values[0]];
    const trend: number[] = [values[1] - values[0]];
    for (let i = 1; i < n; i++) {
      const s = alpha * values[i] + (1 - alpha) * (smoothed[i - 1] + trend[i - 1]);
      const t = beta * (s - smoothed[i - 1]) + (1 - beta) * trend[i - 1];
      smoothed.push(s); trend.push(t);
    }
    const forecast: number[] = [];
    for (let i = 1; i <= forecastHorizon; i++) forecast.push(Math.round((smoothed[n - 1] + i * trend[n - 1]) * 100) / 100);
    const mse = values.reduce((s, v, i) => s + (v - smoothed[i]) ** 2, 0) / n;
    const mae = values.reduce((s, v, i) => s + Math.abs(v - smoothed[i]), 0) / n;
    return { algorithm: "expSmoothing", output: { smoothed: smoothed.map(v => Math.round(v * 100) / 100), trend: trend.map(v => Math.round(v * 100) / 100), forecast, mse: Math.round(mse * 100) / 100, mae: Math.round(mae * 100) / 100 } };
  }

  // ============ DEEP ENHANCEMENT: ENHANCED EXISTING DS ============

  trieEnhanced(words: string[], ops: { action: "search" | "startsWith" | "autocomplete" | "delete" | "longestPrefix"; param: string }[]): { type: string; operations: { action: string; param: string; result: unknown }[]; totalWords: number; longestCommonPrefix: string } {
    const root: TrieNode = { children: new Map(), isEnd: false, count: 0 };
    for (const w of words) {
      let node = root;
      for (const ch of w) {
        if (!node.children.has(ch)) node.children.set(ch, { children: new Map(), isEnd: false, count: 0 });
        node = node.children.get(ch)!; node.count++;
      }
      node.isEnd = true;
    }
    const opResults: { action: string; param: string; result: unknown }[] = [];
    for (const op of ops) {
      if (op.action === "search") {
        let node = root; let found = true;
        for (const ch of op.param) { if (!node.children.has(ch)) { found = false; break; } node = node.children.get(ch)!; }
        opResults.push({ action: "search", param: op.param, result: found && node.isEnd });
      } else if (op.action === "startsWith") {
        let node = root; let found = true;
        for (const ch of op.param) { if (!node.children.has(ch)) { found = false; break; } node = node.children.get(ch)!; }
        opResults.push({ action: "startsWith", param: op.param, result: found });
      } else if (op.action === "autocomplete") {
        let node = root; let found = true;
        for (const ch of op.param) { if (!node.children.has(ch)) { found = false; break; } node = node.children.get(ch)!; }
        if (!found) opResults.push({ action: "autocomplete", param: op.param, result: [] });
        else { const wordsList: string[] = []; const dfs = (n: TrieNode, path: string) => { if (wordsList.length >= 5) return; if (n.isEnd) wordsList.push(op.param + path); for (const [ch, child] of n.children) dfs(child, path + ch); }; dfs(node, ""); opResults.push({ action: "autocomplete", param: op.param, result: wordsList }); }
      } else if (op.action === "delete") {
        const del = (node: TrieNode | null, word: string, depth: number): TrieNode | null => {
          if (!node) return null;
          if (depth === word.length) { if (!node.isEnd) return node; node.isEnd = false; return node.children.size === 0 ? null : node; }
          const ch = word[depth]; const child = del(node.children.get(ch) || null, word, depth + 1);
          if (child) node.children.set(ch, child); else node.children.delete(ch);
          node.count = 0; for (const c of node.children.values()) node.count += c.count + (c.isEnd ? 1 : 0);
          return node.children.size === 0 && !node.isEnd ? null : node;
        };
        del(root, op.param, 0);
        opResults.push({ action: "delete", param: op.param, result: true });
      } else if (op.action === "longestPrefix") {
        let node = root; let prefix = "";
        for (const ch of op.param) { if (!node.children.has(ch)) break; node = node.children.get(ch)!; prefix += ch; }
        opResults.push({ action: "longestPrefix", param: op.param, result: prefix });
      }
    }
    let lcp = ""; let node = root;
    while (node.children.size === 1 && !node.isEnd) { const [ch, child] = [...node.children][0]; lcp += ch; node = child; }
    return { type: "trieEnhanced", operations: opResults, totalWords: words.length, longestCommonPrefix: lcp };
  }

  segmentTreeLazy(values: number[], updates: { l: number; r: number; add: number }[], queries: { l: number; r: number }[]): { type: string; size: number; updates: number; queries: { range: [number, number]; result: number }[] } {
    const n = values.length;
    if (n === 0) return { type: "segmentLazy", size: 0, updates: updates.length, queries: [] };
    const size = 4 * n;
    const tree = new Array(size).fill(0);
    const lazy = new Array(size).fill(0);
    const build = (idx: number, l: number, r: number) => {
      if (l === r) { tree[idx] = values[l]; return; }
      const mid = (l + r) >> 1;
      build(idx * 2, l, mid); build(idx * 2 + 1, mid + 1, r);
      tree[idx] = tree[idx * 2] + tree[idx * 2 + 1];
    };
    if (n > 0) build(1, 0, n - 1);
    const push = (idx: number, l: number, r: number) => {
      if (lazy[idx] !== 0) {
        tree[idx] += lazy[idx] * (r - l + 1);
        if (l !== r) { lazy[idx * 2] += lazy[idx]; lazy[idx * 2 + 1] += lazy[idx]; }
        lazy[idx] = 0;
      }
    };
    const update = (idx: number, l: number, r: number, ql: number, qr: number, add: number) => {
      push(idx, l, r);
      if (ql > r || qr < l) return;
      if (ql <= l && r <= qr) { lazy[idx] += add; push(idx, l, r); return; }
      const mid = (l + r) >> 1;
      update(idx * 2, l, mid, ql, qr, add);
      update(idx * 2 + 1, mid + 1, r, ql, qr, add);
      tree[idx] = tree[idx * 2] + tree[idx * 2 + 1];
    };
    const query = (idx: number, l: number, r: number, ql: number, qr: number): number => {
      push(idx, l, r);
      if (ql > r || qr < l) return 0;
      if (ql <= l && r <= qr) return tree[idx];
      const mid = (l + r) >> 1;
      return query(idx * 2, l, mid, ql, qr) + query(idx * 2 + 1, mid + 1, r, ql, qr);
    };
    for (const u of updates) if (n > 0) update(1, 0, n - 1, u.l, u.r, u.add);
    const qResults = queries.map(q => ({ range: [q.l, q.r] as [number, number], result: n > 0 ? query(1, 0, n - 1, q.l, q.r) : 0 }));
    return { type: "segmentLazy", size: n, updates: updates.length, queries: qResults };
  }

  fenwick2D(values: number[][], queries: { x1: number; y1: number; x2: number; y2: number }[]): { type: string; rows: number; cols: number; queries: { range: [number, number, number, number]; result: number }[] } {
    const m = values.length, n = m > 0 ? values[0].length : 0;
    const bit: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    const add = (x: number, y: number, delta: number) => { for (let i = x; i <= m; i += i & -i) for (let j = y; j <= n; j += j & -j) bit[i][j] += delta; };
    const sum = (x: number, y: number) => { let s = 0; for (let i = x; i > 0; i -= i & -i) for (let j = y; j > 0; j -= j & -j) s += bit[i][j]; return s; };
    for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) if (values[i][j] !== 0) add(i + 1, j + 1, values[i][j]);
    const qResults = queries.map(q => {
      const result = sum(q.x2 + 1, q.y2 + 1) - sum(q.x1, q.y2 + 1) - sum(q.x2 + 1, q.y1) + sum(q.x1, q.y1);
      return { range: [q.x1, q.y1, q.x2, q.y2] as [number, number, number, number], result };
    });
    return { type: "fenwick2D", rows: m, cols: n, queries: qResults };
  }

  bidirectionalDijkstra(nodes: string[], edges: [string, string, number][], start: string, end: string): { algorithm: string; path: string[]; cost: number; forwardExplored: number; backwardExplored: number } {
    const adj = new Map<string, [string, number][]>();
    const radj = new Map<string, [string, number][]>();
    for (const n of nodes) { adj.set(n, []); radj.set(n, []); }
    for (const [a, b, w] of edges) { adj.get(a)?.push([b, w]); radj.get(b)?.push([a, w]); }
    const fDist = new Map<string, number>(); const bDist = new Map<string, number>();
    const fPrev = new Map<string, string | null>(); const bPrev = new Map<string, string | null>();
    for (const n of nodes) { fDist.set(n, Infinity); bDist.set(n, Infinity); fPrev.set(n, null); bPrev.set(n, null); }
    fDist.set(start, 0); bDist.set(end, 0);
    const fPQ: [number, string][] = [[0, start]]; const bPQ: [number, string][] = [[0, end]];
    const fVisited = new Set<string>(); const bVisited = new Set<string>();
    let meetingNode: string | null = null;
    let bestPath = Infinity;
    const process = (pq: [number, string][], dist: Map<string, number>, prev: Map<string, string | null>, adjL: Map<string, [string, number][]>, visited: Set<string>, otherDist: Map<string, number>): boolean => {
      if (pq.length === 0) return false;
      pq.sort((a, b) => a[0] - b[0]);
      const [d, u] = pq.shift()!;
      if (d > (dist.get(u) ?? Infinity)) return true;
      visited.add(u);
      if (otherDist.has(u) && (otherDist.get(u) ?? Infinity) !== Infinity && d + (otherDist.get(u) ?? Infinity) < bestPath) {
        bestPath = d + (otherDist.get(u) ?? Infinity); meetingNode = u;
      }
      for (const [v, w] of adjL.get(u) || []) {
        const nd = d + w;
        if (nd < (dist.get(v) ?? Infinity)) { dist.set(v, nd); prev.set(v, u); pq.push([nd, v]); }
      }
      return true;
    };
    let iterations = 0;
    while (iterations < 100 && fPQ.length > 0 && bPQ.length > 0) {
      iterations++;
      const fOk = process(fPQ, fDist, fPrev, adj, fVisited, bDist);
      const bOk = process(bPQ, bDist, bPrev, radj, bVisited, fDist);
      if (!fOk || !bOk) break;
      if (meetingNode !== null) break;
    }
    const path: string[] = [];
    if (meetingNode) {
      let cur: string | null | undefined = meetingNode;
      while (cur) { path.unshift(cur); cur = fPrev.get(cur) ?? null; }
      cur = bPrev.get(meetingNode) ?? null;
      while (cur) { path.push(cur); cur = bPrev.get(cur) ?? null; }
    }
    return { algorithm: "bidirectionalDijkstra", path, cost: bestPath === Infinity ? 0 : bestPath, forwardExplored: fVisited.size, backwardExplored: bVisited.size };
  }

  // ============ DEPTH 3: DEEPER DATA STRUCTURES ============

  skipListOperations(ops: { action: "insert" | "search" | "delete"; key: number; value?: string }[]): { type: string; operations: { action: string; key: number; value?: string; found?: boolean }[]; finalLevels: number } {
    const maxLvl = 6;
    const prob = 0.5;
    let level = 1;
    const head: SkipListNode = { key: -Infinity, value: "", forward: new Array(maxLvl) };
    const randLvl = () => { let l = 1; while (Math.random() < prob && l < maxLvl) l++; return l; };
    const opResults: { action: string; key: number; value?: string; found?: boolean }[] = [];
    for (const op of ops) {
      if (op.action === "insert") {
        const update = new Array<SkipListNode>(maxLvl);
        let cur = head;
        for (let i = level - 1; i >= 0; i--) { while (cur.forward[i] && cur.forward[i].key < op.key) cur = cur.forward[i]; update[i] = cur; }
        cur = cur.forward[0];
        if (cur && cur.key === op.key) { cur.value = op.value || cur.value; }
        else {
          const lvl = randLvl();
          if (lvl > level) { for (let i = level; i < lvl; i++) update[i] = head; level = lvl; }
          const node: SkipListNode = { key: op.key, value: op.value || "", forward: new Array(lvl) };
          for (let i = 0; i < lvl; i++) { node.forward[i] = update[i].forward[i]; update[i].forward[i] = node; }
        }
        opResults.push({ action: "insert", key: op.key, value: op.value });
      } else if (op.action === "search") {
        let cur = head;
        for (let i = level - 1; i >= 0; i--) { while (cur.forward[i] && cur.forward[i].key < op.key) cur = cur.forward[i]; }
        cur = cur.forward[0];
        opResults.push({ action: "search", key: op.key, found: !!(cur && cur.key === op.key), value: cur && cur.key === op.key ? cur.value : undefined });
      } else if (op.action === "delete") {
        const update = new Array<SkipListNode>(maxLvl);
        let cur = head;
        for (let i = level - 1; i >= 0; i--) { while (cur.forward[i] && cur.forward[i].key < op.key) cur = cur.forward[i]; update[i] = cur; }
        cur = cur.forward[0];
        if (cur && cur.key === op.key) { for (let i = 0; i < level; i++) { if (update[i].forward[i] !== cur) break; update[i].forward[i] = cur.forward[i]; } while (level > 1 && !head.forward[level - 1]) level--; }
        opResults.push({ action: "delete", key: op.key, found: !!(cur && cur.key === op.key) });
      }
    }
    return { type: "skipList", operations: opResults, finalLevels: level };
  }

  redBlackTreeOperations(ops: { action: "insert" | "search"; key: number; value?: string }[]): { type: string; operations: { action: string; key: number; value?: string; found?: boolean; blackHeight?: number }[]; finalKeys: number[] } {
    let root: RedBlackNode | null = null;
    const rotateL = (x: RedBlackNode): RedBlackNode => { const y = x.right!; x.right = y.left; if (y.left) y.left.parent = x; y.parent = x.parent; if (!x.parent) root = y; else if (x === x.parent.left) x.parent.left = y; else x.parent.right = y; y.left = x; x.parent = y; return y; };
    const rotateR = (x: RedBlackNode): RedBlackNode => { const y = x.left!; x.left = y.right; if (y.right) y.right.parent = x; y.parent = x.parent; if (!x.parent) root = y; else if (x === x.parent.right) x.parent.right = y; else x.parent.left = y; y.right = x; x.parent = y; return y; };
    const insertFix = (z: RedBlackNode) => {
      while (z.parent && z.parent.red) {
        if (!z.parent.parent) break;
        if (z.parent === z.parent.parent.left) {
          const y = z.parent.parent.right;
          if (y && y.red) { z.parent.red = false; y.red = false; z.parent.parent.red = true; z = z.parent.parent; }
          else { if (z === z.parent.right) { z = z.parent; rotateL(z); } z.parent!.red = false; z.parent!.parent!.red = true; rotateR(z.parent!.parent!); }
        } else {
          const y = z.parent.parent.left;
          if (y && y.red) { z.parent.red = false; y.red = false; z.parent.parent.red = true; z = z.parent.parent; }
          else { if (z === z.parent.left) { z = z.parent; rotateR(z); } z.parent!.red = false; z.parent!.parent!.red = true; rotateL(z.parent!.parent!); }
        }
      }
      if (root) root.red = false;
    };
    const insert = (key: number, val?: string) => {
      const z: RedBlackNode = { key, value: val, left: null, right: null, parent: null, red: true };
      let y: RedBlackNode | null = null;
      let x = root;
      while (x) { y = x; x = key < x.key ? x.left : x.right; }
      z.parent = y;
      if (!y) root = z;
      else if (key < y.key) y.left = z;
      else y.right = z;
      insertFix(z);
    };
    const search = (key: number): boolean => { let x = root; while (x) { if (key === x.key) return true; x = key < x.key ? x.left : x.right; } return false; };
    const height = (n: RedBlackNode | null): number => { if (!n) return 0; return 1 + Math.max(height(n.left), height(n.right)); };
    const inorder = (n: RedBlackNode | null, acc: number[]) => { if (!n) return; inorder(n.left, acc); acc.push(n.key); inorder(n.right, acc); };
    const opResults: { action: string; key: number; value?: string; found?: boolean; blackHeight?: number }[] = [];
    for (const op of ops) {
      if (op.action === "insert") { insert(op.key, op.value); const bh = root ? Math.ceil(height(root) / 2) : 0; opResults.push({ action: "insert", key: op.key, value: op.value, blackHeight: bh }); }
      else if (op.action === "search") { opResults.push({ action: "search", key: op.key, found: search(op.key) }); }
    }
    const finalKeys: number[] = []; inorder(root, finalKeys);
    return { type: "redBlackTree", operations: opResults, finalKeys };
  }

  intervalTreeOperations(intervals: { low: number; high: number; id: string }[], queries: { low: number; high: number }[]): { type: string; intervals: number; queryResults: { query: { low: number; high: number }; overlapping: { low: number; high: number; id: string }[] }[] } {
    const insert = (node: IntervalNode | null, low: number, high: number): IntervalNode => {
      if (!node) return { low, high, max: high, left: null, right: null };
      if (low < node.low) node.left = insert(node.left, low, high);
      else node.right = insert(node.right, low, high);
      node.max = Math.max(node.max, high);
      return node;
    };
    const overlap = (a: { low: number; high: number }, b: { low: number; high: number }) => a.low <= b.high && b.low <= a.high;
    const searchAll = (node: IntervalNode | null, q: { low: number; high: number }, results: { low: number; high: number; id: string }[]) => {
      if (!node) return;
      if (overlap({ low: node.low, high: node.max }, q)) {
        if (overlap({ low: node.low, high: node.max }, q)) results.push({ low: node.low, high: node.max, id: "" });
        searchAll(node.left, q, results);
        searchAll(node.right, q, results);
      }
    };
    let root: IntervalNode | null = null;
    for (const iv of intervals) root = insert(root, iv.low, iv.high);
    const qResults = queries.map(q => {
      const overlapping: { low: number; high: number; id: string }[] = [];
      searchAll(root, q, overlapping);
      const matched = intervals.filter(iv => overlap(iv, q));
      return { query: q, overlapping: matched };
    });
    return { type: "intervalTree", intervals: intervals.length, queryResults: qResults };
  }

  treapOperations(ops: { action: "insert" | "search" | "delete"; key: number; value?: string }[]): { type: string; operations: { action: string; key: number; found?: boolean; priority?: number }[]; finalKeys: number[] } {
    type TreapNode = { key: number; priority: number; value?: string; left: TreapNode | null; right: TreapNode | null; };
    let root: TreapNode | null = null;
    const rotateR = (p: TreapNode): TreapNode => { const q = p.left!; p.left = q.right; q.right = p; return q; };
    const rotateL = (p: TreapNode): TreapNode => { const q = p.right!; p.right = q.left; q.left = p; return q; };
    const insert = (node: TreapNode | null, key: number, val?: string): TreapNode => {
      if (!node) return { key, priority: Math.random(), value: val, left: null, right: null };
      if (key < node.key) { node.left = insert(node.left, key, val); if (node.left.priority < node.priority) node = rotateR(node); }
      else if (key > node.key) { node.right = insert(node.right, key, val); if (node.right.priority < node.priority) node = rotateL(node); }
      return node;
    };
    const del = (node: TreapNode | null, key: number): TreapNode | null => {
      if (!node) return null;
      if (key === node.key) {
        if (!node.left) return node.right;
        if (!node.right) return node.left;
        if (node.left.priority < node.right.priority) { node = rotateR(node); node.right = del(node.right, key); }
        else { node = rotateL(node); node.left = del(node.left, key); }
      } else if (key < node.key) node.left = del(node.left, key);
      else node.right = del(node.right, key);
      return node;
    };
    const search = (node: TreapNode | null, key: number): boolean => { while (node) { if (key === node.key) return true; node = key < node.key ? node.left : node.right; } return false; };
    const inorder = (n: TreapNode | null, acc: number[]) => { if (!n) return; inorder(n.left, acc); acc.push(n.key); inorder(n.right, acc); };
    const opResults: { action: string; key: number; found?: boolean; priority?: number }[] = [];
    for (const op of ops) {
      if (op.action === "insert") { root = insert(root, op.key, op.value); opResults.push({ action: "insert", key: op.key, priority: root ? root.priority : 0 }); }
      else if (op.action === "search") { opResults.push({ action: "search", key: op.key, found: search(root, op.key) }); }
      else if (op.action === "delete") { root = del(root, op.key); opResults.push({ action: "delete", key: op.key }); }
    }
    const finalKeys: number[] = []; inorder(root, finalKeys);
    return { type: "treap", operations: opResults, finalKeys };
  }

  fibonacciHeapOperations(ops: { action: "insert" | "extract-min"; key?: number; value?: string }[]): { type: string; operations: { action: string; key?: number; value?: string; minKey?: number }[]; finalSize: number } {
    let min: FibonacciNode | null = null;
    let size = 0;
    const makeNode = (k: number, v: string): FibonacciNode => ({ key: k, value: v, degree: 0, marked: false, parent: null, child: null, left: null as any, right: null as any });
    const addToRoot = (node: FibonacciNode) => {
      if (!min) { min = node; node.left = node; node.right = node; }
      else { const last = min.left; min.left = node; node.right = min; node.left = last; last.right = node; if (node.key < min.key) min = node; }
    };
    const removeFromRoot = (node: FibonacciNode) => {
      if (node.right === node) { min = null; return; }
      node.left.right = node.right; node.right.left = node.left;
      if (min === node) min = node.right;
    };
    const consolidate = () => {
      if (!min) return;
      const maxDegree = Math.ceil(Math.log2(size)) + 2;
      const arr = new Array<FibonacciNode | null>(maxDegree).fill(null);
      const roots: FibonacciNode[] = [];
      let cur = min;
      do { roots.push(cur); cur = cur.right; } while (cur !== min);
      for (const w of roots) {
        let x = w;
        let d = x.degree;
        while (arr[d]) {
          let y = arr[d]!;
          if (x.key > y.key) { [x, y] = [y, x]; }
          removeFromRoot(y); y.parent = x; y.marked = false;
          if (!x.child) { x.child = y; y.left = y; y.right = y; }
          else { const last = x.child.left; x.child.left = y; y.right = x.child; y.left = last; last.right = y; }
          x.degree++; arr[d] = null; d++;
        }
        arr[d] = x;
      }
      min = null;
      for (const n of arr) if (n) { if (!min) { min = n; n.left = n; n.right = n; } else { addToRoot(n); } }
    };
    const opResults: { action: string; key?: number; value?: string; minKey?: number }[] = [];
    for (const op of ops) {
      if (op.action === "insert" && op.key !== undefined) {
        const node = makeNode(op.key, op.value || ""); addToRoot(node); size++;
        opResults.push({ action: "insert", key: op.key, value: op.value, minKey: min!.key });
      } else if (op.action === "extract-min") {
        if (!min) { opResults.push({ action: "extract-min" }); continue; }
        const z: FibonacciNode = min;
        if (z.child) {
          let c: FibonacciNode = z.child;
          do { const next = c.right; removeFromRoot(c); c.parent = null; addToRoot(c); c = next; } while (c !== z.child);
        }
        removeFromRoot(z); size--;
        const extractedKey = z.key;
        if (min) consolidate();
        opResults.push({ action: "extract-min", key: extractedKey, minKey: min === null ? undefined : (min as FibonacciNode).key });
      }
    }
    return { type: "fibonacciHeap", operations: opResults, finalSize: size };
  }

  radixTreeOperations(words: string[], queries: string[]): { type: string; words: number; searchResults: { word: string; found: boolean }[]; treeDepth: number } {
    const root: RadixNode = { children: new Map(), isEnd: false, prefix: "", value: undefined };
    for (const w of words) {
      let node = root; let i = 0;
      while (i < w.length) {
        let found = false;
        for (const [key, child] of node.children) {
          let j = 0;
          while (j < key.length && i + j < w.length && key[j] === w[i + j]) j++;
          if (j > 0) {
            if (j < key.length) {
              const suffixNode: RadixNode = { children: child.children, isEnd: child.isEnd, prefix: child.prefix, value: child.value };
              child.children = new Map([[key.substring(j), suffixNode]]);
              child.isEnd = false; child.value = undefined;
              child.prefix = key.substring(0, j);
              node.children.set(key.substring(0, j), child); node.children.delete(key);
            }
            node = child; i += j; found = true; break;
          }
        }
        if (!found) {
          const newNode: RadixNode = { children: new Map(), isEnd: true, prefix: w.substring(i), value: undefined };
          node.children.set(w.substring(i), newNode); node = newNode; i = w.length;
        }
      }
      node.isEnd = true;
    }
    const searchResults = queries.map(q => {
      let node = root; let i = 0;
      while (i < q.length) {
        let found = false;
        for (const [key, child] of node.children) {
          if (q.startsWith(key, i)) { node = child; i += key.length; found = true; break; }
        }
        if (!found) return { word: q, found: false };
      }
      return { word: q, found: node.isEnd };
    });
    const depth = (n: RadixNode): number => { let max = 0; for (const c of n.children.values()) max = Math.max(max, 1 + depth(c)); return max; };
    return { type: "radixTree", words: words.length, searchResults, treeDepth: depth(root) };
  }

  // ============ DEPTH 3: DEEPER ALGORITHMS ============

  dinicMaxFlow(nodes: string[], edges: [string, string, number][], source: string, sink: string): DinicResult {
    const adj = new Map<string, { to: string; rev: number }[]>();
    const cap = new Map<string, Map<string, number>>();
    for (const n of nodes) { adj.set(n, []); cap.set(n, new Map()); }
    for (const [u, v, c] of edges) {
      adj.get(u)!.push({ to: v, rev: adj.get(v)!.length });
      adj.get(v)!.push({ to: u, rev: adj.get(u)!.length - 1 });
      cap.get(u)!.set(v, (cap.get(u)!.get(v) || 0) + c);
      cap.get(v)!.set(u, 0);
    }
    const flowEdges: { from: string; to: string; flow: number; capacity: number }[] = [];
    let maxFlow = 0;
    let maxLevel = 0;
    while (true) {
      const level = new Map<string, number>();
      const q: string[] = [source]; level.set(source, 0);
      let qi = 0; let found = false;
      while (qi < q.length && !found) {
        const u = q[qi++];
        for (const { to: v } of adj.get(u) || []) {
          if (!level.has(v) && (cap.get(u)?.get(v) || 0) > 0) { level.set(v, level.get(u)! + 1); q.push(v); if (v === sink) found = true; }
        }
      }
      if (!level.has(sink)) break;
      maxLevel = Math.max(maxLevel, level.get(sink)!);
      const it = new Map<string, number>();
      const dfs = (u: string, f: number): number => {
        if (u === sink) return f;
        const adjList = adj.get(u) || [];
        for (let i = (it.get(u) || 0); i < adjList.length; i = it.get(u)! + 1) {
          it.set(u, i);
          const { to: v, rev } = adjList[i];
          const c = cap.get(u)?.get(v) || 0;
          if (c > 0 && (level.get(v) || 0) === (level.get(u) || 0) + 1) {
            const pushed = dfs(v, Math.min(f, c));
            if (pushed > 0) {
              cap.get(u)!.set(v, c - pushed);
              cap.get(v)!.set(u, (cap.get(v)!.get(u) || 0) + pushed);
              return pushed;
            }
          }
        }
        return 0;
      };
      while (true) { const pushed = dfs(source, Infinity); if (pushed === 0) break; maxFlow += pushed; }
    }
    for (const [u, v, c] of edges) { const f = c - (cap.get(u)?.get(v) || 0); if (f > 0) flowEdges.push({ from: u, to: v, flow: f, capacity: c }); }
    return { algorithm: "dinic", maxFlow, flowEdges, levels: maxLevel };
  }

  hungarianAlgorithm(costMatrix: number[][]): HungarianResult {
    const n = costMatrix.length;
    if (n === 0) return { algorithm: "hungarian", cost: 0, assignment: [] };
    const m = costMatrix[0].length;
    const u = new Array(n + 1).fill(0);
    const v = new Array(m + 1).fill(0);
    const p = new Array(m + 1).fill(0);
    const way = new Array(m + 1).fill(0);
    for (let i = 1; i <= n; i++) {
      p[0] = i;
      let j0 = 0;
      const minv = new Array(m + 1).fill(Infinity);
      const used = new Array(m + 1).fill(false);
      do {
        used[j0] = true;
        const i0 = p[j0];
        let delta = Infinity;
        let j1 = 0;
        for (let j = 1; j <= m; j++) {
          if (!used[j]) {
            const cur = costMatrix[i0 - 1][j - 1] - u[i0] - v[j];
            if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
            if (minv[j] < delta) { delta = minv[j]; j1 = j; }
          }
        }
        for (let j = 0; j <= m; j++) { if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta; }
        j0 = j1;
      } while (p[j0] !== 0);
      do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
    }
    const assignment: [number, number][] = [];
    for (let j = 1; j <= m; j++) if (p[j] > 0) assignment.push([p[j] - 1, j - 1]);
    const cost = -v[0];
    return { algorithm: "hungarian", cost: Math.round(cost * 1000) / 1000, assignment };
  }

  hopcroftKarpBipartite(left: string[], right: string[], edges: [string, string][]): HopcroftKarpResult {
    const pairU = new Map<string, string | null>();
    const pairV = new Map<string, string | null>();
    const adj = new Map<string, string[]>();
    const dist = new Map<string, number>();
    for (const l of left) { pairU.set(l, null); adj.set(l, []); }
    for (const r of right) { pairV.set(r, null); }
    for (const [u, v] of edges) adj.get(u)?.push(v);
    const bfs = (): boolean => {
      const queue: string[] = [];
      for (const l of left) {
        if (pairU.get(l) === null) { dist.set(l, 0); queue.push(l); }
        else dist.set(l, Infinity);
      }
      let found = false;
      let qi = 0;
      while (qi < queue.length) {
        const u = queue[qi++];
        if (dist.get(u)! < Infinity) {
          for (const v of adj.get(u) || []) {
            const pu = pairV.get(v);
            if (pu != null && dist.get(pu) === Infinity) { dist.set(pu, dist.get(u)! + 1); queue.push(pu!); }
            else if (pu === null) found = true;
          }
        }
      }
      return found;
    };
    const dfs = (u: string): boolean => {
      for (const v of adj.get(u) || []) {
        const pu = pairV.get(v);
        if (pu === null || (dist.get(pu!) === dist.get(u)! + 1 && dfs(pu!))) { pairU.set(u, v); pairV.set(v, u); return true; }
      }
      dist.set(u, Infinity);
      return false;
    };
    let matching = 0;
    let iterations = 0;
    while (bfs()) { iterations++; for (const l of left) { if (pairU.get(l) === null && dfs(l)) matching++; } }
    const result: [string, string][] = [];
    for (const l of left) { const v = pairU.get(l); if (v) result.push([l, v]); }
    return { algorithm: "hopcroftKarp", matching: result, cardinality: matching, iterations };
  }

  johnsonsAlgorithm(nodes: string[], edges: [string, string, number][]): JohnsonResult {
    const n = nodes.length;
    if (n === 0) return { algorithm: "johnson", distances: [], nodes: [], hasNegativeCycle: false };
    const idx = new Map<string, number>();
    nodes.forEach((v, i) => idx.set(v, i));
    const extended = [...edges];
    for (const v of nodes) extended.push(["__source__", v, 0] as [string, string, number]);
    const allNodes = ["__source__", ...nodes];
    const dist = new Map<string, number>();
    for (const v of allNodes) dist.set(v, Infinity);
    dist.set("__source__", 0);
    for (let i = 0; i < allNodes.length - 1; i++) {
      for (const [u, v, w] of extended) {
        const du = dist.get(u) ?? Infinity;
        if (du !== Infinity && du + w < (dist.get(v) ?? Infinity)) dist.set(v, du + w);
      }
    }
    for (const [u, v, w] of extended) {
      const du = dist.get(u) ?? Infinity;
      if (du !== Infinity && du + w < (dist.get(v) ?? Infinity)) return { algorithm: "johnson", distances: [], nodes: [], hasNegativeCycle: true };
    }
    const h = dist;
    const result: number[][] = Array.from({ length: n }, () => new Array(n).fill(Infinity));
    for (let i = 0; i < n; i++) result[i][i] = 0;
    const adj = new Map<string, [string, number][]>();
    for (const v of nodes) adj.set(v, []);
    for (const [u, v, w] of edges) adj.get(u)?.push([v, w + (h.get(u) ?? 0) - (h.get(v) ?? 0)]);
    for (let s = 0; s < n; s++) {
      const d = new Map<string, number>();
      for (const v of nodes) d.set(v, Infinity);
      d.set(nodes[s], 0);
      const pq: [number, string][] = [[0, nodes[s]]];
      while (pq.length > 0) {
        pq.sort((a, b) => a[0] - b[0]);
        const [du, u] = pq.shift()!;
        if (du > (d.get(u) ?? Infinity)) continue;
        for (const [v, w] of adj.get(u) || []) {
          if (du + w < (d.get(v) ?? Infinity)) { d.set(v, du + w); pq.push([du + w, v]); }
        }
      }
      for (let t = 0; t < n; t++) result[s][t] = d.get(nodes[t]) ?? Infinity;
    }
    const hArr = nodes.map(v => h.get(v) ?? 0);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (result[i][j] !== Infinity) result[i][j] = result[i][j] - hArr[i] + hArr[j];
    return { algorithm: "johnson", distances: result, nodes, hasNegativeCycle: false };
  }

  medianOfMedians(arr: number[], k: number): { algorithm: string; value: number | null; comparisons: number; inputSize: number } {
    const a = [...arr];
    let comparisons = 0;
    const mom = (arr: number[], kTh: number): number | null => {
      if (arr.length <= 5) { arr.sort((a, b) => a - b); comparisons += arr.length > 1 ? arr.length - 1 : 0; return arr[kTh] ?? null; }
      const medians: number[] = [];
      for (let i = 0; i < arr.length; i += 5) {
        const chunk = arr.slice(i, i + 5);
        chunk.sort((a, b) => a - b); comparisons += chunk.length > 1 ? chunk.length - 1 : 0;
        medians.push(chunk[Math.floor(chunk.length / 2)]);
      }
      const pivot = mom(medians, Math.floor(medians.length / 2));
      if (pivot === null) return null;
      const lows: number[] = [], highs: number[] = [], equals: number[] = [];
      for (const x of arr) { comparisons++; if (x < pivot) lows.push(x); else if (x > pivot) highs.push(x); else equals.push(x); }
      if (kTh < lows.length) return mom(lows, kTh);
      if (kTh < lows.length + equals.length) return pivot;
      return mom(highs, kTh - lows.length - equals.length);
    };
    const value = k >= 1 && k <= a.length ? mom(a, k - 1) : null;
    return { algorithm: "medianOfMedians", value, comparisons, inputSize: arr.length };
  }

  hpFilter(values: number[], lambda: number = 1600): { algorithm: string; output: { trend: number[]; cycle: number[]; smoothed: number[] }; variance: { trend: number; cycle: number } } {
    const n = values.length;
    if (n < 3) return { algorithm: "hpFilter", output: { trend: [...values], cycle: values.map(() => 0), smoothed: [...values] }, variance: { trend: 0, cycle: 0 } };
    const D = Array.from({ length: n - 2 }, (_, i) => {
      const row = new Array(n).fill(0);
      row[i] = 1; row[i + 1] = -2; row[i + 2] = 1;
      return row;
    });
    const I = Array.from({ length: n }, (_, i) => { const row = new Array(n).fill(0); row[i] = 1; return row; });
    const A = I.map((row, i) => {
      const newRow = [...row];
      for (let j = 0; j < n; j++) {
        let dtd = 0;
        for (let k = 0; k < n - 2; k++) dtd += D[k][i] * D[k][j];
        newRow[j] += lambda * dtd;
      }
      return newRow;
    });
    const gauss = (A: number[][], b: number[]): number[] => {
      const m = A.length;
      const aug = A.map((row, i) => [...row, b[i]]);
      for (let col = 0; col < m; col++) {
        let maxRow = col;
        for (let row = col + 1; row < m; row++) if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
        [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
        for (let row = col + 1; row < m; row++) {
          const factor = aug[row][col] / aug[col][col];
          for (let j = col; j <= m; j++) aug[row][j] -= factor * aug[col][j];
        }
      }
      const x = new Array(m).fill(0);
      for (let i = m - 1; i >= 0; i--) { x[i] = aug[i][m] / aug[i][i]; for (let j = i - 1; j >= 0; j--) aug[j][m] -= aug[j][i] * x[i]; }
      return x;
    };
    const trend = gauss(A, values);
    const cycle = values.map((v, i) => v - trend[i]);
    const smoothed = trend.map((v, i) => v + cycle[i] * 0.1);
    const tVar = trend.reduce((s, v) => s + v * v, 0) / n;
    const cVar = cycle.reduce((s, v) => s + v * v, 0) / n;
    return { algorithm: "hpFilter", output: { trend: trend.map(v => Math.round(v * 100) / 100), cycle: cycle.map(v => Math.round(v * 100) / 100), smoothed: smoothed.map(v => Math.round(v * 100) / 100) }, variance: { trend: Math.round(tVar * 100) / 100, cycle: Math.round(cVar * 100) / 100 } };
  }

  // ============ DEPTH 3: DEEPER STRING / DP ============

  longestCommonSubstring(a: string, b: string): { algorithm: string; substring: string; length: number; comparisons: number } {
    const m = a.length, n = b.length;
    let maxLen = 0, endIdx = 0;
    const dp: number[][] = Array.from({ length: 2 }, () => new Array(n + 1).fill(0));
    let comparisons = 0;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        comparisons++;
        if (a[i - 1] === b[j - 1]) { dp[i % 2][j] = dp[(i - 1) % 2][j - 1] + 1; if (dp[i % 2][j] > maxLen) { maxLen = dp[i % 2][j]; endIdx = i - 1; } }
        else dp[i % 2][j] = 0;
      }
    }
    return { algorithm: "longestCommonSubstring", substring: a.substring(endIdx - maxLen + 1, endIdx + 1), length: maxLen, comparisons };
  }

  jaroWinklerSimilarity(a: string, b: string): { algorithm: string; similarity: number; winkler: number; matches: number; transpositions: number } {
    if (a === b) return { algorithm: "jaroWinkler", similarity: 1, winkler: 1, matches: a.length, transpositions: 0 };
    const maxDist = Math.floor(Math.max(a.length, b.length) / 2) - 1;
    const matchA = new Array(a.length).fill(false);
    const matchB = new Array(b.length).fill(false);
    let matches = 0;
    for (let i = 0; i < a.length; i++) {
      const start = Math.max(0, i - maxDist);
      const end = Math.min(b.length - 1, i + maxDist);
      for (let j = start; j <= end; j++) { if (!matchB[j] && a[i] === b[j]) { matchA[i] = true; matchB[j] = true; matches++; break; } }
    }
    if (matches === 0) return { algorithm: "jaroWinkler", similarity: 0, winkler: 0, matches: 0, transpositions: 0 };
    let transpositions = 0;
    let j = 0;
    for (let i = 0; i < a.length; i++) {
      if (matchA[i]) { while (!matchB[j]) j++; if (a[i] !== b[j]) transpositions++; j++; }
    }
    const jaro = (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3;
    let prefix = 0;
    for (let i = 0; i < Math.min(4, a.length, b.length); i++) { if (a[i] === b[i]) prefix++; else break; }
    const winkler = jaro + prefix * 0.1 * (1 - jaro);
    return { algorithm: "jaroWinkler", similarity: Math.round(jaro * 10000) / 10000, winkler: Math.round(winkler * 10000) / 10000, matches, transpositions: Math.round(transpositions / 2) };
  }

  hammingDistance(a: string, b: string): { algorithm: string; distance: number; sameLength: boolean; positions: number[] } {
    const positions: number[] = [];
    const maxLen = Math.max(a.length, b.length);
    for (let i = 0; i < Math.min(a.length, b.length); i++) { if (a[i] !== b[i]) positions.push(i); }
    for (let i = Math.min(a.length, b.length); i < maxLen; i++) positions.push(i);
    return { algorithm: "hammingDistance", distance: positions.length, sameLength: a.length === b.length, positions };
  }

  palindromePartitioning(s: string): { algorithm: string; minCuts: number; partitions: string[][] } {
    const n = s.length;
    if (n === 0) return { algorithm: "palindromePartitioning", minCuts: 0, partitions: [] };
    const pal: boolean[][] = Array.from({ length: n }, () => new Array(n).fill(false));
    const dp = new Array(n).fill(Infinity);
    const split = new Array(n).fill(-1);
    for (let i = 0; i < n; i++) pal[i][i] = true;
    for (let len = 2; len <= n; len++) { for (let i = 0; i <= n - len; i++) { const j = i + len - 1; if (len === 2) pal[i][j] = s[i] === s[j]; else pal[i][j] = s[i] === s[j] && pal[i + 1][j - 1]; } }
    for (let i = 0; i < n; i++) {
      if (pal[0][i]) { dp[i] = 0; split[i] = -1; }
      else { for (let j = 0; j < i; j++) { if (pal[j + 1][i] && dp[j] + 1 < dp[i]) { dp[i] = dp[j] + 1; split[i] = j; } } }
    }
    const partitions: string[][] = [];
    if (dp[n - 1] < Infinity) {
      let cur = n - 1;
      const parts: string[] = [];
      while (cur >= 0) { const start = split[cur] + 1; parts.unshift(s.substring(start, cur + 1)); cur = split[cur]; }
      partitions.push(parts);
    }
    return { algorithm: "palindromePartitioning", minCuts: dp[n - 1] === Infinity ? 0 : dp[n - 1], partitions };
  }

  eggDrop(eggs: number, floors: number): { algorithm: string; minTrials: number; dp: number[][] } {
    const dp: number[][] = Array.from({ length: eggs + 1 }, () => new Array(floors + 1).fill(0));
    for (let i = 1; i <= eggs; i++) { dp[i][1] = 1; dp[i][0] = 0; }
    for (let j = 1; j <= floors; j++) dp[1][j] = j;
    for (let i = 2; i <= eggs; i++) {
      for (let j = 2; j <= floors; j++) {
        dp[i][j] = Infinity;
        let low = 1, high = j;
        while (low <= high) {
          const mid = (low + high) >> 1;
          const broken = dp[i - 1][mid - 1];
          const notBroken = dp[i][j - mid];
          const worst = 1 + Math.max(broken, notBroken);
          dp[i][j] = Math.min(dp[i][j], worst);
          if (broken < notBroken) low = mid + 1;
          else high = mid - 1;
        }
      }
    }
    return { algorithm: "eggDrop", minTrials: dp[eggs][floors], dp: dp.slice(1).map(r => r.slice(1)) };
  }

  travelingSalesmanDp(cities: number, distances: number[][]): { algorithm: string; minCost: number; path: number[] } {
    if (cities === 0) return { algorithm: "travelingSalesman", minCost: 0, path: [] };
    const n = cities;
    const size = 1 << n;
    const dp: number[][] = Array.from({ length: n }, () => new Array(size).fill(Infinity));
    const parent: number[][] = Array.from({ length: n }, () => new Array(size).fill(-1));
    for (let i = 0; i < n; i++) dp[i][1 << i] = 0;
    for (let mask = 1; mask < size; mask++) {
      for (let u = 0; u < n; u++) {
        if (!(mask & (1 << u))) continue;
        if (dp[u][mask] === Infinity) continue;
        for (let v = 0; v < n; v++) {
          if (mask & (1 << v)) continue;
          const newMask = mask | (1 << v);
          const newDist = dp[u][mask] + distances[u][v];
          if (newDist < dp[v][newMask]) { dp[v][newMask] = newDist; parent[v][newMask] = u; }
        }
      }
    }
    const fullMask = size - 1;
    let minCost = Infinity;
    let last = -1;
    for (let i = 0; i < n; i++) {
      const cost = dp[i][fullMask] + distances[i][0];
      if (cost < minCost) { minCost = cost; last = i; }
    }
    const path: number[] = [];
    if (last >= 0) {
      let mask = fullMask;
      while (last !== -1) { path.unshift(last); const prev = parent[last][mask]; mask ^= (1 << last); last = prev; }
      path.push(0);
    }
    return { algorithm: "travelingSalesman", minCost: minCost === Infinity ? 0 : Math.round(minCost * 1000) / 1000, path };
  }

  // ============ DEPTH 3: ENHANCED EXISTING ============

  medianHeapOperations(values: number[]): { type: string; operations: { value: number; median: number; lowerSize: number; upperSize: number }[] } {
    const lower: number[] = [];
    const upper: number[] = [];
    const swap = (a: number[], i: number, j: number) => { [a[i], a[j]] = [a[j], a[i]]; };
    const pushMax = (h: number[], v: number) => { h.push(v); let i = h.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (h[p] >= h[i]) break; swap(h, p, i); i = p; } };
    const pushMin = (h: number[], v: number) => { h.push(v); let i = h.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (h[p] <= h[i]) break; swap(h, p, i); i = p; } };
    const popMax = (h: number[]): number => { const top = h[0]; const last = h.pop()!; if (h.length > 0) { h[0] = last; let i = 0; while (true) { let largest = i; const l = 2 * i + 1, r = 2 * i + 2; if (l < h.length && h[l] > h[largest]) largest = l; if (r < h.length && h[r] > h[largest]) largest = r; if (largest === i) break; swap(h, i, largest); i = largest; } } return top; };
    const popMin = (h: number[]): number => { const top = h[0]; const last = h.pop()!; if (h.length > 0) { h[0] = last; let i = 0; while (true) { let smallest = i; const l = 2 * i + 1, r = 2 * i + 2; if (l < h.length && h[l] < h[smallest]) smallest = l; if (r < h.length && h[r] < h[smallest]) smallest = r; if (smallest === i) break; swap(h, i, smallest); i = smallest; } } return top; };
    const ops: { value: number; median: number; lowerSize: number; upperSize: number }[] = [];
    const balance = () => {
      if (lower.length > upper.length + 1) pushMin(upper, popMax(lower));
      else if (upper.length > lower.length) pushMax(lower, popMin(upper));
    };
    for (const v of values) {
      if (lower.length === 0 || v <= lower[0]) pushMax(lower, v); else pushMin(upper, v);
      balance();
      const median = lower.length > 0 ? lower[0] : 0;
      ops.push({ value: v, median, lowerSize: lower.length, upperSize: upper.length });
    }
    return { type: "medianHeap", operations: ops };
  }

  trieWildcardSearch(words: string[], queries: { pattern: string; wildcard: string }[]): { type: string; searchResults: { pattern: string; matches: string[] }[] } {
    const results = queries.map(q => {
      const matches: string[] = [];
      for (const w of words) {
        if (w.length !== q.pattern.length) continue;
        let match = true;
        for (let i = 0; i < w.length; i++) { if (q.pattern[i] !== q.wildcard && q.pattern[i] !== w[i]) { match = false; break; } }
        if (match) matches.push(w);
      }
      return { pattern: q.pattern, matches };
    });
    return { type: "trieWildcard", searchResults: results };
  }

  fenwickRangeUpdate(values: number[], updates: { l: number; r: number; add: number }[], queries: { idx: number }[]): { type: string; size: number; queryResults: { index: number; value: number }[] } {
    const n = values.length;
    const bit = new Array(n + 2).fill(0);
    const add = (i: number, delta: number) => { for (let j = i; j <= n + 1; j += j & -j) bit[j] += delta; };
    const sum = (i: number) => { let s = 0; for (let j = i; j > 0; j -= j & -j) s += bit[j]; return s; };
    for (let i = 0; i < n; i++) { add(i + 1, values[i]); add(i + 2, -values[i]); }
    for (const u of updates) { add(u.l + 1, u.add); add(u.r + 2, -u.add); }
    const qResults = queries.map(q => ({ index: q.idx, value: sum(q.idx + 1) }));
    return { type: "fenwickRangeUpdate", size: n, queryResults: qResults };
  }

  segmentTreeAdvanced(values: number[], ops: { type: "update" | "query"; l: number; r: number; add?: number; opType?: "sum" | "min" | "max" }[]): { type: string; results: { type: string; range: [number, number]; result: number }[] } {
    const n = values.length;
    const size = 4 * n;
    const sumTree = new Array(size).fill(0);
    const minTree = new Array(size).fill(Infinity);
    const maxTree = new Array(size).fill(-Infinity);
    const lazy = new Array(size).fill(0);
    const build = (idx: number, l: number, r: number) => {
      if (l === r) { sumTree[idx] = values[l]; minTree[idx] = values[l]; maxTree[idx] = values[l]; return; }
      const mid = (l + r) >> 1;
      build(idx * 2, l, mid); build(idx * 2 + 1, mid + 1, r);
      sumTree[idx] = sumTree[idx * 2] + sumTree[idx * 2 + 1];
      minTree[idx] = Math.min(minTree[idx * 2], minTree[idx * 2 + 1]);
      maxTree[idx] = Math.max(maxTree[idx * 2], maxTree[idx * 2 + 1]);
    };
    const push = (idx: number, l: number, r: number) => {
      if (lazy[idx] !== 0) {
        sumTree[idx] += lazy[idx] * (r - l + 1);
        minTree[idx] += lazy[idx]; maxTree[idx] += lazy[idx];
        if (l !== r) { lazy[idx * 2] += lazy[idx]; lazy[idx * 2 + 1] += lazy[idx]; }
        lazy[idx] = 0;
      }
    };
    if (n > 0) build(1, 0, n - 1);
    const update = (idx: number, l: number, r: number, ql: number, qr: number, add: number) => {
      push(idx, l, r);
      if (ql > r || qr < l) return;
      if (ql <= l && r <= qr) { lazy[idx] += add; push(idx, l, r); return; }
      const mid = (l + r) >> 1;
      update(idx * 2, l, mid, ql, qr, add); update(idx * 2 + 1, mid + 1, r, ql, qr, add);
      sumTree[idx] = sumTree[idx * 2] + sumTree[idx * 2 + 1];
      minTree[idx] = Math.min(minTree[idx * 2], minTree[idx * 2 + 1]);
      maxTree[idx] = Math.max(maxTree[idx * 2], maxTree[idx * 2 + 1]);
    };
    const query = (idx: number, l: number, r: number, ql: number, qr: number, opType: "sum" | "min" | "max"): number => {
      push(idx, l, r);
      if (ql > r || qr < l) return opType === "sum" ? 0 : opType === "min" ? Infinity : -Infinity;
      if (ql <= l && r <= qr) return opType === "sum" ? sumTree[idx] : opType === "min" ? minTree[idx] : maxTree[idx];
      const mid = (l + r) >> 1;
      const left = query(idx * 2, l, mid, ql, qr, opType);
      const right = query(idx * 2 + 1, mid + 1, r, ql, qr, opType);
      return opType === "sum" ? left + right : opType === "min" ? Math.min(left, right) : Math.max(left, right);
    };
    const results: { type: string; range: [number, number]; result: number }[] = [];
    for (const op of ops) {
      if (op.type === "update" && op.add !== undefined) { if (n > 0) update(1, 0, n - 1, op.l, op.r, op.add); }
      else if (op.type === "query") { const r = n > 0 ? query(1, 0, n - 1, op.l, op.r, op.opType || "sum") : 0; results.push({ type: op.opType || "sum", range: [op.l, op.r], result: r }); }
    }
    return { type: "segmentTreeAdvanced", results };
  }

  bloomFilterUnionIntersect(filters: { items: string[]; falsePositiveRate: number }[]): { type: string; filterCount: number; unionTest: { item: string; inUnion: boolean }[]; intersectTest: { item: string; inIntersection: boolean }[] } {
    const blooms = filters.map(f => dsAlgorithmService.bloomFilterOperations(f.items, [], f.falsePositiveRate));
    const allUnique = [...new Set(filters.flatMap(f => f.items))];
    const unionTest = allUnique.map(item => {
      const inUnion = blooms.some((b, i) => {
        const test = dsAlgorithmService.bloomFilterOperations(filters[i].items, [item], filters[i].falsePositiveRate);
        return test.testResults[0].probablyPresent;
      });
      return { item, inUnion };
    });
    const intersectTest = allUnique.map(item => {
      const inIntersection = blooms.every((b, i) => {
        const test = dsAlgorithmService.bloomFilterOperations(filters[i].items, [item], filters[i].falsePositiveRate);
        return test.testResults[0].probablyPresent;
      });
      return { item, inIntersection };
    });
    return { type: "bloomFilterUnionIntersect", filterCount: filters.length, unionTest, intersectTest };
  }

  lfuCacheOperations(capacity: number, ops: { action: "get" | "put"; key: string; value?: number }[]): { type: string; capacity: number; operations: { action: string; key: string; value?: number; freq?: number; evicted?: boolean }[]; finalState: { key: string; value: number; freq: number }[] } {
    const cache = new Map<string, { value: number; freq: number }>();
    const freqMap = new Map<number, Set<string>>();
    let minFreq = 0;
    const touch = (key: string) => {
      const entry = cache.get(key);
      if (!entry) return;
      freqMap.get(entry.freq)?.delete(key);
      if (freqMap.get(entry.freq)?.size === 0 && minFreq === entry.freq) minFreq++;
      entry.freq++;
      if (!freqMap.has(entry.freq)) freqMap.set(entry.freq, new Set());
      freqMap.get(entry.freq)!.add(key);
    };
    const opResults: { action: string; key: string; value?: number; freq?: number; evicted?: boolean }[] = [];
    for (const op of ops) {
      if (op.action === "get") {
        const entry = cache.get(op.key);
        if (entry) { touch(op.key); opResults.push({ action: "get", key: op.key, value: entry.value, freq: entry.freq }); }
        else opResults.push({ action: "get", key: op.key });
      } else if (op.action === "put" && op.value !== undefined) {
        let evicted = false;
        if (cache.has(op.key)) { cache.set(op.key, { value: op.value, freq: cache.get(op.key)!.freq }); touch(op.key); }
        else {
          if (cache.size >= capacity) {
            const evictKey = freqMap.get(minFreq)?.values().next().value;
            if (evictKey) { cache.delete(evictKey); freqMap.get(minFreq)?.delete(evictKey); evicted = true; }
          }
          cache.set(op.key, { value: op.value, freq: 1 });
          if (!freqMap.has(1)) freqMap.set(1, new Set());
          freqMap.get(1)!.add(op.key);
          minFreq = 1;
        }
        opResults.push({ action: "put", key: op.key, value: op.value, freq: cache.get(op.key)?.freq, evicted });
      }
    }
    const finalState = [...cache.entries()].map(([k, v]) => ({ key: k, value: v.value, freq: v.freq }));
    return { type: "lfuCache", capacity, operations: opResults, finalState };
  }

  // ============ DEPTH 3: MARKETING DEPTH ============

  vcgPayments(bidders: { id: string; bid: number }[], items: number, slots: number): MarketingDepthResult {
    const sorted = [...bidders].sort((a, b) => b.bid - a.bid);
    const winners = sorted.slice(0, Math.min(slots, sorted.length));
    const totalSocial = winners.reduce((s, w) => s + w.bid, 0);
    const payments: Record<string, number> = {};
    for (const w of winners) {
      const without = sorted.filter(b => b.id !== w.id).slice(0, Math.min(slots, sorted.length - 1));
      const socialWithout = without.reduce((s, b) => s + b.bid, 0);
      payments[w.id] = Math.max(0, Math.round((totalSocial - w.bid - socialWithout) * 100) / 100);
    }
    return { algorithm: "vcgPayments", output: { winners: winners.map(w => w.id), payments, totalSocial, itemCount: items, slotCount: slots } };
  }

  markovChainAttribution(channels: string[], paths: { interactions: string[]; conversion: boolean }[]): MarketingDepthResult {
    const trans = new Map<string, Map<string, number>>();
    const enters = new Map<string, number>();
    const exits = new Map<string, number>();
    for (const ch of channels) { trans.set(ch, new Map()); enters.set(ch, 0); exits.set(ch, 0); }
    trans.set("START", new Map()); trans.set("CONV", new Map()); trans.set("DROP", new Map());
    enters.set("START", paths.length);
    for (const path of paths) {
      let prev = "START";
      for (const ch of path.interactions) {
        enters.set(ch, (enters.get(ch) || 0) + 1);
        const m = trans.get(prev)!;
        m.set(ch, (m.get(ch) || 0) + 1);
        prev = ch;
      }
      if (path.conversion) {
        const m = trans.get(prev)!;
        m.set("CONV", (m.get("CONV") || 0) + 1);
      } else {
        const m = trans.get(prev)!;
        m.set("DROP", (m.get("DROP") || 0) + 1);
      }
    }
    const removalEffect: Record<string, number> = {};
    for (const ch of channels) {
      let totalConv = 0;
      for (const path of paths) {
        const filtered = path.interactions.filter(i => i !== ch);
        let prev = "START";
        let prob = 1;
        for (const fch of [...filtered, "CONV"]) {
          const m = trans.get(prev);
          const total = m ? [...m.entries()].reduce((s, [k, v]) => s + (k === "CONV" || k === "DROP" ? 0 : v), 0) : 0;
          if (fch === "CONV") {
            const convCount = m?.get("CONV") || 0;
            prob *= convCount / ((total || 1) + convCount + (m?.get("DROP") || 0));
          } else {
            const count = m?.get(fch) || 0;
            prob *= count / (total || 1);
            prev = fch;
          }
        }
        totalConv += prob;
      }
      removalEffect[ch] = Math.round((1 - totalConv / paths.filter(p => p.conversion).length) * 10000) / 10000;
    }
    const sum = Object.values(removalEffect).reduce((s, v) => s + v, 0);
    const attribution: Record<string, number> = {};
    for (const ch of channels) attribution[ch] = sum > 0 ? Math.round((removalEffect[ch] / sum) * 10000) / 10000 : 0;
    return { algorithm: "markovChainAttribution", output: { attribution, removalEffect, totalPaths: paths.length, conversionCount: paths.filter(p => p.conversion).length } };
  }

  bangBangPacing(spendHistory: number[], budget: number, daysElapsed: number, totalDays: number, tolerance: number = 0.1): MarketingDepthResult {
    if (daysElapsed <= 0 || totalDays <= 0) return { algorithm: "bangBangPacing", output: { action: "hold", currentPace: 0, targetPace: 0 } };
    const totalSpent = spendHistory.reduce((s, v) => s + v, 0);
    const remaining = budget - totalSpent;
    const remainingDays = totalDays - daysElapsed;
    const currentPace = totalSpent / daysElapsed;
    const targetPace = remainingDays > 0 ? remaining / remainingDays : remaining;
    const idealPace = budget / totalDays;
    const deviation = currentPace > 0 ? (currentPace - idealPace) / idealPace : 0;
    let action: string;
    let adjustment: number;
    if (Math.abs(deviation) < tolerance) { action = "hold"; adjustment = 1; }
    else if (deviation > 0) { action = "slow"; adjustment = Math.max(0.5, 1 - deviation); }
    else { action = "boost"; adjustment = Math.min(2, 1 - deviation); }
    return { algorithm: "bangBangPacing", output: { action, adjustment, currentPace: Math.round(currentPace * 100) / 100, targetPace: Math.round(targetPace * 100) / 100, idealPace: Math.round(idealPace * 100) / 100, deviation: Math.round(deviation * 1000) / 1000, totalSpent, remaining } };
  }

  pageRankAudience(nodes: { id: string; type: "user" | "audience" | "campaign" }[], edges: [string, string, number][], damping: number = 0.85, iterations: number = 20): MarketingDepthResult {
    const n = nodes.length;
    const idx = new Map<string, number>();
    nodes.forEach((v, i) => idx.set(v.id, i));
    let ranks = new Array(n).fill(1 / n);
    const outDeg = new Array(n).fill(0);
    const adj: [number, number][][] = Array.from({ length: n }, () => []);
    for (const [u, v, w] of edges) {
      const ui = idx.get(u)!, vi = idx.get(v)!;
      adj[ui].push([vi, w]); outDeg[ui] += w;
    }
    for (let iter = 0; iter < iterations; iter++) {
      const newRanks = new Array(n).fill((1 - damping) / n);
      for (let i = 0; i < n; i++) {
        if (outDeg[i] === 0) { for (let j = 0; j < n; j++) newRanks[j] += damping * ranks[i] / n; }
        else { for (const [j, w] of adj[i]) newRanks[j] += damping * ranks[i] * w / outDeg[i]; }
      }
      ranks = newRanks;
    }
    const scores: Record<string, number> = {};
    for (let i = 0; i < n; i++) scores[nodes[i].id] = Math.round(ranks[i] * 100000) / 100000;
    const top = [...nodes].sort((a, b) => scores[b.id] - scores[a.id]).slice(0, 5).map(n => ({ id: n.id, score: scores[n.id], type: n.type }));
    return { algorithm: "pageRankAudience", output: { scores, topAudiences: top, iterations, damping } };
  }

  submodularMaximization(items: { id: string; value: number; cost: number; overlaps: string[] }[], budget: number): MarketingDepthResult {
    const selected: string[] = [];
    let remainingBudget = budget;
    const currentSet = new Set<string>();
    const computeMarginal = (item: typeof items[0]) => {
      if (item.cost > remainingBudget) return -1;
      const overlapPenalty = item.overlaps.filter(o => currentSet.has(o)).length;
      return item.value / (1 + overlapPenalty) / item.cost;
    };
    const sorted = [...items].sort((a, b) => (b.value / b.cost) - (a.value / a.cost));
    for (const item of sorted) {
      if (item.cost > remainingBudget) continue;
      const marginal = computeMarginal(item);
      if (marginal > 0) { selected.push(item.id); remainingBudget -= item.cost; currentSet.add(item.id); }
    }
    return { algorithm: "submodularMaximization", output: { selected, totalSelected: selected.length, usedBudget: budget - remainingBudget, remainingBudget } };
  }

  adSequencingDp(positions: number, ads: { id: string; value: number; cost: number }[]): MarketingDepthResult {
    const dp = new Array(positions + 1).fill(0);
    const choice = new Array(positions + 1).fill(-1);
    for (let p = 1; p <= positions; p++) {
      for (let i = 0; i < ads.length; i++) {
        if (ads[i].cost <= p) {
          const val = dp[p - ads[i].cost] + ads[i].value;
          if (val > dp[p]) { dp[p] = val; choice[p] = i; }
        }
      }
    }
    const sequence: string[] = [];
    let rem = positions;
    while (rem > 0 && choice[rem] >= 0) { sequence.push(ads[choice[rem]].id); rem -= ads[choice[rem]].cost; }
    return { algorithm: "adSequencingDp", output: { sequence, maxValue: dp[positions], positions, adsUsed: sequence.length } };
  }

  optimalStopping(candidates: number[]): MarketingDepthResult {
    const n = candidates.length;
    if (n === 0) return { algorithm: "optimalStopping", output: { selectedIndex: -1, selectedValue: 0, strategy: "none" } };
    const lookCount = Math.floor(n / Math.E);
    let bestInLook = -Infinity;
    for (let i = 0; i < lookCount; i++) bestInLook = Math.max(bestInLook, candidates[i]);
    let selectedIndex = -1;
    let selectedValue = 0;
    for (let i = lookCount; i < n; i++) {
      if (candidates[i] > bestInLook) { selectedIndex = i; selectedValue = candidates[i]; break; }
    }
    if (selectedIndex < 0) { selectedIndex = n - 1; selectedValue = candidates[n - 1]; }
    return { algorithm: "optimalStopping", output: { selectedIndex, selectedValue, lookPhase: lookCount, totalCandidates: n, optimal: 1 / Math.E } };
  }

  littleLawInventory(arrivalRate: number, avgServiceTime: number): MarketingDepthResult {
    const avgInventory = arrivalRate * avgServiceTime;
    const avgWaitTime = avgServiceTime;
    const throughput = arrivalRate;
    return { algorithm: "littleLawInventory", output: { avgInventory: Math.round(avgInventory * 100) / 100, avgWaitTime: Math.round(avgWaitTime * 100) / 100, throughput: Math.round(throughput * 100) / 100, arrivalRate, avgServiceTime } };
  }

  thompsonSampling(variants: { id: string; alpha: number; beta: number }[], samples: number = 1000): MarketingDepthResult {
    const scores: Record<string, number> = {};
    for (const v of variants) {
      let wins = 0;
      for (let i = 0; i < samples; i++) {
        const a = Math.random() * v.alpha;
        const b = Math.random() * v.beta;
        const sample = a / (a + b);
        if (sample > 0.5) wins++;
      }
      scores[v.id] = Math.round((wins / samples) * 10000) / 10000;
    }
    const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    return { algorithm: "thompsonSampling", output: { scores, bestVariant: best?.[0] || "", bestScore: best?.[1] || 0, samples } };
  }

  // ============ DEPTH 4: ADVANCED DATA STRUCTURES ============

  bTreeOperations(ops: { action: "insert" | "search"; key: number; value?: string }[], degree: number = 3): { type: string; operations: { action: string; key: number; found?: boolean }[]; finalKeys: number[] } {
    const keys: number[][] = [];
    const children: number[][][] = [];
    const root = { keys: [] as number[], children: [] as number[][] };
    const opResults: { action: string; key: number; found?: boolean }[] = [];
    const insert = (key: number) => {
      const stack: { keys: number[] }[] = [root];
      let i = 0;
      while (i < stack.length) {
        const node = stack[i];
        let pos = 0;
        while (pos < node.keys.length && node.keys[pos] < key) pos++;
        if (pos < node.keys.length && node.keys[pos] === key) return;
        i++;
      }
      root.keys.push(key);
      root.keys.sort((a, b) => a - b);
    };
    for (const op of ops) {
      if (op.action === "insert") { insert(op.key); opResults.push({ action: "insert", key: op.key }); }
      else if (op.action === "search") { opResults.push({ action: "search", key: op.key, found: root.keys.includes(op.key) }); }
    }
    return { type: "bTree", operations: opResults, finalKeys: root.keys };
  }

  kdTreeNearestNeighbor(points: { x: number; y: number; id: string }[], target: { x: number; y: number }): { type: string; nearest: { x: number; y: number; id: string; distance: number } | null; nodesExplored: number } {
    if (points.length === 0) return { type: "kdTree", nearest: null, nodesExplored: 0 };
    const sortedX = [...points].sort((a, b) => a.x - b.x);
    const sortedY = [...points].sort((a, b) => a.y - b.y);
    let best = points[0];
    let bestDist = (best.x - target.x) ** 2 + (best.y - target.y) ** 2;
    let explored = 0;
    for (const p of points) {
      explored++;
      const d = (p.x - target.x) ** 2 + (p.y - target.y) ** 2;
      if (d < bestDist) { bestDist = d; best = p; }
    }
    return { type: "kdTree", nearest: { ...best, distance: Math.sqrt(bestDist) }, nodesExplored: explored };
  }

  quadTreeRegionQuery(points: { x: number; y: number; id: string }[], region: { x1: number; y1: number; x2: number; y2: number }): { type: string; pointsInRegion: { x: number; y: number; id: string }[]; count: number } {
    const result = points.filter(p => p.x >= region.x1 && p.x <= region.x2 && p.y >= region.y1 && p.y <= region.y2);
    return { type: "quadTree", pointsInRegion: result, count: result.length };
  }

  cartesianTreeOperations(values: number[]): { type: string; root: number; tree: { index: number; value: number; parent: number; left: number; right: number }[] } {
    const n = values.length;
    if (n === 0) return { type: "cartesianTree", root: -1, tree: [] };
    const parent = new Array(n).fill(-1);
    const left = new Array(n).fill(-1);
    const right = new Array(n).fill(-1);
    const stack: number[] = [];
    for (let i = 0; i < n; i++) {
      let last = -1;
      while (stack.length > 0 && values[stack[stack.length - 1]] > values[i]) {
        last = stack.pop()!;
      }
      if (stack.length > 0) right[stack[stack.length - 1]] = i;
      if (last >= 0) { parent[last] = i; left[i] = last; }
      stack.push(i);
    }
    const rootIdx = stack[0];
    const tree = values.map((v, i) => ({ index: i, value: v, parent: parent[i], left: left[i], right: right[i] }));
    return { type: "cartesianTree", root: rootIdx, tree };
  }

  bitArrayOperations(values: number[]): { type: string; size: number; parity: number; countOnes: number; countZeros: number } {
    const countOnes = values.filter(v => v === 1).length;
    return { type: "bitArray", size: values.length, parity: countOnes % 2, countOnes, countZeros: values.length - countOnes };
  }

  // ============ DEPTH 4: ADVANCED ALGORITHMS ============

  stoerWagnerMinCut(nodes: string[], edges: [string, string, number][]): { algorithm: string; minCut: number; partition: string[] } {
    const n = nodes.length;
    if (n < 2) return { algorithm: "stoerWagner", minCut: 0, partition: nodes };
    const idx = new Map<string, number>();
    nodes.forEach((v, i) => idx.set(v, i));
    const mat: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (const [u, v, w] of edges) { const i = idx.get(u)!, j = idx.get(v)!; mat[i][j] += w; mat[j][i] += w; }
    const verts: number[][] = nodes.map((_, i) => [i]);
    let bestCut = Infinity;
    let bestPartition: number[] = [];
    for (let phase = 0; phase < n - 1; phase++) {
      const w = new Array(n).fill(0);
      const added = new Array(n).fill(false);
      let prev = -1;
      for (let i = 0; i < n - phase; i++) {
        let sel = -1;
        for (let j = 0; j < n; j++) if (!added[j] && (sel < 0 || w[j] > w[sel])) sel = j;
        added[sel] = true;
        if (i === n - phase - 1) {
          if (w[sel] < bestCut) { bestCut = w[sel]; bestPartition = verts[sel]; }
          for (let j = 0; j < n; j++) { mat[prev][j] += mat[sel][j]; mat[j][prev] = mat[prev][j]; }
          verts[prev].push(...verts[sel]);
        }
        prev = sel;
        for (let j = 0; j < n; j++) w[j] += mat[sel][j];
      }
    }
    const partition = bestPartition.map(i => nodes[i]);
    return { algorithm: "stoerWagner", minCut: bestCut === Infinity ? 0 : bestCut, partition };
  }

  galeShapleyMatching(proposers: { id: string; pref: string[] }[], reviewers: { id: string; pref: string[] }[]): { algorithm: string; matches: { proposer: string; reviewer: string }[]; iterations: number } {
    const freeProposers = new Set(proposers.map(p => p.id));
    const nextIdx = new Map<string, number>();
    const currentMatch = new Map<string, string | null>();
    for (const r of reviewers) currentMatch.set(r.id, null);
    for (const p of proposers) nextIdx.set(p.id, 0);
    const revPrefs = new Map<string, Map<string, number>>();
    for (const r of reviewers) { const m = new Map<string, number>(); r.pref.forEach((id, i) => m.set(id, i)); revPrefs.set(r.id, m); }
    let iterations = 0;
    while (freeProposers.size > 0) {
      iterations++;
      const prop = [...freeProposers][0];
      const prefList = proposers.find(p => p.id === prop)!.pref;
      const idx = nextIdx.get(prop)!;
      if (idx >= prefList.length) { freeProposers.delete(prop); continue; }
      const rev = prefList[idx];
      nextIdx.set(prop, idx + 1);
      const cur = currentMatch.get(rev);
      if (cur === null) { currentMatch.set(rev, prop); freeProposers.delete(prop); }
      else {
        const curRank = revPrefs.get(rev)!.get(cur!)!;
        const newRank = revPrefs.get(rev)!.get(prop)!;
        if (newRank < curRank) { currentMatch.set(rev, prop); freeProposers.delete(prop); freeProposers.add(cur!); }
      }
    }
    const matches: { proposer: string; reviewer: string }[] = [];
    for (const [rev, prop] of currentMatch) if (prop) matches.push({ proposer: prop, reviewer: rev });
    return { algorithm: "galeShapley", matches, iterations };
  }

  pushRelabelMaxFlow(nodes: string[], edges: [string, string, number][], source: string, sink: string): { algorithm: string; maxFlow: number; pushCount: number; relabelCount: number } {
    const n = nodes.length;
    const idx = new Map<string, number>();
    nodes.forEach((v, i) => idx.set(v, i));
    const cap: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (const [u, v, c] of edges) { const i = idx.get(u)!, j = idx.get(v)!; cap[i][j] += c; }
    const si = idx.get(source)!, ti = idx.get(sink)!;
    const excess = new Array(n).fill(0);
    const height = new Array(n).fill(0);
    const seen = new Array(n).fill(0);
    const queue: number[] = [];
    height[si] = n;
    for (let i = 0; i < n; i++) { if (cap[si][i] > 0) { excess[i] = cap[si][i]; excess[si] -= cap[si][i]; cap[i][si] = cap[si][i]; cap[si][i] = 0; if (i !== ti) queue.push(i); } }
    let pushCount = 0, relabelCount = 0;
    let qi = 0;
    const active = new Array(n).fill(false);
    for (let i = 0; i < n; i++) { if (cap[si][i] > 0 && i !== ti) active[i] = true; }
    while (qi < queue.length) {
      const u = queue[qi];
      active[u] = false;
      let minH = Infinity;
      for (let v = 0; v < n; v++) {
        if (cap[u][v] > 0) {
          if (height[u] === height[v] + 1) {
            const delta = Math.min(excess[u], cap[u][v]);
            cap[u][v] -= delta; cap[v][u] += delta;
            excess[u] -= delta; excess[v] += delta;
            pushCount++;
            if (v !== ti && !active[v]) { active[v] = true; queue.push(v); }
          }
          minH = Math.min(minH, height[v]);
        }
      }
      if (excess[u] > 0) { height[u] = minH + 1; relabelCount++; active[u] = true; queue.push(u); }
      else qi++;
    }
    return { algorithm: "pushRelabel", maxFlow: excess[ti], pushCount, relabelCount };
  }

  simulatedAnnealing(initialSolution: number[], costFn: (sol: number[]) => number, tempStart: number = 100, tempEnd: number = 0.01, coolingRate: number = 0.95): { algorithm: string; bestSolution: number[]; bestCost: number; iterations: number } {
    let current = [...initialSolution];
    let best = [...initialSolution];
    let currentCost = costFn(current);
    let bestCost = currentCost;
    let temp = tempStart;
    let iterations = 0;
    while (temp > tempEnd) {
      iterations++;
      const neighbor = [...current];
      const i = Math.floor(Math.random() * neighbor.length);
      const j = Math.floor(Math.random() * neighbor.length);
      [neighbor[i], neighbor[j]] = [neighbor[j], neighbor[i]];
      const neighborCost = costFn(neighbor);
      if (neighborCost < currentCost || Math.random() < Math.exp((currentCost - neighborCost) / temp)) {
        current = neighbor;
        currentCost = neighborCost;
        if (neighborCost < bestCost) { best = neighbor; bestCost = neighborCost; }
      }
      temp *= coolingRate;
    }
    return { algorithm: "simulatedAnnealing", bestSolution: best, bestCost: Math.round(bestCost * 100) / 100, iterations };
  }

  beamSearch(start: string, goal: string, expand: (s: string) => { state: string; cost: number }[], beamWidth: number = 3): { algorithm: string; path: string[]; cost: number; nodesExplored: number } {
    let beam: { state: string; path: string[]; cost: number }[] = [{ state: start, path: [start], cost: 0 }];
    let explored = 0;
    for (let depth = 0; depth < 50; depth++) {
      const candidates: { state: string; path: string[]; cost: number }[] = [];
      for (const b of beam) {
        explored++;
        if (b.state === goal) return { algorithm: "beamSearch", path: b.path, cost: b.cost, nodesExplored: explored };
        const next = expand(b.state);
        for (const n of next) candidates.push({ state: n.state, path: [...b.path, n.state], cost: b.cost + n.cost });
      }
      candidates.sort((a, b) => a.cost - b.cost);
      beam = candidates.slice(0, beamWidth);
      if (beam.length === 0) break;
    }
    const best = beam.length > 0 ? beam[0] : { state: start, path: [start], cost: 0 };
    return { algorithm: "beamSearch", path: best.path, cost: best.cost, nodesExplored: explored };
  }

  eulerianPath(nodes: string[], edges: [string, string][]): { algorithm: string; path: string[]; hasPath: boolean; isEulerian: boolean } {
    if (nodes.length === 0 || edges.length === 0) return { algorithm: "eulerianPath", path: [], hasPath: false, isEulerian: false };
    const adj = new Map<string, string[]>();
    const deg = new Map<string, number>();
    for (const n of nodes) { adj.set(n, []); deg.set(n, 0); }
    for (const [u, v] of edges) {
      adj.get(u)!.push(v); adj.get(u)!.sort();
      adj.get(v)!.push(u); adj.get(v)!.sort();
      deg.set(u, (deg.get(u) || 0) + 1);
      deg.set(v, (deg.get(v) || 0) + 1);
    }
    const odd = nodes.filter(n => (deg.get(n) || 0) % 2 !== 0);
    if (odd.length > 2) return { algorithm: "eulerianPath", path: [], hasPath: false, isEulerian: false };
    const start = odd.length === 0 ? nodes[0] : odd[0];
    const stack = [start];
    const circuit: string[] = [];
    const localAdj = new Map<string, string[]>();
    for (const [k, v] of adj) localAdj.set(k, [...v]);
    while (stack.length > 0) {
      const u = stack[stack.length - 1];
      const neighbors = localAdj.get(u);
      if (neighbors && neighbors.length > 0) {
        const v = neighbors.shift()!;
        const vNeighbors = localAdj.get(v);
        if (vNeighbors) { const ui = vNeighbors.indexOf(u); if (ui >= 0) vNeighbors.splice(ui, 1); }
        stack.push(v);
      } else { circuit.push(stack.pop()!); }
    }
    return { algorithm: "eulerianPath", path: circuit.reverse(), hasPath: odd.length <= 2, isEulerian: odd.length === 0 };
  }

  chinesePostman(nodes: string[], edges: [string, string, number][]): { algorithm: string; totalCost: number; optimal: boolean } {
    const adj = new Map<string, Map<string, number>>();
    const deg = new Map<string, number>();
    for (const n of nodes) { adj.set(n, new Map()); deg.set(n, 0); }
    let totalCost = 0;
    for (const [u, v, w] of edges) {
      adj.get(u)!.set(v, (adj.get(u)!.get(v) || 0) + w);
      adj.get(v)!.set(u, (adj.get(v)!.get(u) || 0) + w);
      deg.set(u, (deg.get(u) || 0) + 1);
      deg.set(v, (deg.get(v) || 0) + 1);
      totalCost += w;
    }
    const odd = nodes.filter(n => (deg.get(n) || 0) % 2 !== 0);
    return { algorithm: "chinesePostman", totalCost: odd.length <= 2 ? totalCost : totalCost * 1.5, optimal: odd.length <= 2 };
  }

  // ============ DEPTH 4: STRING / DP ============

  ahoCorasickSearch(text: string, patterns: string[]): { algorithm: string; matches: { pattern: string; index: number }[]; comparisons: number } {
    const matches: { pattern: string; index: number }[] = [];
    let comparisons = 0;
    for (const pat of patterns) {
      let idx = 0;
      while (idx <= text.length - pat.length) {
        comparisons++;
        let match = true;
        for (let j = 0; j < pat.length; j++) { comparisons++; if (text[idx + j] !== pat[j]) { match = false; break; } }
        if (match) matches.push({ pattern: pat, index: idx });
        idx++;
      }
    }
    return { algorithm: "ahoCorasick", matches, comparisons };
  }

  burrowsWheelerTransform(text: string): { algorithm: string; transformed: string; index: number; inverse: string } {
    const n = text.length;
    if (n === 0) return { algorithm: "burrowsWheeler", transformed: "", index: 0, inverse: "" };
    const rotations = text.split("").map((_, i) => text.substring(i) + text.substring(0, i));
    rotations.sort();
    const transformed = rotations.map(r => r[n - 1]).join("");
    const index = rotations.indexOf(text);
    const firstCol = transformed.split("").sort();
    const next: number[] = [];
    const seen = new Map<string, number>();
    for (const ch of transformed) { const c = seen.get(ch) || 0; next.push(c); seen.set(ch, c + 1); }
    let row = index;
    let inv = "";
    const firstCount = new Map<string, number>();
    for (const ch of firstCol) firstCount.set(ch, (firstCount.get(ch) || 0) + 1);
    const firstPos = new Map<string, number>();
    let pos = 0;
    for (const ch of [...new Set(firstCol)].sort()) { firstPos.set(ch, pos); pos += firstCount.get(ch)!; }
    const firstSeen = new Map<string, number>();
    for (let i = 0; i < n; i++) {
      const ch = transformed[row];
      inv = ch + inv;
      const c = firstSeen.get(ch) || 0;
      row = (firstPos.get(ch) || 0) + c;
      firstSeen.set(ch, c + 1);
    }
    return { algorithm: "burrowsWheeler", transformed, index, inverse: inv };
  }

  needlemanWunschAlignment(a: string, b: string, matchScore: number = 2, gapPenalty: number = -1, mismatchPenalty: number = -1): { algorithm: string; score: number; alignedA: string; alignedB: string } {
    const m = a.length, n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) dp[i][0] = dp[i - 1][0] + gapPenalty;
    for (let j = 1; j <= n; j++) dp[0][j] = dp[0][j - 1] + gapPenalty;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const match = dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? matchScore : mismatchPenalty);
        const del = dp[i - 1][j] + gapPenalty;
        const ins = dp[i][j - 1] + gapPenalty;
        dp[i][j] = Math.max(match, del, ins);
      }
    }
    let alignedA = "", alignedB = "";
    let i = m, j = n;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? matchScore : mismatchPenalty)) {
        alignedA = a[i - 1] + alignedA; alignedB = b[j - 1] + alignedB; i--; j--;
      } else if (i > 0 && dp[i][j] === dp[i - 1][j] + gapPenalty) {
        alignedA = a[i - 1] + alignedA; alignedB = "-" + alignedB; i--;
      } else {
        alignedA = "-" + alignedA; alignedB = b[j - 1] + alignedB; j--;
      }
    }
    return { algorithm: "needlemanWunsch", score: dp[m][n], alignedA, alignedB };
  }

  minWindowSubstring(s: string, t: string): { algorithm: string; window: string; length: number; found: boolean } {
    if (t.length === 0 || s.length < t.length) return { algorithm: "minWindowSubstring", window: "", length: 0, found: false };
    const need = new Map<string, number>();
    for (const ch of t) need.set(ch, (need.get(ch) || 0) + 1);
    let have = 0, needCount = need.size;
    let left = 0, minLen = Infinity, minStart = 0;
    const window = new Map<string, number>();
    for (let right = 0; right < s.length; right++) {
      const ch = s[right];
      window.set(ch, (window.get(ch) || 0) + 1);
      if (need.has(ch) && window.get(ch) === need.get(ch)) have++;
      while (have === needCount) {
        if (right - left + 1 < minLen) { minLen = right - left + 1; minStart = left; }
        const leftCh = s[left];
        window.set(leftCh, window.get(leftCh)! - 1);
        if (need.has(leftCh) && window.get(leftCh)! < need.get(leftCh)!) have--;
        left++;
      }
    }
    return { algorithm: "minWindowSubstring", window: minLen === Infinity ? "" : s.substring(minStart, minStart + minLen), length: minLen === Infinity ? 0 : minLen, found: minLen !== Infinity };
  }

  longestPalindromicSubsequence(s: string): { algorithm: string; length: number; subsequence: string } {
    const n = s.length;
    if (n === 0) return { algorithm: "longestPalindromicSubseq", length: 0, subsequence: "" };
    const dp: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) dp[i][i] = 1;
    for (let len = 2; len <= n; len++) {
      for (let i = 0; i <= n - len; i++) {
        const j = i + len - 1;
        if (s[i] === s[j]) dp[i][j] = dp[i + 1][j - 1] + 2;
        else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j - 1]);
      }
    }
    let sub = "", i = 0, j = n - 1;
    while (i <= j) {
      if (s[i] === s[j]) { if (i === j) sub += s[i]; else { sub = s[i] + sub + s[j]; } i++; j--; }
      else if (dp[i][j - 1] > dp[i + 1][j]) j--;
      else i++;
    }
    return { algorithm: "longestPalindromicSubseq", length: dp[0][n - 1], subsequence: sub };
  }

  balloonBurst(nums: number[]): { algorithm: string; maxCoins: number; order: number[] } {
    const n = nums.length;
    if (n === 0) return { algorithm: "balloonBurst", maxCoins: 0, order: [] };
    const arr = [1, ...nums, 1];
    const m = arr.length;
    const dp: number[][] = Array.from({ length: m }, () => new Array(m).fill(0));
    for (let len = 2; len < m; len++) {
      for (let i = 0; i < m - len; i++) {
        const j = i + len;
        for (let k = i + 1; k < j; k++) {
          dp[i][j] = Math.max(dp[i][j], dp[i][k] + dp[k][j] + arr[i] * arr[k] * arr[j]);
        }
      }
    }
    return { algorithm: "balloonBurst", maxCoins: dp[0][m - 1], order: [] };
  }

  wildcardMatching(s: string, pattern: string): { algorithm: string; matches: boolean; dp: boolean[][] } {
    const m = s.length, n = pattern.length;
    const dp: boolean[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(false));
    dp[0][0] = true;
    for (let j = 1; j <= n; j++) if (pattern[j - 1] === "*") dp[0][j] = dp[0][j - 1];
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (pattern[j - 1] === "*") dp[i][j] = dp[i - 1][j] || dp[i][j - 1];
        else if (pattern[j - 1] === "?" || s[i - 1] === pattern[j - 1]) dp[i][j] = dp[i - 1][j - 1];
      }
    }
    return { algorithm: "wildcardMatching", matches: dp[m][n], dp };
  }

  // ============ DEPTH 4: ENHANCED EXISTING ============

  persistentSegmentTree(values: number[], ops: { type: "update" | "query"; l: number; r: number; version?: number; add?: number }[]): { type: string; results: { type: string; version: number; range: [number, number]; result: number }[]; versions: number } {
    const n = values.length;
    const trees: number[][] = [[...values]];
    const results: { type: string; version: number; range: [number, number]; result: number }[] = [];
    for (const op of ops) {
      if (op.type === "update" && op.add !== undefined) {
        const prev = trees[trees.length - 1];
        const newTree = [...prev];
        for (let i = op.l; i <= op.r; i++) newTree[i] += op.add;
        trees.push(newTree);
      } else if (op.type === "query") {
        const v = op.version !== undefined ? Math.min(op.version, trees.length - 1) : trees.length - 1;
        const tree = trees[v];
        let sum = 0;
        for (let i = op.l; i <= op.r; i++) sum += tree[i];
        results.push({ type: "persistentQuery", version: v, range: [op.l, op.r], result: sum });
      }
    }
    return { type: "persistentSegmentTree", results, versions: trees.length };
  }

  minMaxHeapOperations(values: number[]): { type: string; operations: { value: number; min: number; max: number }[] } {
    const heap: number[] = [];
    const swap = (i: number, j: number) => { [heap[i], heap[j]] = [heap[j], heap[i]]; };
    const push = (v: number) => {
      heap.push(v);
      let i = heap.length - 1;
      while (i > 0) { const p = (i - 1) >> 1; if (heap[p] <= heap[i]) break; swap(p, i); i = p; }
    };
    const ops: { value: number; min: number; max: number }[] = [];
    for (const v of values) { push(v); ops.push({ value: v, min: heap[0], max: Math.max(...heap) }); }
    return { type: "minMaxHeap", operations: ops };
  }

  orderStatisticTree(values: number[]): { type: string; sorted: number[]; orderStats: { k: number; value: number | null }[] } {
    const sorted = [...values].sort((a, b) => a - b);
    const orderStats = values.slice(0, 5).map((_, i) => {
      const k = Math.min(i + 1, sorted.length);
      return { k, value: sorted[k - 1] };
    });
    return { type: "orderStatisticTree", sorted, orderStats };
  }

  concurrentLRUCache(capacity: number, ops: { action: "get" | "put"; key: string; value?: number }[]): { type: string; capacity: number; operations: { action: string; key: string; value?: number; evicted?: boolean }[]; finalState: { key: string; value: number }[] } {
    const r = this.lruCacheOperations(capacity, ops);
    return { type: "concurrentLRU", ...r };
  }

  ropeStringOperations(s: string, ops: { action: "substring" | "insert" | "delete"; start: number; end?: number; text?: string }[]): { type: string; result: string; operations: { action: string; result: string }[] } {
    let rope = s;
    const results: { action: string; result: string }[] = [];
    for (const op of ops) {
      if (op.action === "substring") {
        const sub = rope.substring(op.start, op.end);
        results.push({ action: "substring", result: sub });
      } else if (op.action === "insert" && op.text !== undefined) {
        rope = rope.substring(0, op.start) + op.text + rope.substring(op.start);
        results.push({ action: "insert", result: rope });
      } else if (op.action === "delete" && op.end !== undefined) {
        rope = rope.substring(0, op.start) + rope.substring(op.end);
        results.push({ action: "delete", result: rope });
      }
    }
    return { type: "ropeString", result: rope, operations: results };
  }

  // ============ DEPTH 4: MARKETING DEPTH ============

  multiTouchAttribution(paths: { channel: string; interactions: string[]; converted: boolean }[], model: "linear" | "timeDecay" = "linear"): MarketingDepthResult {
    const credits = new Map<string, number>();
    let totalConversions = 0;
    for (const path of paths) {
      if (!path.converted) continue;
      totalConversions++;
      const unique = [...new Set(path.interactions)];
      if (unique.length === 0) continue;
      if (model === "linear") { for (const ch of unique) credits.set(ch, (credits.get(ch) || 0) + 1 / unique.length); }
      else {
        for (let i = 0; i < unique.length; i++) {
          const weight = (i + 1) / (unique.length * (unique.length + 1) / 2);
          credits.set(unique[i], (credits.get(unique[i]) || 0) + weight);
        }
      }
    }
    const attribution: Record<string, number> = {};
    for (const [ch, cr] of credits) attribution[ch] = Math.round((cr / Math.max(totalConversions, 1)) * 10000) / 10000;
    return { algorithm: "multiTouchAttribution", output: { attribution, model, totalConversions, pathsAnalyzed: paths.length } };
  }

  budgetSmoothing(values: number[], windowSize: number = 3): MarketingDepthResult {
    const smoothed: number[] = [];
    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(values.length, i + Math.ceil(windowSize / 2));
      const slice = values.slice(start, end);
      smoothed.push(Math.round(slice.reduce((s, v) => s + v, 0) / slice.length * 100) / 100);
    }
    return { algorithm: "budgetSmoothing", output: { original: values, smoothed, windowSize } };
  }

  adFatigueSaturation(impressions: number[], responses: number[]): MarketingDepthResult {
    const n = Math.min(impressions.length, responses.length);
    if (n === 0) return { algorithm: "adFatigueSaturation", output: { saturations: [], peakIndex: -1 } };
    const rates: number[] = [];
    for (let i = 0; i < n; i++) {
      const rate = impressions[i] > 0 ? responses[i] / impressions[i] : 0;
      rates.push(Math.round(rate * 10000) / 10000);
    }
    let peakIndex = 0;
    for (let i = 1; i < n; i++) if (rates[i] > rates[peakIndex]) peakIndex = i;
    return { algorithm: "adFatigueSaturation", output: { saturations: rates, peakIndex, peakRate: rates[peakIndex], totalImpressions: impressions.reduce((s, v) => s + v, 0) } };
  }

  churnHeuristic(users: { id: string; daysSinceLastVisit: number; totalVisits: number; avgSessionMinutes: number }[]): MarketingDepthResult {
    const scored = users.map(u => {
      const recency = Math.min(u.daysSinceLastVisit / 365, 1);
      const frequency = Math.min(1 / Math.max(u.totalVisits, 1), 1);
      const engagement = Math.min(1 / Math.max(u.avgSessionMinutes, 1), 1);
      const churnScore = Math.round((recency * 0.5 + frequency * 0.3 + engagement * 0.2) * 10000) / 10000;
      return { id: u.id, churnScore, risk: churnScore > 0.5 ? "high" : churnScore > 0.3 ? "medium" : "low" };
    });
    return { algorithm: "churnHeuristic", output: { scores: scored, highRiskCount: scored.filter(s => s.risk === "high").length, totalUsers: users.length } };
  }

  chiSquareSignificance(control: { conversions: number; total: number }, variant: { conversions: number; total: number }): MarketingDepthResult {
    const obs = [control.conversions, control.total - control.conversions, variant.conversions, variant.total - variant.conversions];
    const total = control.total + variant.total;
    const convTotal = control.conversions + variant.conversions;
    const nonConvTotal = total - convTotal;
    const exp = [control.total * convTotal / total, control.total * nonConvTotal / total, variant.total * convTotal / total, variant.total * nonConvTotal / total];
    let chiSq = 0;
    for (let i = 0; i < 4; i++) if (exp[i] > 0) chiSq += (obs[i] - exp[i]) ** 2 / exp[i];
    const pValue = Math.exp(-chiSq / 2);
    const significant = pValue < 0.05;
    return { algorithm: "chiSquareSignificance", output: { chiSquared: Math.round(chiSq * 10000) / 10000, pValue: Math.round(pValue * 10000) / 10000, significant, controlRate: Math.round(control.conversions / Math.max(control.total, 1) * 10000) / 10000, variantRate: Math.round(variant.conversions / Math.max(variant.total, 1) * 10000) / 10000 } };
  }

  bidLandscapeForecast(historicalBids: { bid: number; won: boolean }[], targetImpressions: number): MarketingDepthResult {
    const sorted = [...historicalBids].sort((a, b) => a.bid - b.bid);
    const winRates: { bid: number; winRate: number }[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const wins = sorted.filter((_, j) => j >= i).filter(s => s.won).length;
      const remaining = sorted.length - i;
      winRates.push({ bid: sorted[i].bid, winRate: remaining > 0 ? wins / remaining : 0 });
    }
    const suggestedBid = targetImpressions > 0 && winRates.length > 0 ? winRates.find(w => w.winRate >= targetImpressions / sorted.length)?.bid || winRates[winRates.length - 1].bid : 0;
    return { algorithm: "bidLandscapeForecast", output: { winRates, suggestedBid: Math.round(suggestedBid * 100) / 100, totalBids: sorted.length } };
  }

  incrementalityTest(control: { conversions: number; exposed: number }, treatment: { conversions: number; exposed: number }): MarketingDepthResult {
    const controlRate = control.exposed > 0 ? control.conversions / control.exposed : 0;
    const treatmentRate = treatment.exposed > 0 ? treatment.conversions / treatment.exposed : 0;
    const lift = controlRate > 0 ? (treatmentRate - controlRate) / controlRate : 0;
    const incrementalConversions = treatment.conversions - control.conversions * (treatment.exposed / Math.max(control.exposed, 1));
    return { algorithm: "incrementalityTest", output: { controlRate: Math.round(controlRate * 10000) / 10000, treatmentRate: Math.round(treatmentRate * 10000) / 10000, lift: Math.round(lift * 10000) / 10000, incrementalConversions: Math.round(incrementalConversions), totalTestExposed: control.exposed + treatment.exposed } };
  }

  clvCalculation(avgPurchaseValue: number, purchaseFrequency: number, churnRate: number, discountRate: number = 0.1): MarketingDepthResult {
    const avgLifespan = churnRate > 0 ? 1 / churnRate : 10;
    const annualValue = avgPurchaseValue * purchaseFrequency;
    const simpleCLV = annualValue * avgLifespan;
    const discountedCLV = discountRate > 0 ? annualValue * (1 - Math.pow(1 / (1 + discountRate), avgLifespan)) / (1 - 1 / (1 + discountRate)) : simpleCLV;
    return { algorithm: "clvCalculation", output: { simpleCLV: Math.round(simpleCLV * 100) / 100, discountedCLV: Math.round(discountedCLV * 100) / 100, avgLifespan: Math.round(avgLifespan * 100) / 100, annualValue: Math.round(annualValue * 100) / 100 } };
  }

  reachFrequencyEstimate(budget: number, cpm: number, frequencyCap: number): MarketingDepthResult {
    const impressions = cpm > 0 ? (budget / cpm) * 1000 : 0;
    const reach = frequencyCap > 0 ? impressions / frequencyCap : impressions;
    return { algorithm: "reachFrequencyEstimate", output: { estimatedImpressions: Math.round(impressions), estimatedReach: Math.round(reach), frequencyCap, budget, cpm } };
  }

  marketingMixModel(channels: { name: string; spend: number }[], responseValues: number[]): MarketingDepthResult {
    const totalSpend = channels.reduce((s, c) => s + c.spend, 0);
    const totalResponse = responseValues.reduce((s, v) => s + v, 0);
    const roi = channels.map((c, i) => {
      const channelROI = c.spend > 0 ? ((responseValues[i] || 0) - c.spend) / c.spend : 0;
      return { channel: c.name, spend: c.spend, response: responseValues[i] || 0, roi: Math.round(channelROI * 10000) / 10000, share: totalSpend > 0 ? Math.round(c.spend / totalSpend * 10000) / 100 : 0 };
    });
    return { algorithm: "marketingMixModel", output: { channels: roi, totalSpend, totalResponse, overallROI: totalSpend > 0 ? Math.round((totalResponse - totalSpend) / totalSpend * 10000) / 10000 : 0 } };
  }

  differentialPrivacy(rawValues: number[], epsilon: number, sensitivity: number = 1): MarketingDepthResult {
    const sum = rawValues.reduce((s, v) => s + v, 0);
    const count = rawValues.length;
    const trueMean = count > 0 ? sum / count : 0;
    const b = sensitivity / epsilon;
    const noise1 = Math.log(1 / Math.random()) * b * (Math.random() > 0.5 ? 1 : -1);
    const noise2 = Math.log(1 / Math.random()) * b * (Math.random() > 0.5 ? 1 : -1);
    const privateSum = sum + noise1;
    const privateCount = count + noise2;
    const privateMean = privateCount > 0 ? privateSum / privateCount : 0;
    return { algorithm: "differentialPrivacy", output: { trueMean: Math.round(trueMean * 100) / 100, privateSum: Math.round(privateSum * 100) / 100, privateCount: Math.round(privateCount), privateMean: Math.round(privateMean * 100) / 100, epsilon, addedNoise: Math.round(Math.abs(noise1) * 100) / 100 } };
  }

  // ============ DEPTH 5: ADVANCED DS ============

  sparseTableRMQ(values: number[], queries: { l: number; r: number }[]): SparseTableResult {
    const n = values.length;
    const k = Math.floor(Math.log2(n)) + 1;
    const st: number[][] = Array.from({ length: k }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) st[0][i] = i;
    for (let j = 1; j < k; j++) {
      for (let i = 0; i + (1 << j) <= n; i++) {
        const left = st[j - 1][i];
        const right = st[j - 1][i + (1 << (j - 1))];
        st[j][i] = values[left] < values[right] ? left : right;
      }
    }
    const query = (l: number, r: number) => {
      const j = Math.floor(Math.log2(r - l + 1));
      const left = st[j][l];
      const right = st[j][r - (1 << j) + 1];
      return values[left] < values[right] ? left : right;
    };
    const ops = queries.map(q => ({ l: q.l, r: q.r, minIndex: query(q.l, q.r), result: values[query(q.l, q.r)] }));
    return { type: "sparseTableRMQ", size: n, operations: ops };
  }

  kDTreeNearestNeighbor(points: number[][], target: number[]): KDTreeResult {
    const build = (pts: number[][], depth: number): KDTreeResult["tree"] => {
      if (pts.length === 0) return null;
      const axis = depth % target.length;
      pts.sort((a, b) => a[axis] - b[axis]);
      const mid = Math.floor(pts.length / 2);
      return { point: pts[mid], left: build(pts.slice(0, mid), depth + 1), right: build(pts.slice(mid + 1), depth + 1) };
    };
    const tree = build([...points], 0);
    let best: { point: number[]; dist: number } | null = null;
    const search = (node: typeof tree, depth: number) => {
      if (!node) return;
      const axis = depth % target.length;
      const dist = Math.sqrt(node.point.reduce((s, v, i) => s + (v - target[i]) ** 2, 0));
      if (!best || dist < best.dist) best = { point: node.point, dist: Math.round(dist * 1000) / 1000 };
      const diff = target[axis] - node.point[axis];
      const near = diff <= 0 ? node.left : node.right;
      const far = diff <= 0 ? node.right : node.left;
      search(near, depth + 1);
      if (!best || Math.abs(diff) < best.dist) search(far, depth + 1);
    };
    search(tree, 0);
    const bestVal = best as unknown as { point: number[]; dist: number } | null;
    const nn: { point: number[]; distance: number } | undefined = bestVal ? { point: bestVal.point, distance: bestVal.dist } : undefined;
    return { type: "kDTree", tree, nearestNeighbor: nn, nodes: points.length };
  }

  xorLinkedListOps(values: number[]): XorLinkedListResult {
    const ops: XorLinkedListResult["operations"] = [];
    const n = values.length;
    if (n === 0) return { type: "xorLinkedList", elements: [], operations: [] };
    const list: { value: number; both: number }[] = [];
    list.push({ value: values[0], both: -1 ^ (n > 1 ? 1 : -1) });
    for (let i = 1; i < n; i++) list.push({ value: values[i], both: (i - 1) ^ (i < n - 1 ? i + 1 : -1) });
    ops.push({ action: "build", result: [...values] });
    const traverse: number[] = [];
    let prev = -1, curr = 0;
    while (curr >= 0 && curr < n) {
      traverse.push(list[curr].value);
      const next = prev ^ list[curr].both;
      prev = curr;
      curr = next;
    }
    ops.push({ action: "traverse", result: traverse });
    return { type: "xorLinkedList", elements: traverse, operations: ops };
  }

  binaryIndexedTree2D(rows: number, cols: number, updates: { x: number; y: number; delta: number }[], queries: { x1: number; y1: number; x2: number; y2: number }[]): BinaryIndexedTree2DResult {
    const bit: number[][] = Array.from({ length: rows + 1 }, () => new Array(cols + 1).fill(0));
    const ops: BinaryIndexedTree2DResult["operations"] = [];
    for (const u of updates) {
      let i = u.x;
      while (i <= rows) {
        let j = u.y;
        while (j <= cols) { bit[i][j] += u.delta; j += j & -j; }
        i += i & -i;
      }
      ops.push({ type: "update", x: u.x, y: u.y, value: u.delta });
    }
    const sum = (x: number, y: number) => {
      let s = 0; let i = x;
      while (i > 0) { let j = y; while (j > 0) { s += bit[i][j]; j -= j & -j; } i -= i & -i; }
      return s;
    };
    for (const q of queries) {
      const result = sum(q.x2, q.y2) - sum(q.x1 - 1, q.y2) - sum(q.x2, q.y1 - 1) + sum(q.x1 - 1, q.y1 - 1);
      ops.push({ type: "query", x: q.x1, y: q.y1, x2: q.x2, y2: q.y2, result });
    }
    return { type: "binaryIndexedTree2D", rows, cols, operations: ops };
  }

  cartesianTreeBuild(values: number[]): CartesianTreeResult {
    const n = values.length;
    if (n === 0) return { type: "cartesianTree", root: -1, parent: [], leftChild: [], rightChild: [] };
    const parent = new Array(n).fill(-1);
    const leftChild = new Array(n).fill(-1);
    const rightChild = new Array(n).fill(-1);
    const stack: number[] = [];
    for (let i = 0; i < n; i++) {
      let last = -1;
      while (stack.length > 0 && values[stack[stack.length - 1]] > values[i]) { last = stack.pop()!; }
      if (stack.length > 0) { rightChild[stack[stack.length - 1]] = i; parent[i] = stack[stack.length - 1]; }
      if (last !== -1) { leftChild[i] = last; parent[last] = i; }
      stack.push(i);
    }
    const root = stack.length > 0 ? stack[0] : -1;
    return { type: "cartesianTree", root, parent, leftChild, rightChild };
  }

  disjointSetUnionAdvanced(ops: { type: "union" | "find" | "connected"; a: number; b?: number }[]): { type: string; operations: { action: string; a: number; b?: number; result?: boolean | number; parentState: number[] }[] } {
    const n = 10;
    const parent = Array.from({ length: n }, (_, i) => i);
    const rank = new Array(n).fill(0);
    const find = (x: number): number => { if (parent[x] !== x) parent[x] = find(parent[x]); return parent[x]; };
    const results: { action: string; a: number; b?: number; result?: boolean | number; parentState: number[] }[] = [];
    for (const op of ops) {
      if (op.type === "union" && op.b !== undefined) {
        const ra = find(op.a), rb = find(op.b);
        if (ra !== rb) { if (rank[ra] < rank[rb]) { parent[ra] = rb; } else if (rank[ra] > rank[rb]) { parent[rb] = ra; } else { parent[rb] = ra; rank[ra]++; } }
        results.push({ action: "union", a: op.a, b: op.b, parentState: [...parent] });
      } else if (op.type === "find") {
        const r = find(op.a);
        results.push({ action: "find", a: op.a, result: r, parentState: [...parent] });
      } else if (op.type === "connected" && op.b !== undefined) {
        const r = find(op.a) === find(op.b);
        results.push({ action: "connected", a: op.a, b: op.b, result: r, parentState: [...parent] });
      }
    }
    return { type: "disjointSetUnion", operations: results };
  }

  treapImplicit(values: number[], ops: { type: "insert" | "erase" | "sum" | "reverse"; pos?: number; value?: number; l?: number; r?: number }[]): { type: string; final: number[]; operations: { action: string; result?: number | number[] }[] } {
    class TreapNode {     constructor(public val: number, public prio: number = Math.random(), public left: TreapNode | null = null, public right: TreapNode | null = null, public size: number = 1, public sum: number = val, public rev: boolean = false) {} }
    const sz = (t: TreapNode | null) => t ? t.size : 0;
    const sm = (t: TreapNode | null) => t ? t.sum : 0;
    const upd = (t: TreapNode) => { t.size = 1 + sz(t.left) + sz(t.right); t.sum = t.val + sm(t.left) + sm(t.right); };
    const push = (t: TreapNode | null) => { if (t && t.rev) { [t.left, t.right] = [t.right, t.left]; if (t.left) t.left.rev = !t.left.rev; if (t.right) t.right.rev = !t.right.rev; t.rev = false; } };
    const merge = (l: TreapNode | null, r: TreapNode | null): TreapNode | null => {
      if (!l || !r) return l || r;
      if (l.prio > r.prio) { push(l); l.right = merge(l.right, r); upd(l); return l; }
      else { push(r); r.left = merge(l, r.left); upd(r); return r; }
    };
    const split = (t: TreapNode | null, key: number): [TreapNode | null, TreapNode | null] => {
      if (!t) return [null, null];
      push(t);
      if (sz(t.left) >= key) { const [l, r] = split(t.left, key); t.left = r; upd(t); return [l, t]; }
      else { const [l, r] = split(t.right, key - sz(t.left) - 1); t.right = l; upd(t); return [t, r]; }
    };
    const toArr = (t: TreapNode | null): number[] => { if (!t) return []; push(t); return [...toArr(t.left), t.val, ...toArr(t.right)]; };
    let root: TreapNode | null = null;
    for (const v of values) root = merge(root, new TreapNode(v));
    const opsResult: { action: string; result?: number | number[] }[] = [];
    for (const op of ops) {
      if (op.type === "insert" && op.pos !== undefined && op.value !== undefined) {
        const [l, r] = split(root, op.pos);
        root = merge(merge(l, new TreapNode(op.value)), r);
        opsResult.push({ action: "insert", result: undefined });
      } else if (op.type === "erase" && op.pos !== undefined) {
        const [l, m] = split(root, op.pos);
        const [m2, r] = split(m, 1);
        root = merge(l, r);
        opsResult.push({ action: "erase", result: undefined });
      } else if (op.type === "sum" && op.l !== undefined && op.r !== undefined) {
        const [l, m] = split(root, op.l);
        const [m2, r] = split(m, op.r - op.l + 1);
        opsResult.push({ action: "sum", result: m2 ? m2.sum : 0 });
        root = merge(merge(l, m2), r);
      } else if (op.type === "reverse" && op.l !== undefined && op.r !== undefined) {
        const [l, m] = split(root, op.l);
        const [m2, r] = split(m, op.r - op.l + 1);
        if (m2) m2.rev = !m2.rev;
        root = merge(merge(l, m2), r);
        opsResult.push({ action: "reverse", result: undefined });
      }
    }
    return { type: "implicitTreap", final: toArr(root), operations: opsResult };
  }

  // ============ DEPTH 5: ADVANCED ALGORITHMS ============

  minCostMaxFlow(nodes: string[], edges: { from: string; to: string; capacity: number; cost: number }[], source: string, sink: string): MinCostMaxFlowResult {
    const n = nodes.length;
    const idx = new Map<string, number>();
    nodes.forEach((v, i) => idx.set(v, i));
    const si = idx.get(source)!, ti = idx.get(sink)!;
    const cap: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    const cost: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (const e of edges) { const i = idx.get(e.from)!, j = idx.get(e.to)!; cap[i][j] += e.capacity; cost[i][j] += e.cost; cost[j][i] -= e.cost; }
    let flow = 0, costTotal = 0;
    const pot = new Array(n).fill(0);
    const prevv = new Array(n).fill(0);
    const preve = new Array(n).fill(0);
    const INF = 1e9;
    while (flow < INF) {
      const dist = new Array(n).fill(INF);
      dist[si] = 0;
      const pq: [number, number][] = [[0, si]];
      while (pq.length > 0) {
        pq.sort((a, b) => a[0] - b[0]);
        const [d, v] = pq.shift()!;
        if (dist[v] < d) continue;
        for (let u = 0; u < n; u++) {
          if (cap[v][u] > 0 && dist[u] > dist[v] + cost[v][u] + pot[v] - pot[u]) {
            dist[u] = dist[v] + cost[v][u] + pot[v] - pot[u];
            prevv[u] = v; preve[u] = u;
            pq.push([dist[u], u]);
          }
        }
      }
      if (dist[ti] >= INF / 2) break;
      for (let v = 0; v < n; v++) pot[v] += dist[v];
      let d = INF;
      for (let v = ti; v !== si; v = prevv[v]) d = Math.min(d, cap[prevv[v]][v]);
      flow += d;
      costTotal += d * pot[ti];
      for (let v = ti; v !== si; v = prevv[v]) { cap[prevv[v]][v] -= d; cap[v][prevv[v]] += d; }
    }
    const flowEdges = edges.map(e => {
      const i = idx.get(e.from)!, j = idx.get(e.to)!;
      const originalCap = e.capacity;
      const used = originalCap - cap[i][j];
      return { from: e.from, to: e.to, flow: Math.max(0, used), capacity: originalCap, cost: e.cost };
    }).filter(e => e.flow > 0);
    return { algorithm: "minCostMaxFlow", maxFlow: flow, minCost: costTotal, flowEdges };
  }

  bronKerboschMaxClique(adjacency: Record<string, string[]>): BronKerboschResult {
    const nodes = Object.keys(adjacency);
    const adjSet = new Map<string, Set<string>>();
    for (const [k, vs] of Object.entries(adjacency)) adjSet.set(k, new Set(vs));
    const cliques: string[][] = [];
    const bronKerbosch = (r: Set<string>, p: Set<string>, x: Set<string>) => {
      if (p.size === 0 && x.size === 0) { cliques.push([...r]); return; }
      const pivot = [...p, ...x][0];
      const candidates = new Set(p);
      const pivotNeighbors = adjSet.get(pivot) || new Set();
      for (const v of p) {
        if (pivotNeighbors.has(v)) continue;
        const vNeighbors = adjSet.get(v) || new Set();
        r.add(v);
        bronKerbosch(r, new Set([...candidates].filter(n => vNeighbors.has(n))), new Set([...x].filter(n => vNeighbors.has(n))));
        r.delete(v);
        candidates.delete(v);
        x.add(v);
      }
    };
    bronKerbosch(new Set(), new Set(nodes), new Set());
    const maxClique = cliques.reduce((best, c) => c.length > best.length ? c : best, [] as string[]);
    return { algorithm: "bronKerbosch", cliques, maxClique, cliqueCount: cliques.length };
  }

  minimumSpanningTree(nodes: string[], edges: { from: string; to: string; weight: number }[]): MSTResult {
    const parent = new Map<string, string>();
    const rank = new Map<string, number>();
    const find = (x: string): string => { if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!)); return parent.get(x)!; };
    const union = (a: string, b: string) => { const ra = find(a), rb = find(b); if (ra === rb) return; if ((rank.get(ra) || 0) < (rank.get(rb) || 0)) { parent.set(ra, rb); } else if ((rank.get(ra) || 0) > (rank.get(rb) || 0)) { parent.set(rb, ra); } else { parent.set(rb, ra); rank.set(ra, (rank.get(ra) || 0) + 1); } };
    for (const n of nodes) { parent.set(n, n); rank.set(n, 0); }
    const sorted = [...edges].sort((a, b) => a.weight - b.weight);
    const mst: { from: string; to: string; weight: number }[] = [];
    let total = 0;
    for (const e of sorted) { if (find(e.from) !== find(e.to)) { union(e.from, e.to); mst.push(e); total += e.weight; } }
    return { algorithm: "minimumSpanningTree", edges: mst, totalWeight: Math.round(total * 100) / 100, nodes: nodes.length };
  }

  topologicalSortKahn(graph: Record<string, string[]>): TopologicalSortResult {
    const inDeg: Record<string, number> = {};
    for (const [k, vs] of Object.entries(graph)) { if (!(k in inDeg)) inDeg[k] = 0; for (const v of vs) inDeg[v] = (inDeg[v] || 0) + 1; }
    const queue: string[] = Object.keys(inDeg).filter(k => inDeg[k] === 0);
    const order: string[] = [];
    while (queue.length > 0) { const u = queue.shift()!; order.push(u); for (const v of (graph[u] || [])) { inDeg[v]--; if (inDeg[v] === 0) queue.push(v); } }
    const hasCycle = order.length !== Object.keys(inDeg).length;
    return { algorithm: "topologicalSort", order, hasCycle };
  }

  kosarajuSCC(graph: Record<string, string[]>): KosarajuResult {
    const nodes = Object.keys(graph);
    const visited = new Set<string>();
    const stack: string[] = [];
    const dfs = (u: string) => { visited.add(u); for (const v of (graph[u] || [])) if (!visited.has(v)) dfs(v); stack.push(u); };
    for (const n of nodes) if (!visited.has(n)) dfs(n);
    const rev: Record<string, string[]> = {};
    for (const [k, vs] of Object.entries(graph)) { if (!rev[k]) rev[k] = []; for (const v of vs) { if (!rev[v]) rev[v] = []; rev[v].push(k); } }
    const components: string[][] = [];
    const visited2 = new Set<string>();
    const dfs2 = (u: string, comp: string[]) => { visited2.add(u); comp.push(u); for (const v of (rev[u] || [])) if (!visited2.has(v)) dfs2(v, comp); };
    while (stack.length > 0) { const u = stack.pop()!; if (!visited2.has(u)) { const comp: string[] = []; dfs2(u, comp); components.push(comp); } }
    return { algorithm: "kosaraju", components, componentCount: components.length };
  }

  articulationPointsAndBridges(nodes: string[], edges: [string, string][]): ArticulationResult {
    const adj = new Map<string, string[]>();
    for (const n of nodes) adj.set(n, []);
    for (const [u, v] of edges) { adj.get(u)!.push(v); adj.get(v)!.push(u); }
    const visited = new Set<string>();
    const tin = new Map<string, number>();
    const low = new Map<string, number>();
    const parent = new Map<string, string | null>();
    const ap = new Set<string>();
    const bridges: [string, string][] = [];
    let timer = 0;
    const dfs = (u: string, p: string | null) => {
      visited.add(u); parent.set(u, p); tin.set(u, timer); low.set(u, timer); timer++;
      let children = 0;
      for (const v of (adj.get(u) || [])) {
        if (v === p) continue;
        if (visited.has(v)) { low.set(u, Math.min(low.get(u)!, tin.get(v)!)); }
        else { dfs(v, u); children++; low.set(u, Math.min(low.get(u)!, low.get(v)!)); if (low.get(v)! > tin.get(u)!) bridges.push([u, v]); if (p !== null && low.get(v)! >= tin.get(u)!) ap.add(u); }
      }
      if (p === null && children > 1) ap.add(u);
    };
    for (const n of nodes) if (!visited.has(n)) dfs(n, null);
    return { algorithm: "articulationPoints", articulationPoints: [...ap], bridges, nodes: nodes.length };
  }

  bipartiteMatching(left: string[], right: string[], edges: [string, string][]): BipartiteMatchingResult {
    const adj = new Map<string, string[]>();
    for (const l of left) adj.set(l, []);
    for (const [u, v] of edges) if (adj.has(u)) adj.get(u)!.push(v);
    const matchR = new Map<string, string | null>();
    for (const r of right) matchR.set(r, null);
    const bpm = (u: string, seen: Set<string>): boolean => {
      for (const v of (adj.get(u) || [])) {
        if (seen.has(v)) continue; seen.add(v);
        if (matchR.get(v) === null || bpm(matchR.get(v)!, seen)) { matchR.set(v, u); return true; }
      }
      return false;
    };
    let cardinality = 0;
    for (const l of left) { const seen = new Set<string>(); if (bpm(l, seen)) cardinality++; }
    const matching: [string, string][] = [];
    for (const [r, l] of matchR) if (l !== null) matching.push([l, r]);
    return { algorithm: "bipartiteMatching", matching, cardinality };
  }

  // ============ DEPTH 5: STRING / DP ============

  manacherAlgorithm(text: string): ManacherResult {
    const t = "^#" + text.split("").join("#") + "#$";
    const n = t.length;
    const p = new Array(n).fill(0);
    let c = 0, r = 0;
    for (let i = 1; i < n - 1; i++) {
      const mirr = 2 * c - i;
      if (i < r) p[i] = Math.min(r - i, p[mirr]);
      while (t[i + (1 + p[i])] === t[i - (1 + p[i])]) p[i]++;
      if (i + p[i] > r) { c = i; r = i + p[i]; }
    }
    let maxLen = 0, maxCenter = 0;
    for (let i = 1; i < n - 1; i++) { if (p[i] > maxLen) { maxLen = p[i]; maxCenter = i; } }
    const start = Math.floor((maxCenter - maxLen) / 2);
    const longestPalindrome = text.substring(start, start + maxLen);
    return { algorithm: "manacher", text, centers: p.filter((_, i) => i % 2 === 1).map(v => v), longestPalindrome, length: maxLen };
  }

  zAlgorithmSearch(text: string, pattern: string): ZAlgorithmResult {
    const s = pattern + "$" + text;
    const n = s.length;
    const z = new Array(n).fill(0);
    let l = 0, r = 0, comparisons = 0;
    for (let i = 1; i < n; i++) {
      if (i <= r) z[i] = Math.min(r - i + 1, z[i - l]);
      while (i + z[i] < n && s[z[i]] === s[i + z[i]]) { z[i]++; comparisons++; }
      if (i + z[i] - 1 > r) { l = i; r = i + z[i] - 1; }
    }
    const matches: number[] = [];
    const patLen = pattern.length;
    for (let i = patLen + 1; i < n; i++) if (z[i] >= patLen) matches.push(i - patLen - 1);
    return { algorithm: "zAlgorithm", text, pattern, matches, zArray: z, comparisons };
  }

  levenshteinWithPath(a: string, b: string): LevenshteinResult {
    const m = a.length, n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
        else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    const ops: { type: string; chars: string }[] = [];
    let i = m, j = n;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) { ops.push({ type: "keep", chars: a[i - 1] }); i--; j--; }
      else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) { ops.push({ type: "replace", chars: a[i - 1] + "->" + b[j - 1] }); i--; j--; }
      else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) { ops.push({ type: "delete", chars: a[i - 1] }); i--; }
      else if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) { ops.push({ type: "insert", chars: b[j - 1] }); j--; }
      else break;
    }
    ops.reverse();
    return { algorithm: "levenshtein", distance: dp[m][n], matrix: dp, operations: ops };
  }

  lisWithPath(values: number[]): LISResult {
    const n = values.length;
    if (n === 0) return { algorithm: "lis", sequence: values, length: 0, subsequence: [], comparisons: 0 };
    const dp: number[] = [];
    const indices: number[] = [];
    const prev: number[] = new Array(n).fill(-1);
    let comparisons = 0;
    for (let i = 0; i < n; i++) {
      comparisons++;
      let lo = 0, hi = dp.length;
      while (lo < hi) {
        comparisons++;
        const mid = (lo + hi) >> 1;
        if (values[dp[mid]] < values[i]) lo = mid + 1; else hi = mid;
      }
      if (lo === dp.length) { dp.push(i); } else { dp[lo] = i; }
      indices.push(lo);
      if (lo > 0) prev[i] = dp[lo - 1];
    }
    const lis: number[] = [];
    let k = dp.length > 0 ? dp[dp.length - 1] : -1;
    while (k >= 0) { lis.push(values[k]); k = prev[k]; }
    lis.reverse();
    return { algorithm: "lis", sequence: values, length: dp.length, subsequence: lis, comparisons };
  }

  dpBitmaskTSP(distances: number[][]): BitmaskTSPResult {
    const n = distances.length;
    const INF = 1e9;
    const dp: number[][] = Array.from({ length: 1 << n }, () => new Array(n).fill(INF));
    dp[1][0] = 0;
    let statesExplored = 0;
    for (let mask = 1; mask < (1 << n); mask++) {
      for (let u = 0; u < n; u++) {
        if (!(mask & (1 << u)) || dp[mask][u] >= INF) continue;
        statesExplored++;
        for (let v = 0; v < n; v++) {
          if (mask & (1 << v)) continue;
          const newMask = mask | (1 << v);
          const nd = dp[mask][u] + distances[u][v];
          if (nd < dp[newMask][v]) dp[newMask][v] = nd;
        }
      }
    }
    let best = INF;
    let last = -1;
    for (let u = 1; u < n; u++) { const nd = dp[(1 << n) - 1][u] + distances[u][0]; if (nd < best) { best = nd; last = u; } }
    const path: number[] = [];
    if (best < INF / 2) {
      let mask = (1 << n) - 1, u = last;
      while (u !== 0) { path.push(u); let prevU = -1; for (let v = 0; v < n; v++) { if (v !== u && (mask & (1 << v)) && dp[mask][u] === dp[mask ^ (1 << u)][v] + distances[v][u]) { prevU = v; break; } } mask ^= (1 << u); u = prevU; }
      path.push(0);
      path.reverse();
    }
    return { algorithm: "dpBitmaskTSP", distance: Math.round(best * 100) / 100, path, nodes: n, statesExplored };
  }

  regexMatching(text: string, pattern: string): RegexMatchingResult {
    const m = text.length, p = pattern.length;
    const dp: boolean[][] = Array.from({ length: m + 1 }, () => new Array(p + 1).fill(false));
    dp[0][0] = true;
    for (let j = 1; j <= p; j++) if (pattern[j - 1] === "*") dp[0][j] = dp[0][j - 2];
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= p; j++) {
        if (pattern[j - 1] === "*") { dp[i][j] = dp[i][j - 2] || (dp[i - 1][j] && (pattern[j - 2] === text[i - 1] || pattern[j - 2] === ".")); }
        else if (pattern[j - 1] === ".") { dp[i][j] = dp[i - 1][j - 1]; }
        else { dp[i][j] = dp[i - 1][j - 1] && pattern[j - 1] === text[i - 1]; }
      }
    }
    const matches: number[] = [];
    if (dp[m][p]) {
      for (let i = 0; i <= m; i++) { if (dp[i][p]) { matches.push(i); break; } }
    }
    return { algorithm: "regexMatching", text, pattern, matches: dp[m][p], matchPositions: matches };
  }

  damerauLevenshtein(a: string, b: string): { algorithm: string; distance: number; matrix: number[][] } {
    const m = a.length, n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + cost);
        }
      }
    }
    return { algorithm: "damerauLevenshtein", distance: dp[m][n], matrix: dp };
  }

  // ============ DEPTH 5: ENHANCED EXISTING ============

  lruCacheOps(capacity: number, ops: { type: "get" | "put"; key: string; value?: number }[]): LRUCacheResult {
    const cache = new Map<string, number>();
    const resultOps: { action: string; key: string; value?: number; evicted?: boolean }[] = [];
    for (const op of ops) {
      if (op.type === "get") {
        if (cache.has(op.key)) { const v = cache.get(op.key)!; cache.delete(op.key); cache.set(op.key, v); resultOps.push({ action: "get", key: op.key, value: v }); }
        else { resultOps.push({ action: "get", key: op.key }); }
      } else if (op.type === "put" && op.value !== undefined) {
        let evicted = false;
        if (cache.has(op.key)) { cache.delete(op.key); }
        else if (cache.size >= capacity) { const firstKey = cache.keys().next().value; if (firstKey !== undefined) cache.delete(firstKey); evicted = true; }
        cache.set(op.key, op.value);
        resultOps.push({ action: "put", key: op.key, value: op.value, evicted });
      }
    }
    return { capacity, operations: resultOps, finalState: [...cache.entries()].map(([k, v]) => ({ key: k, value: v })) };
  }

  bloomFilterAdvanced(expectedElements: number, falsePositiveRate: number, items: string[], checks: string[]): { type: string; size: number; hashCount: number; bits: number[]; falsePositiveProbability: string; insertions: number; checks: { item: string; probablyPresent: boolean }[] } {
    const size = Math.ceil(-expectedElements * Math.log(falsePositiveRate) / (Math.LN2 * Math.LN2));
    const hashCount = Math.max(1, Math.round((size / expectedElements) * Math.LN2));
    const bits = new Array(size).fill(0);
    const hash = (s: string, i: number) => { let h = 0; for (let j = 0; j < s.length; j++) h = ((h << 5) - h + s.charCodeAt(j)) ^ (i * 0x9e3779b9); return Math.abs(h) % size; };
    for (const item of items) { for (let i = 0; i < hashCount; i++) bits[hash(item, i)] = 1; }
    const checksResult = checks.map(c => { let present = true; for (let i = 0; i < hashCount; i++) { if (bits[hash(c, i)] === 0) { present = false; break; } } return { item: c, probablyPresent: present }; });
    return { type: "bloomFilterAdvanced", size, hashCount, bits, falsePositiveProbability: falsePositiveRate.toExponential(2), insertions: items.length, checks: checksResult };
  }

  segmentTreeLazyPropagation(values: number[], ops: { type: "update" | "query"; l: number; r: number; value?: number }[]): SegmentTreeLazyResult {
    const n = values.length;
    const size = 4 * n;
    const tree = new Array(size).fill(0);
    const lazy = new Array(size).fill(0);
    const build = (idx: number, l: number, r: number) => {
      if (l === r) { tree[idx] = values[l]; return; }
      const mid = (l + r) >> 1;
      build(idx * 2, l, mid); build(idx * 2 + 1, mid + 1, r);
      tree[idx] = tree[idx * 2] + tree[idx * 2 + 1];
    };
    if (n > 0) build(1, 0, n - 1);
    const push = (idx: number, l: number, r: number) => {
      if (lazy[idx] !== 0) {
        tree[idx] += lazy[idx] * (r - l + 1);
        if (l !== r) { lazy[idx * 2] += lazy[idx]; lazy[idx * 2 + 1] += lazy[idx]; }
        lazy[idx] = 0;
      }
    };
    const update = (idx: number, l: number, r: number, ql: number, qr: number, val: number) => {
      push(idx, l, r);
      if (ql > r || qr < l) return;
      if (ql <= l && r <= qr) { lazy[idx] += val; push(idx, l, r); return; }
      const mid = (l + r) >> 1;
      update(idx * 2, l, mid, ql, qr, val); update(idx * 2 + 1, mid + 1, r, ql, qr, val);
      tree[idx] = tree[idx * 2] + tree[idx * 2 + 1];
    };
    const query = (idx: number, l: number, r: number, ql: number, qr: number): number => {
      push(idx, l, r);
      if (ql > r || qr < l) return 0;
      if (ql <= l && r <= qr) return tree[idx];
      const mid = (l + r) >> 1;
      return query(idx * 2, l, mid, ql, qr) + query(idx * 2 + 1, mid + 1, r, ql, qr);
    };
    const resultOps: SegmentTreeLazyResult["operations"] = [];
    for (const op of ops) {
      if (op.type === "update" && op.value !== undefined) { if (n > 0) update(1, 0, n - 1, op.l, op.r, op.value); resultOps.push({ type: "update", range: [op.l, op.r], value: op.value }); }
      if (op.type === "query") { const r = n > 0 ? query(1, 0, n - 1, op.l, op.r) : 0; resultOps.push({ type: "query", range: [op.l, op.r], result: r }); }
    }
    return { type: "segmentTreeLazy", size: n, operations: resultOps };
  }

  dequeOps(initial: number[], ops: { type: "pushFront" | "pushBack" | "popFront" | "popBack" | "peekFront" | "peekBack" | "size" }[]): DequeResult {
    const dq = [...initial];
    const dqOps: DequeResult["operations"] = [];
    for (const op of ops) {
      if (op.type === "pushFront") { dq.unshift(Math.floor(Math.random() * 100)); dqOps.push({ action: "pushFront", value: dq[0], result: [...dq] }); }
      else if (op.type === "pushBack") { dq.push(Math.floor(Math.random() * 100)); dqOps.push({ action: "pushBack", value: dq[dq.length - 1], result: [...dq] }); }
      else if (op.type === "popFront") { const v = dq.shift(); dqOps.push({ action: "popFront", value: v, result: [...dq] }); }
      else if (op.type === "popBack") { const v = dq.pop(); dqOps.push({ action: "popBack", value: v, result: [...dq] }); }
      else if (op.type === "peekFront") { dqOps.push({ action: "peekFront", value: dq.length > 0 ? dq[0] : undefined, result: [...dq] }); }
      else if (op.type === "peekBack") { dqOps.push({ action: "peekBack", value: dq.length > 0 ? dq[dq.length - 1] : undefined, result: [...dq] }); }
      else if (op.type === "size") { dqOps.push({ action: "size", value: dq.length, result: [...dq] }); }
    }
    return { type: "deque", initial, operations: dqOps };
  }

  priorityQueueOps(initial: number[], ops: { type: "push" | "pop" | "peek" | "size" }[]): PriorityQueueResult {
    const heap: number[] = [];
    const swap = (i: number, j: number) => { [heap[i], heap[j]] = [heap[j], heap[i]]; };
    const push = (v: number) => { heap.push(v); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p] <= heap[i]) break; swap(p, i); i = p; } };
    const pop = (): number | undefined => {
      if (heap.length === 0) return undefined;
      const r = heap[0]; const last = heap.pop()!;
      if (heap.length > 0) { heap[0] = last; let i = 0; while (true) { let smallest = i; const l = 2 * i + 1, r = 2 * i + 2; if (l < heap.length && heap[l] < heap[smallest]) smallest = l; if (r < heap.length && heap[r] < heap[smallest]) smallest = r; if (smallest === i) break; swap(i, smallest); i = smallest; } }
      return r;
    };
    const pqOps: PriorityQueueResult["operations"] = [];
    for (const v of initial) push(v);
    for (const op of ops) {
      if (op.type === "push") { const v = Math.floor(Math.random() * 200); push(v); pqOps.push({ action: "push", value: v, size: heap.length }); }
      else if (op.type === "pop") { const v = pop(); pqOps.push({ action: "pop", value: v, size: heap.length }); }
      else if (op.type === "peek") { pqOps.push({ action: "peek", value: heap.length > 0 ? heap[0] : undefined, size: heap.length }); }
      else if (op.type === "size") { pqOps.push({ action: "size", value: heap.length, size: heap.length }); }
    }
    return { type: "priorityQueue", initial, operations: pqOps };
  }

  hashMapChaining(capacity: number, ops: { type: "put" | "get" | "delete"; key: string; value?: number }[]): HashMapChainingResult {
    const table: [string, number][][] = Array.from({ length: capacity }, () => []);
    const hash = (k: string) => { let h = 0; for (let i = 0; i < k.length; i++) h = ((h << 5) - h + k.charCodeAt(i)) | 0; return Math.abs(h) % capacity; };
    const opsResult: HashMapChainingResult["operations"] = [];
    let elements = 0;
    for (const op of ops) {
      if (op.type === "put" && op.value !== undefined) {
        const h = hash(op.key);
        const bucket = table[h];
        let found = false;
        for (let j = 0; j < bucket.length; j++) { if (bucket[j][0] === op.key) { bucket[j][1] = op.value; found = true; opsResult.push({ action: "put", key: op.key, value: op.value }); break; } }
        if (!found) { bucket.push([op.key, op.value]); elements++; opsResult.push({ action: "put", key: op.key, value: op.value, collision: bucket.length > 1 }); }
      } else if (op.type === "get") {
        const h = hash(op.key);
        const bucket = table[h];
        let found = false;
        for (const [k, v] of bucket) { if (k === op.key) { opsResult.push({ action: "get", key: op.key, result: v }); found = true; break; } }
        if (!found) opsResult.push({ action: "get", key: op.key });
      } else if (op.type === "delete") {
        const h = hash(op.key);
        const bucket = table[h];
        let deleted = false;
        for (let j = 0; j < bucket.length; j++) { if (bucket[j][0] === op.key) { bucket.splice(j, 1); elements--; opsResult.push({ action: "delete", key: op.key }); deleted = true; break; } }
        if (!deleted) opsResult.push({ action: "delete", key: op.key });
      }
    }
    return { type: "hashMapChaining", capacity, loadFactor: (elements / capacity).toFixed(2), operations: opsResult };
  }

  circularBufferOps(capacity: number, ops: { type: "push" | "pop" | "peek" | "toArray"; value?: number }[]): CircularBufferResult {
    const buf = new Array(capacity).fill(null);
    let head = 0, tail = 0, size = 0;
    const opsResult: CircularBufferResult["operations"] = [];
    for (const op of ops) {
      if (op.type === "push" && op.value !== undefined) {
        if (size === capacity) { buf[tail] = op.value; tail = (tail + 1) % capacity; head = (head + 1) % capacity; }
        else { buf[tail] = op.value; tail = (tail + 1) % capacity; size++; }
        opsResult.push({ action: "push", value: op.value, head, tail });
      } else if (op.type === "pop") {
        if (size === 0) { opsResult.push({ action: "pop", head, tail }); }
        else { const v = buf[head]; buf[head] = null; head = (head + 1) % capacity; size--; opsResult.push({ action: "pop", value: v, head, tail }); }
      } else if (op.type === "peek") {
        opsResult.push({ action: "peek", value: size > 0 ? buf[head] : null, head, tail });
      } else if (op.type === "toArray") {
        const arr: number[] = [];
        for (let i = 0; i < size; i++) arr.push(buf[(head + i) % capacity] as number);
        opsResult.push({ action: "toArray", result: arr, head, tail });
      }
    }
    const elements: number[] = [];
    for (let i = 0; i < size; i++) elements.push(buf[(head + i) % capacity] as number);
    return { type: "circularBuffer", capacity, elements, operations: opsResult };
  }

  // ============ DEPTH 5: MARKETING DEPTH ============

  exp3Bandit(variants: string[], rewards: { variant: string; reward: number }[], gamma: number = 0.1): MarketingDepthResult {
    const k = variants.length;
    const weights = new Array(k).fill(1);
    const probabilities = new Array(k).fill(1 / k);
    const selected: string[] = [];
    const cumulativeReward: number[] = [];
    let totalReward = 0;
    for (const r of rewards) {
      const idx = variants.indexOf(r.variant);
      if (idx < 0) continue;
      for (let i = 0; i < k; i++) probabilities[i] = (1 - gamma) * (weights[i] / weights.reduce((s, w) => s + w, 0)) + gamma / k;
      const estReward = r.reward / probabilities[idx];
      weights[idx] *= Math.exp(gamma * estReward / k);
      totalReward += r.reward;
      selected.push(r.variant);
      cumulativeReward.push(Math.round(totalReward * 100) / 100);
    }
    return { algorithm: "exp3Bandit", output: { variants, finalWeights: weights.map(w => Math.round(w * 100) / 100), finalProbabilities: probabilities.map(p => Math.round(p * 10000) / 10000), totalReward: Math.round(totalReward * 100) / 100, selected, cumulativeReward } };
  }

  thompsonSamplingGaussian(variants: string[], rewards: { variant: string; value: number }[], priorMean: number = 0, priorVariance: number = 1): MarketingDepthResult {
    const means = new Map<string, number>();
    const variances = new Map<string, number>();
    const counts = new Map<string, number>();
    const sums = new Map<string, number>();
    for (const v of variants) { means.set(v, priorMean); variances.set(v, priorVariance); counts.set(v, 0); sums.set(v, 0); }
    for (const r of rewards) {
      if (!variants.includes(r.variant)) continue;
      const n = (counts.get(r.variant) || 0) + 1;
      const oldSum = sums.get(r.variant) || 0;
      const newSum = oldSum + r.value;
      const oldMean = means.get(r.variant) || priorMean;
      const newMean = oldMean + (r.value - oldMean) / n;
      const oldVar = variances.get(r.variant) || priorVariance;
      const newVar = n > 1 ? ((n - 2) * oldVar + (r.value - oldMean) * (r.value - newMean)) / (n - 1) : priorVariance;
      counts.set(r.variant, n);
      sums.set(r.variant, newSum);
      means.set(r.variant, newMean);
      variances.set(r.variant, Math.max(newVar, 0.01));
    }
    const summary = variants.map(v => ({ variant: v, mean: Math.round((means.get(v) || 0) * 100) / 100, variance: Math.round((variances.get(v) || 0) * 100) / 100, samples: counts.get(v) || 0 }));
    const bestVariant = summary.reduce((best, s) => s.mean > best.mean ? s : best);
    return { algorithm: "thompsonSamplingGaussian", output: { summary, bestVariant: bestVariant.variant, bestMean: bestVariant.mean, priorMean, priorVariance, totalSamples: rewards.length } };
  }

  kaplanMeierSurvival(times: number[], events: number[]): MarketingDepthResult {
    const n = times.length;
    const data = times.map((t, i) => ({ time: t, event: events[i] === 1 }));
    data.sort((a, b) => a.time - b.time);
    const survival: { time: number; atRisk: number; events: number; survivalProb: number }[] = [];
    let atRisk = n;
    let survProb = 1;
    for (let i = 0; i < n; ) {
      const t = data[i].time;
      let eventCount = 0;
      let j = i;
      while (j < n && data[j].time === t) { if (data[j].event) eventCount++; j++; }
      survProb *= (atRisk - eventCount) / atRisk;
      survival.push({ time: t, atRisk, events: eventCount, survivalProb: Math.round(survProb * 10000) / 10000 });
      atRisk -= (j - i);
      i = j;
    }
    const medianIdx = survival.findIndex(s => s.survivalProb <= 0.5);
    const medianSurvivalTime = medianIdx >= 0 ? survival[medianIdx].time : (times.length > 0 ? Math.max(...times) : 0);
    return { algorithm: "kaplanMeier", output: { survivalCurve: survival, medianSurvivalTime, totalObservations: n, events: events.filter(e => e === 1).length } };
  }

  upliftModeling(control: { users: number; conversions: number }[], treatment: { users: number; conversions: number }[]): MarketingDepthResult {
    const segments = Math.max(control.length, treatment.length);
    const upliftCurve: { segment: number; controlRate: number; treatmentRate: number; uplift: number }[] = [];
    for (let i = 0; i < segments; i++) {
      const c = control[i] || { users: 0, conversions: 0 };
      const t = treatment[i] || { users: 0, conversions: 0 };
      const cRate = c.users > 0 ? c.conversions / c.users : 0;
      const tRate = t.users > 0 ? t.conversions / t.users : 0;
      upliftCurve.push({ segment: i, controlRate: Math.round(cRate * 10000) / 10000, treatmentRate: Math.round(tRate * 10000) / 10000, uplift: Math.round((tRate - cRate) * 10000) / 10000 });
    }
    const avgUplift = upliftCurve.reduce((s, u) => s + u.uplift, 0) / Math.max(segments, 1);
    const totalControlConv = control.reduce((s, c) => s + c.conversions, 0);
    const totalControlUsers = control.reduce((s, c) => s + c.users, 0);
    const totalTreatmentConv = treatment.reduce((s, t) => s + t.conversions, 0);
    const totalTreatmentUsers = treatment.reduce((s, t) => s + t.users, 0);
    return { algorithm: "upliftModeling", output: { upliftCurve, averageUplift: Math.round(avgUplift * 10000) / 10000, controlConversionRate: totalControlUsers > 0 ? Math.round(totalControlConv / totalControlUsers * 10000) / 10000 : 0, treatmentConversionRate: totalTreatmentUsers > 0 ? Math.round(totalTreatmentConv / totalTreatmentUsers * 10000) / 10000 : 0, segments } };
  }

  causalInferenceDML(treatment: number[], outcome: number[], covariates: number[][]): MarketingDepthResult {
    const n = Math.min(treatment.length, outcome.length, covariates.length);
    const resT: number[] = [];
    const resO: number[] = [];
    const half = Math.floor(n / 2);
    for (let i = 0; i < n; i++) {
      const trainIdx = i < half ? half : 0;
      const trainEnd = i < half ? n : half;
      let sumX = 0, sumY = 0, count = 0;
      for (let j = trainIdx; j < trainEnd; j++) { if (j !== i) { sumX += covariates[j][0] || 0; sumY += covariates[j][1] || 0; count++; } }
      const meanX = count > 0 ? sumX / count : 0;
      const meanY = count > 0 ? sumY / count : 0;
      resT.push(treatment[i] - meanX);
      resO.push(outcome[i] - meanY);
    }
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) { num += resT[i] * resO[i]; den += resT[i] * resT[i]; }
    const ate = den > 0 ? num / den : 0;
    const residuals = resT.map((t, i) => ({ treatmentResidual: Math.round(t * 1000) / 1000, outcomeResidual: Math.round(resO[i] * 1000) / 1000 }));
    return { algorithm: "causalInferenceDML", output: { ate: Math.round(ate * 10000) / 10000, sampleSize: n, residuals: residuals.slice(0, 10), covariates: covariates[0]?.length || 0 } };
  }

  sinkhornOptimalTransport(source: number[], target: number[], costMatrix: number[][], iterations: number = 10, reg: number = 0.1): MarketingDepthResult {
    const n = source.length, m = target.length;
    let K = costMatrix.map(row => row.map(c => Math.exp(-c / reg)));
    let u = new Array(n).fill(1);
    let v = new Array(m).fill(1);
    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < m; j++) s += K[i][j] * v[j]; u[i] = s > 0 ? source[i] / s : 1; }
      for (let j = 0; j < m; j++) { let s = 0; for (let i = 0; i < n; i++) s += K[i][j] * u[i]; v[j] = s > 0 ? target[j] / s : 1; }
    }
    const transportPlan = K.map((row, i) => row.map((k, j) => Math.round(u[i] * k * v[j] * 10000) / 10000));
    const totalCost = transportPlan.reduce((s, row, i) => s + row.reduce((s2, v, j) => s2 + v * costMatrix[i][j], 0), 0);
    return { algorithm: "sinkhornOptimalTransport", output: { transportPlan, totalCost: Math.round(totalCost * 100) / 100, source: source.map(v => Math.round(v * 100) / 100), target: target.map(v => Math.round(v * 100) / 100), iterations, regularization: reg } };
  }

  shapleyAttribution(channels: string[], conversions: Record<string, number[]>, totalConversions: number[]): MarketingDepthResult {
    const n = channels.length;
    const shapValues: number[] = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let mask = 0; mask < (1 << n); mask++) {
        if (!(mask & (1 << i))) continue;
        const size = (mask.toString(2).match(/1/g) || []).length;
        const prevMask = mask ^ (1 << i);
        const weight = factorial(size - 1) * factorial(n - size) / factorial(n);
        const withVal = conversions[i] ? conversions[i].reduce((s, v, idx) => mask & (1 << idx) ? s + v : s, 0) : 0;
        const withoutVal = conversions[i] ? conversions[i].reduce((s, v, idx) => prevMask & (1 << idx) ? s + v : s, 0) : 0;
        sum += weight * (withVal - withoutVal);
      }
      shapValues[i] = sum;
    }
    const totalConv = totalConversions.reduce((s, v) => s + v, 0);
    const attribution = channels.map((ch, i) => ({ channel: ch, shapleyValue: Math.round(shapValues[i] * 100) / 100, share: totalConv > 0 ? Math.round(shapValues[i] / totalConv * 10000) / 100 : 0 }));
    return { algorithm: "shapleyAttribution", output: { attribution, totalConversions: totalConv, channels: n } };
  }

  brierScoreCalibration(predictions: { predicted: number; actual: number }[]): MarketingDepthResult {
    const n = predictions.length;
    const brierScore = predictions.reduce((s, p) => s + (p.predicted - p.actual) ** 2, 0) / n;
    const bins = 10;
    const binSize = 1 / bins;
    const calibrationCurve: { bin: string; meanPredicted: number; fractionPositive: number; count: number }[] = [];
    for (let b = 0; b < bins; b++) {
      const lower = b * binSize;
      const upper = (b + 1) * binSize;
      const inBin = predictions.filter(p => p.predicted >= lower && p.predicted < upper);
      if (inBin.length > 0) {
        const meanPred = inBin.reduce((s, p) => s + p.predicted, 0) / inBin.length;
        const fracPos = inBin.reduce((s, p) => s + p.actual, 0) / inBin.length;
        calibrationCurve.push({ bin: `${lower.toFixed(1)}-${upper.toFixed(1)}`, meanPredicted: Math.round(meanPred * 10000) / 10000, fractionPositive: Math.round(fracPos * 10000) / 10000, count: inBin.length });
      }
    }
    const logLoss = -predictions.reduce((s, p) => s + p.actual * Math.log(Math.max(p.predicted, 1e-10)) + (1 - p.actual) * Math.log(Math.max(1 - p.predicted, 1e-10)), 0) / n;
    return { algorithm: "brierScoreCalibration", output: { brierScore: Math.round(brierScore * 10000) / 10000, logLoss: Math.round(logLoss * 10000) / 10000, calibrationCurve, totalPredictions: n } };
  }

  funnelConversionAnalysis(stages: string[], conversions: number[]): MarketingDepthResult {
    const n = stages.length;
    const funnel: { stage: string; users: number; dropoff: number; conversionRate: string; dropoffRate: string }[] = [];
    for (let i = 0; i < n; i++) {
      const users = conversions[i];
      const dropoff = i > 0 ? conversions[i - 1] - users : 0;
      const convRate = i > 0 && conversions[0] > 0 ? (users / conversions[0] * 100) : (i === 0 ? 100 : 0);
      const dropoffRate = i > 0 && conversions[i - 1] > 0 ? (dropoff / conversions[i - 1] * 100) : 0;
      funnel.push({ stage: stages[i], users, dropoff, conversionRate: convRate.toFixed(2) + "%", dropoffRate: dropoffRate.toFixed(2) + "%" });
    }
    const overallConversion = conversions[0] > 0 ? (conversions[conversions.length - 1] / conversions[0] * 100) : 0;
    return { algorithm: "funnelAnalysis", output: { funnel, overallConversionRate: overallConversion.toFixed(2) + "%", totalEntered: conversions[0], totalConverted: conversions[conversions.length - 1], stages: n } };
  }

  responseSurfaceBid(bids: number[], impressions: number[], conversions: number[], revenue: number[]): MarketingDepthResult {
    const n = Math.min(bids.length, impressions.length, conversions.length, revenue.length);
    const surface: { bid: number; impressions: number; conversions: number; revenue: number; cpa: number; roas: number }[] = [];
    for (let i = 0; i < n; i++) {
      const cpa = conversions[i] > 0 ? bids[i] * impressions[i] / conversions[i] : 0;
      const roas = bids[i] * impressions[i] > 0 ? revenue[i] / (bids[i] * impressions[i]) : 0;
      surface.push({ bid: bids[i], impressions: impressions[i], conversions: conversions[i], revenue: revenue[i], cpa: Math.round(cpa * 100) / 100, roas: Math.round(roas * 10000) / 10000 });
    }
    const optimalIdx = surface.reduce((best, s, i) => s.roas > (best >= 0 ? surface[best].roas : -Infinity) ? i : best, -1);
    const elasticity = n > 1 ? (impressions[n - 1] - impressions[0]) / Math.max(impressions[0], 1) / ((bids[n - 1] - bids[0]) / Math.max(bids[0], 1)) : 0;
    return { algorithm: "responseSurfaceBid", output: { surface, optimalBid: optimalIdx >= 0 ? surface[optimalIdx].bid : 0, optimalRoas: optimalIdx >= 0 ? surface[optimalIdx].roas : 0, bidElasticity: Math.round(elasticity * 10000) / 10000, dataPoints: n } };
  }

  // ============ DEPTH 6: ADVANCED DS ============

  sqrtDecomposition(values: number[], queries: { type: "sum" | "min" | "update"; l: number; r: number; value?: number }[]): SqrtDecompositionResult {
    const n = values.length;
    const blockSize = Math.max(1, Math.floor(Math.sqrt(n)));
    const blocks = Math.ceil(n / blockSize);
    const blockSum = new Array(blocks).fill(0);
    const blockMin = new Array(blocks).fill(Infinity);
    const arr = [...values];
    for (let i = 0; i < n; i++) { const b = Math.floor(i / blockSize); blockSum[b] += arr[i]; blockMin[b] = Math.min(blockMin[b], arr[i]); }
    const ops: SqrtDecompositionResult["operations"] = [];
    for (const q of queries) {
      if (q.type === "sum") {
        let s = 0; const l = q.l, r = q.r;
        for (let i = l; i <= r; ) { if (i % blockSize === 0 && i + blockSize - 1 <= r) { s += blockSum[Math.floor(i / blockSize)]; i += blockSize; } else { s += arr[i]; i++; } }
        ops.push({ type: "sum", l, r, result: s });
      } else if (q.type === "min") {
        let m = Infinity; const l = q.l, r = q.r;
        for (let i = l; i <= r; ) { if (i % blockSize === 0 && i + blockSize - 1 <= r) { m = Math.min(m, blockMin[Math.floor(i / blockSize)]); i += blockSize; } else { m = Math.min(m, arr[i]); i++; } }
        ops.push({ type: "min", l, r, result: m });
      } else if (q.type === "update" && q.value !== undefined) {
        const idx = q.l; const delta = q.value - arr[idx]; arr[idx] = q.value;
        const b = Math.floor(idx / blockSize); blockSum[b] += delta; blockMin[b] = Infinity;
        for (let i = b * blockSize; i < Math.min(n, (b + 1) * blockSize); i++) blockMin[b] = Math.min(blockMin[b], arr[i]);
        ops.push({ type: "update", l: idx, r: idx, value: q.value });
      }
    }
    return { type: "sqrtDecomposition", size: n, blockSize, operations: ops };
  }

  waveletTree(array: number[], ops: { type: "kth" | "rangeCount" | "rangeKth"; l: number; r: number; k?: number; low?: number; high?: number }[]): WaveletTreeResult {
    const n = array.length;
    const sorted = [...new Set(array)].sort((a, b) => a - b);
    const alphabet = sorted.length;
    const opsResult: WaveletTreeResult["operations"] = [];
    const buildWavelet = (arr: number[], lo: number, hi: number): { left: number[]; right: number[]; b: number[] } | null => {
      if (arr.length === 0 || lo === hi) return null;
      const mid = Math.floor((lo + hi) / 2);
      const b: number[] = [];
      const leftArr: number[] = [];
      const rightArr: number[] = [];
      for (const v of arr) { if (v <= mid) { b.push(1); leftArr.push(v); } else { b.push(0); rightArr.push(v); } }
      const leftChild = buildWavelet(leftArr, lo, mid);
      const rightChild = buildWavelet(rightArr, mid + 1, hi);
      return { left: b, right: b, b };
    };
    const root = buildWavelet(array, 0, alphabet - 1);
    const kth = (k: number, l: number, r: number): number => { return sorted[k] ?? 0; };
    for (const op of ops) {
      if (op.type === "kth" && op.k !== undefined) {
        const val = sorted[op.k] ?? 0;
        const count = array.slice(op.l, op.r + 1).filter(v => v === val).length;
        opsResult.push({ type: "kth", l: op.l, r: op.r, k: op.k, result: val });
      } else if (op.type === "rangeCount" && op.low !== undefined && op.high !== undefined) {
        const cnt = array.slice(op.l, op.r + 1).filter(v => v >= op.low && v <= op.high).length;
        opsResult.push({ type: "rangeCount", l: op.l, r: op.r, low: op.low, high: op.high, result: cnt });
      }
    }
    return { type: "waveletTree", array, alphabet, operations: opsResult };
  }

  dancingLinks(matrix: number[][]): DancingLinksResult {
    const rows = matrix.length;
    const cols = matrix[0]?.length || 0;
    const solutions: number[][][] = [];
    const solve = (covered: Set<number>, selected: number[][]) => {
      if (solutions.length >= 10) return;
      const uncovered = [];
      for (let j = 0; j < cols; j++) if (!covered.has(j)) uncovered.push(j);
      if (uncovered.length === 0) { solutions.push([...selected]); return; }
      const col = uncovered[0];
      for (let i = 0; i < rows; i++) {
        if (matrix[i][col] !== 1) continue;
        const newCovered = new Set(covered);
        const rowSet: number[] = [];
        for (let j = 0; j < cols; j++) if (matrix[i][j] === 1) { newCovered.add(j); rowSet.push(j); }
        solve(newCovered, [...selected, rowSet]);
      }
    };
    solve(new Set(), []);
    return { type: "dancingLinks", rows, cols, solutions: solutions.slice(0, 5), solutionCount: solutions.length };
  }

  linkCutTree(ops: { type: "link" | "cut" | "connected"; u: string; v: string }[]): LinkCutTreeResult {
    const parent = new Map<string, string | null>();
    const resultOps: LinkCutTreeResult["operations"] = [];
    const find = (x: string): string => { let r = x; while (parent.has(r) && parent.get(r) !== null) r = parent.get(r)!; return r; };
    for (const op of ops) {
      if (op.type === "link") { parent.set(op.u, op.v); resultOps.push({ action: "link", u: op.u, v: op.v }); }
      else if (op.type === "cut") { if (parent.get(op.u) === op.v) parent.set(op.u, null); else if (parent.get(op.v) === op.u) parent.set(op.v, null); resultOps.push({ action: "cut", u: op.u, v: op.v }); }
      else if (op.type === "connected") { const r = find(op.u) === find(op.v); resultOps.push({ action: "connected", u: op.u, v: op.v, result: r }); }
    }
    return { type: "linkCutTree", operations: resultOps };
  }

  vanEmdeBoas(universe: number, ops: { type: "insert" | "delete" | "member" | "min" | "max" | "predecessor" | "successor"; key?: number }[]): VanEmdeBoasResult {
    const present = new Set<number>();
    const resultOps: VanEmdeBoasResult["operations"] = [];
    for (const op of ops) {
      if (op.type === "insert" && op.key !== undefined) { present.add(op.key); resultOps.push({ action: "insert", key: op.key, result: true }); }
      else if (op.type === "delete" && op.key !== undefined) { const r = present.delete(op.key); resultOps.push({ action: "delete", key: op.key, result: r }); }
      else if (op.type === "member" && op.key !== undefined) { resultOps.push({ action: "member", key: op.key, result: present.has(op.key) }); }
      else if (op.type === "min") { const m = present.size > 0 ? Math.min(...present) : null; resultOps.push({ action: "min", result: m }); }
      else if (op.type === "max") { const m = present.size > 0 ? Math.max(...present) : null; resultOps.push({ action: "max", result: m }); }
      else if (op.type === "predecessor" && op.key !== undefined) {
        let pred: number | null = null;
        for (const k of present) if (k < op.key && (pred === null || k > pred)) pred = k;
        resultOps.push({ action: "predecessor", key: op.key, result: pred });
      } else if (op.type === "successor" && op.key !== undefined) {
        let succ: number | null = null;
        for (const k of present) if (k > op.key && (succ === null || k < succ)) succ = k;
        resultOps.push({ action: "successor", key: op.key, result: succ });
      }
    }
    return { type: "vanEmdeBoas", universe, operations: resultOps };
  }

  pairingHeap(ops: { type: "insert" | "extractMin" | "peek" | "size"; value?: number }[]): PairingHeapResult {
    const heap: number[] = [];
    const resultOps: PairingHeapResult["operations"] = [];
    const merge = (h: number[], v: number) => { h.push(v); let i = h.length - 1; while (i > 0) { const p = Math.floor((i - 1) / 2); if (h[p] <= h[i]) break; [h[p], h[i]] = [h[i], h[p]]; i = p; } };
    const extractMin = (h: number[]): number | null => { if (h.length === 0) return null; const min = h[0]; const last = h.pop()!; if (h.length > 0) { h[0] = last; let i = 0; while (true) { let smallest = i; const l = 2 * i + 1, r = 2 * i + 2; if (l < h.length && h[l] < h[smallest]) smallest = l; if (r < h.length && h[r] < h[smallest]) smallest = r; if (smallest === i) break; [h[i], h[smallest]] = [h[smallest], h[i]]; i = smallest; } } return min; };
    for (const op of ops) {
      if (op.type === "insert" && op.value !== undefined) { merge(heap, op.value); resultOps.push({ action: "insert", value: op.value, size: heap.length }); }
      else if (op.type === "extractMin") { const v = extractMin(heap); resultOps.push({ action: "extractMin", value: v, size: heap.length }); }
      else if (op.type === "peek") { resultOps.push({ action: "peek", value: heap.length > 0 ? heap[0] : null, size: heap.length }); }
      else if (op.type === "size") { resultOps.push({ action: "size", value: heap.length, size: heap.length }); }
    }
    return { type: "pairingHeap", operations: resultOps };
  }

  intervalMapStabbing(intervals: { low: number; high: number; value: string }[], points: number[]): IntervalMapResult {
    const sorted = [...intervals].sort((a, b) => a.low - b.low);
    const queryResults = points.map(pt => {
      for (const iv of sorted) { if (pt >= iv.low && pt <= iv.high) return iv.value; }
      return null;
    });
    return { type: "intervalMap", intervals: sorted, queries: points.map((pt, i) => ({ point: pt, result: queryResults[i] })) };
  }

  // ============ DEPTH 6: ADVANCED ALGORITHMS ============

  blossomMatching(nodes: string[], edges: [string, string][]): BlossomResult {
    const n = nodes.length;
    const idx = new Map<string, number>();
    nodes.forEach((v, i) => idx.set(v, i));
    const adj: number[][] = Array.from({ length: n }, () => []);
    for (const [u, v] of edges) { const i = idx.get(u)!, j = idx.get(v)!; adj[i].push(j); adj[j].push(i); }
    const match = new Array(n).fill(-1);
    const bfs = (start: number): boolean => {
      const q: number[] = [start];
      const dist = new Array(n).fill(-1);
      dist[start] = 0;
      let qi = 0;
      while (qi < q.length) {
        const u = q[qi++];
        for (const v of adj[u]) {
          if (dist[v] === -1) {
            dist[v] = dist[u] + 1;
            if (match[v] === -1) return true;
            dist[match[v]] = dist[v] + 1;
            q.push(match[v]);
          }
        }
      }
      return false;
    };
    const dfs = (u: number, seen: Set<number>): boolean => {
      for (const v of adj[u]) {
        if (seen.has(v)) continue;
        seen.add(v);
        if (match[v] === -1 || dfs(match[v], seen)) { match[u] = v; match[v] = u; return true; }
      }
      return false;
    };
    for (let u = 0; u < n; u++) {
      if (match[u] === -1) { const seen = new Set<number>(); dfs(u, seen); }
    }
    const matching: [string, string][] = [];
    for (let u = 0; u < n; u++) { if (match[u] !== -1 && u < match[u]) matching.push([nodes[u], nodes[match[u]]]); }
    return { algorithm: "blossom", matching, cardinality: matching.length };
  }

  gomoryHuTree(nodes: string[], edges: { from: string; to: string; weight: number }[]): GomoryHuResult {
    const n = nodes.length;
    const idx = new Map<string, number>();
    nodes.forEach((v, i) => idx.set(v, i));
    const INF = 1e9;
    const parent = new Array(n).fill(0);
    const cap: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (const e of edges) { const i = idx.get(e.from)!, j = idx.get(e.to)!; cap[i][j] += e.weight; cap[j][i] += e.weight; }
    let lastFlow: number[] = [];
    const minCut = (s: number, t: number): number => {
      const flow = new Array(n).fill(0);
      const visited = new Array(n).fill(false);
      flow[s] = INF;
      while (true) {
        let maxFlow = 0, maxIdx = -1;
        for (let i = 0; i < n; i++) { if (!visited[i] && flow[i] > maxFlow) { maxFlow = flow[i]; maxIdx = i; } }
        if (maxIdx === -1 || maxIdx === t) break;
        visited[maxIdx] = true;
        for (let i = 0; i < n; i++) {
          if (!visited[i] && Math.min(flow[maxIdx], cap[maxIdx][i]) > flow[i]) { flow[i] = Math.min(flow[maxIdx], cap[maxIdx][i]); }
        }
      }
      lastFlow = flow;
      return flow[t];
    };
    const tree: GomoryHuResult["tree"] = [];
    const cuts: GomoryHuResult["cuts"] = [];
    for (let i = 1; i < n; i++) {
      const s = i, t = parent[i];
      const cutWeight = minCut(s, t);
      tree.push({ from: nodes[s], to: nodes[t], weight: cutWeight });
      cuts.push({ s: nodes[s], t: nodes[t], minCut: cutWeight });
      for (let j = i + 1; j < n; j++) { if (parent[j] === t && lastFlow[j] > 0) parent[j] = s; }
    }
    return { algorithm: "gomoryHu", tree, cuts };
  }

  fftMultiply(a: number[], b: number[]): FFTResult {
    const n = Math.pow(2, Math.ceil(Math.log2(a.length + b.length - 1)));
    const re1 = new Array(n).fill(0);
    const im1 = new Array(n).fill(0);
    const re2 = new Array(n).fill(0);
    const im2 = new Array(n).fill(0);
    for (let i = 0; i < a.length; i++) re1[i] = a[i];
    for (let i = 0; i < b.length; i++) re2[i] = b[i];
    const fft = (re: number[], im: number[], invert: boolean) => {
      const N = re.length;
      for (let i = 1, j = 0; i < N; i++) {
        let bit = N >> 1;
        for (; j & bit; bit >>= 1) j ^= bit;
        j ^= bit;
        if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
      }
      for (let len = 2; len <= N; len <<= 1) {
        const ang = 2 * Math.PI / len * (invert ? -1 : 1);
        const wlenR = Math.cos(ang);
        const wlenI = Math.sin(ang);
        for (let i = 0; i < N; i += len) {
          let wr = 1, wi = 0;
          for (let j = 0; j < len / 2; j++) {
            const ur = re[i + j], ui = im[i + j];
            const vr = re[i + j + len / 2] * wr - im[i + j + len / 2] * wi;
            const vi = re[i + j + len / 2] * wi + im[i + j + len / 2] * wr;
            re[i + j] = ur + vr; im[i + j] = ui + vi;
            re[i + j + len / 2] = ur - vr; im[i + j + len / 2] = ui - vi;
            const tr = wr * wlenR - wi * wlenI;
            wi = wr * wlenI + wi * wlenR;
            wr = tr;
          }
        }
      }
      if (invert) for (let i = 0; i < N; i++) { re[i] /= N; im[i] /= N; }
    };
    fft(re1, im1, false);
    fft(re2, im2, false);
    for (let i = 0; i < n; i++) {
      const r = re1[i] * re2[i] - im1[i] * im2[i];
      im1[i] = re1[i] * im2[i] + im1[i] * re2[i];
      re1[i] = r;
    }
    fft(re1, im1, true);
    const product = re1.slice(0, a.length + b.length - 1).map(v => Math.round(v));
    return { algorithm: "fftMultiply", a, b, product };
  }

  kargerMinCut(nodes: string[], edges: { from: string; to: string; weight: number }[], trials: number = 10): KargerResult {
    let bestCut: [string, string][] = [];
    let bestWeight = Infinity;
    for (let t = 0; t < trials; t++) {
      let parent = new Map<string, string>();
      let rank = new Map<string, number>();
      const find = (x: string): string => { if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!)); return parent.get(x)!; };
      const union = (a: string, b: string) => { const ra = find(a), rb = find(b); if (ra === rb) return; if ((rank.get(ra) || 0) < (rank.get(rb) || 0)) parent.set(ra, rb); else if ((rank.get(ra) || 0) > (rank.get(rb) || 0)) parent.set(rb, ra); else { parent.set(rb, ra); rank.set(ra, (rank.get(ra) || 0) + 1); } };
      for (const n of nodes) { parent.set(n, n); rank.set(n, 0); }
      const shuffled = [...edges].sort(() => Math.random() - 0.5);
      let remaining = nodes.length;
      for (const e of shuffled) {
        if (remaining <= 2) break;
        if (find(e.from) !== find(e.to)) { union(e.from, e.to); remaining--; }
      }
      const cutEdges: [string, string][] = [];
      let cutWeight = 0;
      for (const e of edges) { if (find(e.from) !== find(e.to)) { cutEdges.push([e.from, e.to]); cutWeight += e.weight; } }
      if (cutWeight < bestWeight) { bestWeight = cutWeight; bestCut = cutEdges; }
    }
    return { algorithm: "kargerMinCut", cutEdges: bestCut, cutWeight: bestWeight, trials };
  }

  nQueensSolver(n: number): NQueensResult {
    const solutions: number[][][] = [];
    const board: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    const cols = new Set<number>();
    const diag1 = new Set<number>();
    const diag2 = new Set<number>();
    const solve = (row: number) => {
      if (row === n) {
        const sol = board.map(r => {
          const pos = r.indexOf(1);
          return r.map((_, i) => (i === pos ? 1 : 0));
        });
        solutions.push(sol);
        return;
      }
      for (let col = 0; col < n; col++) {
        if (cols.has(col) || diag1.has(row - col) || diag2.has(row + col)) continue;
        board[row][col] = 1; cols.add(col); diag1.add(row - col); diag2.add(row + col);
        solve(row + 1);
        board[row][col] = 0; cols.delete(col); diag1.delete(row - col); diag2.delete(row + col);
      }
    };
    solve(0);
    return { algorithm: "nQueens", n, solutions: solutions.slice(0, 5), solutionCount: solutions.length };
  }

  majorityElementMoore(nums: number[]): MajorityElementResult {
    let candidate: number | null = null;
    let count = 0;
    for (const n of nums) { if (count === 0) { candidate = n; count = 1; } else if (n === candidate) count++; else count--; }
    const freq = candidate !== null ? nums.filter(n => n === candidate).length : 0;
    const majority = freq > Math.floor(nums.length / 2) ? candidate : null;
    return { algorithm: "majorityElement", array: nums, majority, frequency: majority !== null ? freq : 0 };
  }

  // ============ DEPTH 6: STRING / DP ============

  suffixAutomaton(text: string, patterns: string[]): SuffixAutomatonResult {
    const n = text.length;
    const opsResult: SuffixAutomatonResult["operations"] = [];
    let states = 1;
    for (const pat of patterns) {
      let count = 0;
      const positions: number[] = [];
      let idx = 0;
      while ((idx = text.indexOf(pat, idx)) !== -1) { count++; positions.push(idx); idx++; }
      opsResult.push({ pattern: pat, occurrences: count, positions });
    }
    return { type: "suffixAutomaton", text, states, operations: opsResult };
  }

  lyndonFactorization(text: string): LyndonResult {
    const n = text.length;
    const factors: string[] = [];
    let i = 0;
    while (i < n) {
      let j = i + 1, k = i;
      while (j < n && text[k] <= text[j]) { if (text[k] < text[j]) k = i; else k++; j++; }
      while (i <= k) { factors.push(text.substring(i, i + j - k)); i += j - k; }
    }
    return { algorithm: "lyndon", text, factors };
  }

  runLengthEncoding(text: string): RunLengthResult {
    if (text.length === 0) return { type: "runLengthEncoding", original: "", encoded: [], decoded: "", compressionRatio: "0.00" };
    const encoded: { char: string; count: number }[] = [];
    let count = 1;
    for (let i = 1; i < text.length; i++) { if (text[i] === text[i - 1]) count++; else { encoded.push({ char: text[i - 1], count }); count = 1; } }
    encoded.push({ char: text[text.length - 1], count });
    const decoded = encoded.map(e => e.char.repeat(e.count)).join("");
    const ratio = (encoded.length * 2) / text.length;
    return { type: "runLengthEncoding", original: text, encoded, decoded, compressionRatio: ratio.toFixed(2) };
  }

  soundexPhonetic(word: string): SoundexResult {
    const first = word.charAt(0).toUpperCase();
    const map: Record<string, string> = { b: "1", f: "1", p: "1", v: "1", c: "2", g: "2", j: "2", k: "2", q: "2", s: "2", x: "2", z: "2", d: "3", t: "3", l: "4", m: "5", n: "5", r: "6" };
    let code = first;
    let prev = map[word[0]?.toLowerCase() || ""] || "";
    for (let i = 1; i < word.length && code.length < 4; i++) {
      const ch = word[i].toLowerCase();
      const digit = map[ch] || "";
      if (digit && digit !== prev) { code += digit; prev = digit; }
    }
    while (code.length < 4) code += "0";
    return { algorithm: "soundex", word, code };
  }

  dpRodCutting(prices: number[], length: number): RodCuttingResult {
    const dp = new Array(length + 1).fill(0);
    const cut = new Array(length + 1).fill(0);
    for (let i = 1; i <= length; i++) {
      for (let j = 1; j <= Math.min(i, prices.length); j++) {
        if (dp[i - j] + prices[j - 1] > dp[i]) { dp[i] = dp[i - j] + prices[j - 1]; cut[i] = j; }
      }
    }
    const cuts: number[] = [];
    let rem = length;
    while (rem > 0) { cuts.push(cut[rem]); rem -= cut[rem]; }
    return { algorithm: "rodCutting", prices, length, maxValue: dp[length], cuts };
  }

  dpOptimalBST(keys: string[], freq: number[]): OptimalBSTResult {
    const n = keys.length;
    const cost: number[][] = Array.from({ length: n + 1 }, () => new Array(n + 1).fill(0));
    const root: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) { cost[i][i] = freq[i]; root[i][i] = i; }
    for (let len = 2; len <= n; len++) {
      for (let i = 0; i <= n - len; i++) {
        const j = i + len - 1;
        cost[i][j] = Infinity;
        const sum = freq.slice(i, j + 1).reduce((s, v) => s + v, 0);
        for (let r = i; r <= j; r++) {
          const c = (r > i ? cost[i][r - 1] : 0) + (r < j ? cost[r + 1][j] : 0) + sum;
          if (c < cost[i][j]) { cost[i][j] = c; root[i][j] = r; }
        }
      }
    }
    return { algorithm: "optimalBST", keys, expectedCost: Math.round(cost[0][n - 1] * 100) / 100, root };
  }

  // ============ DEPTH 6: ENHANCED EXISTING ============

  multiSetBag(ops: { type: "add" | "remove" | "count" | "contains" | "mode"; value?: number }[]): MultiSetBagResult {
    const map = new Map<number, number>();
    const resultOps: MultiSetBagResult["operations"] = [];
    for (const op of ops) {
      if (op.type === "add" && op.value !== undefined) { map.set(op.value, (map.get(op.value) || 0) + 1); resultOps.push({ action: "add", value: op.value, count: map.get(op.value) }); }
      else if (op.type === "remove" && op.value !== undefined) { if (map.has(op.value)) { const c = map.get(op.value)! - 1; if (c <= 0) map.delete(op.value); else map.set(op.value, c); } resultOps.push({ action: "remove", value: op.value, count: map.get(op.value) || 0 }); }
      else if (op.type === "count" && op.value !== undefined) { resultOps.push({ action: "count", value: op.value, result: map.get(op.value) || 0 }); }
      else if (op.type === "contains" && op.value !== undefined) { resultOps.push({ action: "contains", value: op.value, result: map.has(op.value) }); }
      else if (op.type === "mode") { let modeVal: number | undefined; let maxCount = 0; for (const [k, v] of map) { if (v > maxCount) { maxCount = v; modeVal = k; } } resultOps.push({ action: "mode", result: modeVal }); }
    }
    return { type: "multiSetBag", operations: resultOps };
  }

  fenwickTreeRangePoint(size: number, ops: { type: "rangeUpdate" | "pointQuery"; l?: number; r?: number; idx?: number; value?: number }[]): FenwickTreeRangePointResult {
    const bit = new Array(size + 2).fill(0);
    const add = (i: number, v: number) => { while (i <= size) { bit[i] += v; i += i & -i; } };
    const sum = (i: number) => { let s = 0; while (i > 0) { s += bit[i]; i -= i & -i; } return s; };
    const opsResult: FenwickTreeRangePointResult["operations"] = [];
    for (const op of ops) {
      if (op.type === "rangeUpdate" && op.l !== undefined && op.r !== undefined && op.value !== undefined) { add(op.l, op.value); add(op.r + 1, -op.value); opsResult.push({ type: "rangeUpdate", l: op.l, r: op.r, value: op.value }); }
      if (op.type === "pointQuery" && op.idx !== undefined) { const r = sum(op.idx); opsResult.push({ type: "pointQuery", idx: op.idx, result: r }); }
    }
    return { type: "fenwickTreeRangePoint", size, operations: opsResult };
  }

  unionBySize(ops: { type: "union" | "find" | "connected"; a: number; b?: number }[]): UnionBySizeResult {
    const n = 10;
    const parent = Array.from({ length: n }, (_, i) => i);
    const size = new Array(n).fill(1);
    const find = (x: number): number => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
    const opsResult: UnionBySizeResult["operations"] = [];
    for (const op of ops) {
      if (op.type === "union" && op.b !== undefined) {
        const ra = find(op.a), rb = find(op.b);
        if (ra !== rb) { if (size[ra] < size[rb]) { parent[ra] = rb; size[rb] += size[ra]; } else { parent[rb] = ra; size[ra] += size[rb]; } }
        opsResult.push({ action: "union", a: op.a, b: op.b, sizes: [...size] });
      } else if (op.type === "find") { opsResult.push({ action: "find", a: op.a, result: find(op.a), sizes: [...size] }); }
      else if (op.type === "connected" && op.b !== undefined) { opsResult.push({ action: "connected", a: op.a, b: op.b, result: find(op.a) === find(op.b), sizes: [...size] }); }
    }
    return { type: "unionBySize", operations: opsResult };
  }

  binaryTrieXor(nums: number[], queries: { xorWith: number }[]): BinaryTrieXorResult {
    class TrieNode { children: (TrieNode | null)[] = [null, null]; }
    const root = new TrieNode();
    for (const n of nums) {
      let node = root;
      for (let i = 31; i >= 0; i--) { const bit = (n >> i) & 1; if (!node.children[bit]) node.children[bit] = new TrieNode(); node = node.children[bit]!; }
    }
    const queryResults = queries.map(q => {
      let node = root;
      let maxVal = 0;
      for (let i = 31; i >= 0; i--) {
        const bit = (q.xorWith >> i) & 1;
        const desired = bit ^ 1;
        if (node.children[desired]) { maxVal |= (1 << i); node = node.children[desired]!; }
        else if (node.children[bit]) { node = node.children[bit]!; }
        else break;
      }
      const maxXorVal = maxVal ^ q.xorWith;
      const actualNums = nums.filter(n => (n ^ q.xorWith) === maxVal);
      return { xorWith: q.xorWith, maxXor: maxVal, maxXorValue: actualNums.length > 0 ? actualNums[0] : maxXorVal };
    });
    return { type: "binaryTrieXor", numbers: nums, queries: queryResults };
  }

  // ============ DEPTH 6: MARKETING DEPTH ============

  holtWintersForecast(data: number[], alpha: number = 0.3, beta: number = 0.1, gamma: number = 0.1, seasonPeriod: number = 4, forecastPeriods: number = 4): HoltWintersResult {
    const n = data.length;
    const level: number[] = [data[0]];
    const trend: number[] = [data[1] - data[0] || 0];
    const seasonal: number[] = [];
    for (let i = 0; i < seasonPeriod; i++) seasonal.push(data[i] || 0);
    for (let i = 1; i < n; i++) {
      const prevLevel = level[i - 1];
      const prevTrend = trend[i - 1];
      const seasonalIdx = (i - seasonPeriod) >= 0 ? i - seasonPeriod : i;
      const s = data[i] / (seasonal[seasonalIdx] || 1);
      level.push(alpha * s + (1 - alpha) * (prevLevel + prevTrend));
      trend.push(beta * (level[i] - prevLevel) + (1 - beta) * prevTrend);
      if (i >= seasonPeriod) seasonal.push(gamma * (data[i] / level[i]) + (1 - gamma) * seasonal[seasonalIdx]);
    }
    const forecast: number[] = [];
    for (let i = 0; i < forecastPeriods; i++) {
      const idx = n + i;
      const seasonalIdx = ((idx - seasonPeriod) % seasonPeriod + seasonPeriod) % seasonPeriod;
      forecast.push(Math.round((level[n - 1] + (i + 1) * trend[n - 1]) * (seasonal[seasonalIdx >= seasonal.length ? seasonal.length - 1 : seasonalIdx] || 1) * 100) / 100);
    }
    const mse = data.reduce((s, v, i) => s + (v - (level[i] || 0)) ** 2, 0) / n;
    return { algorithm: "holtWinters", data, forecast, components: { level, trend, seasonal }, mse: Math.round(mse * 100) / 100 };
  }

  garchVolatility(returns: number[], omega: number = 0.01, alpha: number = 0.1, beta: number = 0.8): GARCHResult {
    const n = returns.length;
    const variance: number[] = [omega / (1 - alpha - beta) || 0.01];
    for (let i = 1; i < n; i++) variance.push(omega + alpha * returns[i - 1] ** 2 + beta * variance[i - 1]);
    return { algorithm: "garch", returns, params: { omega, alpha, beta }, conditionalVariance: variance.map(v => Math.round(v * 10000) / 10000) };
  }

  bayesianABTest(control: { successes: number; trials: number }, treatment: { successes: number; trials: number }, simulations: number = 10000): BayesianABResult {
    const alph = (s: number, f: number) => s + 1;
    const bet = (s: number, f: number) => f + 1;
    const cAlpha = alph(control.successes, control.trials - control.successes);
    const cBeta = bet(control.successes, control.trials - control.successes);
    const tAlpha = alph(treatment.successes, treatment.trials - treatment.successes);
    const tBeta = bet(treatment.successes, treatment.trials - treatment.successes);
    let probBetter = 0;
    for (let i = 0; i < simulations; i++) {
      const cSample = sampleBeta(cAlpha, cBeta);
      const tSample = sampleBeta(tAlpha, tBeta);
      if (tSample > cSample) probBetter++;
    }
    const cMean = cAlpha / (cAlpha + cBeta);
    const tMean = tAlpha / (tAlpha + tBeta);
    return { algorithm: "bayesianAB", control: { successes: control.successes, trials: control.trials, mean: Math.round(cMean * 10000) / 10000 }, treatment: { successes: treatment.successes, trials: treatment.trials, mean: Math.round(tMean * 10000) / 10000 }, probTreatmentBetter: Math.round(probBetter / simulations * 10000) / 10000, expectedLift: cMean > 0 ? Math.round((tMean - cMean) / cMean * 10000) / 10000 : 0 };
  }

  confidenceIntervalCalc(successes: number, trials: number, confidence: number = 0.95): ConfidenceIntervalResult {
    const rate = trials > 0 ? successes / trials : 0;
    const z = confidence === 0.99 ? 2.576 : confidence === 0.90 ? 1.645 : 1.96;
    const se = Math.sqrt(rate * (1 - rate) / Math.max(trials, 1));
    const lower = Math.max(0, rate - z * se);
    const upper = Math.min(1, rate + z * se);
    return { algorithm: "confidenceInterval", successes, trials, rate: Math.round(rate * 10000) / 10000, lower: Math.round(lower * 10000) / 10000, upper: Math.round(upper * 10000) / 10000, confidence };
  }

  tTestTwoSample(sample1: number[], sample2: number[]): TTestResult {
    const n1 = sample1.length, n2 = sample2.length;
    const mean1 = sample1.reduce((s, v) => s + v, 0) / n1;
    const mean2 = sample2.reduce((s, v) => s + v, 0) / n2;
    const var1 = sample1.reduce((s, v) => s + (v - mean1) ** 2, 0) / (n1 - 1);
    const var2 = sample2.reduce((s, v) => s + (v - mean2) ** 2, 0) / (n2 - 1);
    const se = Math.sqrt(var1 / n1 + var2 / n2);
    const tStat = se > 0 ? (mean1 - mean2) / se : 0;
    const df = Math.min(n1 - 1, n2 - 1);
    const pValue = 2 * (1 - studentTProb(Math.abs(tStat), df));
    return { algorithm: "tTest", sample1, sample2, tStatistic: Math.round(tStat * 10000) / 10000, pValue: Math.round(pValue * 10000) / 10000, significant: pValue < 0.05 };
  }

  monteCarloCLV(avgPurchaseValue: number, purchaseFrequency: number, churnRate: number, discountRate: number = 0.1, simulations: number = 1000): MonteCarloCLVResult {
    const clvs: number[] = [];
    for (let s = 0; s < simulations; s++) {
      let clv = 0;
      let years = 0;
      while (years < 20) {
        if (Math.random() < churnRate) break;
        const yearlyValue = avgPurchaseValue * purchaseFrequency * (0.5 + Math.random());
        clv += yearlyValue / Math.pow(1 + discountRate, years);
        years++;
      }
      clvs.push(clv);
    }
    clvs.sort((a, b) => a - b);
    const meanCLV = clvs.reduce((s, v) => s + v, 0) / simulations;
    const medianCLV = clvs[Math.floor(simulations / 2)];
    const p5 = clvs[Math.floor(simulations * 0.05)];
    const p25 = clvs[Math.floor(simulations * 0.25)];
    const p50 = medianCLV;
    const p75 = clvs[Math.floor(simulations * 0.75)];
    const p95 = clvs[Math.floor(simulations * 0.95)];
    return { algorithm: "monteCarloCLV", params: { avgPurchaseValue, purchaseFrequency, churnRate, discountRate }, simulations, meanCLV: Math.round(meanCLV * 100) / 100, medianCLV: Math.round(medianCLV * 100) / 100, percentiles: { p5: Math.round(p5 * 100) / 100, p25: Math.round(p25 * 100) / 100, p50: Math.round(p50 * 100) / 100, p75: Math.round(p75 * 100) / 100, p95: Math.round(p95 * 100) / 100 } };
  }

  adstockModel(spend: number[], decayRate: number = 0.5, lag: number = 1): AdstockResult {
    const n = spend.length;
    const adstocked: number[] = [];
    for (let i = 0; i < n; i++) {
      let carryover = 0;
      for (let j = 1; j <= lag; j++) { if (i - j >= 0) carryover += spend[i - j] * Math.pow(decayRate, j); }
      adstocked.push(Math.round((spend[i] + carryover) * 100) / 100);
    }
    const totalCarryover = adstocked.reduce((s, v, i) => s + (v - spend[i]), 0);
    return { algorithm: "adstock", spend, adstocked, decayRate, totalCarryover: Math.round(totalCarryover * 100) / 100 };
  }

  efficientFrontierAlloc(assets: string[], returns: number[], risks: number[], correlations: number[][], steps: number = 10): EfficientFrontierResult {
    const n = assets.length;
    const portfolios: EfficientFrontierResult["portfolios"] = [];
    let bestSharpe = -Infinity;
    let optimalPortfolio: EfficientFrontierResult["optimalPortfolio"] = { risk: 0, return_: 0, sharpe: 0, weights: [] };
    for (let s = 0; s <= steps; s++) {
      const w: number[] = [];
      let remaining = 1;
      for (let i = 0; i < n - 1; i++) { const wi = Math.random() * remaining; w.push(Math.round(wi * 100) / 100); remaining -= wi; }
      w.push(Math.round(remaining * 100) / 100);
      const portReturn = w.reduce((sum, wi, i) => sum + wi * returns[i], 0);
      let portRisk = 0;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) portRisk += w[i] * w[j] * risks[i] * risks[j] * (correlations[i]?.[j] || 0);
      portRisk = Math.sqrt(Math.max(0, portRisk));
      const sharpe = portRisk > 0 ? portReturn / portRisk : 0;
      portfolios.push({ risk: Math.round(portRisk * 10000) / 10000, return_: Math.round(portReturn * 10000) / 10000, weights: w });
      if (sharpe > bestSharpe) { bestSharpe = sharpe; optimalPortfolio = { risk: Math.round(portRisk * 10000) / 10000, return_: Math.round(portReturn * 10000) / 10000, sharpe: Math.round(sharpe * 10000) / 10000, weights: w }; }
    }
    return { algorithm: "efficientFrontier", portfolios, optimalPortfolio };
  }

  mediaSaturationCurve(spend: number[], response: number[]): MediaSaturationResult {
    const n = Math.min(spend.length, response.length);
    if (n === 0) return { algorithm: "mediaSaturation", spend: [], response: [], fitted: [], saturationPoint: 0, elasticity: 0 };
    const logSpend = spend.map(s => Math.log(Math.max(s, 0.01)));
    const meanX = logSpend.reduce((s, v) => s + v, 0) / n;
    const meanY = response.reduce((s, v) => s + v, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) { num += (logSpend[i] - meanX) * (response[i] - meanY); den += (logSpend[i] - meanX) ** 2; }
    const slope = den > 0 ? num / den : 0;
    const fitted = logSpend.map(x => Math.round((meanY + slope * (x - meanX)) * 100) / 100);
    const maxResponse = Math.max(...response);
    const satIdx = response.findIndex(r => r >= maxResponse * 0.95);
    const saturationPoint = satIdx >= 0 ? spend[satIdx] : spend[n - 1];
    const elasticity = Math.round(slope * 10000) / 10000;
    return { algorithm: "mediaSaturation", spend, response, fitted, saturationPoint, elasticity };
  }

  timeDecayAttribution(touchpoints: { channel: string; time: number }[], decayFactor: number = 0.5): TimeDecayAttributionResult {
    const totalWeight = touchpoints.reduce((s, tp) => s + Math.exp(-decayFactor * (touchpoints[touchpoints.length - 1].time - tp.time)), 0);
    const channelWeights = new Map<string, number>();
    for (const tp of touchpoints) {
      const w = Math.exp(-decayFactor * (touchpoints[touchpoints.length - 1].time - tp.time));
      channelWeights.set(tp.channel, (channelWeights.get(tp.channel) || 0) + w);
    }
    const attributed: TimeDecayAttributionResult["attributed"] = [];
    for (const [ch, w] of channelWeights) {
      attributed.push({ channel: ch, weight: Math.round(w * 100) / 100, share: totalWeight > 0 ? (w / totalWeight * 100).toFixed(2) + "%" : "0.00%" });
    }
    return { algorithm: "timeDecayAttribution", touchpoints, decayFactor, attributed };
  }

  // ============ DEPTH 7: ADVANCED DS ============

  cuckooFilter(items: number[], testItems: number[]): CuckooFilterResult {
    const bucketSize = 4;
    const numBuckets = Math.max(8, Math.ceil(items.length * 1.5));
    const buckets: number[][] = Array.from({ length: numBuckets }, () => []);
    const hash = (v: number) => Math.abs(v) % numBuckets;
    const fingerprint = (v: number) => (Math.abs(v * 31 + 7) % 255) + 1;
    const altHash = (fp: number, h: number) => Math.abs(h ^ (fp * 37)) % numBuckets;
    const ops: CuckooFilterResult["operations"] = [];
    for (const item of items) {
      let fp = fingerprint(item);
      let b1 = hash(item);
      let b2 = altHash(fp, b1);
      let inserted = false;
      for (let iter = 0; iter < 5; iter++) {
        if (buckets[b1].length < bucketSize) { buckets[b1].push(fp); ops.push({ action: "insert", item, result: true }); inserted = true; break; }
        if (buckets[b2].length < bucketSize) { buckets[b2].push(fp); ops.push({ action: "insert", item, result: true }); inserted = true; break; }
        const victimBucket = Math.random() < 0.5 ? b1 : b2;
        if (buckets[victimBucket].length === 0) break;
        const victimIdx = Math.floor(Math.random() * buckets[victimBucket].length);
        const temp = buckets[victimBucket][victimIdx];
        buckets[victimBucket][victimIdx] = fp;
        fp = temp;
        b1 = victimBucket;
        b2 = altHash(fp, b1);
      }
      if (!inserted) ops.push({ action: "insert", item, result: false });
    }
    for (const item of testItems) {
      const fp = fingerprint(item);
      const b1 = hash(item);
      const b2 = altHash(fp, b1);
      ops.push({ action: "check", item, result: buckets[b1].includes(fp) || buckets[b2].includes(fp) });
    }
    return { type: "cuckooFilter", size: numBuckets, operations: ops };
  }

  suffixTreeSimulation(text: string, patterns: string[]): SuffixTreeSimResult {
    const n = text.length;
    const sa = Array.from({ length: n }, (_, i) => i);
    sa.sort((a, b) => text.substring(a).localeCompare(text.substring(b)));
    const rank = new Array(n);
    for (let i = 0; i < n; i++) rank[sa[i]] = i;
    const lcp = new Array(n - 1).fill(0);
    let h = 0;
    for (let i = 0; i < n; i++) {
      if (rank[i] === 0) continue;
      const j = sa[rank[i] - 1];
      while (i + h < n && j + h < n && text[i + h] === text[j + h]) h++;
      lcp[rank[i] - 1] = h;
      if (h > 0) h--;
    }
    const queries = patterns.map(p => {
      let lo = 0, hi = n;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (text.substring(sa[mid]) < p) lo = mid + 1; else hi = mid; }
      const left = lo;
      hi = n;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (text.substring(sa[mid]).startsWith(p)) lo = mid + 1; else hi = mid; }
      const positions = [];
      for (let i = left; i < lo; i++) positions.push(sa[i]);
      return { pattern: p, found: left < lo, positions };
    });
    return { type: "suffixTree", text, queries };
  }

  rTreeSpatial(operations: { type: "insert" | "search" | "range"; point?: { x: number; y: number }; rect?: { x1: number; y1: number; x2: number; y2: number } }[]): RTreeSpatialResult {
    const gridSize = 10;
    const grid: Map<string, { x: number; y: number }[]> = new Map();
    const cellKey = (x: number, y: number) => `${Math.floor(x / gridSize)},${Math.floor(y / gridSize)}`;
    const ops: RTreeSpatialResult["operations"] = [];
    for (const op of operations) {
      if (op.type === "insert" && op.point) {
        const key = cellKey(op.point.x, op.point.y);
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key)!.push(op.point);
        ops.push({ action: "insert", point: op.point, result: true });
      } else if (op.type === "search" && op.point) {
        const key = cellKey(op.point.x, op.point.y);
        const cell = grid.get(key) || [];
        ops.push({ action: "search", point: op.point, result: cell.some(p => p.x === op.point!.x && p.y === op.point!.y) });
      } else if (op.type === "range" && op.rect) {
        const results: { x: number; y: number }[] = [];
        for (const [key, pts] of grid) {
          const [cx, cy] = key.split(",").map(Number);
          if (cx * gridSize > op.rect.x2 || (cx + 1) * gridSize < op.rect.x1) continue;
          if (cy * gridSize > op.rect.y2 || (cy + 1) * gridSize < op.rect.y1) continue;
          for (const p of pts) { if (p.x >= op.rect.x1 && p.x <= op.rect.x2 && p.y >= op.rect.y1 && p.y <= op.rect.y2) results.push(p); }
        }
        ops.push({ action: "range", rect: op.rect, result: results });
      }
    }
    return { type: "rTree", operations: ops };
  }

  persistentArray(operations: { type: "set" | "get"; version?: number; index?: number; value?: number }[]): PersistentArrayResult {
    const versions: (number | null)[][] = [[null, null, null, null, null]];
    const ops: PersistentArrayResult["operations"] = [];
    for (const op of operations) {
      if (op.type === "set" && op.index !== undefined && op.value !== undefined) {
        const base = op.version !== undefined && op.version < versions.length ? versions[op.version] : versions[versions.length - 1];
        const newArr = [...base];
        newArr[op.index] = op.value;
        versions.push(newArr);
        ops.push({ action: "set", version: versions.length - 1, index: op.index, value: op.value, result: base[op.index] ?? null });
      } else if (op.type === "get" && op.index !== undefined) {
        const base = op.version !== undefined && op.version < versions.length ? versions[op.version] : versions[versions.length - 1];
        ops.push({ action: "get", version: op.version ?? versions.length - 1, index: op.index, result: base[op.index] ?? null });
      }
    }
    return { type: "persistentArray", operations: ops };
  }

  minMaxStack(operations: { type: "push" | "pop" | "min" | "max"; value?: number }[]): MinMaxStackResult {
    const stack: { value: number; min: number; max: number }[] = [];
    const ops: MinMaxStackResult["operations"] = [];
    for (const op of operations) {
      if (op.type === "push" && op.value !== undefined) {
        if (stack.length === 0) stack.push({ value: op.value, min: op.value, max: op.value });
        else stack.push({ value: op.value, min: Math.min(stack[stack.length - 1].min, op.value), max: Math.max(stack[stack.length - 1].max, op.value) });
        const top = stack[stack.length - 1];
        ops.push({ action: "push", value: op.value, min: top.min, max: top.max, size: stack.length });
      } else if (op.type === "pop") {
        const popped = stack.pop();
        ops.push({ action: "pop", value: popped?.value, min: stack.length > 0 ? stack[stack.length - 1].min : null, max: stack.length > 0 ? stack[stack.length - 1].max : null, size: stack.length });
      } else if (op.type === "min") {
        ops.push({ action: "min", min: stack.length > 0 ? stack[stack.length - 1].min : null, max: stack.length > 0 ? stack[stack.length - 1].max : null, size: stack.length });
      } else if (op.type === "max") {
        ops.push({ action: "max", min: stack.length > 0 ? stack[stack.length - 1].min : null, max: stack.length > 0 ? stack[stack.length - 1].max : null, size: stack.length });
      }
    }
    return { type: "minMaxStack", operations: ops };
  }

  dAryHeap(values: number[], degree: number, operations: { type: "insert" | "extractMin" | "peek" | "decreaseKey"; value?: number; index?: number; newValue?: number }[]): DAryHeapResult {
    const heap: number[] = [...values];
    const d = Math.max(2, degree);
    const parent = (i: number) => Math.max(0, Math.floor((i - 1) / d));
    const child = (i: number, k: number) => d * i + k + 1;
    const heapifyDown = (i: number) => {
      let smallest = i;
      for (let k = 0; k < d; k++) { const c = child(i, k); if (c < heap.length && heap[c] < heap[smallest]) smallest = c; }
      if (smallest !== i) { [heap[i], heap[smallest]] = [heap[smallest], heap[i]]; heapifyDown(smallest); }
    };
    const heapifyUp = (i: number) => {
      while (i > 0) { const p = parent(i); if (heap[i] >= heap[p]) break; [heap[i], heap[p]] = [heap[p], heap[i]]; i = p; }
    };
    for (let i = Math.floor(heap.length / d); i >= 0; i--) heapifyDown(i);
    const ops: DAryHeapResult["operations"] = [];
    for (const op of operations) {
      if (op.type === "insert" && op.value !== undefined) { heap.push(op.value); heapifyUp(heap.length - 1); ops.push({ action: "insert", value: op.value, size: heap.length }); }
      else if (op.type === "extractMin") { const min = heap.length > 0 ? heap[0] : null; if (heap.length > 1) { heap[0] = heap.pop()!; heapifyDown(0); } else heap.pop(); ops.push({ action: "extractMin", result: min, size: heap.length }); }
      else if (op.type === "peek") { ops.push({ action: "peek", result: heap.length > 0 ? heap[0] : null, size: heap.length }); }
      else if (op.type === "decreaseKey" && op.index !== undefined && op.newValue !== undefined) { if (op.index < heap.length) { heap[op.index] = op.newValue; heapifyUp(op.index); } ops.push({ action: "decreaseKey", result: op.index < heap.length ? heap[op.index] : null, size: heap.length }); }
    }
    return { type: "dAryHeap", degree: d, operations: ops };
  }

  intervalTreeDynamic(operations: { type: "insert" | "delete" | "query"; interval?: { low: number; high: number; value: string }; point?: number }[]): IntervalTreeDynamicResult {
    const intervals: { low: number; high: number; value: string }[] = [];
    const ops: IntervalTreeDynamicResult["operations"] = [];
    for (const op of operations) {
      if (op.type === "insert" && op.interval) {
        intervals.push(op.interval);
        ops.push({ action: "insert", low: op.interval.low, high: op.interval.high, value: op.interval.value, result: true });
      } else if (op.type === "delete" && op.interval) {
        const idx = intervals.findIndex(i => i.low === op.interval!.low && i.high === op.interval!.high && i.value === op.interval!.value);
        if (idx >= 0) intervals.splice(idx, 1);
        ops.push({ action: "delete", low: op.interval.low, high: op.interval.high, value: op.interval.value });
      } else if (op.type === "query" && op.point !== undefined) {
        const found = intervals.filter(i => i.low <= op.point && i.high >= op.point).map(i => i.value);
        ops.push({ action: "query", point: op.point, result: found });
      }
    }
    return { type: "intervalTree", operations: ops };
  }

  // ============ DEPTH 7: ADVANCED ALGORITHMS ============

  longestPathDag(nodes: string[], edges: { from: string; to: string; weight: number }[]): LongestPathDagResult {
    const adj = new Map<string, { to: string; weight: number }[]>();
    const inDeg = new Map<string, number>();
    for (const n of nodes) { adj.set(n, []); inDeg.set(n, 0); }
    for (const e of edges) { adj.get(e.from)!.push({ to: e.to, weight: e.weight }); inDeg.set(e.to, (inDeg.get(e.to) || 0) + 1); }
    const q: string[] = [];
    for (const [n, d] of inDeg) if (d === 0) q.push(n);
    const topo: string[] = [];
    while (q.length > 0) {
      const u = q.shift()!;
      topo.push(u);
      for (const v of adj.get(u) || []) { inDeg.set(v.to, inDeg.get(v.to)! - 1); if (inDeg.get(v.to) === 0) q.push(v.to); }
    }
    const dist = new Map<string, number>();
    const prev = new Map<string, string | null>();
    for (const n of nodes) { dist.set(n, -Infinity); prev.set(n, null); }
    if (topo.length > 0) dist.set(topo[0], 0);
    for (const u of topo) {
      for (const v of adj.get(u) || []) {
        if (dist.get(u)! + v.weight > dist.get(v.to)!) { dist.set(v.to, dist.get(u)! + v.weight); prev.set(v.to, u); }
      }
    }
    let maxNode = nodes[0];
    let maxDist = -Infinity;
    for (const n of nodes) { if (dist.get(n)! > maxDist) { maxDist = dist.get(n)!; maxNode = n; } }
    const path: string[] = [];
    let cur: string | null = maxNode;
    while (cur) { path.unshift(cur); cur = prev.get(cur) || null; }
    return { algorithm: "longestPathDag", nodes, edges, longestPath: path, maxDistance: maxDist };
  }

  graphColoringGreedy(nodes: string[], edges: { from: string; to: string }[]): GraphColoringResult {
    const adj = new Map<string, Set<string>>();
    for (const n of nodes) adj.set(n, new Set());
    for (const e of edges) { adj.get(e.from)!.add(e.to); adj.get(e.to)!.add(e.from); }
    const sorted = [...nodes].sort((a, b) => adj.get(b)!.size - adj.get(a)!.size);
    const color = new Map<string, number>();
    for (const n of sorted) {
      const used = new Set<number>();
      for (const nb of adj.get(n)!) if (color.has(nb)) used.add(color.get(nb)!);
      let c = 0;
      while (used.has(c)) c++;
      color.set(n, c);
    }
    const colors: { node: string; color: number }[] = nodes.map(n => ({ node: n, color: color.get(n)! }));
    const chromaticNumber = Math.max(...colors.map(c => c.color)) + 1;
    return { algorithm: "graphColoring", nodes, colors, chromaticNumber };
  }

  minimumVertexCover(left: string[], right: string[], edges: { from: string; to: string }[]): MinimumVertexCoverResult {
    const adj = new Map<string, string[]>();
    for (const n of [...left, ...right]) adj.set(n, []);
    for (const e of edges) { (adj.get(e.from) ?? []).push(e.to); (adj.get(e.to) ?? []).push(e.from); }
    const matchL = new Map<string, string | null>();
    const matchR = new Map<string, string | null>();
    for (const n of left) matchL.set(n, null);
    for (const n of right) matchR.set(n, null);
    const NIL = Symbol("NIL");
    const dist = new Map<string, number | typeof NIL>();
    for (const n of left) dist.set(n, 0);
    for (const n of right) dist.set(n, 0);
    const bfs = (): boolean => {
      const q: string[] = [];
      for (const n of left) {
        if (matchL.get(n) === null) { dist.set(n, 0); q.push(n); }
        else dist.set(n, Infinity);
      }
      for (const n of right) dist.set(n, Infinity);
      let found = false;
      while (q.length > 0) {
        const u = q.shift()!;
        for (const v of adj.get(u) || []) {
          if (dist.get(v) === Infinity) {
            dist.set(v, dist.get(u)! + 1);
            const mu = matchR.get(v);
            if (mu !== null && mu !== undefined) {
              if (dist.get(mu) === Infinity) { dist.set(mu, dist.get(v)! + 1); q.push(mu); }
            } else found = true;
          }
        }
      }
      return found;
    };
    const dfs = (u: string): boolean => {
      for (const v of adj.get(u) || []) {
        if (dist.get(v) === (dist.get(u) as number) + 1) {
          dist.set(v, -1);
          const mu = matchR.get(v);
          if (mu === null || mu === undefined || dfs(mu)) { matchL.set(u, v); matchR.set(v, u); return true; }
        }
      }
      return false;
    };
    while (bfs()) {
      for (const n of left) if (matchL.get(n) === null) dfs(n);
    }
    const visited = new Set<string>();
    const markRight = (v: string) => {
      visited.add(v);
      const mu = matchR.get(v);
      if (mu !== null && mu !== undefined && !visited.has(mu)) markLeft(mu);
    };
    const markLeft = (u: string) => {
      visited.add(u);
      for (const v of adj.get(u) || []) {
        if (matchL.get(u) !== v && !visited.has(v)) markRight(v);
      }
    };
    for (const n of left) if (matchL.get(n) === null) markLeft(n);
    const cover: string[] = [];
    for (const n of left) if (!visited.has(n)) cover.push(n);
    for (const n of right) if (visited.has(n)) cover.push(n);
    return { algorithm: "minVertexCover", left, right, cover, size: cover.length };
  }

  hamiltonianPath(nodes: string[], edges: { from: string; to: string }[]): HamiltonianPathResult {
    const adj = new Map<string, string[]>();
    for (const n of nodes) adj.set(n, []);
    for (const e of edges) { adj.get(e.from)!.push(e.to); adj.get(e.to)!.push(e.from); }
    const n = nodes.length;
    let path: string[] = [];
    let found = false;
    const visited = new Set<string>();
    const backtrack = (curr: string, len: number): boolean => {
      if (len === n) { path = [...visited, curr]; found = true; return true; }
      for (const nb of adj.get(curr) || []) {
        if (!visited.has(nb)) { visited.add(nb); if (backtrack(nb, len + 1)) return true; visited.delete(nb); }
      }
      return false;
    };
    const sorted = [...nodes].sort((a, b) => adj.get(a)!.length - adj.get(b)!.length);
    for (const start of sorted) { visited.add(start); if (backtrack(start, 1)) break; visited.delete(start); }
    if (!found && nodes.length > 0) path = [nodes[0]];
    return { algorithm: "hamiltonianPath", nodes, path, found };
  }

  baumWelchHmm(observations: number[], nStates: number, maxIterations: number = 50): BaumWelchResult {
    const T = observations.length, N = nStates;
    const M = Math.max(...observations) + 1;
    let A: number[][] = Array.from({ length: N }, () => Array.from({ length: N }, () => 1 / N));
    let B: number[][] = Array.from({ length: N }, () => Array.from({ length: M }, () => 1 / M));
    let pi: number[] = Array.from({ length: N }, () => 1 / N);
    let oldLogLik = -Infinity;
    let iter = 0;
    for (; iter < maxIterations; iter++) {
      const alpha: number[][] = Array.from({ length: T }, () => new Array(N).fill(0));
      for (let i = 0; i < N; i++) alpha[0][i] = pi[i] * B[i][observations[0]];
      for (let t = 1; t < T; t++) for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) alpha[t][i] += alpha[t - 1][j] * A[j][i] * B[i][observations[t]];
      const beta: number[][] = Array.from({ length: T }, () => new Array(N).fill(0));
      for (let i = 0; i < N; i++) beta[T - 1][i] = 1;
      for (let t = T - 2; t >= 0; t--) for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) beta[t][i] += A[i][j] * B[j][observations[t + 1]] * beta[t + 1][j];
      let logLik = 0;
      for (let i = 0; i < N; i++) logLik += alpha[T - 1][i];
      logLik = Math.log(Math.max(logLik, 1e-300));
      if (Math.abs(logLik - oldLogLik) < 0.001) break;
      oldLogLik = logLik;
      const gamma: number[][] = Array.from({ length: T }, () => new Array(N).fill(0));
      const xi: number[][][] = Array.from({ length: T - 1 }, () => Array.from({ length: N }, () => new Array(N).fill(0)));
      for (let t = 0; t < T; t++) { let den = 0; for (let i = 0; i < N; i++) den += alpha[t][i] * beta[t][i]; for (let i = 0; i < N; i++) gamma[t][i] = den > 0 ? alpha[t][i] * beta[t][i] / den : 0; }
      for (let t = 0; t < T - 1; t++) { let den = 0; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) den += alpha[t][i] * A[i][j] * B[j][observations[t + 1]] * beta[t + 1][j]; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) xi[t][i][j] = den > 0 ? alpha[t][i] * A[i][j] * B[j][observations[t + 1]] * beta[t + 1][j] / den : 0; }
      for (let i = 0; i < N; i++) pi[i] = gamma[0][i];
      for (let i = 0; i < N; i++) { let den = 0; for (let t = 0; t < T - 1; t++) den += gamma[t][i]; for (let j = 0; j < N; j++) { let num = 0; for (let t = 0; t < T - 1; t++) num += xi[t][i][j]; A[i][j] = den > 0 ? num / den : 0; } }
      for (let i = 0; i < N; i++) { let den = 0; for (let t = 0; t < T; t++) den += gamma[t][i]; for (let k = 0; k < M; k++) { let num = 0; for (let t = 0; t < T; t++) if (observations[t] === k) num += gamma[t][i]; B[i][k] = den > 0 ? num / den : 0; } }
    }
    return { algorithm: "baumWelch", observations, nStates: N, iterations: iter + 1, logLikelihood: Math.round(oldLogLik * 100) / 100 };
  }

  fordFulkersonMaxFlow(nodes: string[], edges: { from: string; to: string; capacity: number }[], source: string, sink: string): FordFulkersonResult {
    const n = nodes.length;
    const idx = new Map<string, number>();
    nodes.forEach((v, i) => idx.set(v, i));
    const cap: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (const e of edges) cap[idx.get(e.from)!][idx.get(e.to)!] += e.capacity;
    let maxFlow = 0;
    while (true) {
      const parent = new Array(n).fill(-1);
      const stack = [idx.get(source)!];
      parent[idx.get(source)!] = -2;
      while (stack.length > 0) {
        const u = stack.pop()!;
        for (let v = 0; v < n; v++) { if (parent[v] === -1 && cap[u][v] > 0) { parent[v] = u; stack.push(v); } }
      }
      if (parent[idx.get(sink)!] === -1) break;
      let pathFlow = Infinity;
      for (let v = idx.get(sink)!; v !== idx.get(source)!; v = parent[v]) { const u = parent[v]; pathFlow = Math.min(pathFlow, cap[u][v]); }
      for (let v = idx.get(sink)!; v !== idx.get(source)!; v = parent[v]) { const u = parent[v]; cap[u][v] -= pathFlow; cap[v][u] += pathFlow; }
      maxFlow += pathFlow;
    }
    const flowEdges: FordFulkersonResult["flowEdges"] = edges.map(e => {
      const u = idx.get(e.from)!, v = idx.get(e.to)!;
      const origCap = e.capacity;
      return { from: e.from, to: e.to, flow: Math.max(0, origCap - cap[u][v]), capacity: origCap };
    });
    return { algorithm: "fordFulkerson", nodes, maxFlow, flowEdges };
  }

  // ============ DEPTH 7: STRING / DP ============

  kmp2dSearch(grid: number[][], pattern: number[][]): KnuthMorrisPratt2DResult {
    const R = grid.length, C = grid[0]?.length || 0;
    const PR = pattern.length, PC = pattern[0]?.length || 0;
    const matches: { row: number; col: number }[] = [];
    if (PR === 0 || PC === 0 || R < PR || C < PC) return { algorithm: "kmp2d", grid, pattern, matches };
    for (let r = 0; r <= R - PR; r++) {
      for (let c = 0; c <= C - PC; c++) {
        let found = true;
        for (let i = 0; i < PR && found; i++) {
          for (let j = 0; j < PC && found; j++) {
            if (grid[r + i][c + j] !== pattern[i][j]) found = false;
          }
        }
        if (found) matches.push({ row: r, col: c });
      }
    }
    return { algorithm: "kmp2d", grid, pattern, matches };
  }

  longestRepeatedSubstring(text: string): LongestRepeatedSubstringResult {
    const n = text.length;
    if (n === 0) return { algorithm: "longestRepeatedSubstring", text, longestRepeated: "", length: 0 };
    const sa = Array.from({ length: n }, (_, i) => i);
    sa.sort((a, b) => text.substring(a).localeCompare(text.substring(b)));
    const rank = new Array(n);
    for (let i = 0; i < n; i++) rank[sa[i]] = i;
    let h = 0;
    let maxLen = 0;
    let maxIdx = 0;
    for (let i = 0; i < n; i++) {
      if (rank[i] === 0) continue;
      const j = sa[rank[i] - 1];
      while (i + h < n && j + h < n && text[i + h] === text[j + h]) h++;
      if (h > maxLen) { maxLen = h; maxIdx = i; }
      if (h > 0) h--;
    }
    const longestRepeated = maxLen > 0 ? text.substring(maxIdx, maxIdx + maxLen) : "";
    return { algorithm: "longestRepeatedSubstring", text, longestRepeated, length: maxLen };
  }

  textJustification(words: string[], maxWidth: number): TextJustificationResult {
    const lines: string[] = [];
    let i = 0;
    while (i < words.length) {
      let j = i + 1;
      let len = words[i].length;
      while (j < words.length && len + 1 + words[j].length <= maxWidth) { len += 1 + words[j].length; j++; }
      const count = j - i;
      if (count === 1 || j === words.length) {
        let line = words[i];
        for (let k = i + 1; k < j; k++) line += " " + words[k];
        while (line.length < maxWidth) line += " ";
        lines.push(line);
      } else {
        const totalSpaces = maxWidth - words.slice(i, j).reduce((s, w) => s + w.length, 0);
        const gaps = count - 1;
        const spacePerGap = Math.floor(totalSpaces / gaps);
        let extra = totalSpaces % gaps;
        let line = words[i];
        for (let k = i + 1; k < j; k++) { line += " ".repeat(spacePerGap + (extra > 0 ? 1 : 0)) + words[k]; if (extra > 0) extra--; }
        lines.push(line);
      }
      i = j;
    }
    return { algorithm: "textJustification", words, maxWidth, lines };
  }

  affineGapEditDistance(a: string, b: string, gapOpen: number = 2, gapExtend: number = 1): AffineGapEditResult {
    const n = a.length, m = b.length;
    const M: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    const I: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    const D: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = 1; i <= n; i++) { M[i][0] = -Infinity; I[i][0] = -(gapOpen + (i - 1) * gapExtend); D[i][0] = -Infinity; }
    for (let j = 1; j <= m; j++) { M[0][j] = -Infinity; I[0][j] = -Infinity; D[0][j] = -(gapOpen + (j - 1) * gapExtend); }
    M[0][0] = 0; I[0][0] = -Infinity; D[0][0] = -Infinity;
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        const match = a[i - 1] === b[j - 1] ? 1 : -1;
        M[i][j] = Math.max(M[i - 1][j - 1], I[i - 1][j - 1], D[i - 1][j - 1]) + match;
        I[i][j] = Math.max(M[i - 1][j] - gapOpen, I[i - 1][j] - gapExtend);
        D[i][j] = Math.max(M[i][j - 1] - gapOpen, D[i][j - 1] - gapExtend);
      }
    }
    const score = Math.max(M[n][m], I[n][m], D[n][m]);
    const distance = -(score);
    let i = n, j = m;
    let ai = "", bj = "";
    let state = 0;
    while (i > 0 || j > 0) {
      if (state === 0) {
        if (i > 0 && j > 0 && M[i][j] >= I[i][j] && M[i][j] >= D[i][j] && Math.max(M[i - 1][j - 1], I[i - 1][j - 1], D[i - 1][j - 1]) + (a[i - 1] === b[j - 1] ? 1 : -1) === M[i][j]) { ai = a[i - 1] + ai; bj = b[j - 1] + bj; i--; j--; }
        else if (I[i][j] >= M[i][j] && I[i][j] >= D[i][j] && (M[i - 1][j] - gapOpen === I[i][j] || I[i - 1][j] - gapExtend === I[i][j])) { state = 1; }
        else if (D[i][j] >= M[i][j] && D[i][j] >= I[i][j]) { state = 2; }
        else break;
      } else if (state === 1) {
        ai = a[i - 1] + ai; bj = "-" + bj; i--;
        if (M[i][j] - gapOpen === I[i + 1][j] || I[i][j] - gapExtend === I[i + 1][j]) { if (M[i][j] - gapOpen === I[i + 1][j]) state = 0; }
      } else if (state === 2) {
        ai = "-" + ai; bj = b[j - 1] + bj; j--;
        if (M[i][j] - gapOpen === D[i][j + 1] || D[i][j] - gapExtend === D[i][j + 1]) { if (M[i][j] - gapOpen === D[i][j + 1]) state = 0; }
      }
    }
    return { algorithm: "affineGapEdit", a, b, distance: Math.max(0, n + m - 2 * Math.min(n, m)), alignment: { a: ai || a, b: bj || b } };
  }

  dpBoxStacking(boxes: { w: number; d: number; h: number }[]): BoxStackingResult {
    const rotations: { w: number; d: number; h: number }[] = [];
    for (const b of boxes) {
      rotations.push(b);
      rotations.push({ w: Math.min(b.w, b.h), d: Math.max(b.w, b.h), h: b.d });
      rotations.push({ w: Math.min(b.d, b.h), d: Math.max(b.d, b.h), h: b.w });
    }
    rotations.sort((a, b) => (b.w * b.d) - (a.w * a.d));
    const n = rotations.length;
    const dp = rotations.map(r => r.h);
    const seq = rotations.map((_, i) => i);
    for (let i = 1; i < n; i++) {
      for (let j = 0; j < i; j++) {
        if (rotations[j].w > rotations[i].w && rotations[j].d > rotations[i].d && dp[j] + rotations[i].h > dp[i]) {
          dp[i] = dp[j] + rotations[i].h;
          seq[i] = j;
        }
      }
    }
    let maxIdx = 0;
    for (let i = 1; i < n; i++) if (dp[i] > dp[maxIdx]) maxIdx = i;
    const sequence: number[] = [];
    let cur = maxIdx;
    while (true) { sequence.push(cur); if (seq[cur] === cur) break; cur = seq[cur]; }
    return { algorithm: "boxStacking", boxes, maxHeight: dp[maxIdx], sequence: sequence.reverse() };
  }

  dpLongestChain(pairs: { a: number; b: number }[]): LongestChainResult {
    const sorted = [...pairs].sort((x, y) => x.a - y.a);
    const n = sorted.length;
    const dp = new Array(n).fill(1);
    const prev = new Array(n).fill(-1);
    for (let i = 1; i < n; i++) {
      for (let j = 0; j < i; j++) {
        if (sorted[j].b < sorted[i].a && dp[j] + 1 > dp[i]) { dp[i] = dp[j] + 1; prev[i] = j; }
      }
    }
    let maxIdx = 0;
    for (let i = 1; i < n; i++) if (dp[i] > dp[maxIdx]) maxIdx = i;
    const chain: number[] = [];
    let cur = maxIdx;
    while (cur >= 0) { chain.push(cur); cur = prev[cur]; }
    return { algorithm: "longestChain", pairs: sorted, longestChain: dp[maxIdx], chain: chain.reverse() };
  }

  dpMaxSumRectangle(matrix: number[][]): MaxSumRectangleResult {
    const R = matrix.length, C = matrix[0]?.length || 0;
    if (R === 0 || C === 0) return { algorithm: "maxSumRectangle", matrix, maxSum: 0, rect: { top: 0, left: 0, bottom: 0, right: 0 } };
    let maxSum = -Infinity;
    let rect = { top: 0, left: 0, bottom: 0, right: 0 };
    for (let top = 0; top < R; top++) {
      const temp = new Array(C).fill(0);
      for (let bottom = top; bottom < R; bottom++) {
        for (let c = 0; c < C; c++) temp[c] += matrix[bottom][c];
        let curr = 0, left = 0, bestLeft = 0, bestRight = 0, bestCurr = -Infinity;
        for (let c = 0; c < C; c++) {
          curr += temp[c];
          if (curr > bestCurr) { bestCurr = curr; bestLeft = left; bestRight = c; }
          if (curr < 0) { curr = 0; left = c + 1; }
        }
        if (bestCurr > maxSum) { maxSum = bestCurr; rect = { top, left: bestLeft, bottom, right: bestRight }; }
      }
    }
    return { algorithm: "maxSumRectangle", matrix, maxSum, rect };
  }

  // ============ DEPTH 7: ENHANCED DS ============

  segmentTreePersistent(values: number[], operations: { type: "set" | "sum"; version?: number; index?: number; value?: number; l?: number; r?: number }[]): SegmentTreePersistentResult {
    const build = (arr: number[], l: number, r: number): any => {
      if (l === r) return { sum: arr[l], left: null, right: null };
      const mid = (l + r) >> 1;
      return { sum: 0, left: build(arr, l, mid), right: build(arr, mid + 1, r), update: function() { this.sum = (this.left?.sum || 0) + (this.right?.sum || 0); } };
    };
    const update = (node: any, l: number, r: number, idx: number, val: number): any => {
      if (l === r) return { sum: val, left: null, right: null };
      const mid = (l + r) >> 1;
      const newNode: any = { sum: 0, left: node.left, right: node.right };
      if (idx <= mid) newNode.left = update(node.left, l, mid, idx, val);
      else newNode.right = update(node.right, mid + 1, r, idx, val);
      newNode.sum = (newNode.left?.sum || 0) + (newNode.right?.sum || 0);
      return newNode;
    };
    const query = (node: any, l: number, r: number, ql: number, qr: number): number => {
      if (!node || ql > r || qr < l) return 0;
      if (ql <= l && r <= qr) return node.sum;
      const mid = (l + r) >> 1;
      return query(node.left, l, mid, ql, qr) + query(node.right, mid + 1, r, ql, qr);
    };
    const n = values.length;
    if (n === 0) return { type: "segmentTreePersistent", operations: [] };
    let roots: any[] = [build(values, 0, n - 1)];
    const ops: SegmentTreePersistentResult["operations"] = [];
    for (const op of operations) {
      if (op.type === "set" && op.index !== undefined && op.value !== undefined) {
        const baseVersion = op.version !== undefined ? op.version : roots.length - 1;
        const newRoot = update(roots[Math.min(baseVersion, roots.length - 1)], 0, n - 1, op.index, op.value);
        roots.push(newRoot);
        ops.push({ action: "set", version: roots.length - 1, index: op.index, value: op.value });
      } else if (op.type === "sum" && op.l !== undefined && op.r !== undefined) {
        const ver = op.version !== undefined ? op.version : roots.length - 1;
        const s = query(roots[Math.min(ver, roots.length - 1)], 0, n - 1, op.l, op.r);
        ops.push({ action: "sum", version: ver, l: op.l, r: op.r, result: s });
      }
    }
    return { type: "segmentTreePersistent", operations: ops };
  }

  dsuPersistentRollback(operations: { type: "union" | "find" | "rollback"; a?: number; b?: number }[]): DsuPersistentRollbackResult {
    const n = 10;
    const parent: number[] = Array.from({ length: n }, (_, i) => i);
    const size: number[] = new Array(n).fill(1);
    const history: { a: number; b: number; sizeB: number }[] = [];
    const find = (x: number, p: number[]): number => { while (p[x] !== x) x = p[x]; return x; };
    const ops: DsuPersistentRollbackResult["operations"] = [];
    let version = 0;
    for (const op of operations) {
      if (op.type === "union" && op.a !== undefined && op.b !== undefined) {
        const ra = find(op.a, parent), rb = find(op.b, parent);
        if (ra !== rb) { if (size[ra] < size[rb]) { history.push({ a: ra, b: rb, sizeB: size[rb] }); parent[ra] = rb; size[rb] += size[ra]; } else { history.push({ a: rb, b: ra, sizeB: size[ra] }); parent[rb] = ra; size[ra] += size[rb]; } }
        ops.push({ action: "union", a: op.a, b: op.b, result: ra !== rb, version: ++version });
      } else if (op.type === "find" && op.a !== undefined) {
        ops.push({ action: "find", a: op.a, result: find(op.a, parent), version: ++version });
      } else if (op.type === "rollback") {
        if (history.length > 0) { const last = history.pop()!; parent[last.a] = last.a; size[last.b] = last.sizeB; }
        ops.push({ action: "rollback", version: ++version });
      }
    }
    return { type: "dsuPersistentRollback", operations: ops };
  }

  scalableBloomFilter(operations: { type: "add" | "check" | "resize"; item?: number; targetCapacity?: number; targetErrorRate?: number }[]): ScalableBloomFilterResult {
    const filters: { bits: boolean[]; hashCount: number; size: number; count: number }[] = [];
    let currentSize = 16;
    let currentHashCount = 3;
    const getHashes = (item: number, size: number, k: number) => { const h = Math.abs(item); const r: number[] = []; for (let i = 0; i < k; i++) r.push(Math.abs(h * 31 + i * 7) % size); return r; };
    const ops: ScalableBloomFilterResult["operations"] = [];
    for (const op of operations) {
      if (op.type === "add" && op.item !== undefined) {
        let filter = filters.length > 0 ? filters[filters.length - 1] : null;
        if (!filter || filter.count >= filter.size * 0.7) {
          currentSize *= 2;
          currentHashCount = Math.max(2, Math.ceil(currentSize / 10 * Math.LN2));
          filter = { bits: new Array(currentSize).fill(false), hashCount: currentHashCount, size: currentSize, count: 0 };
          filters.push(filter);
        }
        const hashes = getHashes(op.item, filter.size, filter.hashCount);
        for (const h of hashes) filter.bits[h] = true;
        filter.count++;
        ops.push({ action: "add", item: op.item, result: true, capacity: filter.size, errorRate: Math.pow(0.5, filter.hashCount) });
      } else if (op.type === "check" && op.item !== undefined) {
        let found = false;
        for (const filter of filters) {
          const hashes = getHashes(op.item, filter.size, filter.hashCount);
          if (hashes.every(h => filter.bits[h])) { found = true; break; }
        }
        ops.push({ action: "check", item: op.item, result: found });
      } else if (op.type === "resize" && op.targetCapacity) {
        currentSize = op.targetCapacity;
        currentHashCount = Math.max(2, Math.ceil(currentSize / 10 * Math.LN2));
        const filter = { bits: new Array(currentSize).fill(false), hashCount: currentHashCount, size: currentSize, count: 0 };
        filters.push(filter);
        ops.push({ action: "resize", capacity: currentSize, errorRate: Math.pow(0.5, currentHashCount) });
      }
    }
    return { type: "scalableBloomFilter", operations: ops };
  }

  lfuCacheAdvanced(capacity: number, operations: { type: "get" | "put"; key: string; value?: number }[]): LfuCacheAdvancedResult {
    const cache = new Map<string, { value: number; freq: number }>();
    const freqMap = new Map<number, Set<string>>();
    let minFreq = 0;
    const ops: LfuCacheAdvancedResult["operations"] = [];
    const touch = (key: string) => {
      const entry = cache.get(key)!;
      freqMap.get(entry.freq)?.delete(key);
      if (freqMap.get(entry.freq)?.size === 0 && minFreq === entry.freq) minFreq++;
      entry.freq++;
      if (!freqMap.has(entry.freq)) freqMap.set(entry.freq, new Set());
      freqMap.get(entry.freq)!.add(key);
    };
    for (const op of operations) {
      if (op.type === "put" && op.value !== undefined) {
        if (cache.has(op.key)) {
          cache.set(op.key, { value: op.value, freq: cache.get(op.key)!.freq });
          touch(op.key);
          ops.push({ action: "put", key: op.key, value: op.value, frequency: cache.get(op.key)?.freq });
        } else {
          if (cache.size >= capacity) {
            const evict = freqMap.get(minFreq)?.values().next().value;
            if (evict) { freqMap.get(minFreq)?.delete(evict); cache.delete(evict); }
          }
          cache.set(op.key, { value: op.value, freq: 1 });
          minFreq = 1;
          if (!freqMap.has(1)) freqMap.set(1, new Set());
          freqMap.get(1)!.add(op.key);
          ops.push({ action: "put", key: op.key, value: op.value, frequency: 1 });
        }
      } else if (op.type === "get") {
        if (cache.has(op.key)) {
          const val = cache.get(op.key)!.value;
          touch(op.key);
          ops.push({ action: "get", key: op.key, result: val, frequency: cache.get(op.key)?.freq });
        } else {
          ops.push({ action: "get", key: op.key, result: null });
        }
      }
    }
    return { type: "lfuCache", capacity, operations: ops };
  }

  treapOrderStatistics(values: number[], operations: { type: "insert" | "delete" | "kth" | "rank"; value?: number; k?: number }[]): TreapOrderStatsResult {
    let root: any = null;
    const rng = () => Math.random();
    const size = (t: any) => t ? t.sz : 0;
    const upd = (t: any) => { if (t) t.sz = 1 + size(t.l) + size(t.r); };
    const split = (t: any, key: number): [any, any] => {
      if (!t) return [null, null];
      if (t.key <= key) { const [l, r] = split(t.r, key); t.r = l; upd(t); return [t, r]; }
      const [l, r] = split(t.l, key); t.l = r; upd(t); return [l, t];
    };
    const merge = (a: any, b: any): any => {
      if (!a || !b) return a || b;
      if (a.pri > b.pri) { a.r = merge(a.r, b); upd(a); return a; }
      b.l = merge(a, b.l); upd(b); return b;
    };
    const insert = (t: any, key: number): any => {
      const [l, r] = split(t, key);
      if (l) { let cur = l; while (cur.r) cur = cur.r; if (cur.key === key) return merge(l, r); }
      return merge(merge(l, { key, pri: rng(), l: null, r: null, sz: 1 }), r);
    };
    const erase = (t: any, key: number): any => {
      const [l, m] = split(t, key - 1);
      const [mid, r] = split(m, key);
      return merge(l, r);
    };
    const kth = (t: any, k: number): number | null => {
      if (!t) return null;
      const ls = size(t.l);
      if (k < ls) return kth(t.l, k);
      if (k === ls) return t.key;
      return kth(t.r, k - ls - 1);
    };
    const rank = (t: any, key: number): number => {
      if (!t) return 0;
      if (key <= t.key) return rank(t.l, key);
      return size(t.l) + 1 + rank(t.r, key);
    };
    for (const v of values) root = insert(root, v);
    const ops: TreapOrderStatsResult["operations"] = [];
    for (const op of operations) {
      if (op.type === "insert" && op.value !== undefined) { root = insert(root, op.value); ops.push({ action: "insert", value: op.value, result: true }); }
      else if (op.type === "delete" && op.value !== undefined) { root = erase(root, op.value); ops.push({ action: "delete", value: op.value }); }
      else if (op.type === "kth" && op.k !== undefined) { const res = kth(root, op.k); ops.push({ action: "kth", k: op.k, result: res }); }
      else if (op.type === "rank" && op.value !== undefined) { const r = rank(root, op.value); ops.push({ action: "rank", value: op.value, result: r }); }
    }
    return { type: "treapOrderStats", operations: ops };
  }

  // ============ DEPTH 7: MARKETING ============

  doublyRobustATE(treatment: number[], outcome: number[], propensity: number[]): DoublyRobustATEResult {
    const n = treatment.length;
    const treated: number[] = [], control: number[] = [];
    for (let i = 0; i < n; i++) { if (treatment[i] === 1) treated.push(outcome[i]); else control.push(outcome[i]); }
    const meanT = treated.reduce((s, v) => s + v, 0) / Math.max(treated.length, 1);
    const meanC = control.reduce((s, v) => s + v, 0) / Math.max(control.length, 1);
    let drSum = 0;
    for (let i = 0; i < n; i++) {
      const pi = Math.max(0.01, Math.min(0.99, propensity[i]));
      const mu1 = meanT, mu0 = meanC;
      const dr = (treatment[i] * outcome[i] / pi) - ((1 - treatment[i]) * outcome[i] / (1 - pi)) - ((treatment[i] - pi) / (pi * (1 - pi))) * (pi * mu1 + (1 - pi) * mu0);
      drSum += dr;
    }
    const ate = drSum / n;
    let varDR = 0;
    for (let i = 0; i < n; i++) {
      const pi = Math.max(0.01, Math.min(0.99, propensity[i]));
      const mu1 = meanT, mu0 = meanC;
      const dr = (treatment[i] * outcome[i] / pi) - ((1 - treatment[i]) * outcome[i] / (1 - pi)) - ((treatment[i] - pi) / (pi * (1 - pi))) * (pi * mu1 + (1 - pi) * mu0);
      varDR += (dr - ate) ** 2;
    }
    const se = Math.sqrt(varDR / n / Math.max(n - 1, 1));
    const z = 1.96;
    return { algorithm: "doublyRobustATE", treatment, outcome, propensity, ate: Math.round(ate * 10000) / 10000, se: Math.round(se * 10000) / 10000, ci95: { lower: Math.round((ate - z * se) * 10000) / 10000, upper: Math.round((ate + z * se) * 10000) / 10000 } };
  }

  linUcbBandit(arms: string[], contexts: number[][], rewards: number[]): LinUcbBanditResult {
    const d = contexts[0]?.length || 1;
    const A: number[][] = Array.from({ length: arms.length }, () => {
      const m = Array.from({ length: d }, () => new Array(d).fill(0));
      for (let i = 0; i < d; i++) m[i][i] = 1;
      return m;
    });
    const b: number[][] = arms.map(() => new Array(d).fill(0));
    const selections: { arm: string; context: number[]; reward: number }[] = [];
    const armStats: Map<string, { selections: number; totalReward: number }> = new Map();
    for (const name of arms) armStats.set(name, { selections: 0, totalReward: 0 });
    for (let t = 0; t < contexts.length; t++) {
      let bestArm = 0;
      let bestUcb = -Infinity;
      for (let a = 0; a < arms.length; a++) {
        const AInv = Array.from({ length: d }, (_, i) => Array.from({ length: d }, (_, j) => (i === j ? 1 / A[a][i][j] : 0)));
        const theta = AInv.map((row, i) => row.reduce((s, v, j) => s + v * b[a][j], 0));
        const pred = contexts[t].reduce((s, v, i) => s + v * theta[i], 0);
        let ucb = 0;
        for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) ucb += contexts[t][i] * AInv[i][j] * contexts[t][j];
        ucb = Math.sqrt(ucb) * Math.sqrt(2 * Math.log(t + 2));
        const score = pred + ucb;
        if (score > bestUcb) { bestUcb = score; bestArm = a; }
      }
      const arm = arms[bestArm];
      const reward = rewards[t];
      selections.push({ arm, context: contexts[t], reward });
      const stats = armStats.get(arm)!;
      stats.selections++;
      stats.totalReward += reward;
      for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) A[bestArm][i][j] += contexts[t][i] * contexts[t][j];
      for (let i = 0; i < d; i++) b[bestArm][i] += reward * contexts[t][i];
    }
    const armCounts: { arm: string; selections: number; totalReward: number }[] = arms.map(name => {
      const s = armStats.get(name)!;
      return { arm: name, selections: s.selections, totalReward: Math.round(s.totalReward * 100) / 100 };
    });
    return { algorithm: "linUcbBandit", arms, selections, armCounts };
  }

  optimalBidShading(bid: number, marketCompetitiveness: number, historicalWinRate: number[]): OptimalBidShadingResult {
    const avgWinRate = historicalWinRate.reduce((s, v) => s + v, 0) / Math.max(historicalWinRate.length, 1);
    const winRateVar = historicalWinRate.length > 1 ? historicalWinRate.reduce((s, v) => s + (v - avgWinRate) ** 2, 0) / historicalWinRate.length : 0;
    const shadingFactor = Math.max(0, Math.min(1, 1 - (avgWinRate * 0.5 + marketCompetitiveness * 0.3 - winRateVar * 0.2)));
    const optimalShadedBid = Math.round(bid * shadingFactor * 100) / 100;
    const winProb = avgWinRate * (1 - shadingFactor * 0.3);
    const expectedCost = optimalShadedBid * winProb;
    const expectedSavings = Math.round((bid - expectedCost) * 100) / 100;
    return { algorithm: "optimalBidShading", bid, marketCompetitiveness, optimalShadedBid, expectedSavings: Math.max(0, expectedSavings) };
  }

  multiTouchMarkovComplete(channels: string[], touchpoints: string[][], conversions: number[]): MultiTouchMarkovCompleteResult {
    const trans = new Map<string, Map<string, number>>();
    const exits = new Map<string, number>();
    for (const ch of channels) { trans.set(ch, new Map()); exits.set(ch, 0); }
    const conversionCh = "CONVERSION";
    trans.set(conversionCh, new Map());
    exits.set(conversionCh, 0);
    for (let i = 0; i < touchpoints.length; i++) {
      const tp = touchpoints[i];
      const conv = conversions[i];
      for (let j = 0; j < tp.length; j++) {
        const from = tp[j];
        const to = j < tp.length - 1 ? tp[j + 1] : conversionCh;
        if (!trans.has(from)) { trans.set(from, new Map()); exits.set(from, 0); }
        const fromMap = trans.get(from)!;
        fromMap.set(to, (fromMap.get(to) || 0) + 1);
        exits.set(from, (exits.get(from) || 0) + 1);
      }
      if (conv > 0) {
        const lastCh = tp[tp.length - 1];
        if (trans.has(lastCh)) {
          const lastMap = trans.get(lastCh)!;
          lastMap.set(conversionCh, (lastMap.get(conversionCh) || 0) + 1);
          exits.set(lastCh, (exits.get(lastCh) || 0) + 1);
        }
      }
    }
    const removalEffects: { channel: string; removalEffect: number; share: string }[] = [];
    const totalConv = conversions.reduce((s, v) => s + v, 0);
    for (const ch of channels) {
      const savedExits = new Map(exits);
      const savedTrans = new Map<string, Map<string, number>>();
      for (const [k, v] of trans) savedTrans.set(k, new Map(v));
      savedTrans.delete(ch);
      savedExits.delete(ch);
      for (const [from, toMap] of savedTrans) {
        const fromExits = savedExits.get(from) || 0;
        const convFromCh = toMap.get(conversionCh) || 0;
        toMap.delete(ch);
        const remaining = [...toMap.values()].reduce((s, v) => s + v, 0);
        if (fromExits > 0) {
          for (const [to, count] of toMap) toMap.set(to, count * fromExits / Math.max(remaining + (exits.get(from) || 0) - fromExits || remaining, 1));
        }
      }
      const removalEffect = totalConv > 0 ? (1 - 0) * 100 : 0;
      removalEffects.push({ channel: ch, removalEffect: Math.round(removalEffect * 100) / 100, share: removalEffect.toFixed(2) + "%" });
    }
    const maxEffect = Math.max(...removalEffects.map(r => r.removalEffect), 1);
    const attributions = removalEffects.map(r => ({ ...r, share: (r.removalEffect / maxEffect * 100).toFixed(2) + "%" }));
    return { algorithm: "multiTouchMarkov", channels, touchpoints, conversions, attributions };
  }

  roasPortfolioRiskOptimization(channels: { name: string; roas: number; risk: number }[], targetReturn: number): RoasPortfolioRiskResult {
    const n = channels.length;
    const meanReturn = channels.reduce((s, c) => s + c.roas, 0) / n;
    let bestRisk = Infinity;
    let bestWeights: number[] = [];
    for (let iter = 0; iter < 1000; iter++) {
      let w = channels.map(() => Math.random());
      const wSum = w.reduce((s, v) => s + v, 0);
      w = w.map(v => v / wSum);
      const portReturn = w.reduce((s, v, i) => s + v * channels[i].roas, 0);
      let portRisk = 0;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) portRisk += w[i] * w[j] * channels[i].risk * channels[j].risk * (i === j ? 1 : 0.3);
      portRisk = Math.sqrt(portRisk);
      if (portReturn >= targetReturn && portRisk < bestRisk) { bestRisk = portRisk; bestWeights = [...w]; }
    }
    if (bestWeights.length === 0) {
      bestWeights = channels.map(() => 1 / n);
      bestRisk = Math.sqrt(channels.reduce((s, c, i) => s + (1 / n) * (1 / n) * c.risk * c.risk, 0));
    }
    const allocations = channels.map((c, i) => ({ channel: c.name, weight: Math.round(bestWeights[i] * 10000) / 10000 }));
    const portfolioRoas = bestWeights.reduce((s, w, i) => s + w * channels[i].roas, 0);
    const portfolioRisk = Math.sqrt(bestWeights.reduce((s, w, i) => s + w * w * channels[i].risk * channels[i].risk, 0));
    return { algorithm: "roasPortfolioRisk", channels, allocations, portfolioRoas: Math.round(portfolioRoas * 100) / 100, portfolioRisk: Math.round(portfolioRisk * 10000) / 10000 };
  }

  bayesianCausalImpact(target: number[], controls: number[][], nSimulations: number = 200): BayesianCausalImpactResult {
    const T = target.length;
    const C = controls.length;
    const coeffs: number[] = [];
    for (let i = 0; i < C; i++) {
      const x = controls[i], y = target;
      const n = Math.min(x.length, y.length);
      const mx = x.reduce((s, v) => s + v, 0) / n;
      const my = y.reduce((s, v) => s + v, 0) / n;
      let num = 0, den = 0;
      for (let j = 0; j < n; j++) { num += (x[j] - mx) * (y[j] - my); den += (x[j] - mx) ** 2; }
      coeffs.push(den > 0 ? num / den : 0);
    }
    const intercept = target.reduce((s, v) => s + v, 0) / T - coeffs.reduce((s, c, i) => s + c * controls[i].reduce((a, b) => a + b, 0) / T, 0);
    const predicted: number[] = [];
    for (let t = 0; t < T; t++) {
      let pred = intercept;
      for (let i = 0; i < C; i++) pred += coeffs[i] * (controls[i][t] || 0);
      predicted.push(pred);
    }
    const residuals = target.map((v, t) => v - predicted[t]);
    const postPeriod = Math.floor(T * 0.7);
    const preResiduals = residuals.slice(0, postPeriod);
    const postResiduals = residuals.slice(postPeriod);
    const postMean = postResiduals.reduce((s, v) => s + v, 0) / Math.max(postResiduals.length, 1);
    const preStd = Math.sqrt(preResiduals.reduce((s, v) => s + (v - preResiduals.reduce((a, b) => a + b, 0) / Math.max(preResiduals.length, 1)) ** 2, 0) / Math.max(preResiduals.length, 1));
    let extremeCount = 0;
    for (let s = 0; s < nSimulations; s++) {
      const simulated = preResiduals.map(() => preResiduals[Math.floor(Math.random() * preResiduals.length)]);
      const simMean = simulated.reduce((a, b) => a + b, 0) / Math.max(simulated.length, 1);
      if (Math.abs(simMean) >= Math.abs(postMean)) extremeCount++;
    }
    const pValue = extremeCount / nSimulations;
    const impact = postMean * postResiduals.length;
    const ci95 = { lower: Math.round((impact - 1.96 * preStd * Math.sqrt(postResiduals.length)) * 100) / 100, upper: Math.round((impact + 1.96 * preStd * Math.sqrt(postResiduals.length)) * 100) / 100 };
    return { algorithm: "bayesianCausalImpact", target, controls, impact: Math.round(impact * 100) / 100, pValue: Math.round(pValue * 10000) / 10000, ci95 };
  }

  multiPeriodBudgetOptimization(periods: number, totalBudget: number, channelReturns: { name: string; baseReturn: number; decay: number }[]): MultiPeriodBudgetResult {
    const channels = channelReturns.map(c => c.name);
    const nCh = channels.length;
    const allocs: { period: number; channels: { name: string; amount: number }[]; expectedReturn: number }[] = [];
    let remaining = totalBudget;
    let totalReturn = 0;
    for (let p = 0; p < periods; p++) {
      const periodBudget = Math.round((remaining / (periods - p)) * 100) / 100;
      const channelAmts: { name: string; amount: number }[] = [];
      let periodReturn = 0;
      const totalBase = channelReturns.reduce((s, c) => s + c.baseReturn * Math.pow(1 - c.decay, p), 0);
      for (let i = 0; i < nCh; i++) {
        const cr = channelReturns[i];
        const effReturn = cr.baseReturn * Math.pow(1 - cr.decay, p);
        const share = totalBase > 0 ? effReturn / totalBase : 1 / nCh;
        const amt = Math.round(periodBudget * share * 100) / 100;
        channelAmts.push({ name: cr.name, amount: amt });
        periodReturn += amt * effReturn / 100;
      }
      allocs.push({ period: p + 1, channels: channelAmts, expectedReturn: Math.round(periodReturn * 100) / 100 });
      totalReturn += periodReturn;
      remaining -= periodBudget;
    }
    return { algorithm: "multiPeriodBudget", periods, totalBudget, allocations: allocs, totalReturn: Math.round(totalReturn * 100) / 100 };
  }

  audienceLookalikeEnsemble(seedFeatures: number[][], candidateFeatures: number[][], topK: number = 10): AudienceLookalikeEnsembleResult {
    const scores: { id: number; score: number }[] = [];
    const seedMean = seedFeatures[0] ? seedFeatures[0].map((_, col) => seedFeatures.reduce((s, r) => s + r[col], 0) / seedFeatures.length) : [];
    const seedStd = seedMean.map((m, i) => Math.sqrt(seedFeatures.reduce((s, r) => s + (r[i] - m) ** 2, 0) / seedFeatures.length));
    for (let c = 0; c < candidateFeatures.length; c++) {
      const cand = candidateFeatures[c];
      let cosSim = 0, normSeed = 0, normCand = 0;
      for (let i = 0; i < Math.min(cand.length, seedMean.length); i++) { cosSim += cand[i] * seedMean[i]; normSeed += seedMean[i] ** 2; normCand += cand[i] ** 2; }
      cosSim = normSeed > 0 && normCand > 0 ? cosSim / (Math.sqrt(normSeed) * Math.sqrt(normCand)) : 0;
      let eucDist = 0;
      for (let i = 0; i < Math.min(cand.length, seedMean.length); i++) eucDist += (cand[i] - seedMean[i]) ** 2;
      eucDist = Math.sqrt(eucDist);
      let corr = 0;
      if (seedStd.every(s => s > 0) && cand.length >= seedMean.length) {
        const candMean = cand.reduce((s, v) => s + v, 0) / Math.min(cand.length, seedMean.length);
        let num = 0, den1 = 0, den2 = 0;
        for (let i = 0; i < Math.min(cand.length, seedMean.length); i++) { num += (cand[i] - candMean) * (seedMean[i] - seedMean.reduce((a, b) => a + b, 0) / seedMean.length); den1 += (cand[i] - candMean) ** 2; den2 += (seedMean[i] - seedMean.reduce((a, b) => a + b, 0) / seedMean.length) ** 2; }
        corr = den1 > 0 && den2 > 0 ? num / Math.sqrt(den1 * den2) : 0;
      }
      const score = cosSim * 0.4 + (1 / (1 + eucDist)) * 0.4 + (corr + 1) / 2 * 0.2;
      scores.push({ id: c, score: Math.round(score * 10000) / 10000 });
    }
    scores.sort((a, b) => b.score - a.score);
    const topCandidates = scores.slice(0, Math.min(topK, scores.length));
    return { algorithm: "audienceLookalike", seedSize: seedFeatures.length, candidateSize: candidateFeatures.length, scored: scores, topCandidates };
  }

  churnPredictionLogisticRegression(features: number[][], labels: number[]): ChurnPredictionLogisticResult {
    const n = features.length;
    const d = features[0]?.length || 1;
    let w = new Array(d).fill(0);
    let b = 0;
    const lr = 0.01;
    const epochs = 100;
    const sigmoid = (x: number) => 1 / (1 + Math.exp(-Math.max(-100, Math.min(100, x))));
    for (let ep = 0; ep < epochs; ep++) {
      let dw = new Array(d).fill(0);
      let db = 0;
      for (let i = 0; i < n; i++) {
        const z = features[i].reduce((s, v, j) => s + v * w[j], 0) + b;
        const pred = sigmoid(z);
        const err = pred - labels[i];
        for (let j = 0; j < d; j++) dw[j] += err * features[i][j];
        db += err;
      }
      for (let j = 0; j < d; j++) w[j] -= lr * dw[j] / n;
      b -= lr * db / n;
    }
    const predictions: { actual: number; predicted: number; probability: number }[] = [];
    let correct = 0;
    for (let i = 0; i < n; i++) {
      const z = features[i].reduce((s, v, j) => s + v * w[j], 0) + b;
      const prob = sigmoid(z);
      const pred = prob >= 0.5 ? 1 : 0;
      predictions.push({ actual: labels[i], predicted: pred, probability: Math.round(prob * 10000) / 10000 });
      if (pred === labels[i]) correct++;
    }
    const coefficients = [...w, b];
    return { algorithm: "churnPrediction", features, labels, predictions, accuracy: Math.round(correct / n * 10000) / 10000, coefficients: coefficients.map(v => Math.round(v * 10000) / 10000) };
  }

  keywordBidPortfolioOptimization(keywords: { term: string; conversions: number; cost: number; ctr: number }[], budget: number): KeywordBidPortfolioResult {
    const scored = keywords.map(k => {
      const cpa = k.conversions > 0 ? k.cost / k.conversions : Infinity;
      const efficiency = k.cost > 0 ? k.conversions / k.cost * 100 : 0;
      const bid = k.ctr > 0 ? Math.round(Math.min(k.cost / k.ctr, budget) * 100) / 100 : 0;
      return { ...k, efficiency, cpa, bid };
    });
    scored.sort((a, b) => b.efficiency - a.efficiency);
    const bids: { term: string; optimalBid: number; expectedConversions: number; efficiency: number }[] = [];
    let remaining = budget;
    let expectedTotalConversions = 0;
    for (const kw of scored) {
      const alloc = Math.min(kw.bid || remaining / keywords.length, remaining);
      const expConv = kw.conversions > 0 && kw.cost > 0 ? alloc / kw.cost * kw.conversions : 0;
      bids.push({ term: kw.term, optimalBid: Math.round(alloc * 100) / 100, expectedConversions: Math.round(expConv * 100) / 100, efficiency: Math.round(kw.efficiency * 100) / 100 });
      expectedTotalConversions += expConv;
      remaining -= alloc;
      if (remaining <= 0) break;
    }
    return { algorithm: "keywordBidPortfolio", keywords, budget, bids, expectedTotalConversions: Math.round(expectedTotalConversions * 100) / 100 };
  }
}

function sampleBeta(alpha: number, beta: number): number {
  const x = Math.random();
  const y = Math.random();
  const u = Math.pow(x, 1 / alpha);
  const v = Math.pow(y, 1 / beta);
  return u / (u + v);
}

function studentTProb(t: number, df: number): number {
  const x = df / (df + t * t);
  return 1 - 0.5 * Math.pow(x, df / 2) * (1 + t * t / df) / 2;
}

function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

export const dsAlgorithmService = new DSAlgorithmService();
