import { ConvexHttpClient } from "convex/browser"

import { api } from "../convex/_generated/api"

function usage() {
  console.log(
    "Usage: bun run create:user -- <email> <password> [name]\nExample: bun run create:user -- admin@example.com supersecret \"Admin User\"",
  )
}

const [, , ...args] = process.argv
const emailArg = args[0]?.trim().toLowerCase()
const password = args[1]
const nameArg = args[2]?.trim()

if (!emailArg || !password) {
  usage()
  process.exit(1)
}

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
if (!convexUrl) {
  console.error("NEXT_PUBLIC_CONVEX_URL is missing")
  process.exit(1)
}

const name = nameArg && nameArg.length > 0 ? nameArg : emailArg.split("@")[0]
const client = new ConvexHttpClient(convexUrl)

try {
  const result = await client.action(api.auth.signIn, {
    provider: "password",
    params: {
      flow: "signUp",
      email: emailArg,
      password,
      name,
    },
  })

  if (result?.started === false) {
    console.log("User creation started but requires extra verification.")
    process.exit(0)
  }

  console.log(`User created: ${emailArg}`)
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown error"
  if (message.toLowerCase().includes("already exists")) {
    console.error(`User already exists: ${emailArg}`)
  } else {
    console.error(`Failed to create user: ${message}`)
  }
  process.exit(1)
}
