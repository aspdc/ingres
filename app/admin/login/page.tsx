"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuthActions } from "@convex-dev/auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { z } from "zod"

import { SectionCard } from "@/components/ui/section-card"

type AuthMode = "signIn" | "signUp"
const authFormSchema = z.object({
  name: z.string().trim().optional(),
  email: z.email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters"),
})
type AuthFormValues = z.infer<typeof authFormSchema>

export default function AdminLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn } = useAuthActions()
  const [mode, setMode] = useState<AuthMode>("signIn")
  const [isPending, startTransition] = useTransition()
  const authForm = useForm<AuthFormValues>({
    resolver: zodResolver(authFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  })

  const nextPath = useMemo(() => searchParams.get("next") ?? "/admin", [searchParams])

  function onSubmit(values: AuthFormValues) {
    if (mode === "signUp" && !values.name?.trim()) {
      authForm.setError("name", { message: "Name is required for sign up" })
      return
    }
    startTransition(async () => {
      const normalizedEmail = values.email
      const normalizedName = values.name?.trim() ?? ""
      const password = values.password

      try {
        const payload: Record<string, string> = {
          flow: mode,
          email: normalizedEmail,
          password,
        }
        if (mode === "signUp") {
          payload.name = normalizedName
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

        // If user attempts sign-up with an existing email, transparently try sign-in.
        if (mode === "signUp" && message.toLowerCase().includes("already exists")) {
          try {
            const signInResult = await signIn("password", {
              flow: "signIn",
              email: normalizedEmail,
              password,
            })
            if (signInResult.signingIn) {
              toast.success("Signed in")
              router.replace(nextPath)
              return
            }
          } catch {
            // Fall through to original error message below.
          }
        }

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

        <form onSubmit={authForm.handleSubmit(onSubmit)} className="space-y-3">
          {mode === "signUp" ? (
            <label className="block space-y-1">
              <span className="text-sm">Name</span>
              <input
                {...authForm.register("name")}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-0 focus:border-primary"
                placeholder="John Doe"
              />
              {authForm.formState.errors.name ? (
                <p className="text-xs text-destructive">
                  {authForm.formState.errors.name.message}
                </p>
              ) : null}
            </label>
          ) : null}

          <label className="block space-y-1">
            <span className="text-sm">Email</span>
            <input
              type="email"
              {...authForm.register("email")}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-0 focus:border-primary"
              placeholder="admin@example.com"
            />
            {authForm.formState.errors.email ? (
              <p className="text-xs text-destructive">
                {authForm.formState.errors.email.message}
              </p>
            ) : null}
          </label>

          <label className="block space-y-1">
            <span className="text-sm">Password</span>
            <input
              type="password"
              {...authForm.register("password")}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-0 focus:border-primary"
              placeholder="********"
            />
            {authForm.formState.errors.password ? (
              <p className="text-xs text-destructive">
                {authForm.formState.errors.password.message}
              </p>
            ) : null}
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
