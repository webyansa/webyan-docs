-- Fix auth user creation failure caused by invalid default role 'viewer'
-- The trigger on auth.users calls public.handle_new_user(); it must only insert valid public.app_role values.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_text text;
  v_role public.app_role;
BEGIN
  -- Ensure profile exists/updated
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name')
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

  -- Choose a valid role from metadata, defaulting to 'client'
  v_role_text := NEW.raw_user_meta_data ->> 'role';
  v_role := CASE v_role_text
    WHEN 'admin' THEN 'admin'::public.app_role
    WHEN 'editor' THEN 'editor'::public.app_role
    WHEN 'support_agent' THEN 'support_agent'::public.app_role
    WHEN 'client' THEN 'client'::public.app_role
    ELSE 'client'::public.app_role
  END;

  -- Assign role (avoid conflicts if role already exists)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Fix another function that referenced the removed 'viewer' role
CREATE OR REPLACE FUNCTION public.notify_users_on_article_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status != 'published' AND NEW.status = 'published')
     OR (TG_OP = 'INSERT' AND NEW.status = 'published') THEN
    INSERT INTO public.user_notifications (user_id, title, message, type, article_id)
    SELECT 
      ur.user_id,
      'مقال جديد: ' || NEW.title,
      'تم نشر مقال جديد في مركز المساعدة',
      'new_article',
      NEW.id
    FROM public.user_roles ur
    WHERE ur.role = 'client';
  END IF;
  RETURN NEW;
END;
$$;