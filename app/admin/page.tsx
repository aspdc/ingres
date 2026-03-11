import { SectionCard } from "@/components/ui/section-card"
import { ArrowRight } from "lucide-react"

export default function AdminOverviewPage() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SectionCard
        title="Event Operations"
        description="Create, update, and manage event participants and CSV imports."
      >
        <a
          href="/admin/events"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary"
        >
          Open events <ArrowRight className="h-4 w-4" />
        </a>
      </SectionCard>
      <SectionCard
        title="Attendance Ops"
        description="Mark attendance, correct timestamps, and export attendance sheets."
      >
        <a
          href="/admin/attendance"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary"
        >
          Open attendance <ArrowRight className="h-4 w-4" />
        </a>
      </SectionCard>
      <SectionCard
        title="Series Certificates"
        description="Configure eligibility rules and export certificate lists."
      >
        <a href="/admin/series" className="inline-flex items-center gap-2 text-sm font-medium text-primary">
          Open series <ArrowRight className="h-4 w-4" />
        </a>
      </SectionCard>
      <SectionCard
        title="Scanner Workflow"
        description="Scan signed QR tokens from camera or manual token input."
      >
        <a href="/admin/scanner" className="inline-flex items-center gap-2 text-sm font-medium text-primary">
          Open scanner <ArrowRight className="h-4 w-4" />
        </a>
      </SectionCard>
    </div>
  )
}
