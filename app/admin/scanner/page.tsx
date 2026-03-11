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
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SectionCard } from "@/components/ui/section-card"

const tokenSchema = z.object({
  token: z.string().trim().min(1, "QR token is required"),
})

type TokenValues = z.infer<typeof tokenSchema>

type BrowserQrDetector = {
  detect: (source: ImageBitmapSource | HTMLVideoElement | HTMLCanvasElement) => Promise<
    Array<{ rawValue?: string }>
  >
}
type BrowserQrDetectorCtor = new (options: {
  formats: string[]
}) => BrowserQrDetector

export default function AdminScannerPage() {
  const markAttendance = useMutation(api.attendance.markAttendance)
  const previewQrToken = useMutation(api.attendance.previewQrToken)
  const [isScanning, setIsScanning] = useState(false)
  const [confirmBeforeSubmit, setConfirmBeforeSubmit] = useState(true)
  const [scanStatus, setScanStatus] = useState("Idle")
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [isSubmittingToken, setIsSubmittingToken] = useState(false)
  const [pendingToken, setPendingToken] = useState<string | null>(null)
  const [pendingSource, setPendingSource] = useState<"camera" | "manual" | null>(null)
  const [pendingPreview, setPendingPreview] = useState<{
    participantName: string
    participantEmail: string
    eventName: string
    expiresAt: number
  } | null>(null)
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
  const isScanningRef = useRef(false)
  const lastDetectionAtRef = useRef<number>(0)
  const lastDecodeIssueAtRef = useRef<number>(0)
  const noDetectionTimerRef = useRef<number | null>(null)
  const barcodeFallbackTimerRef = useRef<number | null>(null)
  const tokenForm = useForm<TokenValues>({
    resolver: zodResolver(tokenSchema),
    defaultValues: { token: "" },
  })

  async function processToken(token: string) {
    if (!token.trim()) {
      toast.error("Empty QR token")
      return false
    }
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
        toast.success("Attendance marked successfully")
      }
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Scan failed")
      return false
    }
  }

  async function queueTokenForConfirmation(token: string, source: "camera" | "manual") {
    const normalizedToken = token.trim()
    if (!normalizedToken) {
      toast.error("Empty QR token")
      isProcessingRef.current = false
      return
    }

    if (!confirmBeforeSubmit) {
      setScanStatus("Submitting attendance...")
      await processToken(normalizedToken)
      if (source === "manual") {
        tokenForm.reset()
      }
      isProcessingRef.current = false
      return
    }

    setScanStatus("Preparing confirmation...")
    try {
      const preview = await previewQrToken({ token: normalizedToken })
      setPendingToken(normalizedToken)
      setPendingSource(source)
      setPendingPreview(preview)
      setIsConfirmDialogOpen(true)
      setScanStatus("Awaiting confirmation")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to preview QR token")
      setScanStatus("Unable to preview QR token")
      isProcessingRef.current = false
    }
  }

  function closeConfirmDialog() {
    setIsConfirmDialogOpen(false)
    setPendingToken(null)
    setPendingSource(null)
    setPendingPreview(null)
    setIsSubmittingToken(false)
    isProcessingRef.current = false
  }

  async function confirmSubmitToken() {
    if (!pendingToken || !pendingSource) {
      closeConfirmDialog()
      return
    }
    setIsSubmittingToken(true)
    setScanStatus("Submitting attendance...")
    const success = await processToken(pendingToken)
    if (success && pendingSource === "manual") {
      tokenForm.reset()
    }
    closeConfirmDialog()
  }

  async function startScanner() {
    const videoElement = videoRef.current
    if (!videoElement || isScanning) {
      if (isScanning) {
        toast.message("Scanner is already running")
      }
      return
    }

    if (!window.isSecureContext) {
      toast.error("Camera access requires HTTPS or localhost")
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Camera API is not available in this browser")
      return
    }

    const reader = new BrowserMultiFormatReader(undefined, {
      delayBetweenScanAttempts: 120,
      delayBetweenScanSuccess: 500,
    })
    readerRef.current = reader
    setIsScanning(true)
    isScanningRef.current = true
    setScanStatus("Starting scanner...")

    try {
      toast.message("Requesting camera permission...")
      setScanStatus("Requesting camera permission...")
      // Trigger permission prompt first, then release this stream before zxing starts.
      const permissionStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      })
      permissionStream.getTracks().forEach((track) => track.stop())

      const devices = await BrowserMultiFormatReader.listVideoInputDevices()
      const preferred = devices.find((device) =>
        device.label.toLowerCase().includes("back"),
      )
      const deviceId = preferred?.deviceId ?? devices[0]?.deviceId
      if (!deviceId) {
        throw new Error("No camera device available")
      }

      lastDetectionAtRef.current = Date.now()
      if (noDetectionTimerRef.current) {
        window.clearInterval(noDetectionTimerRef.current)
      }
      noDetectionTimerRef.current = window.setInterval(() => {
        if (!isScanningRef.current) {
          return
        }
        const elapsed = Date.now() - lastDetectionAtRef.current
        if (elapsed > 12000) {
          toast.message("No QR detected yet. Move closer and improve lighting.")
          setScanStatus("No QR detected yet. Move closer or improve lighting.")
          lastDetectionAtRef.current = Date.now()
        }
      }, 5000)

      void reader
        .decodeFromVideoDevice(deviceId, videoElement, async (result, error) => {
        if (!result || isProcessingRef.current) {
          if (error && error instanceof Error && error.name === "NotAllowedError") {
            toast.error("Camera stream blocked by browser permissions")
            setScanStatus("Camera stream blocked by browser permissions")
          } else if (
            error &&
            error instanceof Error &&
            error.name !== "NotFoundException" &&
            error.name !== "ChecksumException" &&
            error.name !== "FormatException" &&
            Date.now() - lastDecodeIssueAtRef.current > 8000
          ) {
            lastDecodeIssueAtRef.current = Date.now()
            toast.message("Scanner active, trying to decode. Hold QR steady in frame.")
            setScanStatus("Scanner active, trying to decode QR...")
          }
          return
        }
        lastDetectionAtRef.current = Date.now()
        isProcessingRef.current = true
        const token = result.getText()
        toast.message("QR detected")
        await queueTokenForConfirmation(token, "camera")
        setScanStatus("Scan completed")
        })
        .catch(async () => {
          // Some devices fail with explicit deviceId. Retry default camera.
          try {
            await reader.decodeFromVideoDevice(undefined, videoElement, async (result) => {
              if (!result || isProcessingRef.current) {
                return
              }
              lastDetectionAtRef.current = Date.now()
              isProcessingRef.current = true
              const token = result.getText()
              toast.message("QR detected")
              await queueTokenForConfirmation(token, "camera")
              setScanStatus("Scan completed")
            })
          } catch (fallbackError) {
            toast.error(
              fallbackError instanceof Error ? fallbackError.message : "Unable to start scanner",
            )
            setScanStatus("Unable to start scanner")
            setIsScanning(false)
            isScanningRef.current = false
          }
        })

      // Browser-native QR fallback for devices where zxing is unreliable.
      const BarcodeDetectorCtor = (
        window as Window & { BarcodeDetector?: BrowserQrDetectorCtor }
      ).BarcodeDetector
      if (BarcodeDetectorCtor) {
        const detector = new BarcodeDetectorCtor({ formats: ["qr_code"] })
        if (barcodeFallbackTimerRef.current) {
          window.clearInterval(barcodeFallbackTimerRef.current)
        }
        barcodeFallbackTimerRef.current = window.setInterval(async () => {
          if (!isScanningRef.current || isProcessingRef.current || !videoRef.current) {
            return
          }
          try {
            const barcodes = await detector.detect(videoRef.current)
            const rawValue = barcodes?.[0]?.rawValue
            if (!rawValue || typeof rawValue !== "string") {
              return
            }
            lastDetectionAtRef.current = Date.now()
            isProcessingRef.current = true
            toast.message("QR detected by fallback scanner")
            await queueTokenForConfirmation(rawValue, "camera")
            setScanStatus("Scan completed")
          } catch {
            // Ignore fallback decode errors and continue polling.
          } finally {
            setTimeout(() => {
              isProcessingRef.current = false
            }, 1000)
          }
        }, 700)
      }

      toast.success("Camera started. Point it at a QR code.")
      setScanStatus("Camera started. Point it at a QR code.")
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        toast.error("Camera permission denied. Please allow camera access and try again.")
        setScanStatus("Camera permission denied")
      } else if (error instanceof DOMException && error.name === "NotFoundError") {
        toast.error("No camera found on this device")
        setScanStatus("No camera found")
      } else {
        toast.error(error instanceof Error ? error.message : "Unable to start scanner")
        setScanStatus("Unable to start scanner")
      }
      setIsScanning(false)
      isScanningRef.current = false
    }
  }

  function stopScanner(showToast = true) {
    const stream = videoRef.current?.srcObject
    if (stream instanceof MediaStream) {
      stream.getTracks().forEach((track) => track.stop())
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
    readerRef.current = null
    setIsScanning(false)
    isScanningRef.current = false
    if (noDetectionTimerRef.current) {
      window.clearInterval(noDetectionTimerRef.current)
      noDetectionTimerRef.current = null
    }
    if (barcodeFallbackTimerRef.current) {
      window.clearInterval(barcodeFallbackTimerRef.current)
      barcodeFallbackTimerRef.current = null
    }
    setScanStatus("Scanner stopped")
    if (showToast) {
      toast.message("Scanner stopped")
    }
  }

  useEffect(() => {
    return () => {
      stopScanner(false)
    }
  }, [])

  async function onTokenSubmit(values: TokenValues) {
    isProcessingRef.current = true
    await queueTokenForConfirmation(values.token, "manual")
  }

  return (
    <div className="grid gap-4">
      <Dialog
        open={isConfirmDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeConfirmDialog()
          }
        }}
      >
        <DialogContent showCloseButton={!isSubmittingToken}>
          <DialogHeader>
            <DialogTitle>Confirm Attendance Submission</DialogTitle>
            <DialogDescription>
              Please confirm this QR token submission before marking attendance.
            </DialogDescription>
          </DialogHeader>
          {pendingPreview ? (
            <div className="space-y-1 text-sm">
              <p>
                Participant: <span className="font-medium">{pendingPreview.participantName}</span>
              </p>
              <p className="text-muted-foreground">{pendingPreview.participantEmail}</p>
              <p>
                Event: <span className="font-medium">{pendingPreview.eventName}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Token expires at {formatDateTime(pendingPreview.expiresAt)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading token details...</p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeConfirmDialog}
              disabled={isSubmittingToken}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmSubmitToken}
              disabled={!pendingPreview || isSubmittingToken}
            >
              {isSubmittingToken ? "Submitting..." : "Confirm & Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          <p className="text-xs text-muted-foreground">Status: {scanStatus}</p>

          <div className="overflow-hidden rounded-lg border bg-black">
            <video ref={videoRef} className="h-72 w-full object-cover" muted playsInline />
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
              onClick={() => stopScanner()}
              disabled={!isScanning}
              className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-3 text-sm font-medium hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CameraOff className="h-4 w-4" />
              Stop scan
            </button>
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={confirmBeforeSubmit}
              onChange={(event) => setConfirmBeforeSubmit(event.target.checked)}
              className="h-4 w-4 rounded border"
            />
            Ask confirmation before submitting attendance
          </label>

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
