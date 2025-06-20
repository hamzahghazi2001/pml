-- Fix storage policies for project-documents bucket
-- This should be run in Supabase SQL Editor

-- First, check if policies exist and remove them
DROP POLICY IF EXISTS "Users can upload project documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view project documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their project documents" ON storage.objects;
DROP POLICY IF EXISTS "Public can view project documents" ON storage.objects;

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create comprehensive storage policies
CREATE POLICY "Authenticated users can upload to project-documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-documents');

CREATE POLICY "Authenticated users can view project-documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'project-documents');

CREATE POLICY "Users can update their own uploads in project-documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'project-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own uploads in project-documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'project-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Also ensure bucket policies are correct
UPDATE storage.buckets 
SET public = true 
WHERE id = 'project-documents';

-- Verify the setup
SELECT 
  id, 
  name, 
  public, 
  file_size_limit, 
  allowed_mime_types 
FROM storage.buckets 
WHERE id = 'project-documents';

-- Check if policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';
