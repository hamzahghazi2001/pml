-- Create approval workflows table
CREATE TABLE IF NOT EXISTS approval_workflows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gate_number INTEGER NOT NULL,
  category TEXT NOT NULL,
  required_role TEXT NOT NULL,
  notice_period_days INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create project approvals table
CREATE TABLE IF NOT EXISTS project_approvals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  gate_number INTEGER NOT NULL,
  required_role TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert approval workflow rules based on PLM standard
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
(3, 'category_1c', 'finance_director', 0),
(3, 'category_2', 'amea_president', 3),
(3, 'category_3', 'ceo', 7),

-- Gate 4: Contract approval
(4, 'category_1a', 'branch_manager', 0),
(4, 'category_1a', 'finance_manager', 0),
(4, 'category_1b', 'sales_director', 2),
(4, 'category_1b', 'technical_director', 2),
(4, 'category_1c', 'bu_director', 3),
(4, 'category_1c', 'finance_director', 3),
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

-- Function to create approvals when a project is created
CREATE OR REPLACE FUNCTION create_project_approvals()
RETURNS TRIGGER AS $$
BEGIN
  -- Create approvals for Gate 1 based on project category
  INSERT INTO project_approvals (project_id, gate_number, required_role, due_date)
  SELECT 
    NEW.id,
    aw.gate_number,
    aw.required_role,
    CASE 
      WHEN aw.notice_period_days > 0 THEN NOW() + INTERVAL '1 day' * aw.notice_period_days
      ELSE NULL
    END
  FROM approval_workflows aw
  WHERE aw.gate_number = 1 
    AND aw.category = NEW.category
    AND aw.is_required = true;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create approvals when project is created
DROP TRIGGER IF EXISTS trigger_create_project_approvals ON projects;
CREATE TRIGGER trigger_create_project_approvals
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION create_project_approvals();

-- Function to advance project to next gate when all approvals are complete
CREATE OR REPLACE FUNCTION check_gate_completion()
RETURNS TRIGGER AS $$
DECLARE
  pending_count INTEGER;
  next_gate INTEGER;
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
      
      -- Update project current gate
      UPDATE projects 
      SET current_gate = next_gate,
          updated_at = NOW()
      WHERE id = NEW.project_id;
      
      -- Create approvals for next gate if it exists
      INSERT INTO project_approvals (project_id, gate_number, required_role, due_date)
      SELECT 
        NEW.project_id,
        aw.gate_number,
        aw.required_role,
        CASE 
          WHEN aw.notice_period_days > 0 THEN NOW() + INTERVAL '1 day' * aw.notice_period_days
          ELSE NULL
        END
      FROM approval_workflows aw
      JOIN projects p ON p.id = NEW.project_id
      WHERE aw.gate_number = next_gate 
        AND aw.category = p.category
        AND aw.is_required = true
        AND next_gate <= 7; -- Don't create approvals beyond Gate 7
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check gate completion when approval status changes
DROP TRIGGER IF EXISTS trigger_check_gate_completion ON project_approvals;
CREATE TRIGGER trigger_check_gate_completion
  AFTER UPDATE ON project_approvals
  FOR EACH ROW
  EXECUTE FUNCTION check_gate_completion();

-- Enable RLS
ALTER TABLE approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_approvals ENABLE ROW LEVEL SECURITY;

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
