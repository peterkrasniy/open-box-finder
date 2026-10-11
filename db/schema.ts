import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** Public offer envelope only; never shopper preferences, profiles, tokens or raw adapter errors. */
export const catalogState = sqliteTable('catalog_state', {
  id: integer('id').primaryKey(),
  payload: text('payload').notNull(),
  revision: text('revision').notNull(),
  sequence: integer('sequence').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

/** Single global acquisition lease/quota prevents browsers from multiplying source traffic. */
export const acquisitionControl = sqliteTable('acquisition_control', {
  id: integer('id').primaryKey(),
  leaseToken: text('lease_token'),
  leaseUntil: integer('lease_until').notNull().default(0),
  nextDueAt: integer('next_due_at').notNull().default(0),
  quotaDay: text('quota_day').notNull().default(''),
  dailyAttempts: integer('daily_attempts').notNull().default(0),
});

/** Bounded operational summaries contain identifiers/counts/times only, no licensed content. */
export const acquisitionEvents = sqliteTable('acquisition_events', {
  id: text('id').primaryKey(),
  sourceId: text('source_id').notNull(),
  acquiredAt: integer('acquired_at').notNull(),
  outcome: text('outcome').notNull(),
  generation: text('generation').notNull(),
  added: integer('added').notNull().default(0),
  changed: integer('changed').notNull().default(0),
  removed: integer('removed').notNull().default(0),
});

/** Private, short-lived admission evidence, never included in public catalog responses. */
export const sourcePreflight = sqliteTable('source_preflight', {
  sourceId: text('source_id').primaryKey(),
  checkedAt: integer('checked_at').notNull(),
  payload: text('payload').notNull(),
  expiresAt: integer('expires_at').notNull(),
});
