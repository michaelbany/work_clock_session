import { useDb } from '../../db'
import { workSessions } from '../../db/schema'
import type { TimeInterval } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ date?: string }>(event)
  const db = useDb()

  const now = new Date().toISOString()
  // Date comes from the client so it reflects their local timezone
  const date = body.date || now.split('T')[0]
  const intervals: TimeInterval[] = [{ start: now, end: null }]

  const [session] = await db
    .insert(workSessions)
    .values({ date, intervals, status: 'running' })
    .returning()

  return session
})
