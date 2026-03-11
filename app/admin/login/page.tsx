"use client"

import { FormEvent, useMemo, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuthActions } from "@convex-dev/auth/react"
import { toast } from "sonner"

import { SectionCard } from "@/components/ui/section-card"

type AuthMode = "signIn" | "signUp"

export default function AdminLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn } = useAuthActions()
  const [mode, setMode] = useState<AuthMode>("signIn")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isPending, startTransition] = useTransition()

  const nextPath = useMemo(() => searchParams.get("next") ?? "/admin", [searchParams])

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    startTransition(async () => {
      try {
        const payload: Record<string, string> = {
          flow: mode,
          email: email.trim().toLowerCase(),
          password,
        }
        if (mode === "signUp") {
          payload.name = name.trim()
        }

        const result = await signIn("password", payload)
        if (!result.signingIn) {
          toast.message("Additional verification may be required")
          return
        }
        toast.success(mode === "signIn" ? "Signed in" : "Account created")
        router.replace(nextPath)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Authentication failed"
        toast.error(message)
      }
    })
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center px-4 py-6 sm:px-6">
      <SectionCard title="Admin Sign In" description="Use your admin email and password.">
        <div className="mb-4 inline-flex rounded-md border p-1">
          <button
            type="button"
            onClick={() => setMode("signIn")}
            className={`rounded px-3 py-1.5 text-sm ${
              mode === "signIn" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("signUp")}
            className={`rounded px-3 py-1.5 text-sm ${
              mode === "signUp" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          {mode === "signUp" ? (
            <label className="block space-y-1">
              <span className="text-sm">Name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-0 focus:border-primary"
                placeholder="John Doe"
              />
            </label>
          ) : null}

          <label className="block space-y-1">
            <span className="text-sm">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-0 focus:border-primary"
              placeholder="admin@example.com"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-0 focus:border-primary"
              placeholder="********"
            />
          </label>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Please wait..." : mode === "signIn" ? "Sign in" : "Create account"}
          </button>
        </form>
      </SectionCard>
    </main>
  )
}
