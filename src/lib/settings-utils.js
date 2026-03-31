const SETTINGS_STORAGE_KEY = "pyagenity-settings"
const PARSE_ERROR_MESSAGE = "Failed to parse saved settings:"

/**
 * Check if backend URL is configured in settings
 * @returns {boolean} True if backend URL is set, false otherwise
 */
export const isBackendConfigured = () => {
  if (typeof window === "undefined") {
    return false
  }

  try {
    const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings)
      return Boolean(parsed.backendUrl && parsed.backendUrl.trim() !== "")
    }
  } catch (error) {
    console.error(PARSE_ERROR_MESSAGE, error)
  }

  return false
}

/**
 * Get current settings from localStorage
 * @returns {object} Settings object with name, backendUrl, and authToken
 */
export const getCurrentSettings = () => {
  if (typeof window === "undefined") {
    return { name: "", backendUrl: "", authToken: "" }
  }

  try {
    const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings)
      return {
        name: parsed.name || "",
        backendUrl: parsed.backendUrl || "",
        authToken: parsed.authToken || "",
      }
    }
  } catch (error) {
    console.error(PARSE_ERROR_MESSAGE, error)
  }

  return { name: "", backendUrl: "", authToken: "" }
}
