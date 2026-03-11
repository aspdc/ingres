import { SectionCard } from "@/components/ui/section-card"

export default function AdminSeriesPage() {
  return (
    <div className="grid gap-4">
      <SectionCard
        title="Series Configuration"
        description="Define minimum events and optional required event for certificates."
      />
      <SectionCard
        title="Eligibility Preview"
        description="Review participant progress and eligibility per series."
      />
    </div>
  )
}
