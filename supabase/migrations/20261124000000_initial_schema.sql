-- ==============================================================================
-- StudyCircle: Hardened PostgreSQL Database Schema Migration
-- Designed for Supabase with Row Level Security (RLS), Database Grants & Triggers
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    avatar_url TEXT,
    program TEXT DEFAULT 'Undergraduate Student',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Trigger to provision profile on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, avatar_url, program)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email,
        NEW.raw_user_meta_data->>'avatar_url',
        COALESCE(NEW.raw_user_meta_data->>'program', 'Year 1 · Undergraduate')
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 2. STUDY GROUPS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.study_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT,
    icon TEXT NOT NULL DEFAULT '📐',
    color TEXT NOT NULL DEFAULT '#1B2B4B',
    invite_code TEXT NOT NULL UNIQUE,
    is_private BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 3. GROUP MEMBERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member')) DEFAULT 'member',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_group_member UNIQUE (group_id, user_id)
);

-- Auto-assign creator as admin
CREATE OR REPLACE FUNCTION public.handle_new_group_creator()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.group_members (group_id, user_id, role)
    VALUES (NEW.id, NEW.created_by, 'admin')
    ON CONFLICT (group_id, user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_study_group_created ON public.study_groups;
CREATE TRIGGER on_study_group_created
    AFTER INSERT ON public.study_groups
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_group_creator();

-- ------------------------------------------------------------------------------
-- 4. TASKS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('todo', 'in_progress', 'done')) DEFAULT 'todo',
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    due_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 5. STUDY SESSIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    session_date DATE NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    session_type TEXT NOT NULL CHECK (session_type IN ('in_person', 'online')) DEFAULT 'in_person',
    location_or_link TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 6. SESSION ATTENDEES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.session_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.study_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rsvp_status TEXT NOT NULL CHECK (rsvp_status IN ('going', 'maybe', 'not_going')) DEFAULT 'going',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_session_attendee UNIQUE (session_id, user_id)
);

CREATE OR REPLACE FUNCTION public.handle_new_session_creator()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.session_attendees (session_id, user_id, rsvp_status)
    VALUES (NEW.id, NEW.created_by, 'going')
    ON CONFLICT (session_id, user_id) DO UPDATE SET rsvp_status = 'going';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_study_session_created ON public.study_sessions;
CREATE TRIGGER on_study_session_created
    AFTER INSERT ON public.study_sessions
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_session_creator();

-- ------------------------------------------------------------------------------
-- 7. RESOURCES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('file', 'link')) DEFAULT 'file',
    file_type TEXT,
    file_size TEXT,
    url_or_path TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 8. FEEDBACK TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    category TEXT NOT NULL,
    comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_group_members_user ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_study_groups_invite ON public.study_groups(invite_code);
CREATE INDEX IF NOT EXISTS idx_tasks_group_status ON public.tasks(group_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_study_sessions_group_date ON public.study_sessions(group_id, session_date);
CREATE INDEX IF NOT EXISTS idx_session_attendees_session ON public.session_attendees(session_id);
CREATE INDEX IF NOT EXISTS idx_resources_group ON public.resources(group_id);

-- ==============================================================================
-- DATABASE ROLES & PERMISSIONS (REVOKE UNPRIVILEGED ACCESS)
-- ==============================================================================
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- Anonymous users may only query discoverable public groups
GRANT SELECT ON public.study_groups TO anon;

-- Authenticated users receive standard CRUD privileges governed strictly by RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Helper 1: Membership check
CREATE OR REPLACE FUNCTION public.is_member_of(target_group_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.group_members
        WHERE group_id = target_group_id
        AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper 2: Administrator check
CREATE OR REPLACE FUNCTION public.is_admin_of(target_group_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.group_members
        WHERE group_id = target_group_id
        AND user_id = auth.uid()
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------- PROFILES ----------------
CREATE POLICY "Profiles viewable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can only update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- -------------- STUDY GROUPS --------------
CREATE POLICY "Public or joined groups viewable"
    ON public.study_groups FOR SELECT
    TO authenticated
    USING (is_private = false OR public.is_member_of(id));

CREATE POLICY "Authenticated users can create study groups"
    ON public.study_groups FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Only group admin can update group settings"
    ON public.study_groups FOR UPDATE
    TO authenticated
    USING (public.is_admin_of(id));

CREATE POLICY "Only group creator can delete study group"
    ON public.study_groups FOR DELETE
    TO authenticated
    USING (auth.uid() = created_by);

-- ------------- GROUP MEMBERS --------------
CREATE POLICY "Members can view peers in same group"
    ON public.group_members FOR SELECT
    TO authenticated
    USING (public.is_member_of(group_id));

CREATE POLICY "Users can join groups"
    ON public.group_members FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Self leave or admin removal"
    ON public.group_members FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id OR public.is_admin_of(group_id));

-- ----------------- TASKS ------------------
CREATE POLICY "Group members can view tasks"
    ON public.tasks FOR SELECT
    TO authenticated
    USING (public.is_member_of(group_id));

CREATE POLICY "Group members can insert tasks"
    ON public.tasks FOR INSERT
    TO authenticated
    WITH CHECK (public.is_member_of(group_id) AND auth.uid() = created_by);

CREATE POLICY "Group members can update tasks"
    ON public.tasks FOR UPDATE
    TO authenticated
    USING (public.is_member_of(group_id));

CREATE POLICY "Task creator or group admin can delete tasks"
    ON public.tasks FOR DELETE
    TO authenticated
    USING (auth.uid() = created_by OR public.is_admin_of(group_id));

-- ------------ STUDY SESSIONS -------------
CREATE POLICY "Group members can view study sessions"
    ON public.study_sessions FOR SELECT
    TO authenticated
    USING (public.is_member_of(group_id));

CREATE POLICY "Group members can schedule study sessions"
    ON public.study_sessions FOR INSERT
    TO authenticated
    WITH CHECK (public.is_member_of(group_id) AND auth.uid() = created_by);

CREATE POLICY "Session creator or group admin can update sessions"
    ON public.study_sessions FOR UPDATE
    TO authenticated
    USING (auth.uid() = created_by OR public.is_admin_of(group_id));

CREATE POLICY "Session creator or group admin can delete sessions"
    ON public.study_sessions FOR DELETE
    TO authenticated
    USING (auth.uid() = created_by OR public.is_admin_of(group_id));

-- ----------- SESSION ATTENDEES -----------
CREATE POLICY "Group members can view attendee RSVPs"
    ON public.session_attendees FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.study_sessions s
            WHERE s.id = session_id AND public.is_member_of(s.group_id)
        )
    );

CREATE POLICY "Users can only update their own RSVP"
    ON public.session_attendees FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- --------------- RESOURCES ----------------
CREATE POLICY "Group members can view resources"
    ON public.resources FOR SELECT
    TO authenticated
    USING (public.is_member_of(group_id));

CREATE POLICY "Group members can upload resources"
    ON public.resources FOR INSERT
    TO authenticated
    WITH CHECK (public.is_member_of(group_id) AND auth.uid() = uploaded_by);

CREATE POLICY "Resource uploader or group admin can delete resources"
    ON public.resources FOR DELETE
    TO authenticated
    USING (auth.uid() = uploaded_by OR public.is_admin_of(group_id));

-- ---------------- FEEDBACK ----------------
CREATE POLICY "Users can submit feedback"
    ON public.feedback FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can only view their own feedback"
    ON public.feedback FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
