"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { FileText, Eye, Download, CheckCircle, AlertCircle, FileImage, RefreshCw } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface DocumentRequirement {
  id: string
  gate_number: number
  document_type: string
  is_required: boolean
  description: string
}

interface ProjectDocument {
  id: string
  file_name: string
  file_url: string
  file_type: string
  file_size: number
  upload_status: string
  requirement_id: string
  created_at: string
  file_preview_url?: string
}

interface DocumentUploadProps {
  projectId: string
  currentGate: number
  canUpload: boolean
  onDocumentChange?: () => void
}

export function DocumentUpload({ projectId, currentGate, canUpload, onDocumentChange }: DocumentUploadProps) {
  const [requirements, setRequirements] = useState<DocumentRequirement[]>([])
  const [documents, setDocuments] = useState<ProjectDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [previewDocument, setPreviewDocument] = useState<ProjectDocument | null>(null)
  const [storageStatus, setStorageStatus] = useState<"checking" | "ready" | "error">("checking")
  const [storageError, setStorageError] = useState<string | null>(null)

  const supabase = createClient()

  const checkStorageSetup = async () => {
    try {
      setStorageStatus("checking")
      setStorageError(null)

      // Check if bucket exists
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()

      if (bucketError) {
        console.error("Storage check error:", bucketError)
        setStorageError(`Storage access error: ${bucketError.message}`)
        setStorageStatus("error")
        return false
      }

      const bucketExists = buckets?.some((bucket) => bucket.id === "project-documents")

      if (!bucketExists) {
        setStorageError(
          "Storage bucket 'project-documents' not found. Please contact administrator to run storage setup.",
        )
        setStorageStatus("error")
        return false
      }

      // Test upload permissions by checking if we can list files
      const { error: listError } = await supabase.storage.from("project-documents").list("", { limit: 1 })

      if (listError) {
        console.error("Storage permission error:", listError)
        setStorageError(`Storage permission error: ${listError.message}`)
        setStorageStatus("error")
        return false
      }

      setStorageStatus("ready")
      return true
    } catch (error) {
      console.error("Storage setup check failed:", error)
      setStorageError("Failed to check storage setup")
      setStorageStatus("error")
      return false
    }
  }

  useEffect(() => {
    fetchRequirements()
    fetchDocuments()
    checkStorageSetup()
  }, [projectId, currentGate])

  const fetchRequirements = async () => {
    try {
      const { data, error } = await supabase
        .from("document_requirements")
        .select("*")
        .eq("gate_number", currentGate)
        .order("document_type")

      if (error) throw error
      setRequirements(data || [])
    } catch (error) {
      console.error("Error fetching requirements:", error)
    }
  }

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })

      if (error) throw error
      setDocuments(data || [])
    } catch (error) {
      console.error("Error fetching documents:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (file: File, requirementId: string) => {
    if (!file) return

    // Check storage status before upload
    if (storageStatus !== "ready") {
      alert("Storage is not ready. Please wait or contact administrator.")
      return
    }

    setUploading(requirementId)
    setUploadProgress(0)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Validate file size (50MB limit)
      if (file.size > 52428800) {
        throw new Error("File size exceeds 50MB limit")
      }

      // Validate file type
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
        "text/plain",
        "text/csv",
      ]

      if (!allowedTypes.includes(file.type)) {
        throw new Error(`File type ${file.type} is not allowed`)
      }

      // Upload file to Supabase Storage
      const fileExt = file.name.split(".").pop()
      const fileName = `${projectId}/${requirementId}/${Date.now()}.${fileExt}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("project-documents")
        .upload(fileName, file, {
          onUploadProgress: (progress) => {
            setUploadProgress((progress.loaded / progress.total) * 100)
          },
        })

      if (uploadError) {
        console.error("Upload error:", uploadError)
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from("project-documents").getPublicUrl(fileName)

      // Generate preview URL for images and PDFs
      let previewUrl = null
      if (file.type.startsWith("image/") || file.type === "application/pdf") {
        previewUrl = urlData.publicUrl
      }

      // Save document record to database
      const { error: dbError } = await supabase.from("documents").insert({
        project_id: projectId,
        requirement_id: requirementId,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_preview_url: previewUrl,
        file_type: file.type,
        file_size: file.size,
        upload_status: "completed",
        uploaded_by: user.id,
      })

      if (dbError) {
        console.error("Database error:", dbError)
        throw new Error(`Database error: ${dbError.message}`)
      }

      await fetchDocuments()
      onDocumentChange?.()
    } catch (error) {
      console.error("Error uploading file:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      alert(`Error uploading file: ${errorMessage}`)
    } finally {
      setUploading(null)
      setUploadProgress(0)
    }
  }

  const getDocumentForRequirement = (requirementId: string) => {
    return documents.find((doc) => doc.requirement_id === requirementId && doc.upload_status === "completed")
  }

  const isRequirementFulfilled = (requirement: DocumentRequirement) => {
    return !!getDocumentForRequirement(requirement.id)
  }

  const canAdvanceGate = () => {
    const requiredDocs = requirements.filter((req) => req.is_required)
    return requiredDocs.every((req) => isRequirementFulfilled(req))
  }

  const renderPreview = (document: ProjectDocument) => {
    if (!document.file_preview_url) {
      return (
        <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
          <div className="text-center">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Preview not available</p>
            <Button variant="outline" className="mt-2" onClick={() => window.open(document.file_url, "_blank")}>
              <Download className="h-4 w-4 mr-2" />
              Download File
            </Button>
          </div>
        </div>
      )
    }

    if (document.file_type.startsWith("image/")) {
      return (
        <div className="max-h-96 overflow-auto">
          <img
            src={document.file_preview_url || "/placeholder.svg"}
            alt={document.file_name}
            className="w-full h-auto rounded-lg"
            crossOrigin="anonymous"
          />
        </div>
      )
    }

    if (document.file_type === "application/pdf") {
      return (
        <iframe src={document.file_preview_url} className="w-full h-96 rounded-lg border" title={document.file_name} />
      )
    }

    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <div className="text-center">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Preview not supported for this file type</p>
          <Button variant="outline" className="mt-2" onClick={() => window.open(document.file_url, "_blank")}>
            <Download className="h-4 w-4 mr-2" />
            Download File
          </Button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900 mx-auto mb-2"></div>
            <p className="text-gray-600">Loading document requirements...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Storage Status Alert */}
      {storageStatus === "error" && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{storageError}</span>
            <Button variant="outline" size="sm" onClick={checkStorageSetup}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {storageStatus === "checking" && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Checking storage setup...</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gate {currentGate} Document Requirements
          </CardTitle>
          <CardDescription>Upload required documents to advance to the next gate</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {requirements.map((requirement) => {
              const document = getDocumentForRequirement(requirement.id)
              const isFulfilled = isRequirementFulfilled(requirement)

              return (
                <div
                  key={requirement.id}
                  className={`border rounded-lg p-4 ${
                    isFulfilled ? "border-green-200 bg-green-50" : "border-gray-200"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{requirement.document_type}</h4>
                        {requirement.is_required && (
                          <Badge variant="destructive" className="text-xs">
                            Required
                          </Badge>
                        )}
                        {isFulfilled && (
                          <Badge variant="default" className="bg-green-600 text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Uploaded
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{requirement.description}</p>
                    </div>
                  </div>

                  {document ? (
                    <div className="flex items-center justify-between mt-3 p-3 bg-white rounded border">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {document.file_type.startsWith("image/") ? (
                            <FileImage className="h-5 w-5 text-blue-600" />
                          ) : (
                            <FileText className="h-5 w-5 text-blue-600" />
                          )}
                          <div>
                            <p className="font-medium text-sm">{document.file_name}</p>
                            <p className="text-xs text-gray-500">
                              {(document.file_size / 1024 / 1024).toFixed(2)} MB •
                              {new Date(document.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                            <DialogHeader>
                              <DialogTitle>{document.file_name}</DialogTitle>
                            </DialogHeader>
                            {renderPreview(document)}
                          </DialogContent>
                        </Dialog>
                        <Button variant="outline" size="sm" onClick={() => window.open(document.file_url, "_blank")}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ) : (
                    canUpload &&
                    storageStatus === "ready" && (
                      <div className="mt-3">
                        <Label htmlFor={`file-${requirement.id}`} className="sr-only">
                          Upload {requirement.document_type}
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id={`file-${requirement.id}`}
                            type="file"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                handleFileUpload(file, requirement.id)
                              }
                            }}
                            disabled={uploading === requirement.id}
                            className="flex-1"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.xls,.xlsx,.csv,.txt"
                          />
                          {uploading === requirement.id && (
                            <div className="flex items-center gap-2 min-w-[120px]">
                              <Progress value={uploadProgress} className="flex-1" />
                              <span className="text-xs text-gray-600">{Math.round(uploadProgress)}%</span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Supported formats: PDF, Word, Excel, Images, Text files (Max: 50MB)
                        </p>
                      </div>
                    )
                  )}
                </div>
              )
            })}
          </div>

          {requirements.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {canAdvanceGate() ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-800">All required documents uploaded</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-orange-600" />
                      <span className="font-medium text-orange-800">
                        {requirements.filter((req) => req.is_required && !isRequirementFulfilled(req)).length} required
                        documents missing
                      </span>
                    </>
                  )}
                </div>
                <Badge variant={canAdvanceGate() ? "default" : "secondary"}>
                  Gate {canAdvanceGate() ? "Ready" : "Blocked"}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
