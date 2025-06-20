"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FileText, Eye, Download, CheckCircle, AlertCircle, AlertTriangle, Edit, Trash2, Plus } from "lucide-react"
import { createClient } from "@/lib/supabase"
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
  updated_at?: string
  uploaded_by: string
  file_preview_url?: string
}

interface DocumentUploadProps {
  projectId: string
  currentGate: number
  canUpload: boolean
  projectCategory: string
  currentUserRole?: string
  onDocumentChange?: () => void
}

interface GoogleDriveLinkFormProps {
  requirementId: string
  documentType: string
  onLinkSubmit: (link: string, fileName: string) => void
  isSubmitting: boolean
  existingDocument?: ProjectDocument
  onCancel?: () => void
}

interface EditDocumentDialogProps {
  document: ProjectDocument
  onSave: (documentId: string, newLink: string, newFileName: string) => void
  onDelete: (documentId: string) => void
  isOpen: boolean
  onClose: () => void
  isSubmitting: boolean
}

function EditDocumentDialog({ document, onSave, onDelete, isOpen, onClose, isSubmitting }: EditDocumentDialogProps) {
  const [link, setLink] = useState(document.file_url)
  const [fileName, setFileName] = useState(document.file_name)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setLink(document.file_url)
      setFileName(document.file_name)
      setShowDeleteConfirm(false)
    }
  }, [isOpen, document])

  const handleSave = () => {
    if (!link.trim() || !fileName.trim()) {
      alert("Please provide both Google Drive link and file name")
      return
    }

    if (!link.includes("drive.google.com") && !link.includes("docs.google.com")) {
      alert("Please provide a valid Google Drive link")
      return
    }

    onSave(document.id, link.trim(), fileName.trim())
  }

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete(document.id)
      setShowDeleteConfirm(false)
    } else {
      setShowDeleteConfirm(true)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Document Link</DialogTitle>
          <DialogDescription>
            Update the Google Drive link and document name. Make sure the link is accessible to all team members.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="edit-fileName" className="text-sm font-medium">
              Document Name *
            </Label>
            <Input
              id="edit-fileName"
              type="text"
              placeholder="Enter document name"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              disabled={isSubmitting}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="edit-link" className="text-sm font-medium">
              Google Drive Link *
            </Label>
            <Input
              id="edit-link"
              type="url"
              placeholder="https://drive.google.com/file/d/..."
              value={link}
              onChange={(e) => setLink(e.target.value)}
              disabled={isSubmitting}
              className="mt-1"
            />
          </div>

          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
            <p>
              <strong>Last updated:</strong> {new Date(document.updated_at || document.created_at).toLocaleString()}
            </p>
            <p>
              <strong>Document ID:</strong> {document.id.slice(0, 8)}...
            </p>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
              className={showDeleteConfirm ? "bg-red-600" : ""}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {showDeleteConfirm ? "Confirm Delete" : "Delete"}
            </Button>
            {showDeleteConfirm && <p className="text-xs text-red-600 mt-1">Click again to confirm deletion</p>}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting || !link.trim() || !fileName.trim()}>
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function GoogleDriveLinkForm({
  requirementId,
  documentType,
  onLinkSubmit,
  isSubmitting,
  existingDocument,
  onCancel,
}: GoogleDriveLinkFormProps) {
  const [link, setLink] = useState(existingDocument?.file_url || "")
  const [fileName, setFileName] = useState(existingDocument?.file_name || "")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!link.trim() || !fileName.trim()) {
      alert("Please provide both Google Drive link and file name")
      return
    }

    // Validate Google Drive link format
    if (!link.includes("drive.google.com") && !link.includes("docs.google.com")) {
      alert("Please provide a valid Google Drive link")
      return
    }

    onLinkSubmit(link.trim(), fileName.trim())
    if (!existingDocument) {
      setLink("")
      setFileName("")
    }
  }

  return (
    <div className="mt-3">
      <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-blue-50">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor={`fileName-${requirementId}`} className="text-sm font-medium">
              Document Name *
            </Label>
            <Input
              id={`fileName-${requirementId}`}
              type="text"
              placeholder={`Enter name for ${documentType}`}
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              disabled={isSubmitting}
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor={`link-${requirementId}`} className="text-sm font-medium">
              Google Drive Link *
            </Label>
            <Input
              id={`link-${requirementId}`}
              type="url"
              placeholder="https://drive.google.com/file/d/..."
              value={link}
              onChange={(e) => setLink(e.target.value)}
              disabled={isSubmitting}
              className="mt-1"
              required
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting || !link.trim() || !fileName.trim()} className="flex-1">
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {existingDocument ? "Updating..." : "Adding Link..."}
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  {existingDocument ? "Update Link" : "Add Google Drive Link"}
                </>
              )}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                Cancel
              </Button>
            )}
          </div>
        </form>
        <p className="text-xs text-blue-600 mt-2 text-center">
          📎 Make sure your Google Drive file is shared with view access
          <br />
          Supported: Any file type hosted on Google Drive
        </p>
      </div>
    </div>
  )
}

