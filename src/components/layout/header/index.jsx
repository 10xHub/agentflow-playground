import { AnimatedThemeToggler } from "@/components/magicui/animated-theme-toggler"

import LanguageNav from "./language-nav"
import UserNav from "./user-nav"
// import SheetMenu from "../sidebars/sheet-menu"

/**
 * Navbar component renders the top navigation bar with user controls.
 */
const Navbar = () => {
  return (
    <header className="sticky top-0 z-10 w-full bg-background/95 shadow-sm backdrop-blur-sm supports-backdrop-filter:bg-background/60 dark:shadow-secondary">
      <div className="mx-4 sm:mx-8 flex h-14 items-center">
        {/* <div className="flex items-center space-x-4 lg:space-x-0">
          <SheetMenu />
        </div> */}
        <div className="flex gap-x-5 flex-1 items-center space-x-2 justify-end">
          <LanguageNav />
          <AnimatedThemeToggler className="rounded-full w-8 h-8 bg-background border border-input hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center" />
          <UserNav />
        </div>
      </div>
    </header>
  )
}

export default Navbar
