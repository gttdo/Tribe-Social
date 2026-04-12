-- ============================================================
-- WAVE 2 MIGRATION - Content Schema
-- Posts, Media Assets, Comments, Likes, Bookmarks
-- ============================================================

-- Part 1: Post alterations + media_asset table

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
DROP TRIGGER IF EXISTS trg_posts_updated_at ON public.posts;
CREATE TRIGGER trg_posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Create media_asset table
CREATE TABLE IF NOT EXISTS public.media_asset (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  url text NOT NULL,
  thumbnail_url text,
  mime_type text NOT NULL DEFAULT 'application/octet-stream',
  size_bytes integer,
  width integer,
  height integer,
  duration_ms integer,
  sort_order smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_media_asset_post ON public.media_asset(post_id);

-- Populate media_asset from existing posts that have media_url
INSERT INTO public.media_asset (post_id, url, thumbnail_url, mime_type, sort_order, created_at)
SELECT id, media_url,
  COALESCE(media_thumb_url, thumbnail_url),
  CASE post_type
    WHEN 'image' THEN 'image/webp'
    WHEN 'video' THEN 'video/mp4'
    WHEN 'audio' THEN 'audio/wav'
    ELSE 'application/octet-stream'
  END,
  0, created_at
FROM public.posts
WHERE media_url IS NOT NULL AND media_url != ''
ON CONFLICT DO NOTHING;

-- Part 2: Create comment table (new, from post_comments)
CREATE TABLE IF NOT EXISTS public.comment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.comment(id) ON DELETE CASCADE,
  body text NOT NULL,
  like_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT comment_body_length CHECK (char_length(body) <= 500)
);
CREATE INDEX IF NOT EXISTS idx_comment_post ON public.comment(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comment_user ON public.comment(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_parent ON public.comment(parent_id);
DROP TRIGGER IF EXISTS trg_comment_updated_at ON public.comment;
CREATE TRIGGER trg_comment_updated_at BEFORE UPDATE ON public.comment FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Migrate data from post_comments
INSERT INTO public.comment (id, post_id, user_id, body, created_at)
SELECT id, post_id, user_id, body, created_at
FROM public.post_comments
ON CONFLICT (id) DO NOTHING;

-- Part 3: Create post_like table (from post_reactions)
CREATE TABLE IF NOT EXISTS public.post_like (
  user_id uuid NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);
CREATE INDEX IF NOT EXISTS idx_post_like_post ON public.post_like(post_id);

-- Migrate from post_reactions (deduplicate)
INSERT INTO public.post_like (user_id, post_id, created_at)
SELECT DISTINCT ON (user_id, post_id) user_id, post_id, created_at
FROM public.post_reactions
ORDER BY user_id, post_id, created_at
ON CONFLICT (user_id, post_id) DO NOTHING;

-- Part 4: Create comment_like table (empty for now)
CREATE TABLE IF NOT EXISTS public.comment_like (
  user_id uuid NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
  comment_id uuid NOT NULL REFERENCES public.comment(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, comment_id)
);
CREATE INDEX IF NOT EXISTS idx_comment_like_comment ON public.comment_like(comment_id);

-- Part 5: Create bookmark table (from post_bookmarks)
CREATE TABLE IF NOT EXISTS public.bookmark (
  user_id uuid NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);
CREATE INDEX IF NOT EXISTS idx_bookmark_user_created ON public.bookmark(user_id, created_at DESC);

-- Migrate from post_bookmarks (deduplicate)
INSERT INTO public.bookmark (user_id, post_id, created_at)
SELECT DISTINCT ON (user_id, post_id) user_id, post_id, created_at
FROM public.post_bookmarks
ORDER BY user_id, post_id, created_at
ON CONFLICT (user_id, post_id) DO NOTHING;

-- Part 6: Counter triggers

-- Post like count trigger
CREATE OR REPLACE FUNCTION update_post_like_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trg_post_like_count ON public.post_like;
CREATE TRIGGER trg_post_like_count AFTER INSERT OR DELETE ON public.post_like FOR EACH ROW EXECUTE FUNCTION update_post_like_count();

-- Comment like count trigger
CREATE OR REPLACE FUNCTION update_comment_like_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.comment SET like_count = like_count + 1 WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.comment SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trg_comment_like_count ON public.comment_like;
CREATE TRIGGER trg_comment_like_count AFTER INSERT OR DELETE ON public.comment_like FOR EACH ROW EXECUTE FUNCTION update_comment_like_count();

-- Post comment count trigger
CREATE OR REPLACE FUNCTION update_post_comment_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trg_post_comment_count ON public.comment;
CREATE TRIGGER trg_post_comment_count AFTER INSERT OR DELETE ON public.comment FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

-- Profile post count trigger
CREATE OR REPLACE FUNCTION update_profile_post_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profile SET post_count = post_count + 1 WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profile SET post_count = GREATEST(post_count - 1, 0) WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trg_profile_post_count ON public.posts;
CREATE TRIGGER trg_profile_post_count AFTER INSERT OR DELETE ON public.posts FOR EACH ROW EXECUTE FUNCTION update_profile_post_count();

-- Tribe post count trigger
CREATE OR REPLACE FUNCTION update_tribe_post_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.tribe_id IS NOT NULL THEN
    UPDATE public.tribes SET post_count = post_count + 1 WHERE id = NEW.tribe_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' AND OLD.tribe_id IS NOT NULL THEN
    UPDATE public.tribes SET post_count = GREATEST(post_count - 1, 0) WHERE id = OLD.tribe_id;
    RETURN OLD;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trg_tribe_post_count ON public.posts;
CREATE TRIGGER trg_tribe_post_count AFTER INSERT OR DELETE ON public.posts FOR EACH ROW EXECUTE FUNCTION update_tribe_post_count();

-- Part 7: RLS on new tables
ALTER TABLE public.media_asset ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_like ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_like ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmark ENABLE ROW LEVEL SECURITY;

-- media_asset: readable if post is readable (simplified: public read for now)
CREATE POLICY media_asset_select ON public.media_asset FOR SELECT USING (true);
CREATE POLICY media_asset_insert_own ON public.media_asset FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.posts WHERE id = media_asset.post_id AND user_id = auth.uid())
);
CREATE POLICY media_asset_delete_own ON public.media_asset FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.posts WHERE id = media_asset.post_id AND user_id = auth.uid())
);

