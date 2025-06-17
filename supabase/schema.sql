-- Enable RLS
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create custom types
CREATE TYPE user_role AS ENUM ('bid_manager', 'project_manager', 'branch_manager', 'bu_director', 'amea_president', 'ceo', 'finance_manager', 'technical_director', 'sales_director');
CREATE TYPE project_status AS ENUM ('opportunity', 'bidding', 'contract_review', 'in_progress', 'near_completion', 'completed', 'on_hold', 'cancelled');
CREATE TYPE plm_category AS ENUM ('category_1a', 'category_1b', 'category_1c', 'category_2', 'category_3');
CREATE TYPE gate_status AS ENUM ('pending', 'in_review', 'approved', 'rejected', 'overdue');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'requires_revision');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'bid_manager',
    branch TEXT,
    country TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects table
CREATE TABLE public.projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    revenue BIGINT NOT NULL, -- in USD cents
    risk_factor INTEGER NOT NULL CHECK (risk_factor >= 1 AND risk_factor <= 10),
    category plm_category NOT NULL,
    status project_status NOT NULL DEFAULT 'opportunity',
    current_gate INTEGER NOT NULL DEFAULT 1 CHECK (current_gate >= 1 AND current_gate <= 7),
    country TEXT NOT NULL,
    technique TEXT,
    client_name TEXT,
    bid_manager_id UUID REFERENCES public.users(id),
    project_manager_id UUID REFERENCES public.users(id),
    created_by UUID REFERENCES public.users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    next_review_date DATE,
    contract_start_date DATE,
    contract_end_date DATE
);

-- Gates table
CREATE TABLE public.gates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    gate_number INTEGER NOT NULL CHECK (gate_number >= 1 AND gate_number <= 7),
    status gate_status NOT NULL DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    deadline DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, gate_number)
);

-- Approvals table
CREATE TABLE public.approvals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    gate_id UUID REFERENCES public.gates(id) ON DELETE CASCADE,
    approver_id UUID REFERENCES public.users(id),
    required_role user_role NOT NULL,
    status approval_status NOT NULL DEFAULT 'pending',
    approved_at TIMESTAMP WITH TIME ZONE,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents table
CREATE TABLE public.documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    gate_id UUID REFERENCES public.gates(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT,
    version INTEGER DEFAULT 1,
    document_type TEXT, -- 'BAR', 'CAR', 'Risk Register', etc.
    uploaded_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lessons learned table
CREATE TABLE public.lessons_learned (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT, -- 'technical', 'commercial', 'operational', etc.
    impact_level INTEGER CHECK (impact_level >= 1 AND impact_level <= 5),
    recommendations TEXT,
    submitted_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL, -- 'approval_required', 'deadline_approaching', 'overdue', etc.
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    gate_id UUID REFERENCES public.gates(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- 'project', 'gate', 'approval', etc.
    entity_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User activity tracking table
CREATE TABLE public.user_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL, -- 'login', 'logout', 'project_view', 'approval_action', etc.
    entity_type TEXT, -- 'project', 'gate', 'approval', etc.
    entity_id UUID,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User preferences table
CREATE TABLE public.user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    dashboard_layout JSONB DEFAULT '{}',
    notification_settings JSONB DEFAULT '{"email": true, "browser": true, "sms": false}',
    timezone TEXT DEFAULT 'UTC',
    language TEXT DEFAULT 'en',
    theme TEXT DEFAULT 'light',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- NOW Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons_learned ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own profile and profiles in their branch/region
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Enhanced User Management Policies
CREATE POLICY "Users can view users in same region" ON public.users
    FOR SELECT USING (
        auth.uid() = id OR
        country = (SELECT country FROM public.users WHERE id = auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('bu_director', 'amea_president', 'ceo')
        )
    );

CREATE POLICY "Branch managers can view branch users" ON public.users
    FOR SELECT USING (
        auth.uid() = id OR
        branch = (SELECT branch FROM public.users WHERE id = auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('branch_manager', 'bu_director', 'amea_president', 'ceo')
        )
    );

CREATE POLICY "Directors can manage users" ON public.users
    FOR ALL USING (
        auth.uid() = id OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('bu_director', 'amea_president', 'ceo')
        )
    );

-- Projects access based on role and involvement
CREATE POLICY "Users can view projects they're involved in" ON public.projects
    FOR SELECT USING (
        auth.uid() = created_by OR 
        auth.uid() = bid_manager_id OR 
        auth.uid() = project_manager_id OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('bu_director', 'amea_president', 'ceo', 'branch_manager')
        )
    );

CREATE POLICY "Authorized users can create projects" ON public.projects
    FOR INSERT WITH CHECK (
        auth.uid() = created_by AND
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('bid_manager', 'branch_manager', 'bu_director')
        )
    );

CREATE POLICY "Project stakeholders can update projects" ON public.projects
    FOR UPDATE USING (
        auth.uid() = created_by OR 
        auth.uid() = bid_manager_id OR 
        auth.uid() = project_manager_id OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('bu_director', 'amea_president', 'branch_manager')
        )
    );

