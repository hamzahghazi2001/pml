import { createClient } from "@/lib/supabase"

export interface ProjectMetrics {
  totalValue: number
  averageRiskFactor: number
  completionRate: number
  onTimeDelivery: number
  categoryBreakdown: Record<string, number>
  gateEfficiency: Record<string, number>
}

export interface UserPerformanceMetrics {
  userId: string
  projectsManaged: number
  averageGateTime: number
  approvalRate: number
  activityScore: number
}

export class PLMCalculationEngine {
  private supabase = createClient()

  async calculateProjectMetrics(filters?: {
    country?: string
    category?: string
    dateRange?: { start: Date; end: Date }
  }): Promise<ProjectMetrics> {
    let query = this.supabase.from("projects").select(`
        revenue, risk_factor, category, status, current_gate, created_at,
        gates(gate_number, status, started_at, completed_at)
      `)

    // Apply filters
    if (filters?.country) {
      query = query.eq("country", filters.country)
    }
    if (filters?.category) {
      query = query.eq("category", filters.category)
    }
    if (filters?.dateRange) {
      query = query
        .gte("created_at", filters.dateRange.start.toISOString())
        .lte("created_at", filters.dateRange.end.toISOString())
    }

    const { data: projects, error } = await query

    if (error) throw error

    return this.processProjectMetrics(projects || [])
  }

  async calculateUserPerformance(userId: string): Promise<UserPerformanceMetrics> {
    const [projectsResult, gatesResult, approvalsResult, activitiesResult] = await Promise.all([
      // Projects managed by user
      this.supabase
        .from("projects")
        .select("*")
        .or(`bid_manager_id.eq.${userId},project_manager_id.eq.${userId}`),

      // Gates for user's projects
      this.supabase
        .from("gates")
        .select(`
          *, projects!inner(bid_manager_id, project_manager_id)
        `)
        .or(`projects.bid_manager_id.eq.${userId},projects.project_manager_id.eq.${userId}`),

      // Approvals by user
      this.supabase
        .from("approvals")
        .select("*")
        .eq("approver_id", userId),

      // User activities
      this.supabase
        .from("user_activities")
        .select("*")
        .eq("user_id", userId)
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()), // Last 30 days
    ])

    if (projectsResult.error) throw projectsResult.error
    if (gatesResult.error) throw gatesResult.error
    if (approvalsResult.error) throw approvalsResult.error
    if (activitiesResult.error) throw activitiesResult.error

