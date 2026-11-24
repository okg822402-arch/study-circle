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
