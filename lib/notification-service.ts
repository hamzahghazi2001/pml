import { createClient } from "@/lib/supabase"

/**
 * Shape used when you trigger a workflow-related notification.
 */
interface NotificationData {
  projectId: string
  projectName: string
  projectCategory: string
  currentGate: number
  actionType: "gate_advancement" | "approval_request" | "approval_decision" | "gate_completion" | "project_creation"
  triggeredBy: string
  additionalData?: Record<string, unknown>
}

/* -------------------------------------------------------------------------- */
/*                          PLM NOTIFICATION MATRIX                          */
/* -------------------------------------------------------------------------- */

// Based on the official PLM document - exact role mappings for each gate and category
const PLM_NOTIFICATION_MATRIX = {
  gate_1: {
    category_1a: {
      approvers: ["bid_manager"],
      notifyRoles: ["branch_manager"],
      informRoles: [],
    },
    category_1b: {
      approvers: ["bid_manager"],
      notifyRoles: ["branch_manager"],
      informRoles: [],
    },
    category_1c: {
      approvers: ["bid_manager"],
      notifyRoles: ["branch_manager"],
      informRoles: [],
    },
    category_2: {
      approvers: ["branch_manager"],
      notifyRoles: ["bu_director"],
      informRoles: ["bu_director"],
    },
    category_3: {
      approvers: ["bu_director"],
      notifyRoles: ["amea_president"],
      informRoles: ["amea_president"],
    },
  },
  gate_2: {
    category_1a: {
      approvers: ["bid_manager"],
      notifyRoles: ["branch_manager"],
      informRoles: ["sales_director", "technical_director"],
    },
    category_1b: {
      approvers: ["branch_manager"],
      notifyRoles: [],
      informRoles: ["sales_director", "technical_director", "bu_director"],
    },
    category_1c: {
      approvers: ["branch_manager"],
      notifyRoles: [],
      informRoles: ["sales_director", "technical_director", "bu_director"],
    },
    category_2: {
      approvers: ["bu_director"],
      notifyRoles: [],
      informRoles: ["amea_president"],
      noticeDays: 1,
    },
    category_3: {
      approvers: ["amea_president"],
      notifyRoles: [],
      informRoles: ["ceo"],
      noticeDays: 3,
    },
  },
  gate_3: {
    category_1a: {
      approvers: ["bid_manager"],
      notifyRoles: ["branch_manager", "finance_manager"],
      informRoles: [],
    },
    category_1b: {
      approvers: ["sales_director", "technical_director"],
      notifyRoles: [],
      informRoles: [],
    },
    category_1c: {
      approvers: ["bu_director", "finance_director"],
      notifyRoles: [],
      informRoles: [],
    },
    category_2: {
      approvers: ["amea_president"],
      notifyRoles: [],
      informRoles: ["project_review_team"],
      noticeDays: 3,
    },
    category_3: {
      approvers: ["ceo"],
      notifyRoles: [],
      informRoles: ["project_review_team"],
      noticeDays: 7,
    },
  },
  gate_4: {
    category_1a: {
      approvers: ["bid_manager"],
      notifyRoles: ["branch_manager", "finance_manager"],
      informRoles: [],
    },
    category_1b: {
      approvers: ["sales_director", "technical_director"],
      notifyRoles: [],
      informRoles: [],
      noticeDays: 2,
    },
    category_1c: {
      approvers: ["bu_director", "finance_director"],
      notifyRoles: [],
      informRoles: [],
      noticeDays: 3,
    },
    category_2: {
      approvers: ["amea_president"],
      notifyRoles: [],
      informRoles: ["project_review_team"],
      noticeDays: 7,
    },
    category_3: {
      approvers: ["ceo"],
      notifyRoles: [],
      informRoles: ["amea_president", "project_review_team"],
      noticeDays: 14,
    },
  },
  gate_5: {
    category_1a: {
      approvers: ["project_manager"],
      notifyRoles: ["branch_manager"],
      informRoles: ["finance_manager"],
    },
    category_1b: {
      approvers: ["branch_manager"],
      notifyRoles: [],
      informRoles: ["finance_manager"],
    },
    category_1c: {
      approvers: ["branch_manager", "bu_director"],
      notifyRoles: [],
      informRoles: ["finance_manager"],
    },
    category_2: {
      approvers: ["bu_director"],
      notifyRoles: [],
      informRoles: ["amea_president"],
      noticeDays: 3,
    },
    category_3: {
      approvers: ["bu_director"],
      notifyRoles: [],
      informRoles: ["amea_president", "project_review_team"],
      noticeDays: 7,
    },
  },
  gate_6: {
    category_1a: {
      approvers: ["project_manager"],
      notifyRoles: ["branch_manager"],
      informRoles: ["finance_manager"],
    },
    category_1b: {
      approvers: ["branch_manager"],
      notifyRoles: [],
      informRoles: ["finance_manager"],
    },
    category_1c: {
      approvers: ["branch_manager", "bu_director"],
      notifyRoles: [],
      informRoles: ["finance_manager"],
    },
    category_2: {
      approvers: ["bu_director"],
      notifyRoles: [],
      informRoles: ["project_review_team"],
    },
    category_3: {
      approvers: ["bu_director"],
      notifyRoles: [],
      informRoles: ["project_review_team"],
    },
  },
  gate_7: {
    category_1a: {
      approvers: ["project_manager"],
      notifyRoles: ["branch_manager"],
      informRoles: ["finance_manager"],
    },
    category_1b: {
      approvers: ["branch_manager"],
      notifyRoles: [],
      informRoles: ["finance_manager"],
    },
    category_1c: {
      approvers: ["branch_manager", "bu_director"],
      notifyRoles: [],
      informRoles: ["finance_manager"],
    },
    category_2: {
      approvers: ["bu_director"],
      notifyRoles: [],
      informRoles: ["project_review_team"],
    },
    category_3: {
      approvers: ["bu_director"],
      notifyRoles: [],
      informRoles: ["project_review_team"],
    },
  },
} as const

