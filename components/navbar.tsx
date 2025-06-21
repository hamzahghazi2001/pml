"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase"
import { NotificationBell } from "./notification-bell"
import { NotificationPermission } from "./notification-permission"

export function Navbar() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    getUser()
  }, [])

  const getUser = async () => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (authUser) {
        const { data: profile } = await supabase.from("users").select("*").eq("id", authUser.id).single()
        setUser(profile)
      }
    } catch (error) {
      console.error("Error fetching user:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/auth/signin")
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const formatRole = (role: string) => {
    return role
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  return (
    <>
      <nav className="bg-white/95 backdrop-blur-md shadow-lg border-b border-blue-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center space-x-8">
              <Link href="/dashboard" className="flex items-center space-x-3 group">
                <div className="flex items-center space-x-3">
                  <img
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-W64KmW11QXb7cBx0VGAaVRJNQCq3jG.png"
                    alt="Keller Logo"
                    className="h-10 w-auto group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </Link>
              <div className="hidden lg:flex lg:space-x-8">
                <Link
                  href="/dashboard"
                  className="text-blue-900 hover:text-yellow-600 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:bg-blue-50"
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/projects"
                  className="text-blue-900 hover:text-yellow-600 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:bg-blue-50"
                >
                  Projects
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {user && <NotificationBell />}
              {loading ? (
                <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full animate-pulse"></div>
              ) : user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-10 w-10 rounded-full hover:bg-blue-50 transition-all duration-200"
                    >
                      <Avatar className="h-10 w-10 ring-2 ring-yellow-400 ring-offset-2">
                        <AvatarFallback className="bg-gradient-to-br from-blue-900 to-blue-800 text-white font-semibold">
                          {getInitials(user.full_name || user.email)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64 p-2" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal p-4 bg-gradient-to-r from-blue-50 to-yellow-50 rounded-lg mb-2">
                      <div className="flex flex-col space-y-2">
                        <p className="text-sm font-semibold leading-none text-blue-900">{user.full_name}</p>
                        <p className="text-xs leading-none text-blue-600">{user.email}</p>
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            {formatRole(user.role)}
                          </span>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => router.push("/dashboard/profile")}
                      className="hover:bg-blue-50 cursor-pointer"
                    >
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push("/dashboard/projects")}
                      className="hover:bg-blue-50 cursor-pointer"
                    >
                      Projects
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="hover:bg-red-50 text-red-600 cursor-pointer">
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex space-x-3">
                  <Button
                    variant="ghost"
                    onClick={() => router.push("/auth/signin")}
                    className="text-blue-900 hover:bg-blue-50"
                  >
                    Sign In
                  </Button>
                  <Button
                    onClick={() => router.push("/auth/signup")}
                    className="bg-gradient-to-r from-blue-900 to-blue-800 hover:from-blue-800 hover:to-blue-700 text-white shadow-lg"
                  >
                    Sign Up
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      {user && <NotificationPermission />}
    </>
  )
}
