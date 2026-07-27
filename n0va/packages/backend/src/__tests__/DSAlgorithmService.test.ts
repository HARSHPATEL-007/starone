import { describe, it, expect } from "vitest";
import { dsAlgorithmService } from "../services/DSAlgorithmService";

describe("DSAlgorithmService - Data Structures", () => {
  it("trieOperations", () => {
    const result = dsAlgorithmService.trieOperations(["campaign","creative","conversion","click","cost"],["campaign","cost","notfound"]);
    expect(result.insertions).toBe(5);
    expect(result.searchResults.some((r) => r.found)).toBe(true);
  });

  it("fenwickTreeOperations", () => {
    const result = dsAlgorithmService.fenwickTreeOperations([3,7,1,9,4,6,8,2,5,0],[{type:"prefix",l:0,r:5},{type:"range",l:3,r:7}]);
    expect(result.type).toBe("fenwick");
    expect(result.operations.length).toBe(2);
  });

  it("segmentTreeOperations", () => {
    const result = dsAlgorithmService.segmentTreeOperations([5,2,9,1,7,3,8,4,6,0],[{type:"sum",l:2,r:6},{type:"min",l:1,r:5},{type:"max",l:3,r:8}]);
    expect(result.type).toBe("segment");
    expect(result.operations.length).toBe(3);
  });

  it("unionFindOperations", () => {
    const result = dsAlgorithmService.unionFindOperations(["a","b","c","d","e"],[["a","b"],["b","c"]],[["a","c"],["a","d"]]);
    expect(result.sets.length).toBeGreaterThan(0);
    expect(result.operations.length).toBe(2);
  });

  it("bloomFilterOperations", () => {
    const result = dsAlgorithmService.bloomFilterOperations(["user_1","user_2","user_3","user_4","user_5"],["user_1","user_99"],0.01);
    expect(result.inserted).toBe(5);
    const knownItem = result.testResults.find((t) => t.item === "user_1");
    expect(knownItem?.probablyPresent).toBe(true);
  });

  it("minHeapOperations", () => {
    const result = dsAlgorithmService.minHeapOperations([5,3,8,1,9,2,7],3);
    expect(result.sorted.length).toBe(3);
    expect(result.sorted[0]).toBeLessThanOrEqual(result.sorted[result.sorted.length-1]);
  });

  it("lruCacheOperations evicts when at capacity", () => {
    const result = dsAlgorithmService.lruCacheOperations(3,[
      {action:"put",key:"a",value:1},{action:"put",key:"b",value:2},{action:"put",key:"c",value:3},
      {action:"get",key:"a"},{action:"put",key:"d",value:4},
    ]);
    expect(result.operations.length).toBe(5);
    expect(result.operations.some((op) => op.evicted)).toBe(true);
  });

  it("lruCacheOperations handles cache miss", () => {
    const result = dsAlgorithmService.lruCacheOperations(2,[{action:"put",key:"x",value:10},{action:"get",key:"y"}]);
    expect(result.operations[1].value).toBeUndefined();
  });
});

describe("DSAlgorithmService - Sorting & Selection", () => {
  const unsorted = [38,27,43,3,9,82,10];

  it("quickSort", () => {
    const result = dsAlgorithmService.quickSort(unsorted);
    expect(result.algorithm).toBe("quickSort");
    for (let i=1;i<result.output.length;i++) expect(result.output[i-1]).toBeLessThanOrEqual(result.output[i]);
    expect(result.input).toEqual(unsorted);
  });

  it("mergeSort", () => {
    const result = dsAlgorithmService.mergeSort(unsorted);
    expect(result.algorithm).toBe("mergeSort");
    for (let i=1;i<result.output.length;i++) expect(result.output[i-1]).toBeLessThanOrEqual(result.output[i]);
  });

  it("heapSort", () => {
    const result = dsAlgorithmService.heapSort(unsorted);
    expect(result.algorithm).toBe("heapSort");
    for (let i=1;i<result.output.length;i++) expect(result.output[i-1]).toBeLessThanOrEqual(result.output[i]);
  });

  it("quickSelect finds k-th largest", () => {
    const sorted = [...unsorted].sort((a,b) => b-a);
    const result = dsAlgorithmService.quickSelect(unsorted,3);
    expect(result.value).toBe(sorted[2]);
  });

  it("quickSelect returns null for out-of-range k", () => {
    const result = dsAlgorithmService.quickSelect([1,2,3],10);
    expect(result.value).toBeNull();
  });
});

describe("DSAlgorithmService - Searching", () => {
  it("binarySearch finds existing target", () => {
    const result = dsAlgorithmService.binarySearch([10,3,7,1,9,5],7);
    expect(result.found).toBe(true);
    expect(result.array[result.index]).toBe(7);
  });

  it("binarySearch returns not found for missing target", () => {
    const result = dsAlgorithmService.binarySearch([1,3,5,7,9],4);
    expect(result.found).toBe(false);
    expect(result.index).toBe(-1);
  });

  it("ternarySearch finds maximum of unimodal function", () => {
    const result = dsAlgorithmService.ternarySearch((x:number)=>-(x-5)*(x-5)+25,0,10);
    expect(result.argmax).toBeCloseTo(5,0);
    expect(result.maximum).toBeCloseTo(25,0);
  });
});

