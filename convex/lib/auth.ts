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

  const email = typeof user?.email === "string" ? user.email.trim().toLowerCase() : ""
  if (!email) {
    throw new Error("Forbidden")
  }

  const adminsFromEnv = parseAdminEmails()
  if (!adminsFromEnv.has(email)) {
    throw new Error("Forbidden")
  }

  return user
}
