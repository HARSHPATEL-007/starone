import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";

export function useEntityData<T = any>(entityType: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.entities.list(entityType);
      setData((result || []) as T[]);
    } catch (e: any) {
      setError(e.message || "Failed to load data");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [entityType]);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (item: any): Promise<T | null> => {
    try {
      const created = await api.entities.create(entityType, item);
      setData((prev) => [created as T, ...prev]);
      return created as T;
    } catch (e: any) {
      setError(e.message || "Failed to create");
      return null;
    }
  }, [entityType]);

  const update = useCallback(async (id: string, item: any): Promise<T | null> => {
    try {
      const updated = await api.entities.update(entityType, id, item);
      setData((prev) => prev.map((d) => ((d as any)._id === id ? updated : d)) as T[]);
      return updated as T;
    } catch (e: any) {
      setError(e.message || "Failed to update");
      return null;
    }
  }, [entityType]);

  const remove = useCallback(async (id: string) => {
    try {
      await api.entities.delete(entityType, id);
      setData((prev) => prev.filter((d) => (d as any)._id !== id));
    } catch (e: any) {
      setError(e.message || "Failed to delete");
    }
  }, [entityType]);

  const replaceAll = useCallback(async (items: any[]) => {
    try {
      const existing = await api.entities.list(entityType);
      if (existing && existing.length > 0) await api.entities.deleteAll(entityType);
      const created: T[] = [];
      for (const item of items) {
        const c = await api.entities.create(entityType, item);
        created.push(c as T);
      }
      setData(created);
    } catch (e: any) {
      setError(e.message || "Failed to sync");
    }
  }, [entityType]);

  return { data, loading, error, refresh, create, update, remove, replaceAll, setData };
}
