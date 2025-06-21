"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
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
  title?: string
  message: string
  type?: "success" | "error" | "warning" | "info"
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
  onCancel?: () => void
  showCancel?: boolean
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void
  showConfirm: (options: AlertOptions) => void
}

const AlertContext = createContext<AlertContextType | undefined>(undefined)

export function AlertProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [alertOptions, setAlertOptions] = useState<AlertOptions | null>(null)
  const [isConfirm, setIsConfirm] = useState(false)

  const showAlert = (options: AlertOptions) => {
    setAlertOptions(options)
    setIsConfirm(false)
    setIsOpen(true)
  }

  const showConfirm = (options: AlertOptions) => {
    setAlertOptions(options)
    setIsConfirm(true)
    setIsOpen(true)
  }

  const handleConfirm = () => {
    if (alertOptions?.onConfirm) {
      alertOptions.onConfirm()
    }
    setIsOpen(false)
    setAlertOptions(null)
  }

  const handleCancel = () => {
    if (alertOptions?.onCancel) {
      alertOptions.onCancel()
    }
    setIsOpen(false)
    setAlertOptions(null)
  }

  const getIcon = () => {
    switch (alertOptions?.type) {
      case "success":
        return <CheckCircle className="h-6 w-6 text-green-600" />
      case "error":
        return <XCircle className="h-6 w-6 text-red-600" />
      case "warning":
        return <AlertTriangle className="h-6 w-6 text-yellow-600" />
      case "info":
      default:
        return <Info className="h-6 w-6 text-blue-600" />
    }
  }

  const getTitle = () => {
    if (alertOptions?.title) return alertOptions.title

    switch (alertOptions?.type) {
      case "success":
        return "Success"
      case "error":
        return "Error"
      case "warning":
        return "Warning"
      case "info":
      default:
        return "Information"
    }
  }

  const getBorderColor = () => {
    switch (alertOptions?.type) {
      case "success":
        return "border-green-200"
      case "error":
        return "border-red-200"
      case "warning":
        return "border-yellow-200"
      case "info":
      default:
        return "border-blue-200"
    }
  }

  const getButtonColor = () => {
    switch (alertOptions?.type) {
      case "success":
        return "bg-green-600 hover:bg-green-700"
      case "error":
        return "bg-red-600 hover:bg-red-700"
      case "warning":
        return "bg-yellow-600 hover:bg-yellow-700"
      case "info":
      default:
        return "bg-blue-600 hover:bg-blue-700"
    }
  }

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent className={`max-w-md border-2 ${getBorderColor()}`}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3 text-lg">
              {getIcon()}
              {getTitle()}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-700 text-base leading-relaxed">
              {alertOptions?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            {isConfirm && (
              <AlertDialogCancel onClick={handleCancel} className="border-gray-300 hover:bg-gray-50">
                {alertOptions?.cancelText || "Cancel"}
              </AlertDialogCancel>
            )}
            <AlertDialogAction onClick={handleConfirm} className={`text-white ${getButtonColor()}`}>
              {alertOptions?.confirmText || "OK"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AlertContext.Provider>
  )
}

export function useAlert() {
  const context = useContext(AlertContext)
  if (context === undefined) {
    throw new Error("useAlert must be used within an AlertProvider")
  }
  return context
}
