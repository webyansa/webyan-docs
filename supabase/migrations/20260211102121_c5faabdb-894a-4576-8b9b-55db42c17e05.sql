-- Allow authenticated users to upload to ticket-attachments bucket
CREATE POLICY "Allow authenticated upload to ticket-attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ticket-attachments');

-- Allow authenticated users to update files in ticket-attachments
CREATE POLICY "Allow authenticated update to ticket-attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'ticket-attachments');