const getAuthorizedUploaders = (gateNumber: number, projectCategory: string, currentUserRole: string) => {
  // Define who can upload documents based on PLM requirements
  const uploadMatrix: Record<string, Record<number, string[]>> = {
    category_1a: {
      1: ["bid_manager", "branch_manager"],
      2: ["bid_manager", "branch_manager", "sales_director", "technical_director"],
      3: ["bid_manager", "branch_manager", "sales_director", "technical_director", "finance_manager"],
      4: ["bid_manager", "project_manager", "branch_manager", "finance_manager"],
      5: ["project_manager", "branch_manager", "technical_director"],
      6: ["project_manager", "branch_manager"],
      7: ["project_manager", "branch_manager"],
    },
    category_1b: {
      1: ["bid_manager", "branch_manager"],
      2: ["bid_manager", "branch_manager", "sales_director", "technical_director", "bu_director"],
      3: ["bid_manager", "branch_manager", "sales_director", "technical_director", "bu_director"],
      4: ["bid_manager", "project_manager", "branch_manager", "bu_director"],
      5: ["project_manager", "branch_manager", "bu_director"],
      6: ["project_manager", "branch_manager", "bu_director"],
      7: ["project_manager", "branch_manager"],
    },
    category_1c: {
      1: ["bid_manager", "branch_manager"],
      2: ["bid_manager", "branch_manager", "sales_director", "technical_director", "bu_director"],
      3: ["bid_manager", "branch_manager", "sales_director", "technical_director", "bu_director", "finance_director"],
      4: ["bid_manager", "project_manager", "branch_manager", "bu_director", "finance_director"],
      5: ["project_manager", "branch_manager", "bu_director"],
      6: ["project_manager", "branch_manager", "bu_director"],
      7: ["project_manager", "branch_manager", "bu_director"],
    },
    category_2: {
      1: ["bid_manager", "bu_director"],
      2: ["bid_manager", "bu_director", "amea_president"],
      3: ["bid_manager", "bu_director", "amea_president"],
      4: ["project_manager", "bu_director", "amea_president"],
      5: ["project_manager", "bu_director", "amea_president"],
      6: ["project_manager", "bu_director"],
      7: ["project_manager", "bu_director"],
    },
    category_3: {
      1: ["bid_manager", "bu_director", "amea_president"],
      2: ["bid_manager", "bu_director", "amea_president", "ceo"],
      3: ["bid_manager", "bu_director", "amea_president", "ceo"],
      4: ["project_manager", "bu_director", "amea_president", "ceo"],
      5: ["project_manager", "bu_director", "amea_president"],
      6: ["project_manager", "bu_director"],
      7: ["project_manager", "bu_director"],
    },
  }

  const authorizedRoles = uploadMatrix[projectCategory]?.[gateNumber] || []
  return authorizedRoles.includes(currentUserRole)
}

