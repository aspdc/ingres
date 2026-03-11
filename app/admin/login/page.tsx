"use client"

import { useMemo, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuthActions } from "@convex-dev/auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { z } from "zod"

import { SectionCard } from "@/components/ui/section-card"

const authFormSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters"),
})
type AuthFormValues = z.infer<typeof authFormSchema>

export default function AdminLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn } = useAuthActions()
  const [isPending, startTransition] = useTransition()
  const authForm = useForm<AuthFormValues>({
    resolver: zodResolver(authFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const nextPath = useMemo(
    () => searchParams.get("next") ?? "/admin",
    [searchParams]
  )

  function onSubmit(values: AuthFormValues) {
    startTransition(async () => {
      const normalizedEmail = values.email
      const password = values.password

      try {
        const payload = {
          flow: "signIn",
          email: normalizedEmail,
          password,
        }

        const result = await signIn("password", payload)
        if (!result.signingIn) {
          toast.message("Additional verification may be required")
          return
        }
        toast.success("Signed in")
        router.replace(nextPath)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Authentication failed"
        toast.error(message)
      }
    })
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center px-4 py-6 sm:px-6">
      <SectionCard
        title="Admin Sign In"
        description="Use your admin email and password."
      >
        <form onSubmit={authForm.handleSubmit(onSubmit)} className="space-y-3">
          <label className="block space-y-1">
            <span className="text-sm">Email</span>
            <input
              type="email"
              {...authForm.register("email")}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-0 outline-none focus:border-primary"
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
              className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-0 outline-none focus:border-primary"
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
            {isPending ? "Please wait..." : "Sign in"}
          </button>
        </form>
      </SectionCard>
    </main>
  )
}
