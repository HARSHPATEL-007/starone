import { Request, Response, NextFunction } from "express";

export interface PerformanceMetrics {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  contentLength: number;
  timestamp: string;
}

const completedRequests: PerformanceMetrics[] = [];
const MAX_HISTORY = 1000;

export function performanceMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const originalEnd = res.end.bind(res);
  let ended = false;

  function logRequest(): void {
    if (ended) return;
    ended = true;
    const duration = Date.now() - start;
    const metrics: PerformanceMetrics = {
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs: duration,
      contentLength: parseInt(res.getHeader("content-length") as string || "0", 10),
      timestamp: new Date().toISOString(),
    };
    completedRequests.push(metrics);
    if (completedRequests.length > MAX_HISTORY) completedRequests.shift();
    res.setHeader("X-Response-Time", `${duration}ms`);
  }

  res.on("finish", logRequest);
  res.on("close", logRequest);
  res.end = function (this: Response, ...args: any[]): Response {
    logRequest();
    return originalEnd(...args);
  };
  next();
}

export function getPerformanceSnapshot(): { total: number; avgDuration: number; p95Duration: number; byPath: Record<string, { count: number; avgMs: number }>; slowest: PerformanceMetrics | null } {
  if (completedRequests.length === 0) return { total: 0, avgDuration: 0, p95Duration: 0, byPath: {}, slowest: null };
  const durations = completedRequests.map(r => r.durationMs).sort((a, b) => a - b);
  const avgDuration = Math.round(durations.reduce((s, d) => s + d, 0) / durations.length);
  const p95Duration = durations[Math.ceil(durations.length * 0.95) - 1] || 0;
  const byPath: Record<string, { count: number; avgMs: number }> = {};
  completedRequests.forEach(r => {
    if (!byPath[r.path]) byPath[r.path] = { count: 0, avgMs: 0 };
    byPath[r.path].count++;
    byPath[r.path].avgMs = Math.round((byPath[r.path].avgMs * (byPath[r.path].count - 1) + r.durationMs) / byPath[r.path].count);
  });
  const slowest = completedRequests.reduce((max, r) => r.durationMs > (max?.durationMs || 0) ? r : max, completedRequests[0]);
  return { total: completedRequests.length, avgDuration, p95Duration, byPath, slowest };
}

export function clearPerformanceHistory(): void {
  completedRequests.length = 0;
}
