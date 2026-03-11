import { v } from "convex/values"

import { mutation, query } from "./_generated/server"
import { requireAdmin } from "./lib/auth"
import { getAttendanceRecord } from "./lib/attendance"
import { parseParticipantsCsv } from "./lib/csv"
import { invariant } from "./lib/errors"
import { ensureParticipant, getParticipantByEmail, normalizeEmail } from "./lib/participants"
import { ensureRegistration, getRegistration } from "./lib/registrations"

function getEventStatus(params: {
  now: number
  startTime: number
  endTime: number
  attended: boolean
}) {
  if (params.attended) {
    return "Attended" as const
  }
  if (params.now < params.startTime) {
    return "Upcoming" as const
  }
  if (params.now > params.endTime) {
    return "Missed" as const
  }
  return "Ongoing" as const
}

export const getEvents = query({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db.query("events").withIndex("by_start_time").collect()
    return events
  },
})

export const getParticipantEvents = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const participant = await getParticipantByEmail(ctx, normalizeEmail(args.email))
    if (!participant) {
      return []
    }

    const registrations = await ctx.db
      .query("eventParticipants")
      .withIndex("by_participant", (q) => q.eq("participant_id", participant._id))
      .collect()

    const now = Date.now()
    return Promise.all(
      registrations.map(async (registration) => {
        const event = await ctx.db.get(registration.event_id)
        if (!event) {
          return null
        }
        const attendance = await getAttendanceRecord(ctx, event._id, participant._id)
        return {
          eventId: event._id,
          eventName: event.name,
          startTime: event.start_time,
          endTime: event.end_time,
          status: getEventStatus({
            now,
            startTime: event.start_time,
            endTime: event.end_time,
            attended: Boolean(attendance),
          }),
          scannedAt: attendance?.scanned_at ?? null,
          seriesId: event.series_id ?? null,
        }
      }),
    ).then((rows) => rows.filter(Boolean))
  },
})

export const getEventParticipants = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const registrations = await ctx.db
      .query("eventParticipants")
      .withIndex("by_event", (q) => q.eq("event_id", args.eventId))
      .collect()

    return Promise.all(
      registrations.map(async (registration) => {
        const participant = await ctx.db.get(registration.participant_id)
        const attendance = await getAttendanceRecord(
          ctx,
          registration.event_id,
          registration.participant_id,
        )
        return {
          registrationId: registration._id,
          participantId: registration.participant_id,
          name: participant?.name ?? "Unknown",
          email: participant?.email ?? "",
          attendanceId: attendance?._id ?? null,
          attended: Boolean(attendance),
          scannedAt: attendance?.scanned_at ?? null,
        }
      }),
    )
  },
})

export const createEvent = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    start_time: v.number(),
    end_time: v.number(),
    series_id: v.optional(v.id("series")),
    participants_csv: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    invariant(args.start_time < args.end_time, "Event start_time must be before end_time")

    const eventId = await ctx.db.insert("events", {
      name: args.name.trim(),
      description: args.description.trim(),
      start_time: args.start_time,
      end_time: args.end_time,
      series_id: args.series_id,
    })

    if (args.participants_csv) {
      const rows = parseParticipantsCsv(args.participants_csv)
      for (const row of rows) {
        const participantId = await ensureParticipant(ctx, row)
        await ensureRegistration(ctx, eventId, participantId)
      }
    }

    return { eventId }
  },
})

