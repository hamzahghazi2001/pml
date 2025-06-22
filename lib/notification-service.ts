import { createClient } from "@/lib/supabase"

/**
 * Shape used when you trigger a workflow-related notification.
 */
interface NotificationData {
  projectId: string
  projectName: string
  projectCategory: string
  currentGate: number
  actionType: "gate_advancement" | "approval_request" | "approval_decision" | "gate_completion"
  triggeredBy: string
  additionalData?: Record<string, unknown>
}

/* -------------------------------------------------------------------------- */
/*                                  MATRIX                                    */
/* -------------------------------------------------------------------------- */

const PLM_APPROVAL_MATRIX = {
  gate_1: {
    category_1a: { approvers: ["bid_manager"], notifyRoles: ["branch_manager"] },
    category_1b: { approvers: ["bid_manager"], notifyRoles: ["branch_manager"] },
    category_1c: { approvers: ["bid_manager"], notifyRoles: ["branch_manager"] },
    category_2: {
      approvers: ["branch_manager"],
      notifyRoles: ["bu_director"],
    },
    category_3: {
      approvers: ["bu_director"],
      notifyRoles: ["amea_president"],
    },
  },
  gate_2: {
    category_1a: {
      approvers: ["bid_manager"],
      notifyRoles: ["sales_director", "technical_director", "branch_manager"],
    },
    category_1b: {
      approvers: ["branch_manager"],
      notifyRoles: ["sales_director", "technical_director", "bu_director"],
    },
    category_1c: {
      approvers: ["branch_manager"],
      notifyRoles: ["sales_director", "technical_director", "bu_director"],
    },
    category_2: {
      approvers: ["bu_director"],
      notifyRoles: ["amea_president"],
      noticeDays: 1,
    },
    category_3: {
      approvers: ["amea_president"],
      notifyRoles: ["ceo"],
      noticeDays: 3,
    },
  },
  gate_3: {
    category_1a: {
      approvers: ["branch_manager", "finance_manager"],
      notifyRoles: ["bu_director"],
    },
    category_1b: {
      approvers: ["sales_director", "technical_director"],
      notifyRoles: ["bu_director", "finance_manager"],
    },
    category_1c: {
      approvers: ["bu_director", "finance_director"],
      notifyRoles: ["amea_president"],
    },
    category_2: {
      approvers: ["amea_president"],
      notifyRoles: ["project_review_team"],
      noticeDays: 3,
    },
    category_3: {
      approvers: ["ceo"],
      notifyRoles: ["project_review_team"],
      noticeDays: 7,
    },
  },
  gate_4: {
    category_1a: {
      approvers: ["branch_manager", "finance_manager"],
      notifyRoles: ["bu_director"],
    },
    category_1b: {
      approvers: ["finance_manager", "bu_director"],
      notifyRoles: ["amea_president"],
    },
    category_1c: {
      approvers: ["bu_director", "finance_director"],
      notifyRoles: ["amea_president"],
    },
    category_2: {
      approvers: ["amea_president"],
      notifyRoles: ["ceo"],
      noticeDays: 3,
    },
    category_3: {
      approvers: ["ceo"],
      notifyRoles: ["board_members"],
      noticeDays: 7,
    },
  },
  gate_5: {
    category_1a: {
      approvers: ["branch_manager", "finance_manager"],
      notifyRoles: ["project_manager"],
    },
    category_1b: {
      approvers: ["branch_manager"],
      notifyRoles: ["project_manager", "bu_director"],
    },
    category_1c: {
      approvers: ["branch_manager"],
      notifyRoles: ["project_manager", "bu_director"],
    },
    category_2: {
      approvers: ["bu_director"],
      notifyRoles: ["project_manager", "amea_president"],
    },
    category_3: {
      approvers: ["bu_director"],
      notifyRoles: ["project_manager", "amea_president"],
    },
  },
  gate_6: {
    category_1a: {
      approvers: ["branch_manager", "finance_manager"],
      notifyRoles: ["project_manager"],
    },
    category_1b: {
      approvers: ["branch_manager"],
      notifyRoles: ["project_manager", "bu_director"],
    },
    category_1c: {
      approvers: ["branch_manager"],
      notifyRoles: ["project_manager", "bu_director"],
    },
    category_2: {
      approvers: ["branch_manager"],
      notifyRoles: ["project_manager", "bu_director"],
    },
    category_3: {
      approvers: ["bu_director"],
      notifyRoles: ["project_manager", "amea_president"],
    },
  },
  gate_7: {
    category_1a: {
      approvers: ["branch_manager"],
      notifyRoles: ["project_manager", "finance_manager"],
    },
    category_1b: {
      approvers: ["branch_manager"],
      notifyRoles: ["project_manager", "bu_director"],
    },
    category_1c: {
      approvers: ["branch_manager"],
      notifyRoles: ["project_manager", "bu_director"],
    },
    category_2: {
      approvers: ["branch_manager"],
      notifyRoles: ["project_manager", "bu_director"],
    },
    category_3: {
      approvers: ["bu_director"],
      notifyRoles: ["project_manager", "amea_president"],
    },
  },
} as const

