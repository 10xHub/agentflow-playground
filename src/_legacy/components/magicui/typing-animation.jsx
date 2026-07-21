import PropTypes from "prop-types"
import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

/**
 * TypingAnimation component displays text with a typing animation effect
 * @param {object} props - Component props
 * @param {string} props.children - The text content to animate
 * @param {string} props.className - Additional CSS classes
 * @param {number} props.duration - Duration between each character (ms)
 * @param {number} props.delay - Delay before animation starts (ms)
 * @param {boolean} props.startOnView - Start animation when in view
 * @returns {object} The typing animation component
 */
const TypingAnimation = ({
  children,
  className,
  duration,
  delay,
  startOnView,
}) => {
  const [displayedText, setDisplayedText] = useState("")

  useEffect(() => {
    if (startOnView) return undefined // View detection not implemented yet

    const timeoutId = setTimeout(() => {
      let index = 0
      const intervalId = setInterval(() => {
        setDisplayedText(children.slice(0, index))
        index += 1
        if (index > children.length) {
          clearInterval(intervalId)
        }
      }, duration)

      return () => clearInterval(intervalId)
    }, delay)

    return () => clearTimeout(timeoutId)
  }, [children, duration, delay, startOnView])

  return (
    <div
      className={cn(
        "font-display text-center text-4xl font-bold leading-[5rem] tracking-[-0.02em] drop-shadow-sm",
        className
      )}
    >
      {displayedText}
    </div>
  )
}

TypingAnimation.propTypes = {
  children: PropTypes.string.isRequired,
  className: PropTypes.string,
  duration: PropTypes.number,
  delay: PropTypes.number,
  startOnView: PropTypes.bool,
}

TypingAnimation.defaultProps = {
  className: "",
  duration: 100,
  delay: 0,
  startOnView: false,
}

export default TypingAnimation
