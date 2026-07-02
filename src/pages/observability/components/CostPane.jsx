import styles from "../observability.module.css"

function Table({ data }) {
  return (
    <div className={styles.tbl}>
      <div className={`${styles.tblRow} ${styles.h}`}>
        <span className={styles.c1}>{data.head[0]}</span>
        <span className={styles.c2}>{data.head[1]}</span>
        <span className={styles.c3}>{data.head[2]}</span>
      </div>
      {data.rows.map((r, i) => (
        <div className={styles.tblRow} key={i}>
          <span className={styles.c1}>{r[0]}</span>
          <span className={styles.c2}>{r[1]}</span>
          <span className={styles.c3}>{r[2]}</span>
        </div>
      ))}
    </div>
  )
}

export default function CostPane({ cost }) {
  if (!cost) return null
  return (
    <div>
      <div className={styles.costCards}>
        {cost.cards.map((c) => (
          <div className={styles.cc} key={c.label}>
            <div className={styles.l}>{c.label}</div>
            <div className={`${styles.v} ${c.accent ? styles.accent : ""}`}>
              {c.value}
              {c.small && <small>{c.small}</small>}
              {c.tail && c.tail}
              {c.tailSmall && <small>{c.tailSmall}</small>}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.cost2}>
        <div>
          <div className={styles.secH}>Token breakdown</div>
          <div className={styles.bars}>
            {cost.breakdown.map((b) => (
              <div className={styles.br} key={b.key}>
                <div className={styles.brTop}>
                  <span className={styles.bk}>{b.key}</span>
                  <span className={styles.bv}>{b.value}</span>
                </div>
                <div className={styles.brTrack}>
                  <div
                    className={`${styles.brFill} ${styles[b.variant] ?? ""}`}
                    style={{ width: `${b.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className={styles.secH}>By model</div>
          <Table data={cost.byModel} />
          <div className={`${styles.secH} ${styles.secHGap}`}>By node</div>
          <Table data={cost.byNode} />
        </div>
      </div>
    </div>
  )
}
