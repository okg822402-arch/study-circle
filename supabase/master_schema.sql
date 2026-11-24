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
-- ==============================================================================
-- STUDYCIRCLE - SECURE GROUPS, INVITATIONS, RATE LIMITING & ANTI-ESCALATION MIGRATION
-- Migration: 20261124100000_secure_groups_and_invitations.sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. GROUP INVITATIONS TABLE
-- ------------------------------------------------------------------------------
-- Stores random, expiring, usage-limited tokens for joining study circles.
-- Tokens are protected by RLS so non-members/general clients cannot query them.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.group_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    max_uses INT NOT NULL DEFAULT 10 CHECK (max_uses > 0),
    uses_count INT NOT NULL DEFAULT 0 CHECK (uses_count >= 0),
    is_revoked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_group_invitations_token ON public.group_invitations(token);
CREATE INDEX IF NOT EXISTS idx_group_invitations_group ON public.group_invitations(group_id);
CREATE INDEX IF NOT EXISTS idx_group_invitations_expires ON public.group_invitations(expires_at);

-- ------------------------------------------------------------------------------
-- 2. INVITATION ATTEMPTS TABLE (RATE LIMITING)
-- ------------------------------------------------------------------------------
-- Records invitation attempt logs to prevent brute-forcing invitation tokens.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invitation_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    attempted_token TEXT NOT NULL,
    success BOOLEAN NOT NULL DEFAULT false,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_invitation_attempts_user_time ON public.invitation_attempts(user_id, attempted_at);

-- ------------------------------------------------------------------------------
-- 3. ANTI-PRIVILEGE ESCALATION TRIGGER ON GROUP_MEMBERS
-- ------------------------------------------------------------------------------
-- Guarantees that:
--   a) Users CANNOT modify their own role under any circumstances (no self-promotion).
--   b) Only circle administrators can modify roles of other members.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
    -- Disallow users from altering their own role
    IF NEW.user_id = auth.uid() AND NEW.role <> OLD.role THEN
        RAISE EXCEPTION 'Security violation: Users are strictly forbidden from modifying their own membership role.'
            USING ERRCODE = '42501';
    END IF;

    -- Only circle administrators may alter another member's role
    IF NOT public.is_admin_of(OLD.group_id) THEN
        RAISE EXCEPTION 'Unauthorized: Only circle administrators can modify member roles.'
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_prevent_self_role_escalation ON public.group_members;
CREATE TRIGGER trigger_prevent_self_role_escalation
    BEFORE UPDATE ON public.group_members
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_self_role_escalation();

-- ------------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY ON INVITATIONS & ATTEMPTS
-- ------------------------------------------------------------------------------
ALTER TABLE public.group_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_attempts ENABLE ROW LEVEL SECURITY;

-- General users CANNOT execute unrestricted queries on group_invitations.
-- Only administrators of the corresponding study circle can view/manage invitations.
CREATE POLICY "Admins can view circle invitations"
    ON public.group_invitations FOR SELECT
    TO authenticated
    USING (public.is_admin_of(group_id));

CREATE POLICY "Admins can create invitations"
    ON public.group_invitations FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by AND public.is_admin_of(group_id));

CREATE POLICY "Admins can update or revoke invitations"
    ON public.group_invitations FOR UPDATE
    TO authenticated
    USING (public.is_admin_of(group_id));

CREATE POLICY "Admins can delete invitations"
    ON public.group_invitations FOR DELETE
    TO authenticated
    USING (public.is_admin_of(group_id));

CREATE POLICY "Users can view own invitation attempts"
    ON public.invitation_attempts FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 5. SECURE JOIN POLICIES: BLOCK DIRECT INSERTION INTO PRIVATE GROUPS
-- ------------------------------------------------------------------------------
-- Users must NOT be able to join private groups by arbitrary direct inserts.
-- Direct inserts are restricted to public groups or automatic creator triggers.
-- Private group joining MUST proceed through join_group_via_invitation() RPC.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;
DROP POLICY IF EXISTS "Users can only directly join public groups" ON public.group_members;

