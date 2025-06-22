import { createClient } from "@/lib/supabase"

export async function createTestNotification(userId: string) {
  const supabase = createClient()

  console.log("Creating test notification for user:", userId)

  const testNotification = {
    user_id: userId,
    title: "Test Notification",
    message: "This is a test notification to verify the system is working correctly.",
    type: "test",
    project_id: null, // optional fields can stay null
    gate_id: null,
    read_at: null,
    created_at: new Date().toISOString(),
  }

  const { data, error } = await supabase.from("notifications").insert([testNotification]).select()

  if (error) {
    console.error("Error creating test notification:", error)
    throw error
  }

  console.log("Test notification created:", data)
  return data
}
