import { v } from "convex/values"

import { mutation, query } from "./_generated/server"
import { requireAdmin } from "./lib/auth"
import { getAttendanceRecord } from "./lib/attendance"
import { invariant } from "./lib/errors"
import { getParticipantByEmail, normalizeEmail } from "./lib/participants"
import { getRegistration } from "./lib/registrations"
import { verifyQrToken } from "./lib/qr"

export const getAttendance = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const records = await ctx.db
      .query("attendance")
      .withIndex("by_event", (q) => q.eq("event_id", args.eventId))
      .collect()

    return Promise.all(
      records.map(async (record) => {
        const participant = await ctx.db.get(record.participant_id)
        return {
          attendanceId: record._id,
          participantId: record.participant_id,
          name: participant?.name ?? "Unknown",
          email: participant?.email ?? "",
          scannedAt: record.scanned_at,
        }
      }),
    )
  },
})

export const getParticipantAttendance = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const participant = await getParticipantByEmail(ctx, normalizeEmail(args.email))
    if (!participant) {
      return []
    }

    const records = await ctx.db
      .query("attendance")
      .withIndex("by_participant", (q) => q.eq("participant_id", participant._id))
      .collect()

    return Promise.all(
      records.map(async (record) => {
        const event = await ctx.db.get(record.event_id)
        return {
          attendanceId: record._id,
          eventId: record.event_id,
          eventName: event?.name ?? "Unknown",
          scannedAt: record.scanned_at,
        }
      }),
    )
  },
})

export const markAttendance = mutation({
  args: {
    token: v.optional(v.string()),
    eventId: v.optional(v.id("events")),
    participantId: v.optional(v.id("participants")),
    scannedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    let eventId = args.eventId
    let participantId = args.participantId

    if (args.token) {
      const payload = await verifyQrToken(args.token)
      eventId = payload.event_id
      participantId = payload.participant_id
    }

    invariant(eventId, "eventId is required")
    invariant(participantId, "participantId is required")

    const event = await ctx.db.get(eventId)
    if (!event) {
      throw new Error("Event not found")
    }

    const registration = await getRegistration(ctx, eventId, participantId)
    if (!registration) {
      throw new Error("Participant is not registered for this event")
    }

    const now = Date.now()
    const validFrom = event.start_time - 30 * 60 * 1000
    const validUntil = event.end_time
    invariant(now >= validFrom && now <= validUntil, "QR token not valid at this time")

    const existingAttendance = await getAttendanceRecord(ctx, eventId, participantId)
    if (existingAttendance) {
      return {
        alreadyRecorded: true,
        attendanceId: existingAttendance._id,
        scannedAt: existingAttendance.scanned_at,
      }
    }

    const scannedAt = args.scannedAt ?? Date.now()
    const attendanceId = await ctx.db.insert("attendance", {
      event_id: eventId,
      participant_id: participantId,
      scanned_at: scannedAt,
    })

    const participant = await ctx.db.get(participantId)
    return {
      alreadyRecorded: false,
      attendanceId,
      participant: participant
        ? {
            name: participant.name,
            email: participant.email,
          }
        : null,
      event: {
        id: event._id,
        name: event.name,
      },
      scannedAt,
    }
  },
})

export const previewQrToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const payload = await verifyQrToken(args.token)

    const event = await ctx.db.get(payload.event_id)
    if (!event) {
      throw new Error("Event not found for QR token")
    }
    const participant = await ctx.db.get(payload.participant_id)
    if (!participant) {
      throw new Error("Participant not found for QR token")
    }
    const registration = await getRegistration(ctx, payload.event_id, payload.participant_id)
    if (!registration) {
      throw new Error("Participant is not registered for this event")
    }

    return {
      participantName: participant.name,
      participantEmail: participant.email,
      eventName: event.name,
      expiresAt: payload.exp,
    }
  },
})

export const updateAttendance = mutation({
  args: {
    attendanceId: v.id("attendance"),
    scannedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const record = await ctx.db.get(args.attendanceId)
    if (!record) {
      throw new Error("Attendance record not found")
    }
    await ctx.db.patch(args.attendanceId, { scanned_at: args.scannedAt })
  },
})

export const deleteAttendance = mutation({
  args: { attendanceId: v.id("attendance") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const record = await ctx.db.get(args.attendanceId)
    if (!record) {
      throw new Error("Attendance record not found")
    }
    await ctx.db.delete(args.attendanceId)
  },
})