/* -------------------------------------------------------------------------- */
/*                          NOTIFICATION SERVICE                              */
/* -------------------------------------------------------------------------- */

export class NotificationService {
  private supabase = createClient()

  /** Create notifications when a new approval is needed or a gate advances. */
  async createNotificationsForGateAction(data: NotificationData) {
    console.log("Creating notifications for gate action:", data)

    const gateKey = `gate_${data.currentGate}` as keyof typeof PLM_APPROVAL_MATRIX
    const categoryKey = data.projectCategory as keyof (typeof PLM_APPROVAL_MATRIX)[typeof gateKey]

    const approvalConfig = PLM_APPROVAL_MATRIX[gateKey]?.[categoryKey]
    if (!approvalConfig) {
      console.warn(`No approval config found for gate ${data.currentGate}, category ${data.projectCategory}`)
      return
    }

    console.log("Approval config:", approvalConfig)

    // For approval requests, notify only approvers
    // For gate advancement, notify both approvers and stakeholders
    const targetRoles =
      data.actionType === "approval_request"
        ? approvalConfig.approvers
        : [...approvalConfig.approvers, ...approvalConfig.notifyRoles]

    console.log("Target roles:", targetRoles)

    const { data: users, error: usersErr } = await this.supabase
      .from("users")
      .select("id, role, full_name, email")
      .in("role", targetRoles)

    if (usersErr) {
      console.error("Error fetching users:", usersErr)
      throw usersErr
    }

    console.log("Found users to notify:", users)

    if (!users || users.length === 0) {
      console.warn("No users found for roles:", targetRoles)
      return
    }

    const rows = users.map((u) => {
      const isApprover = approvalConfig.approvers.includes(u.role)
      const base = {
        user_id: u.id,
        project_id: data.projectId,
        title: "",
        message: "",
        type: "",
        metadata: {
          project_id: data.projectId,
          project_name: data.projectName,
          project_category: data.projectCategory,
          current_gate: data.currentGate,
          action_type: data.actionType,
          triggered_by: data.triggeredBy,
          ...data.additionalData,
        },
        read_at: null,
        created_at: new Date().toISOString(),
      }

      if (isApprover && data.actionType === "approval_request") {
        return {
          ...base,
          type: "approval_request",
          title: `Approval Required: Gate ${data.currentGate}`,
          message: `Project "${data.projectName}" needs your approval to progress from Gate ${data.currentGate}.`,
        }
      }

      // stakeholder info message
      return {
        ...base,
        type: data.actionType === "approval_request" ? "approval_request" : "project_update",
        title:
          data.actionType === "approval_request"
            ? `Approval Required: Gate ${data.currentGate}`
            : `Gate ${data.currentGate} Update`,
        message:
          data.actionType === "approval_request"
            ? `Project "${data.projectName}" needs approval for Gate ${data.currentGate}.`
            : `Project "${data.projectName}" has been updated at Gate ${data.currentGate}.`,
      }
    })

    console.log("Inserting notification rows:", rows)

    if (rows.length) {
      const { error: insertError } = await this.supabase.from("notifications").insert(rows)
      if (insertError) {
        console.error("Error inserting notifications:", insertError)
        throw insertError
      }
      console.log(`Successfully created ${rows.length} notifications`)
    }
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
    console.log("Creating approval decision notification:", {
      projectId,
      projectName,
      projectCategory,
      currentGate,
      approvalStatus,
      approverName,
    })

    // Get project stakeholders
    const { data: project, error: projErr } = await this.supabase
      .from("projects")
      .select(
        `
        id,
        bid_manager:users!projects_bid_manager_id_fkey(id, role, full_name),
        project_manager:users!projects_project_manager_id_fkey(id, role, full_name),
        creator:users!projects_created_by_fkey(id, role, full_name)
      `,
      )
      .eq("id", projectId)
      .single()

    if (projErr) {
      console.error("Error fetching project:", projErr)
      throw projErr
    }

    const stakeholderIds = [project.bid_manager?.id, project.project_manager?.id, project.creator?.id].filter(Boolean)

    // Get management users who should be informed
    const { data: mgmt, error: mgmtErr } = await this.supabase
      .from("users")
      .select("id, role, full_name")
      .in("role", ["branch_manager", "bu_director", "amea_president", "sales_director", "technical_director"])

    if (mgmtErr) {
      console.error("Error fetching management users:", mgmtErr)
      throw mgmtErr
    }

    const allUserIds = [...new Set([...stakeholderIds, ...mgmt.map((u) => u.id)])]

    console.log("Notifying users about approval decision:", allUserIds)

    const rows = allUserIds.map((uid) => ({
      user_id: uid,
      project_id: projectId,
      type: "approval_decision",
      title: `Gate ${currentGate} ${approvalStatus === "approved" ? "Approved" : "Rejected"}`,
      message: `${approverName} ${approvalStatus} Gate ${currentGate} for "${projectName}".${
        comments ? ` Comments: ${comments}` : ""
      }`,
      metadata: {
        project_id: projectId,
        project_name: projectName,
        project_category: projectCategory,
        current_gate: currentGate,
        status: approvalStatus,
        approver_name: approverName,
        comments: comments || null,
      },
      read_at: null,
      created_at: new Date().toISOString(),
    }))

    const { error: insertError } = await this.supabase.from("notifications").insert(rows)
    if (insertError) {
      console.error("Error inserting approval decision notifications:", insertError)
      throw insertError
    }

    console.log(`Successfully created ${rows.length} approval decision notifications`)
  }

