/**
 * Centralised helper for creating in-app notifications.
 *
 * Right now we only use `createNotificationsForGateAction`, but you can extend
 * this service with more helper methods (markAsRead, fetchForUser, etc.)
 * without changing the rest of the code-base.
 *
 * NOTE: The database schema assumed here:
 *  notifications (
 *    id            uuid            primary key default uuid_generate_v4(),
 *    user_id       uuid            references users (id),
 *    project_id    uuid,
 *    message       text,
 *    type          text,           -- e.g. "gate_advancement", "approval_request"
 *    metadata      jsonb,
 *    is_read       boolean         default false,
 *    created_at    timestamptz     default now()
 *  )
 *
 * Adjust the INSERT if your column names differ.
 */
import { createClient } from "@/lib/supabase"

type GateAction = "gate_advancement" | "approval_request"

interface GateActionPayload {
  projectId: string
  projectName: string
  projectCategory: string
  currentGate: number
  actionType: GateAction
  triggeredBy: string
}

interface RoleMatrix {
  [category: string]: {
    [gateNumber: number]: string[]
  }
}

/**
 * Roles that must be notified for *approval requests* per gate/category.
 * (Extracted & simplified from the PLM document.)
 */
const APPROVAL_NOTIFICATION_MATRIX: RoleMatrix = {
  category_1a: {
    1: ["branch_manager"],
    2: ["branch_manager"],
    3: ["branch_manager", "finance_manager"],
    4: ["branch_manager", "finance_manager"],
    5: ["branch_manager", "finance_manager"],
    6: ["branch_manager", "finance_manager"],
    7: ["branch_manager"],
  },
  category_1b: {
    1: ["branch_manager"],
    2: ["branch_manager", "sales_director", "technical_director"],
    3: ["sales_director", "technical_director"],
    4: ["finance_manager", "bu_director"],
    5: ["branch_manager"],
    6: ["branch_manager"],
    7: ["branch_manager"],
  },
  category_1c: {
    1: ["branch_manager"],
    2: ["branch_manager", "sales_director", "technical_director", "bu_director"],
    3: ["bu_director", "finance_manager"],
    4: ["bu_director", "finance_manager"],
    5: ["branch_manager"],
    6: ["branch_manager"],
    7: ["branch_manager"],
  },
  category_2: {
    1: ["bu_director"],
    2: ["bu_director"],
    3: ["bu_director"],
    4: ["amea_president"],
    5: ["branch_manager"],
    6: ["branch_manager"],
    7: ["branch_manager"],
  },
  category_3: {
    1: ["amea_president"],
    2: ["amea_president"],
    3: ["amea_president"],
    4: ["ceo"],
    5: ["bu_director"],
    6: ["bu_director"],
    7: ["bu_director"],
  },
}

/**
 * Very lightweight mapping of roles → user ids
 * In a real system you’d query the DB (users table, RLS safe) for the ids,
 * maybe cache them, maybe have an edge function. For now we fetch on demand.
 */
async function userIdsForRoles(roles: string[]) {
  if (!roles.length) return []
  const supabase = createClient()

  const { data, error } = await supabase.from("users").select("id, role").in("role", roles)

  if (error) {
    console.error("notification-service: error fetching users", error)
    return []
  }

  return data?.map((u) => u.id) ?? []
}

/**
 * Insert one notification row per recipient.
 */
async function insertNotifications(userIds: string[], payload: GateActionPayload, message: string) {
  if (!userIds.length) return

  const supabase = createClient()

  const rows = userIds.map((user_id) => ({
    user_id,
    project_id: payload.projectId,
    message,
    type: payload.actionType,
    metadata: payload,
  }))

  const { error } = await supabase.from("notifications").insert(rows)

  if (error) console.error("notification-service: insert failed", error)
}

export const notificationService = {
  /**
   * Create notifications for either:
   *  • approval_request  –> notify approvers
   *  • gate_advancement  –> notify general stakeholders (all roles in matrix)
   *
   * You can call this from client or server code – it uses the
   * same singleton Supabase client helper that respects environment.
   */
  async createNotificationsForGateAction(payload: GateActionPayload) {
    // Decide which roles to notify
    const roles =
      payload.actionType === "approval_request"
        ? (APPROVAL_NOTIFICATION_MATRIX[payload.projectCategory]?.[payload.currentGate] ?? [])
        : // gate advancement → broadcast to *all* roles for that gate/category
          [...new Set(Object.values(APPROVAL_NOTIFICATION_MATRIX[payload.projectCategory] ?? {}).flat())]

    const userIds = await userIdsForRoles(roles)

    if (!userIds.length) {
      console.warn(
        "notification-service: no recipients found for",
        payload.projectCategory,
        "gate",
        payload.currentGate,
      )
      return
    }

    const message =
      payload.actionType === "approval_request"
        ? `Approval required for Gate ${payload.currentGate} – ${payload.projectName}`
        : `Project "${payload.projectName}" advanced to Gate ${payload.currentGate}`

    await insertNotifications(userIds, payload, message)
  },
}
