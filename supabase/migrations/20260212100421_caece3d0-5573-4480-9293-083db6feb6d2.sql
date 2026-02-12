
ALTER TABLE public.embed_tokens ADD COLUMN IF NOT EXISTS token_type TEXT DEFAULT 'ticket';

-- Update existing chat tokens
UPDATE public.embed_tokens SET token_type = 'chat' WHERE token LIKE 'chat_%';