  /** Notify when a project is first created. */
  async createProjectCreationNotification(
    projectId: string,
    projectName: string,
    projectCategory: string,
    creatorName: string,
  ) {
    console.log("Creating project creation notification:", {
      projectId,
      projectName,
      projectCategory,
      creatorName,
    })

    const { data: users } = await this.supabase
      .from("users")
      .select("id, role, full_name")
      .in("role", ["branch_manager", "bu_director", "sales_director", "technical_director"])

    if (!users?.length) {
      console.warn("No management users found for project creation notification")
      return
    }

    const rows = users.map((u) => ({
      user_id: u.id,
      project_id: projectId,
      type: "project_creation",
      title: `New Project Created`,
      message: `${creatorName} created "${projectName}" (${projectCategory}).`,
      metadata: {
        project_id: projectId,
        project_name: projectName,
        project_category: projectCategory,
        creator_name: creatorName,
      },
      read_at: null,
      created_at: new Date().toISOString(),
    }))

    await this.supabase.from("notifications").insert(rows)
    console.log(`Successfully created ${rows.length} project creation notifications`)
  }

  /** Scan for overdue approvals and notify parties. */
  async createOverdueApprovalNotifications() {
    const { data: overdue } = await this.supabase
      .from("project_approvals")
      .select(
        `id, gate_number, due_date, project_id, required_role,
         project:projects(name, category)`,
      )
      .eq("status", "pending")
      .lt("due_date", new Date().toISOString())

    for (const a of overdue ?? []) {
      const { data: targets } = await this.supabase
        .from("users")
        .select("id")
        .in("role", [a.required_role, "branch_manager", "bu_director"])

      if (!targets?.length) continue

      await this.supabase.from("notifications").insert(
        targets.map((u) => ({
          user_id: u.id,
          project_id: a.project_id,
          type: "overdue_approval",
          title: `Overdue: Gate ${a.gate_number}`,
          message: `Approval for "${a.project.name}" (Gate ${a.gate_number}) is overdue.`,
          metadata: {
            project_id: a.project_id,
            project_name: a.project.name,
            gate_number: a.gate_number,
            due_date: a.due_date,
          },
          read_at: null,
          created_at: new Date().toISOString(),
        })),
      )
    }
  }
}

export const notificationService = new NotificationService()
