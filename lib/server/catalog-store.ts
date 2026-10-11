import type { Catalog } from '../offer.ts';
import { emptyCatalog } from '../catalog.ts';
import { APPROVED_POLICIES, validatePublication } from './publication.ts';
import type { PublicationPolicy } from './publication.ts';
import { SOURCE_BY_ID } from '../sources.ts';
import type { SourceDefinition } from '../sources.ts';
import { decodeCatalog } from '../validation.ts';

export const GLOBAL_MIN_INTERVAL_MS = 15 * 60 * 1000;
export const LEASE_MS = 60 * 1000;
export const MAX_DAILY_ATTEMPTS = 96;
export const CATALOG_MAX_BYTES = 2 * 1024 * 1024;
export const EVENT_RETENTION_MS = 7 * 86400 * 1000;

export const CONTROL_INIT_SQL = 'INSERT OR IGNORE INTO acquisition_control (id,lease_token,lease_until,next_due_at,quota_day,daily_attempts) VALUES (1,NULL,0,0,\'\',0)';
export const CLAIM_SQL = `UPDATE acquisition_control SET lease_token=?, lease_until=?, quota_day=?,
  daily_attempts=CASE WHEN quota_day=? THEN daily_attempts+1 ELSE 1 END
  WHERE id=1 AND lease_until<=? AND next_due_at<=? AND (quota_day<>? OR daily_attempts<?)
  RETURNING lease_token`;
export const PUBLISH_SQL = `INSERT INTO catalog_state (id,payload,revision,updated_at,sequence)
  SELECT 1,?,?,?,? WHERE ?=COALESCE((SELECT sequence FROM catalog_state WHERE id=1),0)+1 AND EXISTS (SELECT 1 FROM acquisition_control WHERE id=1 AND lease_token=? AND lease_until>?)
  ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,revision=excluded.revision,updated_at=excluded.updated_at,sequence=excluded.sequence WHERE catalog_state.sequence+1=excluded.sequence`;
export const RELEASE_SQL = 'UPDATE acquisition_control SET lease_token=NULL,lease_until=0,next_due_at=? WHERE id=1 AND lease_token=?';

/** Only the server receives DB; the public route never accepts payloads, lease tokens or SQL. */
export class CatalogStore {
  private readonly database: D1Database;
  private readonly policies: ReadonlyMap<string, PublicationPolicy>;
  private readonly registry: ReadonlyMap<string, SourceDefinition>;
  constructor(database: D1Database, policies: ReadonlyMap<string, PublicationPolicy> = APPROVED_POLICIES, registry: ReadonlyMap<string, SourceDefinition> = SOURCE_BY_ID) { this.database = database; this.policies = policies; this.registry = registry; }
  async read(): Promise<Catalog> {
    const row = await this.database.prepare('SELECT payload,sequence FROM catalog_state WHERE id=1').first<{ payload: string; sequence: number }>();
    if (!row) return emptyCatalog();
    if (new TextEncoder().encode(row.payload).byteLength > CATALOG_MAX_BYTES) throw new TypeError('Stored catalog exceeds limit');
    const catalog = decodeCatalog(JSON.parse(row.payload));
    if (row.sequence !== catalog.sequence) throw new TypeError('Stored publication sequence mismatch');
    if (catalog.sequence === 0) { if (JSON.stringify(catalog) !== JSON.stringify(emptyCatalog())) throw new TypeError('Invalid initial publication'); return catalog; }
    // A disabled/revoked source must not escape through an older stored payload.
    return validatePublication(catalog, Date.parse(catalog.publishedAt ?? ''), this.policies, this.registry);
  }
  async claim(now: number): Promise<string | null> {
    if (!Number.isSafeInteger(now) || now < 0) throw new TypeError('Invalid acquisition time');
    await this.database.prepare(CONTROL_INIT_SQL).run();
    const token = crypto.randomUUID(), day = new Date(now).toISOString().slice(0,10);
    const row = await this.database.prepare(CLAIM_SQL).bind(token, now + LEASE_MS, day, day, now, now, day, MAX_DAILY_ATTEMPTS).first<{ lease_token: string }>();
    return row?.lease_token === token ? token : null;
  }
  async publish(token: string, catalog: Catalog, now: number): Promise<boolean> {
    const publicCatalog = validatePublication(catalog, now, this.policies, this.registry), payload = JSON.stringify(publicCatalog);
    if (new TextEncoder().encode(payload).byteLength > CATALOG_MAX_BYTES) throw new TypeError('Public catalog exceeds limit');
    const result = await this.database.prepare(PUBLISH_SQL).bind(payload, publicCatalog.revision, now, publicCatalog.sequence, publicCatalog.sequence, token, now).run();
    return result.meta.changes === 1;
  }
  async release(token: string, nextDueAt: number): Promise<void> {
    if (!Number.isSafeInteger(nextDueAt) || nextDueAt < 0) throw new TypeError('Invalid next acquisition time');
    await this.database.prepare(RELEASE_SQL).bind(nextDueAt, token).run();
  }
  async recordEvent(event: { sourceId: string; acquiredAt: number; outcome: 'success' | 'failure'; generation: string; added: number; changed: number; removed: number }): Promise<void> {
    await this.database.batch([
      this.database.prepare('INSERT INTO acquisition_events (id,source_id,acquired_at,outcome,generation,added,changed,removed) VALUES (?,?,?,?,?,?,?,?)')
        .bind(crypto.randomUUID(), event.sourceId, event.acquiredAt, event.outcome, event.generation, event.added, event.changed, event.removed),
      this.database.prepare('DELETE FROM acquisition_events WHERE acquired_at<?').bind(event.acquiredAt - EVENT_RETENTION_MS),
    ]);
  }
}
