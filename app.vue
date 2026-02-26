<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

// ─── Types ────────────────────────────────────────────────────────────────────

type TimeInterval = { start: string; end: string | null }
type WorkSession = {
  id: string
  date: string
  intervals: TimeInterval[]
  status: 'running' | 'paused' | 'ended'
  notes: string | null
  createdAt: string
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

const authChecked = ref(false)
const isAuthenticated = ref(false)
const loginPassword = ref('')
const loginError = ref('')
const loginLoading = ref(false)

async function checkAuth() {
  const res = await $fetch<{ authenticated: boolean }>('/api/auth/check').catch(
    () => ({ authenticated: false }),
  )
  isAuthenticated.value = res.authenticated
  authChecked.value = true
}

async function login() {
  if (loginLoading.value) return
  loginError.value = ''
  loginLoading.value = true
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: { password: loginPassword.value } })
    isAuthenticated.value = true
    loginPassword.value = ''
    await init()
  } catch {
    loginError.value = 'Nesprávné heslo'
  } finally {
    loginLoading.value = false
  }
}

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
  isAuthenticated.value = false
  activeSession.value = null
  sessions.value = []
  totalCount.value = 0
}

// ─── Active Session & Timer ───────────────────────────────────────────────────

const activeSession = ref<WorkSession | null>(null)
const nowMs = ref(Date.now())
let timerRef: ReturnType<typeof setInterval> | null = null

function startTimer() {
  if (timerRef) return
  timerRef = setInterval(() => { nowMs.value = Date.now() }, 1000)
}
function stopTimer() {
  if (timerRef) { clearInterval(timerRef); timerRef = null }
}

watch(() => activeSession.value?.status, (s) => {
  s === 'running' ? startTimer() : stopTimer()
}, { immediate: true })

function getElapsedSeconds(session: WorkSession): number {
  let ms = 0
  for (const iv of session.intervals) {
    const start = new Date(iv.start).getTime()
    const end = iv.end != null ? new Date(iv.end).getTime()
      : session.status === 'running' ? nowMs.value : start
    ms += Math.max(0, end - start)
  }
  return Math.floor(ms / 1000)
}

const elapsedSeconds = computed(() =>
  activeSession.value ? getElapsedSeconds(activeSession.value) : 0,
)

function fmtSeconds(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

const clockDisplay = computed(() => fmtSeconds(elapsedSeconds.value))

async function loadActiveSession() {
  activeSession.value = await $fetch<WorkSession | null>('/api/sessions/active').catch(() => null)
}

async function startSession() {
  const date = new Date().toLocaleDateString('sv')
  activeSession.value = await $fetch<WorkSession>('/api/sessions', {
    method: 'POST', body: { date },
  })
  await loadSessions()
}

async function doAction(action: 'pause' | 'resume' | 'end') {
  if (!activeSession.value) return
  const session = await $fetch<WorkSession>(
    `/api/sessions/${activeSession.value.id}/action`,
    { method: 'POST', body: { action } },
  )
  if (action === 'end') {
    activeSession.value = null
    await loadSessions()
  } else {
    activeSession.value = session
    await loadSessions()
  }
}

// ─── Sessions Table ───────────────────────────────────────────────────────────

const sessions = ref<WorkSession[]>([])
const totalCount = ref(0)
const page = ref(1)
const pageSize = ref(10)
const filterFrom = ref('')
const filterTo = ref('')
const tableLoading = ref(false)

const totalPages = computed(() => Math.ceil(totalCount.value / pageSize.value))

async function loadSessions() {
  tableLoading.value = true
  try {
    const params: Record<string, string | number> = { page: page.value, pageSize: pageSize.value }
    if (filterFrom.value) params.from = filterFrom.value
    if (filterTo.value) params.to = filterTo.value
    const data = await $fetch<{ sessions: WorkSession[]; total: number }>(
      '/api/sessions', { params },
    ).catch(() => ({ sessions: [], total: 0 }))
    sessions.value = data.sessions
    totalCount.value = data.total
  } finally {
    tableLoading.value = false
  }
}

async function applyFilter() {
  page.value = 1
  await Promise.all([loadSessions(), loadChartData()])
}

async function clearFilter() {
  filterFrom.value = ''
  filterTo.value = ''
  page.value = 1
  chartData.value = []
  await loadSessions()
}

function goToPage(p: number) {
  if (p < 1 || p > totalPages.value) return
  page.value = p
  loadSessions()
}

// ─── Chart ────────────────────────────────────────────────────────────────────

type ChartDay = { date: string; hours: number; seconds: number }
const chartData = ref<ChartDay[]>([])

const chartStats = computed(() => {
  const working = chartData.value.filter((d) => d.hours > 0)
  if (!working.length) return null
  const hrs = working.map((d) => d.hours)
  return {
    avg: hrs.reduce((a, b) => a + b, 0) / hrs.length,
    min: Math.min(...hrs),
    max: Math.max(...hrs),
    workingDays: working.length,
  }
})

async function loadChartData() {
  if (!filterFrom.value || !filterTo.value) { chartData.value = []; return }
  const data = await $fetch<{ sessions: WorkSession[] }>('/api/sessions', {
    params: { all: 'true', from: filterFrom.value, to: filterTo.value },
  }).catch(() => ({ sessions: [] }))

  const dayMap = new Map<string, number>()
  const cur = new Date(filterFrom.value)
  const endDate = new Date(filterTo.value)
  while (cur <= endDate) {
    dayMap.set(cur.toLocaleDateString('sv'), 0)
    cur.setDate(cur.getDate() + 1)
  }
  for (const s of data.sessions) {
    dayMap.set(s.date, (dayMap.get(s.date) || 0) + sessionDurationSeconds(s))
  }
  chartData.value = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, seconds]) => ({ date, hours: seconds / 3600, seconds }))
}