// Periodic Performance Review Matrix (for ongoing monitoring)
const PERIODIC_REVIEW_MATRIX = {
  category_1a: {
    responsible: ["project_manager"],
    notifyRoles: ["branch_manager"],
    informRoles: ["finance_director", "bu_director"],
  },
  category_1b: {
    responsible: ["branch_manager"],
    notifyRoles: [],
    informRoles: ["finance_director", "bu_director"],
  },
  category_1c: {
    responsible: ["branch_manager", "bu_director"],
    notifyRoles: [],
    informRoles: ["finance_director", "bu_director"],
  },
  category_2: {
    responsible: ["amea_president"],
    notifyRoles: [],
    informRoles: ["bu_director", "division_amea"],
    noticeDays: 1,
    frequency: "monthly",
  },
  category_3: {
    responsible: ["group_eo_director"],
    notifyRoles: [],
    informRoles: ["bu_director", "division_amea", "group_executive"],
    noticeDays: 1,
    frequency: "monthly",
  },
}

/* -------------------------------------------------------------------------- */
/*                          NOTIFICATION SERVICE                              */
/* -------------------------------------------------------------------------- */

export class NotificationService {
  private supabase = createClient()

  /** Create notifications when a new approval is needed or a gate advances. */
  async createNotificationsForGateAction(data: NotificationData) {
    const gateKey = `gate_${data.currentGate}` as keyof typeof PLM_NOTIFICATION_MATRIX
    const categoryKey = data.projectCategory as keyof (typeof PLM_NOTIFICATION_MATRIX)[typeof gateKey]

    const approvalConfig = PLM_NOTIFICATION_MATRIX[gateKey]?.[categoryKey]
    if (!approvalConfig) {
      console.warn(`No approval config found for gate ${data.currentGate} category ${data.projectCategory}`)
      return
    }

    // Determine which roles to notify based on action type
    let targetRoles: string[] = []

    if (data.actionType === "approval_request") {
      // For approval requests, notify approvers and those who need to be notified
      targetRoles = [...approvalConfig.approvers, ...approvalConfig.notifyRoles]
    } else if (data.actionType === "gate_advancement") {
      // For gate advancement, inform all relevant parties
      targetRoles = [...approvalConfig.approvers, ...approvalConfig.notifyRoles, ...approvalConfig.informRoles]
    } else {
      // For other actions, notify all relevant parties
      targetRoles = [...approvalConfig.approvers, ...approvalConfig.notifyRoles, ...approvalConfig.informRoles]
    }

    // Remove duplicates
    targetRoles = [...new Set(targetRoles)]

    // Handle special roles
    const expandedRoles = this.expandSpecialRoles(targetRoles)

    const { data: users, error: usersErr } = await this.supabase
      .from("users")
      .select("id, role, full_name, email")
      .in("role", expandedRoles)

    if (usersErr) {
      console.error("Error fetching users for notifications:", usersErr)
      return
    }

    if (!users || users.length === 0) {
      console.warn(`No users found for roles: ${expandedRoles.join(", ")}`)
      return
    }

    const rows = users.map((user) => {
      const isApprover = approvalConfig.approvers.includes(user.role)
      const isNotifyRole = approvalConfig.notifyRoles.includes(user.role)
      const isInformRole = approvalConfig.informRoles.includes(user.role)

      let notificationType = "project_update"
      let title = ""
      let message = ""

      if (data.actionType === "approval_request" && isApprover) {
        notificationType = "approval_request"
        title = `Approval Required: ${data.projectName} – Gate ${data.currentGate}`
        message = `Project "${data.projectName}" (${data.projectCategory.toUpperCase()}) requires your approval to progress from Gate ${data.currentGate}.`
      } else if (data.actionType === "gate_advancement") {
        notificationType = "gate_advancement"
        title = `Gate ${data.currentGate} Advanced: ${data.projectName}`
        message = `Project "${data.projectName}" has successfully advanced to Gate ${data.currentGate}.`
      } else if (data.actionType === "approval_decision") {
        notificationType = "approval_decision"
        title = `Gate ${data.currentGate} Decision: ${data.projectName}`
        message = `An approval decision has been made for "${data.projectName}" at Gate ${data.currentGate}.`
      } else {
        // General notification for inform roles
        title = `Gate ${data.currentGate} Update: ${data.projectName}`
        message = `Project "${data.projectName}" has an update at Gate ${data.currentGate}. Action: ${data.actionType}.`
      }

      return {
        user_id: user.id,
        project_id: data.projectId,
        title,
        message,
        type: notificationType,
        metadata: {
          ...data.additionalData,
          gate: data.currentGate,
          category: data.projectCategory,
          action: data.actionType,
          triggered_by: data.triggeredBy,
          is_approver: isApprover,
          is_notify_role: isNotifyRole,
          is_inform_role: isInformRole,
          notice_days: approvalConfig.noticeDays || 0,
        },
        read_at: null,
        created_at: new Date().toISOString(),
      }
    })

    if (rows.length > 0) {
      const { error } = await this.supabase.from("notifications").insert(rows)
      if (error) {
        console.error("Error inserting notifications:", error)
      } else {
        console.log(`Created ${rows.length} notifications for gate ${data.currentGate} action: ${data.actionType}`)
      }
    }
  }

