-- First, let's see what's actually in the database that might be causing this
-- Check for any triggers on the projects table
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'projects';

-- Check for any functions that might be called
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name LIKE '%project%' OR routine_name LIKE '%approval%';

-- Check the actual structure of project_approvals table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'project_approvals'
ORDER BY ordinal_position;

-- Check foreign key constraints
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND (tc.table_name = 'project_approvals' OR ccu.table_name = 'projects');

-- Drop ALL triggers on projects table
DO $$ 
DECLARE 
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'projects'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_record.trigger_name || ' ON projects CASCADE';
    END LOOP;
END $$;

-- Drop ALL functions that might be related
DROP FUNCTION IF EXISTS create_project_gates() CASCADE;
DROP FUNCTION IF EXISTS create_project_approvals() CASCADE;
DROP FUNCTION IF EXISTS create_project_approvals_for_new_project() CASCADE;
DROP FUNCTION IF EXISTS create_project_approvals_safe() CASCADE;
DROP FUNCTION IF EXISTS track_user_activity() CASCADE;
DROP FUNCTION IF EXISTS update_project_category() CASCADE;

-- Temporarily disable RLS on project_approvals to see if that's the issue
ALTER TABLE project_approvals DISABLE ROW LEVEL SECURITY;

-- Check if there are any existing records in project_approvals that might be causing issues
SELECT COUNT(*) as approval_count FROM project_approvals;
SELECT COUNT(*) as project_count FROM projects;

-- Show any orphaned approvals
SELECT pa.id, pa.project_id 
FROM project_approvals pa 
LEFT JOIN projects p ON pa.project_id = p.id 
WHERE p.id IS NULL;
