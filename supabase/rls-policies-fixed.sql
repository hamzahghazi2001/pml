-- Drop existing policies first
DROP POLICY IF EXISTS "Allow all operations on users" ON public.users;
DROP POLICY IF EXISTS "Allow all operations on projects" ON public.projects;
DROP POLICY IF EXISTS "Allow all operations on gates" ON public.gates;
DROP POLICY IF EXISTS "Allow all operations on approvals" ON public.approvals;
DROP POLICY IF EXISTS "Allow all operations on documents" ON public.documents;
DROP POLICY IF EXISTS "Allow all operations on lessons_learned" ON public.lessons_learned;
DROP POLICY IF EXISTS "Allow all operations on notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow all operations on audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow all operations on user_activities" ON public.user_activities;
DROP POLICY IF EXISTS "Allow all operations on user_preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Allow all operations on project_approvals" ON public.project_approvals;

-- Enable RLS on all tables
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
ALTER TABLE public.project_approvals ENABLE ROW LEVEL SECURITY;

-- Users policies - allow authenticated users to read all users, update their own profile
CREATE POLICY "Users can view all users" ON public.users
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Projects policies - allow authenticated users to view all projects, create/update based on role
CREATE POLICY "Users can view all projects" ON public.projects
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create projects" ON public.projects
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update projects they're involved in" ON public.projects
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND (
            created_by = auth.uid() OR
            bid_manager_id = auth.uid() OR
            project_manager_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.users 
                WHERE id = auth.uid() 
                AND role IN ('branch_manager', 'bu_director', 'amea_president', 'ceo')
            )
        )
    );

-- Gates policies - allow all authenticated users to read gates
CREATE POLICY "Users can view all gates" ON public.gates
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "System can manage gates" ON public.gates
    FOR ALL USING (true) WITH CHECK (true);

-- Project approvals policies - allow viewing and managing approvals
CREATE POLICY "Users can view project approvals" ON public.project_approvals
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "System can create project approvals" ON public.project_approvals
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own approvals" ON public.project_approvals
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND (
            approver_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.users 
                WHERE id = auth.uid() 
                AND role IN ('branch_manager', 'bu_director', 'amea_president', 'ceo')
            )
        )
    );

-- Approvals policies (legacy table) - allow all operations for development
CREATE POLICY "Allow all operations on approvals" ON public.approvals
    FOR ALL USING (true) WITH CHECK (true);

-- Documents policies - allow authenticated users to manage documents
CREATE POLICY "Users can view documents" ON public.documents
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create documents" ON public.documents
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own documents" ON public.documents
    FOR UPDATE USING (uploaded_by = auth.uid());

-- Lessons learned policies - allow all operations for development
CREATE POLICY "Allow all operations on lessons_learned" ON public.lessons_learned
    FOR ALL USING (true) WITH CHECK (true);

-- Notifications policies - allow users to view their own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());

-- Audit logs policies - allow viewing for authenticated users, system can insert
CREATE POLICY "Users can view audit logs" ON public.audit_logs
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "System can create audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (true);

-- User activities policies - allow users to view their own activities
CREATE POLICY "Users can view own activities" ON public.user_activities
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create user activities" ON public.user_activities
    FOR INSERT WITH CHECK (true);

-- User preferences policies - allow users to manage their own preferences
CREATE POLICY "Users can manage own preferences" ON public.user_preferences
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Email logs policies (if the table exists)
CREATE POLICY "System can manage email logs" ON public.email_logs
    FOR ALL USING (true) WITH CHECK (true);

-- Email templates policies (if the table exists)
CREATE POLICY "Users can view email templates" ON public.email_templates
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "System can manage email templates" ON public.email_templates
    FOR ALL USING (true) WITH CHECK (true);
