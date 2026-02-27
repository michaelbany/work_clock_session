export type TimeInterval = { start: string; end: string | null }

export type WorkSession = {
  id: string
  date: string
  intervals: TimeInterval[]
  status: 'running' | 'paused' | 'ended'
  notes: string | null
  createdAt: string
}

export type ChartDay = { date: string; hours: number; seconds: number }

export type ChartBar = {
  x: number; y: number; w: number; h: number
  color: string; label: string; title: string
}

export type SvgChart = {
  W: number; H: number
  pL: number; pR: number; pT: number; pB: number
  cW: number; cH: number
  bars: ChartBar[]
  refY: number
  yTicks: number[]
  maxHours: number
}

export type ChartStats = {
  avg: number; min: number; max: number; workingDays: number
} | null
