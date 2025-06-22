"use client"

import type React from "react"
import { createContext, useContext, useState } from "react"
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

interface AlertOptions {
  type: "success" | "error" | "warning" | "info"
  title: string
  message: string
}

interface ConfirmOptions extends AlertOptions {
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
  onCancel?: () => void
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void
  showConfirm: (options: ConfirmOptions) => void
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
  const [alertState, setAlertState] = useState<{
    isOpen: boolean
    type: "alert" | "confirm"
    options: AlertOptions | ConfirmOptions
  }>({
    isOpen: false,
    type: "alert",
    options: { type: "info", title: "", message: "" },
  })

  const showAlert = (options: AlertOptions) => {
    setAlertState({
      isOpen: true,
      type: "alert",
      options,
    })
  }

  const showConfirm = (options: ConfirmOptions) => {
    setAlertState({
      isOpen: true,
      type: "confirm",
      options,
    })
  }

  const handleClose = () => {
    setAlertState((prev) => ({ ...prev, isOpen: false }))
  }

  const handleConfirm = () => {
    if (alertState.type === "confirm") {
      const confirmOptions = alertState.options as ConfirmOptions
      confirmOptions.onConfirm?.()
    }
    handleClose()
  }

  const handleCancel = () => {
    if (alertState.type === "confirm") {
      const confirmOptions = alertState.options as ConfirmOptions
      confirmOptions.onCancel?.()
    }
    handleClose()
  }

  const getIcon = () => {
    const t = alertState.options?.type ?? "info"
    switch (t) {
      case "success":
        return <CheckCircle className="h-6 w-6 text-green-500" />
      case "error":
        return <XCircle className="h-6 w-6 text-red-500" />
      case "warning":
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />
      case "info":
      default:
        return <Info className="h-6 w-6 text-blue-500" />
    }
  }

  const getColorClasses = () => {
    const t = alertState.options?.type ?? "info"
    switch (t) {
      case "success":
        return "border-l-4 border-l-green-500"
      case "error":
        return "border-l-4 border-l-red-500"
      case "warning":
        return "border-l-4 border-l-yellow-500"
      case "info":
      default:
        return "border-l-4 border-l-blue-500"
    }
  }

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      <AlertDialog
        open={alertState.isOpen}
        onOpenChange={(open) => setAlertState((prev) => ({ ...prev, isOpen: open }))}
      >
        <AlertDialogContent className={`max-w-md ${getColorClasses()}`}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3">
              {getIcon()}
              {alertState.options.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base leading-relaxed">
              {alertState.options.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {alertState.type === "confirm" ? (
              <>
                <AlertDialogCancel onClick={handleCancel}>
                  {(alertState.options as ConfirmOptions).cancelText || "Cancel"}
                </AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirm}>
                  {(alertState.options as ConfirmOptions).confirmText || "Confirm"}
                </AlertDialogAction>
              </>
            ) : (
              <AlertDialogAction onClick={handleClose}>OK</AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AlertContext.Provider>
  )
}
