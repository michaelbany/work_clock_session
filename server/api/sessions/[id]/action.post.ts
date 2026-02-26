import { useDb } from '../../../db'
import { workSessions } from '../../../db/schema'
import { eq } from 'drizzle-orm'
import type { TimeInterval } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const { action } = await readBody<{ action: 'pause' | 'resume' | 'end' }>(event)

  const db = useDb()
  const [session] = await db.select().from(workSessions).where(eq(workSessions.id, id))
  if (!session) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const now = new Date().toISOString()
  const intervals = session.intervals as TimeInterval[]

  if (action === 'pause' && session.status === 'running') {
    intervals[intervals.length - 1].end = now
    await db.update(workSessions)
      .set({ intervals, status: 'paused' })
      .where(eq(workSessions.id, id))
  } else if (action === 'resume' && session.status === 'paused') {
    intervals.push({ start: now, end: null })
    await db.update(workSessions)
      .set({ intervals, status: 'running' })
      .where(eq(workSessions.id, id))
  } else if (action === 'end') {
    if (session.status === 'running') {
      intervals[intervals.length - 1].end = now
    }
    await db.update(workSessions)
      .set({ intervals, status: 'ended' })
      .where(eq(workSessions.id, id))
  }

  const [updated] = await db.select().from(workSessions).where(eq(workSessions.id, id))
  return updated
})
