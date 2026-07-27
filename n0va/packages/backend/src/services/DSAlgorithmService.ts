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
}

function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

export const dsAlgorithmService = new DSAlgorithmService();