-- Gates inherit project access
CREATE POLICY "Users can view gates for accessible projects" ON public.gates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id 
            AND (
                auth.uid() = created_by OR 
                auth.uid() = bid_manager_id OR 
                auth.uid() = project_manager_id OR
                EXISTS (
                    SELECT 1 FROM public.users 
                    WHERE id = auth.uid() 
                    AND role IN ('bu_director', 'amea_president', 'ceo', 'branch_manager')
                )
            )
        )
    );

-- Approvals access for approvers and project stakeholders
CREATE POLICY "Users can view relevant approvals" ON public.approvals
    FOR SELECT USING (
        auth.uid() = approver_id OR
        EXISTS (
            SELECT 1 FROM public.gates g
            JOIN public.projects p ON g.project_id = p.id
            WHERE g.id = gate_id
            AND (
                auth.uid() = p.created_by OR 
                auth.uid() = p.bid_manager_id OR 
                auth.uid() = p.project_manager_id
            )
        )
    );

-- Notifications for the user
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Policies for user activities
CREATE POLICY "Users can view own activities" ON public.user_activities
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert activities" ON public.user_activities
    FOR INSERT WITH CHECK (true);

-- Policies for user preferences
CREATE POLICY "Users can manage own preferences" ON public.user_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_projects_category ON public.projects(category);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_current_gate ON public.projects(current_gate);
CREATE INDEX idx_projects_bid_manager ON public.projects(bid_manager_id);
CREATE INDEX idx_projects_project_manager ON public.projects(project_manager_id);
CREATE INDEX idx_gates_project_id ON public.gates(project_id);
CREATE INDEX idx_gates_status ON public.gates(status);
CREATE INDEX idx_approvals_gate_id ON public.approvals(gate_id);
CREATE INDEX idx_approvals_approver_id ON public.approvals(approver_id);
CREATE INDEX idx_approvals_status ON public.approvals(status);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read_at ON public.notifications(read_at);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_user_activities_user_id ON public.user_activities(user_id);
CREATE INDEX idx_user_activities_created_at ON public.user_activities(created_at);
CREATE INDEX idx_user_preferences_user_id ON public.user_preferences(user_id);

-- Functions for automatic categorization
CREATE OR REPLACE FUNCTION calculate_plm_category(revenue BIGINT, risk_factor INTEGER)
RETURNS plm_category AS $$
DECLARE
    revenue_usd DECIMAL := revenue / 100.0;
BEGIN
    IF revenue_usd < 500000 AND risk_factor <= 3 THEN
        RETURN 'category_1a';
    ELSIF revenue_usd >= 500000 AND revenue_usd < 2000000 AND risk_factor <= 3 THEN
        RETURN 'category_1b';
    ELSIF revenue_usd >= 2000000 AND revenue_usd < 5000000 AND risk_factor <= 5 THEN
        RETURN 'category_1c';
    ELSIF revenue_usd >= 5000000 AND revenue_usd < 30000000 AND risk_factor >= 5 THEN
        RETURN 'category_2';
    ELSIF revenue_usd >= 30000000 AND risk_factor <= 10 THEN
        RETURN 'category_3';
    ELSE
        -- Default to category_2 for edge cases
        RETURN 'category_2';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update project category
CREATE OR REPLACE FUNCTION update_project_category()
RETURNS TRIGGER AS $$
BEGIN
    NEW.category := calculate_plm_category(NEW.revenue, NEW.risk_factor);
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_project_category
    BEFORE INSERT OR UPDATE OF revenue, risk_factor ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION update_project_category();

-- Function to create gates when project is created
CREATE OR REPLACE FUNCTION create_project_gates()
RETURNS TRIGGER AS $$
BEGIN
    -- Create all 7 gates for the new project
    INSERT INTO public.gates (project_id, gate_number, status)
    SELECT NEW.id, generate_series(1, 7), 'pending';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_project_gates
    AFTER INSERT ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION create_project_gates();

-- Function to track user activity
CREATE OR REPLACE FUNCTION track_user_activity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_activities (user_id, activity_type, entity_type, entity_id, metadata, ip_address, user_agent)
    VALUES (
        auth.uid(),
        TG_ARGV[0],
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        jsonb_build_object(
            'action', TG_OP,
            'table', TG_TABLE_NAME,
            'timestamp', NOW()
        ),
        inet_client_addr(),
        current_setting('http.user_agent', true)
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add activity tracking triggers
CREATE TRIGGER trigger_track_project_activity
    AFTER INSERT OR UPDATE OR DELETE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION track_user_activity('project_action');

CREATE TRIGGER trigger_track_approval_activity
    AFTER INSERT OR UPDATE OR DELETE ON public.approvals
    FOR EACH ROW
    EXECUTE FUNCTION track_user_activity('approval_action');
