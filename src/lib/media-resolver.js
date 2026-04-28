import { getAgentFlowClient } from "@/lib/agentflow-client"
import { getCurrentSettings } from "@/lib/settings-utils"

const isUrlAccessible = async (url) => {
  try {
    const response = await fetch(url, { method: "HEAD" })
    return response.ok
  } catch {
    return false
  }
}

const extractUrlFromResponse = (response) => {
  if (response && response.url) return response.url
  if (response && response.data && response.data.url) return response.data.url
  return null
}

const resolveViaClient = async (fileId) => {
  try {
    const client = getAgentFlowClient()
    if (typeof client.getFileAccessUrl !== "function") return null
    const response = await client.getFileAccessUrl(fileId)
    return extractUrlFromResponse(response)
  } catch {
    return null
  }
}

/**
 * Resolve a file_id to a displayable URL.
 * Tries the direct download endpoint first (no auth needed for local files),
 * then falls back to the client's getFileAccessUrl if available.
 */
export const resolveFileUrl = async (fileId) => {
  if (!fileId) return null

  const settings = getCurrentSettings()
  const backendUrl = (settings.backendUrl || "").trim().replace(/\/$/, "")
  if (!backendUrl) return null

  const directUrl = `${backendUrl}/v1/files/${fileId}`

  if (await isUrlAccessible(directUrl)) return directUrl

  return (await resolveViaClient(fileId)) || directUrl
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
