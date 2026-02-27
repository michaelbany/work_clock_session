<script setup lang="ts">
import type { WorkSession } from '~/composables/types'

defineProps<{
  clockDisplay: string
  activeSession: WorkSession | null
}>()

const emit = defineEmits<{
  start: []
  pause: []
  resume: []
  end: []
  edit: []
}>()
</script>

<template>
  <div class="bg-white border border-zinc-200 rounded-2xl shadow-sm">
    <div class="flex flex-col items-center gap-5 py-12 px-6">

      <!-- Timer display -->
      <div
        class="font-mono font-bold select-none leading-none tabular-nums transition-all duration-500 text-[clamp(3.5rem,12vw,7.5rem)]"
        :class="
          activeSession?.status === 'running'
            ? 'text-emerald-500'
            : activeSession?.status === 'paused'
              ? 'text-amber-500'
              : 'text-zinc-200'
        "
      >
        {{ clockDisplay }}
      </div>

      <!-- Status badge -->
      <div class="h-6 flex items-center">
        <span
          v-if="activeSession?.status === 'running'"
          class="inline-flex items-center gap-2 text-sm font-medium text-emerald-600"
        >
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Probíhá · {{ activeSession.date }}
        </span>
        <span
          v-else-if="activeSession?.status === 'paused'"
          class="inline-flex items-center gap-2 text-sm font-medium text-amber-600"
        >
          <span class="w-2 h-2 rounded-full bg-amber-400"></span>
          Pozastaveno · {{ activeSession.date }}
        </span>
        <span v-else class="text-sm text-zinc-400">Žádná aktivní session</span>
      </div>

      <!-- Action buttons -->
      <div class="flex items-center gap-2.5 flex-wrap justify-center">
        <button
          v-if="!activeSession"
          @click="emit('start')"
          class="px-8 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-xl font-semibold text-sm tracking-wide transition-all cursor-pointer shadow-sm shadow-emerald-500/20"
        >
          Start
        </button>
        <button
          v-if="activeSession?.status === 'running'"
          @click="emit('pause')"
          class="px-7 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl font-semibold text-sm tracking-wide transition-all cursor-pointer"
        >
          Pause
        </button>
        <button
          v-if="activeSession?.status === 'paused'"
          @click="emit('resume')"
          class="px-7 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-xl font-semibold text-sm tracking-wide transition-all cursor-pointer"
        >
          Resume
        </button>
        <button
          v-if="activeSession"
          @click="emit('end')"
          class="px-7 py-2.5 border border-red-200 text-red-500 hover:bg-red-50 active:bg-red-100 rounded-xl font-semibold text-sm tracking-wide transition-all cursor-pointer"
        >
          End
        </button>
        <button
          v-if="activeSession"
          @click="emit('edit')"
          class="p-2.5 border border-zinc-200 hover:border-zinc-300 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 rounded-xl transition-all cursor-pointer"
          title="Upravit časy"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        </button>
      </div>

    </div>
  </div>
</template>
