"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { CheckCircle, XCircle, Clock, User, AlertTriangle, ArrowDown } from "lucide-react"
import { createClient } from "@/lib/supabase"

interface ProjectApproval {
  id: string
  project_id: string
  gate_number: number
  required_role: string
  status: string
  due_date: string
  comments: string
  approved_by: string
  approved_at: string
  approver?: {
    full_name: string
    email: string
  }
}

interface ProjectApprovalHierarchyProps {
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

const getApprovalHierarchy = (category: string, gate: number) => {
  const hierarchies: Record<string, Record<number, string[]>> = {
    category_1a: {
      1: ["bid_manager"],
      2: ["bid_manager", "branch_manager"],
      3: ["bid_manager", "branch_manager", "sales_director"],
      4: ["branch_manager", "sales_director", "bu_director", "amea_president", "ceo"],
      5: ["project_manager", "branch_manager"],
      6: ["project_manager", "branch_manager", "technical_director"],
      7: ["project_manager", "branch_manager"],
    },
    category_1b: {
      1: ["bid_manager"],
      2: ["bid_manager", "branch_manager"],
      3: ["bid_manager", "branch_manager", "sales_director"],
      4: ["branch_manager", "sales_director", "bu_director", "amea_president"],
      5: ["project_manager", "branch_manager"],
      6: ["project_manager", "branch_manager", "technical_director"],
      7: ["project_manager", "branch_manager"],
    },
    category_1c: {
      1: ["bid_manager"],
      2: ["bid_manager", "branch_manager"],
      3: ["bid_manager", "branch_manager", "sales_director"],
      4: ["branch_manager", "sales_director", "bu_director"],
      5: ["project_manager", "branch_manager"],
      6: ["project_manager", "branch_manager", "technical_director"],
      7: ["project_manager", "branch_manager"],
    },
    category_2: {
      1: ["bid_manager"],
      2: ["bid_manager", "branch_manager"],
      3: ["bid_manager", "branch_manager"],
      4: ["branch_manager", "sales_director"],
      5: ["project_manager", "branch_manager"],
      6: ["project_manager", "branch_manager"],
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

  return hierarchies[category]?.[gate] || []
}

export function ProjectApprovalHierarchy({
  projectId,
  currentGate,
  projectCategory,
  currentUserId,
  currentUserRole,
}: ProjectApprovalHierarchyProps) {
  const [approvals, setApprovals] = useState<ProjectApproval[]>([])
  const [loading, setLoading] = useState(true)
  const [processingApproval, setProcessingApproval] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, string>>({})

  const supabase = createClient()

  useEffect(() => {
    fetchProjectApprovals()
  }, [projectId, currentGate])

  const fetchProjectApprovals = async () => {
    try {
      const { data, error } = await supabase
        .from("project_approvals")
        .select(`
          *,
          approver:users!project_approvals_approved_by_fkey(full_name, email)
        `)
        .eq("project_id", projectId)
        .eq("gate_number", currentGate)
        .order("created_at", { ascending: true })

      if (error) throw error
      setApprovals(data || [])
    } catch (error) {
      console.error("Error fetching project approvals:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleApproval = async (approvalId: string, status: "approved" | "rejected") => {
    setProcessingApproval(approvalId)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { error } = await supabase
        .from("project_approvals")
        .update({
          status,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          comments: comments[approvalId] || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", approvalId)

      if (error) throw error

      await fetchProjectApprovals()
      setComments((prev) => {
        const newComments = { ...prev }
        delete newComments[approvalId]
        return newComments
      })

      alert(`Approval ${status} successfully!`)
    } catch (error) {
      console.error("Error processing approval:", error)
      alert("Error processing approval. Please try again.")
    } finally {
      setProcessingApproval(null)
    }
  }

  const requiredRoles = getApprovalHierarchy(projectCategory, currentGate)
  const canUserApprove = (requiredRole: string) => {
    return currentUserRole === requiredRole
  }

  const getApprovalForRole = (role: string) => {
    return approvals.find((approval) => approval.required_role === role)
  }

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date()
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Approval Hierarchy - Gate {currentGate}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900 mx-auto mb-2"></div>
              <p className="text-gray-600">Loading approval hierarchy...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Approval Hierarchy - Gate {currentGate}
        </CardTitle>
        <CardDescription>Required approvals for this project at the current gate level</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {requiredRoles.map((role, index) => {
            const approval = getApprovalForRole(role)
            const isCurrentUserRole = canUserApprove(role)
            const isPending = !approval || approval.status === "pending"
            const isApproved = approval?.status === "approved"
            const isRejected = approval?.status === "rejected"

            return (
              <div key={role}>
                <div
                  className={`border rounded-lg p-4 ${
                    isRejected
                      ? "border-red-200 bg-red-50"
                      : isApproved
                        ? "border-green-200 bg-green-50"
                        : isPending && approval && isOverdue(approval.due_date)
                          ? "border-orange-200 bg-orange-50"
                          : "border-gray-200"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isApproved
                            ? "bg-green-600 text-white"
                            : isRejected
                              ? "bg-red-600 text-white"
                              : isPending
                                ? "bg-orange-500 text-white"
                                : "bg-gray-300 text-gray-600"
                        }`}
                      >
                        {isApproved ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : isRejected ? (
                          <XCircle className="h-4 w-4" />
                        ) : (
                          <Clock className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold">{roleLabels[role as keyof typeof roleLabels]}</h4>
                        {approval?.approver && <p className="text-sm text-gray-600">{approval.approver.full_name}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {isCurrentUserRole && (
                        <Badge variant="outline" className="bg-blue-100 text-blue-800">
                          Your Role
                        </Badge>
                      )}
                      <Badge
                        variant={isApproved ? "default" : isRejected ? "destructive" : "secondary"}
                        className={
                          isApproved ? "bg-green-100 text-green-800" : isRejected ? "" : "bg-orange-100 text-orange-800"
                        }
                      >
                        {isApproved ? "Approved" : isRejected ? "Rejected" : "Pending"}
                      </Badge>
                    </div>
                  </div>

                  {approval && (
                    <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                      <div>
                        <span className="text-gray-500">Due Date:</span>
                        <div className={`font-medium ${isOverdue(approval.due_date) ? "text-red-600" : ""}`}>
                          {new Date(approval.due_date).toLocaleDateString()}
                        </div>
                      </div>
                      {approval.approved_at && (
                        <div>
                          <span className="text-gray-500">{isApproved ? "Approved" : "Rejected"} Date:</span>
                          <div className="font-medium">{new Date(approval.approved_at).toLocaleDateString()}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {approval?.comments && (
                    <div className="mb-3 p-2 bg-gray-50 rounded text-sm">
                      <strong>Comments:</strong> {approval.comments}
                    </div>
                  )}

                  {isCurrentUserRole && isPending && approval && (
                    <div className="space-y-3 border-t pt-3">
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
                          className="mt-1"
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

                {index < requiredRoles.length - 1 && (
                  <div className="flex justify-center py-2">
                    <ArrowDown className="h-4 w-4 text-gray-400" />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {requiredRoles.length === 0 && (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Approvals Required</h3>
            <p className="text-gray-500">This gate does not require any approvals for this project category.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
