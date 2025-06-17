-- Create email templates table
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  subject VARCHAR(255) NOT NULL,
  html TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create email logs table for audit trail
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  metadata JSONB,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default email templates
INSERT INTO email_templates (name, subject, html, variables) VALUES
(
  'approval_request',
  'Action Required: Project Approval Request for {{project_name}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
    <h2 style="color: #333;">Project Approval Request</h2>
    <p>Hello {{recipient_name}},</p>
    <p>Your approval is required for the following project:</p>
    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
      <p><strong>Project:</strong> {{project_name}}</p>
      <p><strong>Client:</strong> {{client_name}}</p>
      <p><strong>Gate:</strong> {{gate_number}} - {{gate_name}}</p>
      <p><strong>Due Date:</strong> {{due_date}}</p>
      <p><strong>Category:</strong> {{category}}</p>
      <p><strong>Revenue:</strong> ${{revenue}}</p>
      <p><strong>Risk Factor:</strong> {{risk_factor}}/10</p>
    </div>
    <p>Please review and provide your approval by the due date.</p>
    <a href="{{approval_url}}" style="display: inline-block; background-color: #0070f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 15px;">Review Approval Request</a>
    <p style="margin-top: 30px; font-size: 12px; color: #666;">This is an automated message from the Keller PLM System. Please do not reply to this email.</p>
  </div>',
  '["recipient_name", "project_name", "client_name", "gate_number", "gate_name", "due_date", "category", "revenue", "risk_factor", "approval_url"]'
),
(
  'gate_change',
  'Project {{project_name}} Advanced to Gate {{gate_number}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
    <h2 style="color: #333;">Project Gate Advanced</h2>
    <p>Hello {{recipient_name}},</p>
    <p>A project you are involved with has advanced to a new gate:</p>
    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
      <p><strong>Project:</strong> {{project_name}}</p>
      <p><strong>Client:</strong> {{client_name}}</p>
      <p><strong>New Gate:</strong> {{gate_number}} - {{gate_name}}</p>
      <p><strong>Advanced By:</strong> {{advanced_by}}</p>
      <p><strong>Advanced On:</strong> {{advanced_date}}</p>
    </div>
    <p>Please review the project details and ensure all requirements for the new gate are addressed.</p>
    <a href="{{project_url}}" style="display: inline-block; background-color: #0070f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 15px;">View Project</a>
    <p style="margin-top: 30px; font-size: 12px; color: #666;">This is an automated message from the Keller PLM System. Please do not reply to this email.</p>
  </div>',
  '["recipient_name", "project_name", "client_name", "gate_number", "gate_name", "advanced_by", "advanced_date", "project_url"]'
),
(
  'approval_decision',
  'Project Approval {{decision_status}}: {{project_name}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
    <h2 style="color: {{decision_color}};">Project Approval {{decision_status}}</h2>
    <p>Hello {{recipient_name}},</p>
    <p>An approval decision has been made for the following project:</p>
    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
      <p><strong>Project:</strong> {{project_name}}</p>
      <p><strong>Client:</strong> {{client_name}}</p>
      <p><strong>Gate:</strong> {{gate_number}} - {{gate_name}}</p>
      <p><strong>Decision:</strong> <span style="color: {{decision_color}}; font-weight: bold;">{{decision_status}}</span></p>
      <p><strong>Approved/Rejected By:</strong> {{approver_name}}</p>
      <p><strong>Date:</strong> {{decision_date}}</p>
      <p><strong>Comments:</strong> {{comments}}</p>
    </div>
    <a href="{{project_url}}" style="display: inline-block; background-color: #0070f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 15px;">View Project</a>
    <p style="margin-top: 30px; font-size: 12px; color: #666;">This is an automated message from the Keller PLM System. Please do not reply to this email.</p>
  </div>',
  '["recipient_name", "project_name", "client_name", "gate_number", "gate_name", "decision_status", "decision_color", "approver_name", "decision_date", "comments", "project_url"]'
);
