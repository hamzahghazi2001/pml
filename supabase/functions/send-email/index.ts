import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface EmailPayload {
  to: string
  subject: string
  html: string
  type: "approval_request" | "gate_change" | "project_update" | "approval_decision"
  metadata?: Record<string, any>
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    )

    // Get the request body
    const payload: EmailPayload = await req.json()
    const { to, subject, html, type, metadata } = payload

    // Validate the request
    if (!to || !subject || !html || !type) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Send email using Supabase's built-in email service
    const { error } = await supabaseClient.functions.invoke("resend", {
      body: {
        from: "Keller PLM <plm-notifications@yourdomain.com>",
        to,
        subject,
        html,
      },
    })

    if (error) throw error

    // Log the email in the database for audit trail
    await supabaseClient.from("email_logs").insert({
      recipient: to,
      subject,
      type,
      metadata,
      sent_at: new Date().toISOString(),
    })

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
