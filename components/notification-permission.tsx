"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bell, BellOff, Volume2 } from "lucide-react"

export function NotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [audioSupported, setAudioSupported] = useState(false)

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission)
    }

    // Test audio support
    const audio = new Audio()
    audio.addEventListener("canplaythrough", () => {
      setAudioSupported(true)
    })
    audio.src = "/notification-sound.wav"
  }, [])

  const requestPermission = async () => {
    if ("Notification" in window) {
      const result = await Notification.requestPermission()
      setPermission(result)
    }
  }

  const testNotification = () => {
    if (permission === "granted") {
      new Notification("Test Notification", {
        body: "This is a test notification from Keller PLM Dashboard",
        icon: "/keller-logo.png",
      })
    }

    // Test sound
    const audio = new Audio("/notification-sound.wav")
    audio.volume = 0.5
    audio.play().catch(console.error)
  }

  if (!("Notification" in window)) {
    return null
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Settings
        </CardTitle>
        <CardDescription>
          Enable notifications to receive real-time updates about project approvals and gate changes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {permission === "granted" ? (
              <Bell className="h-4 w-4 text-green-600" />
            ) : (
              <BellOff className="h-4 w-4 text-red-600" />
            )}
            <span className="text-sm">Browser Notifications: {permission === "granted" ? "Enabled" : "Disabled"}</span>
          </div>
          {permission !== "granted" && (
            <Button onClick={requestPermission} size="sm">
              Enable Notifications
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className={`h-4 w-4 ${audioSupported ? "text-green-600" : "text-red-600"}`} />
            <span className="text-sm">Sound Notifications: {audioSupported ? "Supported" : "Not Supported"}</span>
          </div>
        </div>

        {permission === "granted" && (
          <Button onClick={testNotification} variant="outline" size="sm">
            Test Notification
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
