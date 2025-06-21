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
import {
  Plus,
  Calendar,
  DollarSign,
  AlertTriangle,
  MapPin,
  Wrench,
  User,
  Edit,
  Eye,
  Trash2,
  Trophy,
  Search,
} from "lucide-react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { notificationService } from "@/lib/notification-service"
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
  const [deletingProject, setDeletingProject] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterGate, setFilterGate] = useState<string>("all")
  const [filterCountry, setFilterCountry] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("created_at")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const supabase = createClient()
  const router = useRouter()
  const { showAlert, showConfirm } = useAlert()

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

  // Filter and sort projects
  const filteredAndSortedProjects = projects
    .filter((project) => {
      // Text search
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch =
        project.name.toLowerCase().includes(searchLower) ||
        project.client_name.toLowerCase().includes(searchLower) ||
        project.description?.toLowerCase().includes(searchLower) ||
        project.country.toLowerCase().includes(searchLower) ||
        project.technique.toLowerCase().includes(searchLower)

      // Category filter
      const matchesCategory = filterCategory === "all" || project.category === filterCategory

      // Gate filter
      const matchesGate = filterGate === "all" || project.current_gate.toString() === filterGate

      // Country filter
      const matchesCountry = filterCountry === "all" || project.country === filterCountry

      return matchesSearch && matchesCategory && matchesGate && matchesCountry
    })
    .sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case "client_name":
          aValue = a.client_name.toLowerCase()
          bValue = b.client_name.toLowerCase()
          break
        case "revenue":
          aValue = a.revenue || 0
          bValue = b.revenue || 0
          break
        case "risk_factor":
          aValue = a.risk_factor || 0
          bValue = b.risk_factor || 0
          break
        case "current_gate":
          aValue = a.current_gate
          bValue = b.current_gate
          break
        case "next_review_date":
          aValue = new Date(a.next_review_date)
          bValue = new Date(b.next_review_date)
          break
        case "created_at":
        default:
          aValue = new Date(a.created_at)
          bValue = new Date(b.created_at)
          break
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1
      return 0
    })

  // Get unique countries for filter dropdown
  const uniqueCountries = [...new Set(projects.map((p) => p.country))].sort()

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

  const canDeleteProject = (project: Project) => {
    if (!currentUser) return false

    // Only certain high-level roles can delete projects, or the project creator
    return project.created_by === currentUser.id || ["bu_director", "amea_president", "ceo"].includes(currentUser.role)
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
      showAlert({
        type: "success",
        title: "Project Updated",
        message: "Project updated successfully!",
      })
    } catch (error) {
      console.error("Error updating project:", error)
      showAlert({
        type: "error",
        title: "Update Error",
        message: "Error updating project. Please try again.",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleAdvanceGate = async (projectId: string, currentGate: number) => {
    setAdvancingGate(projectId)
    try {
      const nextGate = currentGate + 1
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

      await fetchProjects()
      showAlert({
        type: "success",
        title: "Gate Advanced",
        message: `Project advanced to Gate ${nextGate}!`,
      })
    } catch (error) {
      console.error("Error advancing gate:", error)
      showAlert({
        type: "error",
        title: "Gate Advancement Error",
        message: "Error advancing gate. Please try again.",
      })
    } finally {
      setAdvancingGate(null)
    }
  }

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    showConfirm({
      type: "warning",
      title: "Delete Project",
      message: `Are you sure you want to delete the project "${projectName}"? This action cannot be undone and will remove all associated data including gates, approvals, and documents.`,
      confirmText: "Delete Project",
      cancelText: "Cancel",
      onConfirm: async () => {
        setDeletingProject(projectId)
        try {
          console.log(`Starting deletion of project: ${projectId}`)

          // Use the database function to delete the project
          const { data, error } = await supabase.rpc("delete_project_cascade", {
            project_id_param: projectId,
          })

          if (error) {
            console.error("Database function error:", error)
            throw error
          }

          console.log("Delete function result:", data)

          if (!data.success) {
            throw new Error(data.error || "Unknown error occurred during deletion")
          }

          // Log what was deleted
          console.log("Successfully deleted:", data.deleted)

          // Refresh the projects list
          await fetchProjects()
          showAlert({
            type: "success",
            title: "Project Deleted",
            message: `Project deleted successfully! Removed: ${data.deleted.projects} project(s), ${data.deleted.gates} gate(s), ${data.deleted.approvals} approval(s), ${data.deleted.documents} document(s)`,
          })
        } catch (error) {
          console.error("Error deleting project:", error)
          showAlert({
            type: "error",
            title: "Deletion Error",
            message: `Error deleting project: ${error.message || "Please try again."}`,
          })
        } finally {
          setDeletingProject(null)
        }
      },
    })
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

      // Create notifications for project creation
      await notificationService.createProjectCreationNotification(
        projectData.id,
        projectData.name,
        category,
        currentUser?.full_name || "Unknown User",
      )

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
      showAlert({
        type: "success",
        title: "Project Created Successfully",
        message: `Project created successfully! Category: ${categoryLabels[category as keyof typeof categoryLabels]}. Approval workflow has been initiated.`,
      })
    } catch (error) {
      console.error("Error creating project:", error)
      console.error("Error details:", JSON.stringify(error, null, 2))
      showAlert({
        type: "error",
        title: "Project Creation Error",
        message: `Error creating project: ${error.message || "Please try again."}`,
      })
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
      <div className="min-h-screen bg-gradient-to-r from-[#f5faff] to-[#fffde9]">
        <Navbar />
        <div className="container mx-auto p-4 md:p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading projects...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-[#f5faff] to-[#fffde9]">
      <Navbar />
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 md:space-y-8">
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-800 rounded-xl shadow-lg p-4 md:p-8 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 to-transparent"></div>
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6">
              <div>
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-yellow-400 rounded-lg flex items-center justify-center">
                    <span className="text-slate-900 font-bold text-lg md:text-xl">K</span>
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-white to-yellow-200 bg-clip-text text-transparent">
                      Projects
                    </h1>
                    <p className="text-blue-200 text-sm md:text-lg mt-1">Manage your project lifecycle and approvals</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <Button
                  variant="outline"
                  onClick={() => router.push("/dashboard/projects/completed")}
                  className="bg-green-50/20 border-green-200/30 text-green-200 hover:bg-green-100/20 backdrop-blur-sm w-full sm:w-auto"
                >
                  <Trophy className="mr-2 h-4 w-4" />
                  View Completed
                </Button>

                {/* New Project Button and Dialog */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={handleNewProjectClick}
                      className="bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-semibold shadow-lg w-full sm:w-auto"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      New Project
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create New Project</DialogTitle>
                      <DialogDescription>
                        Add a new project to the PLM system. The project category will be automatically calculated based
                        on revenue and risk factor.
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
                            onValueChange={(value) =>
                              handleInputChange("bid_manager_id", value === "clear" ? "" : value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select bid manager (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="clear">Clear selection</SelectItem>
                              {users
                                .filter((user) => user.role === "bid_manager")
                                .map((user) => (
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
                            onValueChange={(value) =>
                              handleInputChange("project_manager_id", value === "clear" ? "" : value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select project manager (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="clear">Clear selection</SelectItem>
                              {users
                                .filter((user) => user.role === "project_manager")
                                .map((user) => (
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
            </div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4 md:p-6">
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 md:h-12 text-sm md:text-base"
                />
              </div>

              {/* Filters and Sort */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
                {/* Category Filter */}
                <div>
                  <Label className="text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2 block">Category</Label>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="h-9 md:h-10 text-xs md:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="category_1a">Category 1A</SelectItem>
                      <SelectItem value="category_1b">Category 1B</SelectItem>
                      <SelectItem value="category_1c">Category 1C</SelectItem>
                      <SelectItem value="category_2">Category 2</SelectItem>
                      <SelectItem value="category_3">Category 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Gate Filter */}
                <div>
                  <Label className="text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2 block">Gate</Label>
                  <Select value={filterGate} onValueChange={setFilterGate}>
                    <SelectTrigger className="h-9 md:h-10 text-xs md:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Gates</SelectItem>
                      <SelectItem value="1">Gate 1</SelectItem>
                      <SelectItem value="2">Gate 2</SelectItem>
                      <SelectItem value="3">Gate 3</SelectItem>
                      <SelectItem value="4">Gate 4</SelectItem>
                      <SelectItem value="5">Gate 5</SelectItem>
                      <SelectItem value="6">Gate 6</SelectItem>
                      <SelectItem value="7">Gate 7</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Country Filter */}
                <div>
                  <Label className="text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2 block">Country</Label>
                  <Select value={filterCountry} onValueChange={setFilterCountry}>
                    <SelectTrigger className="h-9 md:h-10 text-xs md:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Countries</SelectItem>
                      {uniqueCountries.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort By */}
                <div>
                  <Label className="text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2 block">Sort By</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="h-9 md:h-10 text-xs md:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_at">Date Created</SelectItem>
                      <SelectItem value="name">Project Name</SelectItem>
                      <SelectItem value="client_name">Client Name</SelectItem>
                      <SelectItem value="revenue">Revenue</SelectItem>
                      <SelectItem value="risk_factor">Risk Factor</SelectItem>
                      <SelectItem value="current_gate">Current Gate</SelectItem>
                      <SelectItem value="next_review_date">Review Date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort Order */}
                <div>
                  <Label className="text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2 block">Order</Label>
                  <Select value={sortOrder} onValueChange={(value: "asc" | "desc") => setSortOrder(value)}>
                    <SelectTrigger className="h-9 md:h-10 text-xs md:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Descending</SelectItem>
                      <SelectItem value="asc">Ascending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Results Summary */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-2 border-t gap-2">
                <div className="text-xs md:text-sm text-gray-600">
                  Showing {filteredAndSortedProjects.length} of {projects.length} projects
                </div>
                {(searchTerm || filterCategory !== "all" || filterGate !== "all" || filterCountry !== "all") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm("")
                      setFilterCategory("all")
                      setFilterGate("all")
                      setFilterCountry("all")
                      setSortBy("created_at")
                      setSortOrder("desc")
                    }}
                    className="text-xs w-full sm:w-auto"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:gap-6">
          {filteredAndSortedProjects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 md:py-12 px-4">
                <div className="text-gray-500 mb-4 text-center text-sm md:text-base">
                  {projects.length === 0 ? "No projects found" : "No projects match your search criteria"}
                </div>
                {projects.length === 0 ? (
                  <Button onClick={handleNewProjectClick} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    Create your first project
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("")
                      setFilterCategory("all")
                      setFilterGate("all")
                      setFilterCountry("all")
                    }}
                    className="w-full sm:w-auto"
                  >
                    Clear Search & Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredAndSortedProjects.map((project) => (
              <Card key={project.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3 md:pb-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                    <div className="flex-1 min-w-0">
                      {editingProject === project.id ? (
                        <div className="space-y-2">
                          <Input
                            value={editForm.name || ""}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="text-lg md:text-xl font-semibold"
                          />
                          <Input
                            value={editForm.client_name || ""}
                            onChange={(e) => setEditForm({ ...editForm, client_name: e.target.value })}
                            placeholder="Client name"
                          />
                        </div>
                      ) : (
                        <>
                          <CardTitle className="text-lg md:text-xl truncate">{project.name}</CardTitle>
                          <CardDescription className="mt-1 text-sm">Client: {project.client_name}</CardDescription>
                        </>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <Badge className={`text-xs ${categoryColors[project.category as keyof typeof categoryColors]}`}>
                        {categoryLabels[project.category as keyof typeof categoryLabels]}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Gate {project.current_gate}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {editingProject === project.id ? (
                    // Edit form content remains the same but with responsive adjustments
                    <div className="space-y-4">
                      <Textarea
                        value={editForm.description || ""}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        placeholder="Project description"
                        rows={3}
                        className="text-sm"
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm">Revenue (USD)</Label>
                          <Input
                            type="number"
                            value={editForm.revenue || ""}
                            onChange={(e) => setEditForm({ ...editForm, revenue: Number.parseFloat(e.target.value) })}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Risk Factor (1-10)</Label>
                          <Input
                            type="number"
                            min="1"
                            max="10"
                            value={editForm.risk_factor || ""}
                            onChange={(e) => setEditForm({ ...editForm, risk_factor: Number.parseInt(e.target.value) })}
                            className="text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm">Country</Label>
                          <Input
                            value={editForm.country || ""}
                            onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Technique</Label>
                          <Input
                            value={editForm.technique || ""}
                            onChange={(e) => setEditForm({ ...editForm, technique: e.target.value })}
                            className="text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm">Next Review Date</Label>
                        <Input
                          type="date"
                          value={editForm.next_review_date || ""}
                          onChange={(e) => setEditForm({ ...editForm, next_review_date: e.target.value })}
                          className="text-sm"
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          onClick={() => handleSave(project.id)}
                          disabled={saving}
                          className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
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
                          className="w-full sm:w-auto"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-gray-600 mb-4 text-sm md:text-base">{project.description}</p>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 text-xs md:text-sm">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-green-600 shrink-0" />
                          <span className="truncate">${project.revenue?.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-3 w-3 md:h-4 md:w-4 text-orange-600 shrink-0" />
                          <span>Risk: {project.risk_factor}/10</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 md:h-4 md:w-4 text-blue-600 shrink-0" />
                          <span className="truncate">{project.country}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Wrench className="h-3 w-3 md:h-4 md:w-4 text-purple-600 shrink-0" />
                          <span className="truncate">{project.technique}</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4 text-xs md:text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 md:h-4 md:w-4 text-gray-500 shrink-0" />
                          <span className="truncate">BM: {project.bid_manager?.full_name || "Not assigned"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 md:h-4 md:w-4 text-gray-500 shrink-0" />
                          <span className="truncate">PM: {project.project_manager?.full_name || "Not assigned"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 md:h-4 md:w-4 text-gray-500 shrink-0" />
                          <span className="truncate">
                            Review: {new Date(project.next_review_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row gap-2">
                        {canEditProject(project) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(project)}
                            disabled={editingProject !== null}
                            className="w-full sm:w-auto text-xs"
                          >
                            <Edit className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                            Edit Project
                          </Button>
                        )}
                        {canDeleteProject(project) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteProject(project.id, project.name)}
                            disabled={deletingProject === project.id || editingProject !== null}
                            className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 w-full sm:w-auto text-xs"
                          >
                            <Trash2 className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                            {deletingProject === project.id ? "Deleting..." : "Delete"}
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                          className="w-full sm:w-auto text-xs"
                        >
                          <Eye className="h-3 w-3 md:h-4 md:w-4 mr-2" />
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
