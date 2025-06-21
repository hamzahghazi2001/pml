"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, ArrowRight, Users, Calendar, DollarSign, AlertTriangle, CheckCircle, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { Navbar } from "@/components/navbar"
import { DocumentUpload } from "@/components/document-upload"
import { ApprovalDashboard } from "@/components/approval-dashboard"
import { ProjectApprovalStatus } from "@/components/project-approval-status"
import { notificationService } from "@/lib/services/notification-service"
import { useAlert } from "@/contexts/alert-context"

interface Project {
  id: string
  name: string
  client_name: string
  description: string
  revenue: number
  risk_factor: number
  country: string
  technique: string
  category: string
  current_gate: number
  status: string
  next_review_date: string
  created_at: string
  bid_manager_id: string
  project_manager_id: string
  created_by: string
  bid_manager?: { full_name: string }
  project_manager?: { full_name: string }
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

export default function ProjectDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [canAdvanceGate, setCanAdvanceGate] = useState(false)
  const [advancingGate, setAdvancingGate] = useState(false)

  const supabase = createClient()
  const { showAlert } = useAlert()

  useEffect(() => {
    if (projectId) {
      // Handle special routes
      if (projectId === "completed") {
        router.push("/dashboard/projects/completed")
        return
      }

      fetchProject()
      fetchCurrentUser()
    }
  }, [projectId])

