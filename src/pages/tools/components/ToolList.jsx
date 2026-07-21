import { Plus } from "lucide-react"
import { useMemo } from "react"

import { serverToolVM } from "../normalize"
import styles from "../tools.module.css"

const DOT_VAR = {
  client: "var(--accent)",
  server: "var(--blue)",
  mcp: "var(--violet)",
}

// Row for a single tool.
/**
 *
 */
const ToolRow = ({ vm, active, onSelect }) => (
  <div
    className={`${styles.trow} ${active ? styles.active : ""}`}
    onClick={() => onSelect(vm.key)}
  >
    <span className={styles.tdot} style={{ background: DOT_VAR[vm.kind] }} />
    <span className={styles.tn}>{vm.name}</span>
    {vm.kind === "client" ? (
      vm.registered ? (
        <span className={styles.rdot} title="registered" />
      ) : (
        <span className={styles.tp}>{vm.params.length}</span>
      )
    ) : (
      <span className={styles.tp}>{vm.params.length}</span>
    )}
  </div>
)

/**
 *
 */
export default function ToolList({
  serverNodes,
  clientVMs,
  selectedKey,
  isNew,
  status,
  error,
  onSelect,
  onNew,
}) {
  // Group server tools by node, splitting local/remote (server) vs mcp.
  const groups = useMemo(() => {
    const out = []
    for (const node of serverNodes) {
      const vms = (node.tools || []).map((t) => serverToolVM(t, node.node_name))
      const serverTools = vms.filter((v) => v.kind === "server")
      const mcpTools = vms.filter((v) => v.kind === "mcp")
      if (serverTools.length) {
        out.push({
          id: `srv-${node.node_name}`,
          label: `Server tools`,
          sub: `node: ${node.node_name}`,
          dot: "server",
          vms: serverTools,
        })
      }
      if (mcpTools.length) {
        out.push({
          id: `mcp-${node.node_name}`,
          label: `MCP · ${node.node_name}`,
          dot: "mcp",
          vms: mcpTools,
        })
      }
    }
    if (clientVMs.length) {
      out.push({
        id: "client",
        label: "Client tools",
        sub: "browser",
        dot: "client",
        vms: clientVMs,
      })
    }
    return out
  }, [serverNodes, clientVMs])

  return (
    <section className={styles.list}>
      <div className={styles.listHead}>
        <h2>Tools &amp; MCP</h2>
        <button className={styles.newbtn} type="button" onClick={onNew}>
          <Plus size={13} strokeWidth={2} />
          New client tool
        </button>
      </div>
      <div className={styles.listScroll}>
        {status === "loading" && groups.length === 0 && (
          <div className={styles.listMsg}>Loading tools…</div>
        )}
        {status === "error" && groups.length === 0 && (
          <div className={styles.listMsg}>
            {error || "Failed to load tools."}
          </div>
        )}
        {status === "ready" && groups.length === 0 && (
          <div className={styles.listMsg}>
            No tools on this graph. Add a client tool to get started.
          </div>
        )}
        {groups.map((g) => (
          <div key={g.id}>
            <div className={styles.grpH}>
              <span className={`${styles.gd} ${styles[g.dot]}`} />
              {g.label}
              <span className={styles.gc}>{g.sub || g.vms.length}</span>
            </div>
            {g.vms.map((vm) => (
              <ToolRow
                key={vm.key}
                vm={vm}
                active={!isNew && selectedKey === vm.key}
                onSelect={onSelect}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
