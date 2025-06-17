-- First, let's check the actual structure of project_approvals table
-- and create a function that works with the correct column names

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
    -- Check if approval_configurations table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'approval_configurations') THEN
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
                -- Using the correct column names based on the existing schema
                INSERT INTO project_approvals (
                    project_id,
                    gate_number,
                    approved_by,
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
    ELSE
        -- If approval_configurations doesn't exist, create basic approvals
        -- based on project category and current gate
        
        -- For Category 1A projects (low risk, low value)
        IF NEW.category = 'category_1a' THEN
            -- Only need branch manager approval
            FOR approver_user IN
                SELECT id FROM users WHERE role = 'branch_manager'
            LOOP
                INSERT INTO project_approvals (
                    project_id,
                    gate_number,
                    approved_by,
                    required_role,
                    status,
                    created_at
                ) VALUES (
                    NEW.id,
                    NEW.current_gate,
                    approver_user.id,
                    'branch_manager',
                    'pending',
                    NOW()
                );
            END LOOP;
            
        -- For Category 1B projects
        ELSIF NEW.category = 'category_1b' THEN
            -- Need branch manager and BU director approval
            FOR approver_user IN
                SELECT id FROM users WHERE role IN ('branch_manager', 'bu_director')
            LOOP
                INSERT INTO project_approvals (
                    project_id,
                    gate_number,
                    approved_by,
                    required_role,
                    status,
                    created_at
                ) VALUES (
                    NEW.id,
                    NEW.current_gate,
                    approver_user.id,
                    approver_user.role,
                    'pending',
                    NOW()
                );
            END LOOP;
            
        -- For Category 1C projects
        ELSIF NEW.category = 'category_1c' THEN
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
                    NEW.id,
                    NEW.current_gate,
                    approver_user.id,
                    approver_user.role,
                    'pending',
                    NOW()
                );
            END LOOP;
            
        -- For Category 2 and 3 projects (high risk/value)
        ELSIF NEW.category IN ('category_2', 'category_3') THEN
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
                    NEW.id,
                    NEW.current_gate,
                    approver_user.id,
                    approver_user.role,
                    'pending',
                    NOW()
                );
            END LOOP;
        END IF;
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the project creation
        RAISE WARNING 'Error creating project approvals: %', SQLERRM;
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
        -- Check if approval_configurations table exists
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'approval_configurations') THEN
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
                        approved_by,
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
        ELSE
            -- Create basic approvals based on category (same logic as above)
            IF NEW.category = 'category_1a' THEN
                FOR approver_user IN
                    SELECT id FROM users WHERE role = 'branch_manager'
                LOOP
                    INSERT INTO project_approvals (
                        project_id,
                        gate_number,
                        approved_by,
                        required_role,
                        status,
                        created_at
                    ) VALUES (
                        NEW.id,
                        NEW.current_gate,
                        approver_user.id,
                        'branch_manager',
                        'pending',
                        NOW()
                    );
                END LOOP;
            ELSIF NEW.category = 'category_1b' THEN
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
                        NEW.id,
                        NEW.current_gate,
                        approver_user.id,
                        approver_user.role,
                        'pending',
                        NOW()
                    );
                END LOOP;
            ELSIF NEW.category = 'category_1c' THEN
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
                        NEW.id,
                        NEW.current_gate,
                        approver_user.id,
                        approver_user.role,
                        'pending',
                        NOW()
                    );
                END LOOP;
            ELSIF NEW.category IN ('category_2', 'category_3') THEN
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
                        NEW.id,
                        NEW.current_gate,
                        approver_user.id,
                        approver_user.role,
                        'pending',
                        NOW()
                    );
                END LOOP;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the gate change
        RAISE WARNING 'Error creating project approvals for gate change: %', SQLERRM;
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
