import { randomUUID } from 'crypto';
import { QueryOptions } from '../src/firestore/firestore.service';

type Doc = Record<string, unknown> & { id: string };
type Condition = NonNullable<QueryOptions['where']>[number];

/**
 * In-memory stand-in for FirestoreService, used by the e2e tests so they run
 * without Google Cloud credentials. It implements the methods the API uses.
 */
export class InMemoryFirestore {
  private collections = new Map<string, Map<string, Doc>>();

  private col(name: string): Map<string, Doc> {
    if (!this.collections.has(name)) this.collections.set(name, new Map());
    return this.collections.get(name)!;
  }

  async findById<T>(collection: string, id: string): Promise<T | null> {
    const doc = this.col(collection).get(id);
    return doc ? ({ ...doc } as unknown as T) : null;
  }

  async create(collection: string, data: Record<string, unknown>): Promise<string> {
    const id = randomUUID();
    await this.createWithId(collection, id, data);
    return id;
  }

  async createWithId(collection: string, id: string, data: Record<string, unknown>): Promise<void> {
    const now = new Date();
    const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
    this.col(collection).set(id, { ...clean, id, createdAt: now, updatedAt: now });
  }

  async update<T>(collection: string, id: string, data: Partial<T>): Promise<void> {
    const existing = this.col(collection).get(id);
    if (!existing) throw new Error(`No document to update: ${collection}/${id}`);
    const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
    this.col(collection).set(id, { ...existing, ...clean, updatedAt: new Date() });
  }

  async delete(collection: string, id: string): Promise<void> {
    this.col(collection).delete(id);
  }

  async increment(collection: string, id: string, field: string, value = 1): Promise<void> {
    const existing = this.col(collection).get(id);
    if (!existing) throw new Error(`No document to update: ${collection}/${id}`);
    existing[field] = ((existing[field] as number) || 0) + value;
  }

  async findMany<T>(collection: string, options?: QueryOptions): Promise<T[]> {
    let docs = [...this.col(collection).values()].filter((doc) =>
      (options?.where || []).every((condition) => matches(doc, condition)),
    );
    for (const order of [...(options?.orderBy || [])].reverse()) {
      const direction = order.direction === 'desc' ? -1 : 1;
      docs = docs.sort((a, b) => compare(a[order.field], b[order.field]) * direction);
    }
    const offset = options?.offset || 0;
    docs = docs.slice(offset, options?.limit ? offset + options.limit : undefined);
    return docs.map((doc) => ({ ...doc })) as unknown as T[];
  }

  async count(collection: string, options?: QueryOptions): Promise<number> {
    return (await this.findMany(collection, { where: options?.where })).length;
  }

  all(collection: string): Doc[] {
    return [...this.col(collection).values()];
  }
}

function compare(a: unknown, b: unknown): number {
  const x = a instanceof Date ? a.getTime() : (a as number | string);
  const y = b instanceof Date ? b.getTime() : (b as number | string);
  if (x === y) return 0;
  if (x === undefined) return -1;
  if (y === undefined) return 1;
  return x < y ? -1 : 1;
}

function matches(doc: Doc, { field, op, value }: Condition): boolean {
  const actual = doc[field];
  switch (op) {
    case '==': return actual === value;
    case '!=': return actual !== value;
    case '<': return compare(actual, value) < 0;
    case '<=': return compare(actual, value) <= 0;
    case '>': return compare(actual, value) > 0;
    case '>=': return compare(actual, value) >= 0;
    case 'in': return (value as unknown[]).includes(actual);
    case 'not-in': return !(value as unknown[]).includes(actual);
    case 'array-contains': return Array.isArray(actual) && actual.includes(value);
    case 'array-contains-any':
      return Array.isArray(actual) && (value as unknown[]).some((v) => actual.includes(v));
    default: return false;
  }
}
