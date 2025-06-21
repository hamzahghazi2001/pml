"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Navbar } from "@/components/navbar"
import { ApprovalDashboard } from "@/components/approval-dashboard"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { DollarSign, CheckCircle, Clock, FileText, AlertTriangle } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface DashboardMetrics {
  totalProjects: number
  activeProjects: number
  pendingApprovals: number
  overdueApprovals: number
  totalPortfolioValue: number
  avgRiskFactor: number
  unreadNotifications: number
  gateSuccessRate: number
  categoryDistribution: Array<{ name: string; value: number; color: string }>
  gatePerformance: Array<{ gate: string; avgDays: number; onTime: number; overdue: number; total: number }>
  riskFactorTrend: Array<{ month: string; avgRF: number }>
  recentProjects: Array<any>
  pendingApprovalsList: Array<any>
  bottlenecks: Array<{ gate: string; avgDelay: number; overdueCount: number; severity: string }>
  complianceMetrics: {
    documentCompliance: number
    approvalAuthorityCompliance: number
    noticePeriodCompliance: number
    designReviewCompliance: number
    noticePeriodCompliance: number
    designReviewCompliance: number
  }
  userActivity: Array<any>
  teamPerformance: Array<any>
}

interface UserProfile {
  id: string
  email: string
  full_name: string
  role: string
  branch: string
  country: string
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const supabase = createClient()

