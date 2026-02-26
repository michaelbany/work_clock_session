import { createToken, COOKIE_NAME } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const { password } = await readBody<{ password: string }>(event)

  if (!password || password !== process.env.APP_PASSWORD) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid password' })
  }

  const token = await createToken()
  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })

  return { success: true }
})
