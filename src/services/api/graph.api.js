import api from "./index"

export const invokeGraph = async (body) => {
  // body should conform to GraphInputSchema (see openapi.json)
  return await api.post("/v1/graph/invoke", body)
}

/**
 * Stream graph execution using Fetch to handle streaming response
 * Note: Axios in browsers does not currently support streaming responses well
 * @param {object} body GraphInputSchema-compatible payload
 * @param {*} [signal] optional abort signal to cancel streaming
 * @yields {object} parsed JSON objects per line/chunk
 */
export async function* streamGraph(body, signal) {
  const baseURL = resolveBaseUrl()
  const auth = resolveAuthHeader()
  const headers = auth ? { Authorization: auth } : {}

  const response = await globalThis.fetch(`${baseURL}/v1/graph/stream`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(`Stream request failed: ${response.status} ${text}`)
  }
  if (!response.body) {
    const json = await response.json()
    yield json
    return
  }

  for await (const chunk of readNdjsonStream(response)) yield chunk
}

/** Resolve backend base URL from axios defaults or localStorage */
function resolveBaseUrl() {
  const { baseURL } = api.defaults
  if (baseURL) return baseURL
  const backendUrl = localStorage.getItem("backendUrl")
  if (!backendUrl) throw new Error("Backend URL is not set")
  return backendUrl.replace(/\/$/, "")
}

/** Resolve Authorization header value (e.g., "Bearer <token>") */
function resolveAuthHeader() {
  const auth = api.defaults.headers?.common?.Authorization
  if (auth) return auth
  const token = localStorage.getItem("authToken")
  return token ? `Bearer ${token}` : undefined
}

/**
 * Read an NDJSON/JSON Lines streaming response and yield parsed JSON per line.
 * @param {*} response The fetch Response with a readable body
 * @yields {*} Parsed JSON object per line
 */
async function* readNdjsonStream(response) {
  const reader = response.body.getReader()
  const decoder = new globalThis.TextDecoder()
  let buffer = ""
  try {
    // Read stream chunks and split by newline
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() || ""
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        try {
          yield JSON.parse(trimmed)
        } catch {
          // ignore non-JSON lines
        }
      }
    }
    const rest = buffer.trim()
    if (rest) {
      try {
        yield JSON.parse(rest)
      } catch {
        // ignore
      }
    }
  } finally {
    reader.releaseLock()
  }
}

export default {
  invokeGraph,
  streamGraph,
}
