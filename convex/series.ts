import { v } from "convex/values"

import { mutation, query } from "./_generated/server"
import type { QueryCtx } from "./_generated/server"
import type { Id } from "./_generated/dataModel"
import { requireAdmin } from "./lib/auth"
import { getParticipantByEmail, normalizeEmail } from "./lib/participants"

type ProgressResult = {
  seriesId: string
  seriesName: string
  minEventsRequired: number
  requiredEventId: string | null
  requiredEventName: string | null
  attendedCount: number
  totalSeriesEvents: number
  hasRequiredEvent: boolean
  eligible: boolean
}

async function computeSeriesProgressForParticipant(
  ctx: QueryCtx,
  participantId: Id<"participants">
) {
  const allSeries = await ctx.db.query("series").collect()
  const registrations = await ctx.db
    .query("eventParticipants")
    .withIndex("by_participant", (q) => q.eq("participant_id", participantId))
    .collect()

  const registrationEventIds = new Set(
    registrations.map((registration) => registration.event_id)
  )
  const attendance = await ctx.db
    .query("attendance")
    .withIndex("by_participant", (q) => q.eq("participant_id", participantId))
    .collect()
  const attendedEventIds = new Set(attendance.map((item) => item.event_id))

  const progress: ProgressResult[] = []
  for (const item of allSeries) {
    const seriesEvents = await ctx.db
      .query("events")
      .withIndex("by_series", (q) => q.eq("series_id", item._id))
      .collect()

    const relevantEvents = seriesEvents.filter((event) =>
      registrationEventIds.has(event._id)
    )
    const attendedInSeries = relevantEvents.filter((event) =>
      attendedEventIds.has(event._id)
    )
    const requiredEvent = item.required_event_id
      ? (seriesEvents.find((event) => event._id === item.required_event_id) ??
        null)
      : null
    const hasRequiredEvent = item.required_event_id
      ? attendedEventIds.has(item.required_event_id)
      : true

    progress.push({
      seriesId: item._id,
      seriesName: item.name,
      minEventsRequired: item.min_events_required,
      requiredEventId: item.required_event_id ?? null,
      requiredEventName: requiredEvent?.name ?? null,
      attendedCount: attendedInSeries.length,
      totalSeriesEvents: seriesEvents.length,
      hasRequiredEvent,
      eligible:
        attendedInSeries.length >= item.min_events_required &&
        hasRequiredEvent &&
        relevantEvents.length > 0,
    })
  }

  return progress
}

export const getSeries = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("series").withIndex("by_name").collect()
  },
})

export const getSeriesProgress = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const participant = await getParticipantByEmail(
      ctx,
      normalizeEmail(args.email)
    )
    if (!participant) {
      return []
    }

    return computeSeriesProgressForParticipant(ctx, participant._id)
  },
})

export const createSeries = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    min_events_required: v.number(),
    required_event_id: v.optional(v.id("events")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    if (args.min_events_required < 1) {
      throw new Error("min_events_required must be at least 1")
    }
    if (args.required_event_id) {
      const event = await ctx.db.get(args.required_event_id)
      if (!event) {
        throw new Error("required_event_id does not exist")
      }
    }

    const seriesId = await ctx.db.insert("series", {
      name: args.name.trim(),
      description: args.description.trim(),
      min_events_required: args.min_events_required,
      required_event_id: args.required_event_id,
    })
    return { seriesId }
  },
})

export const updateSeries = mutation({
  args: {
    seriesId: v.id("series"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    min_events_required: v.optional(v.number()),
    required_event_id: v.optional(v.id("events")),
    clear_required_event: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const item = await ctx.db.get(args.seriesId)
    if (!item) {
      throw new Error("Series not found")
    }

    if (
      args.min_events_required !== undefined &&
      args.min_events_required < 1
    ) {
      throw new Error("min_events_required must be at least 1")
    }
    if (args.required_event_id) {
      const event = await ctx.db.get(args.required_event_id)
      if (!event) {
        throw new Error("required_event_id does not exist")
      }
    }
    if (args.clear_required_event && args.required_event_id) {
      throw new Error("Cannot set and clear required_event_id at the same time")
    }

    await ctx.db.patch(args.seriesId, {
      ...(args.name ? { name: args.name.trim() } : {}),
      ...(args.description ? { description: args.description.trim() } : {}),
      ...(args.min_events_required !== undefined
        ? { min_events_required: args.min_events_required }
        : {}),
      ...(args.clear_required_event ? { required_event_id: undefined } : {}),
      ...(args.required_event_id !== undefined
        ? { required_event_id: args.required_event_id }
        : {}),
    })
  },
})
