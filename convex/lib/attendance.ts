import type { MutationCtx, QueryCtx } from "../_generated/server"
import type { Id } from "../_generated/dataModel"

export async function getAttendanceRecord(
  ctx: MutationCtx | QueryCtx,
  eventId: Id<"events">,
  participantId: Id<"participants">,
) {
  return ctx.db
    .query("attendance")
    .withIndex("by_event_participant", (q) =>
      q.eq("event_id", eventId).eq("participant_id", participantId),
    )
    .unique()
}
