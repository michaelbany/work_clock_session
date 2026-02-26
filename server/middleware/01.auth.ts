import { verifyToken, COOKIE_NAME } from '../utils/auth'

export default defineEventHandler(async (event) => {
  const pathname = getRequestURL(event).pathname

  // Only guard API routes
  if (!pathname.startsWith('/api/')) return
  // Skip auth endpoints themselves
  if (pathname.startsWith('/api/auth/')) return

  const token = getCookie(event, COOKIE_NAME)
  if (!token || !await verifyToken(token)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
})
