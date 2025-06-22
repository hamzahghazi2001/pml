"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase"
import { toast } from "sonner"
import { Bell, CheckCircle, XCircle, Clock, AlertTriangle, Info } from "lucide-react"
import type { RealtimeChannel } from "@supabase/supabase-js"

interface Notification {
  id: string
  title: string
  message: string
  type: string
  read_at: string | null
  created_at: string
  metadata: any
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  refreshNotifications: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }
  return context
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const supabase = createClient()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // Initialize audio with proper error handling
    try {
      audioRef.current = new Audio("/sounds/notification.wav")
      audioRef.current.volume = 0.7
      audioRef.current.preload = "auto"

      // Test if audio can be loaded
      audioRef.current.addEventListener("canplaythrough", () => {
        console.log("Notification sound loaded successfully")
      })

      audioRef.current.addEventListener("error", (e) => {
        console.error("Error loading notification sound:", e)
      })
    } catch (error) {
      console.error("Error initializing audio:", error)
    }

    fetchCurrentUser()
  }, [])

  useEffect(() => {
    if (currentUser) {
      console.log("Setting up notifications for user:", currentUser)
      fetchNotifications()
      const cleanup = setupRealtimeSubscription()
      return cleanup
    }
  }, [currentUser])

  const fetchCurrentUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        console.log("Authenticated user found:", user.id)
        const { data: userData, error } = await supabase.from("users").select("*").eq("id", user.id).single()

        if (error) {
          console.error("Error fetching user data:", error)
        } else {
          console.log("User data loaded:", userData)
          setCurrentUser(userData)
        }
      } else {
        console.log("No authenticated user found")
      }
    } catch (error) {
      console.error("Error fetching user:", error)
    }
  }

  const fetchNotifications = async () => {
    if (!currentUser) return

    try {
      console.log("Fetching notifications for user:", currentUser.id)
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) {
        console.error("Error fetching notifications:", error)
        throw error
      }

      console.log("Fetched notifications:", data?.length || 0)
      setNotifications(data || [])
    } catch (error) {
      console.error("Error fetching notifications:", error)
    }
  }

  const playNotificationSound = async () => {
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0
        const playPromise = audioRef.current.play()

        if (playPromise !== undefined) {
          await playPromise
          console.log("Notification sound played successfully")
        }
      }
    } catch (error) {
      console.log("Could not play notification sound:", error)
      // Fallback: try to play a system beep
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        oscillator.frequency.value = 800
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.5)
      } catch (fallbackError) {
        console.log("Could not play fallback sound:", fallbackError)
      }
    }
  }

  const setupRealtimeSubscription = () => {
    if (!currentUser) {
      console.log("No current user, skipping realtime setup")
      return
    }

    if (channelRef.current) {
      console.log("Realtime channel already exists")
      return
    }

    console.log("Setting up realtime subscription for user:", currentUser.id)

    const channel = supabase
      .channel(`notifications-${currentUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          console.log("New notification received:", payload)
          const newNotification = payload.new as Notification

          setNotifications((prev) => {
            console.log("Adding notification to list")
            return [newNotification, ...prev]
          })

          // Play sound
          playNotificationSound()

          // Show popup notification
          showPopupNotification(newNotification)
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          console.log("Notification updated:", payload)
          const updatedNotification = payload.new as Notification
          setNotifications((prev) =>
            prev.map((notif) => (notif.id === updatedNotification.id ? updatedNotification : notif)),
          )
        },
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status)
      })

    channelRef.current = channel

    // return cleanup function
    return () => {
      console.log("Cleaning up realtime subscription")
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }

  const showPopupNotification = (notification: Notification) => {
    console.log("Showing popup notification:", notification)

    const getIcon = () => {
      switch (notification.type) {
        case "approval_request":
          return <Clock className="h-5 w-5 text-blue-500" />
        case "approval_decision":
          const status = notification.metadata?.status
          return status === "approved" ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <XCircle className="h-5 w-5 text-red-500" />
          )
        case "project_creation":
          return <Info className="h-5 w-5 text-blue-500" />
        case "overdue_approval":
          return <AlertTriangle className="h-5 w-5 text-orange-500" />
        default:
          return <Bell className="h-5 w-5 text-gray-500" />
      }
    }

    // Show enhanced toast notification with custom styling
    toast(notification.title, {
      description: notification.message,
      icon: getIcon(),
      action: {
        label: "View Details",
        onClick: () => {
          const projectId = notification.metadata?.project_id
          if (projectId) {
            window.location.href = `/dashboard/projects/${projectId}`
          } else {
            window.location.href = "/dashboard/projects"
          }
        },
      },
      duration: 12000, // Show for 12 seconds
      className: "border-l-4 border-l-blue-500 shadow-lg",
      style: {
        background: "white",
        border: "1px solid #e5e7eb",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        borderRadius: "8px",
        padding: "16px",
      },
    })

    // Request notification permission if not granted
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        console.log("Notification permission:", permission)
      })
    }

    // Show browser notification if permission is granted
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        const browserNotification = new Notification(notification.title, {
          body: notification.message,
          icon: "/keller-logo.png",
          tag: notification.id,
          badge: "/keller-logo.png",
          requireInteraction: true,
          silent: false, // Allow sound
        })

        browserNotification.onclick = () => {
          window.focus()
          const projectId = notification.metadata?.project_id
          if (projectId) {
            window.location.href = `/dashboard/projects/${projectId}`
          } else {
            window.location.href = "/dashboard/projects"
          }
          browserNotification.close()
        }

        // Auto close after 15 seconds
        setTimeout(() => {
          browserNotification.close()
        }, 15000)
      } catch (error) {
        console.error("Error showing browser notification:", error)
      }
    }
  }

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id)

      if (error) throw error

      setNotifications((prev) =>
        prev.map((notif) => (notif.id === id ? { ...notif, read_at: new Date().toISOString() } : notif)),
      )
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    if (!currentUser) return

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", currentUser.id)
        .is("read_at", null)

      if (error) throw error

      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, read_at: notif.read_at || new Date().toISOString() })),
      )
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  const refreshNotifications = () => {
    console.log("Refreshing notifications")
    fetchNotifications()
  }

  const unreadCount = notifications.filter((n) => !n.read_at).length

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}