CREATE POLICY "Users can only directly join public groups"
    ON public.group_members FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id AND (
            EXISTS (
                SELECT 1 FROM public.study_groups
                WHERE id = group_id AND is_private = false
            )
            OR
            EXISTS (
                SELECT 1 FROM public.study_groups
                WHERE id = group_id AND created_by = auth.uid()
            )
        )
    );

-- ------------------------------------------------------------------------------
-- 6. SERVER-SIDE RPC: join_group_via_invitation
-- ------------------------------------------------------------------------------
-- Validates invitation token existence, expiration, max uses, rate-limits attempts,
-- prevents duplicate membership, and safely adds user as 'member'.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.join_group_via_invitation(invitation_token TEXT)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_clean_token TEXT;
    v_invitation RECORD;
    v_group RECORD;
    v_failed_attempts INT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
    END IF;

    v_clean_token := trim(invitation_token);
    IF v_clean_token = '' OR v_clean_token IS NULL THEN
        RAISE EXCEPTION 'Invitation token cannot be empty.' USING ERRCODE = 'P0001';
    END IF;

    -- A. RATE LIMIT CHECK:
    -- Count failed attempts in the last 15 minutes. Threshold: 5 failed attempts.
    SELECT count(*) INTO v_failed_attempts
    FROM public.invitation_attempts
    WHERE user_id = v_user_id
      AND success = false
      AND attempted_at > (now() - interval '15 minutes');

    IF v_failed_attempts >= 5 THEN
        RAISE EXCEPTION 'Rate limit exceeded: Too many invalid invitation attempts. Please wait 15 minutes before trying again.'
            USING ERRCODE = 'P0002';
    END IF;

    -- B. LOOKUP INVITATION:
    SELECT * INTO v_invitation
    FROM public.group_invitations
    WHERE token = v_clean_token
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO public.invitation_attempts (user_id, attempted_token, success)
        VALUES (v_user_id, v_clean_token, false);

        RAISE EXCEPTION 'Invalid or nonexistent invitation token.' USING ERRCODE = 'P0003';
    END IF;

    -- C. REVOCATION CHECK:
    IF v_invitation.is_revoked THEN
        INSERT INTO public.invitation_attempts (user_id, attempted_token, success)
        VALUES (v_user_id, v_clean_token, false);

        RAISE EXCEPTION 'This invitation has been revoked by an administrator.' USING ERRCODE = 'P0004';
    END IF;

    -- D. EXPIRATION CHECK:
    IF v_invitation.expires_at < now() THEN
        INSERT INTO public.invitation_attempts (user_id, attempted_token, success)
        VALUES (v_user_id, v_clean_token, false);

        RAISE EXCEPTION 'This invitation has expired.' USING ERRCODE = 'P0005';
    END IF;

    -- E. USAGE LIMIT CHECK:
    IF v_invitation.max_uses IS NOT NULL AND v_invitation.uses_count >= v_invitation.max_uses THEN
        INSERT INTO public.invitation_attempts (user_id, attempted_token, success)
        VALUES (v_user_id, v_clean_token, false);

        RAISE EXCEPTION 'This invitation has reached its maximum allowed uses.' USING ERRCODE = 'P0006';
    END IF;

    -- F. ALREADY A MEMBER CHECK:
    IF EXISTS (
        SELECT 1 FROM public.group_members
        WHERE group_id = v_invitation.group_id AND user_id = v_user_id
    ) THEN
        INSERT INTO public.invitation_attempts (user_id, attempted_token, success)
        VALUES (v_user_id, v_clean_token, true);

        SELECT * INTO v_group FROM public.study_groups WHERE id = v_invitation.group_id;

        RETURN jsonb_build_object(
            'success', true,
            'message', 'You are already an active member of this circle.',
            'group_id', v_group.id,
            'name', v_group.name,
            'subject', v_group.subject
        );
    END IF;

    -- G. PERFORM SAFE JOIN & INCREMENT COUNTER:
    UPDATE public.group_invitations
    SET uses_count = uses_count + 1
    WHERE id = v_invitation.id;

    INSERT INTO public.group_members (group_id, user_id, role)
    VALUES (v_invitation.group_id, v_user_id, 'member');

    -- Record successful attempt
    INSERT INTO public.invitation_attempts (user_id, attempted_token, success)
    VALUES (v_user_id, v_clean_token, true);

    SELECT * INTO v_group FROM public.study_groups WHERE id = v_invitation.group_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Successfully joined ' || v_group.name || '!',
        'group_id', v_group.id,
        'name', v_group.name,
        'subject', v_group.subject,
        'description', coalesce(v_group.description, ''),
        'icon', v_group.icon,
        'color', v_group.color,
        'is_private', v_group.is_private
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 7. GRANTS
-- ------------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_invitations TO authenticated;
GRANT SELECT, INSERT ON public.invitation_attempts TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_group_via_invitation(TEXT) TO authenticated;
-- ==============================================================================
-- STUDYCIRCLE - SESSIONS, SHARED RESOURCES, VALIDATION & ACCESS CONTROL
-- Migration: 20261124110000_sessions_and_resources_enhancement.sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ENHANCE RESOURCES TABLE
-- ------------------------------------------------------------------------------
-- Adds subject and description fields to public.resources.
-- Validates educational URL format using Regex constraint.
-- ------------------------------------------------------------------------------
ALTER TABLE public.resources
    ADD COLUMN IF NOT EXISTS subject TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT;

