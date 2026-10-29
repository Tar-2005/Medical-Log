-- Create the encrypted_backups table
CREATE TABLE IF NOT EXISTS public.encrypted_backups (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    encrypted_payload TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.encrypted_backups ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Users can insert their own backup" ON public.encrypted_backups;
DROP POLICY IF EXISTS "Users can update their own backup" ON public.encrypted_backups;
DROP POLICY IF EXISTS "Users can view their own backup" ON public.encrypted_backups;

-- Create policies so users can only access their own backups
CREATE POLICY "Users can insert their own backup"
    ON public.encrypted_backups
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own backup"
    ON public.encrypted_backups
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own backup"
    ON public.encrypted_backups
    FOR SELECT
    USING (auth.uid() = user_id);
