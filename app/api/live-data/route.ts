import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function GET(request: NextRequest) {
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        // Not needed for server-side operations
      },
      remove(name: string, options: any) {
        // Not needed for server-side operations
      },
    },
  })

  try {
    // Get current user from auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parallel queries for dashboard data
    const [projectsResult, gatesResult, approvalsResult, notificationsResult, lessonsResult] = await Promise.all([
      // Get all projects with basic stats
      supabase
        .from("projects")
        .select(`
          id, name, revenue, risk_factor, category, status, current_gate, country, technique,
          created_at, next_review_date, bid_manager_id, project_manager_id
        `),

      // Get gate performance data
      supabase
        .from("gates")
        .select("gate_number, status, started_at, completed_at, deadline"),

      // Get pending approvals
      supabase
        .from("approvals")
        .select(`
          id, status, created_at, required_role,
          gate_id,
          gates!inner(gate_number, project_id, projects!inner(name))
        `)
        .eq("status", "pending"),

      // Get unread notifications for current user
      supabase
        .from("notifications")
        .select("id, title, type, created_at")
        .eq("user_id", user.id)
        .is("read_at", null),

      // Get recent lessons learned
      supabase
        .from("lessons_learned")
        .select("id, title, category, impact_level, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
    ])

    if (projectsResult.error) throw projectsResult.error
    if (gatesResult.error) throw gatesResult.error
    if (approvalsResult.error) throw approvalsResult.error
    if (notificationsResult.error) throw notificationsResult.error
    if (lessonsResult.error) throw lessonsResult.error

    const projects = projectsResult.data || []
    const gates = gatesResult.data || []
    const approvals = approvalsResult.data || []
    const notifications = notificationsResult.data || []
    const lessons = lessonsResult.data || []

    // Calculate key metrics
    const totalProjects = projects.length
    const activeProjects = projects.filter((p) =>
      ["opportunity", "bidding", "contract_review", "in_progress"].includes(p.status),
    ).length

    const totalPortfolioValue = projects.reduce((sum, p) => sum + (p.revenue || 0), 0)
    const avgRiskFactor =
      projects.length > 0 ? projects.reduce((sum, p) => sum + p.risk_factor, 0) / projects.length : 0

    // Category distribution
    const categoryDistribution = projects.reduce(
      (acc, project) => {
        acc[project.category] = (acc[project.category] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    // Gate performance analysis
    const gatePerformance = Array.from({ length: 7 }, (_, i) => {
      const gateNumber = i + 1
      const gateData = gates.filter((g) => g.gate_number === gateNumber)
      const completedGates = gateData.filter((g) => g.status === "approved" && g.completed_at)
      const overdueGates = gateData.filter(
        (g) => g.status === "pending" && g.deadline && new Date(g.deadline) < new Date(),
      )

      // Calculate average processing time for completed gates
      const avgDays =
        completedGates.length > 0
          ? completedGates.reduce((sum, gate) => {
              const start = new Date(gate.started_at)
              const end = new Date(gate.completed_at!)
              return sum + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
            }, 0) / completedGates.length
          : 0

      const onTimeRate = gateData.length > 0 ? ((gateData.length - overdueGates.length) / gateData.length) * 100 : 100

      return {
        gate: `Gate ${gateNumber}`,
        avgDays: Math.round(avgDays * 10) / 10,
        onTime: Math.round(onTimeRate),
        overdue: overdueGates.length,
        total: gateData.length,
      }
    })

    // Projects by current gate
    const projectsByGate = projects.reduce(
      (acc, project) => {
        const gate = `Gate ${project.current_gate}`
        acc[gate] = (acc[gate] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    // Risk factor trend (mock data for last 6 months)
    const riskFactorTrend = [
      { month: "Jul", avgRF: 4.2 },
      { month: "Aug", avgRF: 4.8 },
      { month: "Sep", avgRF: 4.1 },
      { month: "Oct", avgRF: 5.2 },
      { month: "Nov", avgRF: 4.9 },
      { month: "Dec", avgRF: Math.round(avgRiskFactor * 10) / 10 },
    ]

    // Overdue approvals
    const overdueApprovals = approvals.filter((approval) => {
      const createdDate = new Date(approval.created_at)
      const daysSinceCreated = Math.ceil((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
      return daysSinceCreated > 3 // Consider overdue after 3 days
    })

    // Bottleneck analysis
    const bottlenecks = gatePerformance
      .filter((gate) => gate.avgDays > 5 || gate.overdue > 0)
      .sort((a, b) => b.avgDays + b.overdue * 2 - (a.avgDays + a.overdue * 2))
      .slice(0, 3)

    // Compliance metrics
    const complianceMetrics = {
      documentCompliance: Math.round(Math.random() * 20 + 80), // Mock data
      approvalAuthorityCompliance: Math.round(Math.random() * 15 + 85),
      noticePeriodCompliance: Math.round(Math.random() * 25 + 70),
      designReviewCompliance: Math.round(Math.random() * 20 + 75),
    }

    const dashboardData = {
      // Key metrics
      totalProjects,
      activeProjects,
      pendingApprovals: approvals.length,
      overdueApprovals: overdueApprovals.length,
      totalPortfolioValue,
      avgRiskFactor: Math.round(avgRiskFactor * 10) / 10,
      unreadNotifications: notifications.length,

      // Charts data
      categoryDistribution: Object.entries(categoryDistribution).map(([name, value]) => ({
        name: name.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        value,
        color: getCategoryColor(name),
      })),

      gatePerformance,
      projectsByGate,
      riskFactorTrend,

      // Lists
      recentProjects: projects
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
        .map((project) => ({
          ...project,
          revenue: project.revenue / 100, // Convert from cents to dollars
          categoryDisplay: project.category.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        })),

      pendingApprovalsList: approvals.slice(0, 10).map((approval) => ({
        id: approval.id,
        projectName: approval.gates?.projects?.name || "Unknown Project",
        gate: `Gate ${approval.gates?.gate_number}`,
        requiredRole: approval.required_role.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        daysWaiting: Math.ceil((Date.now() - new Date(approval.created_at).getTime()) / (1000 * 60 * 60 * 24)),
      })),

      recentNotifications: notifications.slice(0, 5),
      recentLessons: lessons,

      // Analysis
      bottlenecks: bottlenecks.map((bottleneck) => ({
        gate: bottleneck.gate,
        avgDelay: bottleneck.avgDays,
        overdueCount: bottleneck.overdue,
        severity:
          bottleneck.avgDays > 10 || bottleneck.overdue > 5
            ? "high"
            : bottleneck.avgDays > 5 || bottleneck.overdue > 2
              ? "medium"
              : "low",
      })),

      complianceMetrics,

      // Success rate
      gateSuccessRate: Math.round(gatePerformance.reduce((sum, gate) => sum + gate.onTime, 0) / gatePerformance.length),
    }

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error("Error fetching dashboard data:", error)
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 })
  }
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    category_1a: "#10b981",
    category_1b: "#3b82f6",
    category_1c: "#8b5cf6",
    category_2: "#f59e0b",
    category_3: "#ef4444",
  }
  return colors[category] || "#6b7280"
}
