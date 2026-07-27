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
}

export const dsAlgorithmService = new DSAlgorithmService();
