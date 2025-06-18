-- This script should be run in Supabase SQL Editor with admin privileges
-- It sets up the storage bucket and policies for document uploads

-- First, ensure we're working with the right schema
SET search_path TO storage, public;

-- Create the storage bucket (this requires admin privileges)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-documents',
  'project-documents',
  true,
  52428800, -- 50MB limit
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain',
    'text/csv'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload project documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view project documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their project documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their project documents" ON storage.objects;

-- Create storage policies for the project-documents bucket
CREATE POLICY "Users can upload project documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'project-documents' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can view project documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'project-documents' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their project documents" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'project-documents' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their project documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'project-documents' 
  AND auth.role() = 'authenticated'
);

-- Verify the bucket was created
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'project-documents';
