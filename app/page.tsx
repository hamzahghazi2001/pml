import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Shield, BarChart3, Users, FileText, Clock } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-yellow-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-W64KmW11QXb7cBx0VGAaVRJNQCq3jG.png"
                alt="Keller Logo"
                className="h-10 w-auto"
              />
              <div>
                <div className="text-sm text-gray-600">PLM Dashboard</div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/auth/signin">
                <Button variant="outline" className="border-blue-900 text-blue-900 hover:bg-blue-50">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button className="bg-blue-900 hover:bg-blue-800 text-white">Sign Up</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-5xl font-bold text-blue-900 mb-6">Project Lifecycle Management</h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Streamline your project workflows with Keller's comprehensive PLM system. Manage the complete 7-gate
            approval process from opportunity to contract closure.
          </p>
          <div className="flex items-center justify-center space-x-4">
            <Link href="/auth/signup">
              <Button size="lg" className="bg-blue-900 hover:bg-blue-800 text-white px-8 py-3">
                Get Started
              </Button>
            </Link>
            <Link href="/about">
              <Button size="lg" variant="outline" className="border-blue-900 text-blue-900 hover:bg-blue-50 px-8 py-3">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-blue-900 mb-4">Complete PLM Solution</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Built specifically for Keller's Middle East Africa operations, following the official PLM standard
              KG-OP-ST-00001-v1.0
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-2 hover:border-yellow-400 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <CheckCircle className="w-6 h-6 text-blue-900" />
                </div>
                <CardTitle className="text-blue-900">7-Gate Workflow</CardTitle>
                <CardDescription>Complete gate management from early bid decision to contract closure</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Automated approval routing</li>
                  <li>• Role-based access control</li>
                  <li>• Deadline tracking</li>
                  <li>• Document management</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-yellow-400 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-yellow-600" />
                </div>
                <CardTitle className="text-blue-900">Risk Management</CardTitle>
                <CardDescription>Comprehensive risk assessment and categorization system</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Automatic project categorization</li>
                  <li>• Risk factor calculation</li>
                  <li>• Approval matrix enforcement</li>
                  <li>• Compliance monitoring</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-yellow-400 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle className="text-blue-900">Performance Analytics</CardTitle>
                <CardDescription>Real-time insights into project performance and bottlenecks</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Gate performance metrics</li>
                  <li>• Bottleneck identification</li>
                  <li>• Portfolio overview</li>
                  <li>• Compliance reporting</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-yellow-400 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle className="text-blue-900">Team Collaboration</CardTitle>
                <CardDescription>Seamless collaboration between sales, operations, and management</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Role-based dashboards</li>
                  <li>• Automated notifications</li>
                  <li>• Project handover tools</li>
                  <li>• Communication tracking</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-yellow-400 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-red-600" />
                </div>
                <CardTitle className="text-blue-900">Document Control</CardTitle>
                <CardDescription>Centralized document management with version control</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• BAR/CAR generation</li>
                  <li>• Version tracking</li>
                  <li>• Template library</li>
                  <li>• Secure storage</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-yellow-400 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
                <CardTitle className="text-blue-900">Lessons Learned</CardTitle>
                <CardDescription>Capture and share knowledge for continuous improvement</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Project feedback capture</li>
                  <li>• Knowledge repository</li>
                  <li>• Best practice sharing</li>
                  <li>• Improvement tracking</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* PLM Process Overview */}
      <section className="py-16 bg-blue-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">7-Gate PLM Process</h2>
            <p className="text-blue-100">
              Standardized workflow ensuring consistent project delivery across all categories
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {[
              { gate: 1, name: "Early Bid Decision", phase: "Opportunity" },
              { gate: 2, name: "Bid/No Bid", phase: "Opportunity" },
              { gate: 3, name: "Bid Submission", phase: "Bid" },
              { gate: 4, name: "Contract Approval", phase: "Contract" },
              { gate: 5, name: "Launch Review", phase: "Execution" },
              { gate: 6, name: "Works Acceptance", phase: "Completion" },
              { gate: 7, name: "Contract Close", phase: "Close-out" },
            ].map((gate, index) => (
              <div key={gate.gate} className="text-center">
                <div className="bg-white rounded-lg p-4 shadow-sm border-2 border-gray-200 hover:border-yellow-400 transition-colors">
                  <div className="w-12 h-12 bg-blue-900 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold">
                    {gate.gate}
                  </div>
                  <h3 className="font-semibold text-blue-900 text-sm mb-1">{gate.name}</h3>
                  <p className="text-xs text-gray-600">{gate.phase}</p>
                </div>
                {index < 6 && <div className="hidden md:block w-full h-0.5 bg-gray-300 mt-6"></div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t py-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-W64KmW11QXb7cBx0VGAaVRJNQCq3jG.png"
                alt="Keller Logo"
                className="h-8 w-auto"
              />
              <div>
                <div className="text-xs text-gray-600">PLM Dashboard</div>
              </div>
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <Link href="/about" className="hover:text-blue-900">
                About
              </Link>
              <Link href="/contact" className="hover:text-blue-900">
                Contact
              </Link>
              <Link href="/privacy" className="hover:text-blue-900">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-blue-900">
                Terms
              </Link>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t text-center text-xs text-gray-500">
            © 2024 Keller Group. All rights reserved. | Standard: KG-OP-ST-00001-v1.0
          </div>
        </div>
      </footer>
    </div>
  )
}
