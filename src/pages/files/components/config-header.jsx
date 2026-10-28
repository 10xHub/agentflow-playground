import PropTypes from "prop-types"

import styles from "../files.module.css"

const Item = ({ label, value }) => (
  <div className={styles.cfgItem}>
    <span className={styles.cfgLabel}>{label}</span>
    <span className={styles.cfgValue}>{value}</span>
  </div>
)
Item.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
}

/**
 * Storage type, size limit and document handling from the multimodal config.
 */
const ConfigHeader = ({ config, demo = false }) => {
  if (demo) {
    return (
      <p className={styles.muted}>
        The recorded demo has no media storage, so uploads are off in the demo.
        Run 10xGraph on your own agent to try them.
      </p>
    )
  }
  if (config.status === "error") {
    return <p className={styles.inlineError}>{config.error}</p>
  }
  if (config.status !== "ready") {
    return <p className={styles.muted}>Loading config…</p>
  }
  return (
    <div className={styles.cfg}>
      <Item label="Storage" value={String(config.storageType)} />
      <Item label="Max size" value={`${config.maxSizeMb} MB`} />
      <Item label="Documents" value={String(config.documentHandling)} />
    </div>
  )
}

ConfigHeader.propTypes = {
  config: PropTypes.shape({
    status: PropTypes.string,
    storageType: PropTypes.string,
    maxSizeMb: PropTypes.number,
    documentHandling: PropTypes.string,
    error: PropTypes.string,
  }).isRequired,
  demo: PropTypes.bool,
}

export default ConfigHeader
