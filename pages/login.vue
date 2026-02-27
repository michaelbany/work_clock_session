<script setup lang="ts">
const { authChecked, isAuthenticated, checkAuth } = useAuth()

const loginPassword = ref('')
const loginError = ref('')
const loginLoading = ref(false)
const checking = ref(true)

onMounted(async () => {
  if (!authChecked.value) await checkAuth()
  if (isAuthenticated.value) {
    await navigateTo('/')
    return
  }
  checking.value = false
})

async function login() {
  if (loginLoading.value) return
  loginError.value = ''
  loginLoading.value = true
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: { password: loginPassword.value } })
    isAuthenticated.value = true
    await navigateTo('/')
  } catch {
    loginError.value = 'Nesprávné heslo'
    loginLoading.value = false
  }
}
</script>

<template>
  <!-- Auth check splash -->
  <div v-if="checking" class="min-h-screen flex items-center justify-center">
    <div class="font-mono text-zinc-200 text-3xl animate-pulse select-none tracking-widest">
      00:00:00
    </div>
  </div>

  <!-- Login -->
  <div v-else class="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">

    <!-- Decorative background clock -->
    <div
      class="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
      aria-hidden="true"
    >
      <span class="font-mono font-bold text-zinc-100 text-[20vw] leading-none tracking-tighter">
        00:00:00
      </span>
    </div>

    <!-- Login card -->
    <div class="relative w-full max-w-sm">
      <div class="bg-white border border-zinc-200 rounded-2xl p-8 shadow-lg space-y-7">

        <!-- Brand -->
        <div class="flex flex-col items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="9" />
              <polyline points="12 7 12 12 15 14" />
            </svg>
          </div>
          <div class="text-center">
            <h1 class="text-xl font-bold text-zinc-900 tracking-tight">Work Clock</h1>
            <p class="text-sm text-zinc-500 mt-1">Přihlaste se pro pokračování</p>
          </div>
        </div>

        <!-- Form -->
        <form @submit.prevent="login" class="space-y-4">
          <div class="space-y-1.5">
            <label class="block text-xs font-semibold text-zinc-500 uppercase tracking-wider">Heslo</label>
            <input
              v-model="loginPassword"
              type="password"
              placeholder="••••••••"
              autocomplete="current-password"
              autofocus
              class="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 transition-all"
            />
          </div>

          <div v-if="loginError" class="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-red-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <span class="text-sm text-red-600">{{ loginError }}</span>
          </div>

          <button
            type="submit"
            :disabled="loginLoading"
            class="w-full py-3 px-4 bg-zinc-900 hover:bg-zinc-700 active:bg-zinc-800 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all cursor-pointer"
          >
            {{ loginLoading ? 'Přihlašuji…' : 'Přihlásit se' }}
          </button>
        </form>

      </div>
    </div>
  </div>
</template>
