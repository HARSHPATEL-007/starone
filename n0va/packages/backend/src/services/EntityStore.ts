import crypto from "crypto";
import mongoose from "mongoose";
import { EntityRecord, IEntityRecord } from "../models/EntityRecord";

interface InMemEntity {
  _id: string;
  tenantId: string;
  entityType: string;
  data: Record<string, unknown>;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class EntityStore {
  private records: InMemEntity[] = [];
  private useMongo = false;

  constructor() { this.useMongo = mongoose.connection.readyState === 1; }

  private isConnected(): boolean {
    return mongoose.connection.readyState === 1;
  }

  async list(tenantId: string, entityType: string, filter?: Record<string, unknown>): Promise<any[]> {
    if (this.isConnected()) {
      const query: any = { tenantId, entityType };
      if (filter) {
        for (const [key, value] of Object.entries(filter)) {
          if (key === "search" && typeof value === "string") {
            query["$or"] = [
              { "data.name": { $regex: value, $options: "i" } },
              { "data.title": { $regex: value, $options: "i" } },
              { "data.description": { $regex: value, $options: "i" } },
            ];
          } else {
            query[`data.${key}`] = value;
          }
        }
      }
      const docs = await EntityRecord.find(query).sort({ createdAt: -1 }).lean();
      return docs.map((d: any) => ({ _id: d._id.toString(), ...d.data }));
    }

    let results = this.records.filter(
      (r) => r.tenantId === tenantId && r.entityType === entityType
    );
    if (filter) {
      for (const [key, value] of Object.entries(filter)) {
        if (key === "search" && typeof value === "string") {
          results = results.filter((r) =>
            JSON.stringify(r.data).toLowerCase().includes(value.toLowerCase())
          );
        } else {
          results = results.filter((r) => r.data[key] === value);
        }
      }
    }
    return results
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((r) => ({ _id: r._id, ...r.data }));
  }

  async get(id: string, tenantId: string): Promise<any | undefined> {
    if (this.isConnected()) {
      const doc = await EntityRecord.findOne({ _id: id, tenantId }).lean();
      if (!doc) return undefined;
      const d: any = doc;
      return { _id: d._id.toString(), ...d.data };
    }
    const r = this.records.find((rec) => rec._id === id && rec.tenantId === tenantId);
    if (!r) return undefined;
    return { _id: r._id, ...r.data };
  }

  async create(
    tenantId: string,
    entityType: string,
    data: Record<string, unknown>,
    createdBy?: string
  ): Promise<any> {
    if (this.isConnected()) {
      const doc = await EntityRecord.create({ tenantId, entityType, data, createdBy });
      return { _id: doc._id.toString(), ...data };
    }
    const now = new Date();
    const _id = `${entityType}_${crypto.randomBytes(8).toString("hex")}`;
    const record: InMemEntity = { _id, tenantId, entityType, data: { ...data }, createdBy, createdAt: now, updatedAt: now };
    this.records.push(record);
    return { _id, ...data };
  }

  async update(
    id: string,
    tenantId: string,
    data: Record<string, unknown>
  ): Promise<any | undefined> {
    if (this.isConnected()) {
      const doc = await EntityRecord.findOneAndUpdate(
        { _id: id, tenantId },
        { $set: { data } },
        { new: true }
      ).lean();
      if (!doc) return undefined;
      const d: any = doc;
      return { _id: d._id.toString(), ...d.data };
    }
    const record = this.records.find((r) => r._id === id && r.tenantId === tenantId);
    if (!record) return undefined;
    Object.assign(record.data, data);
    record.updatedAt = new Date();
    return { _id: record._id, ...record.data };
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    if (this.isConnected()) {
      const result = await EntityRecord.deleteOne({ _id: id, tenantId });
      return result.deletedCount > 0;
    }
    const idx = this.records.findIndex((r) => r._id === id && r.tenantId === tenantId);
    if (idx === -1) return false;
    this.records.splice(idx, 1);
    return true;
  }

  async deleteAll(tenantId: string, entityType: string): Promise<number> {
    if (this.isConnected()) {
      const result = await EntityRecord.deleteMany({ tenantId, entityType });
      return result.deletedCount || 0;
    }
    const before = this.records.length;
    this.records = this.records.filter(
      (r) => !(r.tenantId === tenantId && r.entityType === entityType)
    );
    return before - this.records.length;
  }

  async count(tenantId: string, entityType: string, filter?: Record<string, unknown>): Promise<number> {
    if (this.isConnected()) {
      const query: any = { tenantId, entityType };
      if (filter) {
        for (const [key, value] of Object.entries(filter)) {
          query[`data.${key}`] = value;
        }
      }
      return EntityRecord.countDocuments(query);
    }
    return this.list(tenantId, entityType, filter).then(r => r.length);
  }
}

export const entityStore = new EntityStore();