// SVG chart bars computed
const svgChart = computed(() => {
  const data = chartData.value
  if (!data.length) return null
  const W = 800, H = 130
  const pL = 38, pR = 8, pT = 12, pB = 28
  const cW = W - pL - pR
  const cH = H - pT - pB
  const maxHours = Math.max(12, ...data.map((d) => d.hours))
  const bW = cW / data.length
  const refY = pT + cH * (1 - 8 / maxHours)

  const bars = data.map((d, i) => {
    const clampedH = Math.min(d.hours, maxHours)
    const bH = (clampedH / maxHours) * cH
    return {
      x: pL + i * bW + bW * 0.12,
      y: pT + cH - bH,
      w: Math.max(bW * 0.76, 1),
      h: bH,
      color: d.hours === 0 ? '#e5e7eb' : d.hours >= 8 ? '#2da44e' : d.hours >= 5 ? '#f0b429' : '#cf222e',
      label: data.length <= 31 ? d.date.slice(5) : (i % Math.ceil(data.length / 20) === 0 ? d.date.slice(5) : ''),
      title: `${d.date}: ${fmtSeconds(d.seconds)}`,
    }
  })

  // Y-axis ticks
  const yTicks = [0, 2, 4, 6, 8, 10, 12].filter((t) => t <= maxHours)

  return { W, H, pL, pR, pT, pB, cW, cH, bars, refY, yTicks, maxHours }
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sessionDurationSeconds(s: WorkSession): number {
  let ms = 0
  for (const iv of s.intervals) {
    const start = new Date(iv.start).getTime()
    const end = iv.end ? new Date(iv.end).getTime() : 0
    if (end > start) ms += end - start
  }
  return Math.floor(ms / 1000)
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
}
function sessionStartTime(s: WorkSession) {
  return s.intervals.length ? fmtTime(s.intervals[0].start) : '—'
}
function sessionEndTime(s: WorkSession) {
  const last = s.intervals[s.intervals.length - 1]
  return last?.end ? fmtTime(last.end) : '—'
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

const editSession = ref<WorkSession | null>(null)
const editIntervals = ref<{ start: string; end: string }[]>([])
const editNotes = ref('')
const editSaving = ref(false)

// Only extract the HH:MM time part
function toInputTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// Reconstruct ISO from session date + HH:MM, handling midnight crossing
function fromInputTime(sessionDate: string, timeStr: string, prevIso?: string): string {
  const [hh, mm] = timeStr.split(':').map(Number)
  const d = new Date(sessionDate + 'T00:00:00')
  d.setHours(hh, mm, 0, 0)
  if (prevIso && d.getTime() < new Date(prevIso).getTime()) {
    d.setDate(d.getDate() + 1)  // crossed midnight
  }
  return d.toISOString()
}

function openEdit(session: WorkSession) {
  editSession.value = session
  editIntervals.value = session.intervals.map((iv) => ({
    start: toInputTime(iv.start),
    end: iv.end ? toInputTime(iv.end) : '',
  }))
  editNotes.value = session.notes || ''
}
function closeEdit() { editSession.value = null }
function addEditInterval() { editIntervals.value.push({ start: '', end: '' }) }
function removeEditInterval(i: number) { editIntervals.value.splice(i, 1) }

async function saveEdit() {
  if (!editSession.value || editSaving.value) return
  editSaving.value = true
  try {
    const intervals: TimeInterval[] = []
    for (const iv of editIntervals.value) {
      if (!iv.start.trim()) continue
      const startIso = fromInputTime(editSession.value.date, iv.start)
      const endIso = iv.end ? fromInputTime(editSession.value.date, iv.end, startIso) : null
      intervals.push({ start: startIso, end: endIso })
    }
    const updated = await $fetch<WorkSession>(`/api/sessions/${editSession.value.id}`, {
      method: 'PATCH',
      body: { intervals, notes: editNotes.value },
    })
    if (activeSession.value?.id === updated.id) activeSession.value = updated
    const idx = sessions.value.findIndex((s) => s.id === updated.id)
    if (idx >= 0) sessions.value[idx] = updated
    editSession.value = null
  } finally {
    editSaving.value = false
  }
}

// ─── Export ───────────────────────────────────────────────────────────────────

async function exportMD() {
  const params: Record<string, string> = { all: 'true' }
  if (filterFrom.value) params.from = filterFrom.value
  if (filterTo.value) params.to = filterTo.value
  const data = await $fetch<{ sessions: WorkSession[] }>('/api/sessions', { params })
    .catch(() => ({ sessions: [] }))
  const rows = data.sessions.map(
    (s) => `| ${s.date} | ${sessionStartTime(s)} | ${sessionEndTime(s)} | ${fmtSeconds(sessionDurationSeconds(s))} | ${s.status} | ${s.notes || '—'} |`,
  )
  const md = [
    `# Work Log — ${new Date().toISOString().split('T')[0]}`,
    '',
    '| Datum | Začátek | Konec | Celkem | Status | Poznámky |',
    '|-------|---------|-------|--------|--------|----------|',
    ...rows,
  ].join('\n')
  const blob = new Blob([md], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  Object.assign(document.createElement('a'), { href: url, download: `work-log-${new Date().toISOString().split('T')[0]}.md` }).click()
  URL.revokeObjectURL(url)
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

async function init() {
  await Promise.all([loadActiveSession(), loadSessions()])
}
onMounted(async () => {
  await checkAuth()
  if (isAuthenticated.value) await init()
})
onUnmounted(stopTimer)

const todayLabel = computed(() =>
  new Date().toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
)
</script>

<template>
  <div class="min-h-screen bg-[#f6f8fa] font-sans text-[#24292f]">

    <!-- Loading splash -->
    <div v-if="!authChecked" class="min-h-screen flex items-center justify-center">
      <div class="font-mono text-2xl text-gray-300 animate-pulse select-none">00:00:00</div>
    </div>

    <!-- ── Login ──────────────────────────────────────────────────────────── -->
    <div v-else-if="!isAuthenticated" class="min-h-screen flex items-center justify-center p-4">
      <div class="w-full max-w-sm">
        <!-- Logo card -->
        <div class="bg-white border border-[#d0d7de] rounded-2xl p-8 shadow-sm space-y-6">
          <!-- Icon -->
          <div class="flex flex-col items-center gap-3">
            <div class="w-14 h-14 rounded-full bg-[#f6f8fa] border border-[#d0d7de] flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 text-[#57606a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="12" r="9" />
                <polyline points="12 7 12 12 15 14" />
              </svg>
            </div>
            <div class="text-center">
              <h1 class="text-xl font-semibold text-[#24292f]">Work Clock</h1>
              <p class="text-sm text-[#57606a] mt-0.5">Přihlaste se pro pokračování</p>
            </div>
          </div>

          <!-- Form -->
          <form @submit.prevent="login" class="space-y-3">
            <div class="space-y-1">
              <label class="block text-sm font-medium text-[#24292f]">Heslo</label>
              <input
                v-model="loginPassword"
                type="password"
                placeholder="••••••••"
                autocomplete="current-password"
                autofocus
                class="w-full px-3 py-2 border border-[#d0d7de] rounded-lg text-sm bg-white text-[#24292f] placeholder-[#8c959f] focus:outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20 transition-all"
              />
            </div>
            <p v-if="loginError" class="text-sm text-[#cf222e]">{{ loginError }}</p>
            <button
              type="submit"
              :disabled="loginLoading"
              class="w-full py-2 px-4 bg-[#2da44e] hover:bg-[#2c974b] disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer"
            >
              {{ loginLoading ? 'Přihlašuji…' : 'Přihlásit se' }}
            </button>
          </form>
        </div>
      </div>
    </div>

    <!-- ── Main App ───────────────────────────────────────────────────────── -->
    <div v-else class="max-w-4xl mx-auto px-4 py-6 space-y-4">

      <!-- Nav -->
      <header class="flex items-center justify-between py-1">
        <div class="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-[#57606a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" />
          </svg>
          <span class="font-semibold text-sm text-[#24292f]">Work Clock</span>
          <span class="text-[#d0d7de]">·</span>
          <span class="text-sm text-[#57606a] capitalize">{{ todayLabel }}</span>
        </div>
        <button
          @click="logout"
          class="text-sm text-[#57606a] hover:text-[#24292f] transition-colors cursor-pointer"
        >
          Odhlásit
        </button>
      </header>

      <!-- ── Clock Card ──────────────────────────────────────────────────── -->
      <div class="bg-white border border-[#d0d7de] rounded-xl p-6 shadow-sm">
        <div class="flex flex-col items-center gap-4">
          <!-- Big timer -->
          <div
            class="font-mono font-bold select-none leading-none transition-colors duration-300"
            :class="{
              'text-[#8c959f] text-8xl sm:text-9xl': !activeSession,
              'text-[#2da44e] text-8xl sm:text-9xl': activeSession?.status === 'running',
              'text-[#d29922] text-8xl sm:text-9xl': activeSession?.status === 'paused',
            }"
          >
            {{ clockDisplay }}
          </div>

          <!-- Status badge -->
          <div class="h-6 flex items-center">
            <span v-if="activeSession?.status === 'running'" class="inline-flex items-center gap-1.5 text-sm font-medium text-[#2da44e]">
              <span class="w-2 h-2 rounded-full bg-[#2da44e] animate-pulse"></span>
              Probíhá · {{ activeSession.date }}
            </span>
            <span v-else-if="activeSession?.status === 'paused'" class="inline-flex items-center gap-1.5 text-sm font-medium text-[#d29922]">
              <span class="w-2 h-2 rounded-full bg-[#d29922]"></span>
              Pozastaveno · {{ activeSession.date }}
            </span>
          </div>

          <!-- Buttons -->
          <div class="flex items-center gap-2 flex-wrap justify-center">
            <button
              v-if="!activeSession"
              @click="startSession"
              class="px-6 py-2 bg-[#2da44e] hover:bg-[#2c974b] text-white rounded-lg font-semibold text-sm tracking-wide transition-colors cursor-pointer"
            >
              Start
            </button>
            <button
              v-if="activeSession?.status === 'running'"
              @click="doAction('pause')"
              class="px-6 py-2 bg-[#d29922] hover:bg-[#b08800] text-white rounded-lg font-semibold text-sm tracking-wide transition-colors cursor-pointer"
            >
              Pause
            </button>
            <button
              v-if="activeSession?.status === 'paused'"
              @click="doAction('resume')"
              class="px-6 py-2 bg-[#2da44e] hover:bg-[#2c974b] text-white rounded-lg font-semibold text-sm tracking-wide transition-colors cursor-pointer"
            >
              Resume
            </button>
            <button
              v-if="activeSession"
              @click="doAction('end')"
              class="px-6 py-2 bg-[#cf222e] hover:bg-[#a40e26] text-white rounded-lg font-semibold text-sm tracking-wide transition-colors cursor-pointer"
            >
              End
            </button>
            <button
              v-if="activeSession"
              @click="openEdit(activeSession)"
              class="p-2 border border-[#d0d7de] bg-white hover:bg-[#f6f8fa] rounded-lg text-[#57606a] hover:text-[#24292f] transition-colors cursor-pointer"
              title="Upravit časy"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- ── Filter + Chart Card ─────────────────────────────────────────── -->
      <div class="bg-white border border-[#d0d7de] rounded-xl shadow-sm overflow-hidden">
        <!-- Filter row -->
        <div class="px-5 py-4 flex flex-wrap items-end gap-3 border-b border-[#d0d7de]">
          <div class="space-y-1">
            <label class="block text-xs font-medium text-[#57606a]">Od</label>
            <input
              type="date"
              v-model="filterFrom"
              class="px-3 py-1.5 border border-[#d0d7de] rounded-lg text-sm text-[#24292f] bg-white focus:outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20 transition-all cursor-pointer"
            />
          </div>
          <div class="space-y-1">
            <label class="block text-xs font-medium text-[#57606a]">Do</label>
            <input
              type="date"
              v-model="filterTo"
              class="px-3 py-1.5 border border-[#d0d7de] rounded-lg text-sm text-[#24292f] bg-white focus:outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20 transition-all cursor-pointer"
            />
          </div>
          <button
            @click="applyFilter"
            class="px-4 py-1.5 bg-[#0969da] hover:bg-[#0860ca] text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            Zobrazit
          </button>
          <button
            v-if="filterFrom || filterTo"
            @click="clearFilter"
            class="px-4 py-1.5 border border-[#d0d7de] hover:bg-[#f6f8fa] text-[#57606a] hover:text-[#24292f] rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            Zrušit
          </button>
        </div>

        <!-- Chart -->
        <div v-if="svgChart" class="px-5 py-4 space-y-3">
          <!-- Stats strip -->
          <div v-if="chartStats" class="flex flex-wrap gap-6 text-sm">
            <div>
              <span class="text-[#57606a]">Průměr</span>
              <span class="ml-2 font-semibold font-mono text-[#24292f]">{{ fmtSeconds(Math.round(chartStats.avg * 3600)) }}</span>
            </div>
            <div>
              <span class="text-[#57606a]">Min</span>
              <span class="ml-2 font-semibold font-mono text-[#24292f]">{{ fmtSeconds(Math.round(chartStats.min * 3600)) }}</span>
            </div>
            <div>
              <span class="text-[#57606a]">Max</span>
              <span class="ml-2 font-semibold font-mono text-[#24292f]">{{ fmtSeconds(Math.round(chartStats.max * 3600)) }}</span>
            </div>
            <div>
              <span class="text-[#57606a]">Pracovní dny</span>
              <span class="ml-2 font-semibold text-[#24292f]">{{ chartStats.workingDays }}</span>
            </div>
            <!-- Legend -->
            <div class="flex items-center gap-3 ml-auto text-xs text-[#57606a]">
              <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm inline-block bg-[#2da44e]"></span> ≥ 8h</span>
              <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm inline-block bg-[#f0b429]"></span> 5–8h</span>
              <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm inline-block bg-[#cf222e]"></span> &lt; 5h</span>
            </div>
          </div>

          <!-- SVG Bar Chart -->
          <svg
            :viewBox="`0 0 ${svgChart.W} ${svgChart.H}`"
            class="w-full"
            :style="`height: ${svgChart.H + 10}px`"
          >
            <!-- Y-axis grid lines + labels -->
            <g v-for="tick in svgChart.yTicks" :key="tick">
              <line
                :x1="svgChart.pL"
                :x2="svgChart.W - svgChart.pR"
                :y1="svgChart.pT + svgChart.cH * (1 - tick / svgChart.maxHours)"
                :y2="svgChart.pT + svgChart.cH * (1 - tick / svgChart.maxHours)"
                stroke="#d0d7de"
                stroke-width="0.5"
              />
              <text
                :x="svgChart.pL - 4"
                :y="svgChart.pT + svgChart.cH * (1 - tick / svgChart.maxHours) + 4"
                text-anchor="end"
                font-size="9"
                fill="#8c959f"
              >{{ tick }}h</text>
            </g>

            <!-- 8h reference line -->
            <line
              :x1="svgChart.pL"
              :x2="svgChart.W - svgChart.pR"
              :y1="svgChart.refY"
              :y2="svgChart.refY"
              stroke="#cf222e"
              stroke-width="1"
              stroke-dasharray="4 3"
              opacity="0.6"
            />
            <text
              :x="svgChart.W - svgChart.pR + 2"
              :y="svgChart.refY + 4"
              font-size="9"
              fill="#cf222e"
              opacity="0.8"
            >8h</text>

            <!-- Bars -->
            <g v-for="bar in svgChart.bars" :key="bar.title">
              <rect
                :x="bar.x"
                :y="bar.y"
                :width="bar.w"
                :height="Math.max(bar.h, 1)"
                :fill="bar.color"
                rx="2"
              >
                <title>{{ bar.title }}</title>
              </rect>
              <text
                v-if="bar.label"
                :x="bar.x + bar.w / 2"
                :y="svgChart.pT + svgChart.cH + 10"
                text-anchor="middle"
                font-size="8"
                fill="#8c959f"
              >{{ bar.label }}</text>
            </g>
          </svg>
        </div>

        <!-- Empty chart hint -->
        <div v-else-if="filterFrom && filterTo && !svgChart" class="px-5 py-6 text-center text-sm text-[#8c959f]">
          Načítám data…
        </div>
      </div>

      <!-- ── Table Card ──────────────────────────────────────────────────── -->
      <div class="bg-white border border-[#d0d7de] rounded-xl shadow-sm overflow-hidden">
        <!-- Table header -->
        <div class="px-5 py-3 border-b border-[#d0d7de] flex items-center justify-between">
          <span class="text-sm font-semibold text-[#24292f]">
            Záznamy
            <span class="ml-1.5 px-2 py-0.5 bg-[#f6f8fa] border border-[#d0d7de] text-[#57606a] text-xs rounded-full font-medium">{{ totalCount }}</span>
          </span>
          <button
            @click="exportMD"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#d0d7de] hover:bg-[#f6f8fa] text-[#24292f] rounded-lg text-xs font-medium transition-colors cursor-pointer"
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
              <tr class="text-left border-b border-[#d0d7de] bg-[#f6f8fa]">
                <th class="px-5 py-2.5 text-xs font-semibold text-[#57606a] uppercase tracking-wider">Datum</th>
                <th class="px-4 py-2.5 text-xs font-semibold text-[#57606a] uppercase tracking-wider">Začátek</th>
                <th class="px-4 py-2.5 text-xs font-semibold text-[#57606a] uppercase tracking-wider">Konec</th>
                <th class="px-4 py-2.5 text-xs font-semibold text-[#57606a] uppercase tracking-wider">Celkem</th>
                <th class="px-4 py-2.5 text-xs font-semibold text-[#57606a] uppercase tracking-wider">Status</th>
                <th class="px-4 py-2.5 text-xs font-semibold text-[#57606a] uppercase tracking-wider">Poznámky</th>
                <th class="px-4 py-2.5 w-14"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#d0d7de]">
              <tr v-if="tableLoading && !sessions.length">
                <td colspan="7" class="px-5 py-10 text-center text-sm text-[#8c959f]">Načítám…</td>
              </tr>
              <tr v-else-if="!sessions.length">
                <td colspan="7" class="px-5 py-10 text-center text-sm text-[#8c959f]">Žádné záznamy</td>
              </tr>
              <tr
                v-for="session in sessions"
                :key="session.id"
                class="hover:bg-[#f6f8fa] transition-colors"
              >
                <td class="px-5 py-3 font-mono text-xs text-[#24292f]">{{ session.date }}</td>
                <td class="px-4 py-3 font-mono text-xs text-[#24292f]">{{ sessionStartTime(session) }}</td>
                <td class="px-4 py-3 font-mono text-xs text-[#24292f]">{{ sessionEndTime(session) }}</td>
                <td class="px-4 py-3 font-mono text-xs font-bold text-[#24292f]">{{ fmtSeconds(sessionDurationSeconds(session)) }}</td>
                <td class="px-4 py-3">
                  <span
                    class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border"
                    :class="{
                      'bg-[#dafbe1] text-[#116329] border-[#a8d5b0]': session.status === 'running',
                      'bg-[#fff8c5] text-[#9a6700] border-[#f0c843]': session.status === 'paused',
                      'bg-[#f6f8fa] text-[#57606a] border-[#d0d7de]': session.status === 'ended',
                    }"
                  >
                    <span v-if="session.status === 'running'" class="w-1.5 h-1.5 rounded-full bg-[#2da44e] animate-pulse"></span>
                    {{ session.status }}
                  </span>
                </td>
                <td class="px-4 py-3 text-xs text-[#57606a] max-w-[140px] truncate" :title="session.notes || ''">
                  {{ session.notes || '—' }}
                </td>
                <td class="px-4 py-3 text-right">
                  <button
                    @click="openEdit(session)"
                    class="text-xs text-[#0969da] hover:underline cursor-pointer"
                  >
                    Upravit
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="px-5 py-3 border-t border-[#d0d7de] flex items-center justify-between">
          <button
            @click="goToPage(page - 1)"
            :disabled="page === 1"
            class="inline-flex items-center gap-1 px-3 py-1.5 border border-[#d0d7de] rounded-lg text-xs font-medium text-[#24292f] hover:bg-[#f6f8fa] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            ← Předchozí
          </button>
          <span class="text-xs text-[#57606a]">Strana {{ page }} z {{ totalPages }}</span>
          <button
            @click="goToPage(page + 1)"
            :disabled="page === totalPages"
            class="inline-flex items-center gap-1 px-3 py-1.5 border border-[#d0d7de] rounded-lg text-xs font-medium text-[#24292f] hover:bg-[#f6f8fa] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Další →
          </button>
        </div>
      </div>

    </div><!-- end main -->

    <!-- ── Edit Modal ─────────────────────────────────────────────────────── -->
    <Teleport to="body">
      <div
        v-if="editSession"
        class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
        @click.self="closeEdit"
      >
        <div class="bg-white border border-[#d0d7de] rounded-xl shadow-xl w-full max-w-md overflow-hidden">
          <!-- Modal header -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-[#d0d7de]">
            <h2 class="font-semibold text-[#24292f]">Upravit session</h2>
            <button @click="closeEdit" class="text-[#8c959f] hover:text-[#24292f] transition-colors cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>

          <div class="px-5 py-4 space-y-4">
            <!-- Date (readonly) -->
            <div class="flex items-center justify-between py-2 px-3 bg-[#f6f8fa] border border-[#d0d7de] rounded-lg">
              <span class="text-sm text-[#57606a]">Datum</span>
              <span class="font-mono text-sm font-semibold text-[#24292f]">{{ editSession.date }}</span>
            </div>

            <!-- Intervals — time only inputs -->
            <div class="space-y-2">
              <p class="text-xs font-medium text-[#57606a] uppercase tracking-wider">Časové úseky</p>
              <div
                v-for="(iv, i) in editIntervals"
                :key="i"
                class="flex items-center gap-2"
              >
                <div class="flex-1 flex items-center gap-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-lg px-3 py-2">
                  <span class="text-xs text-[#8c959f] w-12 shrink-0">Začátek</span>
                  <input
                    type="time"
                    v-model="iv.start"
                    class="flex-1 min-w-0 text-sm font-mono text-[#24292f] bg-transparent focus:outline-none"
                  />
                  <span class="text-[#d0d7de]">—</span>
                  <span class="text-xs text-[#8c959f] w-8 shrink-0">Konec</span>
                  <input
                    type="time"
                    v-model="iv.end"
                    class="flex-1 min-w-0 text-sm font-mono text-[#24292f] bg-transparent focus:outline-none"
                  />
                </div>
                <button
                  @click="removeEditInterval(i)"
                  class="text-[#8c959f] hover:text-[#cf222e] transition-colors cursor-pointer shrink-0"
                  title="Odstranit"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                </button>
              </div>
              <button
                @click="addEditInterval"
                class="text-xs text-[#0969da] hover:underline cursor-pointer"
              >
                + Přidat úsek
              </button>
            </div>

            <!-- Notes -->
            <div class="space-y-1">
              <label class="block text-xs font-medium text-[#57606a] uppercase tracking-wider">Poznámky</label>
              <input
                v-model="editNotes"
                type="text"
                placeholder="Volitelné…"
                class="w-full px-3 py-2 border border-[#d0d7de] rounded-lg text-sm text-[#24292f] placeholder-[#8c959f] bg-white focus:outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20 transition-all"
              />
            </div>
          </div>

          <!-- Modal footer -->
          <div class="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#d0d7de] bg-[#f6f8fa]">
            <button
              @click="closeEdit"
              class="px-4 py-1.5 border border-[#d0d7de] hover:bg-white text-[#24292f] rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              Zrušit
            </button>
            <button
              @click="saveEdit"
              :disabled="editSaving"
              class="px-4 py-1.5 bg-[#2da44e] hover:bg-[#2c974b] disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer"
            >
              {{ editSaving ? 'Ukládám…' : 'Uložit změny' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>