  /** Expand special roles like project_review_team into actual roles */
  private expandSpecialRoles(roles: string[]): string[] {
    const expanded: string[] = []

    for (const role of roles) {
      if (role === "project_review_team") {
        // Project review team includes multiple roles
        expanded.push("bu_director", "division_amea", "group_executive", "technical_director", "finance_director")
      } else {
        expanded.push(role)
      }
    }

    return [...new Set(expanded)]
  }

  /** Insert notifications when an approver makes a decision. */
  async createApprovalDecisionNotification(
    projectId: string,
    projectName: string,
    projectCategory: string,
    currentGate: number,
    approvalStatus: "approved" | "rejected",
    approverName: string,
    comments?: string,
  ) {
    // Get project stakeholders
    const { data: project, error: projErr } = await this.supabase
      .from("projects")
      .select(`
        id,
        bid_manager:users!projects_bid_manager_id_fkey(id, role, full_name),
        project_manager:users!projects_project_manager_id_fkey(id, role, full_name),
        creator:users!projects_created_by_fkey(id, role, full_name)
      `)
      .eq("id", projectId)
      .single()

    if (projErr) {
      console.error("Error fetching project for approval decision notification:", projErr)
      return
    }

    const stakeholderIds = [project.bid_manager?.id, project.project_manager?.id, project.creator?.id].filter(Boolean)

    // Also notify management based on category
    const gateKey = `gate_${currentGate}` as keyof typeof PLM_NOTIFICATION_MATRIX
    const categoryKey = projectCategory as keyof (typeof PLM_NOTIFICATION_MATRIX)[typeof gateKey]
    const approvalConfig = PLM_NOTIFICATION_MATRIX[gateKey]?.[categoryKey]

    let managementRoles: string[] = []
    if (approvalConfig) {
      managementRoles = [...approvalConfig.notifyRoles, ...approvalConfig.informRoles]
    }

    const { data: mgmt, error: mgmtErr } = await this.supabase
      .from("users")
      .select("id, role, full_name")
      .in("role", this.expandSpecialRoles(managementRoles))

    if (mgmtErr) {
      console.error("Error fetching management for approval decision notification:", mgmtErr)
      return
    }

    const allUserIds = [...stakeholderIds, ...(mgmt?.map((u) => u.id) || [])]
    const uniqueUserIds = [...new Set(allUserIds)]

    const rows = uniqueUserIds.map((uid) => ({
      user_id: uid,
      project_id: projectId,
      title: `Gate ${currentGate} ${approvalStatus.charAt(0).toUpperCase() + approvalStatus.slice(1)}: ${projectName}`,
      message: `${approverName} ${approvalStatus} Gate ${currentGate} for "${projectName}" (${projectCategory.toUpperCase()}).${
        comments ? ` Comments: ${comments}` : ""
      }`,
      type: "approval_decision",
      metadata: {
        gate: currentGate,
        category: projectCategory,
        status: approvalStatus,
        approver: approverName,
        comments: comments || null,
      },
      read_at: null,
      created_at: new Date().toISOString(),
    }))

    if (rows.length > 0) {
      const { error } = await this.supabase.from("notifications").insert(rows)
      if (error) {
        console.error("Error inserting approval decision notifications:", error)
      } else {
        console.log(`Created ${rows.length} approval decision notifications`)
      }
    }
  }

