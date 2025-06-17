-- RLS Policies for development (simplified)

-- Users policies - allow all operations for development
CREATE POLICY "Allow all operations on users" ON public.users
    FOR ALL USING (true) WITH CHECK (true);

-- Projects policies - allow all operations for development  
CREATE POLICY "Allow all operations on projects" ON public.projects
    FOR ALL USING (true) WITH CHECK (true);

-- Gates policies - allow all operations for development
CREATE POLICY "Allow all operations on gates" ON public.gates
    FOR ALL USING (true) WITH CHECK (true);

-- Approvals policies - allow all operations for development
CREATE POLICY "Allow all operations on approvals" ON public.approvals
    FOR ALL USING (true) WITH CHECK (true);

-- Documents policies - allow all operations for development
CREATE POLICY "Allow all operations on documents" ON public.documents
    FOR ALL USING (true) WITH CHECK (true);

-- Lessons learned policies - allow all operations for development
CREATE POLICY "Allow all operations on lessons_learned" ON public.lessons_learned
    FOR ALL USING (true) WITH CHECK (true);

-- Notifications policies - allow all operations for development
CREATE POLICY "Allow all operations on notifications" ON public.notifications
    FOR ALL USING (true) WITH CHECK (true);

-- Audit logs policies - allow all operations for development
CREATE POLICY "Allow all operations on audit_logs" ON public.audit_logs
    FOR ALL USING (true) WITH CHECK (true);

-- User activities policies - allow all operations for development
CREATE POLICY "Allow all operations on user_activities" ON public.user_activities
    FOR ALL USING (true) WITH CHECK (true);

-- User preferences policies - allow all operations for development
CREATE POLICY "Allow all operations on user_preferences" ON public.user_preferences
    FOR ALL USING (true) WITH CHECK (true);
