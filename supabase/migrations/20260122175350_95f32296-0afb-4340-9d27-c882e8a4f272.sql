-- Create email logs table
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  email_type TEXT,
  method TEXT NOT NULL CHECK (method IN ('smtp', 'resend')),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'fallback')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  sent_by TEXT
);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to view logs
CREATE POLICY "Admins can view email logs" 
ON public.email_logs 
FOR SELECT 
USING (public.is_admin_or_editor(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_email_logs_created_at ON public.email_logs(created_at DESC);
CREATE INDEX idx_email_logs_status ON public.email_logs(status);
CREATE INDEX idx_email_logs_recipient ON public.email_logs(recipient_email);

-- Add comment
COMMENT ON TABLE public.email_logs IS 'سجل إرسال البريد الإلكتروني';
