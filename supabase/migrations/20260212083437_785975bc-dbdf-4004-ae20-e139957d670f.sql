
-- Create admin_notifications table
CREATE TABLE public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- RLS: admin and editor can read
CREATE POLICY "Admins and editors can read notifications"
ON public.admin_notifications
FOR SELECT
TO authenticated
USING (public.is_admin_or_editor(auth.uid()));

-- RLS: admin and editor can insert
CREATE POLICY "Admins and editors can insert notifications"
ON public.admin_notifications
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_editor(auth.uid()));

-- RLS: admin and editor can update (mark as read)
CREATE POLICY "Admins and editors can update notifications"
ON public.admin_notifications
FOR UPDATE
TO authenticated
USING (public.is_admin_or_editor(auth.uid()));

-- RLS: admin and editor can delete
CREATE POLICY "Admins and editors can delete notifications"
ON public.admin_notifications
FOR DELETE
TO authenticated
USING (public.is_admin_or_editor(auth.uid()));

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;

-- Index for performance
CREATE INDEX idx_admin_notifications_is_read ON public.admin_notifications (is_read, created_at DESC);
