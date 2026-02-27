<script setup lang="ts">
import type { WorkSession, TimeInterval, ChartDay } from "~/composables/types";

definePageMeta({ middleware: 'auth' })

// ── Auth ─────────────────────────────────────────────────────────────────────

const { logout } = useAuth();
const appReady = ref(false);

onMounted(async () => {
  await init();
  appReady.value = true;
});

// ── Timer ─────────────────────────────────────────────────────────────────────

const activeSession = ref<WorkSession | null>(null);
const nowMs = ref(Date.now());
let timerRef: ReturnType<typeof setInterval> | null = null;

function startTimer() {
  if (timerRef) return;
  timerRef = setInterval(() => {
    nowMs.value = Date.now();
  }, 1000);
}
function stopTimer() {
  if (timerRef) {
    clearInterval(timerRef);
    timerRef = null;
  }
}

watch(
  () => activeSession.value?.status,
  (s) => {
    s === "running" ? startTimer() : stopTimer();
  },
  { immediate: true },
);

onUnmounted(stopTimer);

const { fmtSeconds, sessionDurationSeconds } = useSessionUtils();

const elapsedSeconds = computed(() => {
  if (!activeSession.value) return 0;
  let ms = 0;
  for (const iv of activeSession.value.intervals) {
    const start = new Date(iv.start).getTime();
    const end =
      iv.end != null
        ? new Date(iv.end).getTime()
        : activeSession.value.status === "running"
          ? nowMs.value
          : start;
    ms += Math.max(0, end - start);
  }
  return Math.floor(ms / 1000);
});

const clockDisplay = computed(() => fmtSeconds(elapsedSeconds.value));

// ── Session actions ───────────────────────────────────────────────────────────

async function loadActiveSession() {
  activeSession.value = await $fetch<WorkSession | null>(
    "/api/sessions/active",
  ).catch(() => null);
}

async function startSession() {
  const date = new Date().toLocaleDateString("sv");
  activeSession.value = await $fetch<WorkSession>("/api/sessions", {
    method: "POST",
    body: { date },
  });
  await Promise.all([loadSessions(), loadChartData()]);
}

async function doAction(action: "pause" | "resume" | "end") {
  if (!activeSession.value) return;
  const session = await $fetch<WorkSession>(
    `/api/sessions/${activeSession.value.id}/action`,
    { method: "POST", body: { action } },
  );
  activeSession.value = action === "end" ? null : session;
  await Promise.all([loadSessions(), loadChartData()]);
}

// ── Sessions table ────────────────────────────────────────────────────────────

const sessions = ref<WorkSession[]>([]);
const totalCount = ref(0);
const page = ref(1);
const pageSize = ref(10);
const filterFrom = ref("");
const filterTo = ref("");
const tableLoading = ref(false);

const totalPages = computed(() => Math.ceil(totalCount.value / pageSize.value));

async function loadSessions() {
  tableLoading.value = true;
  try {
    const params: Record<string, string | number> = {
      page: page.value,
      pageSize: pageSize.value,
    };
    if (filterFrom.value) params.from = filterFrom.value;
    if (filterTo.value) params.to = filterTo.value;
    const data = await $fetch<{ sessions: WorkSession[]; total: number }>(
      "/api/sessions",
      { params },
    ).catch(() => ({ sessions: [], total: 0 }));
    sessions.value = data.sessions;
    totalCount.value = data.total;
  } finally {
    tableLoading.value = false;
  }
}

async function applyFilter() {
  page.value = 1;
  await Promise.all([loadSessions(), loadChartData()]);
}

function defaultRange() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    from: firstOfMonth.toLocaleDateString("sv"),
    to: today.toLocaleDateString("sv"),
  };
}

async function clearFilter() {
  const { from, to } = defaultRange();
  filterFrom.value = from;
  filterTo.value = to;
  page.value = 1;
  await Promise.all([loadSessions(), loadChartData()]);
}

function goToPage(p: number) {
  if (p < 1 || p > totalPages.value) return;
  page.value = p;
  loadSessions();
}