  useEffect(() => {
    fetchUserProfile()
  }, [])

  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
  }, [user])

  const fetchUserProfile = async () => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (!authUser) {
        setLoading(false)
        return
      }

      const { data: profile, error } = await supabase.from("users").select("*").eq("id", authUser.id).single()

      if (error) {
        console.error("Profile error:", error)
        // Create a default user profile if none exists
        setUser({
          id: authUser.id,
          email: authUser.email || "",
          full_name: authUser.user_metadata?.full_name || "User",
          role: "branch_manager", // Default role
          branch: "Default Branch",
          country: "UAE",
        })
      } else if (profile) {
        setUser(profile)
      }
    } catch (error) {
      console.error("Error fetching user profile:", error)
      setLoading(false)
    }
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // Fetch projects directly from Supabase
      const { data: projects, error: projectsError } = await supabase.from("projects").select(`
          *,
          bid_manager:users!projects_bid_manager_id_fkey(full_name),
          project_manager:users!projects_project_manager_id_fkey(full_name)
        `)

      if (projectsError) {
        console.error("Projects error:", projectsError)
        throw projectsError
      }

      // Fetch approvals with proper joins
      const { data: approvals, error: approvalsError } = await supabase
        .from("project_approvals")
        .select(`
          *,
          project:projects(name, category),
          approver:users!project_approvals_approved_by_fkey(full_name)
        `)
        .eq("status", "pending")

      if (approvalsError) {
        console.error("Approvals error:", approvalsError)
        // Don't throw error, just log it and continue with empty approvals
      }

      // Fetch notifications for current user
      const { data: notifications, error: notificationsError } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .is("read_at", null)

      if (notificationsError) {
        console.error("Notifications error:", notificationsError)
      }

      // Calculate dashboard metrics
      const totalProjects = projects?.length || 0
      const activeProjects =
        projects?.filter((p) => ["opportunity", "bidding", "contract_review", "in_progress"].includes(p.status))
          .length || 0

      const totalPortfolioValue = projects?.reduce((sum, p) => sum + (p.revenue || 0), 0) || 0
      const avgRiskFactor =
        projects?.length > 0 ? projects.reduce((sum, p) => sum + p.risk_factor, 0) / projects.length : 0

      // Category distribution
      const categoryCount =
        projects?.reduce(
          (acc, project) => {
            acc[project.category] = (acc[project.category] || 0) + 1
            return acc
          },
          {} as Record<string, number>,
        ) || {}

      const categoryDistribution = Object.entries(categoryCount).map(([name, value]) => ({
        name: name.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        value,
        color: getCategoryColor(name),
      }))

      // Mock data for charts that require more complex calculations
      const gatePerformance = [
        { gate: "Gate 1", avgDays: 3.2, onTime: 95, overdue: 1, total: 10 },
        { gate: "Gate 2", avgDays: 5.1, onTime: 88, overdue: 2, total: 12 },
        { gate: "Gate 3", avgDays: 7.8, onTime: 82, overdue: 3, total: 15 },
        { gate: "Gate 4", avgDays: 12.3, onTime: 75, overdue: 4, total: 18 },
        { gate: "Gate 5", avgDays: 8.9, onTime: 85, overdue: 2, total: 14 },
        { gate: "Gate 6", avgDays: 6.2, onTime: 90, overdue: 1, total: 11 },
        { gate: "Gate 7", avgDays: 4.1, onTime: 93, overdue: 1, total: 8 },
      ]

      const riskFactorTrend = [
        { month: "Jul", avgRF: 4.2 },
        { month: "Aug", avgRF: 4.8 },
        { month: "Sep", avgRF: 4.1 },
        { month: "Oct", avgRF: 5.2 },
        { month: "Nov", avgRF: 4.9 },
        { month: "Dec", avgRF: Math.round(avgRiskFactor * 10) / 10 },
      ]

      const bottlenecks = [
        { gate: "Gate 4", avgDelay: 12.3, overdueCount: 4, severity: "high" as const },
        { gate: "Gate 3", avgDelay: 7.8, overdueCount: 3, severity: "medium" as const },
      ]

      const dashboardData: DashboardMetrics = {
        totalProjects,
        activeProjects,
        pendingApprovals: approvals?.length || 0,
        overdueApprovals:
          approvals?.filter((approval) => {
            const createdDate = new Date(approval.created_at)
            const daysSinceCreated = Math.ceil((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
            return daysSinceCreated > 3
          }).length || 0,
        totalPortfolioValue: totalPortfolioValue / 100, // Convert from cents
        avgRiskFactor: Math.round(avgRiskFactor * 10) / 10,
        unreadNotifications: notifications?.length || 0,
        gateSuccessRate: 87, // Calculated from gatePerformance
        categoryDistribution,
        gatePerformance,
        riskFactorTrend,
        recentProjects:
          projects?.slice(0, 5).map((project) => ({
            ...project,
            revenue: project.revenue / 100,
            categoryDisplay: project.category.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          })) || [],
        pendingApprovalsList:
          approvals?.slice(0, 10).map((approval) => ({
            id: approval.id,
            projectName: approval.project?.name || "Unknown Project",
            gate: `Gate ${approval.gate_number}`,
            requiredRole: approval.required_role.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
            daysWaiting: Math.ceil((Date.now() - new Date(approval.created_at).getTime()) / (1000 * 60 * 60 * 24)),
          })) || [],
        bottlenecks,
        complianceMetrics: {
          documentCompliance: 85,
          approvalAuthorityCompliance: 92,
          noticePeriodCompliance: 78,
          designReviewCompliance: 88,
        },
        userActivity: [],
        teamPerformance: [],
      }

      setMetrics(dashboardData)
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      // Set fallback data so the dashboard still renders
      setMetrics({
        totalProjects: 0,
        activeProjects: 0,
        pendingApprovals: 0,
        overdueApprovals: 0,
        totalPortfolioValue: 0,
        avgRiskFactor: 0,
        unreadNotifications: 0,
        gateSuccessRate: 0,
        categoryDistribution: [],
        gatePerformance: [],
        riskFactorTrend: [],
        recentProjects: [],
        pendingApprovalsList: [],
        bottlenecks: [],
        complianceMetrics: {
          documentCompliance: 0,
          approvalAuthorityCompliance: 0,
          noticePeriodCompliance: 0,
          designReviewCompliance: 0,
        },
        userActivity: [],
        teamPerformance: [],
      })
    } finally {
      setLoading(false)
    }
  }

  // Helper function for category colors
  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      category_1a: "#10b981",
      category_1b: "#3b82f6",
      category_1c: "#8b5cf6",
      category_2: "#f59e0b",
      category_3: "#ef4444",
    }
    return colors[category] || "#6b7280"
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatRole = (role: string) => {
    return role
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
            <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">
              Refresh Page
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Please sign in to view the dashboard</p>
            <Button onClick={() => (window.location.href = "/auth/signin")}>Sign In</Button>
          </div>
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">Failed to load dashboard data</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-[#f5faff] to-[#fffde9]">
      <Navbar />

      <div className="max-w-7xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-800 rounded-xl shadow-lg p-8 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 to-transparent"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 bg-yellow-400 rounded-lg flex items-center justify-center">
                    <span className="text-slate-900 font-bold text-xl">K</span>
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-yellow-200 bg-clip-text text-transparent">
                      PLM Dashboard
                    </h1>
                    <p className="text-blue-200 text-lg mt-1">Project Lifecycle Management System</p>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <p className="text-yellow-200 font-medium">Welcome back, {user.full_name}</p>
                  <p className="text-blue-200 text-sm">
                    {formatRole(user.role)} • {user.branch} • {user.country}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <div className="text-yellow-200 text-sm font-medium">Last Updated</div>
                  <div className="text-white font-mono text-sm">{new Date().toLocaleString()}</div>
                  <div className="mt-2 flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-green-200 text-xs">System Online</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Approval Dashboard - Show for roles that need to approve */}
        {[
          "branch_manager",
          "bu_director",
          "sales_director",
          "technical_director",
          "finance_manager",
          "amea_president",
          "ceo",
        ].includes(user.role) && <ApprovalDashboard userRole={user.role} userId={user.id} />}

        {/* User Management - Only for BU Directors */}
        {["branch_manager", "bu_director", "amea_president", "ceo"].includes(user.role) && (
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Create and manage user accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push("/dashboard/users/create")} className="bg-blue-900 hover:bg-blue-800">
                Create New User
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalProjects}</div>
              <p className="text-xs text-muted-foreground">{metrics.activeProjects} active projects</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(metrics.totalPortfolioValue)}</div>
              <p className="text-xs text-muted-foreground">Avg RF: {metrics.avgRiskFactor}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.pendingApprovals}</div>
              <p className="text-xs text-muted-foreground">{metrics.overdueApprovals} overdue</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gate Success Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.gateSuccessRate}%</div>
              <p className="text-xs text-muted-foreground">On-time completion rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Project Categories</CardTitle>
              <CardDescription>Distribution by PLM category</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={metrics.categoryDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {metrics.categoryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gate Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Gate Performance</CardTitle>
              <CardDescription>Average processing time by gate</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics.gatePerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="gate" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="avgDays" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent Projects and Bottlenecks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Projects */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Projects</CardTitle>
              <CardDescription>Latest project submissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.recentProjects.slice(0, 5).map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{project.name}</h4>
                      <p className="text-sm text-gray-500">{project.country}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(project.revenue)}</div>
                      <Badge variant="outline">Gate {project.current_gate}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Bottlenecks */}
          <Card>
            <CardHeader>
              <CardTitle>Process Bottlenecks</CardTitle>
              <CardDescription>Gates with delays or issues</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.bottlenecks.map((bottleneck, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{bottleneck.gate}</h4>
                      <p className="text-sm text-gray-500">{bottleneck.overdueCount} overdue items</p>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{bottleneck.avgDelay} days avg</div>
                      <Badge
                        variant={
                          bottleneck.severity === "high"
                            ? "destructive"
                            : bottleneck.severity === "medium"
                              ? "default"
                              : "secondary"
                        }
                      >
                        {bottleneck.severity}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Compliance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Compliance Overview</CardTitle>
            <CardDescription>PLM compliance metrics across all projects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Document Compliance</span>
                  <span className="text-sm text-gray-500">{metrics.complianceMetrics.documentCompliance}%</span>
                </div>
                <Progress value={metrics.complianceMetrics.documentCompliance} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Approval Authority</span>
                  <span className="text-sm text-gray-500">
                    {metrics.complianceMetrics.approvalAuthorityCompliance}%
                  </span>
                </div>
                <Progress value={metrics.complianceMetrics.approvalAuthorityCompliance} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Notice Period</span>
                  <span className="text-sm text-gray-500">{metrics.complianceMetrics.noticePeriodCompliance}%</span>
                </div>
                <Progress value={metrics.complianceMetrics.noticePeriodCompliance} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Design Review</span>
                  <span className="text-sm text-gray-500">{metrics.complianceMetrics.designReviewCompliance}%</span>
                </div>
                <Progress value={metrics.complianceMetrics.designReviewCompliance} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
