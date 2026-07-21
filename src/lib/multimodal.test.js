import { describe, expect, it } from "vitest"

import {
  DEFAULT_MAX_SIZE_MB,
  DOCUMENT_ACCEPT,
  IMAGE_ACCEPT,
  getAcceptString,
  getMaxSizeBytes,
} from "@/lib/multimodal"

describe("multimodal helpers", () => {
  describe("getAcceptString", () => {
    it("allows only images when document handling is skip", () => {
      expect(getAcceptString("skip")).toBe(IMAGE_ACCEPT)
    })

    it("allows documents and images for extract_text", () => {
      expect(getAcceptString("extract_text")).toBe(
        `${DOCUMENT_ACCEPT},${IMAGE_ACCEPT}`
      )
    })

    it("allows documents and images for pass_raw", () => {
      expect(getAcceptString("pass_raw")).toBe(
        `${DOCUMENT_ACCEPT},${IMAGE_ACCEPT}`
      )
    })

    it("defaults to documents and images for unknown values", () => {
      expect(getAcceptString(undefined)).toBe(
        `${DOCUMENT_ACCEPT},${IMAGE_ACCEPT}`
      )
    })
  })

  describe("getMaxSizeBytes", () => {
    it("converts megabytes to bytes", () => {
      expect(getMaxSizeBytes(25)).toBe(25 * 1024 * 1024)
    })

    it("falls back to the default when given a non-number", () => {
      expect(getMaxSizeBytes(undefined)).toBe(
        DEFAULT_MAX_SIZE_MB * 1024 * 1024
      )
      expect(getMaxSizeBytes("nope")).toBe(DEFAULT_MAX_SIZE_MB * 1024 * 1024)
    })
  })
})
