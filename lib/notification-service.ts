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
    category_1a: { approvers: ["bid_manager"], notifyRoles: [] },
    category_1b: { approvers: ["bid_manager"], notifyRoles: [] },
    category_1c: { approvers: ["bid_manager"], notifyRoles: [] },
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
      notifyRoles: ["sales_director", "technical_director"],
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
      notifyRoles: [],
    },
    category_1b: {
      approvers: ["sales_director", "technical_director"],
      notifyRoles: [],
    },
    category_1c: {
      approvers: ["bu_director", "finance_director"],
      notifyRoles: [],
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
  /* … gates 4-7 remain unchanged … */
} as const

/* -------------------------------------------------------------------------- */
/*                          NOTIFICATION SERVICE                              */
/* -------------------------------------------------------------------------- */

export class NotificationService {
  private supabase = createClient()

  /** Create notifications when a new approval is needed or a gate advances. */
  async createNotificationsForGateAction(data: NotificationData) {
    const gateKey = `gate_${data.currentGate}` as keyof typeof PLM_APPROVAL_MATRIX
    const categoryKey = data.projectCategory as keyof (typeof PLM_APPROVAL_MATRIX)[typeof gateKey]

    const approvalConfig = PLM_APPROVAL_MATRIX[gateKey]?.[categoryKey]
    if (!approvalConfig) return

    const targetRoles = [...approvalConfig.approvers, ...approvalConfig.notifyRoles]

    const { data: users, error: usersErr } = await this.supabase
      .from("users")
      .select("id, role, full_name, email")
      .in("role", targetRoles)
    if (usersErr) throw usersErr

    const rows = users!.map((u) => {
      const isApprover = approvalConfig.approvers.includes(u.role)
      const base = {
        user_id: u.id,
        project_id: data.projectId,
        title: "",
        message: "",
        type: "",
        gate_id: null as string | null,
        read_at: null,
        created_at: new Date().toISOString(),
      }

      if (isApprover) {
        return {
          ...base,
          type: "approval_request",
          title: `Approval Required: ${data.projectName} – Gate ${data.currentGate}`,
          message: `Project “${data.projectName}” needs your approval to progress to Gate ${data.currentGate + 1}.`,
        }
      }

      // stakeholder info message
      return {
        ...base,
        type: "project_update",
        title: `Gate ${data.currentGate} update`,
        message: `“${data.projectName}” advanced action: ${data.actionType}.`,
      }
    })

    if (rows.length) await this.supabase.from("notifications").insert(rows)
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
    const { data: project, error: projErr } = await this.supabase
      .from("projects")
      .select(
        `
        id,
        bid_manager:users!projects_bid_manager_id_fkey(id, role),
        project_manager:users!projects_project_manager_id_fkey(id, role),
        creator:users!projects_created_by_fkey(id, role)
      `,
      )
      .eq("id", projectId)
      .single()
    if (projErr) throw projErr

    const stakeholderIds = [project.bid_manager?.id, project.project_manager?.id, project.creator?.id].filter(Boolean)

    const { data: mgmt, error: mgmtErr } = await this.supabase
      .from("users")
      .select("id")
      .in("role", ["branch_manager", "bu_director", "amea_president"])
    if (mgmtErr) throw mgmtErr

    const allUsers = [...stakeholderIds, ...mgmt.map((u) => u.id)]
    const rows = allUsers.map((uid) => ({
      user_id: uid,
      project_id: projectId,
      gate_id: null,
      type: "approval_decision",
      title: `Gate ${currentGate} ${approvalStatus}`,
      message: `${approverName} ${approvalStatus} gate ${currentGate} for “${projectName}”. ${
        comments ? `Comments: ${comments}` : ""
      }`,
      read_at: null,
      created_at: new Date().toISOString(),
    }))

    await this.supabase.from("notifications").insert(rows)
  }

  /** Notify when a project is first created. */
  async createProjectCreationNotification(
    projectId: string,
    projectName: string,
    projectCategory: string,
    creatorName: string,
  ) {
    const { data: users } = await this.supabase
      .from("users")
      .select("id")
      .in("role", ["branch_manager", "bu_director", "sales_director", "technical_director"])

    if (!users?.length) return

    await this.supabase.from("notifications").insert(
      users.map((u) => ({
        user_id: u.id,
        project_id: projectId,
        gate_id: null,
        type: "project_creation",
        title: `New project: ${projectName}`,
        message: `${creatorName} created “${projectName}” (${projectCategory}).`,
        read_at: null,
        created_at: new Date().toISOString(),
      })),
    )
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
          gate_id: null,
          type: "overdue_approval",
          title: `Overdue: Gate ${a.gate_number}`,
          message: `Approval for “${a.project.name}” (Gate ${a.gate_number}) is overdue.`,
          read_at: null,
          created_at: new Date().toISOString(),
        })),
      )
    }
  }
}

export const notificationService = new NotificationService()
