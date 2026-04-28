export const SETTINGS_STORAGE_KEY = "pyagenity-settings"
const LEGACY_BACKEND_URL_KEY = "backendUrl"
const LEGACY_AUTH_TOKEN_KEY = "authToken"
const PARSE_ERROR_MESSAGE = "Failed to parse saved settings:"
const VALID_CREDENTIALS = ["omit", "same-origin", "include"]

export const DEFAULT_SETTINGS = Object.freeze({
  name: "",
  backendUrl: "",
  authMode: "none",
  authToken: "",
  auth: null,
  credentials: "",
})

const readString = (value) => (typeof value === "string" ? value.trim() : "")

const normalizeHeaderAuth = (auth) => {
  const name = readString(auth?.name)
  const value = readString(auth?.value)
  const prefix = readString(auth?.prefix)

  if (!name || !value) {
    return null
  }

  return {
    type: "header",
    name,
    value,
    prefix: prefix || null,
  }
}

const normalizeBasicAuth = (auth) => {
  const username = readString(auth?.username)
  const password = readString(auth?.password)

  if (!username || !password) {
    return null
  }

  return {
    type: "basic",
    username,
    password,
  }
}

const normalizeBearerAuth = (authToken, auth) => {
  const token = readString(auth?.token || authToken)

  if (!token) {
    return null
  }

  return {
    type: "bearer",
    token,
  }
}

export const normalizeStoredAuth = (auth, authToken = "") => {
  if (auth?.type === "basic") {
    return normalizeBasicAuth(auth)
  }

  if (auth?.type === "header") {
    return normalizeHeaderAuth(auth)
  }

  return normalizeBearerAuth(authToken, auth)
}

export const inferAuthMode = (auth, authToken = "") => {
  if (auth?.type === "basic") {
    return "basic"
  }

  if (auth?.type === "header") {
    return "header"
  }

  if (auth?.type === "bearer" || readString(authToken)) {
    return "bearer"
  }

  return "none"
}

export const normalizeSettings = (settings = {}) => {
  const auth = normalizeStoredAuth(settings.auth, settings.authToken)
  const inferredMode = inferAuthMode(auth, settings.authToken)
  const requestedMode = readString(settings.authMode)
  const authMode =
    requestedMode &&
    ["none", "bearer", "basic", "header"].includes(requestedMode)
      ? requestedMode
      : inferredMode

  return {
    name: readString(settings.name),
    backendUrl: readString(settings.backendUrl),
    authMode,
    authToken:
      authMode === "bearer"
        ? auth?.token || readString(settings.authToken)
        : "",
    auth: authMode === "none" ? null : auth,
    credentials: VALID_CREDENTIALS.includes(settings.credentials)
      ? settings.credentials
      : "",
  }
}

const getLegacySettings = () => ({
  backendUrl: localStorage.getItem(LEGACY_BACKEND_URL_KEY) || "",
  authToken: localStorage.getItem(LEGACY_AUTH_TOKEN_KEY) || "",
})

/**
 * Check if backend URL is configured in settings
 * @returns {boolean} True if backend URL is set, false otherwise
 */
export const isBackendConfigured = () => {
  if (typeof window === "undefined") {
    return false
  }

  try {
    const currentSettings = getCurrentSettings()
    return Boolean(currentSettings.backendUrl)
  } catch (error) {
    console.error(PARSE_ERROR_MESSAGE, error)
  }

  return false
}

/**
 * Get current settings from localStorage
 * @returns {object} Settings object with backend and auth configuration
 */
export const getCurrentSettings = () => {
  if (typeof window === "undefined") {
    return { ...DEFAULT_SETTINGS }
  }

  try {
    const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (savedSettings) {
      return normalizeSettings(JSON.parse(savedSettings))
    }

    return normalizeSettings(getLegacySettings())
  } catch (error) {
    console.error(PARSE_ERROR_MESSAGE, error)
  }

  return { ...DEFAULT_SETTINGS }
}

export const saveCurrentSettings = (settings) => {
  if (typeof window === "undefined") {
    return normalizeSettings(settings)
  }

  const normalizedSettings = normalizeSettings(settings)
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalizedSettings))
  localStorage.setItem(LEGACY_BACKEND_URL_KEY, normalizedSettings.backendUrl)

  if (
    normalizedSettings.authMode === "bearer" &&
    normalizedSettings.authToken
  ) {
    localStorage.setItem(LEGACY_AUTH_TOKEN_KEY, normalizedSettings.authToken)
  } else {
    localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY)
  }

  return normalizedSettings
}

export const clearCurrentSettings = () => {
  if (typeof window === "undefined") {
    return
  }

  localStorage.removeItem(SETTINGS_STORAGE_KEY)
  localStorage.removeItem(LEGACY_BACKEND_URL_KEY)
  localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY)
}
