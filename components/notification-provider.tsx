"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase"
import { toast } from "sonner"
import { Bell, CheckCircle, XCircle, Clock } from "lucide-react"
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
  // keep a single channel instance
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
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
          const newNotification = payload.new as Notification
          setNotifications((prev) => [newNotification, ...prev])

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
          const updatedNotification = payload.new as Notification
          setNotifications((prev) =>
            prev.map((notif) => (notif.id === updatedNotification.id ? updatedNotification : notif)),
          )
        },
      )
      .subscribe()
    channelRef.current = channel

    // return cleanup FN
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }

  const showPopupNotification = (notification: Notification) => {
    const getIcon = () => {
      switch (notification.type) {
        case "approval_request":
          return <Clock className="h-4 w-4" />
        case "approval_decision":
          return notification.metadata?.status === "approved" ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )
        default:
          return <Bell className="h-4 w-4" />
      }
    }

    const getToastType = () => {
      switch (notification.type) {
        case "approval_request":
          return "info"
        case "approval_decision":
          return notification.metadata?.status === "approved" ? "success" : "error"
        default:
          return "info"
      }
    }

    toast(notification.title, {
      description: notification.message,
      icon: getIcon(),
      action: {
        label: "View",
        onClick: () => {
          if (notification.type === "approval_request") {
            window.location.href = "/dashboard/approvals"
          } else {
            window.location.href = "/dashboard/projects"
          }
        },
      },
      duration: 8000,
    })

    // Also show browser notification if permission is granted
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(notification.title, {
        body: notification.message,
        icon: "/favicon.ico",
        tag: notification.id,
      })
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
