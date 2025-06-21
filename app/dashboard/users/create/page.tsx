"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase"
import { Navbar } from "@/components/navbar"
import { ArrowLeft, Eye, EyeOff } from "lucide-react"

// Replace the static roles array with a function that returns roles based on current user permissions

const countries = ["UAE", "Saudi Arabia", "Egypt", "Kuwait", "Qatar", "Oman", "Bahrain"]

export default function CreateUserPage() {
  const [availableRoles, setAvailableRoles] = useState<Array<{ value: string; label: string }>>([])
  const [currentUserRole, setCurrentUserRole] = useState<string>("")
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "",
    branch: "",
    country: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter()
  const supabase = createClient()

  // Add a function to determine available roles based on hierarchy:
  const getAvailableRoles = (userRole: string) => {
    const allRoles = [
      { value: "bid_manager", label: "Bid Manager" },
      { value: "project_manager", label: "Project Manager" },
      { value: "branch_manager", label: "Branch Manager" },
      { value: "bu_director", label: "BU Director" },
      { value: "finance_manager", label: "Finance Manager" },
      { value: "technical_director", label: "Technical Director" },
      { value: "sales_director", label: "Sales Director" },
      { value: "amea_president", label: "AMEA President" },
      { value: "ceo", label: "CEO" },
    ]

    // Define role hierarchy - users can only create roles at their level or below
    switch (userRole) {
      case "ceo":
        return allRoles // CEO can create all roles
      case "amea_president":
        return allRoles.filter((role) => !["ceo"].includes(role.value))
      case "bu_director":
        return allRoles.filter((role) => !["ceo", "amea_president"].includes(role.value))
      case "branch_manager":
        return allRoles.filter((role) =>
          ["bid_manager", "project_manager", "finance_manager", "technical_director", "sales_director"].includes(
            role.value,
          ),
        )
      default:
        return []
    }
  }

  // Update the existing useEffect to also set available roles
  useEffect(() => {
    const checkUserPermissions = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single()

          // Only these management roles can create users
          const allowedRoles = ["branch_manager", "bu_director", "amea_president", "ceo"]

          if (!userData || !allowedRoles.includes(userData.role)) {
            setError(
              "You don't have permission to create users. Only Branch Managers, BU Directors, AMEA President, and CEO can create new users.",
            )
            router.push("/dashboard")
            return
          }

          // Set current user role and available roles they can create
          setCurrentUserRole(userData.role)
          setAvailableRoles(getAvailableRoles(userData.role))
        }
      } catch (error) {
        console.error("Error checking permissions:", error)
        setError("Error checking permissions")
        router.push("/dashboard")
      }
    }

    checkUserPermissions()
  }, [router, supabase])

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*"
    let password = ""
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormData((prev) => ({ ...prev, password }))
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    // Validation
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters")
      setLoading(false)
      return
    }

    try {
      // Create user with Supabase Auth using service role
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: formData.email,
        password: formData.password,
        email_confirm: true,
      })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      if (authData.user) {
        // Create user profile
        const { error: profileError } = await supabase.from("users").insert({
          id: authData.user.id,
          email: formData.email,
          full_name: formData.fullName,
          role: formData.role,
          branch: formData.branch,
          country: formData.country,
        })

        if (profileError) {
          setError("Failed to create user profile: " + profileError.message)
          setLoading(false)
          return
        }

        setSuccess(`User created successfully! Email: ${formData.email}, Password: ${formData.password}`)

        // Reset form
        setFormData({
          email: "",
          password: "",
          fullName: "",
          role: "",
          branch: "",
          country: "",
        })
      }
    } catch (err: any) {
      setError("An unexpected error occurred: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-[#f5faff] to-[#fffde9]">
      <Navbar />

      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.push("/dashboard")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>

          <h1 className="text-3xl font-bold text-blue-900">Create New User</h1>
          <p className="text-gray-600 mt-2">Add a new user to the Keller PLM system</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>User Details</CardTitle>
            <CardDescription>Fill in the information for the new user account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="border-green-200 bg-green-50">
                  <AlertDescription className="text-green-800 whitespace-pre-line">{success}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter full name"
                  value={formData.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  required
                  className="border-gray-300 focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user.email@keller.com"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  required
                  className="border-gray-300 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={formData.role} onValueChange={(value) => handleChange("role", value)}>
                    <SelectTrigger className="border-gray-300 focus:border-blue-500">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    You can only create users with roles at your level or below in the hierarchy.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select value={formData.country} onValueChange={(value) => handleChange("country", value)}>
                    <SelectTrigger className="border-gray-300 focus:border-blue-500">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch">Branch/Office</Label>
                <Input
                  id="branch"
                  type="text"
                  placeholder="e.g., Dubai, Riyadh, Cairo"
                  value={formData.branch}
                  onChange={(e) => handleChange("branch", e.target.value)}
                  required
                  className="border-gray-300 focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      value={formData.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      required
                      className="border-gray-300 focus:border-blue-500 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                  <Button type="button" variant="outline" onClick={generatePassword} className="whitespace-nowrap">
                    Generate
                  </Button>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" className="flex-1 bg-blue-900 hover:bg-blue-800 text-white" disabled={loading}>
                  {loading ? "Creating User..." : "Create User"}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.push("/dashboard")} className="flex-1">
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
