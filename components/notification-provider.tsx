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
  project_id?: string
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
  // keep a single channel instance
  const channelRef = useRef<RealtimeChannel | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    console.log("NotificationProvider initializing")
    // Initialize audio
    if (typeof window !== "undefined") {
      audioRef.current = new Audio("/notification-sound.wav")
      audioRef.current.volume = 0.5 // Set volume to 50%
      audioRef.current.addEventListener("canplaythrough", () => {
        console.log("Notification sound loaded successfully")
      })
      audioRef.current.addEventListener("error", (e) => {
        console.error("Error loading notification sound:", e)
      })
    }

    fetchCurrentUser()
  }, [])

  useEffect(() => {
    if (currentUser) {
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
        const { data: userData } = await supabase.from("users").select("*").eq("id", user.id).single()
        setCurrentUser(userData)
      }
    } catch (error) {
      console.error("Error fetching user:", error)
    }
  }

  const fetchNotifications = async () => {
    if (!currentUser) return

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) throw error
      setNotifications(data || [])
    } catch (error) {
      console.error("Error fetching notifications:", error)
    }
  }

  const setupRealtimeSubscription = () => {
    if (!currentUser) return
    // already subscribed → no-op
    if (channelRef.current) return

    console.log("Setting up realtime subscription for user:", currentUser.id, "role:", currentUser.role)

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          console.log("New notification received:", payload.new)
          const newNotification = payload.new as Notification
          setNotifications((prev) => [newNotification, ...prev])

          // Play sound and show popup notification
          playNotificationSound()
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
          console.log("Notification updated:", payload.new)
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

    // return cleanup FN
    return () => {
      if (channelRef.current) {
        console.log("Cleaning up realtime subscription")
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }

  const playNotificationSound = () => {
    console.log("Attempting to play notification sound")
    if (audioRef.current) {
      audioRef.current.currentTime = 0 // Reset to start
      audioRef.current
        .play()
        .then(() => {
          console.log("Notification sound played successfully")
        })
        .catch((error) => {
          console.error("Could not play notification sound:", error)
          // Try to reload the audio file
          audioRef.current!.src = "/notification-sound.wav"
          audioRef.current!.load()
        })
    } else {
      console.error("Audio reference not available")
    }
  }

  const showPopupNotification = (notification: Notification) => {
    console.log("Showing popup notification:", notification)

    const getIcon = () => {
      switch (notification.type) {
        case "approval_request":
          return <Clock className="h-4 w-4" />
        case "approval_decision":
          const status = notification.metadata?.status
          if (status === "approved") {
            return <CheckCircle className="h-4 w-4" />
          } else if (status === "rejected") {
            return <XCircle className="h-4 w-4" />
          }
          return <Clock className="h-4 w-4" />
        case "gate_advancement":
          return <CheckCircle className="h-4 w-4" />
        case "project_creation":
          return <Info className="h-4 w-4" />
        case "overdue_approval":
          return <AlertTriangle className="h-4 w-4" />
        default:
          return <Bell className="h-4 w-4" />
      }
    }

    const getActionUrl = () => {
      if (notification.project_id) {
        return `/dashboard/projects/${notification.project_id}`
      }
      return "/dashboard/projects"
    }

    // Show toast notification with enhanced styling
    console.log("Creating toast notification")
    toast(notification.title, {
      description: notification.message,
      icon: getIcon(),
      action: {
        label: "View Project",
        onClick: () => {
          console.log("Navigating to:", getActionUrl())
          window.location.href = getActionUrl()
        },
      },
      duration: 10000, // Show for 10 seconds
      className: "notification-toast",
      style: {
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderLeft: "4px solid #3b82f6",
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      },
    })

    // Also show browser notification if permission is granted
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        console.log("Creating browser notification")
        const browserNotification = new Notification(notification.title, {
          body: notification.message,
          icon: "/keller-logo.png",
          tag: notification.id,
          badge: "/keller-logo.png",
          requireInteraction: true,
        })

        browserNotification.onclick = () => {
          window.focus()
          window.location.href = getActionUrl()
          browserNotification.close()
        }

        setTimeout(() => {
          browserNotification.close()
        }, 15000)
      } else if (Notification.permission === "default") {
        console.log("Requesting notification permission")
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            console.log("Notification permission granted")
          }
        })
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
