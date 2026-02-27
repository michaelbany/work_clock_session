import type { WorkSession } from '~/composables/types'

export function useSessionUtils() {
  function fmtSeconds(s: number): string {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  function fmtTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
  }

  function sessionDurationSeconds(s: WorkSession): number {
    let ms = 0
    for (const iv of s.intervals) {
      const start = new Date(iv.start).getTime()
      const end = iv.end ? new Date(iv.end).getTime() : 0
      if (end > start) ms += end - start
    }
    return Math.floor(ms / 1000)
  }

  function sessionStartTime(s: WorkSession): string {
    return s.intervals.length ? fmtTime(s.intervals[0].start) : '—'
  }

  function sessionEndTime(s: WorkSession): string {
    const last = s.intervals[s.intervals.length - 1]
    return last?.end ? fmtTime(last.end) : '—'
  }

  return { fmtSeconds, fmtTime, sessionDurationSeconds, sessionStartTime, sessionEndTime }
}
