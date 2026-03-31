import { Ellipsis, LogOut } from "lucide-react"
import PropTypes from "prop-types"
import { Link, useLocation } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip"
import { getMenuList } from "@/lib/menuList"
import { cn } from "@/lib/utils"

import CollapseMenuButton from "./CollapseMenuButton"

/**
 * Menu sidebar navigation component.
 * @param {boolean} isOpen - Whether the sidebar is open.
 */
const Menu = ({ isOpen }) => {
  const state = useLocation()
  const menuList = getMenuList(state.pathname)

  return (
    <ScrollArea className="[&>div>div[style]]:block!">
      <nav className="mt-4 h-full w-full">
        <ul className="flex flex-col min-h-[calc(90vh-48px-36px-16px-32px)] lg:min-h-[calc(90vh-32px-40px-32px)] items-start space-y-1 px-2">
          {menuList.map(({ groupLabel, menus }) => (
            <MenuGroup
              key={groupLabel}
              groupLabel={groupLabel}
              menus={menus}
              isOpen={isOpen}
            />
          ))}
          <SignOutButton isOpen={isOpen} />
        </ul>
      </nav>
    </ScrollArea>
  )
}

/**
 * Renders a group of menu items, optionally with a group label.
 */
const MenuGroup = ({ groupLabel, menus, isOpen }) => (
  <li className={cn("w-full mt-0", groupLabel ? "py-2" : "")}>
    {isOpen && groupLabel ? (
      <p className="text-sm mb-2 font-medium text-muted-foreground px-4  max-w-[248px] truncate">
        {groupLabel}
      </p>
    ) : (
      !isOpen &&
      groupLabel && (
        <TooltipProvider>
          <Tooltip delayDuration={100}>
            <TooltipTrigger className="w-full">
              <div className="w-full flex justify-center items-center">
                <Ellipsis className="h-5 w-5" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{groupLabel}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    )}

    {menus.map(({ href, label, icon: Icon, active, submenus }) =>
      submenus.length === 0 ? (
        <MenuItem
          key={label}
          href={href}
          label={label}
          Icon={Icon}
          active={active}
          isOpen={isOpen}
        />
      ) : (
        <div className="w-full" key={label}>
          <CollapseMenuButton
            icon={Icon}
            label={label}
            active={active}
            submenus={submenus}
            isOpen={isOpen}
          />
        </div>
      )
    )}
  </li>
)

/**
 * Renders a single menu item (without submenus).
 */
const MenuItem = ({ href, label, Icon, active, isOpen }) => (
  <div className="w-full">
    <TooltipProvider disableHoverableContent>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <Button
            variant={active ? "secondary" : "ghost"}
            className="w-full justify-start h-10 mb-1"
            asChild
          >
            <Link to={href} className="mb-0">
              <span className={cn(isOpen === false ? "" : "mr-4")}>
                <Icon size={18} />
              </span>
              <p
                className={cn(
                  "max-w-[200px] truncate mb-0",
                  isOpen === false
                    ? "-translate-x-96 opacity-0"
                    : "translate-x-0 opacity-100"
                )}
              >
                {label}
              </p>
            </Link>
          </Button>
        </TooltipTrigger>
        {isOpen === false && (
          <TooltipContent side="right">{label}</TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  </div>
)

/**
 * Renders the sign out button at the bottom of the menu.
 */
const SignOutButton = ({ isOpen }) => (
  <li className="w-full grow flex items-end relative">
    <TooltipProvider disableHoverableContent>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <Button
            onClick={() => {}}
            variant="outline"
            className="w-full absolute bottom-0 justify-center h-10 mt-5"
          >
            <span className={cn(isOpen === false ? "" : "mr-4")}>
              <LogOut size={18} />
            </span>
            <p
              className={cn(
                "whitespace-nowrap",
                isOpen === false ? "opacity-0 hidden" : "opacity-100"
              )}
            >
              Sign out
            </p>
          </Button>
        </TooltipTrigger>
        {isOpen === false && (
          <TooltipContent side="right">Sign out</TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  </li>
)

MenuGroup.propTypes = {
  groupLabel: PropTypes.string.isRequired,
  menus: PropTypes.arrayOf(
    PropTypes.shape({
      href: PropTypes.string,
      label: PropTypes.string.isRequired,
      icon: PropTypes.elementType.isRequired,
      active: PropTypes.bool,
      submenus: PropTypes.array.isRequired,
    })
  ).isRequired,
  isOpen: PropTypes.bool.isRequired,
}

MenuItem.propTypes = {
  href: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  Icon: PropTypes.elementType.isRequired,
  active: PropTypes.bool,
  isOpen: PropTypes.bool.isRequired,
}

MenuItem.defaultProps = {
  active: false,
}

SignOutButton.propTypes = {
  isOpen: PropTypes.bool.isRequired,
}

Menu.propTypes = {
  isOpen: PropTypes.bool.isRequired,
}
