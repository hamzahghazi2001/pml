"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  AlertTriangle,
  MapPin,
  Wrench,
  User,
  Eye,
  CheckCircle,
  Trophy,
} from "lucide-react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"

interface CompletedProject {
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
  created_at: string
  updated_at: string
  completion_date: string
  bid_manager_id: string
  project_manager_id: string
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

const categoryColors = {
  category_1a: "bg-green-100 text-green-800",
  category_1b: "bg-blue-100 text-blue-800",
  category_1c: "bg-yellow-100 text-yellow-800",
  category_2: "bg-orange-100 text-orange-800",
  category_3: "bg-red-100 text-red-800",
}

export default function CompletedProjectsPage() {
  const [projects, setProjects] = useState<CompletedProject[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalCompleted: 0,
    totalRevenue: 0,
    averageCompletionTime: 0,
    categoryBreakdown: {} as Record<string, number>,
  })

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchCompletedProjects()
  }, [])

  const fetchCompletedProjects = async () => {
    try {
      console.log("Fetching completed projects...")

      // First, let's check if there are any projects at all and their gate status
      const { data: allProjects, error: allError } = await supabase
        .from("projects")
        .select("id, name, current_gate, status")

      if (allError) {
        console.error("Error fetching all projects:", allError)
      } else {
        console.log("All projects and their gates:", allProjects)
        const gateDistribution = allProjects?.reduce(
          (acc, project) => {
            acc[project.current_gate] = (acc[project.current_gate] || 0) + 1
            return acc
          },
          {} as Record<number, number>,
        )
        console.log("Gate distribution:", gateDistribution)
      }

      // Try multiple approaches to find completed projects
      const { data: gate7Projects, error: gate7Error } = await supabase
        .from("projects")
        .select(`
        *,
        bid_manager:users!projects_bid_manager_id_fkey(full_name),
        project_manager:users!projects_project_manager_id_fkey(full_name)
      `)
        .eq("current_gate", 7)
        .order("updated_at", { ascending: false })

      const { data: completedStatusProjects, error: completedError } = await supabase
        .from("projects")
        .select(`
        *,
        bid_manager:users!projects_bid_manager_id_fkey(full_name),
        project_manager:users!projects_project_manager_id_fkey(full_name)
      `)
        .eq("status", "completed")
        .order("updated_at", { ascending: false })

      if (gate7Error) {
        console.error("Error fetching gate 7 projects:", gate7Error)
      }

      if (completedError) {
        console.error("Error fetching completed status projects:", completedError)
      }

      console.log("Gate 7 projects found:", gate7Projects?.length || 0)
      console.log("Completed status projects found:", completedStatusProjects?.length || 0)

      // Combine both approaches - projects at gate 7 OR with completed status
      const allCompletedProjects = [
        ...(gate7Projects || []),
        ...(completedStatusProjects || []).filter((p) => !gate7Projects?.find((g) => g.id === p.id)),
      ]

      console.log("Total completed projects:", allCompletedProjects.length)

      setProjects(allCompletedProjects)

      // Calculate stats
      const totalRevenue = allCompletedProjects.reduce((sum, project) => sum + (project.revenue || 0), 0)
      const categoryBreakdown = allCompletedProjects.reduce(
        (acc, project) => {
          acc[project.category] = (acc[project.category] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )

      // Calculate average completion time (from creation to completion)
      const completionTimes = allCompletedProjects
        .filter((p) => p.created_at && p.updated_at)
        .map((p) => {
          const created = new Date(p.created_at)
          const completed = new Date(p.updated_at)
          return Math.floor((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)) // days
        })

      const averageCompletionTime =
        completionTimes.length > 0
          ? Math.round(completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length)
          : 0

      setStats({
        totalCompleted: allCompletedProjects.length,
        totalRevenue,
        averageCompletionTime,
        categoryBreakdown,
      })
    } catch (error) {
      console.error("Error fetching completed projects:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading completed projects...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-[#f5faff] to-[#fffde9]">
      <Navbar />
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => router.push("/dashboard/projects")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Trophy className="h-8 w-8 text-yellow-600" />
              Completed Projects
            </h1>
            <p className="text-gray-600 mt-2">Projects that have successfully completed all 7 PLM gates</p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalCompleted}</p>
                  <p className="text-sm text-gray-600">Total Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.averageCompletionTime}</p>
                  <p className="text-sm text-gray-600">Avg. Days to Complete</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-2xl font-bold">
                    {Object.keys(stats.categoryBreakdown).length > 0
                      ? Object.entries(stats.categoryBreakdown).reduce((a, b) => (a[1] > b[1] ? a : b))[0]
                      : "N/A"}
                  </p>
                  <p className="text-sm text-gray-600">Top Category</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Breakdown */}
        {Object.keys(stats.categoryBreakdown).length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Completion by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(stats.categoryBreakdown).map(([category, count]) => (
                  <div key={category} className="text-center">
                    <Badge className={categoryColors[category as keyof typeof categoryColors]}>
                      {categoryLabels[category as keyof typeof categoryLabels]}
                    </Badge>
                    <p className="text-2xl font-bold mt-2">{count}</p>
                    <p className="text-sm text-gray-600">projects</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completed Projects List */}
        <div className="grid gap-6">
          {projects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Trophy className="h-12 w-12 text-gray-400 mb-4" />
                <div className="text-gray-500 mb-4">No completed projects found</div>
                <p className="text-sm text-gray-400 text-center">
                  Projects will appear here once they reach Gate 7 or have "completed" status.
                  <br />
                  Check the browser console for debugging information.
                </p>
              </CardContent>
            </Card>
          ) : (
            projects.map((project) => (
              <Card key={project.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        {project.name}
                      </CardTitle>
                      <CardDescription className="mt-1">Client: {project.client_name}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={categoryColors[project.category as keyof typeof categoryColors]}>
                        {categoryLabels[project.category as keyof typeof categoryLabels]}
                      </Badge>
                      <Badge className="bg-green-100 text-green-800">Completed</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
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
                      <span>Completed: {new Date(project.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
