import type { MutationCtx, QueryCtx } from "../_generated/server"
import type { Id } from "../_generated/dataModel"

export async function getRegistration(
  ctx: MutationCtx | QueryCtx,
  eventId: Id<"events">,
  participantId: Id<"participants">,
) {
  return ctx.db
    .query("eventParticipants")
    .withIndex("by_event_participant", (q) =>
      q.eq("event_id", eventId).eq("participant_id", participantId),
    )
    .unique()
}

export async function ensureRegistration(
  ctx: MutationCtx,
  eventId: Id<"events">,
  participantId: Id<"participants">,
) {
  const existing = await getRegistration(ctx, eventId, participantId)
  if (existing) {
    return existing._id
  }

  return ctx.db.insert("eventParticipants", {
    event_id: eventId,
    participant_id: participantId,
  })
}
