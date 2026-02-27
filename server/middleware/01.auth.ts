import { verifyToken, createToken, COOKIE_NAME } from '../utils/auth'

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 60 * 60 * 24 * 30,
  path: '/',
}

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

  // Sliding session: reissue a fresh token on every valid API request
  const freshToken = await createToken()
  setCookie(event, COOKIE_NAME, freshToken, COOKIE_OPTIONS)
})
