import type { MutationCtx, QueryCtx } from "../_generated/server"
import type { Id } from "../_generated/dataModel"

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export async function getParticipantByEmail(
  ctx: QueryCtx | MutationCtx,
  email: string,
) {
  const normalized = normalizeEmail(email)
  return ctx.db
    .query("participants")
    .withIndex("by_email", (q) => q.eq("email", normalized))
    .unique()
}

export async function ensureParticipant(
  ctx: MutationCtx,
  args: {
    name: string
    email: string
  },
): Promise<Id<"participants">> {
  const normalizedEmail = normalizeEmail(args.email)
  const existing = await getParticipantByEmail(ctx, normalizedEmail)
  if (existing) {
    if (existing.name !== args.name.trim()) {
      await ctx.db.patch(existing._id, { name: args.name.trim() })
    }
    return existing._id
  }

  return ctx.db.insert("participants", {
    name: args.name.trim(),
    email: normalizedEmail,
  })
}
