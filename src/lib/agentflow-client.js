import { AgentFlowClient } from "@10xscale/agentflow-client"

/**
 * Get or create an AgentFlowClient instance from localStorage settings
 * @returns {AgentFlowClient} - Configured client instance
 * @throws {Error} - If backend URL is not set
 */
export const getAgentFlowClient = () => {
  const backendUrl = localStorage.getItem("backendUrl")
  const authToken = localStorage.getItem("authToken")

  if (!backendUrl) {
    throw new Error("Backend URL is not set")
  }

  // Normalize URL (remove trailing slash)
  const normalizedUrl = backendUrl.trim().replace(/\/$/, "")

  return new AgentFlowClient({
    baseUrl: normalizedUrl,
    authToken: authToken || undefined,
    timeout: 600000, // 10 minutes (same as axios instance)
    debug: false,
  })
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
