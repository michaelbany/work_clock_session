import { verifyToken, COOKIE_NAME } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, COOKIE_NAME)
  if (!token) return { authenticated: false }
  return { authenticated: await verifyToken(token) }
})
