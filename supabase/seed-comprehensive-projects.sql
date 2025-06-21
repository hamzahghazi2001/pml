-- Clear existing project-related data
DELETE FROM public.notifications WHERE project_id IS NOT NULL;
DELETE FROM public.lessons_learned;
DELETE FROM public.project_documents;
DELETE FROM public.project_approvals;
DELETE FROM public.gates;
DELETE FROM public.projects;

-- Insert comprehensive project data showcasing all gate levels
INSERT INTO public.projects (id, name, description, revenue, risk_factor, status, current_gate, country, technique, client_name, bid_manager_id, project_manager_id, created_by, next_review_date) VALUES

-- Gate 1: Opportunity Identification
('proj-gate1-001', 'Doha Metro Phase 3', 'Foundation works for new metro line expansion', 2800000000, 7, 'opportunity', 1, 'Qatar', 'Diaphragm Walls', 'Qatar Rail Company', '49bbec05-ac3e-4c2b-922d-ec483af4aa46', NULL, '49bbec05-ac3e-4c2b-922d-ec483af4aa46', '2024-01-20'),
('proj-gate1-002', 'Jeddah Waterfront Development', 'Marine foundation works for waterfront project', 1500000000, 6, 'opportunity', 1, 'Saudi Arabia', 'Marine Piling', 'Jeddah Development Co', '2ba68b7e-dae6-46a9-8805-e8b14626abe0', NULL, '2ba68b7e-dae6-46a9-8805-e8b14626abe0', '2024-01-18'),

-- Gate 2: Bid/No Bid Decision
('proj-gate2-001', 'Alexandria Port Expansion', 'Deep foundation works for port infrastructure', 950000000, 5, 'bid_decision', 2, 'Egypt', 'Large Diameter Piles', 'Alexandria Port Authority', '5368b541-0851-41e4-b5d5-6c108ac0c3e4', '5368b541-0851-41e4-b5d5-6c108ac0c3e4', '5368b541-0851-41e4-b5d5-6c108ac0c3e4', '2024-01-22'),
('proj-gate2-002', 'Dubai South Logistics Hub', 'Ground improvement for logistics facility', 680000000, 4, 'bid_decision', 2, 'UAE', 'Ground Improvement', 'Dubai South Authority', '0395eb43-8deb-48d6-9b56-c4a0425bd23f', NULL, '0395eb43-8deb-48d6-9b56-c4a0425bd23f', '2024-01-25'),

-- Gate 3: Bid Preparation & Submission
('proj-gate3-001', 'Kuwait New City Infrastructure', 'Comprehensive foundation package for new city', 3200000000, 8, 'bidding', 3, 'Kuwait', 'Mixed Techniques', 'Kuwait New City Authority', 'e8f27505-7998-42ae-854e-affa72ce5c1a', NULL, 'e8f27505-7998-42ae-854e-affa72ce5c1a', '2024-01-15'),
('proj-gate3-002', 'Riyadh Green District', 'Sustainable foundation solutions for eco-district', 1800000000, 6, 'bidding', 3, 'Saudi Arabia', 'Sustainable Piling', 'ROSHN Development', '2ba68b7e-dae6-46a9-8805-e8b14626abe0', NULL, '2ba68b7e-dae6-46a9-8805-e8b14626abe0', '2024-01-12'),

-- Gate 4: Contract Award & Negotiation
('proj-gate4-001', 'Abu Dhabi Cultural District', 'Specialized foundation for cultural buildings', 1200000000, 5, 'contract_review', 4, 'UAE', 'Micropiles & Underpinning', 'Abu Dhabi Cultural Foundation', '0395eb43-8deb-48d6-9b56-c4a0425bd23f', '153dbbe5-2fe2-4bd9-96be-a67959f1a709', '0395eb43-8deb-48d6-9b56-c4a0425bd23f', '2024-01-28'),
('proj-gate4-002', 'Cairo New Administrative Capital', 'Government buildings foundation works', 2100000000, 7, 'contract_review', 4, 'Egypt', 'Secant Piles', 'New Administrative Capital Co', '5368b541-0851-41e4-b5d5-6c108ac0c3e4', '5368b541-0851-41e4-b5d5-6c108ac0c3e4', '5368b541-0851-41e4-b5d5-6c108ac0c3e4', '2024-01-30'),

-- Gate 5: Project Execution
('proj-gate5-001', 'Dubai Marina Extension', 'Marine foundation works for marina expansion', 850000000, 6, 'in_progress', 5, 'UAE', 'Marine Foundations', 'Dubai Marina Development', '49bbec05-ac3e-4c2b-922d-ec483af4aa46', '153dbbe5-2fe2-4bd9-96be-a67959f1a709', '49bbec05-ac3e-4c2b-922d-ec483af4aa46', '2024-02-05'),
('proj-gate5-002', 'Manama Financial District', 'High-rise foundation works', 1400000000, 7, 'in_progress', 5, 'Bahrain', 'Deep Foundations', 'Bahrain Financial Harbour', 'e8f27505-7998-42ae-854e-affa72ce5c1a', NULL, 'e8f27505-7998-42ae-854e-affa72ce5c1a', '2024-02-08'),

