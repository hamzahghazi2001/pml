"use client"

import type React from "react"
import { createContext, useContext, useState, useRef, useEffect } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react"

type AlertType = "success" | "error" | "warning" | "info"

interface AlertData {
  type: AlertType
  title: string
  message: string
}

interface ConfirmData extends AlertData {
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel?: () => void
}

interface AlertContextType {
  showAlert: (data: AlertData) => void
  showConfirm: (data: ConfirmData) => void
}

const AlertContext = createContext<AlertContextType | undefined>(undefined)

export function useAlert() {
  const context = useContext(AlertContext)
  if (!context) {
    throw new Error("useAlert must be used within an AlertProvider")
  }
  return context
}

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [alertData, setAlertData] = useState<AlertData | null>(null)
  const [confirmData, setConfirmData] = useState<ConfirmData | null>(null)
  const [isAlertOpen, setIsAlertOpen] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // Initialize audio
    if (typeof window !== "undefined") {
      audioRef.current = new Audio("/notification-sound.wav")
      audioRef.current.volume = 0.3 // Lower volume for alerts
    }
  }, [])

  const playAlertSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch((error) => {
        console.log("Could not play alert sound:", error)
      })
    }
  }

  const showAlert = (data: AlertData) => {
    setAlertData(data)
    setIsAlertOpen(true)
    playAlertSound()
  }

  const showConfirm = (data: ConfirmData) => {
    setConfirmData(data)
    setIsConfirmOpen(true)
    playAlertSound()
  }

  const getIcon = (type: AlertType) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-6 w-6 text-green-600" />
      case "error":
        return <XCircle className="h-6 w-6 text-red-600" />
      case "warning":
        return <AlertTriangle className="h-6 w-6 text-yellow-600" />
      case "info":
        return <Info className="h-6 w-6 text-blue-600" />
    }
  }

  const getColors = (type: AlertType) => {
    switch (type) {
      case "success":
        return {
          bg: "bg-green-50",
          border: "border-green-200",
          button: "bg-green-600 hover:bg-green-700 focus:ring-green-500",
        }
      case "error":
        return {
          bg: "bg-red-50",
          border: "border-red-200",
          button: "bg-red-600 hover:bg-red-700 focus:ring-red-500",
        }
      case "warning":
        return {
          bg: "bg-yellow-50",
          border: "border-yellow-200",
          button: "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500",
        }
      case "info":
        return {
          bg: "bg-blue-50",
          border: "border-blue-200",
          button: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
        }
    }
  }

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}

      {/* Alert Dialog */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent className={`max-w-md ${alertData ? getColors(alertData.type).bg : ""}`}>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              {alertData && getIcon(alertData.type)}
              <AlertDialogTitle className="text-lg font-semibold">{alertData?.title}</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm text-gray-600 leading-relaxed">
              {alertData?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              className={`${alertData ? getColors(alertData.type).button : ""} text-white font-medium px-6 py-2 rounded-md transition-colors`}
              onClick={() => {
                setIsAlertOpen(false)
                setAlertData(null)
              }}
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Dialog */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent className={`max-w-md ${confirmData ? getColors(confirmData.type).bg : ""}`}>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              {confirmData && getIcon(confirmData.type)}
              <AlertDialogTitle className="text-lg font-semibold">{confirmData?.title}</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm text-gray-600 leading-relaxed">
              {confirmData?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              className="px-6 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-md transition-colors"
              onClick={() => {
                setIsConfirmOpen(false)
                confirmData?.onCancel?.()
                setConfirmData(null)
              }}
            >
              {confirmData?.cancelText || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              className={`${confirmData ? getColors(confirmData.type).button : ""} text-white font-medium px-6 py-2 rounded-md transition-colors`}
              onClick={() => {
                setIsConfirmOpen(false)
                confirmData?.onConfirm()
                setConfirmData(null)
              }}
            >
              {confirmData?.confirmText || "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AlertContext.Provider>
  )
}
