import { SectionCard } from "@/components/ui/section-card"

export default function AdminScannerPage() {
  return (
    <div className="grid gap-4">
      <SectionCard
        title="Scanner"
        description="Camera scanner UI will validate signed QR tokens and mark attendance."
      >
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          Mobile-first scanner controls and live scan feedback will be implemented in a
          dedicated client component in the next phase.
        </div>
      </SectionCard>
    </div>
  )
}
