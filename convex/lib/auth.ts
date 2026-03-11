import type { QueryCtx, MutationCtx } from "../_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"

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
  const userId = await getAuthUserId(ctx)
  if (!userId) {
    throw new Error("Unauthorized")
  }
  const user = await ctx.db.get(userId)

  const admins = parseAdminEmails()
  if (admins.size === 0) {
    throw new Error("Admin allowlist is not configured")
  }

  const email = typeof user?.email === "string" ? user.email.trim().toLowerCase() : ""
  if (!email || !admins.has(email)) {
    throw new Error("Forbidden")
  }

  return user
}
