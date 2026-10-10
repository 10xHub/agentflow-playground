import PropTypes from "prop-types"

import styles from "./Brand.module.css"

/**
 * 10xGraph mark (design/10xgraph/logo/mark.svg). Strokes follow the text color
 * and the entry node uses the brand amber, so one SVG serves both themes.
 */
export const BrandMark = ({ size = 20 }) => (
  <svg
    className={styles.mark}
    width={size}
    height={size}
    viewBox="0 0 48 48"
    aria-hidden="true"
  >
    <rect
      x="4"
      y="4"
      width="40"
      height="40"
      rx="11"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.6"
    />
    <path
      d="M13 33L21 23L34 15L34 31L21 23"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <g fill="currentColor">
      <circle cx="21" cy="23" r="3.4" />
      <circle cx="34" cy="15" r="3.4" />
      <circle cx="34" cy="31" r="3.4" />
    </g>
    <circle cx="13" cy="33" r="3.8" fill="var(--brand-amber)" />
  </svg>
)

BrandMark.propTypes = {
  size: PropTypes.number,
}

/**
 * Mark + "10xGraph" wordmark + muted "playground" product label.
 */
export const Brand = ({ size = 20 }) => (
  <div className={styles.brand}>
    <BrandMark size={size} />
    <span className={styles.wordmark}>10xGraph</span>
    <span className={styles.product}>playground</span>
  </div>
)

Brand.propTypes = {
  size: PropTypes.number,
}