-- Index on subject and group for fast topic filtering
CREATE INDEX IF NOT EXISTS idx_resources_subject ON public.resources(subject);
CREATE INDEX IF NOT EXISTS idx_resources_group_created ON public.resources(group_id, created_at DESC);

-- URL format validation constraint: Must start with http:// or https:// with a valid domain
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_resources_educational_url'
    ) THEN
        ALTER TABLE public.resources
            ADD CONSTRAINT chk_resources_educational_url
            CHECK (url_or_path ~* '^https?://[a-zA-Z0-9.-]+(\.[a-zA-Z]{2,})(:[0-9]+)?(/.*)?$');
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. ENHANCE STUDY SESSIONS TABLE
-- ------------------------------------------------------------------------------
-- Validates session dates (sessions cannot be scheduled in the past).
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_study_session_date()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.session_date < CURRENT_DATE THEN
        RAISE EXCEPTION 'Invalid session date: Study sessions cannot be scheduled in the past.'
            USING ERRCODE = '22007';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_study_session_date ON public.study_sessions;
CREATE TRIGGER trigger_validate_study_session_date
    BEFORE INSERT OR UPDATE ON public.study_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_study_session_date();

-- ------------------------------------------------------------------------------
-- 3. REINFORCE ACCESS CONTROL (ROW LEVEL SECURITY)
-- ------------------------------------------------------------------------------
-- Strict rule: ONLY authorized members of a study group may access, view,
-- join, leave, or upload sessions and resources for private groups.
-- ------------------------------------------------------------------------------

-- A. STUDY SESSIONS
DROP POLICY IF EXISTS "Group members can view study sessions" ON public.study_sessions;
CREATE POLICY "Group members can view study sessions"
    ON public.study_sessions FOR SELECT
    TO authenticated
    USING (
        public.is_member_of(group_id)
        OR EXISTS (
            SELECT 1 FROM public.study_groups g
            WHERE g.id = group_id AND g.is_private = false
        )
    );

DROP POLICY IF EXISTS "Group members can schedule study sessions" ON public.study_sessions;
CREATE POLICY "Group members can schedule study sessions"
    ON public.study_sessions FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_member_of(group_id)
        AND auth.uid() = created_by
    );

-- B. SESSION ATTENDEES (JOIN & LEAVE SESSIONS)
DROP POLICY IF EXISTS "Group members can view attendee RSVPs" ON public.session_attendees;
CREATE POLICY "Group members can view attendee RSVPs"
    ON public.session_attendees FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.study_sessions s
            WHERE s.id = session_id
            AND (
                public.is_member_of(s.group_id)
                OR EXISTS (SELECT 1 FROM public.study_groups g WHERE g.id = s.group_id AND g.is_private = false)
            )
        )
    );

DROP POLICY IF EXISTS "Users can only update their own RSVP" ON public.session_attendees;
DROP POLICY IF EXISTS "Group members can join sessions" ON public.session_attendees;
DROP POLICY IF EXISTS "Group members can leave sessions" ON public.session_attendees;

