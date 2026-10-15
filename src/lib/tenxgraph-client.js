import { TenxGraphClient } from "10xgraph-client"

import { getDemoClient } from "@/lib/demo/demo-client"
import { activeScenario } from "@/lib/demo/demo-mode"
import { getLoadedFixture } from "@/lib/demo/fixtures"
import { getCurrentSettings } from "@/lib/settings-utils"

let tenxGraphClientInstance = null
let tenxGraphClientConfigKey = null

const resolveAuthConfig = (auth, authToken) => {
  if (auth?.type === "basic") {
    return {
      auth: { type: "basic", username: auth.username, password: auth.password },
    }
  }
  if (auth?.type === "header") {
    return {
      auth: {
        type: "header",
        name: auth.name,
        value: auth.value,
        prefix: auth.prefix,
      },
    }
  }
  if (auth?.type === "bearer") {
    return { auth: { type: "bearer", token: auth.token } }
  }
  if (authToken) {
    return { authToken }
  }
  return {}
}

const headersToObject = (headers) => {
  if (!Array.isArray(headers) || headers.length === 0) {
    return null
  }

  return headers.reduce((accumulator, { name, value }) => {
    accumulator[name] = value
    return accumulator
  }, {})
}

const buildClientConfig = () => {
  const settings = getCurrentSettings()
  const { backendUrl, auth, authToken, credentials, headers } = settings

  if (!backendUrl) {
    throw new Error("Backend URL is not set")
  }

  // Normalize URL (remove trailing slash)
  const normalizedUrl = backendUrl.trim().replace(/\/$/, "")

  const config = {
    baseUrl: normalizedUrl,
    timeout: 600000, // 10 minutes for long-running agent calls
    debug: false,
    ...resolveAuthConfig(auth, authToken),
  }

  if (credentials) {
    config.credentials = credentials
  }

  const headerObject = headersToObject(headers)
  if (headerObject) {
    config.headers = headerObject
  }

  return config
}

/**
 * Get or create an TenxGraphClient instance from localStorage settings
 * @returns {TenxGraphClient} - Configured client instance
 * @throws {Error} - If backend URL is not set
 */
export const getTenxGraphClient = () => {
  // Demo mode answers from recorded fixtures and never builds a real client.
  const scenario = activeScenario()
  if (scenario) {
    const fixture = getLoadedFixture(scenario)
    if (!fixture) throw new Error("Demo data is still loading")
    return getDemoClient(scenario, fixture)
  }

  const config = buildClientConfig()
  const configKey = JSON.stringify(config)

  if (tenxGraphClientInstance && tenxGraphClientConfigKey === configKey) {
    return tenxGraphClientInstance
  }

  tenxGraphClientInstance = new TenxGraphClient(config)
  tenxGraphClientConfigKey = configKey

  return tenxGraphClientInstance
}

/**
 * Reset the cached TenxGraphClient instance.
 * Useful for tests and when the environment is reinitialized.
 */
export const resetTenxGraphClient = () => {
  tenxGraphClientInstance = null
  tenxGraphClientConfigKey = null
}

/**
 * Validate and normalize a backend URL
 * @param {string} url - The backend URL to validate
 * @returns {string} - Normalized URL
 * @throws {Error} - If URL is invalid
 */
export const validateAndNormalizeUrl = (url) => {
  if (!url || typeof url !== "string") {
    throw new Error("Backend URL is required")
  }

  let normalizedUrl = url.trim()

  // Add protocol if missing
  if (
    !normalizedUrl.startsWith("http://") &&
    !normalizedUrl.startsWith("https://")
  ) {
    throw new Error("Backend URL must start with http:// or https://")
  }

  // Remove trailing slash
  normalizedUrl = normalizedUrl.replace(/\/$/, "")

  // Validate URL format
  try {
    new URL(normalizedUrl)
  } catch {
    throw new Error("Invalid backend URL format")
  }

  return normalizedUrl
}
