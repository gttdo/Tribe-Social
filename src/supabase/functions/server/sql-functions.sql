-- SQL function to execute arbitrary SQL (for policy management)
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Grant execute permission to the service role
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;

-- Function to check if user can view a post based on privacy rules
CREATE OR REPLACE FUNCTION public.can_view_post(
  post_user_id uuid,
  post_visibility text,
  post_tribe_id uuid DEFAULT NULL,
  viewer_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  author_privacy text;
  is_following boolean := false;
  is_tribe_member boolean := false;
BEGIN
  -- Owner can always view their own posts
  IF post_user_id = viewer_id THEN
    RETURN true;
  END IF;

  -- Private posts only visible to owner
  IF post_visibility = 'private' THEN
    RETURN false;
  END IF;

  -- Tribe posts require membership
  IF post_visibility = 'tribe' AND post_tribe_id IS NOT NULL THEN
    -- Anonymous users can't view tribe posts
    IF viewer_id IS NULL THEN
      RETURN false;
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.tribe_members tm
      WHERE tm.tribe_id = post_tribe_id
      AND tm.user_id = viewer_id
    ) INTO is_tribe_member;

    RETURN is_tribe_member;
  END IF;

  -- Public posts depend on author's profile privacy
  IF post_visibility = 'public' THEN
    -- Get author's privacy setting
    SELECT COALESCE(profile_privacy, 'public') INTO author_privacy
    FROM public.users
    WHERE id = post_user_id;

    -- If author has public profile, post is visible to everyone
    IF author_privacy = 'public' THEN
      RETURN true;
    END IF;

    -- If author has private profile, check if viewer is following
    IF author_privacy = 'private' THEN
      -- Anonymous users can't view posts from private profiles
      IF viewer_id IS NULL THEN
        RETURN false;
      END IF;

      SELECT EXISTS (
        SELECT 1 FROM public.user_relationships ur
        WHERE ur.followed_id = post_user_id
        AND ur.follower_id = viewer_id
      ) INTO is_following;

      RETURN is_following;
    END IF;
  END IF;

  -- Default to not visible
  RETURN false;
END;
$$;

-- Grant execute permission to authenticated and anon roles
GRANT EXECUTE ON FUNCTION public.can_view_post(uuid, text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_post(uuid, text, uuid, uuid) TO anon;

-- Function to get user's effective privacy level for a post
CREATE OR REPLACE FUNCTION public.get_effective_post_visibility(
  post_visibility text,
  author_profile_privacy text
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Private posts stay private
  IF post_visibility = 'private' THEN
    RETURN 'private';
  END IF;

  -- Tribe posts stay tribe-only
  IF post_visibility = 'tribe' THEN
    RETURN 'tribe';
  END IF;

  -- Public posts from private profiles become follower-only
  IF post_visibility = 'public' AND author_profile_privacy = 'private' THEN
    RETURN 'followers';
  END IF;

  -- Public posts from public profiles stay public
  RETURN 'public';
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_effective_post_visibility(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_effective_post_visibility(text, text) TO anon;

-- Add profile_privacy column to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'profile_privacy'
  ) THEN
    ALTER TABLE public.users 
    ADD COLUMN profile_privacy text CHECK (profile_privacy IN ('public', 'private')) DEFAULT 'public';
    
    -- Create index for better performance
    CREATE INDEX IF NOT EXISTS users_profile_privacy_idx ON public.users(profile_privacy);
    
    COMMENT ON COLUMN public.users.profile_privacy IS 'User profile privacy setting: public (anyone can see posts) or private (only followers can see public posts)';
  END IF;
END
$$;

-- Update existing users to have public privacy by default
UPDATE public.users 
SET profile_privacy = 'public' 
WHERE profile_privacy IS NULL;

-- Function to create storage bucket with proper permissions
CREATE OR REPLACE FUNCTION public.create_storage_bucket(
  bucket_name text,
  bucket_public boolean DEFAULT true
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  result json;
BEGIN
  -- Insert bucket into storage.buckets table
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    bucket_name,
    bucket_name,
    bucket_public,
    CASE 
      WHEN bucket_name LIKE '%avatar%' THEN 2097152  -- 2MB for avatars
      ELSE 5242880  -- 5MB for media
    END,
    CASE 
      WHEN bucket_name LIKE '%avatar%' THEN ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      ELSE ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/mov', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/m4a']
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    public = bucket_public,
    updated_at = now();

  result := json_build_object(
    'success', true,
    'bucket', bucket_name,
    'public', bucket_public
  );

  RETURN result;
EXCEPTION WHEN OTHERS THEN
  result := json_build_object(
    'success', false,
    'error', SQLERRM,
    'bucket', bucket_name
  );
  RETURN result;
END;
$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.create_storage_bucket(text, boolean) TO service_role;