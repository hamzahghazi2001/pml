-- Let's check the actual schema of the project_approvals table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'project_approvals' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Also check if there are any existing records to understand the structure
SELECT * FROM project_approvals LIMIT 5;

-- Check if approval_configurations table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'approval_configurations'
);
