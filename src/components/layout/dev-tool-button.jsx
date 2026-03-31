import PropTypes from "prop-types"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * DevelopmentToolButton component renders a development tool button with tooltip
 * @param {object} props - Component props
 * @param {Function} props.icon - Lucide icon component
 * @param {string} props.tooltip - Tooltip text to display
 * @param {Function} props.handleActivate - Function called when button is clicked
 * @param {boolean} props.isActive - Whether the button is currently active
 * @returns {object} Development tool button with icon and tooltip
 */
const DevelopmentToolButton = ({
  icon: Icon,
  tooltip,
  handleActivate,
  isActive,
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleActivate}
        className={`h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 ${
          isActive ? "bg-slate-100 dark:bg-slate-800" : ""
        }`}
        aria-label={tooltip}
      >
        <Icon className="h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>{tooltip}</p>
    </TooltipContent>
  </Tooltip>
)

DevelopmentToolButton.propTypes = {
  icon: PropTypes.elementType.isRequired,
  tooltip: PropTypes.string.isRequired,
  handleActivate: PropTypes.func.isRequired,
  isActive: PropTypes.bool.isRequired,
}

export default DevelopmentToolButton
