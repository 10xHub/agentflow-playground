import PropTypes from "prop-types"
import { useMemo } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import styles from "../graph.module.css"

import { displayName, typeLabel } from "./graph-canvas"

/**
 * Node Details card (ported from the legacy view). Shows the selected node's
 * type and id, plus the nodes it connects to (in either direction), derived from
 * the live edge list.
 */
const NodePane = ({ node = null, nodes, edges }) => {
  const connected = useMemo(() => {
    if (!node) return []
    const names = new Set()
    for (const e of edges) {
      if (e.source === node.name && e.target !== node.name) names.add(e.target)
      if (e.target === node.name && e.source !== node.name) names.add(e.source)
    }
    return nodes.filter((n) => names.has(n.name))
  }, [node, nodes, edges])

  return (
    <Card className={styles.card}>
      <CardHeader className={styles.cardHead}>
        <CardTitle className={styles.cardTitle}>Node Details</CardTitle>
        <CardDescription className={styles.cardDesc}>
          Inspect the selected node and its graph connections.
        </CardDescription>
      </CardHeader>

      <CardContent className={styles.cardBody}>
        {node ? (
          <>
            <div>
              <p className={styles.fieldLabel}>Selected node</p>
              <h3 className={styles.nodeHeading}>{displayName(node.name)}</h3>
            </div>

            <div className={styles.infoTile}>
              <p className={styles.fieldLabel}>Type</p>
              <p className={styles.tileValue}>{typeLabel(node.name)}</p>
            </div>

            <div className={styles.infoTile}>
              <p className={styles.fieldLabel}>Node ID</p>
              <p className={styles.tileMono}>{node.id}</p>
            </div>

            <div className={styles.infoTile}>
              <p className={styles.fieldLabel}>Connected nodes</p>
              {connected.length > 0 ? (
                <ul className={styles.pills}>
                  {connected.map((n) => (
                    <li key={n.id} className={styles.pill}>
                      {displayName(n.name)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.tileValue}>No connected nodes.</p>
              )}
            </div>
          </>
        ) : (
          <div className={styles.emptyTile}>
            Select a node on the canvas to inspect its details.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

NodePane.propTypes = {
  node: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    name: PropTypes.string,
  }),
  nodes: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      name: PropTypes.string,
    })
  ).isRequired,
  edges: PropTypes.arrayOf(
    PropTypes.shape({
      source: PropTypes.string,
      target: PropTypes.string,
    })
  ).isRequired,
}

export default NodePane
