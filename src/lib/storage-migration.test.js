import { beforeEach, describe, expect, it } from "vitest"

import { migrateStorageKeys, RENAMED_KEYS } from "@/lib/storage-migration"

describe("storage-migration", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("moves every old key to its new name", () => {
    for (const [oldKey] of RENAMED_KEYS) localStorage.setItem(oldKey, `v:${oldKey}`)

    migrateStorageKeys()

    for (const [oldKey, newKey] of RENAMED_KEYS) {
      expect(localStorage.getItem(newKey)).toBe(`v:${oldKey}`)
      expect(localStorage.getItem(oldKey)).toBeNull()
    }
  })

  it("keeps an existing new value and drops the old one", () => {
    localStorage.setItem("agentflow.theme", "light")
    localStorage.setItem("10xgraph.theme", "dark")

    migrateStorageKeys()

    expect(localStorage.getItem("10xgraph.theme")).toBe("dark")
    expect(localStorage.getItem("agentflow.theme")).toBeNull()
  })

  it("does nothing when no old keys exist", () => {
    migrateStorageKeys()

    expect(localStorage.length).toBe(0)
  })
})
