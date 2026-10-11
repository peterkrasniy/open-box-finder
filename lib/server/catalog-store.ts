import type { Catalog } from '../offer.ts';
import { emptyCatalog } from '../catalog.ts';
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
export const PUBLISH_SQL = `INSERT INTO catalog_state (id,payload,revision,updated_at)
  SELECT 1,?,?,? WHERE EXISTS (SELECT 1 FROM acquisition_control WHERE id=1 AND lease_token=? AND lease_until>?)
  ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,revision=excluded.revision,updated_at=excluded.updated_at`;
export const RELEASE_SQL = 'UPDATE acquisition_control SET lease_token=NULL,lease_until=0,next_due_at=? WHERE id=1 AND lease_token=?';

/** Only the server receives DB; the public route never accepts payloads, lease tokens or SQL. */
export class CatalogStore {
  private readonly database: D1Database;
  constructor(database: D1Database) { this.database = database; }
  async read(): Promise<Catalog> {
    const row = await this.database.prepare('SELECT payload FROM catalog_state WHERE id=1').first<{ payload: string }>();
    if (!row) return emptyCatalog();
    if (new TextEncoder().encode(row.payload).byteLength > CATALOG_MAX_BYTES) throw new TypeError('Stored catalog exceeds limit');
    return decodeCatalog(JSON.parse(row.payload));
  }
  async claim(now: number): Promise<string | null> {
    if (!Number.isSafeInteger(now) || now < 0) throw new TypeError('Invalid acquisition time');
    await this.database.prepare(CONTROL_INIT_SQL).run();
    const token = crypto.randomUUID(), day = new Date(now).toISOString().slice(0,10);
    const row = await this.database.prepare(CLAIM_SQL).bind(token, now + LEASE_MS, day, day, now, now, day, MAX_DAILY_ATTEMPTS).first<{ lease_token: string }>();
    return row?.lease_token === token ? token : null;
  }
  async publish(token: string, catalog: Catalog, now: number): Promise<boolean> {
    const publicCatalog = decodeCatalog(catalog), payload = JSON.stringify(publicCatalog);
    if (new TextEncoder().encode(payload).byteLength > CATALOG_MAX_BYTES) throw new TypeError('Public catalog exceeds limit');
    const result = await this.database.prepare(PUBLISH_SQL).bind(payload, publicCatalog.revision, now, token, now).run();
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