-- Gate 6: Project Completion & Handover
('proj-gate6-001', 'Sharjah University Campus', 'Educational facility foundation works', 420000000, 3, 'near_completion', 6, 'UAE', 'Conventional Piling', 'University of Sharjah', '0395eb43-8deb-48d6-9b56-c4a0425bd23f', '153dbbe5-2fe2-4bd9-96be-a67959f1a709', '0395eb43-8deb-48d6-9b56-c4a0425bd23f', '2024-02-12'),
('proj-gate6-002', 'Muscat Airport Expansion', 'Airport infrastructure foundation works', 780000000, 4, 'near_completion', 6, 'Oman', 'Ground Improvement', 'Oman Airports Management', '2ba68b7e-dae6-46a9-8805-e8b14626abe0', NULL, '2ba68b7e-dae6-46a9-8805-e8b14626abe0', '2024-02-15'),

-- Gate 7: Lessons Learned & Project Closure
('proj-gate7-001', 'Amman Business District', 'Commercial complex foundation works - COMPLETED', 650000000, 4, 'completed', 7, 'Jordan', 'Mixed Foundations', 'Amman Development Corp', '5368b541-0851-41e4-b5d5-6c108ac0c3e4', '5368b541-0851-41e4-b5d5-6c108ac0c3e4', '5368b541-0851-41e4-b5d5-6c108ac0c3e4', NULL),
('proj-gate7-002', 'Beirut Waterfront Regeneration', 'Coastal foundation works - COMPLETED', 890000000, 5, 'completed', 7, 'Lebanon', 'Marine Piling', 'Beirut Municipality', 'e8f27505-7998-42ae-854e-affa72ce5c1a', NULL, 'e8f27505-7998-42ae-854e-affa72ce5c1a', NULL);

-- Update gate statuses to reflect realistic project progression

-- Gate 1 projects - just started
UPDATE public.gates SET status = 'in_review', started_at = NOW() - INTERVAL '3 days'
WHERE project_id IN ('proj-gate1-001', 'proj-gate1-002') AND gate_number = 1;

-- Gate 2 projects - Gate 1 approved, Gate 2 in review
UPDATE public.gates SET status = 'approved', completed_at = NOW() - INTERVAL '15 days'
WHERE project_id IN ('proj-gate2-001', 'proj-gate2-002') AND gate_number = 1;

UPDATE public.gates SET status = 'in_review', started_at = NOW() - INTERVAL '5 days'
WHERE project_id IN ('proj-gate2-001', 'proj-gate2-002') AND gate_number = 2;

-- Gate 3 projects - Gates 1-2 approved, Gate 3 in review
UPDATE public.gates SET status = 'approved', completed_at = NOW() - INTERVAL '25 days'
WHERE project_id IN ('proj-gate3-001', 'proj-gate3-002') AND gate_number <= 2;

UPDATE public.gates SET status = 'in_review', started_at = NOW() - INTERVAL '8 days'
WHERE project_id IN ('proj-gate3-001', 'proj-gate3-002') AND gate_number = 3;

-- Gate 4 projects - Gates 1-3 approved, Gate 4 in review
UPDATE public.gates SET status = 'approved', completed_at = NOW() - INTERVAL '35 days'
WHERE project_id IN ('proj-gate4-001', 'proj-gate4-002') AND gate_number <= 3;

UPDATE public.gates SET status = 'in_review', started_at = NOW() - INTERVAL '6 days'
WHERE project_id IN ('proj-gate4-001', 'proj-gate4-002') AND gate_number = 4;

-- Gate 5 projects - Gates 1-4 approved, Gate 5 in review
UPDATE public.gates SET status = 'approved', completed_at = NOW() - INTERVAL '45 days'
WHERE project_id IN ('proj-gate5-001', 'proj-gate5-002') AND gate_number <= 4;

UPDATE public.gates SET status = 'in_review', started_at = NOW() - INTERVAL '12 days'
WHERE project_id IN ('proj-gate5-001', 'proj-gate5-002') AND gate_number = 5;

-- Gate 6 projects - Gates 1-5 approved, Gate 6 in review
UPDATE public.gates SET status = 'approved', completed_at = NOW() - INTERVAL '60 days'
WHERE project_id IN ('proj-gate6-001', 'proj-gate6-002') AND gate_number <= 5;

