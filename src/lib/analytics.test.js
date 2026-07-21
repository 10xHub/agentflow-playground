import { beforeEach, describe, expect, it, vi } from "vitest"

const logEvent = vi.fn()
const getAnalyticsInstance = vi.fn()

vi.mock("firebase/analytics", () => ({
  logEvent: (...arguments_) => logEvent(...arguments_),
}))
vi.mock("@/firebase", () => ({
  getAnalyticsInstance: () => getAnalyticsInstance(),
}))

const FAKE = { name: "fake-analytics" }

const load = async () => {
  vi.resetModules()
  return import("./analytics")
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

describe("analytics", () => {
  beforeEach(() => {
    logEvent.mockReset()
    getAnalyticsInstance.mockReset()
  })

  it("forwards the event name and params once initialized", async () => {
    getAnalyticsInstance.mockResolvedValue(FAKE)
    const { track } = await load()

    track("chat_message_sent", { has_run_options: true })
    await vi.waitFor(() => expect(logEvent).toHaveBeenCalledTimes(1))

    expect(logEvent).toHaveBeenCalledWith(FAKE, "chat_message_sent", {
      has_run_options: true,
    })
  })

  it("flushes events queued before init resolves exactly once", async () => {
    let resolveInstance
    getAnalyticsInstance.mockReturnValue(
      new Promise((resolve) => {
        resolveInstance = resolve
      })
    )
    const { track } = await load()

    track("first_event")
    track("second_event")
    expect(logEvent).not.toHaveBeenCalled()

    resolveInstance(FAKE)
    await vi.waitFor(() => expect(logEvent).toHaveBeenCalledTimes(2))

    expect(logEvent.mock.calls.map((call) => call[1])).toEqual([
      "first_event",
      "second_event",
    ])
  })

  it("no-ops when analytics is unavailable", async () => {
    getAnalyticsInstance.mockResolvedValue(null)
    const { track } = await load()

    track("chat_message_sent")
    track("thread_created")
    await tick()

    expect(logEvent).not.toHaveBeenCalled()
  })

  it("swallows a rejected init", async () => {
    getAnalyticsInstance.mockRejectedValue(new Error("boom"))
    const { track } = await load()

    expect(() => track("chat_message_sent")).not.toThrow()
    await tick()
    expect(logEvent).not.toHaveBeenCalled()
  })

  it("swallows a throwing logEvent", async () => {
    getAnalyticsInstance.mockResolvedValue(FAKE)
    logEvent.mockImplementation(() => {
      throw new Error("blocked by ad blocker")
    })
    const { track } = await load()

    track("chat_message_sent")
    await vi.waitFor(() => expect(logEvent).toHaveBeenCalledTimes(1))

    expect(() => track("thread_created")).not.toThrow()
  })

  it("logs page_view with path and title", async () => {
    getAnalyticsInstance.mockResolvedValue(FAKE)
    const { trackPageView } = await load()

    trackPageView("/chat", "Chat")
    await vi.waitFor(() => expect(logEvent).toHaveBeenCalledTimes(1))

    expect(logEvent).toHaveBeenCalledWith(FAKE, "page_view", {
      page_path: "/chat",
      page_title: "Chat",
    })
  })

  it("falls back to the path when no title is given", async () => {
    getAnalyticsInstance.mockResolvedValue(FAKE)
    const { trackPageView } = await load()

    trackPageView("/unknown")
    await vi.waitFor(() => expect(logEvent).toHaveBeenCalledTimes(1))

    expect(logEvent).toHaveBeenCalledWith(FAKE, "page_view", {
      page_path: "/unknown",
      page_title: "/unknown",
    })
  })

  it("caps the pre-init queue at 20 events", async () => {
    let resolveInstance
    getAnalyticsInstance.mockReturnValue(
      new Promise((resolve) => {
        resolveInstance = resolve
      })
    )
    const { track } = await load()

    for (let index = 0; index < 30; index += 1) track(`event_${index}`)
    resolveInstance(FAKE)
    await vi.waitFor(() => expect(logEvent).toHaveBeenCalledTimes(20))
  })

  it("initializes analytics only once across many events", async () => {
    getAnalyticsInstance.mockResolvedValue(FAKE)
    const { track } = await load()

    track("one")
    track("two")
    track("three")
    await vi.waitFor(() => expect(logEvent).toHaveBeenCalledTimes(3))

    expect(getAnalyticsInstance).toHaveBeenCalledTimes(1)
  })
})