  /** Notify when a project is first created. */
  async createProjectCreationNotification(
    projectId: string,
    projectName: string,
    projectCategory: string,
    creatorName: string,
  ) {
    // Notify relevant management based on category
    let notifyRoles: string[] = []

    switch (projectCategory) {
      case "category_1a":
      case "category_1b":
      case "category_1c":
        notifyRoles = ["branch_manager", "sales_director", "technical_director"]
        break
      case "category_2":
        notifyRoles = ["branch_manager", "bu_director", "sales_director", "technical_director"]
        break
      case "category_3":
        notifyRoles = ["branch_manager", "bu_director", "amea_president", "sales_director", "technical_director"]
        break
    }

    const { data: users, error } = await this.supabase
      .from("users")
      .select("id, role, full_name")
      .in("role", notifyRoles)

    if (error) {
      console.error("Error fetching users for project creation notification:", error)
      return
    }

    if (!users?.length) return

    const rows = users.map((u) => ({
      user_id: u.id,
      project_id: projectId,
      title: `New Project Created: ${projectName}`,
      message: `${creatorName} created a new project "${projectName}" (${projectCategory.toUpperCase()}).`,
      type: "project_creation",
      metadata: {
        category: projectCategory,
        creator: creatorName,
      },
      read_at: null,
      created_at: new Date().toISOString(),
    }))

    const { error: insertError } = await this.supabase.from("notifications").insert(rows)
    if (insertError) {
      console.error("Error inserting project creation notifications:", insertError)
    } else {
      console.log(`Created ${rows.length} project creation notifications`)
    }
  }

