// Format detection for agent output. Markdown is the fallback so a message that
// merely *mentions* a tag stays readable; only output that is structurally a
// document gets handed to the sandboxed frame.

const DOC_START = /^<!doctype\s+html|^<html[\s>]/i
const STRUCTURAL =
  /<(div|section|main|article|header|footer|nav|table|ul|ol|form|svg|style|script|h[1-6])[\s>]/gi

/** @returns {"html" | "markdown"} */
export const detectFormat = (text) => {
  const t = (text || "").trim()
  if (!t) return "markdown"
  if (DOC_START.test(t)) return "html"
  if (!t.startsWith("<") || !t.endsWith(">")) return "markdown"

  STRUCTURAL.lastIndex = 0
  let hits = 0
  while (STRUCTURAL.exec(t)) {
    if (++hits >= 2) return "html"
  }
  return "markdown"
}

/** True for fenced-code languages we render as a live preview. */
export const isPreviewableLang = (lang) =>
  lang === "html" || lang === "svg" || lang === "xhtml"

/** Pretty-print JSON when it parses; otherwise hand back the original string. */
export const formatJson = (text) => {
  const t = (text || "").trim()
  if (!t.startsWith("{") && !t.startsWith("[")) return null
  try {
    return JSON.stringify(JSON.parse(t), null, 2)
  } catch {
    return null
  }
}
