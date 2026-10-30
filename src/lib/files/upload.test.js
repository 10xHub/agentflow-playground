import { describe, expect, it, vi } from "vitest"

import { checkFileSize, uploadErrorMessage, uploadMedia } from "./upload"

const err = (statusCode, message = "server said no") =>
  Object.assign(new Error(message), { statusCode })

describe("uploadErrorMessage", () => {
  it("maps 413 with the configured limit", () => {
    expect(uploadErrorMessage(err(413), 25)).toBe("File is larger than 25 MB")
  })
  it("maps 415", () => {
    expect(uploadErrorMessage(err(415))).toBe("This file type is not allowed")
  })
  it("maps 400", () => {
    expect(uploadErrorMessage(err(400))).toBe("Empty file or missing name")
  })
  it("reads a plain status property too", () => {
    expect(uploadErrorMessage({ status: 415, message: "x" })).toBe(
      "This file type is not allowed"
    )
  })
  it("falls back to the server message", () => {
    expect(uploadErrorMessage(err(500, "boom"))).toBe("boom")
    expect(uploadErrorMessage(null)).toBe("Upload failed")
  })
})

describe("checkFileSize", () => {
  const file = (size) => ({ size, name: "a.txt" })
  it("rejects an empty file", () => {
    expect(checkFileSize(file(0), 10)).toBe("Empty file or missing name")
  })
  it("rejects a file over the limit", () => {
    expect(checkFileSize(file(11 * 1024 * 1024), 10)).toBe(
      "File is larger than 10 MB"
    )
  })
  it("accepts a file within the limit, or when the limit is unknown", () => {
    expect(checkFileSize(file(1024), 10)).toBeNull()
    expect(checkFileSize(file(50 * 1024 * 1024), undefined)).toBeNull()
  })
})

describe("uploadMedia", () => {
  it("returns the response data", async () => {
    const client = {
      uploadFile: vi.fn().mockResolvedValue({ data: { file_id: "f1" } }),
    }
    const file = { size: 5, name: "a.txt" }
    expect(await uploadMedia(client, file, { maxSizeMb: 10 })).toEqual({
      file_id: "f1",
    })
    expect(client.uploadFile).toHaveBeenCalledWith(file)
  })
  it("rejects with the mapped message without calling the server when too large", async () => {
    const client = { uploadFile: vi.fn() }
    await expect(
      uploadMedia(
        client,
        { size: 3 * 1024 * 1024, name: "a" },
        { maxSizeMb: 1 }
      )
    ).rejects.toThrow("File is larger than 1 MB")
    expect(client.uploadFile).not.toHaveBeenCalled()
  })
  it("maps a server status to plain text and keeps the cause", async () => {
    const cause = err(415)
    const client = { uploadFile: vi.fn().mockRejectedValue(cause) }
    const p = uploadMedia(client, { size: 5, name: "a" }, { maxSizeMb: 10 })
    await expect(p).rejects.toThrow("This file type is not allowed")
    await p.catch((e) => expect(e.cause).toBe(cause))
  })
})
