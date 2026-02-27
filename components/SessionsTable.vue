<script setup lang="ts">
import type { WorkSession } from '~/composables/types'

const props = defineProps<{
  sessions: WorkSession[]
  totalCount: number
  page: number
  totalPages: number
  loading: boolean
}>()

const emit = defineEmits<{
  edit: [session: WorkSession]
  pageChange: [p: number]
  export: []
}>()

const { fmtSeconds, sessionDurationSeconds, sessionStartTime, sessionEndTime } = useSessionUtils()
</script>

<template>
  <div class="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">

    <!-- Header -->
    <div class="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <h2 class="text-sm font-semibold text-zinc-900">Záznamy</h2>
        <span class="px-2 py-0.5 bg-zinc-100 border border-zinc-200 text-zinc-500 text-xs rounded-full font-medium tabular-nums">
          {{ totalCount }}
        </span>
      </div>
      <button
        @click="emit('export')"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Export MD
      </button>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-zinc-100 bg-zinc-50">
            <th class="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Datum</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Začátek</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Konec</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Celkem</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden md:table-cell">Poznámky</th>
            <th class="px-4 py-3 w-14"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-zinc-100">
          <tr v-if="loading && !sessions.length">
            <td colspan="7" class="px-6 py-14 text-center text-sm text-zinc-400">Načítám…</td>
          </tr>
          <tr v-else-if="!sessions.length">
            <td colspan="7" class="px-6 py-14 text-center text-sm text-zinc-400">Žádné záznamy</td>
          </tr>
          <tr
            v-for="session in sessions"
            :key="session.id"
            class="hover:bg-zinc-50 transition-colors"
          >
            <td class="px-6 py-3.5 font-mono text-xs text-zinc-600">{{ session.date }}</td>
            <td class="px-4 py-3.5 font-mono text-xs text-zinc-600">{{ sessionStartTime(session) }}</td>
            <td class="px-4 py-3.5 font-mono text-xs text-zinc-600">{{ sessionEndTime(session) }}</td>
            <td class="px-4 py-3.5 font-mono text-xs font-bold text-zinc-900">{{ fmtSeconds(sessionDurationSeconds(session)) }}</td>
            <td class="px-4 py-3.5">
              <span
                class="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
                :class="{
                  'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200': session.status === 'running',
                  'bg-amber-50 text-amber-700 ring-1 ring-amber-200': session.status === 'paused',
                  'bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200': session.status === 'ended',
                }"
              >
                <span v-if="session.status === 'running'" class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {{ session.status }}
              </span>
            </td>
            <td class="px-4 py-3.5 text-xs text-zinc-500 max-w-40 truncate hidden md:table-cell" :title="session.notes || ''">
              {{ session.notes || '—' }}
            </td>
            <td class="px-4 py-3.5 text-right">
              <button
                @click="emit('edit', session)"
                class="text-xs text-zinc-400 hover:text-zinc-900 transition-colors cursor-pointer"
              >
                Upravit
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="px-6 py-4 border-t border-zinc-100 flex items-center justify-between">
      <button
        @click="emit('pageChange', page - 1)"
        :disabled="page === 1"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
      >
        ← Předchozí
      </button>
      <span class="text-xs text-zinc-500 tabular-nums">{{ page }} / {{ totalPages }}</span>
      <button
        @click="emit('pageChange', page + 1)"
        :disabled="page === totalPages"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
      >
        Další →
      </button>
    </div>

  </div>
</template>