export const updateEvent = mutation({
  args: {
    eventId: v.id("events"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    start_time: v.optional(v.number()),
    end_time: v.optional(v.number()),
    series_id: v.optional(v.id("series")),
    participants_csv: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const event = await ctx.db.get(args.eventId)
    if (!event) {
      throw new Error("Event not found")
    }

    const startTime = args.start_time ?? event.start_time
    const endTime = args.end_time ?? event.end_time
    invariant(startTime < endTime, "Event start_time must be before end_time")

    await ctx.db.patch(args.eventId, {
      ...(args.name ? { name: args.name.trim() } : {}),
      ...(args.description ? { description: args.description.trim() } : {}),
      ...(args.start_time ? { start_time: args.start_time } : {}),
      ...(args.end_time ? { end_time: args.end_time } : {}),
      ...(args.series_id !== undefined ? { series_id: args.series_id } : {}),
    })

    if (args.participants_csv) {
      const rows = parseParticipantsCsv(args.participants_csv)
      for (const row of rows) {
        const participantId = await ensureParticipant(ctx, row)
        await ensureRegistration(ctx, args.eventId, participantId)
      }
    }
  },
})

export const deleteEvent = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const registrations = await ctx.db
      .query("eventParticipants")
      .withIndex("by_event", (q) => q.eq("event_id", args.eventId))
      .collect()
    for (const registration of registrations) {
      await ctx.db.delete(registration._id)
    }

    const attendance = await ctx.db
      .query("attendance")
      .withIndex("by_event", (q) => q.eq("event_id", args.eventId))
      .collect()
    for (const record of attendance) {
      await ctx.db.delete(record._id)
    }

    const affectedSeries = await ctx.db.query("series").collect()
    for (const item of affectedSeries) {
      if (item.required_event_id === args.eventId) {
        await ctx.db.patch(item._id, { required_event_id: undefined })
      }
    }

    await ctx.db.delete(args.eventId)
  },
})

export const importParticipantsCSV = mutation({
  args: {
    eventId: v.id("events"),
    csv: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const event = await ctx.db.get(args.eventId)
    if (!event) {
      throw new Error("Event not found")
    }

    const rows = parseParticipantsCsv(args.csv)
    const registeredIds: string[] = []
    for (const row of rows) {
      const participantId = await ensureParticipant(ctx, row)
      await ensureRegistration(ctx, args.eventId, participantId)
      registeredIds.push(participantId)
    }

    return {
      eventId: args.eventId,
      importedCount: rows.length,
      participantIds: registeredIds,
    }
  },
})

export const registerParticipantForEvent = mutation({
  args: {
    eventId: v.id("events"),
    participantId: v.optional(v.id("participants")),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const event = await ctx.db.get(args.eventId)
    if (!event) {
      throw new Error("Event not found")
    }

    let participantId = args.participantId
    if (!participantId) {
      invariant(args.name && args.email, "Either participantId or name+email is required")
      participantId = await ensureParticipant(ctx, {
        name: args.name,
        email: args.email,
      })
    }

    const registrationId = await ensureRegistration(ctx, args.eventId, participantId)
    return { registrationId, participantId }
  },
})

export const removeParticipantFromEvent = mutation({
  args: {
    eventId: v.id("events"),
    participantId: v.id("participants"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const registration = await ctx.db
      .query("eventParticipants")
      .withIndex("by_event_participant", (q) =>
        q.eq("event_id", args.eventId).eq("participant_id", args.participantId),
      )
      .unique()
    if (registration) {
      await ctx.db.delete(registration._id)
    }

    const attendance = await ctx.db
      .query("attendance")
      .withIndex("by_event_participant", (q) =>
        q.eq("event_id", args.eventId).eq("participant_id", args.participantId),
      )
      .unique()
    if (attendance) {
      await ctx.db.delete(attendance._id)
    }

    return { removed: Boolean(registration) }
  },
})

export const setParticipantAttendanceStatus = mutation({
  args: {
    eventId: v.id("events"),
    participantId: v.id("participants"),
    attended: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const registration = await getRegistration(ctx, args.eventId, args.participantId)
    if (!registration) {
      throw new Error("Participant is not registered for this event")
    }

    const existingAttendance = await getAttendanceRecord(ctx, args.eventId, args.participantId)

    if (args.attended) {
      if (existingAttendance) {
        return { attendanceId: existingAttendance._id, attended: true }
      }
      const attendanceId = await ctx.db.insert("attendance", {
        event_id: args.eventId,
        participant_id: args.participantId,
        scanned_at: Date.now(),
      })
      return { attendanceId, attended: true }
    }

    if (existingAttendance) {
      await ctx.db.delete(existingAttendance._id)
    }
    return { attendanceId: null, attended: false }
  },
})
