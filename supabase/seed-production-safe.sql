-- Production-safe seed script that doesn't modify auth.users
-- This assumes users will be created through normal Supabase Auth signup

-- Clear existing data
DELETE FROM public.user_preferences;
DELETE FROM public.notifications;
DELETE FROM public.lessons_learned;
DELETE FROM public.gates;
DELETE FROM public.projects;
DELETE FROM public.users;

-- Create sample users with new UUIDs (these would be created through auth signup in production)
-- You can use these UUIDs when testing user signup through the application
INSERT INTO public.users (id, email, full_name, role, branch, country) VALUES
('11111111-1111-1111-1111-111111111111', 'ahmed.saad@keller.com', 'Ahmed Saad', 'bid_manager', 'Dubai', 'UAE'),
('22222222-2222-2222-2222-222222222222', 'claire.nguyen@keller.com', 'Claire Nguyen', 'project_manager', 'Dubai', 'UAE'),
('33333333-3333-3333-3333-333333333333', 'tom.benson@keller.com', 'Tom Benson', 'branch_manager', 'Riyadh', 'Saudi Arabia'),
('44444444-4444-4444-4444-444444444444', 'sofia.alvarez@keller.com', 'Sofia Alvarez', 'project_manager', 'Cairo', 'Egypt'),
('55555555-5555-5555-5555-555555555555', 'rajiv.patel@keller.com', 'Rajiv Patel', 'bu_director', 'Kuwait', 'Kuwait'),
('66666666-6666-6666-6666-666666666666', 'ellie.miller@keller.com', 'Ellie Miller', 'bid_manager', 'Abu Dhabi', 'UAE');

-- Insert user preferences
INSERT INTO public.user_preferences (user_id, dashboard_layout, notification_settings, timezone) VALUES
('11111111-1111-1111-1111-111111111111', '{"widgets": ["projects", "approvals", "performance"]}', '{"email": true, "browser": true, "sms": false}', 'Asia/Dubai'),
('22222222-2222-2222-2222-222222222222', '{"widgets": ["projects", "timeline", "documents"]}', '{"email": true, "browser": true, "sms": true}', 'Asia/Dubai'),
('33333333-3333-3333-3333-333333333333', '{"widgets": ["overview", "team", "performance"]}', '{"email": true, "browser": true, "sms": false}', 'Asia/Riyadh'),
('44444444-4444-4444-4444-444444444444', '{"widgets": ["projects", "approvals"]}', '{"email": true, "browser": false, "sms": false}', 'Africa/Cairo'),
('55555555-5555-5555-5555-555555555555', '{"widgets": ["overview", "analytics", "compliance"]}', '{"email": true, "browser": true, "sms": true}', 'Asia/Kuwait'),
('66666666-6666-6666-6666-666666666666', '{"widgets": ["projects", "opportunities"]}', '{"email": true, "browser": true, "sms": false}', 'Asia/Dubai');

-- Insert sample projects
INSERT INTO public.projects (id, name, description, revenue, risk_factor, status, current_gate, country, technique, client_name, bid_manager_id, project_manager_id, created_by, next_review_date) VALUES
('650e8400-e29b-41d4-a716-446655440001', 'Dubai Metro Extension', 'Foundation works for metro line extension', 850000000, 6, 'in_progress', 5, 'UAE', 'Diaphragm Walls', 'Dubai Metro Corp', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '2024-01-15'),
('650e8400-e29b-41d4-a716-446655440002', 'Riyadh Foundation Works', 'Large scale foundation project', 4500000000, 8, 'bidding', 3, 'Saudi Arabia', 'Piling', 'NEOM Development', '33333333-3333-3333-3333-333333333333', NULL, '33333333-3333-3333-3333-333333333333', '2024-01-10'),
('650e8400-e29b-41d4-a716-446655440003', 'Cairo Residential Complex', 'Ground improvement for residential development', 320000000, 4, 'near_completion', 6, 'Egypt', 'Ground Improvement', 'Cairo Development Co', '44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', '2024-01-08'),
('650e8400-e29b-41d4-a716-446655440004', 'Kuwait Infrastructure', 'Infrastructure foundation works', 1200000000, 7, 'contract_review', 4, 'Kuwait', 'Secant Piles', 'Kuwait Infrastructure Authority', '55555555-5555-5555-5555-555555555555', NULL, '55555555-5555-5555-5555-555555555555', '2024-01-12'),
('650e8400-e29b-41d4-a716-446655440005', 'Abu Dhabi Commercial', 'Commercial building foundation', 180000000, 3, 'bidding', 2, 'UAE', 'Micropiles', 'Aldar Properties', '66666666-6666-6666-6666-666666666666', NULL, '66666666-6666-6666-6666-666666666666', '2024-01-09');

-- Update gate statuses for sample projects
UPDATE public.gates SET status = 'approved', completed_at = NOW() - INTERVAL '30 days'
WHERE project_id = '650e8400-e29b-41d4-a716-446655440001' AND gate_number <= 4;

UPDATE public.gates SET status = 'in_review', started_at = NOW() - INTERVAL '12 days'
WHERE project_id = '650e8400-e29b-41d4-a716-446655440001' AND gate_number = 5;

UPDATE public.gates SET status = 'approved', completed_at = NOW() - INTERVAL '20 days'
WHERE project_id = '650e8400-e29b-41d4-a716-446655440002' AND gate_number <= 2;

UPDATE public.gates SET status = 'in_review', started_at = NOW() - INTERVAL '5 days'
WHERE project_id = '650e8400-e29b-41d4-a716-446655440002' AND gate_number = 3;

-- Insert sample notifications
INSERT INTO public.notifications (user_id, title, message, type, project_id, gate_id) VALUES
('55555555-5555-5555-5555-555555555555', 'Approval Required', 'Gate 4 approval required for Kuwait Infrastructure project', 'approval_required', '650e8400-e29b-41d4-a716-446655440004', (SELECT id FROM public.gates WHERE project_id = '650e8400-e29b-41d4-a716-446655440004' AND gate_number = 4)),
('33333333-3333-3333-3333-333333333333', 'Deadline Approaching', 'Gate 3 review deadline approaching for Riyadh Foundation Works', 'deadline_approaching', '650e8400-e29b-41d4-a716-446655440002', (SELECT id FROM public.gates WHERE project_id = '650e8400-e29b-41d4-a716-446655440002' AND gate_number = 3));

-- Insert sample lessons learned
INSERT INTO public.lessons_learned (project_id, title, description, category, impact_level, recommendations, submitted_by) VALUES
('650e8400-e29b-41d4-a716-446655440003', 'Ground Conditions Assessment', 'Initial geotechnical survey underestimated soil variability', 'technical', 4, 'Recommend additional soil sampling points for future projects in similar geological conditions', '44444444-4444-4444-4444-444444444444'),
('650e8400-e29b-41d4-a716-446655440001', 'Client Communication Protocol', 'Weekly progress meetings improved client satisfaction significantly', 'operational', 3, 'Implement structured weekly progress meetings as standard practice', '22222222-2222-2222-2222-222222222222');
