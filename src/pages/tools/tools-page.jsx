import { useEffect, useMemo, useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import { loadTools } from "@/store/toolsSlice"

import ClientEditor from "./components/ClientEditor"
import ReadonlyDetail from "./components/ReadonlyDetail"
import ToolList from "./components/ToolList"
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

/**
 *
 */
export default function ToolsPage() {
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
  useEffect(() => {
    if (!selectedKey && !isNew) {
      const first = serverVMs[0] || clientVMs[0]
      if (first) setSelectedKey(first.key)
    }
  }, [serverVMs, clientVMs, selectedKey, isNew])

  const handleSelect = (key) => {
    setIsNew(false)
    setSelectedKey(key)
  }
  const handleNew = () => {
    setIsNew(true)
    setSelectedKey(null)
  }

  const tool = isNew ? newClientTool() : byKey[selectedKey]
  const detailKey = isNew ? "__new__" : selectedKey

  return (
    <div className={styles.page}>
      <ToolList
        serverNodes={serverNodes}
        serverVMs={serverVMs}
        clientVMs={clientVMs}
        selectedKey={selectedKey}
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
                {status === "loading"
                  ? "Loading tools…"
                  : status === "error"
                    ? error || "Failed to load tools."
                    : "No tools. Connect to a backend or add a client tool."}
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
