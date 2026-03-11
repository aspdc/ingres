import { v } from "convex/values"

import { query } from "./_generated/server"
import { createSignedQrToken } from "./lib/qr"
import { getParticipantByEmail, normalizeEmail } from "./lib/participants"
import { getRegistration } from "./lib/registrations"

export const getParticipantTicket = query({
  args: {
    email: v.string(),
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const participant = await getParticipantByEmail(ctx, normalizeEmail(args.email))
    if (!participant) {
      throw new Error("Participant not found")
    }

    const event = await ctx.db.get(args.eventId)
    if (!event) {
      throw new Error("Event not found")
    }

    const registration = await getRegistration(ctx, event._id, participant._id)
    if (!registration) {
      return {
        registered: false,
        message: "You are not registered for this event.",
      }
    }

    const token = await createSignedQrToken({
      participant_id: participant._id,
      event_id: event._id,
      exp: event.end_time,
    })

    return {
      registered: true,
      token,
      participant: {
        id: participant._id,
        name: participant.name,
        email: participant.email,
      },
      event: {
        id: event._id,
        name: event.name,
        startTime: event.start_time,
        endTime: event.end_time,
      },
    }
  },
})
