import { SectionCard } from "@/components/ui/section-card"

export default function AdminEventsPage() {
  return (
    <div className="grid gap-4">
      <SectionCard
        title="Event Management"
        description="Create, edit, delete events, assign series, and manage event schedules."
      />
      <SectionCard
        title="CSV Participant Import"
        description="Upload participant CSV files during event creation or editing."
      />
    </div>
  )
}
