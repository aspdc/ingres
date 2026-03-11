import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"
import { authTables } from "@convex-dev/auth/server"

export default defineSchema({
  ...authTables,

  admins: defineTable({
    email: v.string(),
    added_at: v.number(),
  }).index("by_email", ["email"]),

  participants: defineTable({
    name: v.string(),
    email: v.string(),
  })
    .index("by_email", ["email"])
    .index("by_name", ["name"]),

  series: defineTable({
    name: v.string(),
    description: v.string(),
    min_events_required: v.number(),
    required_event_id: v.optional(v.id("events")),
  }).index("by_name", ["name"]),

  events: defineTable({
    name: v.string(),
    description: v.string(),
    start_time: v.number(),
    end_time: v.number(),
    series_id: v.optional(v.id("series")),
  })
    .index("by_series", ["series_id"])
    .index("by_start_time", ["start_time"]),

  eventParticipants: defineTable({
    event_id: v.id("events"),
    participant_id: v.id("participants"),
  })
    .index("by_event", ["event_id"])
    .index("by_participant", ["participant_id"])
    .index("by_event_participant", ["event_id", "participant_id"]),

  attendance: defineTable({
    event_id: v.id("events"),
    participant_id: v.id("participants"),
    scanned_at: v.number(),
  })
    .index("by_event", ["event_id"])
    .index("by_participant", ["participant_id"])
    .index("by_event_participant", ["event_id", "participant_id"]),
})
