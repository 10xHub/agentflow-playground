// Parsing + summarising for the composer's per-run overrides (initial_state,
// config, recursion_limit). Raw text lives in the store; this turns it into
// something the client can take, and into a label for the composer chip.

/** @returns {{ value: object|null, error: string|null }} */
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

/** @returns {{ value: number|null, error: string|null }} */
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

/** Short label for the composer chip; null when nothing is overridden. */
export const summariseRunOptions = (runOptions) => {
  const options = runOptions || {}
  const parts = []
  const initial = parseJsonObject(options.initialState)
  const config = parseJsonObject(options.config)
  const limit = parseRecursionLimit(options.recursionLimit)

  if (options.initialState?.trim()) {
    parts.push(
      initial.error
        ? "initial_state invalid"
        : `initial_state ${Object.keys(initial.value).length}`
    )
  }
  if (options.config?.trim()) {
    parts.push(
      config.error
        ? "config invalid"
        : `config ${Object.keys(config.value).length}`
    )
  }
  if (String(options.recursionLimit ?? "").trim()) {
    parts.push(limit.error ? "recursion invalid" : `recursion ${limit.value}`)
  }
  return parts.length ? parts.join(" · ") : null
}
