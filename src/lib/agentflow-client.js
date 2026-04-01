import { AgentFlowClient } from "@10xscale/agentflow-client"

let agentFlowClientInstance = null
let agentFlowClientConfigKey = null

const buildClientConfig = () => {
  const backendUrl = localStorage.getItem("backendUrl")
  const authToken = localStorage.getItem("authToken")

  if (!backendUrl) {
    throw new Error("Backend URL is not set")
  }

  // Normalize URL (remove trailing slash)
  const normalizedUrl = backendUrl.trim().replace(/\/$/, "")

  return {
    baseUrl: normalizedUrl,
    authToken: authToken || undefined,
    timeout: 600000, // 10 minutes (same as axios instance)
    debug: false,
  }
}

/**
 * Get or create an AgentFlowClient instance from localStorage settings
 * @returns {AgentFlowClient} - Configured client instance
 * @throws {Error} - If backend URL is not set
 */
export const getAgentFlowClient = () => {
  const config = buildClientConfig()
  const configKey = JSON.stringify(config)

  if (agentFlowClientInstance && agentFlowClientConfigKey === configKey) {
    return agentFlowClientInstance
  }

  agentFlowClientInstance = new AgentFlowClient(config)
  agentFlowClientConfigKey = configKey

  return agentFlowClientInstance
}

/**
 * Reset the cached AgentFlowClient instance.
 * Useful for tests and when the environment is reinitialized.
 */
export const resetAgentFlowClient = () => {
  agentFlowClientInstance = null
  agentFlowClientConfigKey = null
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
    // eslint-disable-next-line no-undef
    new URL(normalizedUrl)
  } catch {
    throw new Error("Invalid backend URL format")
  }

  return normalizedUrl
}
