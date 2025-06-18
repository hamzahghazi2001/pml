-- Create document requirements table
CREATE TABLE IF NOT EXISTS public.document_requirements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    gate_number INTEGER NOT NULL CHECK (gate_number >= 1 AND gate_number <= 7),
    document_type TEXT NOT NULL,
    is_required BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert document requirements for each gate
INSERT INTO public.document_requirements (gate_number, document_type, is_required, description) VALUES
-- Gate 1: Early Bid Decision
(1, 'Executive Summary', true, 'High-level project overview and opportunity assessment'),
(1, 'Scope Sketch', true, 'Visual representation or sketch describing the project scope'),
(1, 'Risk Assessment', true, 'Initial risk identification and assessment'),
(1, 'Cost Estimate', true, 'Preliminary cost estimation for the project'),

-- Gate 2: Bid/No Bid Decision  
(2, 'Executive Summary', true, 'Updated executive summary with bid decision rationale'),
(2, 'Risk Assessment & Mitigation', true, 'Detailed risk assessment with mitigation strategies'),
(2, 'Cost Estimate', true, 'Refined cost estimate with breakdown'),
(2, 'Market Analysis', false, 'Optional market and competition analysis'),

-- Gate 3: Bid Submission
(3, 'Offer Letter', true, 'Formal offer letter to client'),
(3, 'BOQ', true, 'Bill of Quantities with detailed breakdown'),
(3, 'Technical Qualifications', true, 'Technical proposal and qualifications'),
(3, 'Commercial Qualifications', true, 'Commercial terms and conditions'),
(3, 'Responsibility Matrix', true, 'RACI matrix defining roles and responsibilities'),
(3, 'Risk Register', true, 'Comprehensive risk register'),

-- Gate 4: Contract Approval
(4, 'Contract Draft', true, 'Negotiated contract document'),
(4, 'Contract Approval Report', true, 'CAR - Contract Approval Report'),
(4, 'Risk Assessment', true, 'Final risk assessment for contract'),
(4, 'Financial Analysis', true, 'Detailed financial analysis and projections'),

-- Gate 5: Launch Review (Project Kick-off)
(5, 'Project Charter', true, 'Signed project charter document'),
(5, 'Resource Plan', true, 'Personnel and equipment mobilization plan'),
(5, 'Schedule', true, 'Detailed project schedule and milestones'),
(5, 'Budget Breakdown', true, 'Zero cost estimate and budget breakdown'),

-- Gate 6: Contracted Works Acceptance
(6, 'Completion Certificate', true, 'Certificate of completion from client'),
(6, 'Quality Reports', true, 'Final quality assurance reports'),
(6, 'Handover Documents', true, 'Project handover documentation'),
(6, 'Client Acceptance', true, 'Signed client acceptance certificate'),

-- Gate 7: Contract Close & Learning
(7, 'Project Closure Report', true, 'Comprehensive project closure documentation'),
(7, 'Lessons Learned', true, 'Documented lessons learned and recommendations'),
(7, 'Financial Closure', true, 'Final financial reconciliation'),
(7, 'Performance Analysis', true, 'Project performance analysis and metrics');

-- Update documents table to link with requirements
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS requirement_id UUID REFERENCES public.document_requirements(id);
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS file_preview_url TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS upload_status TEXT DEFAULT 'pending';

-- Create function to check if gate can be advanced
CREATE OR REPLACE FUNCTION can_advance_gate(project_id_param UUID, current_gate_param INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    missing_docs INTEGER;
BEGIN
    -- Count required documents that are missing for the current gate
    SELECT COUNT(*) INTO missing_docs
    FROM public.document_requirements dr
    LEFT JOIN public.documents d ON (
        d.project_id = project_id_param 
        AND d.requirement_id = dr.id
        AND d.upload_status = 'completed'
    )
    WHERE dr.gate_number = current_gate_param 
    AND dr.is_required = true
    AND d.id IS NULL;
    
    RETURN missing_docs = 0;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on document_requirements
ALTER TABLE public.document_requirements ENABLE ROW LEVEL SECURITY;

-- RLS policy for document requirements (readable by all authenticated users)
CREATE POLICY "Users can view document requirements" ON public.document_requirements
    FOR SELECT USING (auth.role() = 'authenticated');
