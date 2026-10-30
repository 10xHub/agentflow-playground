// Chrome's Local Network Access (LNA) blocks a public HTTPS page from calling
// loopback or private addresses until the visitor allows a prompt. These helpers
// spot those URLs, trigger the prompt early and read its state.

const hostnameOf = (url) => {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return ""
  }
}

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/

const isPrivateV4 = ([a, b]) =>
  a === 127 ||
  a === 10 ||
  (a === 192 && b === 168) ||
  (a === 172 && b >= 16 && b <= 31) ||
  (a === 169 && b === 254)

const isLocalName = (host) =>
  host === "localhost" ||
  host.endsWith(".localhost") ||
  ["::1", "::", "0.0.0.0"].includes(host)

/** True when a bare hostname is loopback, private or link-local. */
const isLocalHost = (rawHost) => {
  const host = rawHost.replace(/^\[|\]$/g, "")
  if (!host) return false
  if (isLocalName(host)) return true
  const v4 = IPV4.exec(host)
  if (v4) return isPrivateV4([Number(v4[1]), Number(v4[2])])
  // IPv6 link-local (fe80::/10) and unique local (fc00::/7).
  return /^fe[89ab][0-9a-f]:/.test(host) || /^f[cd][0-9a-f]{2}:/.test(host)
}

/** True when the URL points at this machine or a private network. */
export const isLocalNetworkUrl = (url) => isLocalHost(hostnameOf(url))

/** True when this page is itself served from a local address (no LNA prompt). */
export const isLocalPage = () =>
  typeof window === "undefined" || isLocalHost(window.location.hostname)

/** True for a fetch that rejected without an HTTP response (not a timeout). */
export const isNetworkFailure = (error) => {
  if (!error || error.name === "AbortError") return false
  const message = error.message || String(error)
  return (
    error instanceof TypeError ||
    /failed to fetch|networkerror|load failed/i.test(message)
  )
}

const LEGACY_NAME = "local-network-access"

// Permission names from the Local Network Access spec (WICG): "loopback-network"
// and "local-network" are current, LEGACY_NAME is the older alias.
const permissionNames = (url) =>
  hostnameOf(url) &&
  /^(localhost|.*\.localhost|127\.|\[?::1\]?$)/.test(hostnameOf(url))
    ? ["loopback-network", LEGACY_NAME]
    : ["local-network", LEGACY_NAME]

/**
 * The permission state ("granted" | "denied" | "prompt") for a local URL, or
 * null when the browser cannot tell. An unknown name throws, so each is tried.
 */
export const queryLocalNetworkPermission = async (url) => {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) {
    return null
  }
  for (const name of permissionNames(url)) {
    try {
      const result = await navigator.permissions.query({ name })
      return result.state
    } catch {
      // Name not supported in this browser; try the next one.
    }
  }
  return null
}

const PROBE_TIMEOUT_MS = 15_000

/**
 * One bare request to `<base>/ping` so Chrome shows its permission prompt now.
 * No credentials, no auth header. Resolves "ok", "blocked" (network failure) or
 * "ignored" (timeout or other); it never throws.
 */
// A loop, not /\/+$/: that regex is quadratic on input with many slashes (CodeQL js/polynomial-redos).
const trimTrailingSlashes = (value) => {
  let end = value.length
  while (end > 0 && value.charCodeAt(end - 1) === 47) end--
  return value.slice(0, end)
}

export const probeLocalNetwork = async (baseUrl) => {
  try {
    await fetch(`${trimTrailingSlashes(baseUrl)}/ping`, {
      method: "GET",
      credentials: "omit",
      cache: "no-store",
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    })
    return "ok"
  } catch (error) {
    return isNetworkFailure(error) ? "blocked" : "ignored"
  }
}
