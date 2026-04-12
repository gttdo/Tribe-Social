-- ============================================================
-- WAVE 1 MIGRATION - Part 3: RLS Policies & Cleanup
-- ============================================================

-- ============================================================
-- 1. ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE public.profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tribes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tribe_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow ENABLE ROW LEVEL SECURITY;

-- Also enable on tables that lost their policies in Wave 0
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. PROFILE RLS POLICIES
-- ============================================================

-- Anyone can read profiles (they are public-facing data)
CREATE POLICY profile_select_public ON public.profile
  FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY profile_update_own ON public.profile
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Profile insert is handled by the auth trigger (SECURITY DEFINER)
-- No direct insert policy needed for regular users

-- ============================================================
-- 3. TRIBE RLS POLICIES
-- ============================================================

-- Anyone can see public tribes; members can see private tribes
CREATE POLICY tribe_select_visible ON public.tribes
  FOR SELECT USING (
    is_public = true
    OR is_tribe_member(id)
    OR creator_id = auth.uid()
  );

-- Any authenticated user can create a tribe
CREATE POLICY tribe_insert_auth ON public.tribes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Only owner/admin can update tribe settings
CREATE POLICY tribe_update_admin ON public.tribes
  FOR UPDATE USING (
    has_tribe_role(id, ARRAY['owner', 'admin']::tribe_role_enum[])
  );

-- Only creator can delete tribe
CREATE POLICY tribe_delete_owner ON public.tribes
  FOR DELETE USING (creator_id = auth.uid());

-- ============================================================
-- 4. TRIBE_MEMBERS RLS POLICIES
-- ============================================================

-- Members can see other members in their tribes
CREATE POLICY tribe_members_select ON public.tribe_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR is_tribe_member(tribe_id)
  );

-- Users can add themselves as members (join tribe)
CREATE POLICY tribe_members_insert_self ON public.tribe_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can remove themselves (leave tribe)
CREATE POLICY tribe_members_delete_self ON public.tribe_members
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- 5. FOLLOW RLS POLICIES
-- ============================================================

-- Any authenticated user can see follow relationships
CREATE POLICY follow_select_auth ON public.follow
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can only follow as themselves
CREATE POLICY follow_insert_own ON public.follow
  FOR INSERT WITH CHECK (follower_id = auth.uid());

-- Users can only unfollow as themselves
CREATE POLICY follow_delete_own ON public.follow
  FOR DELETE USING (follower_id = auth.uid());

-- ============================================================
-- 6. TEMPORARY RLS FOR EXISTING TABLES (until Wave 2 replaces them)
-- ============================================================

-- Posts: basic read/write policies
CREATE POLICY posts_select_visible ON public.posts
  FOR SELECT USING (
    visibility = 'public'
    OR user_id = auth.uid()
    OR (visibility = 'tribe' AND tribe_id IS NOT NULL AND is_tribe_member(tribe_id))
  );

CREATE POLICY posts_insert_own ON public.posts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY posts_update_own ON public.posts
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY posts_delete_own ON public.posts
  FOR DELETE USING (user_id = auth.uid());

-- Post comments: basic policies
CREATE POLICY post_comments_select ON public.post_comments
  FOR SELECT USING (true);

CREATE POLICY post_comments_insert_auth ON public.post_comments
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY post_comments_update_own ON public.post_comments
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY post_comments_delete_own ON public.post_comments
  FOR DELETE USING (user_id = auth.uid());

-- Post reactions: basic policies
CREATE POLICY post_reactions_select ON public.post_reactions
  FOR SELECT USING (true);

CREATE POLICY post_reactions_insert_own ON public.post_reactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY post_reactions_delete_own ON public.post_reactions
  FOR DELETE USING (user_id = auth.uid());

-- Post bookmarks: basic policies
CREATE POLICY post_bookmarks_select_own ON public.post_bookmarks
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY post_bookmarks_insert_own ON public.post_bookmarks
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY post_bookmarks_delete_own ON public.post_bookmarks
  FOR DELETE USING (user_id = auth.uid());

-- Notifications: own only
CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================================
-- 7. RECALCULATE DENORMALIZED COUNTS
-- ============================================================

-- Recalculate follower counts from follow table
UPDATE public.profile p
SET follower_count = COALESCE(sub.cnt, 0)
FROM (
  SELECT followed_id, count(*) as cnt
  FROM public.follow
  GROUP BY followed_id
) sub
WHERE p.id = sub.followed_id;

-- Recalculate following counts from follow table
UPDATE public.profile p
SET following_count = COALESCE(sub.cnt, 0)
FROM (
  SELECT follower_id, count(*) as cnt
  FROM public.follow
  GROUP BY follower_id
) sub
WHERE p.id = sub.follower_id;

-- Recalculate post counts from posts table
UPDATE public.profile p
SET post_count = COALESCE(sub.cnt, 0)
FROM (
  SELECT user_id, count(*) as cnt
  FROM public.posts
  GROUP BY user_id
) sub
WHERE p.id = sub.user_id;

-- Recalculate tribe member counts
UPDATE public.tribes t
SET member_count = COALESCE(sub.cnt, 0)
FROM (
  SELECT tribe_id, count(*) as cnt
  FROM public.tribe_members
  GROUP BY tribe_id
) sub
WHERE t.id = sub.tribe_id;
