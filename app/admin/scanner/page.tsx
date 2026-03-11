"use client"

import { useEffect, useRef, useState } from "react"
import { useMutation } from "convex/react"
import { BrowserMultiFormatReader } from "@zxing/browser"
import { Camera, CameraOff, QrCode, ScanLine } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { z } from "zod"

import { api } from "@/convex/_generated/api"
import { formatDateTime } from "@/lib/date"
import { SectionCard } from "@/components/ui/section-card"

const tokenSchema = z.object({
  token: z.string().trim().min(1, "QR token is required"),
})

type TokenValues = z.infer<typeof tokenSchema>

export default function AdminScannerPage() {
  const markAttendance = useMutation(api.attendance.markAttendance)
  const [isScanning, setIsScanning] = useState(false)
  const [lastResult, setLastResult] = useState<{
    name: string
    email: string
    event: string
    scannedAt: number
    alreadyRecorded: boolean
  } | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const isProcessingRef = useRef(false)
  const tokenForm = useForm<TokenValues>({
    resolver: zodResolver(tokenSchema),
    defaultValues: { token: "" },
  })

  async function processToken(token: string) {
    try {
      const result = await markAttendance({ token })
      setLastResult({
        name: result.participant?.name ?? "Unknown",
        email: result.participant?.email ?? "Unknown",
        event: result.event?.name ?? "Unknown event",
        scannedAt: result.scannedAt,
        alreadyRecorded: result.alreadyRecorded,
      })
      if (result.alreadyRecorded) {
        toast.message("Attendance already recorded.")
      } else {
        toast.success("Attendance marked")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Scan failed")
    }
  }

  async function startScanner() {
    if (!videoRef.current || isScanning) {
      return
    }
    const reader = new BrowserMultiFormatReader()
    readerRef.current = reader
    setIsScanning(true)

    try {
      const devices = await BrowserMultiFormatReader.listVideoInputDevices()
      const preferred = devices.find((device) =>
        device.label.toLowerCase().includes("back"),
      )
      const deviceId = preferred?.deviceId ?? devices[0]?.deviceId
      if (!deviceId) {
        throw new Error("No camera device available")
      }

      await reader.decodeFromVideoDevice(deviceId, videoRef.current, async (result) => {
        if (!result || isProcessingRef.current) {
          return
        }
        isProcessingRef.current = true
        await processToken(result.getText())
        setTimeout(() => {
          isProcessingRef.current = false
        }, 1200)
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start scanner")
      setIsScanning(false)
    }
  }

  function stopScanner() {
    const stream = videoRef.current?.srcObject
    if (stream instanceof MediaStream) {
      stream.getTracks().forEach((track) => track.stop())
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
    readerRef.current = null
    setIsScanning(false)
  }

  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [])

  async function onTokenSubmit(values: TokenValues) {
    await processToken(values.token)
    tokenForm.reset()
  }

  return (
    <div className="grid gap-4">
      <SectionCard
        title="QR Attendance Scanner"
        description="Scan from camera or paste tokens manually to mark attendance."
      >
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2">
            <p className="inline-flex items-center gap-2 text-sm font-medium">
              <ScanLine className="h-4 w-4" />
              Scanner status
            </p>
            <span
              className={`rounded-full px-2.5 py-1 text-xs ${
                isScanning ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"
              }`}
            >
              {isScanning ? "Live camera scan active" : "Camera is off"}
            </span>
          </div>

          <div className="overflow-hidden rounded-lg border bg-black">
            <video ref={videoRef} className="h-72 w-full object-cover" muted />
            {!isScanning ? (
              <div className="pointer-events-none -mt-72 flex h-72 items-center justify-center">
                <div className="rounded-md bg-black/60 px-3 py-2 text-xs text-white">
                  Start scan to activate camera
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={startScanner}
              disabled={isScanning}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Camera className="h-4 w-4" />
              Start camera scan
            </button>
            <button
              type="button"
              onClick={stopScanner}
              disabled={!isScanning}
              className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-3 text-sm font-medium hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CameraOff className="h-4 w-4" />
              Stop scan
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-md border p-3">
              <p className="mb-2 inline-flex items-center gap-2 text-sm font-medium">
                <QrCode className="h-4 w-4" />
                Manual token input
              </p>
              <form onSubmit={tokenForm.handleSubmit(onTokenSubmit)} className="space-y-2">
                <label className="block space-y-1">
                  <span className="text-xs text-muted-foreground">Paste token</span>
                  <textarea
                    {...tokenForm.register("token")}
                    rows={3}
                    className="w-full rounded-md border bg-background px-3 py-2 text-xs font-mono focus:border-primary"
                    placeholder="base64(payload).signature"
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-md border px-3 py-2 text-sm font-medium hover:border-primary"
                >
                  Submit token
                </button>
                {tokenForm.formState.errors.token ? (
                  <p className="text-xs text-destructive">
                    {tokenForm.formState.errors.token.message}
                  </p>
                ) : null}
              </form>
            </div>

            <div className="rounded-md border p-3">
              <p className="mb-2 text-sm font-medium">Scanning tips</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>Center the QR code and keep a steady hand.</li>
                <li>Use rear camera for faster focus on mobile.</li>
                <li>Keep venue lighting on for better detection.</li>
              </ul>
            </div>
          </div>

          {lastResult ? (
            <div
              className={`rounded-lg border p-4 ${
                lastResult.alreadyRecorded ? "bg-amber-50" : "bg-emerald-50"
              }`}
            >
              <p className="text-sm font-medium">
                {lastResult.alreadyRecorded ? "Already recorded" : "Attendance confirmed"}
              </p>
              <p className="text-sm text-muted-foreground">{lastResult.name}</p>
              <p className="text-sm text-muted-foreground">{lastResult.email}</p>
              <p className="text-sm text-muted-foreground">{lastResult.event}</p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(lastResult.scannedAt)}
              </p>
            </div>
          ) : null}
        </div>
      </SectionCard>
    </div>
  )
}
