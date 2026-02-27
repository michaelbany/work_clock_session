import type { WorkSession } from '~/composables/types'

export default function useMDExport(sessions: WorkSession[]) {
  const {
    sessionStartTime,
    sessionEndTime,
    sessionDurationSeconds,
    fmtSeconds,
  } = useSessionUtils();

  const rows = sessions.map(
    (s) =>
      `| ${s.date} | ${sessionStartTime(s)} | ${sessionEndTime(s)} | ${fmtSeconds(sessionDurationSeconds(s))} | ${s.status} | ${s.notes || "—"} |`,
  );

  const md = [
    `# Work Log — ${new Date().toISOString().split("T")[0]}`,
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