export function DocumentUpload({
  projectId,
  currentGate,
  canUpload,
  projectCategory,
  currentUserRole,
  onDocumentChange,
}: DocumentUploadProps) {
  const [requirements, setRequirements] = useState<DocumentRequirement[]>([])
  const [documents, setDocuments] = useState<ProjectDocument[]>([])
  const [previousGateDocuments, setPreviousGateDocuments] = useState<ProjectDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const [editingDocument, setEditingDocument] = useState<ProjectDocument | null>(null)
  const [addingToRequirement, setAddingToRequirement] = useState<string | null>(null)
  const [storageStatus, setStorageStatus] = useState<"checking" | "ready" | "error">("checking")
  const [storageError, setStorageError] = useState<string | null>(null)

  const supabase = createClient()

  const checkStorageSetup = async () => {
    try {
      setStorageStatus("checking")
      setStorageError(null)

      // Simple bucket existence check
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()

      if (bucketError) {
        console.error("Storage check error:", bucketError)
        setStorageError(`Storage access error: ${bucketError.message}`)
        setStorageStatus("error")
        return false
      }

      const bucketExists = buckets?.some((bucket) => bucket.id === "project-documents")

      if (!bucketExists) {
        setStorageError("Storage bucket 'project-documents' not found. Please contact administrator.")
        setStorageStatus("error")
        return false
      }

      // If bucket exists, assume it's ready (skip permission test that might fail)
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
    fetchPreviousGateDocuments()
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

  const fetchPreviousGateDocuments = async () => {
    if (currentGate <= 1) return // No previous gates for Gate 1

    try {
      // Get requirements for all previous gates
      const { data: prevRequirements, error: reqError } = await supabase
        .from("document_requirements")
        .select("id")
        .lt("gate_number", currentGate)

      if (reqError) throw reqError

      if (prevRequirements && prevRequirements.length > 0) {
        const requirementIds = prevRequirements.map((req) => req.id)

        // Get documents for previous gate requirements
        const { data: prevDocs, error: docsError } = await supabase
          .from("documents")
          .select(`
            *,
            document_requirements!inner(gate_number, document_type)
          `)
          .eq("project_id", projectId)
          .in("requirement_id", requirementIds)
          .eq("upload_status", "completed")
          .order("created_at", { ascending: false })

        if (docsError) throw docsError
        setPreviousGateDocuments(prevDocs || [])
      }
    } catch (error) {
      console.error("Error fetching previous gate documents:", error)
    }
  }

  const handleGoogleDriveLink = async (link: string, fileName: string, requirementId: string) => {
    setUploading(requirementId)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Save document record to database with Google Drive link
      const { error: dbError } = await supabase.from("documents").insert({
        project_id: projectId,
        requirement_id: requirementId,
        file_name: fileName,
        file_url: link,
        file_preview_url: null, // No preview for external links
        file_type: "application/external-link",
        file_size: 0, // Unknown size for external links
        upload_status: "completed",
        uploaded_by: user.id,
      })

      if (dbError) {
        console.error("Database error:", dbError)
        throw new Error(`Database error: ${dbError.message}`)
      }

      await fetchDocuments()
      setAddingToRequirement(null)
      onDocumentChange?.()
    } catch (error) {
      console.error("Error adding Google Drive link:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      alert(`Error adding link: ${errorMessage}`)
    } finally {
      setUploading(null)
    }
  }

  const handleEditDocument = async (documentId: string, newLink: string, newFileName: string) => {
    setUploading(documentId)

    try {
      const { error: updateError } = await supabase
        .from("documents")
        .update({
          file_name: newFileName,
          file_url: newLink,
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId)

      if (updateError) {
        console.error("Update error:", updateError)
        throw new Error(`Update error: ${updateError.message}`)
      }

      await fetchDocuments()
      setEditingDocument(null)
      onDocumentChange?.()
    } catch (error) {
      console.error("Error updating document:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      alert(`Error updating document: ${errorMessage}`)
    } finally {
      setUploading(null)
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    setUploading(documentId)

    try {
      const { error: deleteError } = await supabase.from("documents").delete().eq("id", documentId)

      if (deleteError) {
        console.error("Delete error:", deleteError)
        throw new Error(`Delete error: ${deleteError.message}`)
      }

      await fetchDocuments()
      setEditingDocument(null)
      onDocumentChange?.()
    } catch (error) {
      console.error("Error deleting document:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      alert(`Error deleting document: ${errorMessage}`)
    } finally {
      setUploading(null)
    }
  }

  const getDocumentsForRequirement = (requirementId: string) => {
    return documents.filter((doc) => doc.requirement_id === requirementId && doc.upload_status === "completed")
  }

  const isRequirementFulfilled = (requirement: DocumentRequirement) => {
    const docs = getDocumentsForRequirement(requirement.id)
    return requirement.is_required ? docs.length > 0 : true
  }

  const canAdvanceGate = () => {
    const requiredDocs = requirements.filter((req) => req.is_required)
    return requiredDocs.every((req) => isRequirementFulfilled(req))
  }

  const canUserUploadForGate = () => {
    if (!currentUserRole) return false
    return getAuthorizedUploaders(currentGate, projectCategory, currentUserRole)
  }

  const finalCanUpload = canUpload && canUserUploadForGate()

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
            <span>File upload disabled - Using Google Drive links instead</span>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gate {currentGate} Document Requirements
          </CardTitle>
          <CardDescription>
            Manage Google Drive links for required documents to advance to the next gate
          </CardDescription>
          {!canUserUploadForGate() && currentUserRole && (
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">Document Upload Restricted</span>
              </div>
              <p className="text-sm text-orange-700 mt-1">
                Your role ({currentUserRole.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}) is not
                authorized to upload documents for Gate {currentGate} in {projectCategory.toUpperCase()} projects.
              </p>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {requirements.map((requirement) => {
              const requirementDocuments = getDocumentsForRequirement(requirement.id)
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
                            {requirementDocuments.length} Document{requirementDocuments.length !== 1 ? "s" : ""} Added
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{requirement.description}</p>
                    </div>
                  </div>

                  {/* Existing Documents */}
                  {requirementDocuments.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {requirementDocuments.map((document) => (
                        <div
                          key={document.id}
                          className="flex items-center justify-between p-3 bg-white rounded border"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-blue-600" />
                            <div>
                              <p className="font-medium text-sm">{document.file_name}</p>
                              <p className="text-xs text-gray-500">
                                Google Drive Link • Added {new Date(document.created_at).toLocaleDateString()}
                                {document.updated_at && document.updated_at !== document.created_at && (
                                  <> • Updated {new Date(document.updated_at).toLocaleDateString()}</>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(document.file_url, "_blank")}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Open
                            </Button>
                            {finalCanUpload && (
                              <Button variant="outline" size="sm" onClick={() => setEditingDocument(document)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add New Document */}
                  {finalCanUpload && (
                    <div className="mt-3">
                      {addingToRequirement === requirement.id ? (
                        <GoogleDriveLinkForm
                          requirementId={requirement.id}
                          documentType={requirement.document_type}
                          onLinkSubmit={(link, fileName) => handleGoogleDriveLink(link, fileName, requirement.id)}
                          isSubmitting={uploading === requirement.id}
                          onCancel={() => setAddingToRequirement(null)}
                        />
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAddingToRequirement(requirement.id)}
                          className="w-full border-dashed"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add {requirementDocuments.length > 0 ? "Another" : ""} Google Drive Link
                        </Button>
                      )}
                    </div>
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
                      <span className="font-medium text-green-800">All required documents linked</span>
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

      {/* Previous Gate Documents */}
      {previousGateDocuments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-600" />
              Previous Gate Documents
            </CardTitle>
            <CardDescription>Documents submitted in previous gates (reference only)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {previousGateDocuments.map((document) => (
                <div key={document.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-sm">{document.file_name}</p>
                      <p className="text-xs text-gray-500">
                        Gate {(document as any).document_requirements?.gate_number} •{" "}
                        {(document as any).document_requirements?.document_type} •{" "}
                        {new Date(document.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => window.open(document.file_url, "_blank")}>
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Document Dialog */}
      {editingDocument && (
        <EditDocumentDialog
          document={editingDocument}
          onSave={handleEditDocument}
          onDelete={handleDeleteDocument}
          isOpen={!!editingDocument}
          onClose={() => setEditingDocument(null)}
          isSubmitting={uploading === editingDocument.id}
        />
      )}
    </div>
  )
}
