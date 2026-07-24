import crypto from "crypto";

interface EntityRecord {
  _id: string;
  tenantId: string;
  entityType: string;
  data: Record<string, unknown>;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export class EntityStore {
  private records: EntityRecord[] = [];

  list(tenantId: string, entityType: string, filter?: Record<string, unknown>): EntityRecord[] {
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
    return results.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  get(id: string, tenantId: string): EntityRecord | undefined {
    return this.records.find((r) => r._id === id && r.tenantId === tenantId);
  }

  create(
    tenantId: string,
    entityType: string,
    data: Record<string, unknown>,
    createdBy?: string
  ): EntityRecord {
    const now = new Date().toISOString();
    const record: EntityRecord = {
      _id: `${entityType}_${crypto.randomBytes(8).toString("hex")}`,
      tenantId,
      entityType,
      data: { ...data },
      createdBy,
      createdAt: now,
      updatedAt: now,
    };
    this.records.push(record);
    return record;
  }

  update(
    id: string,
    tenantId: string,
    data: Partial<Record<string, unknown>>
  ): EntityRecord | undefined {
    const record = this.records.find(
      (r) => r._id === id && r.tenantId === tenantId
    );
    if (!record) return undefined;
    Object.assign(record.data, data);
    record.updatedAt = new Date().toISOString();
    return record;
  }

  delete(id: string, tenantId: string): boolean {
    const idx = this.records.findIndex(
      (r) => r._id === id && r.tenantId === tenantId
    );
    if (idx === -1) return false;
    this.records.splice(idx, 1);
    return true;
  }

  deleteAll(tenantId: string, entityType: string): number {
    const before = this.records.length;
    this.records = this.records.filter(
      (r) => !(r.tenantId === tenantId && r.entityType === entityType)
    );
    return before - this.records.length;
  }

  count(tenantId: string, entityType: string, filter?: Record<string, unknown>): number {
    return this.list(tenantId, entityType, filter).length;
  }
}

export const entityStore = new EntityStore();