UPDATE public.gates SET status = 'in_review', started_at = NOW() - INTERVAL '4 days'
WHERE project_id IN ('proj-gate6-001', 'proj-gate6-002') AND gate_number = 6;

-- Gate 7 projects - All gates approved, projects completed
UPDATE public.gates SET status = 'approved', completed_at = NOW() - INTERVAL '90 days'
WHERE project_id IN ('proj-gate7-001', 'proj-gate7-002') AND gate_number <= 6;

UPDATE public.gates SET status = 'approved', completed_at = NOW() - INTERVAL '30 days'
WHERE project_id IN ('proj-gate7-001', 'proj-gate7-002') AND gate_number = 7;

-- Insert comprehensive notifications for different scenarios
INSERT INTO public.notifications (user_id, title, message, type, project_id, gate_id, metadata) VALUES

-- Approval required notifications
('e8f27505-7998-42ae-854e-affa72ce5c1a', 'Gate 3 Approval Required', 'Kuwait New City Infrastructure project requires your approval at Gate 3', 'approval_required', 'proj-gate3-001', (SELECT id FROM public.gates WHERE project_id = 'proj-gate3-001' AND gate_number = 3), '{"project_id": "proj-gate3-001", "gate_number": 3, "urgency": "high"}'),

('5368b541-0851-41e4-b5d5-6c108ac0c3e4', 'Gate 4 Approval Required', 'Cairo New Administrative Capital project awaiting Gate 4 approval', 'approval_required', 'proj-gate4-002', (SELECT id FROM public.gates WHERE project_id = 'proj-gate4-002' AND gate_number = 4), '{"project_id": "proj-gate4-002", "gate_number": 4, "urgency": "medium"}'),

-- Deadline approaching notifications
('2ba68b7e-dae6-46a9-8805-e8b14626abe0', 'Gate 2 Deadline Approaching', 'Dubai South Logistics Hub Gate 2 review deadline is in 2 days', 'deadline_approaching', 'proj-gate2-002', (SELECT id FROM public.gates WHERE project_id = 'proj-gate2-002' AND gate_number = 2), '{"project_id": "proj-gate2-002", "gate_number": 2, "days_remaining": 2}'),

('153dbbe5-2fe2-4bd9-96be-a67959f1a709', 'Gate 5 Review Overdue', 'Dubai Marina Extension Gate 5 review is overdue by 3 days', 'overdue', 'proj-gate5-001', (SELECT id FROM public.gates WHERE project_id = 'proj-gate5-001' AND gate_number = 5), '{"project_id": "proj-gate5-001", "gate_number": 5, "days_overdue": 3}'),

-- Document upload notifications
('0395eb43-8deb-48d6-9b56-c4a0425bd23f', 'Documents Required', 'Abu Dhabi Cultural District project requires additional documentation for Gate 4', 'document_required', 'proj-gate4-001', (SELECT id FROM public.gates WHERE project_id = 'proj-gate4-001' AND gate_number = 4), '{"project_id": "proj-gate4-001", "gate_number": 4, "document_type": "risk_assessment"}'),

-- Project milestone notifications
('49bbec05-ac3e-4c2b-922d-ec483af4aa46', 'Project Milestone Achieved', 'Doha Metro Phase 3 has successfully passed initial feasibility review', 'milestone', 'proj-gate1-001', (SELECT id FROM public.gates WHERE project_id = 'proj-gate1-001' AND gate_number = 1), '{"project_id": "proj-gate1-001", "milestone": "feasibility_complete"}'),

('5368b541-0851-41e4-b5d5-6c108ac0c3e4', 'Project Completion Notice', 'Amman Business District project has been successfully completed', 'project_completed', 'proj-gate7-001', (SELECT id FROM public.gates WHERE project_id = 'proj-gate7-001' AND gate_number = 7), '{"project_id": "proj-gate7-001", "completion_date": "2024-01-01"}');

-- Insert comprehensive lessons learned for completed projects
INSERT INTO public.lessons_learned (project_id, title, description, category, impact_level, recommendations, submitted_by, tags) VALUES

-- Technical lessons
('proj-gate7-001', 'Soil Conditions in Amman Region', 'Encountered unexpected limestone layers requiring modified drilling techniques', 'technical', 4, 'Recommend enhanced geotechnical investigation with deeper boreholes for future projects in Amman limestone formations. Consider specialized drilling equipment procurement.', '5368b541-0851-41e4-b5d5-6c108ac0c3e4', '["geology", "drilling", "equipment"]'),

('proj-gate7-002', 'Marine Environment Challenges', 'Tidal variations and wave action significantly impacted marine piling operations', 'technical', 5, 'Implement real-time weather monitoring system and establish clear weather windows for marine operations. Consider seasonal timing for marine foundation works.', 'e8f27505-7998-42ae-854e-affa72ce5c1a', '["marine", "weather", "tidal"]'),

