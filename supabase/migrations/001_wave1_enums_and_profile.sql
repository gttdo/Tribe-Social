-- ============================================================
-- WAVE 1 MIGRATION - Part 1: Enums & Profile Table
-- Tribe Social Backend Rebuild
-- Date: 2026-04-11
-- ============================================================

-- ============================================================
-- 1. CREATE/VERIFY ENUMS
-- ============================================================

-- post_type_enum already exists with: thought, image, video, audio
-- tribe_role_enum already exists with: member, moderator, admin, owner
-- notification_type already exists

-- Create visibility_enum (new - replaces scattered text fields)
DO $$ BEGIN
  CREATE TYPE visibility_enum AS ENUM ('public', 'tribe');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create new enums needed for later waves
DO $$ BEGIN
  CREATE TYPE report_status_enum AS ENUM ('pending', 'reviewed', 'actioned', 'dismissed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE report_target_enum AS ENUM ('post', 'comment', 'user', 'tribe');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE point_action_enum AS ENUM (
    'post_created', 'comment_added', 'reaction_received',
    'follow_received', 'tribe_joined', 'achievement_unlocked', 'daily_login'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. GENERIC UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. CREATE PROFILE TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profile (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  display_name text,
  bio text,
  avatar_url text,
  xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  follower_count integer NOT NULL DEFAULT 0,
  following_count integer NOT NULL DEFAULT 0,
  post_count integer NOT NULL DEFAULT 0,
  is_private boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 24),
  CONSTRAINT profile_username_format CHECK (username ~ '^[a-z0-9_]+$'),
  CONSTRAINT profile_display_name_length CHECK (display_name IS NULL OR char_length(display_name) <= 50),
  CONSTRAINT profile_bio_length CHECK (bio IS NULL OR char_length(bio) <= 280),
  CONSTRAINT profile_xp_positive CHECK (xp >= 0),
  CONSTRAINT profile_level_positive CHECK (level >= 1),
  CONSTRAINT profile_follower_count_positive CHECK (follower_count >= 0),
  CONSTRAINT profile_following_count_positive CHECK (following_count >= 0),
  CONSTRAINT profile_post_count_positive CHECK (post_count >= 0)
);

-- Add unique constraint on username
ALTER TABLE public.profile ADD CONSTRAINT profile_username_unique UNIQUE (username);

-- Add index
CREATE INDEX IF NOT EXISTS idx_profile_created_at ON public.profile(created_at DESC);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS trg_profile_updated_at ON public.profile;
CREATE TRIGGER trg_profile_updated_at
  BEFORE UPDATE ON public.profile
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 4. MIGRATE DATA FROM users + profiles -> profile
-- ============================================================

INSERT INTO public.profile (id, username, display_name, bio, avatar_url, xp, level, follower_count, following_count, post_count, is_private, created_at)
SELECT
  u.id,
  COALESCE(
    LOWER(NULLIF(u.username, '')),
    LOWER(NULLIF(p.username, '')),
    'user_' || substr(u.id::text, 1, 8)
  ) AS username,
  COALESCE(p.display_name, p.nickname) AS display_name,
  COALESCE(p.bio, p.description, u.description) AS bio,
  COALESCE(u.profile_image_url, p.avatar_url) AS avatar_url,
  COALESCE(u.xp, p.xp, 0) AS xp,
  COALESCE(u.level, 1) AS level,
  COALESCE(u.follower_count, 0) AS follower_count,
  COALESCE(u.following_count, 0) AS following_count,
  0 AS post_count,
  COALESCE(u.profile_privacy = 'private', false) AS is_private,
  COALESCE(u.created_at, p.created_at, now()) AS created_at
FROM public.users u
LEFT JOIN public.profiles p ON u.id = p.id
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 5. AUTH TRIGGER: auto-create profile on signup
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profile (id, username, created_at)
  VALUES (
    NEW.id,
    'user_' || substr(NEW.id::text, 1, 8),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old trigger if exists, create new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
