-- Create a function to handle project approval creation with proper permissions
CREATE OR REPLACE FUNCTION create_project_approvals_for_new_project()
RETURNS TRIGGER
SECURITY DEFINER -- This allows the function to bypass RLS
LANGUAGE plpgsql
AS $$
DECLARE
    approval_config RECORD;
    approver_user RECORD;
BEGIN
    -- Get approval configuration for the project's category and gate
    FOR approval_config IN 
        SELECT * FROM approval_configurations 
        WHERE category = NEW.category AND gate_number = NEW.current_gate
        ORDER BY approval_order
    LOOP
        -- Find users with the required role
        FOR approver_user IN
            SELECT id FROM users WHERE role = approval_config.required_role
        LOOP
            -- Insert approval record with SECURITY DEFINER privileges
            INSERT INTO project_approvals (
                project_id,
                gate_number,
                approver_id,
                required_role,
                approval_order,
                status,
                created_at
            ) VALUES (
                NEW.id,
                NEW.current_gate,
                approver_user.id,
                approval_config.required_role,
                approval_config.approval_order,
                'pending',
                NOW()
            );
        END LOOP;
    END LOOP;

    RETURN NEW;
END;
$$;

-- Drop the old trigger if it exists
DROP TRIGGER IF EXISTS create_approvals_on_project_insert ON projects;

-- Create the new trigger
CREATE TRIGGER create_approvals_on_project_insert
    AFTER INSERT ON projects
    FOR EACH ROW
    EXECUTE FUNCTION create_project_approvals_for_new_project();

-- Also create a function for gate changes
CREATE OR REPLACE FUNCTION create_project_approvals_for_gate_change()
RETURNS TRIGGER
SECURITY DEFINER -- This allows the function to bypass RLS
LANGUAGE plpgsql
AS $$
DECLARE
    approval_config RECORD;
    approver_user RECORD;
BEGIN
    -- Only proceed if the gate number has changed
    IF OLD.current_gate != NEW.current_gate THEN
        -- Get approval configuration for the project's category and new gate
        FOR approval_config IN 
            SELECT * FROM approval_configurations 
            WHERE category = NEW.category AND gate_number = NEW.current_gate
            ORDER BY approval_order
        LOOP
            -- Find users with the required role
            FOR approver_user IN
                SELECT id FROM users WHERE role = approval_config.required_role
            LOOP
                -- Insert approval record with SECURITY DEFINER privileges
                INSERT INTO project_approvals (
                    project_id,
                    gate_number,
                    approver_id,
                    required_role,
                    approval_order,
                    status,
                    created_at
                ) VALUES (
                    NEW.id,
                    NEW.current_gate,
                    approver_user.id,
                    approval_config.required_role,
                    approval_config.approval_order,
                    'pending',
                    NOW()
                );
            END LOOP;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$;

-- Drop the old trigger if it exists
DROP TRIGGER IF EXISTS create_approvals_on_gate_change ON projects;

-- Create the new trigger for gate changes
CREATE TRIGGER create_approvals_on_gate_change
    AFTER UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION create_project_approvals_for_gate_change();
