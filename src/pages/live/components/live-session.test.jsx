import { act, fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ sessions: [], players: [], inits: [] }))

vi.mock("@/lib/realtime-audio", () => ({
  createPcmPlayer: () => {
    const player = { play: vi.fn(), close: vi.fn(), flush: vi.fn() }
    mocks.players.push(player)
    return player
  },
  createMicCapture: vi.fn(),
}))

vi.mock("@/lib/usage-events", () => ({ track: vi.fn() }))

vi.mock("@/lib/tenxgraph-client", () => ({
  getTenxGraphClient: () => ({
    realtime: (init) => {
      mocks.inits.push(init)
      const handlers = {}
      const session = {
        on: (event, fn) => {
          handlers[event] = fn
        },
        emit: (event, payload) => handlers[event]?.(payload),
        close: vi.fn(),
        activityStart: vi.fn(),
        activityEnd: vi.fn(),
        sendAudio: vi.fn(),
        sendText: vi.fn(),
        threadId: null,
      }
      mocks.sessions.push(session)
      return session
    },
  }),
}))

import { MemoryRouter } from "react-router-dom"

import LiveSession from "./live-session"

const startSession = (props = {}) => {
  render(
    <MemoryRouter>
      <LiveSession {...props} />
    </MemoryRouter>
  )
  fireEvent.click(screen.getByRole("button", { name: "Start session" }))
  act(() => mocks.sessions.at(-1).emit("open"))
}

describe("LiveSession", () => {
  beforeEach(() => {
    mocks.sessions.length = 0
    mocks.players.length = 0
    mocks.inits.length = 0
  })

  it("shows no vendor name in the header", () => {
    render(
      <MemoryRouter>
        <LiveSession />
      </MemoryRouter>
    )
    expect(screen.queryByText(/Gemini/i)).toBeNull()
  })

  it("a non-fatal error keeps the session live and shows the message", () => {
    startSession()
    act(() =>
      mocks.sessions[0].emit("error", { message: "blip", fatal: false })
    )
    expect(screen.getByText("blip")).toBeTruthy()
    expect(screen.getByText("Live")).toBeTruthy()
  })

  it("a fatal error ends the session", () => {
    startSession()
    act(() => mocks.sessions[0].emit("error", { message: "dead", fatal: true }))
    expect(screen.getByText("dead")).toBeTruthy()
    expect(screen.getByText("Error")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Restart" })).toBeTruthy()
  })

  it("restart closes the previous session before opening a new one", () => {
    startSession()
    act(() => mocks.sessions[0].emit("error", { message: "dead", fatal: true }))
    fireEvent.click(screen.getByRole("button", { name: "Restart" }))
    expect(mocks.sessions[0].close).toHaveBeenCalledTimes(1)
    expect(mocks.sessions).toHaveLength(2)
  })

  it("interrupted flushes queued audio and closes the open agent bubble", () => {
    startSession()
    act(() =>
      mocks.sessions[0].emit("output_transcript", {
        text: "Hel",
        finished: false,
      })
    )
    act(() => mocks.sessions[0].emit("interrupted"))
    expect(mocks.players[0].flush).toHaveBeenCalledTimes(1)
    act(() =>
      mocks.sessions[0].emit("output_transcript", {
        text: "New",
        finished: false,
      })
    )
    expect(screen.getByText("Hel")).toBeTruthy()
    expect(screen.getByText("New")).toBeTruthy()
  })

  it("turn_complete closes open bubbles so the next text starts a new one", () => {
    startSession()
    act(() =>
      mocks.sessions[0].emit("output_transcript", {
        text: "One",
        finished: false,
      })
    )
    act(() => mocks.sessions[0].emit("turn_complete"))
    act(() =>
      mocks.sessions[0].emit("output_transcript", {
        text: "Two",
        finished: false,
      })
    )
    expect(screen.getByText("One")).toBeTruthy()
    expect(screen.getByText("Two")).toBeTruthy()
  })

  it("shows tool_call and tool_result as one step row", () => {
    startSession()
    act(() =>
      mocks.sessions[0].emit("tool_call", {
        id: "c1",
        name: "weather",
        args: { city: "Rome" },
      })
    )
    expect(screen.getByText(/weather\(/)).toBeTruthy()
    act(() =>
      mocks.sessions[0].emit("tool_result", { id: "c1", result: "sunny" })
    )
    expect(screen.getAllByText(/weather/)).toHaveLength(1)
    expect(screen.getByText(/sunny/)).toBeTruthy()
  })

  it("go_away shows a banner with the time left", () => {
    startSession()
    act(() => mocks.sessions[0].emit("go_away", { time_left: "30s" }))
    expect(screen.getByRole("status").textContent).toMatch(/30s/)
  })

  it("agent_changed shows the new agent name", () => {
    startSession()
    act(() => mocks.sessions[0].emit("agent_changed", { author: "billing" }))
    expect(screen.getByText(/agent: billing/)).toBeTruthy()
  })

  it("session_update does not break the session", () => {
    startSession()
    act(() =>
      mocks.sessions[0].emit("session_update", { resumption_handle: "h1" })
    )
    expect(screen.getByText("Live")).toBeTruthy()
  })

  it("typed text goes to sendText and shows in the transcript", () => {
    startSession()
    fireEvent.change(screen.getByLabelText("Message to the agent"), {
      target: { value: "hello there" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Send" }))
    expect(mocks.sessions[0].sendText).toHaveBeenCalledWith("hello there")
    expect(screen.getByText("hello there")).toBeTruthy()
  })

  it("text input is disabled until the session is live", () => {
    render(
      <MemoryRouter>
        <LiveSession />
      </MemoryRouter>
    )
    expect(screen.getByLabelText("Message to the agent").disabled).toBe(true)
  })

  it("with unknown honored options, sends them and says the server may ignore them", () => {
    render(
      <MemoryRouter>
        <LiveSession />
      </MemoryRouter>
    )
    expect(screen.getByText(/may ignore any of these/)).toBeTruthy()
    fireEvent.change(screen.getByLabelText("Voice"), {
      target: { value: "Puck" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Start session" }))
    expect(mocks.inits[0]).toMatchObject({ modalities: "AUDIO", voice: "Puck" })
  })

  it("with a known honored list, hides and omits the rest", () => {
    render(
      <MemoryRouter>
        <LiveSession honored={["voice"]} />
      </MemoryRouter>
    )
    expect(screen.queryByLabelText("System prompt")).toBeNull()
    fireEvent.change(screen.getByLabelText("Voice"), {
      target: { value: "Puck" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Start session" }))
    expect(mocks.inits[0].system_prompt).toBeUndefined()
    expect(mocks.inits[0].voice).toBe("Puck")
  })

  it("links the ended session's thread, using the id the server created", () => {
    startSession()
    act(() =>
      mocks.sessions[0].emit("session_started", { thread_id: "t-1" })
    )
    fireEvent.click(screen.getByRole("button", { name: /End/ }))
    expect(screen.getByText(/Thread t-1/)).toBeTruthy()
  })
})
