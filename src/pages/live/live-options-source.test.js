import { describe, expect, it } from "vitest"

import { buildLiveInit, getHonoredLiveOptions } from "./live-options-source"

describe("getHonoredLiveOptions", () => {
  it("reads info.realtime_options.client_overrides", () => {
    expect(
      getHonoredLiveOptions({
        realtime_options: { client_overrides: ["voice"] },
      })
    ).toEqual(["voice"])
  })
  it("is null when the server does not say", () => {
    expect(getHonoredLiveOptions({})).toBeNull()
    expect(getHonoredLiveOptions(null)).toBeNull()
  })
})

describe("buildLiveInit", () => {
  const options = {
    voice: "Puck",
    systemPrompt: "be brief",
    vadEnabled: false,
    silenceMs: "800",
  }
  it("sends everything when unknown", () => {
    expect(buildLiveInit(options, null)).toEqual({
      modalities: "AUDIO",
      voice: "Puck",
      system_prompt: "be brief",
      vad: { enabled: false, silence_duration_ms: 800 },
    })
  })
  it("drops options the server does not honor", () => {
    expect(buildLiveInit(options, ["voice"])).toEqual({
      modalities: "AUDIO",
      voice: "Puck",
    })
  })
  it("omits empty options", () => {
    expect(
      buildLiveInit({ voice: " ", vadEnabled: true, silenceMs: "" })
    ).toEqual({ modalities: "AUDIO" })
  })
})
