-- First, let's fix the project_approvals table structure and relationships
DROP TABLE IF EXISTS public.project_approvals CASCADE;

-- Create project_approvals table with proper structure
CREATE TABLE public.project_approvals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    gate_number INTEGER NOT NULL CHECK (gate_number >= 1 AND gate_number <= 7),
    required_role user_role NOT NULL,
    approved_by UUID REFERENCES public.users(id),
    status approval_status NOT NULL DEFAULT 'pending',
    approved_at TIMESTAMP WITH TIME ZONE,
    comments TEXT,
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, gate_number, required_role)
);

-- Enable RLS
ALTER TABLE public.project_approvals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for project_approvals
CREATE POLICY "Users can view relevant approvals" ON public.project_approvals
    FOR SELECT USING (
        -- Users can see approvals for projects they're involved in
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_id
            AND (
                auth.uid() = p.created_by OR 
                auth.uid() = p.bid_manager_id OR 
                auth.uid() = p.project_manager_id
            )
        )
        OR
        -- Users can see approvals they need to provide
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role = required_role
        )
        OR
        -- Users can see approvals they've already provided
        auth.uid() = approved_by
        OR
        -- Management can see all approvals
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role IN ('bu_director', 'amea_president', 'ceo')
        )
    );

CREATE POLICY "Users can update approvals they're responsible for" ON public.project_approvals
    FOR UPDATE USING (
        -- Users can update approvals for their role
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role = required_role
        )
        OR
        -- Management can update any approval
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role IN ('bu_director', 'amea_president', 'ceo')
        )
    );

CREATE POLICY "System can insert approvals" ON public.project_approvals
    FOR INSERT WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_project_approvals_project_id ON public.project_approvals(project_id);
CREATE INDEX idx_project_approvals_status ON public.project_approvals(status);
CREATE INDEX idx_project_approvals_required_role ON public.project_approvals(required_role);
CREATE INDEX idx_project_approvals_approved_by ON public.project_approvals(approved_by);

-- Create a function to create project approvals based on category and gate
CREATE OR REPLACE FUNCTION create_project_approvals(
    p_project_id UUID,
    p_category plm_category,
    p_gate_number INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete existing approvals for this project and gate
    DELETE FROM public.project_approvals 
    WHERE project_id = p_project_id AND gate_number = p_gate_number;
    
    -- Create approvals based on category and gate
    CASE p_category
        WHEN 'category_1a' THEN
            -- Category 1A: Simple approval workflow
            INSERT INTO public.project_approvals (project_id, gate_number, required_role, due_date)
            VALUES 
                (p_project_id, p_gate_number, 'branch_manager', CURRENT_DATE + INTERVAL '3 days');
                
        WHEN 'category_1b' THEN
            -- Category 1B: Branch manager approval
            INSERT INTO public.project_approvals (project_id, gate_number, required_role, due_date)
            VALUES 
                (p_project_id, p_gate_number, 'branch_manager', CURRENT_DATE + INTERVAL '5 days');
                
        WHEN 'category_1c' THEN
            -- Category 1C: Branch manager + technical director
            INSERT INTO public.project_approvals (project_id, gate_number, required_role, due_date)
            VALUES 
                (p_project_id, p_gate_number, 'branch_manager', CURRENT_DATE + INTERVAL '5 days'),
                (p_project_id, p_gate_number, 'technical_director', CURRENT_DATE + INTERVAL '7 days');
                
        WHEN 'category_2' THEN
            -- Category 2: Multiple approvals required
            INSERT INTO public.project_approvals (project_id, gate_number, required_role, due_date)
            VALUES 
                (p_project_id, p_gate_number, 'branch_manager', CURRENT_DATE + INTERVAL '5 days'),
                (p_project_id, p_gate_number, 'technical_director', CURRENT_DATE + INTERVAL '7 days'),
                (p_project_id, p_gate_number, 'finance_manager', CURRENT_DATE + INTERVAL '7 days'),
                (p_project_id, p_gate_number, 'bu_director', CURRENT_DATE + INTERVAL '10 days');
                
        WHEN 'category_3' THEN
            -- Category 3: Highest level approvals
            INSERT INTO public.project_approvals (project_id, gate_number, required_role, due_date)
            VALUES 
                (p_project_id, p_gate_number, 'branch_manager', CURRENT_DATE + INTERVAL '5 days'),
                (p_project_id, p_gate_number, 'technical_director', CURRENT_DATE + INTERVAL '7 days'),
                (p_project_id, p_gate_number, 'finance_manager', CURRENT_DATE + INTERVAL '7 days'),
                (p_project_id, p_gate_number, 'sales_director', CURRENT_DATE + INTERVAL '7 days'),
                (p_project_id, p_gate_number, 'bu_director', CURRENT_DATE + INTERVAL '10 days'),
                (p_project_id, p_gate_number, 'amea_president', CURRENT_DATE + INTERVAL '14 days');
    END CASE;
END;
$$;
