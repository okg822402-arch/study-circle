-- ==============================================================================
-- StudyCircle: Realistic Initial Seed Data
-- ==============================================================================

-- 1. Insert seed study groups (assuming an admin profile exists, or placeholder UUID)
DO $$
DECLARE
    v_admin_id UUID := '00000000-0000-0000-0000-000000000001'::UUID;
    v_group_math UUID := '11111111-1111-1111-1111-111111111111'::UUID;
    v_group_phys UUID := '22222222-2222-2222-2222-222222222222'::UUID;
    v_group_cs   UUID := '33333333-3333-3333-3333-333333333333'::UUID;
    v_session_id UUID := '44444444-4444-4444-4444-444444444444'::UUID;
BEGIN
    -- Ensure mock profiles exist if auth users not yet populated
    INSERT INTO public.profiles (id, full_name, email, avatar_url, program)
    VALUES
        (v_admin_id, 'Priya Sharma', 'priya.sharma@uni.edu', NULL, 'Year 2 · BSc Mathematics'),
        ('00000000-0000-0000-0000-000000000002'::UUID, 'Arjun Rao', 'arjun.rao@uni.edu', NULL, 'Year 2 · BSc Physics'),
        ('00000000-0000-0000-0000-000000000003'::UUID, 'Kavya Patel', 'kavya.p@uni.edu', NULL, 'Year 2 · BSc Computer Science')
    ON CONFLICT (id) DO NOTHING;

    -- Study Groups
    INSERT INTO public.study_groups (id, created_by, name, subject, description, icon, color, invite_code, is_private)
    VALUES
        (v_group_math, v_admin_id, 'Advanced Mathematics', 'Mathematics', 'A focused group for Year 2 Maths students preparing for the December exams.', '📐', '#1B2B4B', 'MTH-4829', true),
        (v_group_phys, v_admin_id, 'Quantum Physics', 'Physics', 'Weekly problem sets and theoretical paper reviews for Quantum Mechanics.', '⚛️', '#2C4A6E', 'PHY-1092', true),
        (v_group_cs,   v_admin_id, 'Computer Science', 'Computer Science', 'Algorithms, Data Structures in C++, and Database Management Systems collaboration.', '💻', '#3A5A7A', 'CS-9912', true)
    ON CONFLICT (id) DO NOTHING;

    -- Group Members
    INSERT INTO public.group_members (group_id, user_id, role)
    VALUES
        (v_group_math, v_admin_id, 'admin'),
        (v_group_math, '00000000-0000-0000-0000-000000000002'::UUID, 'member'),
        (v_group_math, '00000000-0000-0000-0000-000000000003'::UUID, 'member'),
        (v_group_phys, v_admin_id, 'member'),
        (v_group_phys, '00000000-0000-0000-0000-000000000002'::UUID, 'admin'),
        (v_group_cs,   v_admin_id, 'member'),
        (v_group_cs,   '00000000-0000-0000-0000-000000000003'::UUID, 'admin')
    ON CONFLICT (group_id, user_id) DO NOTHING;

    -- Tasks
    INSERT INTO public.tasks (id, group_id, created_by, assigned_to, title, description, status, priority, progress, due_date)
    VALUES
        (gen_random_uuid(), v_group_phys, v_admin_id, '00000000-0000-0000-0000-000000000002'::UUID, 'Thermodynamics Problem Set', 'Complete questions 1 to 14 from Chapter 4 on entropy.', 'todo', 'high', 0, '2026-11-22'),
        (gen_random_uuid(), v_group_math, v_admin_id, v_admin_id, 'Chapter 5 — Integration Practice', 'Solve substitution and parts questions before session.', 'in_progress', 'medium', 60, '2026-11-24'),
        (gen_random_uuid(), v_group_math, v_admin_id, v_admin_id, 'Read Linear Algebra Chapter 7', 'Eigenvalues and Eigenvectors summary notes.', 'todo', 'medium', 0, '2026-11-26'),
        (gen_random_uuid(), v_group_cs,   v_admin_id, '00000000-0000-0000-0000-000000000003'::UUID, 'Database schema design draft', 'Create ERD for study group relational tables in PostgreSQL.', 'in_progress', 'high', 30, '2026-11-27')
    ON CONFLICT DO NOTHING;

    -- Sessions
    INSERT INTO public.study_sessions (id, group_id, created_by, title, description, session_date, start_time, end_time, duration_minutes, session_type, location_or_link)
    VALUES
        (v_session_id, v_group_math, v_admin_id, 'Advanced Calculus Study Session', 'In-depth problem solving on definite integrals and series convergence.', '2026-11-24', '4:00 PM', '6:00 PM', 120, 'in_person', 'Library Room 204')
    ON CONFLICT (id) DO NOTHING;

    -- Attendees
    INSERT INTO public.session_attendees (session_id, user_id, rsvp_status)
    VALUES
        (v_session_id, v_admin_id, 'going'),
        (v_session_id, '00000000-0000-0000-0000-000000000002'::UUID, 'going'),
        (v_session_id, '00000000-0000-0000-0000-000000000003'::UUID, 'going')
    ON CONFLICT (session_id, user_id) DO UPDATE SET rsvp_status = EXCLUDED.rsvp_status;

    -- Resources
    INSERT INTO public.resources (group_id, uploaded_by, title, resource_type, file_type, file_size, url_or_path)
    VALUES
        (v_group_math, v_admin_id, 'Calculus Cheat Sheet.pdf', 'file', 'pdf', '2.4 MB', 'https://example.com/resources/calculus-cheat-sheet.pdf'),
        (v_group_math, '00000000-0000-0000-0000-000000000002'::UUID, 'Khan Academy — Integration Methods', 'link', NULL, NULL, 'https://www.khanacademy.org/math/calculus-2')
    ON CONFLICT DO NOTHING;
END $$;
