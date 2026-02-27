export function useAuth() {
  const authChecked = useState('authChecked', () => false)
  const isAuthenticated = useState('isAuthenticated', () => false)

  async function checkAuth() {
    // During SSR, $fetch in route middleware does NOT auto-forward browser cookies.
    // useRequestHeaders explicitly passes them so /api/auth/check can read wc_token.
    const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
    const res = await $fetch<{ authenticated: boolean }>('/api/auth/check', { headers })
      .catch(() => ({ authenticated: false }))
    isAuthenticated.value = res.authenticated
    authChecked.value = true
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    isAuthenticated.value = false
    await navigateTo('/login')
  }

  return { authChecked, isAuthenticated, checkAuth, logout }
}
