"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { CheckCircle, Clock, AlertTriangle, DollarSign, Building, TrendingUp, FileText } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { createClient } from "@/lib/supabase"

interface DashboardData {
  totalProjects: number
  activeProjects: number
  pendingApprovals: number
  overdueApprovals: number
  totalPortfolioValue: number
  avgRiskFactor: number
  unreadNotifications: number
  gateSuccessRate: number
  categoryDistribution: Array<{ name: string; value: number; color: string }>
  gatePerformance: Array<{ gate: string; avgDays: number; onTime: number; overdue: number }>
  riskFactorTrend: Array<{ month: string; avgRF: number }>
  recentProjects: Array<any>
  pendingApprovalsList: Array<any>
  bottlenecks: Array<{ gate: string; avgDelay: number; overdueCount: number; severity: string }>
  complianceMetrics: {
    documentCompliance: number
    approvalAuthorityCompliance: number
    noticePeriodCompliance: number
    designReviewCompliance: number
  }
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const supabase = createClient()

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Fetch projects directly from Supabase
        const { data: projects, error: projectsError } = await supabase.from("projects").select(`
            *,
            bid_manager:users!projects_bid_manager_id_fkey(full_name),
            project_manager:users!projects_project_manager_id_fkey(full_name)
          `)

        if (projectsError) throw projectsError

        // Fetch gates
        const { data: gates, error: gatesError } = await supabase.from("gates").select("*")

        if (gatesError) throw gatesError

        // Fetch notifications for current user
        const {
          data: { user },
        } = await supabase.auth.getUser()

        let notifications = []
        if (user) {
          const { data: notificationsData, error: notificationsError } = await supabase
            .from("notifications")
            .select("*")
            .eq("user_id", user.id)
            .is("read_at", null)

          if (!notificationsError) {
            notifications = notificationsData || []
          }
        }

        // Calculate dashboard metrics
        const totalProjects = projects?.length || 0
        const activeProjects =
          projects?.filter((p) => ["opportunity", "bidding", "contract_review", "in_progress"].includes(p.status))
            .length || 0

        const totalPortfolioValue = projects?.reduce((sum, p) => sum + (p.revenue || 0), 0) || 0
        const avgRiskFactor =
          projects?.length > 0 ? projects.reduce((sum, p) => sum + p.risk_factor, 0) / projects.length : 0

        // Mock data for charts
        const categoryDistribution = [
          { name: "Category 1a", value: 12, color: "#10b981" },
          { name: "Category 1b", value: 8, color: "#3b82f6" },
          { name: "Category 1c", value: 6, color: "#8b5cf6" },
          { name: "Category 2", value: 4, color: "#f59e0b" },
          { name: "Category 3", value: 2, color: "#ef4444" },
        ]

        const gatePerformance = [
          { gate: "Gate 1", avgDays: 3.2, onTime: 95, overdue: 1 },
          { gate: "Gate 2", avgDays: 5.1, onTime: 88, overdue: 2 },
          { gate: "Gate 3", avgDays: 7.8, onTime: 82, overdue: 3 },
          { gate: "Gate 4", avgDays: 12.3, onTime: 75, overdue: 4 },
          { gate: "Gate 5", avgDays: 8.9, onTime: 85, overdue: 2 },
          { gate: "Gate 6", avgDays: 6.2, onTime: 90, overdue: 1 },
          { gate: "Gate 7", avgDays: 4.1, onTime: 93, overdue: 1 },
        ]

        const riskFactorTrend = [
          { month: "Jul", avgRF: 4.2 },
          { month: "Aug", avgRF: 4.8 },
          { month: "Sep", avgRF: 4.1 },
          { month: "Oct", avgRF: 5.2 },
          { month: "Nov", avgRF: 4.9 },
          { month: "Dec", avgRF: Math.round(avgRiskFactor * 10) / 10 },
        ]

        const dashboardData: DashboardData = {
          totalProjects,
          activeProjects,
          pendingApprovals: 5, // Mock data
          overdueApprovals: 2, // Mock data
          totalPortfolioValue: totalPortfolioValue / 100, // Convert from cents
          avgRiskFactor: Math.round(avgRiskFactor * 10) / 10,
          unreadNotifications: notifications.length,
          gateSuccessRate: 87, // Mock data
          categoryDistribution,
          gatePerformance,
          riskFactorTrend,
          recentProjects:
            projects?.slice(0, 5).map((project) => ({
              ...project,
              revenue: project.revenue / 100,
              categoryDisplay: project.category.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
            })) || [],
          pendingApprovalsList: [], // Mock data
          bottlenecks: [
            { gate: "Gate 4", avgDelay: 12.3, overdueCount: 4, severity: "high" },
            { gate: "Gate 3", avgDelay: 7.8, overdueCount: 3, severity: "medium" },
          ],
          complianceMetrics: {
            documentCompliance: 85,
            approvalAuthorityCompliance: 92,
            noticePeriodCompliance: 78,
            designReviewCompliance: 88,
          },
        }

