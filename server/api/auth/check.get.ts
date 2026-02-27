import { verifyToken, createToken, COOKIE_NAME } from '../../utils/auth'

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 60 * 60 * 24 * 30,
  path: '/',
}

export default defineEventHandler(async (event) => {
  const token = getCookie(event, COOKIE_NAME)
  if (!token) return { authenticated: false }

  const valid = await verifyToken(token)
  if (!valid) return { authenticated: false }

  // Sliding session: refresh cookie on valid check (called on every page load)
  const freshToken = await createToken()
  setCookie(event, COOKIE_NAME, freshToken, COOKIE_OPTIONS)

  return { authenticated: true }
})
