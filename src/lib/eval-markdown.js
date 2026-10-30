// Markdown summary of one open eval run, built from the drilldown view that
// eval-report.js produces. Pure; the first "Generate report" format.

const cell = (text) =>
  String(text ?? "")
    .replaceAll("|", "\\|")
    .replaceAll("\n", " ")

const statusWord = (status) => status.toUpperCase()

const failureReasons = (c) => {
  const reasons = []
  if (c.error) reasons.push(`Error: ${c.error}`)
  for (const row of c.rubric || []) {
    if (row.kind !== "criterion" || row.passed) continue
    const why = row.error || row.details?.reason || "below threshold"
    const limit = row.threshold == null ? "" : ` (threshold ${row.threshold})`
    reasons.push(`${row.key}: scored ${row.value}${limit}, ${why}`)
  }
  return reasons
}

const failureLines = (c) => {
  const lines = [`### ${c.name} (${c.status})`, ""]
  lines.push(`- Input: ${c.input}`)
  if (c.expected && c.expected !== "-") lines.push(`- Expected: ${c.expected}`)
  lines.push(`- Actual: ${c.actual}`)
  for (const reason of failureReasons(c)) lines.push(`- ${reason}`)
  lines.push("")
  return lines
}

/**
 * Markdown summary of a run: pass rate, per-case results, failures with reasons.
 */
export const buildEvalMarkdown = (detail) => {
  const { counts } = detail
  const lines = [
    `# ${detail.title}`,
    "",
    detail.sub,
    "",
    `Pass rate: ${detail.rate.toFixed(1)}% (threshold ${detail.threshold}%), ${statusWord(detail.status)}`,
    "",
    `Cases: ${counts.total}, passed ${counts.passed}, failed ${counts.failed}, errored ${counts.errored}`,
    "",
    "## Results",
    "",
    "| Case | Status | Score | Latency | Tokens |",
    "| --- | --- | --- | --- | --- |",
    ...detail.cases.map(
      (c) =>
        `| ${cell(c.name)} | ${statusWord(c.status)} | ${c.score.toFixed(2)} | ${cell(c.lat)} | ${cell(c.cost)} |`
    ),
    "",
  ]
  const failed = detail.cases.filter((c) => c.status !== "pass")
  lines.push("## Failures", "")
  if (failed.length === 0) lines.push("No failures.", "")
  for (const c of failed) lines.push(...failureLines(c))
  return `${lines.join("\n").trimEnd()}\n`
}

/**
 * File name for the downloaded report, safe for most file systems.
 */
export const evalMarkdownName = (detail) =>
  `${detail.title
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "")}.md`
