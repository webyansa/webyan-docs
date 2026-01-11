
-- Fix security issues

-- 1. Drop the overly permissive profiles SELECT policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- 2. Create more restrictive profiles policies
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles 
FOR SELECT USING (auth.uid() = id);

-- Admins and editors can view basic profile info (without email for non-admins)
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (public.is_admin(auth.uid()));

-- 3. Fix feedback INSERT policy to require auth.uid() match
DROP POLICY IF EXISTS "Anyone can insert feedback" ON public.docs_feedback;

-- Allow authenticated users to insert feedback (user_id must match or be null for anonymous)
CREATE POLICY "Authenticated users can insert feedback" ON public.docs_feedback 
FOR INSERT WITH CHECK (
  user_id IS NULL OR auth.uid() = user_id
);

-- Allow anonymous feedback without user_id
CREATE POLICY "Anonymous users can insert feedback" ON public.docs_feedback 
FOR INSERT WITH CHECK (user_id IS NULL);

-- 4. Fix search logs INSERT policy similarly
DROP POLICY IF EXISTS "Anyone can insert search logs" ON public.docs_search_logs;

CREATE POLICY "Anyone can insert search logs" ON public.docs_search_logs 
FOR INSERT WITH CHECK (
  user_id IS NULL OR auth.uid() = user_id
);

-- 5. Fix issue reports INSERT policy
DROP POLICY IF EXISTS "Anyone can insert issue reports" ON public.docs_issue_reports;

CREATE POLICY "Anyone can insert issue reports" ON public.docs_issue_reports 
FOR INSERT WITH CHECK (
  user_id IS NULL OR auth.uid() = user_id
);
