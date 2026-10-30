import { useEffect, useRef, useState } from "react"

import {
  isLocalNetworkUrl,
  isLocalPage,
  isNetworkFailure,
  probeLocalNetwork,
  queryLocalNetworkPermission,
} from "@/lib/connection/local-network"
import { getCurrentSettings } from "@/lib/settings-utils"

/**
 * From a public page, one bare request to a local server makes Chrome ask for
 * local network access now, not on "Connect & verify". Once per page load.
 * Calls `onBlocked` when the permission is denied or the request is refused.
 */
const useEarlyLocalProbe = (url, parameters, onBlocked) => {
  const probed = useRef(false)

  useEffect(() => {
    if (probed.current) return
    probed.current = true
    if (isLocalPage()) return
    // A ?backendUrl= link auto-connects, which asks for permission itself.
    if (parameters.get("backendUrl") || parameters.get("base_url")) return
    const target = getCurrentSettings().backendUrl || url
    if (!isLocalNetworkUrl(target)) return
    const run = async () => {
      const permission = await queryLocalNetworkPermission(target)
      if (permission === "denied") {
        onBlocked()
        return
      }
      if (permission === "granted") return
      if ((await probeLocalNetwork(target)) === "blocked") onBlocked()
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

/**
 * Whether Chrome's Local Network Access is what stopped a local server from
 * answering. `localBlocked` is true on a public page, for a local URL, after a
 * refused early probe, a denied permission or a network failure on connect.
 */
export const useLocalAccess = (url, parameters, status) => {
  const [blocked, setBlocked] = useState(false)
  const [netFailed, setNetFailed] = useState(false)
  useEarlyLocalProbe(url, parameters, () => setBlocked(true))

  const noteConnectResult = (res) => {
    setNetFailed(!res.ok && isNetworkFailure(res.error))
    if (res.ok) setBlocked(false)
  }

  const gated = !isLocalPage() && isLocalNetworkUrl(url)
  const failed = status === "error" && netFailed
  const localBlocked =
    gated &&
    (blocked || failed) &&
    status !== "connecting" &&
    status !== "connected"
  return { localBlocked, noteConnectResult }
}
