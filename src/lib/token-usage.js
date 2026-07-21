/**
 * Token usage helpers.
 *
 * The backend attaches a `usages` object (TokenUsages) to assistant messages on
 * every response granularity. Fields arrive in snake_case; these helpers
 * normalize them into a flat camelCase shape, sum several together, and format
 * them for display in the per-run readout.
 */

const toCount = (value) => {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : 0
}

// Read the first defined value among possible key names (snake_case or camelCase).
const readToken = (raw, ...keys) => {
  for (const key of keys) {
    if (raw[key] !== undefined) {
      return toCount(raw[key])
    }
  }
  return 0
}

/**
 * Empty normalized token totals.
 */
export const emptyTokens = () => ({
  prompt: 0,
  completion: 0,
  total: 0,
  reasoning: 0,
  cacheRead: 0,
  cacheCreate: 0,
  image: 0,
  audio: 0,
})

/**
 * Normalize a raw `usages` object from the API into flat token counts.
 * Returns `null` when there is nothing usable, so callers can skip it.
 */
export const normalizeUsage = (raw) => {
  if (!raw || typeof raw !== "object") {
    return null
  }

  const prompt = readToken(raw, "prompt_tokens", "prompt")
  const completion = readToken(raw, "completion_tokens", "completion")
  const total = readToken(raw, "total_tokens", "total") || prompt + completion

  const usage = {
    prompt,
    completion,
    total,
    reasoning: readToken(raw, "reasoning_tokens", "reasoning"),
    cacheRead: readToken(raw, "cache_read_input_tokens", "cacheRead"),
    cacheCreate: readToken(raw, "cache_creation_input_tokens", "cacheCreate"),
    image: readToken(raw, "image_tokens", "image"),
    audio: readToken(raw, "audio_tokens", "audio"),
  }

  const hasAny = Object.values(usage).some((value) => value > 0)
  return hasAny ? usage : null
}

/**
 * Add two normalized token objects together.
 */
export const addTokens = (a = emptyTokens(), b = emptyTokens()) => ({
  prompt: a.prompt + b.prompt,
  completion: a.completion + b.completion,
  total: a.total + b.total,
  reasoning: a.reasoning + b.reasoning,
  cacheRead: a.cacheRead + b.cacheRead,
  cacheCreate: a.cacheCreate + b.cacheCreate,
  image: a.image + b.image,
  audio: a.audio + b.audio,
})

/**
 * Sum a list of normalized token objects.
 */
export const sumTokens = (list = []) =>
  list.reduce(
    (accumulator, item) => addTokens(accumulator, item),
    emptyTokens()
  )

/**
 * Whether a normalized token object carries any non-zero counts.
 */
export const hasTokens = (tokens) =>
  Boolean(tokens) && Object.values(tokens).some((value) => value > 0)

/**
 * Format a token count compactly (e.g. 1234 -> "1,234", 12000 -> "12K").
 */
export const formatTokenCount = (value) => {
  const number = toCount(value)

  if (number >= 10_000) {
    return `${Math.round(number / 1000).toLocaleString()}K`
  }

  return number.toLocaleString()
}

/**
 * Format a run duration (ms) as a short human string.
 */
export const formatDuration = (durationMs) => {
  if (durationMs === null || durationMs === undefined || durationMs < 0) {
    return "--"
  }

  if (durationMs < 1000) {
    return `${Math.round(durationMs)}ms`
  }

  return `${(durationMs / 1000).toFixed(durationMs < 10_000 ? 2 : 1)}s`
}