  /** Create periodic performance review notifications */
  async createPeriodicReviewNotification(
    projectId: string,
    projectName: string,
    projectCategory: string,
    triggeredBy: string,
  ) {
    const categoryConfig = PERIODIC_REVIEW_MATRIX[projectCategory as keyof typeof PERIODIC_REVIEW_MATRIX]
    if (!categoryConfig) return

    const targetRoles = [...categoryConfig.responsible, ...categoryConfig.notifyRoles, ...categoryConfig.informRoles]

    const { data: users, error } = await this.supabase
      .from("users")
      .select("id, role, full_name")
      .in("role", this.expandSpecialRoles(targetRoles))

    if (error || !users?.length) return

    const rows = users.map((u) => ({
      user_id: u.id,
      project_id: projectId,
      title: `Periodic Review Required: ${projectName}`,
      message: `Periodic performance review is due for "${projectName}" (${projectCategory.toUpperCase()}).`,
      type: "periodic_review",
      metadata: {
        category: projectCategory,
        frequency: categoryConfig.frequency || "weekly",
        notice_days: categoryConfig.noticeDays || 0,
      },
      read_at: null,
      created_at: new Date().toISOString(),
    }))

    await this.supabase.from("notifications").insert(rows)
  }

  /** Scan for overdue approvals and notify parties. */
  async createOverdueApprovalNotifications() {
    const { data: overdue } = await this.supabase
      .from("project_approvals")
      .select(`
        id, gate_number, due_date, project_id, required_role,
        project:projects(name, category)
      `)
      .eq("status", "pending")
      .lt("due_date", new Date().toISOString())

    for (const approval of overdue ?? []) {
      const { data: targets } = await this.supabase
        .from("users")
        .select("id, role, full_name")
        .in("role", [approval.required_role, "branch_manager", "bu_director"])

      if (!targets?.length) continue

      const rows = targets.map((u) => ({
        user_id: u.id,
        project_id: approval.project_id,
        title: `Overdue Approval: Gate ${approval.gate_number}`,
        message: `Approval for "${approval.project.name}" (Gate ${approval.gate_number}) is overdue.`,
        type: "overdue_approval",
        metadata: {
          gate: approval.gate_number,
          category: approval.project.category,
          due_date: approval.due_date,
          required_role: approval.required_role,
        },
        read_at: null,
        created_at: new Date().toISOString(),
      }))

      await this.supabase.from("notifications").insert(rows)
    }
  }

  /** Create a test notification for debugging */
  async createTestNotification(userId: string, projectId: string) {
    console.log("Creating test notification for user:", userId)

    const testNotification = {
      user_id: userId,
      project_id: projectId,
      title: "Test Notification",
      message: "This is a test notification to verify the system is working.",
      type: "approval_request",
      metadata: {
        test: true,
        gate: 1,
        category: "category_1a",
      },
      read_at: null,
      created_at: new Date().toISOString(),
    }

    const { data, error } = await this.supabase.from("notifications").insert([testNotification]).select()

    if (error) {
      console.error("Error creating test notification:", error)
      throw error
    }

    console.log("Test notification created:", data)
    return data
  }
}

export const notificationService = new NotificationService()
