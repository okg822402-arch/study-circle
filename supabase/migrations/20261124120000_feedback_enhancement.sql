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
