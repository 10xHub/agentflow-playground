import { useState } from "react"

import ClientEditor from "./components/ClientEditor"
import ReadonlyDetail from "./components/ReadonlyDetail"
import ToolList from "./components/ToolList"
import { TOOLS } from "./data"
import styles from "./tools.module.css"

const NEW_TOOL = { kind: "client", registered: false, params: [] }

export default function ToolsPage() {
  // `isNew` overrides the selected key with a blank client-tool editor.
  const [selected, setSelected] = useState("cli_location")
  const [isNew, setIsNew] = useState(false)

  const handleSelect = (key) => {
    setIsNew(false)
    setSelected(key)
  }
  const handleNew = () => setIsNew(true)

  const tool = isNew ? NEW_TOOL : TOOLS[selected]
  // Reset editor/detail state whenever the target tool changes.
  const detailKey = isNew ? "__new__" : selected

  return (
    <div className={styles.page}>
      <ToolList
        selected={selected}
        isNew={isNew}
        onSelect={handleSelect}
        onNew={handleNew}
      />
      <section className={styles.detail}>
        <div className={styles.dBody}>
          <div className={styles.dInner}>
            {tool.kind === "client" ? (
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
