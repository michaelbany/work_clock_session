export function useAuth() {
  const authChecked = useState('authChecked', () => false)
  const isAuthenticated = useState('isAuthenticated', () => false)

  async function checkAuth() {
    const res = await $fetch<{ authenticated: boolean }>('/api/auth/check')
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