        setData(dashboardData)
      } catch (err) {
        setError("Failed to load dashboard data")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()

    // Refresh data every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [supabase])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">{error || "Failed to load dashboard"}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "low":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-blue-900">PLM Dashboard</h1>
              <p className="text-gray-600 mt-2">Project Lifecycle Management - Real-time Overview</p>
              <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                <span>Last updated: {new Date().toLocaleString()}</span>
                <span>•</span>
                <span>Standard: KG-OP-ST-00001-v1.0</span>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" size="sm">
                <FileText className="w-4 h-4 mr-2" />
                Export Report
              </Button>
              <Button size="sm" className="bg-blue-900 hover:bg-blue-800">
                <TrendingUp className="w-4 h-4 mr-2" />
                View Analytics
              </Button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <Building className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">{data.activeProjects}</div>
              <p className="text-xs text-muted-foreground">of {data.totalProjects} total projects</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-700">{data.pendingApprovals}</div>
              <p className="text-xs text-muted-foreground">{data.overdueApprovals} overdue</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">{formatCurrency(data.totalPortfolioValue)}</div>
              <p className="text-xs text-muted-foreground">Active projects</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-700">{data.gateSuccessRate}%</div>
              <p className="text-xs text-muted-foreground">On-time gate completion</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gate Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-blue-900">Gate Performance Analysis</CardTitle>
              <CardDescription>Average processing time and completion rates</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.gatePerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="gate" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="avgDays" fill="#1e40af" name="Avg Days" />
                  <Bar dataKey="overdue" fill="#dc2626" name="Overdue" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Risk Factor Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-blue-900">Risk Factor Trend</CardTitle>
              <CardDescription>Average risk factor over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.riskFactorTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="avgRF"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    dot={{ fill: "#f59e0b", strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Category Distribution and Recent Projects */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Category Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-blue-900">Project Categories</CardTitle>
              <CardDescription>Distribution across PLM categories</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={data.categoryDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data.categoryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recent Projects */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-blue-900">Recent Projects</CardTitle>
              <CardDescription>Latest project activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.recentProjects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-blue-900">{project.name}</h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                        <span>{project.country}</span>
                        <span>•</span>
                        <span>{formatCurrency(project.revenue)}</span>
                        <span>•</span>
                        <span>Gate {project.current_gate}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {project.categoryDisplay}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${
                          project.status === "in_progress"
                            ? "bg-blue-100 text-blue-800"
                            : project.status === "bidding"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {project.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottlenecks and Compliance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bottleneck Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-blue-900">Bottleneck Analysis</CardTitle>
              <CardDescription>Gates requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.bottlenecks.length > 0 ? (
                  data.bottlenecks.map((bottleneck, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-blue-900">{bottleneck.gate}</div>
                        <div className="text-sm text-gray-600">
                          Avg delay: {bottleneck.avgDelay} days • {bottleneck.overdueCount} overdue
                        </div>
                      </div>
                      <Badge className={getSeverityColor(bottleneck.severity)}>{bottleneck.severity}</Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                    <p>No significant bottlenecks detected</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Compliance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-blue-900">Compliance Metrics</CardTitle>
              <CardDescription>Adherence to PLM standards</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Document Compliance</span>
                    <span>{data.complianceMetrics.documentCompliance}%</span>
                  </div>
                  <Progress value={data.complianceMetrics.documentCompliance} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Approval Authority</span>
                    <span>{data.complianceMetrics.approvalAuthorityCompliance}%</span>
                  </div>
                  <Progress value={data.complianceMetrics.approvalAuthorityCompliance} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Notice Period</span>
                    <span>{data.complianceMetrics.noticePeriodCompliance}%</span>
                  </div>
                  <Progress value={data.complianceMetrics.noticePeriodCompliance} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Design Review</span>
                    <span>{data.complianceMetrics.designReviewCompliance}%</span>
                  </div>
                  <Progress value={data.complianceMetrics.designReviewCompliance} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