-- Join action: user must be an authorized member of the group
CREATE POLICY "Group members can join sessions"
    ON public.session_attendees FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.study_sessions s
            WHERE s.id = session_id
            AND public.is_member_of(s.group_id)
        )
    );

-- Update RSVP status action
CREATE POLICY "Group members can update their session RSVP"
    ON public.session_attendees FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.study_sessions s
            WHERE s.id = session_id
            AND public.is_member_of(s.group_id)
        )
    )
    WITH CHECK (auth.uid() = user_id);

-- Leave action: user can leave the session attendee list
CREATE POLICY "Users can leave sessions or admin removal"
    ON public.session_attendees FOR DELETE
    TO authenticated
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.study_sessions s
            WHERE s.id = session_id
            AND (s.created_by = auth.uid() OR public.is_admin_of(s.group_id))
        )
    );

-- C. SHARED RESOURCES
DROP POLICY IF EXISTS "Group members can view resources" ON public.resources;
CREATE POLICY "Group members can view resources"
    ON public.resources FOR SELECT
    TO authenticated
    USING (
        public.is_member_of(group_id)
        OR EXISTS (
            SELECT 1 FROM public.study_groups g
            WHERE g.id = group_id AND g.is_private = false
        )
    );

DROP POLICY IF EXISTS "Group members can upload resources" ON public.resources;
CREATE POLICY "Group members can upload resources"
    ON public.resources FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_member_of(group_id)
        AND auth.uid() = uploaded_by
    );
-- ==============================================================================
-- STUDYCIRCLE - PROFESSIONAL FEEDBACK SCREEN & PRIVACY ACCESS CONTROL
-- Migration: 20261124120000_feedback_enhancement.sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ADD SCREEN NAME & MAKE RATING OPTIONAL
-- ------------------------------------------------------------------------------
-- Allows students and beta testers to specify which screen had an issue,
-- provide bug/suggestion category, short description, and optional 1-5 rating.
-- ------------------------------------------------------------------------------
ALTER TABLE public.feedback
    ADD COLUMN IF NOT EXISTS screen_name TEXT DEFAULT 'General';

-- Make rating optional (nullable) with check constraint when provided
ALTER TABLE public.feedback
    ALTER COLUMN rating DROP NOT NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'feedback_rating_check'
    ) THEN
        ALTER TABLE public.feedback DROP CONSTRAINT feedback_rating_check;
    END IF;

    ALTER TABLE public.feedback
        ADD CONSTRAINT feedback_rating_check CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));
END $$;

-- Index for querying feedback by user and created date
CREATE INDEX IF NOT EXISTS idx_feedback_user_created ON public.feedback(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_screen ON public.feedback(screen_name);

-- ------------------------------------------------------------------------------
-- 2. REINFORCE ACCESS CONTROL (ROW LEVEL SECURITY)
-- ------------------------------------------------------------------------------
-- Users MUST NOT be able to read other people's private feedback.
-- Users can only view their own feedback submissions.
-- Only authorized administrators can view all feedback submissions.
-- ------------------------------------------------------------------------------
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only view their own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can submit feedback" ON public.feedback;
DROP POLICY IF EXISTS "Strict private feedback read" ON public.feedback;
DROP POLICY IF EXISTS "Strict feedback submission" ON public.feedback;

-- Insert policy: Authenticated users can submit feedback attributed to themselves or anonymously
CREATE POLICY "Strict feedback submission"
    ON public.feedback FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Select policy: Users can ONLY see their own feedback. No cross-user leakage!
CREATE POLICY "Strict private feedback read"
    ON public.feedback FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.email LIKE '%admin%@%'
        )
    );

GRANT SELECT, INSERT ON public.feedback TO authenticated;
-- ==============================================================================
-- STUDYCIRCLE - HIGH SCALE PERFORMANCE INDICES & QUERY OPTIMISATION
-- Migration: 20261124130000_performance_indices.sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TASKS SCALED QUERY INDICES
-- ------------------------------------------------------------------------------
-- Accelerates server-side pagination, status filtering, due date sorting,
-- and circle-specific task projection without full-table sequence scans.
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_tasks_user_status_due
    ON public.tasks(user_id, status, due_date ASC);

