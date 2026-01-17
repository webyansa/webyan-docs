-- Step 1: Add support_agent role to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'support_agent';