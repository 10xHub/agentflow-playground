import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { createPcmPlayer } from "./realtime-audio"

const sources = []

class FakeContext {
  constructor() {
    this.currentTime = 1
    this.state = "running"
    this.destination = {}
  }
  createBuffer(_c, frames, rate) {
    return {
      duration: frames / rate,
      getChannelData: () => new Float32Array(frames),
    }
  }
  createBufferSource() {
    const s = {
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
    }
    sources.push(s)
    return s
  }
  close() {}
}

const frame = () => new Uint8Array(4800)

describe("createPcmPlayer flush", () => {
  beforeEach(() => {
    sources.length = 0
    window.AudioContext = FakeContext
  })
  afterEach(() => {
    delete window.AudioContext
  })

  it("stops every queued source", () => {
    const p = createPcmPlayer()
    p.play(frame())
    p.play(frame())
    p.flush()
    expect(sources).toHaveLength(2)
    sources.forEach((s) => expect(s.stop).toHaveBeenCalled())
  })

  it("resets the schedule so new audio starts now", () => {
    const p = createPcmPlayer()
    p.play(frame())
    p.play(frame())
    p.flush()
    p.play(frame())
    expect(sources.at(-1).start).toHaveBeenCalledWith(1)
  })

  it("is safe before any audio and tolerates sources that already ended", () => {
    const p = createPcmPlayer()
    expect(() => p.flush()).not.toThrow()
    p.play(frame())
    sources[0].stop.mockImplementation(() => {
      throw new Error("ended")
    })
    expect(() => p.flush()).not.toThrow()
  })
})
