import { buildHeaders, fetchWithTimeout } from "10xgraph-client"

// GET /v1/me: who the caller is and what they may do. The published client has no
// me() method yet, so this uses the client's own request helpers with the same
// credentials. Returns null when the answer is unknown (older server without the
// route, network error, auth off, odd body): callers then show everything.
export const fetchMe = async (config) => {
  try {
    const res = await fetchWithTimeout(
      { timeout: 10000, auth: config.auth },
      `${config.baseUrl}/v1/me`,
      {
        headers: buildHeaders(config, { Accept: "application/json" }),
        ...(config.credentials ? { credentials: config.credentials } : {}),
      }
    )
    if (!res.ok) return null
    return parseMe((await res.json())?.data)
  } catch {
    return null
  }
}

// Normalize the `data` block; null for auth off or an unrecognized shape.
export const parseMe = (data) => {
  if (!data || data.auth === "off" || !Array.isArray(data.permissions)) {
    return null
  }
  return {
    userId: data.user_id ?? null,
    tenant: data.tenant ?? {},
    roles: Array.isArray(data.roles) ? data.roles : [],
    permissions: data.permissions,
    reach: data.reach ?? "own",
  }
}

// Same wildcard rules as the server's Identity.can: "*", "resource:*", exact.
// With no identity (auth off or unknown) everything is allowed.
export const can = (me, permission) => {
  if (!me) return true
  const { permissions } = me
  if (permissions.includes("*") || permissions.includes(permission)) {
    return true
  }
  return permissions.includes(`${permission.split(":", 1)[0]}:*`)
}
