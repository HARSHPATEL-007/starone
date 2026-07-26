import { Response } from "express";
import crypto from "crypto";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextPage?: number;
  prevPage?: number;
}

export interface Envelope<T> {
  data: T;
  meta?: Record<string, unknown>;
  pagination?: PaginationMeta;
}

export function computePagination(page: number, limit: number, total: number, maxLimit = 100): PaginationMeta {
  const clampedLimit = Math.min(Math.max(1, limit), maxLimit);
  const totalPages = Math.max(1, Math.ceil(total / clampedLimit));
  const safePage = Math.max(1, Math.min(page, totalPages));
  return {
    page: safePage,
    limit: clampedLimit,
    total,
    totalPages,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1,
    nextPage: safePage < totalPages ? safePage + 1 : undefined,
    prevPage: safePage > 1 ? safePage - 1 : undefined,
  };
}

export function sendPaginated<T>(res: Response, data: T, pagination: PaginationMeta, meta?: Record<string, unknown>): void {
  const body: Envelope<T> = { data, pagination };
  if (meta && Object.keys(meta).length > 0) body.meta = meta;
  addCacheHeaders(res, body);
  res.json(body);
}

export function sendSuccess<T>(res: Response, data: T, meta?: Record<string, unknown>): void {
  const body: Envelope<T> = { data };
  if (meta && Object.keys(meta).length > 0) body.meta = meta;
  addCacheHeaders(res, body);
  res.json(body);
}

export function sendCreated<T>(res: Response, data: T, meta?: Record<string, unknown>): void {
  const body: Envelope<T> = { data };
  if (meta && Object.keys(meta).length > 0) body.meta = meta;
  res.status(201).json(body);
}

export function validateRequired(body: Record<string, unknown>, fields: string[]): string[] {
  return fields.filter(f => body[f] === undefined || body[f] === null || body[f] === "");
}

export function safeInt(value: unknown, defaultVal: number): number {
  const n = parseInt(value as string, 10);
  return isNaN(n) ? defaultVal : n;
}

export function safeFloat(value: unknown, defaultVal: number): number {
  const n = parseFloat(value as string);
  return isNaN(n) ? defaultVal : n;
}

function addCacheHeaders(res: Response, body: unknown): void {
  const etag = crypto.createHash("md5").update(JSON.stringify(body)).digest("hex").substring(0, 16);
  res.setHeader("ETag", `"${etag}"`);
  res.setHeader("Last-Modified", new Date().toUTCString());
  res.setHeader("Cache-Control", "private, max-age=30");
}

export function pickAllowed<T extends Record<string, unknown>>(obj: T, allowed: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of allowed) {
    if (obj[key] !== undefined) result[key] = obj[key];
  }
  return result;
}
