import { useDb } from '../../db'
import { workSessions } from '../../db/schema'
import { eq } from 'drizzle-orm'
import type { TimeInterval } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readBody<{
    intervals?: TimeInterval[]
    notes?: string
    status?: string
  }>(event)

  const db = useDb()
  const updates: Partial<typeof workSessions.$inferInsert> = {}
  if (body.intervals !== undefined) updates.intervals = body.intervals
  if (body.notes !== undefined) updates.notes = body.notes || null
  if (body.status !== undefined) updates.status = body.status

  const [updated] = await db
    .update(workSessions)
    .set(updates)
    .where(eq(workSessions.id, id))
    .returning()

  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  return updated
})
