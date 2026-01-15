-- Add trigger to update conversation when new message is added (without the realtime line since it already exists)
CREATE OR REPLACE FUNCTION public.update_conversation_on_new_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the conversation's last_message_at, last_message_preview, and unread_count
  UPDATE public.conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.body, 100),
    updated_at = NOW(),
    unread_count = CASE 
      WHEN NEW.sender_type IN ('client', 'system') THEN COALESCE(unread_count, 0) + 1
      ELSE unread_count
    END
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON public.conversation_messages;

-- Create trigger
CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT ON public.conversation_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_on_new_message();