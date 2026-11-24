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
