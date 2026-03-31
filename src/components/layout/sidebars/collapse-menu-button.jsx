import { DropdownMenuArrow } from "@radix-ui/react-dropdown-menu"
import { ChevronDown, Dot } from "lucide-react"
import PropTypes from "prop-types"
import { useState } from "react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

/**
 * CollapseMenuButton renders a sidebar menu button with collapsible submenus or a dropdown menu,
 * depending on the sidebar's open state.
 */
const CollapseMenuButton = ({
  icon: Icon,
  label,
  active,
  submenus,
  isOpen,
}) => {
  const isSubmenuActive = submenus.some((submenu) => submenu.active)
  const [isCollapsed, setIsCollapsed] = useState(isSubmenuActive)

  const toggleClassname = isOpen
    ? "translate-x-0 opacity-100"
    : "-translate-x-96 opacity-0"

  const handleOpenChange = (open) => {
    setIsCollapsed(open)
  }

  return isOpen ? (
    <Collapsible
      open={isCollapsed}
      onOpenChange={handleOpenChange}
      className="w-full"
    >
      <CollapsibleMenuContent
        Icon={Icon}
        label={label}
        active={active}
        submenus={submenus}
        toggleClassname={toggleClassname}
      />
    </Collapsible>
  ) : (
    <DropdownMenuButton
      Icon={Icon}
      label={label}
      active={active}
      submenus={submenus}
      isOpen={isOpen}
    />
  )
}

const CollapsibleMenuContent = ({
  Icon,
  label,
  active,
  submenus,
  toogleClassname,
}) => (
  <>
    <CollapsibleTrigger
      className="[&[data-state=open]>div>div>svg]:rotate-180 mb-1"
      asChild
    >
      <Button
        variant={active ? "secondary" : "ghost"}
        className="w-full justify-start h-10"
      >
        <div className="w-full items-center flex justify-between">
          <div className="flex items-center">
            <span className="mr-4">
              <Icon size={18} />
            </span>
            <p className={cn("max-w-[150px] truncate", toogleClassname)}>
              {label}
            </p>
          </div>
          <div className={cn("whitespace-nowrap", toogleClassname)}>
            <ChevronDown
              size={18}
              className="transition-transform duration-200"
            />
          </div>
        </div>
      </Button>
    </CollapsibleTrigger>
    <CollapsibleContent className="overflow-hidden duration-200 transition-[width] ease-in-ou data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
      {submenus.map(({ href, slabel, sActive }) => (
        <Button
          key={href}
          variant={sActive ? "secondary" : "ghost"}
          className="w-full justify-start h-10 mb-1 text-muted-foreground"
          asChild
        >
          <Link to={href}>
            <span className="ml-5 mr-2">
              <Dot size={18} />
            </span>
            <p className={cn(" max-w-[170px] truncate", toogleClassname)}>
              {slabel}
            </p>
          </Link>
        </Button>
      ))}
    </CollapsibleContent>
  </>
)

const DropdownMenuButton = ({ Icon, label, active, submenus, isOpen }) => (
  <DropdownMenu>
    <TooltipProvider disableHoverableContent>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant={active ? "secondary" : "ghost"}
              className="w-full justify-start h-10 mb-1"
            >
              <div className="w-full items-center flex justify-between">
                <div className="flex items-center">
                  <span className={cn(isOpen === false ? "" : "mr-4")}>
                    <Icon size={18} />
                  </span>
                  <p
                    className={cn(
                      "max-w-[200px] truncate",
                      isOpen === false ? "opacity-0" : "opacity-100"
                    )}
                  >
                    {label}
                  </p>
                </div>
              </div>
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="right" align="start" alignOffset={2}>
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
    <DropdownMenuContent side="right" sideOffset={25} align="start">
      <DropdownMenuLabel className="max-w-[190px] truncate">
        {label}
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      {submenus.map(({ href, sLabel2 }) => (
        <DropdownMenuItem key={href} asChild>
          <Link className="cursor-pointer" to={href}>
            <p className="max-w-[180px] truncate">{sLabel2}</p>
          </Link>
        </DropdownMenuItem>
      ))}
      <DropdownMenuArrow className="fill-border" />
    </DropdownMenuContent>
  </DropdownMenu>
)

CollapseMenuButton.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  active: PropTypes.bool,
  submenus: PropTypes.arrayOf(
    PropTypes.shape({
      href: PropTypes.string.isRequired,
      slabel: PropTypes.string,
      sLabel2: PropTypes.string,
      sActive: PropTypes.bool,
    })
  ).isRequired,
  isOpen: PropTypes.bool.isRequired,
}

CollapseMenuButton.defaultProps = {
  active: false,
}

CollapsibleMenuContent.propTypes = {
  Icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  active: PropTypes.bool,
  submenus: PropTypes.arrayOf(
    PropTypes.shape({
      href: PropTypes.string.isRequired,
      slabel: PropTypes.string.isRequired,
      sActive: PropTypes.bool,
    })
  ).isRequired,
  toogleClassname: PropTypes.string,
}

CollapsibleMenuContent.defaultProps = {
  active: false,
  toogleClassname: "",
}

DropdownMenuButton.propTypes = {
  Icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  active: PropTypes.bool,
  submenus: PropTypes.arrayOf(
    PropTypes.shape({
      href: PropTypes.string.isRequired,
      sLabel2: PropTypes.string.isRequired,
    })
  ).isRequired,
  isOpen: PropTypes.bool.isRequired,
}

DropdownMenuButton.defaultProps = {
  active: false,
}

export default CollapseMenuButton
