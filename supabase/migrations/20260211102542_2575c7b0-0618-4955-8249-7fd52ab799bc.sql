UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
    file_size_limit = 10485760
WHERE id = 'ticket-attachments';