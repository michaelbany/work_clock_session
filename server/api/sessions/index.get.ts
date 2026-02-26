import { useDb } from '../../db'
import { workSessions } from '../../db/schema'
import { desc, gte, lte, and, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const all = query.all === 'true'
  const page = Number(query.page) || 1
  const pageSize = Number(query.pageSize) || 10
  const from = query.from as string | undefined
  const to = query.to as string | undefined

  const db = useDb()

  const conditions = []
  if (from) conditions.push(gte(workSessions.date, from))
  if (to) conditions.push(lte(workSessions.date, to))
  const where = conditions.length ? and(...conditions) : undefined

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(workSessions)
      .where(where)
      .orderBy(desc(workSessions.date), desc(workSessions.createdAt))
      .limit(all ? 10000 : pageSize)
      .offset(all ? 0 : (page - 1) * pageSize),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(workSessions)
      .where(where),
  ])

  return { sessions: rows, total: Number(total), page, pageSize }
})
