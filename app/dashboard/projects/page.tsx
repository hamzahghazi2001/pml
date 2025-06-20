"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Calendar, DollarSign, AlertTriangle, MapPin, Wrench, User, Edit, Eye, ArrowRight } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"

interface Project {
  id: string
  name: string
  client_name: string
  description: string
  revenue: number
  risk_factor: number
  country: string
  technique: string
  next_review_date: string
  category: string
  current_gate: number
  created_at: string
  bid_manager_id: string
  project_manager_id: string
  created_by: string
}

interface UserType {
  id: string
  full_name: string
  email: string
  role: string
}

const categoryLabels = {
  category_1a: "Category 1A",
  category_1b: "Category 1B",
  category_1c: "Category 1C",
  category_2: "Category 2",
  category_3: "Category 3",
}

const categoryColors = {
  category_1a: "bg-green-100 text-green-800",
  category_1b: "bg-blue-100 text-blue-800",
  category_1c: "bg-yellow-100 text-yellow-800",
  category_2: "bg-orange-100 text-orange-800",
  category_3: "bg-red-100 text-red-800",
}

function calculateCategory(revenue: number, riskFactor: number): string {
  if (revenue < 500000 && riskFactor <= 3) return "category_1a"
  if (revenue >= 500000 && revenue < 2000000 && riskFactor <= 3) return "category_1b"
  if (revenue >= 2000000 && revenue < 5000000 && riskFactor <= 5) return "category_1c"
  if (revenue >= 5000000 && revenue < 30000000 && riskFactor >= 5) return "category_2"
  if (revenue >= 30000000 && riskFactor <= 10) return "category_3"
  return "category_1a" // Default
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<UserType[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    client_name: "",
    description: "",
    revenue: "",
    risk_factor: "",
    country: "",
    technique: "",
    next_review_date: "",
    bid_manager_id: "",
    project_manager_id: "",
  })
  const [calculatedCategory, setCalculatedCategory] = useState<string>("")

  const [editingProject, setEditingProject] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [advancingGate, setAdvancingGate] = useState<string | null>(null)
  const [projectApprovals, setProjectApprovals] = useState<Record<string, any[]>>({})

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchProjects()
    fetchUsers()
    fetchCurrentUser()
  }, [])

  useEffect(() => {
    // Calculate category when revenue or risk factor changes
    if (formData.revenue && formData.risk_factor) {
      const revenue = Number.parseFloat(formData.revenue)
      const riskFactor = Number.parseInt(formData.risk_factor)
      const category = calculateCategory(revenue, riskFactor)
      setCalculatedCategory(category)
    } else {
      setCalculatedCategory("")
    }
  }, [formData.revenue, formData.risk_factor])

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select(`
          *,
          bid_manager:users!projects_bid_manager_id_fkey(full_name),
          project_manager:users!projects_project_manager_id_fkey(full_name)
        `)
        .order("created_at", { ascending: false })

      if (error) throw error
      setProjects(data || [])

      // Fetch approvals for all projects
      if (data && data.length > 0) {
        await fetchProjectApprovals(data.map((p) => p.id))
      }
    } catch (error) {
      console.error("Error fetching projects:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from("users").select("id, full_name, email, role").order("full_name")

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error("Error fetching users:", error)
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

  const fetchProjectApprovals = async (projectIds: string[]) => {
    if (!projectIds.length) return

    try {
      // First get all gates for these projects
      const { data: gatesData, error: gatesError } = await supabase
        .from("gates")
        .select("id, project_id, gate_number")
        .in("project_id", projectIds)

      if (gatesError) throw gatesError

      if (!gatesData || gatesData.length === 0) {
        setProjectApprovals({})
        return
      }

      const gateIds = gatesData.map((gate) => gate.id)

      // Then get approvals for all these gates
      const { data: approvalsData, error: approvalsError } = await supabase
        .from("approvals")
        .select(`
        id, 
        gate_id, 
        required_role,
        status,
        approver:users!approvals_approver_id_fkey(full_name)
      `)
        .in("gate_id", gateIds)
        .order("created_at", { ascending: true })

      if (approvalsError) throw approvalsError

      // Group approvals by project_id
      const approvalsByProject = (approvalsData || []).reduce((acc: Record<string, any[]>, approval) => {
        // Find the gate for this approval
        const gate = gatesData.find((g) => g.id === approval.gate_id)
        if (gate) {
          if (!acc[gate.project_id]) {
            acc[gate.project_id] = []
          }
          acc[gate.project_id].push({
            ...approval,
            gate_number: gate.gate_number,
          })
        }
        return acc
      }, {})

      setProjectApprovals(approvalsByProject)
    } catch (error) {
      console.error("Error fetching project approvals:", error)
      setProjectApprovals({})
    }
  }

  const canEditProject = (project: Project) => {
    if (!currentUser) return false

    // Project creators, bid managers, and project managers can edit
    return (
      project.created_by === currentUser.id ||
      project.bid_manager_id === currentUser.id ||
      project.project_manager_id === currentUser.id ||
      ["branch_manager", "bu_director", "amea_president", "ceo"].includes(currentUser.role)
    )
  }

  const canAdvanceGate = (project: Project) => {
    if (!currentUser) return false

    // Only certain roles can manually advance gates
    return ["branch_manager", "bu_director", "amea_president", "ceo"].includes(currentUser.role)
  }

  const handleEdit = (project: Project) => {
    setEditingProject(project.id)
    setEditForm({
      name: project.name,
      client_name: project.client_name,
      description: project.description,
      revenue: project.revenue,
      risk_factor: project.risk_factor,
      country: project.country,
      technique: project.technique,
      next_review_date: project.next_review_date,
    })
  }

  const handleSave = async (projectId: string) => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from("projects")
        .update({
          name: editForm.name,
          client_name: editForm.client_name,
          description: editForm.description,
          revenue: editForm.revenue,
          risk_factor: editForm.risk_factor,
          country: editForm.country,
          technique: editForm.technique,
          next_review_date: editForm.next_review_date,
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId)

      if (error) throw error

      await fetchProjects()
      setEditingProject(null)
      setEditForm({})
      alert("Project updated successfully!")
    } catch (error) {
      console.error("Error updating project:", error)
      alert("Error updating project. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleAdvanceGate = async (projectId: string, currentGate: number) => {
    setAdvancingGate(projectId)
    try {
      const nextGate = currentGate + 1
      if (nextGate > 7) {
        alert("Project is already at the final gate.")
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

      await fetchProjects()
      alert(`Project advanced to Gate ${nextGate}!`)
    } catch (error) {
      console.error("Error advancing gate:", error)
      alert("Error advancing gate. Please try again.")
    } finally {
      setAdvancingGate(null)
    }
  }

  const createProjectApprovals = async (projectId: string, category: string) => {
    try {
      const { error } = await supabase.rpc("create_project_approvals", {
        p_project_id: projectId,
        p_category: category,
        p_gate_number: 1,
      })

      if (error) {
        console.error("Error creating approvals:", error)
        // Don't throw error, just log it
      } else {
        console.log("Approvals created successfully for project:", projectId)
      }
    } catch (error) {
      console.error("Error in createProjectApprovals:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      console.log("Starting project creation...")

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      console.log("User authenticated:", user.id)

      const revenue = Number.parseFloat(formData.revenue)
      const riskFactor = Number.parseInt(formData.risk_factor)
      const category = calculateCategory(revenue, riskFactor)

      console.log("Calculated category:", category)

      // Create the project
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .insert([
          {
            name: formData.name,
            client_name: formData.client_name,
            description: formData.description,
            revenue: revenue,
            risk_factor: riskFactor,
            country: formData.country,
            technique: formData.technique,
            next_review_date: formData.next_review_date,
            bid_manager_id: formData.bid_manager_id || null,
            project_manager_id: formData.project_manager_id || null,
            category: category,
            current_gate: 1,
            created_by: user.id,
          },
        ])
        .select()
        .single()

      if (projectError) {
        console.error("Project creation error details:", projectError)
        throw projectError
      }

      console.log("Project created successfully:", projectData)

      // Now create the approvals for Gate 1
      await createProjectApprovals(projectData.id, category)

      // Reset form
      setFormData({
        name: "",
        client_name: "",
        description: "",
        revenue: "",
        risk_factor: "",
        country: "",
        technique: "",
        next_review_date: "",
        bid_manager_id: "",
        project_manager_id: "",
      })
      setCalculatedCategory("")
      setIsDialogOpen(false)

      // Refresh projects list
      await fetchProjects()

      // Show success message
      alert(
        `Project created successfully! Category: ${categoryLabels[category as keyof typeof categoryLabels]}. Approval workflow has been initiated.`,
      )
    } catch (error) {
      console.error("Error creating project:", error)
      console.error("Error details:", JSON.stringify(error, null, 2))
      alert(`Error creating project: ${error.message || "Please try again."}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleNewProjectClick = () => {
    console.log("New Project button clicked")
    setIsDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading projects...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Projects</h1>
            <p className="text-gray-600 mt-2">Manage your project lifecycle and approvals</p>
          </div>

          {/* New Project Button and Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleNewProjectClick} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Add a new project to the PLM system. The project category will be automatically calculated based on
                  revenue and risk factor.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Project Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      required
                      placeholder="Enter project name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="client_name">Client Name *</Label>
                    <Input
                      id="client_name"
                      value={formData.client_name}
                      onChange={(e) => handleInputChange("client_name", e.target.value)}
                      required
                      placeholder="Enter client name"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    rows={3}
                    placeholder="Enter project description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="revenue">Revenue (USD) *</Label>
                    <Input
                      id="revenue"
                      type="number"
                      step="0.01"
                      value={formData.revenue}
                      onChange={(e) => handleInputChange("revenue", e.target.value)}
                      required
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="risk_factor">Risk Factor (1-10) *</Label>
                    <Input
                      id="risk_factor"
                      type="number"
                      min="1"
                      max="10"
                      value={formData.risk_factor}
                      onChange={(e) => handleInputChange("risk_factor", e.target.value)}
                      required
                      placeholder="1-10"
                    />
                  </div>
                </div>

                {calculatedCategory && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Calculated Category:</span>
                      <Badge className={categoryColors[calculatedCategory as keyof typeof categoryColors]}>
                        {categoryLabels[calculatedCategory as keyof typeof categoryLabels]}
                      </Badge>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="country">Country *</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => handleInputChange("country", e.target.value)}
                      required
                      placeholder="Enter country"
                    />
                  </div>
                  <div>
                    <Label htmlFor="technique">Technique *</Label>
                    <Input
                      id="technique"
                      value={formData.technique}
                      onChange={(e) => handleInputChange("technique", e.target.value)}
                      required
                      placeholder="Enter technique"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="next_review_date">Next Review Date *</Label>
                  <Input
                    id="next_review_date"
                    type="date"
                    value={formData.next_review_date}
                    onChange={(e) => handleInputChange("next_review_date", e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bid_manager_id">Bid Manager</Label>
                    <Select
                      value={formData.bid_manager_id}
                      onValueChange={(value) => handleInputChange("bid_manager_id", value === "clear" ? "" : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select bid manager (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clear">Clear selection</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name} ({user.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="project_manager_id">Project Manager</Label>
                    <Select
                      value={formData.project_manager_id}
                      onValueChange={(value) => handleInputChange("project_manager_id", value === "clear" ? "" : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select project manager (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clear">Clear selection</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name} ({user.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create Project"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6">
          {projects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="text-gray-500 mb-4">No projects found</div>
                <Button onClick={handleNewProjectClick} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Create your first project
                </Button>
              </CardContent>
            </Card>
          ) : (
            projects.map((project) => (
              <Card key={project.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      {editingProject === project.id ? (
                        <div className="space-y-2">
                          <Input
                            value={editForm.name || ""}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="text-xl font-semibold"
                          />
                          <Input
                            value={editForm.client_name || ""}
                            onChange={(e) => setEditForm({ ...editForm, client_name: e.target.value })}
                            placeholder="Client name"
                          />
                        </div>
                      ) : (
                        <>
                          <CardTitle className="text-xl">{project.name}</CardTitle>
                          <CardDescription className="mt-1">Client: {project.client_name}</CardDescription>
                        </>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Badge className={categoryColors[project.category as keyof typeof categoryColors]}>
                        {categoryLabels[project.category as keyof typeof categoryLabels]}
                      </Badge>
                      <Badge variant="outline">Gate {project.current_gate}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {editingProject === project.id ? (
                    <div className="space-y-4">
                      <Textarea
                        value={editForm.description || ""}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        placeholder="Project description"
                        rows={3}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Revenue (USD)</Label>
                          <Input
                            type="number"
                            value={editForm.revenue || ""}
                            onChange={(e) => setEditForm({ ...editForm, revenue: Number.parseFloat(e.target.value) })}
                          />
                        </div>
                        <div>
                          <Label>Risk Factor (1-10)</Label>
                          <Input
                            type="number"
                            min="1"
                            max="10"
                            value={editForm.risk_factor || ""}
                            onChange={(e) => setEditForm({ ...editForm, risk_factor: Number.parseInt(e.target.value) })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Country</Label>
                          <Input
                            value={editForm.country || ""}
                            onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Technique</Label>
                          <Input
                            value={editForm.technique || ""}
                            onChange={(e) => setEditForm({ ...editForm, technique: e.target.value })}
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Next Review Date</Label>
                        <Input
                          type="date"
                          value={editForm.next_review_date || ""}
                          onChange={(e) => setEditForm({ ...editForm, next_review_date: e.target.value })}
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleSave(project.id)}
                          disabled={saving}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {saving ? "Saving..." : "Save Changes"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditingProject(null)
                            setEditForm({})
                          }}
                          disabled={saving}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-gray-600 mb-4">{project.description}</p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span>${project.revenue?.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-orange-600" />
                          <span>Risk: {project.risk_factor}/10</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-blue-600" />
                          <span>{project.country}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Wrench className="h-4 w-4 text-purple-600" />
                          <span>{project.technique}</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span>BM: {project.bid_manager?.full_name || "Not assigned"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span>PM: {project.project_manager?.full_name || "Not assigned"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span>Review: {new Date(project.next_review_date).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t flex gap-2">
                        {canEditProject(project) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(project)}
                            disabled={editingProject !== null}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Project
                          </Button>
                        )}

                        {canAdvanceGate(project) && project.current_gate < 7 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAdvanceGate(project.id, project.current_gate)}
                            disabled={advancingGate === project.id}
                          >
                            <ArrowRight className="h-4 w-4 mr-2" />
                            {advancingGate === project.id
                              ? "Advancing..."
                              : `Advance to Gate ${project.current_gate + 1}`}
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
