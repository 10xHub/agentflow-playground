import PropTypes from "prop-types"

import { cn } from "@/lib/utils"

/**
 * AnimatedGradientText component displays text with an animated gradient background
 * @param {object} props - Component props
 * @param {object} props.children - The content to display
 * @param {string} props.className - Additional CSS classes
 * @param {number} props.speed - The speed of the gradient animation
 * @param {string} props.colorFrom - The starting color of the gradient
 * @param {string} props.colorTo - The ending color of the gradient
 * @returns {object} The animated gradient text component
 */
const AnimatedGradientText = ({
  children,
  className,
  speed,
  colorFrom,
  colorTo,
}) => {
  const gradientStyle = {
    background: `linear-gradient(45deg, ${colorFrom}, ${colorTo}, ${colorFrom})`,
    backgroundSize: "300% 300%",
    animation: `animatedGradient ${speed}s ease infinite`,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  }

  return (
    <>
      <style>{`
        @keyframes animatedGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
      <div
        className={cn(
          "relative inline-block bg-clip-text text-transparent",
          className
        )}
        style={gradientStyle}
      >
        {children}
      </div>
    </>
  )
}

AnimatedGradientText.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  speed: PropTypes.number,
  colorFrom: PropTypes.string,
  colorTo: PropTypes.string,
}

AnimatedGradientText.defaultProps = {
  className: "",
  speed: 3,
  colorFrom: "#ffaa40",
  colorTo: "#9c40ff",
}

export default AnimatedGradientText
