-- Function to safely delete a project and all its related data
CREATE OR REPLACE FUNCTION delete_project_cascade(project_id_param UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
    gate_ids UUID[];
    deleted_approvals INTEGER := 0;
    deleted_documents INTEGER := 0;
    deleted_notifications INTEGER := 0;
    deleted_lessons INTEGER := 0;
    deleted_activities INTEGER := 0;
    deleted_audit_logs INTEGER := 0;
    deleted_gates INTEGER := 0;
    deleted_projects INTEGER := 0;
BEGIN
    -- Check if project exists
    IF NOT EXISTS (SELECT 1 FROM projects WHERE id = project_id_param) THEN
        RETURN json_build_object('success', false, 'error', 'Project not found');
    END IF;

    -- Get all gate IDs for this project
    SELECT ARRAY(SELECT id FROM gates WHERE project_id = project_id_param) INTO gate_ids;

    -- Delete approvals for all gates of this project
    IF array_length(gate_ids, 1) > 0 THEN
        DELETE FROM approvals WHERE gate_id = ANY(gate_ids);
        GET DIAGNOSTICS deleted_approvals = ROW_COUNT;
    END IF;

    -- Delete documents
    DELETE FROM documents WHERE project_id = project_id_param;
    GET DIAGNOSTICS deleted_documents = ROW_COUNT;

    -- Delete notifications
    DELETE FROM notifications WHERE project_id = project_id_param;
    GET DIAGNOSTICS deleted_notifications = ROW_COUNT;

    -- Delete lessons learned
    DELETE FROM lessons_learned WHERE project_id = project_id_param;
    GET DIAGNOSTICS deleted_lessons = ROW_COUNT;

    -- Delete user activities related to this project
    DELETE FROM user_activities WHERE entity_type = 'project' AND entity_id = project_id_param;
    GET DIAGNOSTICS deleted_activities = ROW_COUNT;

    -- Delete audit logs related to this project
    DELETE FROM audit_logs WHERE entity_type = 'project' AND entity_id = project_id_param;
    GET DIAGNOSTICS deleted_audit_logs = ROW_COUNT;

    -- Delete gates
    DELETE FROM gates WHERE project_id = project_id_param;
    GET DIAGNOSTICS deleted_gates = ROW_COUNT;

    -- Finally delete the project
    DELETE FROM projects WHERE id = project_id_param;
    GET DIAGNOSTICS deleted_projects = ROW_COUNT;

    -- Return success with details
    result := json_build_object(
        'success', true,
        'deleted', json_build_object(
            'approvals', deleted_approvals,
            'documents', deleted_documents,
            'notifications', deleted_notifications,
            'lessons_learned', deleted_lessons,
            'user_activities', deleted_activities,
            'audit_logs', deleted_audit_logs,
            'gates', deleted_gates,
            'projects', deleted_projects
        )
    );

    RETURN result;

EXCEPTION WHEN OTHERS THEN
    -- Return error details
    RETURN json_build_object(
        'success', false, 
        'error', SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_project_cascade(UUID) TO authenticated;
