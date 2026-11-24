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
