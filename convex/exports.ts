import { v } from "convex/values"

import { query } from "./_generated/server"
import { requireAdmin } from "./lib/auth"
import { toCsv } from "./lib/csv"

export const exportAttendanceCSV = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const registrations = await ctx.db
      .query("eventParticipants")
      .withIndex("by_event", (q) => q.eq("event_id", args.eventId))
      .collect()

    const rows: Array<{
      name: string
      email: string
      attended: boolean
      scan_time: string | null
    }> = []

    for (const registration of registrations) {
      const participant = await ctx.db.get(registration.participant_id)
      if (!participant) {
        continue
      }
      const attendance = await ctx.db
        .query("attendance")
        .withIndex("by_event_participant", (q) =>
          q.eq("event_id", args.eventId).eq("participant_id", registration.participant_id),
        )
        .unique()

      rows.push({
        name: participant.name,
        email: participant.email,
        attended: Boolean(attendance),
        scan_time: attendance ? new Date(attendance.scanned_at).toISOString() : null,
      })
    }

    return toCsv(rows)
  },
})

export const exportCertificatesCSV = query({
  args: { seriesId: v.optional(v.id("series")) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const participants = await ctx.db.query("participants").collect()
    const seriesList = args.seriesId
      ? [await ctx.db.get(args.seriesId)].filter(
          (series): series is NonNullable<typeof series> => series !== null,
        )
      : await ctx.db.query("series").collect()

    const rows: Array<{
      name: string
      email: string
      series: string
      attended_count: number
      min_required: number
      has_required_event: boolean
      eligible: boolean
    }> = []

    for (const participant of participants) {
      const participantAttendance = await ctx.db
        .query("attendance")
        .withIndex("by_participant", (q) => q.eq("participant_id", participant._id))
        .collect()
      const attendedSet = new Set(participantAttendance.map((item) => item.event_id))

      for (const series of seriesList) {
        const seriesEvents = await ctx.db
          .query("events")
          .withIndex("by_series", (q) => q.eq("series_id", series._id))
          .collect()

        const attendedInSeries = seriesEvents.filter((event) => attendedSet.has(event._id))
        const hasRequiredEvent = series.required_event_id
          ? attendedSet.has(series.required_event_id)
          : true
        const eligible =
          attendedInSeries.length >= series.min_events_required && hasRequiredEvent

        rows.push({
          name: participant.name,
          email: participant.email,
          series: series.name,
          attended_count: attendedInSeries.length,
          min_required: series.min_events_required,
          has_required_event: hasRequiredEvent,
          eligible,
        })
      }
    }

    return toCsv(rows)
  },
})
