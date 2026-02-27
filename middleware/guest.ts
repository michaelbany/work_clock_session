export default defineNuxtRouteMiddleware(async () => {
  const { authChecked, isAuthenticated, checkAuth } = useAuth()
  if (!authChecked.value) {
    await checkAuth()
  }
  if (isAuthenticated.value) {
    return navigateTo('/')
  }
})
