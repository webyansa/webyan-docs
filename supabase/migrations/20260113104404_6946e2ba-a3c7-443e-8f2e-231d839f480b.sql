-- Create storage policies for public ticket uploads (for guests and authenticated users)
-- First, remove existing policies if any
DROP POLICY IF EXISTS "Allow public upload to tickets folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read from tickets folder" ON storage.objects;

-- Allow anyone to upload to tickets folder in docs-media bucket
CREATE POLICY "Allow public upload to tickets folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'docs-media' 
  AND (storage.foldername(name))[1] = 'tickets'
);

-- Allow anyone to read from tickets folder
CREATE POLICY "Allow public read from tickets folder"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'docs-media' 
  AND (storage.foldername(name))[1] = 'tickets'
);