-- Disable all triggers that might be causing issues
DROP TRIGGER IF EXISTS create_approvals_on_project_insert ON projects;
DROP TRIGGER IF EXISTS create_approvals_on_gate_change ON projects;
DROP TRIGGER IF EXISTS create_approvals_for_new_project ON projects;
DROP TRIGGER IF EXISTS create_approvals_for_gate_change ON projects;
DROP TRIGGER IF EXISTS project_insert_trigger ON projects;
DROP TRIGGER IF EXISTS project_update_trigger ON projects;

-- Drop any functions related to these triggers
DROP FUNCTION IF EXISTS create_project_approvals_for_new_project();
DROP FUNCTION IF EXISTS create_project_approvals_for_gate_change();
DROP FUNCTION IF EXISTS create_project_approvals_safe(UUID, TEXT, INTEGER);
DROP FUNCTION IF EXISTS handle_project_insert();
DROP FUNCTION IF EXISTS handle_project_update();
