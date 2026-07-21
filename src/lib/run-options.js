// Parsing + summarising for the composer's per-run overrides (initial_state,
// config, recursion_limit). Raw text lives in the store; this turns it into
// something the client can take, and into a label for the composer chip.

/** @returns {{ value: object|null, error: string|null }} The parsed object, or the reason it could not be parsed. */
export const parseJsonObject = (raw) => {
  const t = (raw || "").trim()
  if (!t) return { value: null, error: null }
  let parsed
  try {
    parsed = JSON.parse(t)
  } catch (e) {
    return { value: null, error: e.message }
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { value: null, error: "must be a JSON object" }
  }
  return { value: parsed, error: null }
}

/** @returns {{ value: number|null, error: string|null }} The parsed limit, or the reason it is invalid. */
export const parseRecursionLimit = (raw) => {
  const t = String(raw ?? "").trim()
  if (!t) return { value: null, error: null }
  const n = Number(t)
  if (!Number.isInteger(n) || n < 1) {
    return { value: null, error: "must be a positive integer" }
  }
  return { value: n, error: null }
}

/**
 * Resolve the stored raw text into the options the client expects.
 * `threadId` binds the run to its thread unless config deliberately overrides it.
 */
export const resolveRunOptions = (runOptions, threadId) => {
  const options = runOptions || {}
  const initial = parseJsonObject(options.initialState)
  const config = parseJsonObject(options.config)
  const limit = parseRecursionLimit(options.recursionLimit)

  const errors = {}
  if (initial.error) errors.initialState = initial.error
  if (config.error) errors.config = config.error
  if (limit.error) errors.recursionLimit = limit.error

  return {
    errors,
    valid: Object.keys(errors).length === 0,
    initial_state: initial.value || undefined,
    config: {
      ...(threadId ? { thread_id: threadId } : {}),
      ...(config.value || {}),
    },
    recursion_limit: limit.value || undefined,
  }
}

// One chip fragment for a JSON override: nothing when the field is blank, the
// key count when it parsed, "invalid" when it didn't.
const describeJson = (raw, parsed, label) => {
  if (!raw?.trim()) return null
  return parsed.error
    ? `${label} invalid`
    : `${label} ${Object.keys(parsed.value).length}`
}

const describeRecursion = (raw, limit) => {
  if (!String(raw ?? "").trim()) return null
  return limit.error ? "recursion invalid" : `recursion ${limit.value}`
}

/** Short label for the composer chip; null when nothing is overridden. */
export const summariseRunOptions = (runOptions) => {
  const options = runOptions || {}
  const parts = [
    describeJson(
      options.initialState,
      parseJsonObject(options.initialState),
      "initial_state"
    ),
    describeJson(options.config, parseJsonObject(options.config), "config"),
    describeRecursion(
      options.recursionLimit,
      parseRecursionLimit(options.recursionLimit)
    ),
  ].filter(Boolean)
  return parts.length ? parts.join(" · ") : null
}