    return this.processUserPerformance(
      userId,
      projectsResult.data || [],
      gatesResult.data || [],
      approvalsResult.data || [],
      activitiesResult.data || [],
    )
  }

  async calculateGateBottlenecks(): Promise<
    Array<{
      gate: number
      averageDelay: number
      bottleneckScore: number
      affectedProjects: number
    }>
  > {
    const { data: gates, error } = await this.supabase.from("gates").select(`
        gate_number, status, started_at, completed_at, deadline,
        projects(name, category, revenue)
      `)

    if (error) throw error

    return this.processGateBottlenecks(gates || [])
  }

  async calculateComplianceScore(projectId?: string): Promise<{
    overall: number
    documentCompliance: number
    approvalCompliance: number
    timelineCompliance: number
    details: Array<{ metric: string; score: number; issues: string[] }>
  }> {
    const projectFilter = projectId ? `.eq('project_id', '${projectId}')` : ""

    const [gatesResult, approvalsResult, documentsResult] = await Promise.all([
      this.supabase
        .from("gates")
        .select("*")
        .then((result) => (projectId ? this.supabase.from("gates").select("*").eq("project_id", projectId) : result)),

      this.supabase
        .from("approvals")
        .select(`
          *, gates!inner(project_id)
        `)
        .then((result) =>
          projectId
            ? this.supabase.from("approvals").select("*, gates!inner(project_id)").eq("gates.project_id", projectId)
            : result,
        ),

      this.supabase
        .from("documents")
        .select("*")
        .then((result) =>
          projectId ? this.supabase.from("documents").select("*").eq("project_id", projectId) : result,
        ),
    ])

    if (gatesResult.error) throw gatesResult.error
    if (approvalsResult.error) throw approvalsResult.error
    if (documentsResult.error) throw documentsResult.error

    return this.processComplianceScore(gatesResult.data || [], approvalsResult.data || [], documentsResult.data || [])
  }

  private processProjectMetrics(projects: any[]): ProjectMetrics {
    const totalValue = projects.reduce((sum, p) => sum + (p.revenue || 0), 0)
    const averageRiskFactor =
      projects.length > 0 ? projects.reduce((sum, p) => sum + p.risk_factor, 0) / projects.length : 0

    const completedProjects = projects.filter((p) => p.status === "completed").length
    const completionRate = projects.length > 0 ? (completedProjects / projects.length) * 100 : 0

    // Calculate on-time delivery
    const projectsWithGates = projects.filter((p) => p.gates && p.gates.length > 0)
    const onTimeProjects = projectsWithGates.filter((p) => {
      const completedGates = p.gates.filter((g: any) => g.status === "approved")
      const overdueGates = p.gates.filter(
        (g: any) => g.deadline && new Date(g.completed_at || Date.now()) > new Date(g.deadline),
      )
      return overdueGates.length === 0 && completedGates.length > 0
    }).length

    const onTimeDelivery = projectsWithGates.length > 0 ? (onTimeProjects / projectsWithGates.length) * 100 : 100

    // Category breakdown
    const categoryBreakdown = projects.reduce(
      (acc, p) => {
        acc[p.category] = (acc[p.category] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    // Gate efficiency
    const gateEfficiency: Record<string, number> = {}
    for (let i = 1; i <= 7; i++) {
      const gateData = projects.flatMap((p) => p.gates || []).filter((g: any) => g.gate_number === i)
      const completedGates = gateData.filter((g: any) => g.status === "approved")
      gateEfficiency[`gate_${i}`] = gateData.length > 0 ? (completedGates.length / gateData.length) * 100 : 0
    }

    return {
      totalValue: totalValue / 100, // Convert from cents
      averageRiskFactor: Math.round(averageRiskFactor * 10) / 10,
      completionRate: Math.round(completionRate),
      onTimeDelivery: Math.round(onTimeDelivery),
      categoryBreakdown,
      gateEfficiency,
    }
  }

  private processUserPerformance(
    userId: string,
    projects: any[],
    gates: any[],
    approvals: any[],
    activities: any[],
  ): UserPerformanceMetrics {
    const projectsManaged = projects.length

    // Calculate average gate processing time
    const completedGates = gates.filter((g) => g.status === "approved" && g.started_at && g.completed_at)
    const averageGateTime =
      completedGates.length > 0
        ? completedGates.reduce((sum, gate) => {
            const start = new Date(gate.started_at)
            const end = new Date(gate.completed_at)
            return sum + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
          }, 0) / completedGates.length
        : 0

    // Calculate approval rate
    const totalApprovals = approvals.length
    const approvedCount = approvals.filter((a) => a.status === "approved").length
    const approvalRate = totalApprovals > 0 ? (approvedCount / totalApprovals) * 100 : 100

    // Calculate activity score based on recent activities
    const activityScore = Math.min(100, activities.length * 2) // Simple scoring

    return {
      userId,
      projectsManaged,
      averageGateTime: Math.round(averageGateTime * 10) / 10,
      approvalRate: Math.round(approvalRate),
      activityScore,
    }
  }

  private processGateBottlenecks(gates: any[]) {
    const bottlenecks = []

    for (let gateNumber = 1; gateNumber <= 7; gateNumber++) {
      const gateData = gates.filter((g) => g.gate_number === gateNumber)

      if (gateData.length === 0) continue

      const delays = gateData
        .filter((g) => g.started_at && g.completed_at)
        .map((g) => {
          const start = new Date(g.started_at)
          const end = new Date(g.completed_at)
          return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
        })

      const averageDelay = delays.length > 0 ? delays.reduce((sum, delay) => sum + delay, 0) / delays.length : 0

      const overdueCount = gateData.filter(
        (g) => g.deadline && new Date() > new Date(g.deadline) && g.status !== "approved",
      ).length

      const bottleneckScore = averageDelay + overdueCount * 5 // Weight overdue gates more heavily

      bottlenecks.push({
        gate: gateNumber,
        averageDelay: Math.round(averageDelay * 10) / 10,
        bottleneckScore: Math.round(bottleneckScore * 10) / 10,
        affectedProjects: gateData.length,
      })
    }

    return bottlenecks.sort((a, b) => b.bottleneckScore - a.bottleneckScore)
  }

  private processComplianceScore(gates: any[], approvals: any[], documents: any[]) {
    const issues: Array<{ metric: string; score: number; issues: string[] }> = []

    // Document compliance
    const requiredDocs = ["BAR", "CAR", "Risk Register", "Technical Proposal"]
    const availableDocs = [...new Set(documents.map((d) => d.document_type))]
    const docComplianceScore = (availableDocs.length / requiredDocs.length) * 100
    const docIssues = requiredDocs.filter((doc) => !availableDocs.includes(doc))

    issues.push({
      metric: "Document Compliance",
      score: Math.round(docComplianceScore),
      issues: docIssues.map((doc) => `Missing ${doc}`),
    })

    // Approval compliance
    const totalApprovals = approvals.length
    const approvedCount = approvals.filter((a) => a.status === "approved").length
    const approvalComplianceScore = totalApprovals > 0 ? (approvedCount / totalApprovals) * 100 : 100
    const pendingApprovals = approvals.filter((a) => a.status === "pending")

    issues.push({
      metric: "Approval Compliance",
      score: Math.round(approvalComplianceScore),
      issues: pendingApprovals.map((a) => `Pending approval for ${a.required_role}`),
    })

    // Timeline compliance
    const overdueGates = gates.filter((g) => g.deadline && new Date() > new Date(g.deadline) && g.status !== "approved")
    const timelineComplianceScore = gates.length > 0 ? ((gates.length - overdueGates.length) / gates.length) * 100 : 100

    issues.push({
      metric: "Timeline Compliance",
      score: Math.round(timelineComplianceScore),
      issues: overdueGates.map((g) => `Gate ${g.gate_number} overdue`),
    })

    const overall = Math.round((docComplianceScore + approvalComplianceScore + timelineComplianceScore) / 3)

    return {
      overall,
      documentCompliance: Math.round(docComplianceScore),
      approvalCompliance: Math.round(approvalComplianceScore),
      timelineCompliance: Math.round(timelineComplianceScore),
      details: issues,
    }
  }
}

// Export singleton instance
export const plmCalculations = new PLMCalculationEngine()
