import { Outlet } from "react-router-dom"

const BlankLayout = () => {
  return (
    <main className="container pt-8 pb-8 px-4 sm:px-8">
      <Outlet />
    </main>
  )
}

export default BlankLayout
