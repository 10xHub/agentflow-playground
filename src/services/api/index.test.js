import { beforeEach, describe, expect, it, vi } from "vitest"

const { axiosInstance, requestUseMock, responseUseMock, createMock } =
  vi.hoisted(() => {
    const requestUseMock = vi.fn()
    const responseUseMock = vi.fn()
    const axiosInstance = {
      defaults: {},
      interceptors: {
        request: { use: requestUseMock },
        response: { use: responseUseMock },
      },
    }

    return {
      axiosInstance,
      requestUseMock,
      responseUseMock,
      createMock: vi.fn(() => axiosInstance),
    }
  })

vi.mock("axios", () => ({
  default: {
    create: createMock,
  },
}))

import api from "@/services/api"

describe("services/api index", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("creates the axios instance with the configured timeout", () => {
    expect(api).toBe(axiosInstance)
    expect(createMock).toHaveBeenCalledWith({ timeout: 600000 })
    expect(requestUseMock).toHaveBeenCalledOnce()
    expect(responseUseMock).toHaveBeenCalledOnce()
  })

  it("normalizes request settings and attaches authorization headers", async () => {
    localStorage.setItem("backendUrl", " https://example.com/ ")
    localStorage.setItem("authToken", "secret")

    const requestHandler = requestUseMock.mock.calls[0][0]
    const request = { headers: {} }
    const result = await requestHandler(request)

    expect(result.baseURL).toBe("https://example.com")
    expect(result.headers.Authorization).toBe("Bearer secret")
    expect(axiosInstance.defaults.baseURL).toBe("https://example.com")
  })

  it("rejects invalid or missing backend URLs", async () => {
    const requestHandler = requestUseMock.mock.calls[0][0]

    await expect(requestHandler({ headers: {} })).rejects.toThrow(
      "Backend URL is not set"
    )

    localStorage.setItem("backendUrl", "example.com")

    await expect(requestHandler({ headers: {} })).rejects.toThrow(
      "Backend URL must start with http:// or https://"
    )
  })

  it("passes response values and response errors through", async () => {
    const responseHandler = responseUseMock.mock.calls[0][0]
    const errorHandler = responseUseMock.mock.calls[0][1]
    const response = { data: { ok: true } }
    const error = new Error("network")

    expect(responseHandler(response)).toBe(response)
    await expect(errorHandler(error)).rejects.toBe(error)
  })
})
