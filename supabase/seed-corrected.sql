-- First, let's create the auth users (this would normally be done through Supabase Auth)
-- Note: In a real environment, users would sign up through the auth system
-- This is just for development/testing purposes

-- Clear existing data
DELETE FROM public.user_preferences;
DELETE FROM public.notifications;
DELETE FROM public.lessons_learned;
DELETE FROM public.gates;
DELETE FROM public.projects;
DELETE FROM public.users;

-- For development purposes, we'll insert directly into auth.users
-- In production, users would register through Supabase Auth
INSERT INTO auth.users (
    id, 
    instance_id, 
    aud, 
    role, 
    email, 
    encrypted_password, 
    email_confirmed_at, 
    created_at, 
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES 
('49bbec05-ac3e-4c2b-922d-ec483af4aa46', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ahmed.saad01@example.co', '$2a$10$dummy.hash.for.development.only', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', ''),
('153dbbe5-2fe2-4bd9-96be-a67959f1a709', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'claire.nguyen42@example.dev', '$2a$10$dummy.hash.for.development.only', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', ''),
('2ba68b7e-dae6-46a9-8805-e8b14626abe0', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tom.benson55@example.com', '$2a$10$dummy.hash.for.development.only', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', ''),
('5368b541-0851-41e4-b5d5-6c108ac0c3e4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sofia.alvarez77@example.org', '$2a$10$dummy.hash.for.development.only', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', ''),
('a8f27505-7998-42ae-854e-affa72ce5c1a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rajiv.patel83@example.net', '$2a$10$dummy.hash.for.development.only', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', ''),
('0395eb43-8deb-48d6-9b56-c4a0425bd23f', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ellie.miller92@example.com', '$2a$10$dummy.hash.for.development.only', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', '');

-- Now insert into public.users table
INSERT INTO public.users (id, email, full_name, role, branch, country) VALUES
('49bbec05-ac3e-4c2b-922d-ec483af4aa46', 'ahmed.saad01@example.co', 'Ahmed Saad', 'bid_manager', 'Dubai', 'UAE'),
('153dbbe5-2fe2-4bd9-96be-a67959f1a709', 'claire.nguyen42@example.dev', 'Claire Nguyen', 'project_manager', 'Dubai', 'UAE'),
('2ba68b7e-dae6-46a9-8805-e8b14626abe0', 'tom.benson55@example.com', 'Tom Benson', 'branch_manager', 'Riyadh', 'Saudi Arabia'),
('5368b541-0851-41e4-b5d5-6c108ac0c3e4', 'sofia.alvarez77@example.org', 'Sofia Alvarez', 'project_manager', 'Cairo', 'Egypt'),
('a8f27505-7998-42ae-854e-affa72ce5c1a', 'rajiv.patel83@example.net', 'Rajiv Patel', 'bu_director', 'Kuwait', 'Kuwait'),
('0395eb43-8deb-48d6-9b56-c4a0425bd23f', 'ellie.miller92@example.com', 'Ellie Miller', 'bid_manager', 'Abu Dhabi', 'UAE');

-- Insert user preferences for all users
INSERT INTO public.user_preferences (user_id, dashboard_layout, notification_settings, timezone) VALUES
('49bbec05-ac3e-4c2b-922d-ec483af4aa46', '{"widgets": ["projects", "approvals", "performance"]}', '{"email": true, "browser": true, "sms": false}', 'Asia/Dubai'),
('153dbbe5-2fe2-4bd9-96be-a67959f1a709', '{"widgets": ["projects", "timeline", "documents"]}', '{"email": true, "browser": true, "sms": true}', 'Asia/Dubai'),
('2ba68b7e-dae6-46a9-8805-e8b14626abe0', '{"widgets": ["overview", "team", "performance"]}', '{"email": true, "browser": true, "sms": false}', 'Asia/Riyadh'),
('5368b541-0851-41e4-b5d5-6c108ac0c3e4', '{"widgets": ["projects", "approvals"]}', '{"email": true, "browser": false, "sms": false}', 'Africa/Cairo'),
('a8f27505-7998-42ae-854e-affa72ce5c1a', '{"widgets": ["overview", "analytics", "compliance"]}', '{"email": true, "browser": true, "sms": true}', 'Asia/Kuwait'),
('0395eb43-8deb-48d6-9b56-c4a0425bd23f', '{"widgets": ["projects", "opportunities"]}', '{"email": true, "browser": true, "sms": false}', 'Asia/Dubai');

-- Insert sample projects
INSERT INTO public.projects (id, name, description, revenue, risk_factor, status, current_gate, country, technique, client_name, bid_manager_id, project_manager_id, created_by, next_review_date) VALUES
('650e8400-e29b-41d4-a716-446655440001', 'Dubai Metro Extension', 'Foundation works for metro line extension', 850000000, 6, 'in_progress', 5, 'UAE', 'Diaphragm Walls', 'Dubai Metro Corp', '49bbec05-ac3e-4c2b-922d-ec483af4aa46', '153dbbe5-2fe2-4bd9-96be-a67959f1a709', '49bbec05-ac3e-4c2b-922d-ec483af4aa46', '2024-01-15'),
('650e8400-e29b-41d4-a716-446655440002', 'Riyadh Foundation Works', 'Large scale foundation project', 4500000000, 8, 'bidding', 3, 'Saudi Arabia', 'Piling', 'NEOM Development', '2ba68b7e-dae6-46a9-8805-e8b14626abe0', NULL, '2ba68b7e-dae6-46a9-8805-e8b14626abe0', '2024-01-10'),
('650e8400-e29b-41d4-a716-446655440003', 'Cairo Residential Complex', 'Ground improvement for residential development', 320000000, 4, 'near_completion', 6, 'Egypt', 'Ground Improvement', 'Cairo Development Co', '5368b541-0851-41e4-b5d5-6c108ac0c3e4', '5368b541-0851-41e4-b5d5-6c108ac0c3e4', '5368b541-0851-41e4-b5d5-6c108ac0c3e4', '2024-01-08'),
('650e8400-e29b-41d4-a716-446655440004', 'Kuwait Infrastructure', 'Infrastructure foundation works', 1200000000, 7, 'contract_review', 4, 'Kuwait', 'Secant Piles', 'Kuwait Infrastructure Authority', 'a8f27505-7998-42ae-854e-affa72ce5c1a', NULL, 'a8f27505-7998-42ae-854e-affa72ce5c1a', '2024-01-12'),
('650e8400-e29b-41d4-a716-446655440005', 'Abu Dhabi Commercial', 'Commercial building foundation', 180000000, 3, 'bidding', 2, 'UAE', 'Micropiles', 'Aldar Properties', '0395eb43-8deb-48d6-9b56-c4a0425bd23f', NULL, '0395eb43-8deb-48d6-9b56-c4a0425bd23f', '2024-01-09');

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
('a8f27505-7998-42ae-854e-affa72ce5c1a', 'Approval Required', 'Gate 4 approval required for Kuwait Infrastructure project', 'approval_required', '650e8400-e29b-41d4-a716-446655440004', (SELECT id FROM public.gates WHERE project_id = '650e8400-e29b-41d4-a716-446655440004' AND gate_number = 4)),
('2ba68b7e-dae6-46a9-8805-e8b14626abe0', 'Deadline Approaching', 'Gate 3 review deadline approaching for Riyadh Foundation Works', 'deadline_approaching', '650e8400-e29b-41d4-a716-446655440002', (SELECT id FROM public.gates WHERE project_id = '650e8400-e29b-41d4-a716-446655440002' AND gate_number = 3));

-- Insert sample lessons learned
INSERT INTO public.lessons_learned (project_id, title, description, category, impact_level, recommendations, submitted_by) VALUES
('650e8400-e29b-41d4-a716-446655440003', 'Ground Conditions Assessment', 'Initial geotechnical survey underestimated soil variability', 'technical', 4, 'Recommend additional soil sampling points for future projects in similar geological conditions', '5368b541-0851-41e4-b5d5-6c108ac0c3e4'),
('650e8400-e29b-41d4-a716-446655440001', 'Client Communication Protocol', 'Weekly progress meetings improved client satisfaction significantly', 'operational', 3, 'Implement structured weekly progress meetings as standard practice', '153dbbe5-2fe2-4bd9-96be-a67959f1a709');
