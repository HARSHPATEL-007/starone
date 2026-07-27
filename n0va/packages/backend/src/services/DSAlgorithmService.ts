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
}

function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

export const dsAlgorithmService = new DSAlgorithmService();
