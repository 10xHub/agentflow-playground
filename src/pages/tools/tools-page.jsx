import { useEffect, useMemo, useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import { loadTools } from "@/store/tools-slice"

import ClientEditor from "./components/client-editor"
import ReadonlyDetail from "./components/readonly-detail"
import ToolList from "./components/tool-list"
import { clientToolVM, serverToolVM } from "./normalize"
import styles from "./tools.module.css"

// A blank client-tool view model for the "New client tool" flow.
const newClientTool = () => ({
  key: "__new__",
  id: null,
  kind: "client",
  name: "",
  desc: "",
  code: "",
  mock: "",
  callMode: "mock",
  registered: false,
  params: [],
  parameters: { type: "object", properties: {}, required: [] },
})

// Key of the tool to fall back to when nothing has been picked yet.
const firstToolKey = (serverVMs, clientVMs) => {
  const first = serverVMs[0] || clientVMs[0]
  return first ? first.key : null
}

// Placeholder text for the detail pane when no tool is selectable.
const emptyDetailMessage = (status, error) => {
  if (status === "loading") return "Loading tools…"
  if (status === "error") return error || "Failed to load tools."
  return "No tools. Connect to a backend or add a client tool."
}

/**
 *
 */
const ToolsPage = () => {
  const dispatch = useDispatch()
  const { serverNodes, clientTools, status, error } = useSelector(
    (s) => s.tools
  )

  const [selectedKey, setSelectedKey] = useState(null)
  const [isNew, setIsNew] = useState(false)

  useEffect(() => {
    dispatch(loadTools())
  }, [dispatch])

  // Flatten server tools (grouped by node) + client tools into view models.
  const { serverVMs, clientVMs, byKey } = useMemo(() => {
    const sv = []
    for (const node of serverNodes) {
      for (const t of node.tools || []) sv.push(serverToolVM(t, node.node_name))
    }
    const cv = clientTools.map(clientToolVM)
    const map = {}
    for (const t of [...sv, ...cv]) map[t.key] = t
    return { serverVMs: sv, clientVMs: cv, byKey: map }
  }, [serverNodes, clientTools])

  // Default-select the first available tool once data arrives.
  const activeKey = isNew
    ? null
    : selectedKey || firstToolKey(serverVMs, clientVMs)

  const handleSelect = (key) => {
    setIsNew(false)
    setSelectedKey(key)
  }
  const handleNew = () => {
    setIsNew(true)
    setSelectedKey(null)
  }

  const tool = isNew ? newClientTool() : byKey[activeKey]
  const detailKey = isNew ? "__new__" : activeKey

  return (
    <div className={styles.page}>
      <ToolList
        serverNodes={serverNodes}
        serverVMs={serverVMs}
        clientVMs={clientVMs}
        selectedKey={activeKey}
        isNew={isNew}
        status={status}
        error={error}
        onSelect={handleSelect}
        onNew={handleNew}
      />
      <section className={styles.detail}>
        <div className={styles.dBody}>
          <div className={styles.dInner}>
            {!tool ? (
              <div className={styles.dDesc}>
                {emptyDetailMessage(status, error)}
              </div>
            ) : tool.kind === "client" ? (
              <ClientEditor key={detailKey} tool={tool} />
            ) : (
              <ReadonlyDetail key={detailKey} tool={tool} />
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default ToolsPage
