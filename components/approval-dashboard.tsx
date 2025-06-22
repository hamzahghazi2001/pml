"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { useAlert } from "@/contexts/alert-context"
import { notificationService } from "@/lib/notification-service"
import { createTestNotification } from "@/lib/test-notifications"

interface Approval {
  id: string
  project_id: string
  gate_number: number
  required_role: string
  status: string
  due_date: string
  comments: string
  created_at: string
  project: {
    name: string
    client_name: string
    category: string
    revenue: number
    risk_factor: number
  }
}

interface ApprovalDashboardProps {
  userRole?: string
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

const categoryLabels = {
  category_1a: "Category 1A",
  category_1b: "Category 1B",
  category_1c: "Category 1C",
  category_2: "Category 2",
  category_3: "Category 3",
}

const gateLabels = {
  1: "Early Bid Decision",
  2: "Bid/No Bid Decision",
  3: "Bid Submission",
  4: "Contract Approval",
  5: "Launch Review",
  6: "Contracted Works Acceptance",
  7: "Contract Close & Learning",
}

export function ApprovalDashboard({ userRole }: ApprovalDashboardProps) {
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [loading, setLoading] = useState(true)
  const [processingApproval, setProcessingApproval] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, string>>({})
  const [currentUser, setCurrentUser] = useState<any>(null)
  const { showAlert } = useAlert()

  const supabase = createClient()

  useEffect(() => {
    fetchCurrentUser()
  }, [])

  useEffect(() => {
    if (userRole && currentUser) {
      fetchApprovals()
    }
  }, [userRole, currentUser])

  const fetchCurrentUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data: userData } = await supabase.from("users").select("*").eq("id", user.id).single()
        setCurrentUser(userData)
      }
    } catch (error) {
      console.error("Error fetching user:", error)
    }
  }

  const fetchApprovals = async () => {
    try {
      const { data, error } = await supabase
        .from("project_approvals")
        .select(`
          *,
          project:projects(name, client_name, category, revenue, risk_factor)
        `)
        .eq("required_role", userRole)
        .eq("status", "pending")
        .order("due_date", { ascending: true })

      if (error) throw error
      setApprovals(data || [])
    } catch (error) {
      console.error("Error fetching approvals:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleTestNotification = async () => {
    if (!currentUser) return

    try {
      await createTestNotification(currentUser.id)
      showAlert({
        type: "success",
        title: "Test Notification Sent",
        message: "A test notification has been sent to verify the system is working.",
      })
    } catch (error) {
      console.error("Error sending test notification:", error)
      showAlert({
        type: "error",
        title: "Test Failed",
        message: "Failed to send test notification. Please check the console for errors.",
      })
    }
  }

  const handleApproval = async (approvalId: string, status: "approved" | "rejected") => {
    setProcessingApproval(approvalId)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const approval = approvals.find((a) => a.id === approvalId)
      if (!approval) throw new Error("Approval not found")

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

      // Create approval decision notification
      console.log("Creating approval decision notification...")
      await notificationService.createApprovalDecisionNotification(
        approval.project_id,
        approval.project.name,
        approval.project.category,
        approval.gate_number,
        status,
        currentUser?.full_name || "Unknown User",
        comments[approvalId],
      )

      // Refresh approvals
      await fetchApprovals()

      // Clear comments
      setComments((prev) => {
        const newComments = { ...prev }
        delete newComments[approvalId]
        return newComments
      })

      showAlert({
        type: status === "approved" ? "success" : "error",
        title: status === "approved" ? "Approval Successful" : "Approval Rejected",
        message: `The approval has been ${status} successfully! Notifications have been sent to relevant stakeholders.`,
      })
    } catch (error) {
      console.error("Error processing approval:", error)
      showAlert({
        type: "error",
        title: "Processing Error",
        message: "There was an error processing the approval. Please try again.",
      })
    } finally {
      setProcessingApproval(null)
    }
  }

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date()
  }

  const getDaysUntilDue = (dueDate: string) => {
    const days = Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    return days
  }

  if (!userRole) {
    return null
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900 mx-auto mb-2"></div>
              <p className="text-gray-600">Loading approvals...</p>
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
          <Clock className="h-5 w-5" />
          Pending Approvals ({approvals.length})
        </CardTitle>
        <CardDescription>
          Approvals requiring your attention as {roleLabels[userRole as keyof typeof roleLabels]}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Button onClick={handleTestNotification} variant="outline" size="sm">
            Test Notification System
          </Button>
        </div>

        {approvals.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
            <p className="text-gray-500">No pending approvals at this time.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {approvals.map((approval) => (
              <div
                key={approval.id}
                className={`border rounded-lg p-4 ${
                  isOverdue(approval.due_date) ? "border-red-200 bg-red-50" : "border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-lg">{approval.project.name}</h4>
                    <p className="text-gray-600">Client: {approval.project.client_name}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">
                      Gate {approval.gate_number}: {gateLabels[approval.gate_number as keyof typeof gateLabels]}
                    </Badge>
                    <Badge className="bg-blue-100 text-blue-800">
                      {categoryLabels[approval.project.category as keyof typeof categoryLabels]}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-gray-500">Revenue:</span>
                    <div className="font-medium">${(approval.project.revenue / 100).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Risk Factor:</span>
                    <div className="font-medium">{approval.project.risk_factor}/10</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Due Date:</span>
                    <div className={`font-medium ${isOverdue(approval.due_date) ? "text-red-600" : ""}`}>
                      {new Date(approval.due_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Days Remaining:</span>
                    <div
                      className={`font-medium flex items-center gap-1 ${
                        isOverdue(approval.due_date) ? "text-red-600" : ""
                      }`}
                    >
                      {isOverdue(approval.due_date) && <AlertTriangle className="h-4 w-4" />}
                      {getDaysUntilDue(approval.due_date)} days
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
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
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
