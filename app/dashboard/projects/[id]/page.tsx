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

  useEffect(() => {
    if (projectId) {
      fetchProject()
      fetchCurrentUser()
    }
  }, [projectId])

  const fetchProject = async () => {
    try {
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
      const { data, error } = await supabase.rpc("can_advance_gate", {
        project_id_param: projectId,
        current_gate_param: currentGate,
      })

      if (error) throw error
      setCanAdvanceGate(data || false)
    } catch (error) {
      console.error("Error checking gate advancement:", error)
      setCanAdvanceGate(false)
    }
  }

  const handleAdvanceGate = async () => {
    if (!project || !canAdvanceGate) return

    setAdvancingGate(true)
    try {
      const nextGate = project.current_gate + 1
      if (nextGate > 7) {
        alert("Project is already at the final gate.")
        return
      }

      const { error } = await supabase
        .from("projects")
        .update({
          current_gate: nextGate,
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId)

      if (error) throw error

      await fetchProject()
      alert(`Project advanced to Gate ${nextGate}!`)
    } catch (error) {
      console.error("Error advancing gate:", error)
      alert("Error advancing gate. Please try again.")
    } finally {
      setAdvancingGate(false)
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
      <div className="min-h-screen bg-gray-50">
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
      <div className="min-h-screen bg-gray-50">
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.push("/dashboard/projects")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Projects
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{project.name}</h1>
              <p className="text-gray-600">Client: {project.client_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-100 text-blue-800">
              {categoryLabels[project.category as keyof typeof categoryLabels]}
            </Badge>
            <Badge variant="outline">
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Revenue</p>
                  <p className="font-semibold">${project.revenue?.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Risk Factor</p>
                  <p className="font-semibold">{project.risk_factor}/10</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Bid Manager</p>
                  <p className="font-semibold">{project.bid_manager?.full_name || "Not assigned"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Next Review</p>
                  <p className="font-semibold">{new Date(project.next_review_date).toLocaleDateString()}</p>
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {canAdvanceGate ? (
                  <>
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <div>
                      <p className="font-semibold text-green-800">Ready to Advance</p>
                      <p className="text-sm text-green-600">All requirements met for Gate {project.current_gate}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Clock className="h-6 w-6 text-orange-600" />
                    <div>
                      <p className="font-semibold text-orange-800">Requirements Pending</p>
                      <p className="text-sm text-orange-600">Complete all document requirements to advance</p>
                    </div>
                  </>
                )}
              </div>
              {canUserAdvanceGate() && canAdvanceGate && project.current_gate < 7 && (
                <Button
                  onClick={handleAdvanceGate}
                  disabled={advancingGate}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  {advancingGate ? "Advancing..." : `Advance to Gate ${project.current_gate + 1}`}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs for different sections */}
        <Tabs defaultValue="documents" className="space-y-6">
          <TabsList>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="documents">
            <DocumentUpload
              projectId={projectId}
              currentGate={project.current_gate}
              canUpload={canUserUpload()}
              onDocumentChange={() => checkGateAdvancement(project.current_gate)}
            />
          </TabsContent>

          <TabsContent value="approvals">
            <ApprovalDashboard userRole={currentUser?.role} />
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
                      className={`flex items-center gap-4 p-4 rounded-lg border ${
                        gateNumber === project.current_gate
                          ? "border-blue-200 bg-blue-50"
                          : gateNumber < project.current_gate
                            ? "border-green-200 bg-green-50"
                            : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          gateNumber < project.current_gate
                            ? "bg-green-600 text-white"
                            : gateNumber === project.current_gate
                              ? "bg-blue-600 text-white"
                              : "bg-gray-300 text-gray-600"
                        }`}
                      >
                        {gateNumber < project.current_gate ? <CheckCircle className="h-4 w-4" /> : gateNumber}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">
                          Gate {gateNumber}: {gateLabels[gateNumber as keyof typeof gateLabels]}
                        </h4>
                        <p className="text-sm text-gray-600">
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