-- comment
CREATE POLICY comment_select ON public.comment FOR SELECT USING (true);
CREATE POLICY comment_insert_auth ON public.comment FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY comment_update_own ON public.comment FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY comment_delete_own ON public.comment FOR DELETE USING (user_id = auth.uid());

-- post_like
CREATE POLICY post_like_select ON public.post_like FOR SELECT USING (true);
CREATE POLICY post_like_insert_own ON public.post_like FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY post_like_delete_own ON public.post_like FOR DELETE USING (user_id = auth.uid());

-- comment_like
CREATE POLICY comment_like_select ON public.comment_like FOR SELECT USING (true);
CREATE POLICY comment_like_insert_own ON public.comment_like FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY comment_like_delete_own ON public.comment_like FOR DELETE USING (user_id = auth.uid());

-- bookmark
CREATE POLICY bookmark_select_own ON public.bookmark FOR SELECT USING (user_id = auth.uid());
CREATE POLICY bookmark_insert_own ON public.bookmark FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY bookmark_delete_own ON public.bookmark FOR DELETE USING (user_id = auth.uid());

-- Part 8: Recalculate counts
UPDATE public.posts p SET like_count = COALESCE(s.cnt, 0) FROM (SELECT post_id, count(*) as cnt FROM public.post_like GROUP BY post_id) s WHERE p.id = s.post_id;
UPDATE public.posts p SET comment_count = COALESCE(s.cnt, 0) FROM (SELECT post_id, count(*) as cnt FROM public.comment GROUP BY post_id) s WHERE p.id = s.post_id;
UPDATE public.profile p SET post_count = COALESCE(s.cnt, 0) FROM (SELECT user_id, count(*) as cnt FROM public.posts GROUP BY user_id) s WHERE p.id = s.user_id;
