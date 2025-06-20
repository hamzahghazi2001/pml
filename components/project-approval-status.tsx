"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { CheckCircle, XCircle, Clock, User, AlertTriangle, MessageSquare, Calendar } from "lucide-react"
import { createClient } from "@/lib/supabase"

interface ProjectApproval {
  id: string
  project_id: string
  gate_number: number
  required_role: string
  status: string
  comments: string
  approved_by: string
  approved_at: string
  due_date: string
  created_at: string
  updated_at: string
  approver?: {
    id: string
    full_name: string
    email: string
    role: string
  }
}

interface ProjectApprovalStatusProps {
  projectId: string
  currentGate: number
  projectCategory: string
  currentUserId?: string
  currentUserRole?: string
}

const roleLabels = {
  bid_manager: "Bid Manager",
  branch_manager: "Branch Manager",
  sales_director: "Sales Director",
  technical_director: "Technical Director",
  finance_manager: "Finance Manager",
  bu_director: "BU Director",
  amea_president: "AMEA President",
  ceo: "CEO",
  project_manager: "Project Manager",
}

export function ProjectApprovalStatus({
  projectId,
  currentGate,
  projectCategory,
  currentUserId,
  currentUserRole,
}: ProjectApprovalStatusProps) {
  const [approvals, setApprovals] = useState<ProjectApproval[]>([])
  const [loading, setLoading] = useState(true)
  const [processingApproval, setProcessingApproval] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, string>>({})
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
    overdue: 0,
  })

  const supabase = createClient()

  useEffect(() => {
    fetchProjectApprovals()
  }, [projectId, currentGate])

  const fetchProjectApprovals = async () => {
    try {
      // Fetch approvals directly from project_approvals table
      const { data: approvalsData, error: approvalsError } = await supabase
        .from("project_approvals")
        .select(`
        *,
        approver:users!project_approvals_approved_by_fkey(id, full_name, email, role)
      `)
        .eq("project_id", projectId)
        .eq("gate_number", currentGate)
        .order("created_at", { ascending: true })

      if (approvalsError) throw approvalsError

      const approvalsList = approvalsData || []
      setApprovals(approvalsList)

      // Calculate statistics including overdue
      const now = new Date()
      const stats = {
        total: approvalsList.length,
        approved: approvalsList.filter((a) => a.status === "approved").length,
        rejected: approvalsList.filter((a) => a.status === "rejected").length,
        pending: approvalsList.filter((a) => a.status === "pending").length,
        overdue: approvalsList.filter((a) => a.status === "pending" && a.due_date && new Date(a.due_date) < now).length,
      }
      setStats(stats)
    } catch (error) {
      console.error("Error fetching project approvals:", error)
    } finally {
      setLoading(false)
    }
  }

  const ensureGateApprovals = async () => {
    try {
      // Check if approvals already exist for this project and gate
      const { data: existingApprovals } = await supabase
        .from("project_approvals")
        .select("id")
        .eq("project_id", projectId)
        .eq("gate_number", currentGate)

      if (existingApprovals && existingApprovals.length > 0) {
        return // Approvals already exist
      }

      // Create new approval records based on gate and category
      const requiredRoles = getRequiredRolesForGate(currentGate, projectCategory)
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 7) // 7 days from now

      const approvalRecords = requiredRoles.map((role) => ({
        project_id: projectId,
        gate_number: currentGate,
        required_role: role,
        status: "pending",
        due_date: dueDate.toISOString().split("T")[0], // Format as date
        created_at: new Date().toISOString(),
      }))

      const { error } = await supabase.from("project_approvals").insert(approvalRecords)

      if (error) throw error
    } catch (error) {
      console.error("Error ensuring gate approvals:", error)
    }
  }

  const getRequiredRolesForGate = (gate: number, category: string) => {
    // Define approval requirements based on gate and category
    const approvalMatrix: Record<string, Record<number, string[]>> = {
      category_1a: {
        1: ["bid_manager", "branch_manager", "bu_director"],
        2: ["bid_manager", "branch_manager", "sales_director", "bu_director", "amea_president"],
        3: ["bid_manager", "branch_manager", "sales_director", "technical_director", "bu_director"],
        4: ["branch_manager", "finance_manager", "bu_director", "amea_president", "ceo"],
        5: ["project_manager", "branch_manager", "technical_director", "bu_director"],
        6: ["project_manager", "branch_manager", "finance_manager", "bu_director"],
        7: ["project_manager", "branch_manager", "bu_director"],
      },
      category_1b: {
        1: ["bid_manager", "branch_manager"],
        2: ["bid_manager", "branch_manager", "sales_director", "bu_director"],
        3: ["bid_manager", "branch_manager", "sales_director", "bu_director"],
        4: ["branch_manager", "finance_manager", "bu_director", "amea_president"],
        5: ["project_manager", "branch_manager", "bu_director"],
        6: ["project_manager", "branch_manager", "bu_director"],
        7: ["project_manager", "branch_manager"],
      },
      category_1c: {
        1: ["bid_manager", "branch_manager"],
        2: ["bid_manager", "branch_manager", "bu_director"],
        3: ["bid_manager", "branch_manager", "bu_director"],
        4: ["branch_manager", "finance_manager", "bu_director"],
        5: ["project_manager", "branch_manager"],
        6: ["project_manager", "branch_manager"],
        7: ["project_manager"],
      },
      category_2: {
        1: ["bid_manager"],
        2: ["bid_manager", "branch_manager"],
        3: ["bid_manager", "branch_manager"],
        4: ["branch_manager", "finance_manager"],
        5: ["project_manager", "branch_manager"],
        6: ["project_manager"],
        7: ["project_manager"],
      },
      category_3: {
        1: ["bid_manager"],
        2: ["bid_manager"],
        3: ["bid_manager"],
        4: ["branch_manager"],
        5: ["project_manager"],
        6: ["project_manager"],
        7: ["project_manager"],
      },
    }

    return approvalMatrix[category]?.[gate] || []
  }

  const canUserApprove = (approval: ProjectApproval) => {
    if (!currentUserId || !currentUserRole) return false
    return approval.required_role === currentUserRole
  }

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date()
  }

  const getStatusColor = (status: string, dueDate?: string) => {
    if (status === "approved") {
      return "border-green-200 bg-green-50"
    } else if (status === "rejected") {
      return "border-red-200 bg-red-50"
    } else if (dueDate && isOverdue(dueDate)) {
      return "border-orange-200 bg-orange-50"
    } else {
      return "border-yellow-200 bg-yellow-50"
    }
  }

  const handleApproval = async (approvalId: string, newStatus: string) => {
    setProcessingApproval(approvalId)
    try {
      const { error } = await supabase
        .from("project_approvals")
        .update({
          status: newStatus,
          approved_by: currentUserId,
          approved_at: new Date().toISOString(),
          comments: comments[approvalId] || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", approvalId)

      if (error) throw error

      // Refresh approvals after successful update
      await fetchProjectApprovals()

      // Clear the comment for this approval
      setComments((prev) => {
        const newComments = { ...prev }
        delete newComments[approvalId]
        return newComments
      })
    } catch (error) {
      console.error("Error updating approval status:", error)
    } finally {
      setProcessingApproval(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Gate-specific Approval Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center">
              {currentGate}
            </div>
            <div>
              <h3 className="font-semibold text-blue-900">Gate {currentGate} Approval Requirements</h3>
              <p className="text-blue-700 text-sm">
                Project Category: {projectCategory.toUpperCase()} | Required approvals must be completed before
                advancing to Gate {currentGate + 1}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Approval Status Overview - Gate {currentGate}
          </CardTitle>
          <CardDescription>Current status of all required approvals for this project gate</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-blue-600">Total Required</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
              <div className="text-sm text-green-600">Approved</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-yellow-600">Pending</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
              <div className="text-sm text-red-600">Rejected</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{stats.overdue}</div>
              <div className="text-sm text-orange-600">Overdue</div>
            </div>
          </div>

          {stats.total === 0 && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-800">No Approval Records Found</p>
                  <p className="text-yellow-700 text-sm">
                    Approval records will be automatically created when this gate becomes active.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Approval List */}
      <Card>
        <CardHeader>
          <CardTitle>Required Approvals for Gate {currentGate}</CardTitle>
          <CardDescription>
            Each role must provide approval before the project can advance to the next gate
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900 mx-auto mb-2"></div>
                <p className="text-gray-600">Loading approval status...</p>
              </div>
            </div>
          ) : approvals.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Approvals Required</h3>
              <p className="text-gray-500">
                No approval records found for Gate {currentGate}. This may indicate the gate is not yet active or no
                approvals are required for this project category.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {approvals.map((approval) => {
                const isCurrentUserApproval = canUserApprove(approval)

                return (
                  <div
                    key={approval.id}
                    className={`border rounded-lg p-4 ${getStatusColor(approval.status, approval.due_date)}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            approval.status === "approved"
                              ? "bg-green-600 text-white"
                              : approval.status === "rejected"
                                ? "bg-red-600 text-white"
                                : "bg-yellow-500 text-white"
                          }`}
                        >
                          {approval.status === "approved" ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : approval.status === "rejected" ? (
                            <XCircle className="h-5 w-5" />
                          ) : (
                            <Clock className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold text-lg">
                            {roleLabels[approval.required_role as keyof typeof roleLabels]}
                          </h4>
                          {approval.approver ? (
                            <p className="text-sm text-gray-600">
                              {approval.approver.full_name} ({approval.approver.email})
                            </p>
                          ) : (
                            <p className="text-sm text-gray-500 italic">
                              Awaiting assignment to user with {approval.required_role} role
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        {isCurrentUserApproval && approval.status === "pending" && (
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                            Action Required
                          </Badge>
                        )}
                        <Badge
                          className={
                            approval.status === "approved"
                              ? "bg-green-600 text-white"
                              : approval.status === "rejected"
                                ? "bg-red-600 text-white"
                                : "bg-yellow-600 text-white"
                          }
                        >
                          {approval.status === "approved"
                            ? "Approved"
                            : approval.status === "rejected"
                              ? "Rejected"
                              : "Pending"}
                        </Badge>
                      </div>
                    </div>

                    {/* Approval Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <div>
                          <span className="text-gray-500">Due Date:</span>
                          <div
                            className={`font-medium ${approval.due_date && isOverdue(approval.due_date) ? "text-red-600" : ""}`}
                          >
                            {approval.due_date ? new Date(approval.due_date).toLocaleDateString() : "Not set"}
                          </div>
                        </div>
                      </div>
                      {approval.approved_at && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <div>
                            <span className="text-gray-500">
                              {approval.status === "approved" ? "Approved" : "Rejected"} Date:
                            </span>
                            <div className="font-medium">{new Date(approval.approved_at).toLocaleDateString()}</div>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <div>
                          <span className="text-gray-500">Created:</span>
                          <div className="font-medium">{new Date(approval.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </div>

                    {/* Comments */}
                    {approval.comments && (
                      <div className="mb-3 p-3 bg-white/50 rounded border-l-4 border-blue-300">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5" />
                          <div>
                            <div className="font-medium text-blue-800 text-sm">Comments:</div>
                            <div className="text-gray-700">{approval.comments}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons for Current User */}
                    {isCurrentUserApproval && approval.status === "pending" && (
                      <div className="space-y-3 border-t pt-3 bg-white/30 rounded p-3">
                        <div>
                          <Label htmlFor={`comments-${approval.id}`}>Comments (optional)</Label>
                          <Textarea
                            id={`comments-${approval.id}`}
                            placeholder="Add any comments about this approval..."
                            value={comments[approval.id] || ""}
                            onChange={(e) =>
                              setComments((prev) => ({
                                ...prev,
                                [approval.id]: e.target.value,
                              }))
                            }
                            className="mt-1 bg-white"
                            rows={2}
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleApproval(approval.id, "approved")}
                            disabled={processingApproval === approval.id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {processingApproval === approval.id ? "Processing..." : "Approve"}
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleApproval(approval.id, "rejected")}
                            disabled={processingApproval === approval.id}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            {processingApproval === approval.id ? "Processing..." : "Reject"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
