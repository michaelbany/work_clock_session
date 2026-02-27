<script setup lang="ts">
defineProps<{ todayLabel: string }>()
const emit = defineEmits<{ logout: [] }>()
</script>

<template>
  <header class="flex items-center justify-between py-5">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-lg bg-white border border-zinc-200 flex items-center justify-center shrink-0 shadow-sm">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 7 12 12 15 14" />
        </svg>
      </div>
      <span class="font-semibold text-zinc-900 tracking-tight">Work Clock</span>
    </div>
    <div class="flex items-center gap-5">
      <span class="text-sm text-zinc-500 hidden sm:block capitalize">{{ todayLabel }}</span>
      <button
        @click="emit('logout')"
        class="text-sm text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
      >
        Odhlásit
      </button>
    </div>
  </header>
</template>
