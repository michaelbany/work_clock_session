import { useDb } from '../../db'
import { workSessions } from '../../db/schema'
import { or, eq, desc } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const db = useDb()
  const [session] = await db
    .select()
    .from(workSessions)
    .where(or(eq(workSessions.status, 'running'), eq(workSessions.status, 'paused')))
    .orderBy(desc(workSessions.createdAt))
    .limit(1)

  return session ?? null
})
