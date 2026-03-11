import type { Id } from "../_generated/dataModel"
import { invariant } from "./errors"

type QrPayload = {
  participant_id: Id<"participants">
  event_id: Id<"events">
  exp: number
}

function base64urlEncode(input: string) {
  return btoa(input).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")
}

function base64urlDecode(input: string) {
  const normalized = input.replaceAll("-", "+").replaceAll("_", "/")
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")
  return atob(padded)
}

async function signPayload(payloadBase64: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payloadBase64),
  )

  const bytes = new Uint8Array(signatureBuffer)
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return base64urlEncode(binary)
}

function getSecret() {
  const secret = process.env.QR_SIGNING_SECRET
  invariant(secret && secret.trim().length > 0, "QR_SIGNING_SECRET is not configured")
  return secret
}

export async function createSignedQrToken(payload: QrPayload) {
  const encodedPayload = base64urlEncode(JSON.stringify(payload))
  const signature = await signPayload(encodedPayload, getSecret())
  return `${encodedPayload}.${signature}`
}

export async function verifyQrToken(token: string) {
  const [payloadBase64, signature] = token.split(".")
  invariant(payloadBase64 && signature, "Malformed QR token")

  const expectedSignature = await signPayload(payloadBase64, getSecret())
  invariant(signature === expectedSignature, "Invalid QR signature")

  const rawPayload = base64urlDecode(payloadBase64)
  const payload = JSON.parse(rawPayload) as Partial<QrPayload>
  invariant(payload.participant_id, "QR payload missing participant_id")
  invariant(payload.event_id, "QR payload missing event_id")
  invariant(typeof payload.exp === "number", "QR payload missing exp")
  invariant(payload.exp > Date.now(), "QR token is expired")

  return payload as QrPayload
}
