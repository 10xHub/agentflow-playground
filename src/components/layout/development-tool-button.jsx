import PropTypes from "prop-types"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * DevelopmentToolButton component renders a development tool button with tooltip
 * @returns {object} Development tool button with icon and tooltip
 */
const DevelopmentToolButton = ({
  icon: Icon,
  tooltip,
  handleActivate,
  isActive,
  disabled = false,
  text = "",
}) => {
  const handleClick = disabled ? undefined : handleActivate

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClick}
          disabled={disabled}
          className={`h-8 w-8 p-0 text-muted-foreground transition-colors ${
            disabled
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-accent hover:text-accent-foreground"
          } ${isActive && !disabled ? "bg-accent text-accent-foreground" : ""}`}
          aria-label={tooltip}
        >
          {text} <Icon className="h-[18px] w-[18px]" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{disabled ? "Configure backend URL in Settings first" : tooltip}</p>
      </TooltipContent>
    </Tooltip>
  )
}

DevelopmentToolButton.propTypes = {
  icon: PropTypes.elementType.isRequired,
  tooltip: PropTypes.string.isRequired,
  handleActivate: PropTypes.func.isRequired,
  isActive: PropTypes.bool.isRequired,
  disabled: PropTypes.bool,
  text: PropTypes.string,
}

DevelopmentToolButton.defaultProps = {
  disabled: false,
  text: "",
}

export default DevelopmentToolButton
