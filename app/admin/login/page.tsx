import { SectionCard } from "@/components/ui/section-card"

export default function AdminLoginPage() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center px-4 py-6 sm:px-6">
      <SectionCard
        title="Admin Sign In"
        description="Authentication will be wired to Convex password auth in Phase 2."
      />
    </main>
  )
}
