-- ============================================================
-- WAVE 1 MIGRATION - Part 2: Tribes, Follow, Helper Functions
-- ============================================================

-- ============================================================
-- 1. ALTER TRIBES TABLE
-- ============================================================

-- Add slug column if not exists
ALTER TABLE public.tribes ADD COLUMN IF NOT EXISTS slug text;

-- Generate slugs from existing names
UPDATE public.tribes
SET slug = lower(regexp_replace(name, '[^a-z0-9]+', '-', 'gi'))
WHERE slug IS NULL;

-- Make slug NOT NULL and UNIQUE
ALTER TABLE public.tribes ALTER COLUMN slug SET NOT NULL;
ALTER TABLE public.tribes ADD CONSTRAINT tribes_slug_unique UNIQUE (slug);

-- Add updated_at if not exists
ALTER TABLE public.tribes ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add updated_at trigger
DROP TRIGGER IF EXISTS trg_tribes_updated_at ON public.tribes;
CREATE TRIGGER trg_tribes_updated_at
  BEFORE UPDATE ON public.tribes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 2. FIX TRIBE_MEMBERS TABLE
-- ============================================================

-- Add updated_at if not exists
ALTER TABLE public.tribe_members ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add unique constraint (tribe_id, user_id) if not exists
DO $$ BEGIN
  ALTER TABLE public.tribe_members
    ADD CONSTRAINT tribe_members_tribe_user_unique UNIQUE (tribe_id, user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add updated_at trigger
DROP TRIGGER IF EXISTS trg_tribe_members_updated_at ON public.tribe_members;
CREATE TRIGGER trg_tribe_members_updated_at
  BEFORE UPDATE ON public.tribe_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Add index on user_id for membership lookups
CREATE INDEX IF NOT EXISTS idx_tribe_members_user ON public.tribe_members(user_id);

-- ============================================================
-- 3. CREATE FOLLOW TABLE (replaces follows + user_relationships)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.follow (
  follower_id uuid NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
  followed_id uuid NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followed_id),
  CONSTRAINT follow_no_self CHECK (follower_id != followed_id)
);

CREATE INDEX IF NOT EXISTS idx_follow_followed ON public.follow(followed_id);

-- Migrate data from user_relationships (primary source)
INSERT INTO public.follow (follower_id, followed_id, created_at)
SELECT follower_id, followed_id, created_at
FROM public.user_relationships
ON CONFLICT (follower_id, followed_id) DO NOTHING;

-- Also merge from follows table (uses following_id instead of followed_id)
INSERT INTO public.follow (follower_id, followed_id, created_at)
SELECT follower_id, following_id, created_at
FROM public.follows
WHERE follower_id != following_id
ON CONFLICT (follower_id, followed_id) DO NOTHING;

-- ============================================================
-- 4. SECURITY DEFINER HELPER FUNCTIONS (break RLS recursion)
-- ============================================================

-- Check if current user is a member of a tribe
CREATE OR REPLACE FUNCTION public.is_tribe_member(p_tribe_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tribe_members
    WHERE tribe_id = p_tribe_id AND user_id = auth.uid()
  );
$$;

-- Check if current user has a specific role in a tribe
CREATE OR REPLACE FUNCTION public.has_tribe_role(p_tribe_id uuid, p_roles tribe_role_enum[])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tribe_members
    WHERE tribe_id = p_tribe_id
      AND user_id = auth.uid()
      AND role = ANY(p_roles)
  );
$$;

-- ============================================================
-- 5. COUNTER TRIGGERS
-- ============================================================

-- Follow counts trigger
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profile SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE public.profile SET follower_count = follower_count + 1 WHERE id = NEW.followed_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profile SET following_count = GREATEST(following_count - 1, 0) WHERE id = OLD.follower_id;
    UPDATE public.profile SET follower_count = GREATEST(follower_count - 1, 0) WHERE id = OLD.followed_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_follow_counts ON public.follow;
CREATE TRIGGER trg_follow_counts
  AFTER INSERT OR DELETE ON public.follow
  FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

-- Tribe member count trigger
CREATE OR REPLACE FUNCTION update_tribe_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.tribes SET member_count = member_count + 1 WHERE id = NEW.tribe_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.tribes SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.tribe_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_tribe_member_count ON public.tribe_members;
CREATE TRIGGER trg_tribe_member_count
  AFTER INSERT OR DELETE ON public.tribe_members
  FOR EACH ROW EXECUTE FUNCTION update_tribe_member_count();

-- Auto-create owner membership when tribe is created
CREATE OR REPLACE FUNCTION auto_tribe_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.tribe_members (tribe_id, user_id, role, joined_at)
  VALUES (NEW.id, NEW.creator_id, 'owner', now())
  ON CONFLICT (tribe_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_tribe_auto_owner ON public.tribes;
CREATE TRIGGER trg_tribe_auto_owner
  AFTER INSERT ON public.tribes
  FOR EACH ROW EXECUTE FUNCTION auto_tribe_owner();
