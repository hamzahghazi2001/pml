"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase"
import {
  Shield,
  BarChart3,
  Users,
  FileText,
  Eye,
  EyeOff,
  ArrowRight,
  Building2,
  Target,
  Zap,
  Award,
} from "lucide-react"

const roles = [
  { value: "bid_manager", label: "Bid Manager" },
  { value: "project_manager", label: "Project Manager" },
  { value: "branch_manager", label: "Branch Manager" },
  { value: "bu_director", label: "BU Director" },
  { value: "finance_manager", label: "Finance Manager" },
  { value: "technical_director", label: "Technical Director" },
  { value: "sales_director", label: "Sales Director" },
]

const countries = ["UAE", "Saudi Arabia", "Egypt", "Kuwait", "Qatar", "Oman", "Bahrain"]

export default function HomePage() {
  const [showSignIn, setShowSignIn] = useState(false)
  const [signInData, setSignInData] = useState({ email: "", password: "" })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const supabase = createClient()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: signInData.email,
        password: signInData.password,
      })

      if (error) {
        setError(error.message)
      } else {
        router.push("/dashboard")
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-yellow-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <img src="/keller-logo.png" alt="Keller Logo" className="h-8 sm:h-10 w-auto" />
              <div className="hidden sm:block">
                <div className="text-xs text-gray-600">PLM Dashboard</div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                className="border-blue-900 text-blue-900 hover:bg-blue-50"
                onClick={() => {
                  setShowSignIn(!showSignIn)
                }}
              >
                {showSignIn ? "Hide Sign In" : "Sign In"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 sm:py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-yellow-400/15 to-orange-500/10"></div>
        <div className="absolute inset-0 bg-gradient-to-tl from-red-600/5 via-transparent to-blue-800/8"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-yellow-300/20 via-transparent to-transparent"></div>
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-600/15 via-transparent to-transparent"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center relative">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-blue-900 mb-6 leading-tight">
            Next-Generation
            <br />
            <span className="bg-gradient-to-r from-blue-900 to-yellow-600 bg-clip-text text-transparent">
              PLM Workflow
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 mb-6 sm:mb-8 max-w-3xl mx-auto leading-relaxed">
            Transform your project lifecycle management with Keller's intelligent 7-gate approval system. Streamline
            workflows, ensure compliance, and accelerate project delivery across the Middle East & Africa.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-8 mb-8 sm:mb-12">
            <div className="flex items-center space-x-2 text-gray-600">
              <Building2 className="w-5 h-5 text-blue-900" />
              <span>14+ Countries</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <Target className="w-5 h-5 text-blue-900" />
              <span>7-Gate Process</span>
            </div>
          </div>

          {/* Sign In Form */}
          {showSignIn && (
            <Card className="max-w-sm sm:max-w-md mx-auto mb-6 sm:mb-8 border-2 border-blue-200 shadow-xl">
              <CardHeader>
                <CardTitle className="text-blue-900">Sign In to Dashboard</CardTitle>
                <CardDescription>Access your PLM workspace</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignIn} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="your.email@keller.com"
                      value={signInData.email}
                      onChange={(e) => setSignInData((prev) => ({ ...prev, email: e.target.value }))}
                      required
                      className="border-gray-300 focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={signInData.password}
                        onChange={(e) => setSignInData((prev) => ({ ...prev, password: e.target.value }))}
                        required
                        className="border-gray-300 focus:border-blue-500 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-blue-900 hover:bg-blue-800 text-white" disabled={loading}>
                    {loading ? (
                      "Signing In..."
                    ) : (
                      <>
                        <span className="sm:hidden">Access</span>
                        <span className="hidden sm:inline">Access Dashboard</span>
                      </>
                    )}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-blue-900 mb-4">Complete PLM Ecosystem</h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              Built specifically for Keller's Middle East Africa operations, following the official PLM standard
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <Card className="border-2 hover:border-blue-400 transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-blue-900" />
                </div>
                <CardTitle className="text-blue-900">Intelligent Automation</CardTitle>
                <CardDescription>
                  Intelligent workflow automation with smart routing and predictive analytics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Auto-categorization by risk & value</li>
                  <li>• Smart approval routing</li>
                  <li>• Predictive bottleneck detection</li>
                  <li>• Automated compliance checks</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-yellow-400 transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-yellow-600" />
                </div>
                <CardTitle className="text-blue-900">Enterprise Security</CardTitle>
                <CardDescription>Bank-grade security with role-based access and audit trails</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Multi-factor authentication</li>
                  <li>• Granular permission control</li>
                  <li>• Complete audit logging</li>
                  <li>• Data encryption at rest</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-green-400 transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle className="text-blue-900">Advanced Analytics</CardTitle>
                <CardDescription>
                  Real-time insights with predictive modeling and performance optimization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Real-time performance dashboards</li>
                  <li>• Predictive risk modeling</li>
                  <li>• Resource optimization</li>
                  <li>• ROI impact analysis</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-purple-400 transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle className="text-blue-900">Global Collaboration</CardTitle>
                <CardDescription>Seamless teamwork across 14+ countries with unified workflows</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Multi-timezone coordination</li>
                  <li>• Real-time collaboration tools</li>
                  <li>• Unified communication hub</li>
                  <li>• Cross-border project handoffs</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-red-400 transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-red-600" />
                </div>
                <CardTitle className="text-blue-900">Smart Documentation</CardTitle>
                <CardDescription>Intelligent document generation with automated compliance checking</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Auto-generated BAR/CAR reports</li>
                  <li>• Template intelligence</li>
                  <li>• Version control & tracking</li>
                  <li>• Compliance validation</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-orange-400 transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <Award className="w-6 h-6 text-orange-600" />
                </div>
                <CardTitle className="text-blue-900">Continuous Learning</CardTitle>
                <CardDescription>Data-driven insights from project outcomes for continuous improvement</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Automated lessons capture</li>
                  <li>• Pattern recognition</li>
                  <li>• Best practice recommendations</li>
                  <li>• Performance benchmarking</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* PLM Process Visualization */}
      <section className="py-12 sm:py-16 bg-gradient-to-r from-blue-900 to-blue-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">7-Gate PLM Process</h2>
            <p className="text-blue-100 text-lg">
              Standardized workflow ensuring consistent project delivery across all categories
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4 sm:gap-6 lg:gap-8">
            {[
              { gate: 1, name: "Early Bid Decision", phase: "Opportunity", color: "from-green-400 to-green-500" },
              { gate: 2, name: "Bid/No Bid", phase: "Opportunity", color: "from-blue-400 to-blue-500" },
              { gate: 3, name: "Bid Submission", phase: "Bid", color: "from-purple-400 to-purple-500" },
              { gate: 4, name: "Contract Approval", phase: "Contract", color: "from-yellow-400 to-yellow-500" },
              { gate: 5, name: "Launch Review", phase: "Execution", color: "from-red-400 to-red-500" },
              { gate: 6, name: "Works Acceptance", phase: "Completion", color: "from-indigo-400 to-indigo-500" },
              { gate: 7, name: "Contract Close", phase: "Close-out", color: "from-orange-400 to-orange-500" },
            ].map((gate, index) => (
              <div key={gate.gate} className="text-center">
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-xl border border-white/20 hover:bg-white transition-all duration-500 hover:shadow-2xl transform hover:-translate-y-2 hover:scale-105">
                  <div
                    className={`w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r ${gate.color} text-white rounded-2xl flex items-center justify-center mx-auto mb-6 font-bold text-xl sm:text-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:rotate-3`}
                  >
                    {gate.gate}
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-blue-900 mb-3 leading-tight">{gate.name}</h3>
                  <p className="text-sm text-gray-500 font-medium tracking-wide uppercase">{gate.phase}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-blue-900 text-white py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <img src="/keller-logo.png" alt="Keller Logo" className="h-6 sm:h-8 w-auto brightness-0 invert" />
                <div>
                  <div className="text-xs text-blue-200">PLM Dashboard</div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-xs sm:text-sm text-blue-200">
                <li>
                  <Link href="#" className="hover:text-white">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Analytics
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Reporting
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Integration
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-xs sm:text-sm text-blue-200">
                <li>
                  <Link href="#" className="hover:text-white">
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Training
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-xs sm:text-sm text-blue-200">
                <li>
                  <Link href="#" className="hover:text-white">
                    About Keller
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Careers
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-blue-800 mt-8 pt-8 text-center"></div>
        </div>
      </footer>
    </div>
  )
}
