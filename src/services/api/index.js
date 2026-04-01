import axios from "axios"

const instance = axios.create({
  timeout: 600000, // 10 mins why for invoke
})

// Attach baseURL and Authorization header on each request so the instance
// can be imported and used directly without calling a factory.
instance.interceptors.request.use(
  (request) => {
    try {
      const backendUrl = localStorage.getItem("backendUrl")
      const authToken = localStorage.getItem("authToken")

      if (backendUrl == null) {
        throw new Error("Backend URL is not set")
      }

      const normalizedBaseURL = validateAndNormalizeUrl(backendUrl)
      // Only set if different to avoid unnecessary writes
      if (instance.defaults.baseURL !== normalizedBaseURL) {
        instance.defaults.baseURL = normalizedBaseURL
      }
      // Also set on the request in case some code reads request.baseURL
      request.baseURL = normalizedBaseURL

      if (authToken) {
        request.headers = request.headers || {}
        request.headers.Authorization = `${authToken}`
      }
    } catch (error) {
      // If URL validation fails, propagate error to caller
      return Promise.reject(error)
    }

    return request
  },
  (error) => {
    return Promise.reject(error)
  }
)

instance.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    return Promise.reject(error)
  }
)

/**
 * Validates and normalizes a backend URL
 * @param {string} url - The backend URL to validate
 * @returns {string} - Normalized URL
 * @throws {Error} - If URL is invalid
 */
const validateAndNormalizeUrl = (url) => {
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
    // Using URL constructor for validation
    // eslint-disable-next-line no-undef
    new URL(normalizedUrl)
  } catch {
    throw new Error("Invalid backend URL format")
  }

  return normalizedUrl
}

// Default export is the axios instance so callers can `import api from './index'`
export default instance
