import { createClient } from "@/lib/supabase"

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  type: "approval_request" | "gate_change" | "project_update" | "approval_decision"
  metadata?: Record<string, any>
}

export async function sendEmail({ to, subject, html, type, metadata }: SendEmailOptions) {
  const supabase = createClient()

  try {
    const { error } = await supabase.functions.invoke("send-email", {
      body: { to, subject, html, type, metadata },
    })

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Error sending email:", error)
    return { success: false, error }
  }
}

export async function getEmailTemplate(templateName: string) {
  const supabase = createClient()

  try {
    const { data, error } = await supabase.from("email_templates").select("*").eq("name", templateName).single()

    if (error) throw error

    return { success: true, template: data }
  } catch (error) {
    console.error("Error fetching email template:", error)
    return { success: false, error }
  }
}

export function replaceTemplateVariables(template: string, variables: Record<string, string>) {
  let result = template

  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value || "")
  }

  return result
}
