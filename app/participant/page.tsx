import { SectionCard } from "@/components/ui/section-card"
import { Shell } from "@/components/ui/shell"

export default function ParticipantPage() {
  return (
    <Shell
      title="Participant Portal"
      description="Find your event tickets, attendance history, and series progress."
    >
      <div className="grid gap-4">
        <SectionCard
          title="Ticket Access"
          description="Enter your email to retrieve events and open a QR ticket."
        />
        <SectionCard
          title="Attendance Table"
          description="View attended, missed, and upcoming events in one place."
        />
        <SectionCard
          title="Series Progress"
          description="Track certificate eligibility for event series."
        />
      </div>
    </Shell>
  )
}
