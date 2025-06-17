-- First, create the enum types if they don't exist
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'bid_manager',
        'branch_manager', 
        'sales_director',
        'technical_director',
        'finance_manager',
        'bu_director',
        'amea_president',
        'ceo',
        'project_manager'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE plm_category AS ENUM (
        'category_1a',
        'category_1b', 
        'category_1c',
        'category_2',
        'category_3'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE approval_status AS ENUM (
        'pending',
        'approved',
        'rejected'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update users table to use the enum if it doesn't already
DO $$ BEGIN
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'bid_manager';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Update projects table to use the enum if it doesn't already  
DO $$ BEGIN
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS category plm_category DEFAULT 'category_1a';
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS current_gate INTEGER DEFAULT 1;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Create approval workflows table
CREATE TABLE IF NOT EXISTS approval_workflows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gate_number INTEGER NOT NULL,
  category plm_category NOT NULL,
  required_role user_role NOT NULL,
  notice_period_days INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create project approvals table
CREATE TABLE IF NOT EXISTS project_approvals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  gate_number INTEGER NOT NULL,
  required_role user_role NOT NULL,
  status approval_status DEFAULT 'pending',
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clear existing workflow data to avoid duplicates
DELETE FROM approval_workflows;

-- Insert approval workflow rules based on PLM standard
-- Using only the roles defined in our enum
INSERT INTO approval_workflows (gate_number, category, required_role, notice_period_days) VALUES
-- Gate 1: Early bid decision
(1, 'category_1a', 'branch_manager', 0),
(1, 'category_1b', 'branch_manager', 0),
(1, 'category_1c', 'branch_manager', 0),
(1, 'category_2', 'branch_manager', 0),
(1, 'category_3', 'bu_director', 0),

-- Gate 2: Bid/no bid decision  
(2, 'category_1a', 'branch_manager', 0),
(2, 'category_1b', 'branch_manager', 0),
(2, 'category_1c', 'branch_manager', 0),
(2, 'category_2', 'bu_director', 1),
(2, 'category_3', 'amea_president', 3),

-- Gate 3: Bid submission
(3, 'category_1a', 'branch_manager', 0),
(3, 'category_1a', 'finance_manager', 0),
(3, 'category_1b', 'sales_director', 0),
(3, 'category_1b', 'technical_director', 0),
(3, 'category_1c', 'bu_director', 0),
(3, 'category_1c', 'finance_manager', 0), -- Changed from finance_director to finance_manager
(3, 'category_2', 'amea_president', 3),
(3, 'category_3', 'ceo', 7),

-- Gate 4: Contract approval
(4, 'category_1a', 'branch_manager', 0),
(4, 'category_1a', 'finance_manager', 0),
(4, 'category_1b', 'sales_director', 2),
(4, 'category_1b', 'technical_director', 2),
(4, 'category_1c', 'bu_director', 3),
(4, 'category_1c', 'finance_manager', 3), -- Changed from finance_director to finance_manager
(4, 'category_2', 'amea_president', 7),
(4, 'category_3', 'ceo', 14),

-- Gate 5: Launch review
(5, 'category_1a', 'branch_manager', 0),
(5, 'category_1b', 'branch_manager', 0),
(5, 'category_1c', 'branch_manager', 0),
(5, 'category_1c', 'bu_director', 0),
(5, 'category_2', 'bu_director', 3),
(5, 'category_3', 'bu_director', 7),

-- Gate 6: Contracted works acceptance
(6, 'category_1a', 'branch_manager', 0),
(6, 'category_1b', 'branch_manager', 0),
(6, 'category_1c', 'branch_manager', 0),
(6, 'category_1c', 'bu_director', 0),
(6, 'category_2', 'bu_director', 0),
(6, 'category_3', 'bu_director', 0),

-- Gate 7: Contract close and learning
(7, 'category_1a', 'branch_manager', 0),
(7, 'category_1b', 'branch_manager', 0),
(7, 'category_1c', 'branch_manager', 0),
(7, 'category_1c', 'bu_director', 0),
(7, 'category_2', 'bu_director', 0),
(7, 'category_3', 'bu_director', 0);

-- Function to determine project category based on revenue and risk factor
CREATE OR REPLACE FUNCTION calculate_project_category(revenue NUMERIC, risk_factor INTEGER)
RETURNS plm_category AS $$
BEGIN
    -- Category 1a: < USD 0.5m, RF ≤ 3
    IF revenue < 50000000 AND risk_factor <= 3 THEN -- revenue in cents
        RETURN 'category_1a';
    -- Category 1b: USD 0.5m-2m, RF ≤ 3  
    ELSIF revenue >= 50000000 AND revenue < 200000000 AND risk_factor <= 3 THEN
        RETURN 'category_1b';
    -- Category 1c: USD 2m-5m, RF ≤ 5
    ELSIF revenue >= 200000000 AND revenue < 500000000 AND risk_factor <= 5 THEN
        RETURN 'category_1c';
    -- Category 2: USD 5m-30m, RF ≥ 5
    ELSIF revenue >= 500000000 AND revenue < 3000000000 AND risk_factor >= 5 THEN
        RETURN 'category_2';
    -- Category 3: ≥ USD 30m, RF ≤ 10
    ELSIF revenue >= 3000000000 AND risk_factor <= 10 THEN
        RETURN 'category_3';
    -- Default to category_1a for edge cases
    ELSE
        RETURN 'category_1a';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to create approvals when a project is created
CREATE OR REPLACE FUNCTION create_project_approvals()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-calculate category if not set
  IF NEW.category IS NULL THEN
    NEW.category := calculate_project_category(NEW.revenue, NEW.risk_factor);
  END IF;

  -- Create approvals for Gate 1 based on project category
  INSERT INTO project_approvals (project_id, gate_number, required_role, due_date)
  SELECT 
    NEW.id,
    aw.gate_number,
    aw.required_role,
    CASE 
      WHEN aw.notice_period_days > 0 THEN NOW() + INTERVAL '1 day' * aw.notice_period_days
      ELSE NOW() + INTERVAL '7 days' -- Default 7 days for approval
    END
  FROM approval_workflows aw
  WHERE aw.gate_number = 1 
    AND aw.category = NEW.category
    AND aw.is_required = true;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_create_project_approvals ON projects;

-- Create trigger to create approvals when project is created
CREATE TRIGGER trigger_create_project_approvals
  BEFORE INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION create_project_approvals();

-- Function to advance project to next gate when all approvals are complete
CREATE OR REPLACE FUNCTION check_gate_completion()
RETURNS TRIGGER AS $$
DECLARE
  pending_count INTEGER;
  next_gate INTEGER;
  project_category plm_category;
BEGIN
  -- Only proceed if this approval was just approved
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    -- Check if there are any pending approvals for this gate
    SELECT COUNT(*) INTO pending_count
    FROM project_approvals
    WHERE project_id = NEW.project_id
      AND gate_number = NEW.gate_number
      AND status = 'pending';
    
    -- If no pending approvals, advance to next gate
    IF pending_count = 0 THEN
      next_gate := NEW.gate_number + 1;
      
      -- Get project category
      SELECT category INTO project_category
      FROM projects 
      WHERE id = NEW.project_id;
      
      -- Update project current gate
      UPDATE projects 
      SET current_gate = next_gate,
          updated_at = NOW()
      WHERE id = NEW.project_id;
      
      -- Create approvals for next gate if it exists
      IF next_gate <= 7 THEN
        INSERT INTO project_approvals (project_id, gate_number, required_role, due_date)
        SELECT 
          NEW.project_id,
          aw.gate_number,
          aw.required_role,
          CASE 
            WHEN aw.notice_period_days > 0 THEN NOW() + INTERVAL '1 day' * aw.notice_period_days
            ELSE NOW() + INTERVAL '7 days'
          END
        FROM approval_workflows aw
        WHERE aw.gate_number = next_gate 
          AND aw.category = project_category
          AND aw.is_required = true;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_check_gate_completion ON project_approvals;

-- Create trigger to check gate completion when approval status changes
CREATE TRIGGER trigger_check_gate_completion
  AFTER UPDATE ON project_approvals
  FOR EACH ROW
  EXECUTE FUNCTION check_gate_completion();

-- Enable RLS
ALTER TABLE approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_approvals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view approval workflows" ON approval_workflows;
DROP POLICY IF EXISTS "Users can view relevant project approvals" ON project_approvals;
DROP POLICY IF EXISTS "Users can update approvals for their role" ON project_approvals;

-- RLS policies for approval_workflows (read-only for all authenticated users)
CREATE POLICY "Users can view approval workflows" ON approval_workflows
  FOR SELECT TO authenticated USING (true);

-- RLS policies for project_approvals
CREATE POLICY "Users can view relevant project approvals" ON project_approvals
  FOR SELECT TO authenticated USING (
    -- Users can see approvals for projects they're involved in
    project_id IN (
      SELECT id FROM projects 
      WHERE bid_manager_id = auth.uid() 
         OR project_manager_id = auth.uid() 
         OR created_by = auth.uid()
    )
    OR
    -- Users can see approvals that require their role
    required_role = (SELECT role FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can update approvals for their role" ON project_approvals
  FOR UPDATE TO authenticated USING (
    required_role = (SELECT role FROM users WHERE id = auth.uid())
    AND status = 'pending'
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_approvals_project_gate ON project_approvals(project_id, gate_number);
CREATE INDEX IF NOT EXISTS idx_project_approvals_role_status ON project_approvals(required_role, status);
CREATE INDEX IF NOT EXISTS idx_project_approvals_due_date ON project_approvals(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_approval_workflows_gate_category ON approval_workflows(gate_number, category);

-- Update existing users to have a default role if they don't have one
UPDATE users SET role = 'bid_manager' WHERE role IS NULL;

-- Update existing projects to have a default category if they don't have one
UPDATE projects 
SET category = calculate_project_category(revenue, risk_factor),
    current_gate = 1
WHERE category IS NULL;

-- Insert some sample users with different roles for testing
INSERT INTO users (id, email, full_name, role) VALUES
  (gen_random_uuid(), 'branch.manager@keller.com', 'John Branch Manager', 'branch_manager'),
  (gen_random_uuid(), 'sales.director@keller.com', 'Jane Sales Director', 'sales_director'),
  (gen_random_uuid(), 'technical.director@keller.com', 'Bob Technical Director', 'technical_director'),
  (gen_random_uuid(), 'finance.manager@keller.com', 'Alice Finance Manager', 'finance_manager'),
  (gen_random_uuid(), 'bu.director@keller.com', 'David BU Director', 'bu_director'),
  (gen_random_uuid(), 'amea.president@keller.com', 'Eve AMEA President', 'amea_president'),
  (gen_random_uuid(), 'ceo@keller.com', 'Frank CEO', 'ceo'),
  (gen_random_uuid(), 'project.manager@keller.com', 'Grace Project Manager', 'project_manager')
ON CONFLICT (email) DO NOTHING;
