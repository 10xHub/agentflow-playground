import styles from "../tools.module.css"

export default function ParamTable({ params }) {
  if (!params.length) {
    return <div className={styles.dDesc} style={{ margin: 0 }}>No parameters.</div>
  }
  return (
    <div className={styles.ptable}>
      <div className={`${styles.prow} ${styles.h}`}>
        <span className={styles.pn}>name</span>
        <span className={styles.pt}>type</span>
        <span className={styles.prq}>req</span>
        <span className={styles.pd}>description</span>
      </div>
      {params.map((p) => (
        <div className={styles.prow} key={p.n}>
          <span className={styles.pn}>{p.n}</span>
          <span className={styles.pt}>{p.t}</span>
          <span className={styles.prq}>
            {p.r ? (
              <span className={styles.req}>required</span>
            ) : (
              <span className={styles.opt}>optional</span>
            )}
          </span>
          <span className={styles.pd}>{p.d || ""}</span>
        </div>
      ))}
    </div>
  )
}
