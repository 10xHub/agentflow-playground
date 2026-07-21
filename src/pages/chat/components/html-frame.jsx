import PropTypes from "prop-types"
import { useEffect, useMemo, useRef, useState } from "react"

import styles from "../chat.module.css"

const MAX_HEIGHT = 520

// Split so the literal "</scr"+"ipt>" can never terminate an enclosing script tag.
const SCRIPT_CLOSE = `</${"script"}>`

// Reports document height back to the parent so the frame can size to content.
const RESIZE_SCRIPT = `<script>
(function () {
  var send = function () {
    parent.postMessage({ __af_frame: 1, height: document.documentElement.scrollHeight }, "*")
  }
  window.addEventListener("load", send)
  new ResizeObserver(send).observe(document.documentElement)
  send()
})()
${SCRIPT_CLOSE}`

/** Agent-authored HTML in a sandboxed frame: its CSS can't reach the playground. */
const HtmlFrame = ({ html = "" }) => {
  const reference = useRef(null)
  const [height, setHeight] = useState(120)

  // Inherit the playground's palette so previews don't flash white in dark mode.
  const sourceDocument = useMemo(() => {
    const cs =
      typeof window !== "undefined"
        ? getComputedStyle(document.documentElement)
        : null
    const bg = cs?.getPropertyValue("--surface")?.trim() || "#fff"
    const fg = cs?.getPropertyValue("--text")?.trim() || "#111"
    return `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;padding:12px;background:${bg};color:${fg};
font:13.5px/1.6 system-ui,sans-serif;}img,svg,video{max-width:100%;}</style>
</head><body>${html}${RESIZE_SCRIPT}</body></html>`
  }, [html])

  useEffect(() => {
    const onMessage = (e) => {
      if (
        !e.data?.__af_frame ||
        e.source !== reference.current?.contentWindow
      ) {
        return
      }
      setHeight(Math.min(e.data.height || 120, MAX_HEIGHT))
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [])

  return (
    <iframe
      ref={reference}
      className={styles.htmlFrame}
      title="rendered output"
      sandbox="allow-scripts"
      srcDoc={sourceDocument}
      style={{ height }}
    />
  )
}

HtmlFrame.propTypes = {
  html: PropTypes.string,
}

export default HtmlFrame