// ── Chart data ────────────────────────────────────────────────────────────────

const chartData = ref<ChartDay[]>([]);

async function loadChartData() {
  if (!filterFrom.value || !filterTo.value) return;
  const data = await $fetch<{ sessions: WorkSession[] }>("/api/sessions", {
    params: { all: "true", from: filterFrom.value, to: filterTo.value },
  }).catch(() => ({ sessions: [] }));

  const dayMap = new Map<string, number>();
  const cur = new Date(filterFrom.value);
  const end = new Date(filterTo.value);
  while (cur <= end) {
    dayMap.set(cur.toLocaleDateString("sv"), 0);
    cur.setDate(cur.getDate() + 1);
  }
  for (const s of data.sessions) {
    dayMap.set(s.date, (dayMap.get(s.date) || 0) + sessionDurationSeconds(s));
  }
  chartData.value = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, seconds]) => ({ date, hours: seconds / 3600, seconds }));
}

// ── Edit modal ────────────────────────────────────────────────────────────────

const editSession = ref<WorkSession | null>(null);
const editSaving = ref(false);

function openEdit(session: WorkSession) {
  editSession.value = session;
}
function closeEdit() {
  editSession.value = null;
}

async function saveEdit(intervals: TimeInterval[], notes: string) {
  if (!editSession.value || editSaving.value) return;
  editSaving.value = true;
  try {
    const updated = await $fetch<WorkSession>(
      `/api/sessions/${editSession.value.id}`,
      {
        method: "PATCH",
        body: { intervals, notes },
      },
    );
    if (activeSession.value?.id === updated.id) activeSession.value = updated;
    const idx = sessions.value.findIndex((s) => s.id === updated.id);
    if (idx >= 0) sessions.value[idx] = updated;
    editSession.value = null;
    await loadChartData();
  } finally {
    editSaving.value = false;
  }
}

// ── Export ────────────────────────────────────────────────────────────────────

async function exportMD() {
  const params: Record<string, string> = { all: "true" };
  if (filterFrom.value) params.from = filterFrom.value;
  if (filterTo.value) params.to = filterTo.value;
  const data = await $fetch<{ sessions: WorkSession[] }>("/api/sessions", {
    params,
  }).catch(() => ({ sessions: [] }));

  useMDExport(data.sessions).download();
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

async function init() {
  const { from, to } = defaultRange();
  filterFrom.value = from;
  filterTo.value = to;
  await Promise.all([loadActiveSession(), loadSessions(), loadChartData()]);
}

const todayLabel = computed(() =>
  new Date().toLocaleDateString("cs-CZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }),
);
</script>

<template>
  <!-- Loading splash -->
  <div v-if="!appReady" class="min-h-screen flex items-center justify-center">
    <div
      class="font-mono text-zinc-800 text-3xl animate-pulse select-none tracking-widest"
    >
      00:00:00
    </div>
  </div>

  <!-- Dashboard -->
  <div v-else class="max-w-4xl mx-auto px-4 sm:px-6 pb-12 space-y-4">
    <AppHeader :today-label="todayLabel" @logout="logout" />

    <ClockCard
      :clock-display="clockDisplay"
      :active-session="activeSession"
      @start="startSession"
      @pause="doAction('pause')"
      @resume="doAction('resume')"
      @end="doAction('end')"
      @edit="activeSession && openEdit(activeSession)"
    />

    <StatsSection
      :filter-from="filterFrom"
      :filter-to="filterTo"
      :chart-data="chartData"
      @update:filter-from="filterFrom = $event"
      @update:filter-to="filterTo = $event"
      @apply="applyFilter"
      @reset="clearFilter"
    />

    <SessionsTable
      :sessions="sessions"
      :total-count="totalCount"
      :page="page"
      :total-pages="totalPages"
      :loading="tableLoading"
      @edit="openEdit"
      @page-change="goToPage"
      @export="exportMD"
    />
  </div>

  <EditModal
    v-if="editSession"
    :session="editSession"
    :saving="editSaving"
    @close="closeEdit"
    @save="saveEdit"
  />
</template>
