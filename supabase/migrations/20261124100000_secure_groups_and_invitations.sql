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
