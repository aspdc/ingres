import { v } from "convex/values"

import { query, mutation } from "./_generated/server"
import { ensureParticipant, getParticipantByEmail, normalizeEmail } from "./lib/participants"
import { requireAdmin } from "./lib/auth"

export const getParticipantByEmailQuery = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return getParticipantByEmail(ctx, normalizeEmail(args.email))
  },
})

export const createParticipant = mutation({
  args: {
    name: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const participantId = await ensureParticipant(ctx, args)
    return { participantId }
  },
})

export const updateParticipant = mutation({
  args: {
    participantId: v.id("participants"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const participant = await ctx.db.get(args.participantId)
    if (!participant) {
      throw new Error("Participant not found")
    }

    if (args.email) {
      const existing = await getParticipantByEmail(ctx, normalizeEmail(args.email))
      if (existing && existing._id !== args.participantId) {
        throw new Error("Another participant already has this email")
      }
    }

    await ctx.db.patch(args.participantId, {
      ...(args.name ? { name: args.name.trim() } : {}),
      ...(args.email ? { email: normalizeEmail(args.email) } : {}),
    })
  },
})

export const deleteParticipant = mutation({
  args: { participantId: v.id("participants") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const registrations = await ctx.db
      .query("eventParticipants")
      .withIndex("by_participant", (q) => q.eq("participant_id", args.participantId))
      .collect()

    for (const registration of registrations) {
      await ctx.db.delete(registration._id)
    }

    const attendanceRecords = await ctx.db
      .query("attendance")
      .withIndex("by_participant", (q) => q.eq("participant_id", args.participantId))
      .collect()

    for (const record of attendanceRecords) {
      await ctx.db.delete(record._id)
    }

    await ctx.db.delete(args.participantId)
  },
})