-- Operational lessons
('proj-gate7-001', 'Client Communication Protocol', 'Weekly stakeholder meetings with visual progress reports improved client satisfaction by 40%', 'operational', 3, 'Standardize weekly progress meetings with visual dashboards for all major projects. Implement client portal for real-time project visibility.', '5368b541-0851-41e4-b5d5-6c108ac0c3e4', '["communication", "client-relations", "reporting"]'),

('proj-gate7-002', 'Resource Allocation Optimization', 'Cross-training crew members reduced downtime during equipment maintenance by 25%', 'operational', 4, 'Implement comprehensive cross-training program for all technical staff. Develop skill matrix to optimize crew deployment across projects.', 'e8f27505-7998-42ae-854e-affa72ce5c1a', '["training", "efficiency", "resource-management"]'),

-- Safety lessons
('proj-gate7-001', 'Safety Protocol Enhancement', 'Implementation of digital safety checklists reduced incidents by 60%', 'safety', 5, 'Deploy digital safety management system across all projects. Mandate daily digital safety briefings with photo documentation.', '5368b541-0851-41e4-b5d5-6c108ac0c3e4', '["safety", "digital-tools", "incident-reduction"]'),

-- Commercial lessons
('proj-gate7-002', 'Contract Risk Management', 'Weather delay clauses proved insufficient for marine environment projects', 'commercial', 4, 'Revise standard contract templates to include enhanced weather protection clauses for marine projects. Consider weather insurance options.', 'e8f27505-7998-42ae-854e-affa72ce5c1a', '["contracts", "risk-management", "weather-protection"]'),

-- Innovation lessons
('proj-gate7-001', 'Technology Integration Success', 'BIM integration with real-time monitoring improved accuracy by 30%', 'innovation', 4, 'Expand BIM integration to include IoT sensors for all foundation monitoring. Develop standardized BIM protocols for foundation works.', '5368b541-0851-41e4-b5d5-6c108ac0c3e4', '["BIM", "IoT", "monitoring", "accuracy"]');

-- Insert sample project approvals for demonstration
INSERT INTO public.project_approvals (project_id, gate_number, approver_id, status, comments, approved_at) VALUES

-- Approved gates
('proj-gate2-001', 1, '5368b541-0851-41e4-b5d5-6c108ac0c3e4', 'approved', 'Market opportunity confirmed. Proceed with bid/no-bid analysis.', NOW() - INTERVAL '15 days'),
('proj-gate3-001', 1, 'e8f27505-7998-42ae-854e-affa72ce5c1a', 'approved', 'Strategic fit confirmed. High-value opportunity.', NOW() - INTERVAL '25 days'),
('proj-gate3-001', 2, 'e8f27505-7998-42ae-854e-affa72ce5c1a', 'approved', 'Bid decision approved. Proceed with full bid preparation.', NOW() - INTERVAL '20 days'),

-- Pending approvals
('proj-gate4-001', 4, '0395eb43-8deb-48d6-9b56-c4a0425bd23f', 'pending', 'Under review. Awaiting final risk assessment.', NULL),
('proj-gate5-002', 5, 'e8f27505-7998-42ae-854e-affa72ce5c1a', 'pending', 'Execution phase review in progress.', NULL);

-- Update project statistics
UPDATE public.projects SET 
  updated_at = NOW(),
  metadata = jsonb_build_object(
    'total_gates', 7,
    'completed_gates', CASE 
      WHEN current_gate = 1 THEN 0
      WHEN current_gate = 2 THEN 1
      WHEN current_gate = 3 THEN 2
      WHEN current_gate = 4 THEN 3
      WHEN current_gate = 5 THEN 4
      WHEN current_gate = 6 THEN 5
      WHEN current_gate = 7 THEN 7
      ELSE 0
    END,
    'progress_percentage', CASE 
      WHEN current_gate = 1 THEN 14
      WHEN current_gate = 2 THEN 28
      WHEN current_gate = 3 THEN 42
      WHEN current_gate = 4 THEN 56
      WHEN current_gate = 5 THEN 70
      WHEN current_gate = 6 THEN 84
      WHEN current_gate = 7 THEN 100
      ELSE 0
    END,
    'last_activity', NOW()
  );

-- Add some overdue scenarios for demonstration
UPDATE public.gates SET 
  started_at = NOW() - INTERVAL '20 days',
  due_date = NOW() - INTERVAL '5 days'
WHERE project_id = 'proj-gate3-001' AND gate_number = 3;

UPDATE public.gates SET 
  started_at = NOW() - INTERVAL '15 days',
  due_date = NOW() - INTERVAL '2 days'
WHERE project_id = 'proj-gate5-001' AND gate_number = 5;