describe("DSAlgorithmService - Graph Algorithms", () => {
  const nodes = ["A","B","C","D","E","F"];
  const edges = [["A","B"],["A","C"],["B","D"],["B","E"],["C","F"]] as [string,string][];

  it("bfsTraverse", () => {
    const result = dsAlgorithmService.bfsTraverse(nodes,edges,"A");
    expect(result.traversal[0]).toBe("A");
    expect(new Set(result.traversal).size).toBe(result.traversal.length);
  });

  it("dfsTraverse", () => {
    const result = dsAlgorithmService.dfsTraverse(nodes,edges,"A");
    expect(result.traversal[0]).toBe("A");
  });

  it("dijkstra finds shortest path", () => {
    const wedges = [["A","B",4],["A","C",2],["B","C",1],["B","D",5],["C","D",8],["C","E",10],["D","E",2]] as [string,string,number][];
    const result = dsAlgorithmService.dijkstra(["A","B","C","D","E"],wedges,"A","E");
    expect(result.path).toBeDefined();
    expect(result.path!.length).toBeGreaterThan(0);
    expect(result.path![0]).toBe("A");
    expect(result.path![result.path!.length-1]).toBe("E");
  });

  it("topologicalSort produces valid ordering", () => {
    const result = dsAlgorithmService.topologicalSort(nodes,edges);
    expect(result.hasCycle).toBe(false);
    expect(result.traversal.length).toBe(nodes.length);
  });

  it("topologicalSort detects cycle", () => {
    const result = dsAlgorithmService.topologicalSort(["A","B","C"],[["A","B"],["B","C"],["C","A"]]);
    expect(result.hasCycle).toBe(true);
  });

  it("detectCycle detects cycle", () => {
    const result = dsAlgorithmService.detectCycle(["A","B","C","D"],[["A","B"],["B","C"],["C","A"],["B","D"]]);
    expect(result.hasCycle).toBe(true);
  });

  it("detectCycle returns false for DAG", () => {
    const result = dsAlgorithmService.detectCycle(nodes,edges);
    expect(result.hasCycle).toBe(false);
  });
});

describe("DSAlgorithmService - String Algorithms", () => {
  it("kmpSearch finds pattern matches", () => {
    const result = dsAlgorithmService.kmpSearch("ABCABCABDABCABCABCDABD","ABCABD");
    expect(result.matches.length).toBeGreaterThan(0);
  });

  it("kmpSearch returns empty for no match", () => {
    const result = dsAlgorithmService.kmpSearch("ABC","XYZ");
    expect(result.matches.length).toBe(0);
  });

  it("rabinKarpSearch finds pattern matches", () => {
    const result = dsAlgorithmService.rabinKarpSearch("ABCABCABDABCABCABCDABD","ABCABD");
    expect(result.matches.length).toBeGreaterThan(0);
  });

  it("levenshteinDistance computes edit distance", () => {
    const result = dsAlgorithmService.levenshteinDistance("kitten","sitting");
    expect(result.distance).toBe(3);
    expect(result.similarity).toBeGreaterThan(0);
  });

  it("levenshteinDistance returns 0 for identical strings", () => {
    const result = dsAlgorithmService.levenshteinDistance("campaign","campaign");
    expect(result.distance).toBe(0);
    expect(result.similarity).toBe(100);
  });

  it("zAlgorithm finds pattern matches", () => {
    const result = dsAlgorithmService.zAlgorithm("ABCABCABDABCABCABCDABD","ABCABD");
    expect(result.matches.length).toBeGreaterThan(0);
  });
});

describe("DSAlgorithmService - Dynamic Programming", () => {
  it("knapSack01 solves 0/1 knapsack", () => {
    const result = dsAlgorithmService.knapSack01(50,[
      {weight:10,value:60,name:"Display"},{weight:20,value:100,name:"Social"},{weight:30,value:120,name:"Search"},
    ]);
    expect(result.output.maxValue).toBeGreaterThan(0);
    expect((result.output.selected as string[]).length).toBeGreaterThan(0);
  });

  it("longestCommonSubsequence", () => {
    const result = dsAlgorithmService.longestCommonSubsequence("ABCDEF","ACDF");
    expect(result.output.sequence).toHaveLength(4);
  });

  it("longestIncreasingSubsequence", () => {
    const result = dsAlgorithmService.longestIncreasingSubsequence([10,22,9,33,21,50,41,60,80]);
    expect(result.output.length).toBeGreaterThanOrEqual(5);
  });

  it("longestIncreasingSubsequence returns 0 for empty array", () => {
    const result = dsAlgorithmService.longestIncreasingSubsequence([]);
    expect(result.output.length).toBe(0);
  });

  it("coinChange finds minimum coins", () => {
    const result = dsAlgorithmService.coinChange([1,5,10,25],63);
    expect(result.output.minCoins).toBeGreaterThan(0);
  });

  it("coinChange returns -1 for impossible amount", () => {
    const result = dsAlgorithmService.coinChange([2],3);
    expect(result.output.minCoins).toBe(-1);
  });

  it("maxSubarraySum", () => {
    const result = dsAlgorithmService.maxSubarraySum([-2,1,-3,4,-1,2,1,-5,4]);
    expect(result.output.maxSum).toBe(6);
    expect(result.output.subarray).toEqual([4,-1,2,1]);
  });
});

describe("DSAlgorithmService - Optimization", () => {
  it("convexHull computes hull and area", () => {
    const result = dsAlgorithmService.convexHull([{x:0,y:3},{x:2,y:2},{x:1,y:1},{x:2,y:1},{x:3,y:0},{x:0,y:0},{x:3,y:3}]);
    expect(result.hull.length).toBeGreaterThanOrEqual(3);
    expect(result.area).toBeGreaterThan(0);
  });

  it("kClosestPoints finds k closest to target", () => {
    const result = dsAlgorithmService.kClosestPoints([{x:1,y:2},{x:3,y:4},{x:-1,y:0},{x:5,y:6},{x:0,y:1}],3,{x:0,y:0});
    expect(result.closest.length).toBe(3);
    expect(result.closest[0].distance).toBeLessThanOrEqual(result.closest[result.closest.length-1].distance);
  });
});
