"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bell, X } from "lucide-react"

export function NotificationPermission() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>("default")

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission)
      if (Notification.permission === "default") {
        setShowPrompt(true)
      }
    }
  }, [])

  const requestPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission()
      setPermission(permission)
      setShowPrompt(false)
    }
  }

  const dismissPrompt = () => {
    setShowPrompt(false)
  }

  if (!showPrompt || permission !== "default") {
    return null
  }

  return (
    <Card className="mb-4 border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Enable Notifications</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={dismissPrompt}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          Get instant notifications when you receive approval requests or project updates.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Button onClick={requestPermission} size="sm">
            Enable Notifications
          </Button>
          <Button variant="outline" onClick={dismissPrompt} size="sm">
            Maybe Later
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