  const fetchProject = async () => {
    try {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(projectId)) {
        console.error("Invalid project ID format:", projectId)
        router.push("/dashboard/projects")
        return
      }

      const { data, error } = await supabase
        .from("projects")
        .select(`
          *,
          bid_manager:users!projects_bid_manager_id_fkey(full_name),
          project_manager:users!projects_project_manager_id_fkey(full_name)
        `)
        .eq("id", projectId)
        .single()

      if (error) throw error
      setProject(data)

      // Check if gate can be advanced
      await checkGateAdvancement(data.current_gate)
    } catch (error) {
      console.error("Error fetching project:", error)
      router.push("/dashboard/projects")
    } finally {
      setLoading(false)
    }
  }

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

  const checkGateAdvancement = async (currentGate: number) => {
    try {
      // Check document requirements first
      const { data: documentRequirements, error: docReqError } = await supabase
        .from("document_requirements")
        .select("id, is_required")
        .eq("gate_number", currentGate)

      if (docReqError) throw docReqError

      // Check if all required documents are uploaded
      let allDocumentsComplete = true
      if (documentRequirements && documentRequirements.length > 0) {
        const requiredDocIds = documentRequirements.filter((req) => req.is_required).map((req) => req.id)

        if (requiredDocIds.length > 0) {
          const { data: uploadedDocs, error: docsError } = await supabase
            .from("documents")
            .select("requirement_id")
            .eq("project_id", projectId)
            .in("requirement_id", requiredDocIds)
            .eq("upload_status", "completed")

          if (docsError) throw docsError

          allDocumentsComplete = uploadedDocs?.length === requiredDocIds.length
        }
      }

      // Check approval requirements
      const { data: approvals, error: approvalsError } = await supabase
        .from("project_approvals")
        .select("status")
        .eq("project_id", projectId)
        .eq("gate_number", currentGate)

      if (approvalsError) throw approvalsError

      // Check if all approvals are completed
      const allApprovalsComplete =
        approvals && approvals.length > 0 ? approvals.every((approval) => approval.status === "approved") : false

      // Gate can only be advanced if both documents and approvals are complete
      const canAdvance = allDocumentsComplete && allApprovalsComplete
      setCanAdvanceGate(canAdvance)

      return canAdvance
    } catch (error) {
      console.error("Error checking gate advancement:", error)
      setCanAdvanceGate(false)
      return false
    }
  }

  const handleAdvanceGate = async () => {
    if (!project || !canAdvanceGate) return

    setAdvancingGate(true)
    try {
      const nextGate = project.current_gate + 1
      if (nextGate > 7) {
        showAlert({
          type: "warning",
          title: "Final Gate Reached",
          message: "Project is already at the final gate.",
        })
        return
      }

      // Update the project gate
      const { error: updateError } = await supabase
        .from("projects")
        .update({
          current_gate: nextGate,
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId)

      if (updateError) throw updateError

      // Create new approval records for the next gate
      await createApprovalsForGate(projectId, nextGate, project.category)

      await fetchProject()
      showAlert({
        type: "success",
        title: "Gate Advanced Successfully",
        message: `Project advanced to Gate ${nextGate}! New approval workflow has been initiated.`,
      })

      // Create notifications for gate advancement
      if (project) {
        await notificationService.createNotificationsForGateAction({
          projectId: projectId,
          projectName: project.name,
          projectCategory: project.category,
          currentGate: nextGate,
          actionType: "gate_advancement",
          triggeredBy: currentUser?.full_name || "System",
        })
      }
    } catch (error) {
      console.error("Error advancing gate:", error)
      showAlert({
        type: "error",
        title: "Gate Advancement Error",
        message: "Error advancing gate. Please try again.",
      })
    } finally {
      setAdvancingGate(false)
    }
  }

  const createApprovalsForGate = async (projectId: string, gateNumber: number, category: string) => {
    try {
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

      const requiredRoles = approvalMatrix[category]?.[gateNumber] || []

      if (requiredRoles.length === 0) {
        console.log(`No approvals required for gate ${gateNumber} category ${category}`)
        return
      }

      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 7) // 7 days from now

      const approvalRecords = requiredRoles.map((role) => ({
        project_id: projectId,
        gate_number: gateNumber,
        required_role: role,
        status: "pending",
        due_date: dueDate.toISOString().split("T")[0], // Format as date
        created_at: new Date().toISOString(),
      }))

      const { error } = await supabase.from("project_approvals").insert(approvalRecords)

      if (error) throw error

      console.log(`Created ${approvalRecords.length} approval records for gate ${gateNumber}`)

      // Create notifications for new approval requests
      await notificationService.createNotificationsForGateAction({
        projectId: projectId,
        projectName: project.name,
        projectCategory: project.category,
        currentGate: gateNumber,
        actionType: "approval_request",
        triggeredBy: currentUser?.full_name || "System",
      })
    } catch (error) {
      console.error("Error creating approvals for gate:", error)
    }
  }

  const canUserUpload = () => {
    if (!currentUser || !project) return false

    return (
      project.created_by === currentUser.id ||
      project.bid_manager_id === currentUser.id ||
      project.project_manager_id === currentUser.id ||
      ["branch_manager", "bu_director", "amea_president", "ceo"].includes(currentUser.role)
    )
  }

  const canUserAdvanceGate = () => {
    if (!currentUser) return false
    return ["branch_manager", "bu_director", "amea_president", "ceo"].includes(currentUser.role)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-r from-[#f5faff] to-[#fffde9]">
        <Navbar />
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading project...</div>
          </div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-r from-[#f5faff] to-[#fffde9]">
        <Navbar />
        <div className="container mx-auto p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Project Not Found</h1>
            <Button onClick={() => router.push("/dashboard/projects")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Projects
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-[#f5faff] to-[#fffde9]">
      <Navbar />
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
            <Button variant="outline" onClick={() => router.push("/dashboard/projects")} className="w-fit">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Projects
            </Button>
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">{project.name}</h1>
              <p className="text-gray-600 text-sm md:text-base">Client: {project.client_name}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-blue-100 text-blue-800 text-xs md:text-sm">
              {categoryLabels[project.category as keyof typeof categoryLabels]}
            </Badge>
            <Badge variant="outline" className="text-xs md:text-sm">
              Gate {project.current_gate}: {gateLabels[project.current_gate as keyof typeof gateLabels]}
            </Badge>
          </div>
        </div>

        {/* Project Overview */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Project Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
                <div>
                  <p className="text-xs md:text-sm text-gray-600">Revenue</p>
                  <p className="font-semibold text-sm md:text-base">${project.revenue?.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-orange-600" />
                <div>
                  <p className="text-xs md:text-sm text-gray-600">Risk Factor</p>
                  <p className="font-semibold text-sm md:text-base">{project.risk_factor}/10</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                <div>
                  <p className="text-xs md:text-sm text-gray-600">Bid Manager</p>
                  <p className="font-semibold text-sm md:text-base">
                    {project.bid_manager?.full_name || "Not assigned"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 md:h-5 md:w-5 text-purple-600" />
                <div>
                  <p className="text-xs md:text-sm text-gray-600">Next Review</p>
                  <p className="font-semibold text-sm md:text-base">
                    {new Date(project.next_review_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {project.description && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-gray-700">{project.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gate Advancement Status */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                {canAdvanceGate ? (
                  <>
                    <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
                    <div>
                      <p className="font-semibold text-green-800 text-sm md:text-base">Ready to Advance</p>
                      <p className="text-xs md:text-sm text-green-600">
                        All requirements met for Gate {project.current_gate}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Clock className="h-5 w-5 md:h-6 md:w-6 text-orange-600" />
                    <div>
                      <p className="font-semibold text-orange-800 text-sm md:text-base">Requirements Pending</p>
                      <p className="text-xs md:text-sm text-orange-600">
                        Complete all document requirements to advance
                      </p>
                    </div>
                  </>
                )}
              </div>
              {canUserAdvanceGate() && canAdvanceGate && project.current_gate < 7 && (
                <Button
                  onClick={handleAdvanceGate}
                  disabled={advancingGate}
                  className="bg-green-600 hover:bg-green-700 w-full md:w-auto text-sm"
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  {advancingGate ? "Advancing..." : `Advance to Gate ${project.current_gate + 1}`}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs for different sections */}
        <Tabs defaultValue="documents" className="space-y-4 md:space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="documents" className="text-xs md:text-sm">
              Documents
            </TabsTrigger>
            <TabsTrigger value="approvals" className="text-xs md:text-sm">
              Approvals
            </TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs md:text-sm">
              Timeline
            </TabsTrigger>
          </TabsList>

          <TabsContent value="documents">
            <DocumentUpload
              projectId={projectId}
              currentGate={project.current_gate}
              canUpload={canUserUpload()}
              projectCategory={project.category}
              currentUserRole={currentUser?.role}
              onDocumentChange={() => checkGateAdvancement(project.current_gate)}
            />
          </TabsContent>

          <TabsContent value="approvals">
            <div className="space-y-6">
              <ProjectApprovalStatus
                projectId={projectId}
                currentGate={project.current_gate}
                projectCategory={project.category}
                currentUserId={currentUser?.id}
                currentUserRole={currentUser?.role}
              />
              <ApprovalDashboard userRole={currentUser?.role} />
            </div>
          </TabsContent>

          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle>Project Timeline</CardTitle>
                <CardDescription>Track progress through PLM gates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.from({ length: 7 }, (_, i) => i + 1).map((gateNumber) => (
                    <div
                      key={gateNumber}
                      className={`flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-lg border ${
                        gateNumber === project.current_gate
                          ? "border-blue-200 bg-blue-50"
                          : gateNumber < project.current_gate
                            ? "border-green-200 bg-green-50"
                            : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      <div
                        className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm ${
                          gateNumber < project.current_gate
                            ? "bg-green-600 text-white"
                            : gateNumber === project.current_gate
                              ? "bg-blue-600 text-white"
                              : "bg-gray-300 text-gray-600"
                        }`}
                      >
                        {gateNumber < project.current_gate ? (
                          <CheckCircle className="h-3 w-3 md:h-4 md:w-4" />
                        ) : (
                          gateNumber
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm md:text-base">
                          Gate {gateNumber}: {gateLabels[gateNumber as keyof typeof gateLabels]}
                        </h4>
                        <p className="text-xs md:text-sm text-gray-600">
                          {gateNumber < project.current_gate
                            ? "Completed"
                            : gateNumber === project.current_gate
                              ? "In Progress"
                              : "Pending"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
