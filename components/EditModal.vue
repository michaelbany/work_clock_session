<script setup lang="ts">
import type { WorkSession, TimeInterval } from '~/composables/types'

const props = defineProps<{
  session: WorkSession
  saving: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [intervals: TimeInterval[], notes: string]
}>()

const editIntervals = ref(
  props.session.intervals.map((iv) => ({
    start: toInputTime(iv.start),
    end: iv.end ? toInputTime(iv.end) : '',
  })),
)
const editNotes = ref(props.session.notes || '')

function toInputTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function fromInputTime(sessionDate: string, timeStr: string, prevIso?: string): string {
  const [hh, mm] = timeStr.split(':').map(Number)
  const d = new Date(sessionDate + 'T00:00:00')
  d.setHours(hh, mm, 0, 0)
  if (prevIso && d.getTime() < new Date(prevIso).getTime()) {
    d.setDate(d.getDate() + 1)
  }
  return d.toISOString()
}

function addInterval() {
  editIntervals.value.push({ start: '', end: '' })
}
function removeInterval(i: number) {
  editIntervals.value.splice(i, 1)
}

function save() {
  const intervals: TimeInterval[] = []
  for (const iv of editIntervals.value) {
    if (!iv.start.trim()) continue
    const startIso = fromInputTime(props.session.date, iv.start)
    const endIso = iv.end ? fromInputTime(props.session.date, iv.end, startIso) : null
    intervals.push({ start: startIso, end: endIso })
  }
  emit('save', intervals, editNotes.value)
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-black/25 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50"
      @click.self="emit('close')"
    >
      <div class="bg-white border border-zinc-200 rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md overflow-hidden">

        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <div>
            <h2 class="font-semibold text-zinc-900">Upravit session</h2>
            <p class="text-xs text-zinc-500 mt-0.5 font-mono">{{ session.date }}</p>
          </div>
          <button
            @click="emit('close')"
            class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-all cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>

        <div class="px-6 py-5 space-y-5">

          <!-- Intervals -->
          <div class="space-y-3">
            <p class="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Časové úseky</p>
            <div
              v-for="(iv, i) in editIntervals"
              :key="i"
              class="flex items-center gap-2"
            >
              <div class="flex-1 flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5">
                <span class="text-xs text-zinc-400 w-12 shrink-0">Začátek</span>
                <input
                  type="time"
                  v-model="iv.start"
                  class="flex-1 min-w-0 text-sm font-mono text-zinc-900 bg-transparent focus:outline-none"
                />
                <span class="text-zinc-300 shrink-0">–</span>
                <span class="text-xs text-zinc-400 w-8 shrink-0">Konec</span>
                <input
                  type="time"
                  v-model="iv.end"
                  class="flex-1 min-w-0 text-sm font-mono text-zinc-900 bg-transparent focus:outline-none"
                />
              </div>
              <button
                @click="removeInterval(i)"
                class="p-1.5 text-zinc-300 hover:text-red-400 transition-colors cursor-pointer shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
            <button
              @click="addInterval"
              class="text-xs text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
            >
              + Přidat úsek
            </button>
          </div>

          <!-- Notes -->
          <div class="space-y-1.5">
            <label class="block text-xs font-semibold text-zinc-500 uppercase tracking-wider">Poznámky</label>
            <input
              v-model="editNotes"
              type="text"
              placeholder="Volitelné…"
              class="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 transition-all"
            />
          </div>

        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-zinc-100 bg-zinc-50">
          <button
            @click="emit('close')"
            class="px-4 py-2 bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            Zrušit
          </button>
          <button
            @click="save"
            :disabled="saving"
            class="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer"
          >
            {{ saving ? 'Ukládám…' : 'Uložit změny' }}
          </button>
        </div>

      </div>
    </div>
  </Teleport>
</template>
