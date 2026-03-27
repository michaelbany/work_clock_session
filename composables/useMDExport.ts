import type { ChartDay, WorkSession } from "~/composables/types";

export default function useMDExport(
  sessions: WorkSession[],
  chartData: ChartDay[],
) {
  const {
    sessionStartTime,
    sessionEndTime,
    sessionDurationSeconds,
    fmtSeconds,
  } = useSessionUtils();

  const chartStats = computed(() => {
    const working = chartData.filter((d) => d.hours > 0);
    if (!working.length) return null;
    const hrs = working.map((d) => d.hours);
    return {
      avg: hrs.reduce((a, b) => a + b, 0) / hrs.length,
      min: Math.min(...hrs),
      max: Math.max(...hrs),
      workingDays: working.length,
    };
  });

  const rows = sessions.map(
    (s) =>
      `| ${s.date} | ${sessionStartTime(s)} | ${sessionEndTime(s)} | ${fmtSeconds(sessionDurationSeconds(s))} | ${s.status} | ${s.notes || "—"} |`,
  );

  const md = [
    `# Work Log — ${new Date().toISOString().split("T")[0]}`,
    "",
    "**Average**: " +
      (chartStats.value
        ? fmtSeconds(Math.round(chartStats.value.avg * 3600))
        : "N/A"),
    "**Min**: " +
      (chartStats.value
        ? fmtSeconds(Math.round(chartStats.value.min * 3600))
        : "N/A"),
    "**Max**: " +
      (chartStats.value
        ? fmtSeconds(Math.round(chartStats.value.max * 3600))
        : "N/A"),
    "**Working Days**: " +
      (chartStats.value ? chartStats.value.workingDays : "N/A"),
    "",
    "| Datum | Začátek | Konec | Celkem | Status | Poznámky |",
    "|-------|---------|-------|--------|--------|----------|",
    ...rows,
  ].join("\n");

  function download() {
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), {
      href: url,
      download: `work-log-${new Date().toISOString().split("T")[0]}.md`,
    }).click();
    URL.revokeObjectURL(url);
  }

  return { md, download };
}
