-- First, let's disable the existing trigger temporarily
DROP TRIGGER IF EXISTS create_approvals_on_project_insert ON projects;
DROP TRIGGER IF EXISTS create_approvals_on_gate_change ON projects;

-- Drop the existing functions
DROP FUNCTION IF EXISTS create_project_approvals_for_new_project();
DROP FUNCTION IF EXISTS create_project_approvals_for_gate_change();

-- Create a safer function that handles project approval creation
CREATE OR REPLACE FUNCTION create_project_approvals_safe(
    p_project_id UUID,
    p_category TEXT,
    p_gate_number INTEGER
)
RETURNS VOID
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    approver_user RECORD;
BEGIN
    -- Verify the project exists first
    IF NOT EXISTS (SELECT 1 FROM projects WHERE id = p_project_id) THEN
        RAISE EXCEPTION 'Project with id % does not exist', p_project_id;
    END IF;

    -- Delete any existing approvals for this project and gate
    DELETE FROM project_approvals 
    WHERE project_id = p_project_id AND gate_number = p_gate_number;

    -- Create approvals based on category
    IF p_category = 'category_1a' THEN
        -- Only need branch manager approval
        FOR approver_user IN
            SELECT id, role FROM users WHERE role = 'branch_manager'
        LOOP
            INSERT INTO project_approvals (
                project_id,
                gate_number,
                approved_by,
                required_role,
                status,
                created_at
            ) VALUES (
                p_project_id,
                p_gate_number,
                approver_user.id,
                'branch_manager',
                'pending',
                NOW()
            );
        END LOOP;
        
    ELSIF p_category = 'category_1b' THEN
        -- Need branch manager and BU director approval
        FOR approver_user IN
            SELECT id, role FROM users WHERE role IN ('branch_manager', 'bu_director')
        LOOP
            INSERT INTO project_approvals (
                project_id,
                gate_number,
                approved_by,
                required_role,
                status,
                created_at
            ) VALUES (
                p_project_id,
                p_gate_number,
                approver_user.id,
                approver_user.role,
                'pending',
                NOW()
            );
        END LOOP;
        
    ELSIF p_category = 'category_1c' THEN
        -- Need branch manager, BU director, and AMEA president approval
        FOR approver_user IN
            SELECT id, role FROM users WHERE role IN ('branch_manager', 'bu_director', 'amea_president')
        LOOP
            INSERT INTO project_approvals (
                project_id,
                gate_number,
                approved_by,
                required_role,
                status,
                created_at
            ) VALUES (
                p_project_id,
                p_gate_number,
                approver_user.id,
                approver_user.role,
                'pending',
                NOW()
            );
        END LOOP;
        
    ELSIF p_category IN ('category_2', 'category_3') THEN
        -- Need all levels of approval including CEO
        FOR approver_user IN
            SELECT id, role FROM users WHERE role IN ('branch_manager', 'bu_director', 'amea_president', 'ceo')
        LOOP
            INSERT INTO project_approvals (
                project_id,
                gate_number,
                approved_by,
                required_role,
                status,
                created_at
            ) VALUES (
                p_project_id,
                p_gate_number,
                approver_user.id,
                approver_user.role,
                'pending',
                NOW()
            );
        END LOOP;
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error creating project approvals for project %: %', p_project_id, SQLERRM;
        -- Don't re-raise the exception to avoid breaking the main transaction
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_project_approvals_safe(UUID, TEXT, INTEGER) TO authenticated;
