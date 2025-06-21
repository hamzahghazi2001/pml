"use client"

import { useState } from "react"
import { Bell, CheckCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useNotifications } from "./notification-provider"
import { formatDistanceToNow } from "date-fns"

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)

  const handleNotificationClick = (notification: any) => {
    if (!notification.read_at) {
      markAsRead(notification.id)
    }

    // Navigate to specific project if project_id is available
    const projectId = notification.metadata?.project_id || notification.project_id

    if (projectId && (notification.type === "approval_request" || notification.type === "approval_decision")) {
      window.location.href = `/dashboard/projects/${projectId}`
    } else {
      // Fallback to general projects page if no project ID
      window.location.href = "/dashboard/projects"
    }

    setIsOpen(false)
  }

  const getNotificationIcon = (type: string, metadata: any) => {
    switch (type) {
      case "approval_request":
        return "🔔"
      case "approval_decision":
        // Check multiple possible status fields and values
        const status = metadata?.status || metadata?.decision || metadata?.approval_status
        console.log("Notification metadata:", metadata, "Status:", status) // Debug log

        if (status === "approved" || status === "approve" || status === "accepted") {
          return "✅"
        } else if (status === "rejected" || status === "reject" || status === "denied") {
          return "❌"
        } else {
          return "⏳" // Pending or unknown status
        }
      default:
        return "📢"
    }
  }

  const getNotificationColor = (type: string, metadata: any) => {
    switch (type) {
      case "approval_request":
        return "border-l-blue-500 bg-blue-50/50"
      case "approval_decision":
        const status = metadata?.status || metadata?.decision || metadata?.approval_status
        if (status === "approved" || status === "approve" || status === "accepted") {
          return "border-l-green-500 bg-green-50/50"
        } else if (status === "rejected" || status === "reject" || status === "denied") {
          return "border-l-red-500 bg-red-50/50"
        } else {
          return "border-l-yellow-500 bg-yellow-50/50"
        }
      default:
        return "border-l-gray-500 bg-gray-50/50"
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative hover:bg-gray-100 transition-colors duration-200 p-2 md:p-2.5"
        >
          <Bell className="h-4 w-4 md:h-5 md:w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 w-4 md:h-5 md:w-5 rounded-full p-0 text-[10px] md:text-xs font-bold animate-pulse"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 md:w-96 max-w-[calc(100vw-2rem)] shadow-xl border-0 bg-white/95 backdrop-blur-sm"
        sideOffset={8}
      >
        <DropdownMenuLabel className="flex items-center justify-between p-4 pb-2 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-gray-600" />
            <span className="font-semibold text-gray-900">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-8 px-2 text-xs hover:bg-gray-100 transition-colors"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Mark all read</span>
              <span className="sm:hidden">Clear</span>
            </Button>
          )}
        </DropdownMenuLabel>

        <ScrollArea className="h-80 md:h-96">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Bell className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No notifications</p>
              <p className="text-gray-400 text-sm mt-1">You're all caught up!</p>
            </div>
          ) : (
            <div className="p-2">
              {notifications.slice(0, 20).map((notification, index) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={`
                    flex flex-col items-start p-3 mb-2 cursor-pointer rounded-lg border-l-4 transition-all duration-200
                    hover:bg-gray-50 focus:bg-gray-50 focus:outline-none
                    ${!notification.read_at ? getNotificationColor(notification.type, notification.metadata) : "border-l-gray-200 bg-white"}
                    ${index === notifications.length - 1 ? "mb-0" : ""}
                  `}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start justify-between w-full">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 mt-0.5">
                        <span className="text-lg">{getNotificationIcon(notification.type, notification.metadata)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-medium text-sm text-gray-900 line-clamp-1 flex-1">{notification.title}</p>
                          {!notification.read_at && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2 mb-2 leading-relaxed">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                          {!notification.read_at && (
                            <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-auto">
                              New
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 20 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  window.location.href = "/dashboard/notifications"
                  setIsOpen(false)
                }}
              >
                View all {notifications.length} notifications
              </Button>
            </div>
          </>
        )}

        {notifications.length === 0 && (
          <div className="p-3 border-t">
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
