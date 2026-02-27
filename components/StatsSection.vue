<script setup lang="ts">
import type { ChartDay } from '~/composables/types'

const props = defineProps<{
  filterFrom: string
  filterTo: string
  chartData: ChartDay[]
}>()

const emit = defineEmits<{
  'update:filterFrom': [v: string]
  'update:filterTo': [v: string]
  apply: []
  reset: []
}>()

const { fmtSeconds } = useSessionUtils()

// ── Chart computation ─────────────────────────────────────────────────────────

const chartStats = computed(() => {
  const working = props.chartData.filter((d) => d.hours > 0)
  if (!working.length) return null
  const hrs = working.map((d) => d.hours)
  return {
    avg: hrs.reduce((a, b) => a + b, 0) / hrs.length,
    min: Math.min(...hrs),
    max: Math.max(...hrs),
    workingDays: working.length,
  }
})

const svgChart = computed(() => {
  const data = props.chartData
  if (!data.length) return null

  const W = 800, H = 140
  const pL = 36, pR = 10, pT = 12, pB = 28
  const cW = W - pL - pR
  const cH = H - pT - pB
  const maxHours = Math.max(12, ...data.map((d) => d.hours))
  const bW = cW / data.length
  const refY = pT + cH * (1 - 8 / maxHours)

  const bars = data.map((d, i) => {
    const clampedH = Math.min(d.hours, maxHours)
    const bH = (clampedH / maxHours) * cH
    return {
      x: pL + i * bW + bW * 0.1,
      y: pT + cH - bH,
      w: Math.max(bW * 0.8, 1),
      h: bH,
      color: d.hours === 0 ? '#e4e4e7' : d.hours >= 8 ? '#10b981' : d.hours >= 5 ? '#f59e0b' : '#ef4444',
      label: data.length <= 31 ? d.date.slice(5) : (i % Math.ceil(data.length / 20) === 0 ? d.date.slice(5) : ''),
      title: `${d.date}: ${fmtSeconds(d.seconds)}`,
    }
  })

  const yTicks = [0, 2, 4, 6, 8, 10, 12].filter((t) => t <= maxHours)

  return { W, H, pL, pR, pT, pB, cW, cH, bars, refY, yTicks, maxHours }
})
</script>

<template>
  <div class="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">

    <!-- Filter bar -->
    <div class="px-6 py-4 border-b border-zinc-100 flex flex-wrap items-end gap-3">
      <div class="space-y-1.5">
        <label class="block text-xs font-medium text-zinc-500 uppercase tracking-wider">Od</label>
        <input
          type="date"
          :value="filterFrom"
          @input="emit('update:filterFrom', ($event.target as HTMLInputElement).value)"
          class="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-900 focus:outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 transition-all cursor-pointer"
        />
      </div>
      <div class="space-y-1.5">
        <label class="block text-xs font-medium text-zinc-500 uppercase tracking-wider">Do</label>
        <input
          type="date"
          :value="filterTo"
          @input="emit('update:filterTo', ($event.target as HTMLInputElement).value)"
          class="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-900 focus:outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 transition-all cursor-pointer"
        />
      </div>
      <button
        @click="emit('apply')"
        class="px-5 py-2 bg-zinc-900 hover:bg-zinc-700 active:bg-zinc-800 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
      >
        Zobrazit
      </button>
      <button
        @click="emit('reset')"
        class="px-5 py-2 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 hover:text-zinc-900 rounded-lg text-sm font-medium transition-colors cursor-pointer"
      >
        Tento měsíc
      </button>
    </div>

    <!-- Stats + chart -->
    <div class="px-6 py-5 space-y-5">

      <!-- KPI stats row -->
      <div v-if="chartStats" class="flex flex-wrap items-end gap-x-8 gap-y-4">
        <div class="flex flex-col gap-1">
          <span class="text-xs font-medium text-zinc-500 uppercase tracking-wider">Průměr</span>
          <span class="font-mono font-semibold text-zinc-900 text-xl leading-none">{{ fmtSeconds(Math.round(chartStats.avg * 3600)) }}</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-xs font-medium text-zinc-500 uppercase tracking-wider">Min</span>
          <span class="font-mono font-semibold text-zinc-700 text-xl leading-none">{{ fmtSeconds(Math.round(chartStats.min * 3600)) }}</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-xs font-medium text-zinc-500 uppercase tracking-wider">Max</span>
          <span class="font-mono font-semibold text-zinc-700 text-xl leading-none">{{ fmtSeconds(Math.round(chartStats.max * 3600)) }}</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-xs font-medium text-zinc-500 uppercase tracking-wider">Pracovní dny</span>
          <span class="font-semibold text-zinc-700 text-xl leading-none">{{ chartStats.workingDays }}</span>
        </div>
        <!-- Legend -->
        <div class="flex items-center gap-4 ml-auto text-xs text-zinc-500 pb-0.5">
          <span class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-sm inline-block bg-emerald-500"></span>≥ 8h
          </span>
          <span class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-sm inline-block bg-amber-400"></span>5–8h
          </span>
          <span class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-sm inline-block bg-red-400"></span>&lt; 5h
          </span>
        </div>
      </div>

      <!-- SVG bar chart -->
      <svg
        v-if="svgChart"
        :viewBox="`0 0 ${svgChart.W} ${svgChart.H}`"
        class="w-full"
        :style="`height: ${svgChart.H + 8}px`"
      >
        <!-- Grid lines + Y labels -->
        <g v-for="tick in svgChart.yTicks" :key="tick">
          <line
            :x1="svgChart.pL"
            :x2="svgChart.W - svgChart.pR"
            :y1="svgChart.pT + svgChart.cH * (1 - tick / svgChart.maxHours)"
            :y2="svgChart.pT + svgChart.cH * (1 - tick / svgChart.maxHours)"
            stroke="#e4e4e7"
            stroke-width="1"
          />
          <text
            :x="svgChart.pL - 5"
            :y="svgChart.pT + svgChart.cH * (1 - tick / svgChart.maxHours) + 4"
            text-anchor="end"
            font-size="9"
            fill="#a1a1aa"
          >{{ tick }}h</text>
        </g>

        <!-- 8h reference line -->
        <line
          :x1="svgChart.pL"
          :x2="svgChart.W - svgChart.pR"
          :y1="svgChart.refY"
          :y2="svgChart.refY"
          stroke="#ef4444"
          stroke-width="1"
          stroke-dasharray="4 3"
          opacity="0.4"
        />

        <!-- Bars -->
        <g v-for="bar in svgChart.bars" :key="bar.title">
          <rect
            :x="bar.x"
            :y="bar.y"
            :width="bar.w"
            :height="Math.max(bar.h, 2)"
            :fill="bar.color"
            rx="3"
          >
            <title>{{ bar.title }}</title>
          </rect>
          <text
            v-if="bar.label"
            :x="bar.x + bar.w / 2"
            :y="svgChart.pT + svgChart.cH + 13"
            text-anchor="middle"
            font-size="8"
            fill="#a1a1aa"
          >{{ bar.label }}</text>
        </g>
      </svg>

      <!-- No data state -->
      <div v-else class="py-10 text-center text-sm text-zinc-400">
        V tomto období nejsou žádné záznamy
      </div>

    </div>
  </div>
</template>
