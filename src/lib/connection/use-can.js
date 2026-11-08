import { useContext } from "react"

import { ConnectionContext } from "./connection-store-context"

const allowAll = () => true

/**
 * `can("threads:delete")` for the connected caller. Allows everything when auth is
 * off, /v1/me is unknown (older server) or there is no provider.
 */
export const useCan = () => useContext(ConnectionContext)?.can ?? allowAll
