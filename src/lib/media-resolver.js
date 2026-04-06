/* eslint-disable unicorn/filename-case */
import { getAgentFlowClient } from "@/lib/agentflow-client"
import { getCurrentSettings } from "@/lib/settings-utils"

/**
 * Resolve a file_id to a displayable URL.
 * Tries the direct download endpoint first (no auth needed for local files),
 * then falls back to the client's getFileAccessUrl if available.
 */
export const resolveFileUrl = async (fileId) => {
  if (!fileId) return null

  const settings = getCurrentSettings()
  const backendUrl = settings.backendUrl?.trim().replace(/\/$/, "")
  if (!backendUrl) return null

  // Try direct binary download first
  const directUrl = `${backendUrl}/v1/files/${fileId}`

  // Verify the file exists by doing a HEAD request
  try {
    const response = await fetch(directUrl, { method: "HEAD" })
    if (response.ok) {
      return directUrl
    }
  } catch {
    // Fall through to client method
  }

  // Fallback: use client to get access URL
  try {
    const client = getAgentFlowClient()
    if (typeof client.getFileAccessUrl === "function") {
      const urlResponse = await client.getFileAccessUrl(fileId)
      return urlResponse?.url || urlResponse?.data?.url || directUrl
    }
  } catch {
    // Return direct URL as last resort
  }

  return directUrl
}

/**
 * Scan message content blocks and resolve all file_id references to URLs.
 * Returns a new content array with resolved URLs.
 */
export const resolveContentBlockUrls = async (content) => {
  if (!Array.isArray(content)) return content

  const resolved = await Promise.all(
    content.map(async (block) => {
      if (!block || typeof block !== "object") return block
      if (!block.media || block.media.kind !== "file_id") return block

      const url = await resolveFileUrl(block.media.file_id)
      if (!url) return block

      return {
        ...block,
        media: {
          ...block.media,
          kind: "url",
          url,
        },
      }
    })
  )

  return resolved
}
