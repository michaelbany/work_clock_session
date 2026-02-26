import { pgTable, uuid, date, jsonb, text, timestamp } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export type TimeInterval = {
  start: string   // ISO 8601 timestamp
  end: string | null  // ISO 8601 timestamp, null = still running
}

export const workSessions = pgTable('work_sessions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  date: date('date').notNull(),           // YYYY-MM-DD of session start (never changes)
  intervals: jsonb('intervals').notNull().$type<TimeInterval[]>(),
  status: text('status').notNull().default('running'), // running | paused | ended
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export type WorkSession = typeof workSessions.$inferSelect
