import type { QueryCtx, MutationCtx } from "../_generated/server"

type Ctx = QueryCtx | MutationCtx

function parseAdminEmails() {
  const raw = process.env.ADMIN_EMAILS ?? ""
  return new Set(
    raw
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  )
}

export async function requireAdmin(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new Error("Unauthorized")
  }

  const admins = parseAdminEmails()
  if (admins.size === 0) {
    throw new Error("Admin allowlist is not configured")
  }

  const email =
    typeof identity.email === "string" ? identity.email.trim().toLowerCase() : ""
  if (!email || !admins.has(email)) {
    throw new Error("Forbidden")
  }

  return identity
}