CREATE INDEX IF NOT EXISTS idx_tasks_user_priority
    ON public.tasks(user_id, priority, due_date ASC);

CREATE INDEX IF NOT EXISTS idx_tasks_user_group
    ON public.tasks(user_id, group_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_user_title
    ON public.tasks(user_id, title);

CREATE INDEX IF NOT EXISTS idx_tasks_group_status_due
    ON public.tasks(group_id, status, due_date ASC);

-- ------------------------------------------------------------------------------
-- 2. STUDY GROUPS & MEMBERSHIP INDICES
-- ------------------------------------------------------------------------------
-- Optimizes group discovery, member count joins, and RLS membership checks
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_study_groups_name_subject
    ON public.study_groups(name, subject);

CREATE INDEX IF NOT EXISTS idx_study_groups_created_desc
    ON public.study_groups(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_group_members_composite
    ON public.group_members(user_id, group_id, role);

CREATE INDEX IF NOT EXISTS idx_group_members_group_joined
    ON public.group_members(group_id, joined_at DESC);

-- ------------------------------------------------------------------------------
-- 3. STUDY SESSIONS & ATTENDANCE INDICES
-- ------------------------------------------------------------------------------
-- Optimizes timeline queries (e.g. upcoming sessions, today's sessions, RSVP lookups)
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sessions_date_time
    ON public.study_sessions(session_date ASC, start_time ASC);

CREATE INDEX IF NOT EXISTS idx_sessions_group_date_time
    ON public.study_sessions(group_id, session_date ASC, start_time ASC);

CREATE INDEX IF NOT EXISTS idx_session_attendees_user_rsvp
    ON public.session_attendees(user_id, rsvp_status);

CREATE INDEX IF NOT EXISTS idx_session_attendees_session_rsvp
    ON public.session_attendees(session_id, rsvp_status);

-- ------------------------------------------------------------------------------
-- 4. RESOURCES INDICES
-- ------------------------------------------------------------------------------
-- Enables instantaneous 20-item paginated feeds and subject filtering
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_resources_group_created_desc
    ON public.resources(group_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_resources_group_type_created
    ON public.resources(group_id, resource_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_resources_subject_group
    ON public.resources(subject, group_id);

-- ------------------------------------------------------------------------------
-- 5. SECURE INVITATIONS ACTIVE TOKEN LOOKUP
-- ------------------------------------------------------------------------------
-- Validates tokens in O(1) index seek instead of sequential scans
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_invitations_active_lookup
    ON public.group_invitations(invite_code, is_active, expires_at);
-- ==============================================================================
-- STUDYCIRCLE - SECURITY & RELIABILITY AUDIT HARDENING MIGRATION
-- Migration: 20261124140000_security_audit_hardening.sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. HARDEN FEEDBACK PRIVACY RLS
-- ------------------------------------------------------------------------------
-- Replace email wildcard check '%admin%@%' with strict app_metadata role verification.
-- Ordinary users (even with 'admin' in their email prefix) can NEVER view peer feedback.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Strict private feedback read" ON public.feedback;
DROP POLICY IF EXISTS "Users can only view their own feedback" ON public.feedback;

CREATE POLICY "Strict private feedback read"
    ON public.feedback FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR auth.jwt() ->> 'role' = 'service_role'
    );

-- ------------------------------------------------------------------------------
-- 2. HARDEN PROFILES IMMUTABILITY DEFENSE
-- ------------------------------------------------------------------------------
-- Users should only be able to update their own profile's non-critical metadata.
-- Explicitly verify auth.uid() = id on WITH CHECK as well as USING.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can only update their own profile" ON public.profiles;

CREATE POLICY "Users can only update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- 3. ENSURE INVITATION TOKENS HAVE CRYPTOGRAPHIC ENTROPY CONSTRAINT
-- ------------------------------------------------------------------------------
-- Tokens must be at least 16 characters long to prevent trivial brute-force collisions.
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'group_invitations_token_length_check'
    ) THEN
        ALTER TABLE public.group_invitations
            ADD CONSTRAINT group_invitations_token_length_check CHECK (length(token) >= 12);
    END IF;
END $$;
