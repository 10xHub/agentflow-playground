import { beforeEach, describe, expect, it, vi } from "vitest"

import { getCurrentSettings, isBackendConfigured } from "@/lib/settings-utils"

const SETTINGS_STORAGE_KEY = "pyagenity-settings"

describe("settings-utils", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it("returns false when no backend URL is saved", () => {
    expect(isBackendConfigured()).toBe(false)
  })

  it("detects a configured backend URL", () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ backendUrl: " https://example.com " })
    )

    expect(isBackendConfigured()).toBe(true)
  })

  it("returns default settings when nothing is saved", () => {
    expect(getCurrentSettings()).toEqual({
      name: "",
      backendUrl: "",
      authToken: "",
    })
  })

  it("returns saved settings with empty fallbacks", () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        name: "Workspace",
        backendUrl: "https://example.com",
      })
    )

    expect(getCurrentSettings()).toEqual({
      name: "Workspace",
      backendUrl: "https://example.com",
      authToken: "",
    })
  })

  it("handles parse failures safely", () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined)

    localStorage.setItem(SETTINGS_STORAGE_KEY, "not-json")

    expect(isBackendConfigured()).toBe(false)
    expect(getCurrentSettings()).toEqual({
      name: "",
      backendUrl: "",
      authToken: "",
    })
    expect(consoleErrorSpy).toHaveBeenCalledTimes(2)
  })
})
