"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { useAuthActions } from "@convex-dev/auth/react"
import { toast } from "sonner"

export function SignOutButton() {
  const router = useRouter()
  const { signOut } = useAuthActions()
  const [isPending, startTransition] = useTransition()

  return (
    <button
      type="button"
      onClick={() => {
        startTransition(async () => {
          try {
            await signOut()
            toast.success("Signed out")
            router.replace("/admin/login")
          } catch {
            toast.error("Failed to sign out")
          }
        })
      }}
      disabled={isPending}
      className="inline-flex rounded-md border px-3 py-1.5 text-sm transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  )
}
