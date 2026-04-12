# Tribe Social - Full Product & Engineering Audit

**Date:** 2026-04-11
**Auditor Role:** Senior Product Engineer & Systems Auditor
**Codebase:** React 18 + Vite + Supabase + Tailwind CSS

---

## 1. Executive Summary

Tribe Social is a community social platform with a vaporwave-aesthetic UI built on React 18, Vite, Tailwind CSS, and Supabase. The app has a solid foundation for basic social functionality (posting, commenting, liking, bookmarking, profiles) but suffers from significant technical debt, incomplete feature implementations, and architectural decisions that will block Android deployment.

**Key findings:**

- **~240 component files**, of which ~50 are test/debug/diagnostic files that should not exist in production
- **Authentication works for email only.** Phone auth is faked (converts phone to email format). Google OAuth is coded but likely not enabled in Supabase. No real phone/SMS auth exists.
- **Tribe system is UI-only.** The DiscoverTribesPage renders hardcoded sample data. No backend integration for tribe CRUD, joining, or membership.
- **Gamification is stubbed but not functional.** XP/level calculation code exists but no points are awarded for any action.
- **No proper router.** The app uses manual view-state switching and a custom URLRouter with regex, not React Router or similar.
- **Text content limit is set to 250 characters** in the database-types file, but the product spec calls for 500.
- **RLS policies have known circular recursion issues** on tribe_members and posts tables.
- **No `.env` file.** Supabase credentials are hardcoded in source code.
- **539+ console.log statements** left in production code.
- **No test suite.** Zero unit tests, integration tests, or E2E tests.
- **5MB media upload limit** is too small for video. Will frustrate users and block meaningful video content.
- **Stories feature is built** but was never mentioned in the product spec -- overbuilt scope.

**Bottom line:** The app needs a focused cleanup wave before any new features. The foundation is usable but fragile. The priority should be: clean up dead code, fix auth properly, wire up tribes to the backend, and establish a real routing system before adding anything else.

---

## 2. Current Capability Audit

### What Currently Works

| Area | Status | Notes |
|------|--------|-------|
| Email/password signup | **Working** | Via edge function, creates user + users table row |
| Email/password login | **Working** | Via `signInWithPassword`, PKCE flow |
| Session management | **Working** | Auth state listener, token refresh, localStorage persistence |
| Profile viewing | **Working** | Shows username, bio, avatar, post count, followers |
| Profile editing (bio/username) | **Working** | EditProfilePage with validation |
| Avatar upload with crop | **Working** | Multi-size generation (96/192/384/1024px), WebP conversion |
| Post creation (text thoughts) | **Working** | With character limit, tribe selection, visibility |
| Post creation (image) | **Working** | Upload from device, preview |
| Post creation (video) | **Working** | Upload from device, WebM recording |
| Post creation (audio) | **Working** | Audio recording with waveform visualization |
| Social feed | **Working** | Loads posts from edge function with direct DB fallback |
| Post cards | **Working** | Renders text, image, video, audio with proper UI |
| Comments (read/write) | **Working** | Load comments, submit with optimistic rendering |
| Like/reactions | **Working** | Toggle likes, optimistic UI updates, backend persistence via edge functions |
| Bookmarks/saves | **Working** | Toggle bookmarks, saved posts page |
| Follow/unfollow | **Working** | Follow system with follower/following counts |
| Landing page | **Working** | Polished hero with animations, CTAs |
| In-app photo capture | **Working** | Camera access, front/back switch, canvas crop |
| In-app video recording | **Working** | MediaRecorder with WebM codec |
| In-app audio recording | **Working** | Audio recording with waveform display |
| Post deletion | **Working** | With confirmation dialog |
| Notifications | **Working** | Fetch, display, mark as read via edge functions |
| Dark theme / vaporwave aesthetic | **Working** | Consistent visual language |

### What Partially Works

| Area | Status | Notes |
|------|--------|-------|
| Phone signup | **Partially implemented** | Converts phone to fake email (`1234567890@phone-signup.tribal`). Not real phone auth. No SMS/OTP. |
| Google OAuth login | **Partially implemented** | Code exists in LoginFlow.tsx calling `signInWithOAuth({ provider: 'google' })`. Shows "not enabled" error if Supabase provider not configured. |
| Facebook OAuth | **Partially implemented** | Same pattern as Google. Shows "coming soon" message in signup. |
| Tribe discovery | **Partially implemented** | UI renders beautifully with search, filters, categories. All data is hardcoded sample data. No backend calls. |
| Tribe membership | **Partially implemented** | Join/unjoin buttons exist with optimistic UI. No actual API calls to persist membership. |
| Username/handle system | **Partially implemented** | Username stored in users table, editable in profile. No uniqueness validation on frontend (backend may check). No `@handle` deep linking. |
| Comment threading | **Partially implemented** | `parent_comment_id` exists in schema. Reply UI sets mention text but doesn't use proper threading. |
| Profile gallery | **Partially implemented** | ProfilePostsList and variants exist. Multiple competing implementations (6+ profile page variants). |
| Post editing | **Partially implemented** | EditPostModal exists but integration unclear. |
| Gamification display | **Partially implemented** | LevelProgressBar, level-helpers.ts with XP calculations, level titles. But no XP is ever awarded. |
| Accessibility | **Partially implemented** | AccessibleDialog components exist but many test files suggest ongoing issues. |

### What Is Missing

| Area | Status | Notes |
|------|--------|-------|
| Real phone auth (SMS/OTP) | **Missing** | No Twilio, no Supabase phone provider config. Current implementation is a workaround. |
| Tribe creation | **Missing** | No create tribe form or flow exists despite schema support. |
| Tribe management | **Missing** | No admin panel, member management, role assignment, tribe settings. |
| Tribe feed | **Missing** | No tribe-scoped feed view. |
| Points system | **Missing** | No point awarding logic anywhere. XP column exists but never incremented. |
| Achievements/badges | **Missing** | `achievement_ids` column exists in users table. No achievement definitions, no awarding logic. |
| Password reset | **Missing** | "Forgot password" button exists in LoginFlow but has no handler. |
| Share functionality | **Missing** | Share button renders but does nothing. No deeplinks, no copy-to-clipboard, no native share API. |
| Post editing (end-to-end) | **Missing** | Modal exists but unclear if wired to backend. |
| Comment editing/deletion | **Missing** | No UI or API for modifying comments after creation. |
| Onboarding flow | **Missing** | No guided first-time experience. User lands on empty feed. |
| Search (global) | **Missing** | No search for users, posts, or tribes. |
| Reporting/moderation | **Missing** | Report button exists in post menu but is non-functional. No moderation tools. |
| Push notifications | **Missing** | Required for Android. No service worker, no FCM. |
| Offline support | **Missing** | localStorage fallbacks exist but no proper offline-first architecture. |
| Unit/integration tests | **Missing** | Zero test files. No jest, vitest, or testing-library config. |

### What Needs Refactor

| Area | Status | Notes |
|------|--------|-------|
| Routing | **Needs refactor** | Custom URLRouter with regex + view-state switching must be replaced with React Router. |
| Component count | **Needs refactor** | 240 files, ~50 are test/debug/diagnostic. Multiple competing implementations of same features (6 profile pages, 4+ bio editors, 3 avatar uploaders). |
| State management | **Needs refactor** | App.tsx has 10+ useState hooks for bookmarks alone. No centralized state. Should adopt Zustand or similar. |
| API layer | **Needs refactor** | Main API function is named `We()`. Edge function + direct DB fallback is clever but makes debugging hard. |
| Console logging | **Needs refactor** | 539+ console.log statements. Needs proper logging utility gated by environment. |
| Environment config | **Needs refactor** | No .env file. Supabase URL and anon key hardcoded in source. |
| Character limits | **Needs refactor** | `TEXT_CONTENT_LIMIT = 250` in database-types.tsx. Product spec says 500. |

### What Is Blocked by Backend/Schema/Infra

| Area | Status | Notes |
|------|--------|-------|
| RLS policies | **Blocked** | Known circular recursion in tribe_members and posts RLS. Documented in DatabaseDiagnostic.tsx. |
| Phone auth | **Blocked** | Requires Supabase phone provider configuration + SMS provider (Twilio/MessageBird). |
| Google auth | **Blocked** | Requires Google Cloud Console OAuth setup + Supabase provider enable. |
| Storage RLS | **Blocked** | RLS policy creation via code doesn't work (code acknowledges this). Policies must be created manually in Supabase SQL editor. |
| Video file size | **Blocked** | 5MB limit is too restrictive for video. Needs bucket config change. |

---

## 3. What Partially Works (Detailed)

### Phone Authentication
The phone "auth" is a facade. When a user enters a phone number, the app converts it to a fake email (`{digits}@phone-signup.tribal`) and creates an email/password account. This means:
- No SMS verification ever occurs
- The phone number is not stored in auth.users.phone
- Phone login works only because it reverses the fake email pattern
- This will confuse users who expect SMS codes
- This must be replaced with real Supabase phone auth before launch

### Google OAuth
`LoginFlow.tsx:184` calls `supabase.auth.signInWithOAuth({ provider: 'google' })`. The code is correct but the Supabase project likely hasn't had Google as a provider enabled and configured. The error handling catches "provider is not enabled" and shows a user-friendly message. The redirect URL setup may also need verification.

### Tribe Discovery
`DiscoverTribesPage.tsx` is one of the most polished components. It has search with fuzzy matching, category filters (Tech, Art, Music, Gaming, Wellness, Travel, Fashion), sort options (Trending, Newest, Popular, Nearby), curated sections, and attractive tribe cards. But every single tribe displayed is hardcoded sample data. There are zero Supabase queries in this component. When the backend is wired up, the UI is ready.

---

## 4. UX and Product Alignment Assessment

### Where the Product Aligns Well
- **Visual identity is strong.** The vaporwave aesthetic is consistent and distinctive. Color palette, typography, and animations create a cohesive brand.
- **Post creation flow is solid.** Multi-type posting (thought, image, video, audio) with in-app capture is well-executed.
- **Feed experience works.** Posts render correctly with proper media handling, engagement actions, and user attribution.
- **Avatar system is thorough.** Crop, multi-size generation, and refresh propagation are all handled properly.

### Where the UX Is Confusing, Incomplete, or Inconsistent
- **No onboarding.** After signup, users land on an empty feed with no guidance. No "create your first post" prompt, no tribe suggestions, no profile completion nudge.
- **6+ profile page variants.** ProfilePage, ProfilePageComplete, EnhancedProfilePage, UnifiedProfilePage, UnifiedProfilePageWithDrawer, UserProfilePage. Unclear which is the canonical one. This creates inconsistent experiences.
- **Tribe system is a dead end.** Users can browse beautiful tribe cards but can't actually create or meaningfully join one. This is the core differentiator of the product and it's non-functional.
- **Bio field name inconsistency.** Code alternates between `description` and `bio`. EditProfilePage sends both. The `profiles` table has `bio`, the `users` table has `description`. This dual-storage creates confusion.
- **Phone signup is misleading.** Users enter a phone number expecting SMS verification. They actually create a password account with a fake email. The disconnect will cause trust issues.
- **Hamburger menu is minimal.** Only Create Post, Profile, Discover Tribes, Settings, Logout. No home/feed link, no notifications link, no saved posts link.

### What Is Overbuilt vs Underbuilt
**Overbuilt:**
- **Stories system.** Full stories with ephemeral content, views, reactions, expiration -- never mentioned in product spec. This is scope creep that diverted effort from core features.
- **Reaction types.** Six reaction types (like, love, laugh, wow, sad, angry) when a simple like would suffice for MVP.
- **Avatar multi-size generation.** Four sizes (96, 192, 384, 1024) is overkill for MVP. Two sizes would be sufficient.
- **50+ test/debug components.** These should be developer tools, not shipped components.

**Underbuilt:**
- **Tribes.** The entire tribe system. This is the product's namesake.
- **Gamification.** XP/level code exists but nothing triggers it. The participation reward loop that would drive retention doesn't exist.
- **Search.** No way to find users, posts, or tribes.
- **Onboarding.** Zero first-time user experience.
- **Moderation.** No reporting, no content flagging, no admin tools.

### What Should Be Simplified for MVP
- Reactions: Collapse to single "like" for MVP
- Avatar sizes: 2 sizes instead of 4
- Post visibility: "public" and "tribe" only (drop "private" for now)
- Stories: Remove entirely for MVP
- Comment threading: Flat comments only for MVP

### What Should Wait Until Later Waves
- Stories/ephemeral content
- Deep comment threading
- Rich text in posts
- Video trimming/editing
- Content recommendation algorithms
- Push notifications (until Android)
- Admin/moderation dashboard

---

## 5. Supabase and Schema Audit

### Existing Tables

| Table | Purpose | Assessment |
|-------|---------|------------|
| `users` | Core user data, XP, level, privacy | **Solid.** Good column set. Missing: `display_name`, `phone_verified`, `auth_provider`. Has `follower_count`/`following_count` as denormalized counters -- acceptable for performance but must be kept in sync. |
| `tribes` | Tribe/community definitions | **Good structure.** Has name, description, owner, privacy, categories, tags, rules, avatars. Ready for backend wiring. |
| `tribe_members` | Tribe membership with roles | **Good.** Supports member/moderator/admin/owner roles. Has proper FKs. RLS has recursion issue. |
| `user_relationships` | Follow graph | **Adequate.** Simple follower/followed. No "blocked" or "muted" status. |
| `posts` | All post types | **Good.** Supports thought/image/video/audio. Has visibility, engagement counters, media URLs. |
| `post_reactions` | Post likes/reactions | **Good.** Supports 6 reaction types. Proper FKs with unique constraint needed (user+post+type). |
| `post_comments` | Comments with threading | **Good.** Has parent_comment_id for threading. Like/reply counters. |
| `comment_reactions` | Comment reactions | **Good.** Mirrors post_reactions pattern. |
| `post_bookmarks` | Saved posts | **Good.** Simple user-post junction. |
| `stories` | Ephemeral content | **Unnecessary for MVP.** Well-structured but not in product spec. |
| `story_views` | Story view tracking | **Unnecessary for MVP.** |
| `story_reactions` | Story reactions | **Unnecessary for MVP.** |

### Missing or Incomplete Tables

| Table | Purpose | Priority |
|-------|---------|----------|
| `profiles` | Bio/display_name storage | **Exists but poorly integrated.** Referenced in code as fallback for bio. Should be merged into `users` table or formally separated with clear ownership. |
| `notifications` | Notification storage | **Likely exists** (API endpoints reference it) but not in database-types.tsx. Needs to be formally defined. |
| `user_points_log` | Point transaction history | **Missing. Needed for gamification.** Should track action, points awarded, timestamp, reference_id. |
| `tribe_invites` | Tribe invitation system | **Missing.** Needed for private tribe onboarding. |
| `reports` | Content/user reports | **Missing.** Needed before public launch. |
| `user_blocks` | User blocking | **Missing.** Required for safety. |
| `media_assets` | Centralized media tracking | **Missing.** Currently media is stored as URLs on posts. A media table would enable reuse, gallery views, and cleanup. |

### Schema Issues

1. **`profiles` vs `users` table confusion.** Bio lives in `profiles.bio` AND `users.description`. Code sends updates to both. Pick one source of truth. Recommendation: Use `users.description` as canonical. Drop `profiles` table or repurpose it for extended profile data.

2. **No unique constraint on `post_reactions(post_id, user_id)`.** Without this, a user could like a post multiple times. Same issue on `post_bookmarks`, `comment_reactions`.

3. **`TEXT_CONTENT_LIMIT = 250`** in database-types.tsx. Product spec says 500 characters. This needs updating and the posts table text_body column should have a CHECK constraint.

4. **No `notifications` table in database-types.tsx.** The edge functions reference notification endpoints, so the table likely exists in Supabase but isn't reflected in the TypeScript types.

5. **Denormalized counters** (`like_count`, `comment_count`, `follower_count`, etc.) without database triggers to maintain them. If the app doesn't update these consistently, counts will drift. Recommendation: Add Postgres triggers or use database functions to increment/decrement atomically.

6. **No `updated_at` column on `users` or `posts`.** Makes it impossible to sort by recently modified or detect stale data.

7. **Missing indexes.** The schema doesn't define indexes beyond the implied PK indexes. `posts.user_id`, `posts.tribe_id`, `posts.created_at`, `tribe_members(tribe_id, user_id)`, `user_relationships(follower_id)`, `user_relationships(followed_id)` all need indexes for query performance.

### Auth Provider Assessment

| Provider | Status | Work Needed |
|----------|--------|-------------|
| Email/Password | **Working** | Add password reset flow. Add email verification toggle. |
| Phone/SMS | **Not working** | Requires: Supabase phone provider enable, Twilio/MessageBird setup, OTP flow UI, cost management. |
| Google OAuth | **Code ready, not configured** | Requires: Google Cloud Console project, OAuth consent screen, Client ID/Secret, Supabase provider config, redirect URL verification. |

### RLS Assessment

**Current state: Insufficient and partially broken.**

- Storage RLS policies are generated as SQL strings but the code acknowledges it can't execute them (`"Manual policy needed"`). These must be run in Supabase SQL Editor.
- `tribe_members` and `posts` tables have circular RLS recursion documented in DatabaseDiagnostic.tsx. This likely causes query timeouts or infinite loops.
- Upload policies allow any authenticated user to upload to any path. Should restrict to `auth.uid()` matching the user folder in the path.
- No RLS policies for `post_comments`, `post_reactions`, `comment_reactions`, `post_bookmarks` are visible in the codebase. These may exist in Supabase but aren't documented.
- The `exec_sql()` function with SECURITY DEFINER is a **security risk**. It allows arbitrary SQL execution. This should be removed or heavily restricted.

### Storage Assessment

| Bucket | Purpose | Config | Issues |
|--------|---------|--------|--------|
| `make-70df0d6e-media` | Posts media | 5MB, public, image/video/audio types | Name is cryptic (hash-based). 5MB too small for video. Should be renamed to `tribe-media` or similar. |
| `avatars` | Profile pictures | 2MB, public, image types | Well-configured. |

**Storage path structure:** `posts/{userId}/{postId}` for media, `{userId}/{version}_{size}.webp` for avatars. This is reasonable but the `posts/` prefix means all media for all users is in one bucket. At scale, listing operations become slow. Acceptable for now.

### Proposed Schema Improvements

```sql
-- 1. Add unique constraints
ALTER TABLE post_reactions ADD CONSTRAINT unique_post_reaction
  UNIQUE (post_id, user_id);
ALTER TABLE post_bookmarks ADD CONSTRAINT unique_post_bookmark
  UNIQUE (post_id, user_id);
ALTER TABLE comment_reactions ADD CONSTRAINT unique_comment_reaction
  UNIQUE (comment_id, user_id);

-- 2. Add updated_at to key tables
ALTER TABLE users ADD COLUMN updated_at timestamptz DEFAULT now();
ALTER TABLE posts ADD COLUMN updated_at timestamptz DEFAULT now();

-- 3. Add points log table
CREATE TABLE user_points_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  action text NOT NULL, -- 'post_created', 'comment_added', 'like_received', etc.
  points integer NOT NULL,
  reference_type text, -- 'post', 'comment', 'tribe'
  reference_id uuid,
  created_at timestamptz DEFAULT now()
);

-- 4. Add reports table
CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES users(id),
  target_type text NOT NULL, -- 'post', 'comment', 'user', 'tribe'
  target_id uuid NOT NULL,
  reason text NOT NULL,
  status text DEFAULT 'pending', -- 'pending', 'reviewed', 'actioned', 'dismissed'
  created_at timestamptz DEFAULT now()
);

-- 5. Add user_blocks table
CREATE TABLE user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid REFERENCES users(id) ON DELETE CASCADE,
  blocked_id uuid REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);

-- 6. Add tribe_invites table
CREATE TABLE tribe_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tribe_id uuid REFERENCES tribes(id) ON DELETE CASCADE,
  invited_by uuid REFERENCES users(id),
  invited_user_id uuid REFERENCES users(id),
  status text DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  created_at timestamptz DEFAULT now()
);

-- 7. Add performance indexes
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_tribe_id ON posts(tribe_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_tribe_members_user ON tribe_members(user_id, tribe_id);
CREATE INDEX idx_user_relationships_follower ON user_relationships(follower_id);
CREATE INDEX idx_user_relationships_followed ON user_relationships(followed_id);
CREATE INDEX idx_post_comments_post ON post_comments(post_id, created_at);
CREATE INDEX idx_post_reactions_post ON post_reactions(post_id);
CREATE INDEX idx_post_bookmarks_user ON post_bookmarks(user_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);

-- 8. Add counter triggers (example for like_count)
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET reaction_count = reaction_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET reaction_count = GREATEST(reaction_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_post_reaction_count
AFTER INSERT OR DELETE ON post_reactions
FOR EACH ROW EXECUTE FUNCTION update_post_like_count();

-- 9. Update text limit to 500
-- (This is enforced in app code, not DB, but add a CHECK if desired)
ALTER TABLE posts ADD CONSTRAINT check_text_length
  CHECK (char_length(text_body) <= 500);

-- 10. Remove dangerous exec_sql function
DROP FUNCTION IF EXISTS public.exec_sql(text);
```

---

## 6. Android-Readiness Assessment

### What Is Web-Only and Won't Translate

| Issue | Impact | Recommendation |
|-------|--------|----------------|
| Custom URLRouter with regex | **High.** No deep linking support. Android needs proper route-based navigation. | Replace with React Router now. This benefits web AND makes Capacitor/React Native navigation easier. |
| `window.location.pathname` for routing | **High.** Direct DOM manipulation won't work in native webview without configuration. | Use a router library that abstracts navigation. |
| localStorage for session | **Medium.** Works in Capacitor webview but not in React Native. | Abstract storage behind an interface. Use `@capacitor/preferences` later. |
| MediaRecorder API (WebM) | **High.** Safari on iOS doesn't support WebM. Android Chrome does, but native apps should use native recording. | Add MP4 fallback. For Android, consider Capacitor camera plugin. |
| `navigator.mediaDevices` for camera | **Medium.** Works in Capacitor webview but native camera has better UX. | Use Capacitor Camera plugin for Android. Keep web fallback. |
| CSS `100vh` / safe area usage | **Medium.** Mobile browsers have quirky viewport behavior. Android notches need `env(safe-area-inset-*)`. | Already partially handled. Need thorough testing. |
| `window.dispatchEvent` for cross-component communication | **Medium.** Fragile pattern. Won't survive navigation stack changes. | Replace with proper state management (Zustand). |

### Interaction Patterns That Should Change for Mobile

- **Hamburger menu on right side.** Android convention is left-side navigation drawer or bottom navigation.
- **Bottom navigation bar exists** (MobileBottomNav.tsx) but unclear if it's the primary nav. Should be.
- **Sheet-based modals.** These translate well to mobile. Keep this pattern.
- **Drag-to-crop avatar.** Touch events are handled. This should work.
- **Long-press for post options.** Not currently implemented. Standard mobile pattern.

### Where Native Capture Will Be Needed

- **Camera:** Capacitor `@capacitor/camera` for photo/video with native quality, resolution options, and gallery access.
- **Audio:** Capacitor audio plugin for native recording with proper codec support.
- **File picker:** Capacitor `@capacitor/filesystem` for broader file access.
- **Push notifications:** `@capacitor/push-notifications` with Firebase Cloud Messaging.
- **Share:** `@capacitor/share` for native share sheet.

### What Should Be Done Now for Easier Android Transition

1. **Install React Router.** This is the single most impactful change for Android readiness.
2. **Abstract storage.** Create a `StorageService` interface that wraps localStorage now and can swap to Capacitor Preferences later.
3. **Abstract media capture.** Create a `CaptureService` interface that uses browser APIs now and can swap to Capacitor plugins.
4. **Add MP4 video support.** Don't rely solely on WebM.
5. **Use Zustand for state.** Replace window events and excessive prop drilling.
6. **Move to environment variables.** Create proper `.env` file for Supabase config.
7. **Use relative imports with `@/` alias consistently.** Already configured, just ensure consistent usage.

---

## 7. Auth Strategy Recommendation

### Recommended Auth Sequencing

| Order | Method | Timeline | Rationale |
|-------|--------|----------|-----------|
| **1st (MVP)** | Email/Password | Now (already working) | Lowest friction to implement. Already functional. Add password reset and you're production-ready. |
| **2nd** | Google OAuth | Week 2-3 | High conversion rate. Most users have Google. Supabase makes this straightforward once configured. ~2-4 hours of setup. |
| **3rd (Later)** | Phone/SMS | Week 5+ or Android launch | Higher implementation complexity. Requires Twilio, costs money per SMS, has phone number verification compliance requirements. Best suited for Android where phone numbers are the native identity. |

### Tradeoffs

| Method | Pros | Cons |
|--------|------|------|
| **Email/Password** | Simple, free, universal, works everywhere, already implemented | Password fatigue, users forget passwords, need password reset flow |
| **Google OAuth** | One-tap signup, high trust, no password to remember, broad reach | Google Cloud Console setup, redirect URL management, dependency on Google, some users avoid Google tracking |
| **Phone/SMS** | Native mobile feel, high trust in some markets, no password needed | Costs $0.01-0.05/SMS, requires Twilio, compliance requirements, phone number portability issues, complex OTP flow |

### Implementation Complexity in Supabase

| Method | Complexity | Effort | Dependencies |
|--------|-----------|--------|--------------|
| Email/Password | **Low** | Done | None |
| Google OAuth | **Low-Medium** | 2-4 hours | Google Cloud Console project, OAuth consent screen, Supabase dashboard config |
| Phone/SMS | **Medium-High** | 1-2 days | Twilio account, phone provider config in Supabase, OTP UI flow, error handling for delivery failures, cost monitoring |

### Risk Assessment

| Method | Web Risk | Android Risk |
|--------|----------|--------------|
| Email | Low | Low |
| Google | Low (well-documented) | Low (Capacitor has Google Sign-In plugin) |
| Phone | Medium (OTP delivery issues) | Low-Medium (Android has SMS auto-read, but still needs Twilio) |

### Recommended Auth Stack for Next 2-4 Weeks

**Week 1-2:**
- Fix the current email auth: add password reset flow, remove fake phone-to-email hack, add proper error messages
- Move Supabase credentials to `.env` file

**Week 3:**
- Set up Google Cloud Console project
- Configure Google as OAuth provider in Supabase
- Test redirect flow on web
- Update LoginFlow.tsx to handle successful Google auth

**Week 4:**
- Remove Facebook OAuth stubs (not in product spec, adds confusion)
- Add "Sign up with Google" to SignupFlow.tsx
- Test full signup-to-profile flow for both email and Google

**Phone auth: Defer to Android launch sprint.** The fake phone auth should be removed now. Real phone auth should launch alongside the Android app where it's most natural.

---

## 8. Recommended Roadmap by Waves

### Wave 0: Critical Cleanup (1-2 weeks)

**Goals:** Remove dead code, fix security issues, establish development standards.

| Task | Type | Effort | Impact | Risk |
|------|------|--------|--------|------|
| Delete ~50 test/debug/diagnostic components | Frontend | Low | High | Low |
| Delete temp files, .bak files, planning docs from src/ | Frontend | Low | Medium | Low |
| Remove `exec_sql()` function from database | Database | Low | High | Low |
| Move Supabase credentials to `.env` file | Infra | Low | High | Low |
| Create logging utility, replace 539+ console.logs | Frontend | Medium | Medium | Low |
| Fix `TEXT_CONTENT_LIMIT` from 250 to 500 | Frontend/DB | Low | Medium | Low |
| Consolidate duplicate components (pick canonical profile page, bio editor, avatar uploader) | Frontend | Medium | High | Medium |
| Add unique constraints to reaction/bookmark tables | Database | Low | High | Low |
| Add `updated_at` columns to users and posts | Database | Low | Medium | Low |
| Remove fake phone-to-email auth hack | Frontend | Low | Medium | Low |
| Remove Facebook OAuth stubs | Frontend | Low | Low | Low |
| Add performance indexes to database | Database | Low | High | Low |

### Wave 1: Foundation and Architecture (2-3 weeks)

**Goals:** Establish proper routing, state management, and API patterns that will support all future work.

| Task | Type | Effort | Impact | Risk | Depends On |
|------|------|--------|--------|------|------------|
| Install and configure React Router | Frontend | Medium | High | Medium | Wave 0 cleanup |
| Replace view-state switching with route-based navigation | Frontend | High | High | Medium | React Router |
| Implement proper deep linking (`/u/:username`, `/tribe/:id`, `/post/:id`) | Frontend | Medium | High | Low | React Router |
| Install Zustand for state management | Frontend | Medium | High | Medium | - |
| Migrate bookmark state from App.tsx to Zustand store | Frontend | Medium | Medium | Low | Zustand |
| Migrate auth/session state to Zustand store | Frontend | Medium | High | Low | Zustand |
| Create `StorageService` abstraction over localStorage | Frontend | Low | Medium | Low | - |
| Create `CaptureService` abstraction over browser media APIs | Frontend | Medium | Medium | Low | - |
| Add password reset flow to auth | Frontend/Backend | Medium | High | Low | - |
| Configure Google OAuth in Supabase | Backend/Infra | Low | High | Low | Google Cloud setup |
| Wire up Google sign-in end-to-end | Frontend | Medium | High | Low | Google OAuth config |
| Fix RLS circular recursion on tribe_members and posts | Database | Medium | High | Medium | - |
| Create proper RLS policies for all tables | Database | High | High | Medium | - |
| Set up Vitest + Testing Library | Frontend | Medium | Medium | Low | - |

### Wave 2: Core Social Product Completion (3-4 weeks)

**Goals:** Complete the social features that make the app usable and engaging.

| Task | Type | Effort | Impact | Risk | Depends On |
|------|------|--------|--------|------|------------|
| Wire DiscoverTribesPage to Supabase (replace hardcoded data) | Frontend/Backend | Medium | High | Low | RLS fix |
| Build tribe creation flow (form, validation, backend) | Frontend/Backend | High | High | Medium | Tribe schema ready |
| Build tribe join/leave with backend persistence | Frontend/Backend | Medium | High | Low | Tribe creation |
| Build tribe feed (posts scoped to a tribe) | Frontend/Backend | Medium | High | Low | Tribe membership |
| Build tribe settings page (owner/admin) | Frontend/Backend | Medium | Medium | Low | Tribe creation |
| Add onboarding flow for new users | Frontend/UX | Medium | High | Low | - |
| Add global search (users, tribes) | Frontend/Backend | High | High | Medium | - |
| Complete comment threading UI | Frontend | Medium | Medium | Low | - |
| Add comment edit/delete | Frontend/Backend | Medium | Medium | Low | - |
| Add share functionality (copy link, native share API) | Frontend | Medium | Medium | Low | React Router (for URLs) |
| Build saved posts page properly | Frontend | Low | Medium | Low | - |
| Add profile completeness indicator | Frontend/UX | Low | Medium | Low | Onboarding |
| Implement username uniqueness validation | Frontend/Backend | Low | Medium | Low | - |
| Increase video upload limit to 50MB | Backend/Infra | Low | Medium | Low | - |

### Wave 3: Tribe/Community Depth (2-3 weeks)

**Goals:** Make tribes the core differentiator of the product.

| Task | Type | Effort | Impact | Risk | Depends On |
|------|------|--------|--------|------|------------|
| Tribe invite system | Frontend/Backend/DB | Medium | High | Low | tribe_invites table |
| Tribe role management (promote/demote members) | Frontend/Backend | Medium | Medium | Low | Tribe settings |
| Tribe rules display and enforcement | Frontend/UX | Low | Medium | Low | Tribe creation |
| Tribe discovery algorithm (trending, recommended) | Backend | High | High | Medium | Usage data |
| Private tribe access requests | Frontend/Backend | Medium | Medium | Low | Tribe invite system |
| Tribe member list view | Frontend | Low | Medium | Low | - |
| Cross-tribe posting | Frontend/Backend | Medium | Low | Medium | Multiple tribes |
| Content moderation: report flow | Frontend/Backend/DB | Medium | High | Low | reports table |
| User blocking | Frontend/Backend/DB | Medium | High | Low | user_blocks table |

### Wave 4: Gamification and Retention (2-3 weeks)

**Goals:** Build the engagement loop that drives daily active usage.

| Task | Type | Effort | Impact | Risk | Depends On |
|------|------|--------|--------|------|------------|
| Define point values for each action | Product/UX | Low | High | Low | - |
| Create `user_points_log` table | Database | Low | Medium | Low | - |
| Implement point awarding via database triggers or edge functions | Backend | Medium | High | Medium | Points table |
| XP/level display on profile | Frontend | Low | Medium | Low | Points working |
| Level-up notification/celebration UI | Frontend/UX | Medium | Medium | Low | Points working |
| Achievement definitions and awarding logic | Backend | High | Medium | Medium | Points working |
| Achievement badges display on profile | Frontend | Medium | Medium | Low | Achievements |
| Leaderboard (tribe-level and global) | Frontend/Backend | Medium | Medium | Low | Points working |
| Daily engagement streak tracking | Backend | Medium | Medium | Low | Points working |
| Points breakdown page (history of earned points) | Frontend | Medium | Low | Low | Points log |

### Wave 5: Android Readiness and Deployment (3-4 weeks)

**Goals:** Ship to Android via Capacitor or prepare for React Native migration.

| Task | Type | Effort | Impact | Risk | Depends On |
|------|------|--------|--------|------|------------|
| Evaluate Capacitor vs React Native for Android | Architecture | Low | High | Low | - |
| Set up Capacitor (if chosen) with Android project | Infra | Medium | High | Medium | - |
| Replace browser camera with Capacitor Camera plugin | Frontend | Medium | High | Low | Capacitor |
| Replace browser audio recording with native plugin | Frontend | Medium | Medium | Low | Capacitor |
| Implement push notifications (FCM + Capacitor plugin) | Frontend/Backend/Infra | High | High | Medium | Capacitor |
| Implement real phone auth (Twilio + Supabase) | Backend/Infra | High | High | Medium | - |
| Build OTP input UI for phone auth | Frontend | Medium | Medium | Low | Phone auth backend |
| Native share sheet integration | Frontend | Low | Medium | Low | Capacitor |
| Android-specific navigation testing | QA | Medium | High | Medium | Capacitor |
| Android performance optimization | Frontend | Medium | Medium | Medium | Capacitor |
| Google Play Store listing and submission | Infra | Medium | High | Medium | All above |
| Responsive layout audit for Android screen sizes | Frontend/UX | Medium | Medium | Low | - |

---

## 9. Top Priorities and Risks

### Top 10 Most Important Next Actions

1. **Delete 50+ test/debug/diagnostic components and temp files.** This is pure noise reduction. Immediate clarity improvement.
2. **Move Supabase credentials to `.env` file.** Security baseline. Do this before any public deployment.
3. **Remove `exec_sql()` function from Supabase.** Arbitrary SQL execution is a critical security vulnerability.
4. **Install React Router and replace view-state routing.** This is the single highest-impact architectural change. It unblocks deep linking, proper navigation, browser history, and Android readiness.
5. **Fix RLS circular recursion on tribe_members and posts.** This is causing query failures and is blocking proper data access control.
6. **Wire DiscoverTribesPage to real Supabase data.** The UI is ready. The backend tables exist. Connect them.
7. **Build tribe creation flow.** Without this, the core product concept doesn't function.
8. **Add password reset to email auth.** Users will forget passwords. Without this, they're locked out.
9. **Configure and enable Google OAuth.** Highest-ROI second auth method. Most setup is in Google Cloud Console, not code.
10. **Add unique constraints to reaction/bookmark tables.** Prevents data corruption from double-likes/bookmarks.

### Top 5 Technical Risks

1. **RLS policy recursion.** If not fixed, any query touching tribe_members or posts through RLS could hang or error. This could make the app unusable for tribe-scoped content.
2. **No router library.** Every new feature that needs a URL (sharing, deep links, notifications, Android navigation) will be blocked or hacked around. This is load-bearing technical debt.
3. **No test suite.** With 240 components and zero tests, any refactoring is a gamble. Regressions will be caught by users, not CI.
4. **Hardcoded credentials in source.** If this repo is ever public or the build artifacts are inspected, the Supabase anon key is exposed. While anon keys are designed to be public, the pattern is wrong and could lead to service key exposure later.
5. **5MB video upload limit.** A 30-second phone video is typically 30-100MB. Users will not be able to post video content meaningfully. This limits a core feature.

### Top 5 Product/UX Risks

1. **Tribes don't work.** The product is called "Tribe Social" and tribes are non-functional. First-time users will try to create or join a tribe and hit a dead end.
2. **No onboarding.** New users see an empty feed. No profile prompt, no tribe suggestions, no first-post nudge. This is where most users will churn.
3. **Fake phone auth.** Users entering their phone number and then being asked for a password (not an OTP) will feel confused and distrustful. Either do phone auth properly or remove the option.
4. **No gamification loop.** Points/levels are visible in code but nothing awards them. The engagement loop that would differentiate Tribe from other social apps doesn't exist yet.
5. **Component chaos.** 6 profile pages, 4 bio editors, 3 avatar uploaders. If different user paths hit different implementations, the experience is inconsistent and bugs are harder to track.

### Top 5 Supabase/Schema Fixes

1. **Fix RLS circular recursion** on tribe_members and posts tables.
2. **Add unique constraints** to post_reactions(post_id, user_id), post_bookmarks(post_id, user_id), comment_reactions(comment_id, user_id).
3. **Add performance indexes** on all foreign key columns and common query patterns (posts.created_at DESC, posts.user_id, etc.).
4. **Add database triggers** for denormalized counters (like_count, comment_count, follower_count) to prevent drift.
5. **Remove `exec_sql()` function.** Replace with specific, scoped functions for any admin operations needed.

### What Must Be Done Before Adding Any New Features

1. Delete dead code (test/debug/diagnostic components, temp files, .bak files)
2. Move credentials to `.env`
3. Remove `exec_sql()` security vulnerability
4. Install React Router
5. Consolidate duplicate component implementations
6. Fix RLS policies
7. Add unique constraints to prevent data corruption
8. Set up basic testing infrastructure (Vitest)

---

## 10. Recommended MVP Definition

An MVP of Tribe Social should include:

- **Auth:** Email/password with password reset + Google OAuth
- **Profile:** Create account, set username, upload avatar, edit bio
- **Posts:** Create text thoughts (500 char limit), image posts, audio posts. Upload from device or capture in-app.
- **Feed:** Chronological feed of posts from followed users and joined tribes
- **Engagement:** Like posts, comment on posts (flat, not threaded), bookmark/save posts
- **Tribes:** Create a tribe, join/leave tribes, discover tribes, post to a tribe, view tribe feed
- **Profiles:** View other users' profiles and their posts
- **Follow:** Follow/unfollow users

**Not in MVP:** Video posts (compression complexity), stories, threaded comments, gamification, achievements, phone auth, admin tools, push notifications, private tribes, moderation tools.

---

## 11. Recommended "Build Next" Sequence (Next 2-4 Weeks)

**Week 1: Cleanup Sprint**
- Day 1-2: Delete all test/debug/diagnostic files. Remove temp files. Move credentials to .env.
- Day 3: Remove exec_sql(). Add unique constraints and indexes. Fix TEXT_CONTENT_LIMIT to 500.
- Day 4-5: Consolidate components (pick one profile page, one bio editor, one avatar uploader). Remove duplicates.

**Week 2: Architecture Sprint**
- Day 1-3: Install React Router. Replace view-state routing with route-based navigation. Set up routes for /, /login, /signup, /feed, /u/:username, /tribe/:id, /post/:id, /settings.
- Day 4-5: Install Zustand. Migrate auth state and bookmark state out of App.tsx.

**Week 3: Auth + Tribes Sprint**
- Day 1: Add password reset flow.
- Day 2: Configure Google OAuth in Supabase + Google Cloud Console.
- Day 3: Wire Google sign-in end-to-end.
- Day 4-5: Wire DiscoverTribesPage to Supabase. Build tribe creation form.

**Week 4: Tribes + Polish Sprint**
- Day 1-2: Complete tribe join/leave with backend persistence. Build tribe feed.
- Day 3: Build basic onboarding flow (profile completion + tribe suggestions).
- Day 4: Fix RLS policies for tribe_members and posts.
- Day 5: Testing, bug fixes, and stabilization.

**End of Week 4 Target State:**
- Clean codebase (~150 components instead of 240)
- Proper routing with deep links
- Centralized state management
- Email + Google auth working
- Tribes functional end-to-end
- Basic onboarding for new users
- Secure RLS policies
- Ready to begin gamification and Android prep

---

# PART 2: Supabase Backend Audit (Live Dashboard Inspection)

**Inspected:** 2026-04-11 via Supabase Dashboard
**Project:** Tribe App | Skyfall Consulting | Free tier (Nano)
**Region:** AWS us-west-1 (West US, North California)
**Project ID:** wrukreoxdexnfufyftvs

---

## 12. Database Tables (Actual vs Codebase)

**Total tables found: 24** (includes views)

This is significantly more than what `database-types.tsx` defines. The codebase types file defines 12 tables. The actual database has 24. This means **12 tables/views exist in the database that are NOT reflected in the TypeScript types**, creating a dangerous drift between code and schema.

### Complete Table Inventory

| # | Table | Columns (Key) | In TypeScript Types? | Status |
|---|-------|---------------|---------------------|--------|
| 1 | `achievements` | id, name, description, created_at | NO | Orphaned - exists but no frontend integration |
| 2 | `follows` | id, follower_id, following_id, created_at | NO (uses `user_relationships` instead) | **Duplicate of user_relationships** |
| 3 | `kv_store_70df0d6e` | key, value (jsonb) | NO | Edge function internal key-value store |
| 4 | `notifications` | id, user_id, actor_id, type, entity_type, entity_id, data, created_at, read_at, title, message, actor_user_id, post_id, story_id, tribe_id, is_read, related_id, related_data | NO | **18 columns - massively over-engineered.** Has redundant fields (actor_id AND actor_user_id, data AND related_data, read_at AND is_read) |
| 5 | `post_bookmarks` | id, user_id, post_id, created_at | YES | Clean |
| 6 | `post_comments` | id, post_id, user_id, created_at, body | YES (but types say `content`, DB says `body`) | **Column name mismatch** |
| 7 | `post_likes` | id, post_id, user_id, created_at | NO | **Duplicate of post_reactions** - both exist |
| 8 | `post_reactions` | id, post_id, user_id, reaction, created_at | YES (but types say `reaction_type`, DB says `reaction`) | **Column name mismatch** |
| 9 | `post_tribes` | id, post_id, tribe_id, created_at | NO | Junction table - posts already have tribe_id FK |
| 10 | `posts` | id, user_id, post_type, caption, text_body (varchar), media_url, media_thumb_url, media_duration_seconds, media_width, media_height, visibility, like_count, comment_count, created_at, tribe_id, share_count, thumbnail_url | YES (partial match) | **Missing from types: media_duration_seconds, media_width, media_height, thumbnail_url. Missing from DB: reaction_count** |
| 11 | `posts_with_reaction_count` | Same as posts + reaction_count (bigint) | NO | **Database VIEW** - not a table |
| 12 | `profiles` | id, display_name, avatar_url, xp, achievements (jsonb), created_at, core_realm, bio, updated_at, nickname, username, description, avatar_version, theme | NO (not in database-types but extensively used in code) | **14 columns.** Overlaps heavily with `users` table. |
| 13 | `saved_posts` | (likely similar to post_bookmarks) | NO | **Duplicate of post_bookmarks** |
| 14 | `stories` | id, user_id, media_url, ... | YES | Not in product spec |
| 15 | `stories_compat` | id, user_id, tribe_id, type, media_type, media_url, caption, media_width, media_height, duration_seconds, created_at, expires_at | NO | **Second stories table.** Compatibility layer? |
| 16 | `story_reactions` | id, story_id, user_id, reaction, created_at | YES | Not needed for MVP |
| 17 | `story_views` | id, story_id, viewer_id, viewed_at | YES (but types say `user_id`, DB says `viewer_id`) | **Column name mismatch** |
| 18 | `tribe_members` | id, tribe_id, user_id, role (enum), joined_at | YES | Clean |
| 19 | `tribes` | id, slug, name, description, is_public, creator_id, icon_url, banner_url, theme (enum), rules, member_count, post_count, created_at, updated_at | YES (partial) | **Mismatches: types say `owner_id`/`is_private`/`avatar_url`, DB says `creator_id`/`is_public`/`icon_url`** |
| 20 | `user_achievements` | user_id, achievement_id, earned_at | NO | Junction table for achievements |
| 21 | `user_public_profile` | id, username, profile_image_url, ... | Defined as type but not as table | **Likely a VIEW** |
| 22 | `user_relationships` | id, follower_id, followed_id, created_at | YES | Duplicates `follows` table |
| 23 | `users` | id, username, email, phone, ... (many columns) | YES | Core table |
| 24 | `v_profile_counts` | user_id, followers_count, ... | NO | **Database VIEW** for profile stats |

### Critical Schema Issues Found

1. **Duplicate tables doing the same thing:**
   - `follows` AND `user_relationships` - both store follow relationships with nearly identical schemas
   - `post_likes` AND `post_reactions` - both store post engagement
   - `post_bookmarks` AND `saved_posts` - both store saved/bookmarked posts
   - `stories` AND `stories_compat` - two stories tables

2. **Column name mismatches between TypeScript types and actual database:**
   - `post_comments`: Types say `content`, DB column is `body`
   - `post_reactions`: Types say `reaction_type`, DB column is `reaction`
   - `story_views`: Types say `user_id`, DB column is `viewer_id`
   - `tribes`: Types say `owner_id`, DB says `creator_id`; types say `is_private`, DB says `is_public` (inverted logic!); types say `avatar_url`, DB says `icon_url`
   - `post_comments`: Types define `parent_comment_id`, `like_count`, `reply_count` - **these columns may not exist in DB** (only id, post_id, user_id, created_at, body found)

3. **`profiles` table is a shadow of `users`:**
   - Has 14 columns including display_name, avatar_url, xp, achievements, core_realm, bio, nickname, username, description, avatar_version, theme
   - Many of these fields duplicate what's in `users`
   - Code writes to both tables, creating data inconsistency

4. **`notifications` table is bloated:**
   - 18 columns with multiple redundancies
   - `actor_id` AND `actor_user_id` (same concept, two columns)
   - `data` (jsonb) AND `related_data` (jsonb) (overlapping purpose)
   - `read_at` (timestamp) AND `is_read` (boolean) (redundant)
   - Should be simplified to ~8-10 columns

5. **Missing `parent_comment_id` in actual DB:**
   - The TypeScript types define `parent_comment_id` for comment threading
   - The actual DB `post_comments` table only shows: id, post_id, user_id, created_at, body
   - **Comment threading may not work at the database level**

---

## 13. RLS Policies Audit (Live)

**Total policies found: 69 across public schema tables**

### Policy Summary by Table

| Table | # Policies | Issues |
|-------|-----------|--------|
| `follows` | 7 | **Duplicate policies!** `follows.delete.self` AND `follows_delete_self` do the same thing. `follows.insert.self` AND `follows_insert_self` are duplicates. 3 different SELECT policies all evaluating to `true`. |
| `notifications` | 3 | Insert for owner, Read own, Update own. Reasonable but missing DELETE. |
| `post_bookmarks` | 2 | Insert own, Select own. **Missing DELETE** - users can't remove bookmarks via RLS. |
| `post_comments` | 5+ | Has both named styles (`Read comments`, `Delete own comment`) and snake_case (`read_comments`, `delete_own_comments`). **Duplicate policies.** One SELECT uses `can_view_post(post_id)`, another just uses `true`. |
| `post_reactions` | 3 | Delete own, Insert own, Read reactions. Clean. Uses `can_view_post()`. |
| `post_tribes` | 2+ | Delete/Insert based on post author. |
| `posts` | 5 | Delete own, Insert own, Read (with `can_view_post`), Read public, Update own. Has both `can_view_post(id)` AND `visibility = 'public' OR user_id = auth.uid()`. **Duplicate/conflicting SELECT policies.** |
| `profiles` | 3 | Insert own, Select own (`auth.uid() = id`), Update own. **SELECT is too restrictive** - other users can't see your profile! |
| `saved_posts` | 6 | **Heavy duplication:** `Delete own saved`/`delete own save`, `Insert own saved`/`insert own save`, `Select own saved`/`read own saves`. Three pairs of duplicates. |
| `stories` | Not fully captured | Standard CRUD patterns. |
| `story_reactions` | 3 | Delete own, Insert own, Read (uses `can_view_story()`). |
| `story_views` | 2 | Insert own, Read (uses `can_view_story()`). |
| `tribe_members` | 3 | Join as self, Leave as self (delete where user_id = auth.uid()), Select self. **SELECT only shows own memberships** - can't see other members of a tribe. |
| `tribes` | 4 | Create, Delete (owner), Read (public or member via `is_tribe_member()`), Update (owner/admin). Well-structured. |
| `user_relationships` | 3 | Delete own follow, Insert own, Select (authenticated only). |
| `users` | 5+ | Insert own, Select own, Update own (multiple policies for different fields). Has both `Public profile read (limited)` (authenticated) AND `Users can select their own profile` (id = auth.uid()). **Other authenticated users can only see limited data, not full profile.** |

### Critical RLS Issues

1. **Massive policy duplication.** Multiple tables have duplicate policies with slightly different names doing the same thing. This creates confusion and potential for conflicting behavior. The `follows` table has 7 policies when 3 would suffice. The `saved_posts` table has 6 policies when 3 would suffice.

2. **`profiles` SELECT policy is too restrictive.** `auth.uid() = id` means you can only read YOUR OWN profile. Other users cannot see your display name, avatar, or bio through this table. This likely forces the app to use the `users` table or views for public profile data, which is why there's a `user_public_profile` view.

3. **`tribe_members` SELECT too restrictive.** `user_id = auth.uid()` means you can only see your own membership. You can't list other members of a tribe you belong to. This breaks tribe member lists.

4. **`post_bookmarks` missing DELETE policy.** Users can insert but can't remove bookmarks through RLS. The app likely bypasses this via the edge function using service role.

5. **Conflicting SELECT on `posts`.** Two different SELECT policies: one using `can_view_post(id)` function, another with inline logic `visibility = 'public' OR user_id = auth.uid()`. When both are PERMISSIVE, either can grant access, so the simpler one may override the privacy function.

6. **`can_view_post()` function dependency.** Several tables' RLS policies depend on the `can_view_post()` database function. If this function has bugs or performance issues, it affects comments, reactions, saved posts, and posts themselves.

7. **No RLS on `achievements`, `kv_store_70df0d6e`, `post_likes`, `stories_compat`, `user_achievements`, or `v_profile_counts`.** These tables either have RLS disabled or no policies defined.

---

## 14. Auth Providers (Live Dashboard)

### Configuration

| Setting | Value |
|---------|-------|
| User signups | **Enabled** |
| Manual linking | Disabled |
| Anonymous sign-ins | Disabled |
| Confirm email | **Enabled** |

### Provider Status

| Provider | Status |
|----------|--------|
| **Email** | **ENABLED** (only enabled provider) |
| **Phone** | **DISABLED** |
| **Google** | **DISABLED** |
| Apple | Disabled |
| Facebook | Disabled |
| GitHub | Disabled |
| All others (20+) | Disabled |

### Auth Findings

1. **Email is the ONLY working auth method.** Despite the app having Google OAuth code and a phone signup flow, neither provider is enabled in Supabase.

2. **Phone auth requires SMS provider setup.** Even enabling the Phone toggle requires configuring Twilio, MessageBird, or Vonage. This is not just a toggle flip.

3. **Google OAuth requires Google Cloud Console setup.** Need to create OAuth credentials, configure consent screen, add redirect URLs, then paste Client ID and Client Secret into Supabase.

4. **Confirm email is enabled.** This means the edge function's `email_confirm: true` parameter in `admin.createUser()` is correct - it bypasses email confirmation for server-created users. But users signing up directly via the client SDK would need to verify their email.

5. **20 users in the system.** All are email-based. One has the fake phone email pattern (`4153717722@phone-signup.tribal`), confirming the phone auth workaround exists in production data.

6. **No backups configured.** The dashboard shows "No backups." On the free tier this is expected, but data loss is a risk.

---

## 15. Storage Buckets (Live Dashboard)

### Buckets Found

| Bucket | Public | RLS Policies | Size Limit | MIME Types |
|--------|--------|-------------|------------|------------|
| `avatars` | Yes | 4 | 2 MB | image/jpeg, jpg, png, webp |
| `make-70df0d6e-avatars` | Yes | **0** | 50 MB (default) | image/* |
| `make-70df0d6e-audio` | Yes | **0** | 50 MB (default) | audio/* |
| `make-70df0d6e-media` | Yes | 5 | 50 MB (default) | image/*, video/*, audio/* |

### Storage Findings

1. **Duplicate avatar buckets.** `avatars` (properly configured, 2MB limit, 4 policies) AND `make-70df0d6e-avatars` (no policies, no size limit). The code references `avatars` as the primary bucket. The second one is orphaned.

2. **Two buckets have ZERO RLS policies.** `make-70df0d6e-avatars` and `make-70df0d6e-audio` have no access policies. On public buckets this means anyone can upload anything (up to 50MB) without authentication.

3. **Size limit mismatch.** The code defines `MAX_FILE_SIZE = 5 * 1024 * 1024` (5MB) in `storage-constants.ts`, but the actual bucket `make-70df0d6e-media` has no explicit limit (defaults to 50MB). The code enforces the limit client-side, but server-side accepts up to 50MB. This is actually better for video, but the client-side validation blocks files over 5MB unnecessarily.

4. **Bucket naming is confusing.** The hash-based names (`make-70df0d6e-*`) are not human-readable. These should be renamed to `tribe-media`, `tribe-audio`, etc.

5. **Separate audio bucket is unnecessary.** `make-70df0d6e-audio` duplicates functionality already in `make-70df0d6e-media` which accepts audio/*. Should consolidate.

---

## 16. Edge Functions (Live Dashboard)

### Functions Found

| Name | URL | Created | Updated | Deployments |
|------|-----|---------|---------|-------------|
| `make-server-70df0d6e` | `https://wrukreoxdexnfufyftvs.supabase.co/functions/v1/make-server-70df0d6e` | 8 months ago | **7 months ago** | 227 |

### Edge Function Findings

1. **Single monolithic edge function.** All API routes (auth, posts, comments, likes, bookmarks, notifications, profile, follow, storage) are served through one Hono-based function. This is acceptable for MVP but becomes a deployment risk at scale - any change to any route requires redeploying everything.

2. **Not updated in 7 months.** The function was last deployed 7 months ago. If the codebase has changed since then, the deployed function may be out of sync with what's in the source code.

3. **227 deployments** suggest active iterative development in the past but stagnation recently.

4. **Hash-based naming** (`make-server-70df0d6e`) is not descriptive. Should be renamed to something like `tribe-api` for clarity.

---

## 17. Database Functions (From Codebase)

From `sql-functions.sql`:

| Function | Purpose | Security | Risk |
|----------|---------|----------|------|
| `exec_sql(text)` | Execute arbitrary SQL | SECURITY DEFINER | **CRITICAL SECURITY RISK** - allows any SQL via service role |
| `can_view_post(uuid, text, uuid, uuid)` | Check post visibility | SECURITY DEFINER | Used by RLS policies. If buggy, breaks all content access |
| `get_effective_post_visibility(text, text)` | Calculate effective visibility | IMMUTABLE | Safe - pure function |
| `create_storage_bucket(text, boolean)` | Create storage buckets via SQL | SECURITY DEFINER | Acceptable for admin use only |

Additionally, the RLS policies reference functions that must exist in the database:
- `can_view_post(post_id)` - referenced by post_comments, post_reactions SELECT policies
- `can_view_story(story_id)` - referenced by story_reactions, story_views SELECT policies
- `is_tribe_member(tribe_id)` - referenced by tribes SELECT policy

---

## 18. Revised Recommendations Based on Backend Audit

### Immediate Actions (Before Any New Features)

1. **Delete `exec_sql()` function.** This is a SQL injection vector. Remove it immediately.

2. **Resolve duplicate tables.** Choose one and migrate data:
   - Keep `user_relationships`, delete `follows` (or vice versa)
   - Keep `post_reactions`, delete `post_likes`
   - Keep `post_bookmarks`, delete `saved_posts`
   - Keep `stories` (or delete both if not in MVP), delete `stories_compat`

3. **Fix TypeScript type definitions** to match actual database column names:
   - `post_comments.content` → `post_comments.body`
   - `post_reactions.reaction_type` → `post_reactions.reaction`
   - `story_views.user_id` → `story_views.viewer_id`
   - `tribes.owner_id` → `tribes.creator_id`
   - `tribes.is_private` → `tribes.is_public` (invert logic)
   - `tribes.avatar_url` → `tribes.icon_url`

4. **Deduplicate RLS policies.** Remove the duplicate policies on `follows`, `post_comments`, `saved_posts`. Each table should have ONE policy per operation (SELECT, INSERT, UPDATE, DELETE).

5. **Fix `profiles` SELECT policy.** Change from `auth.uid() = id` to allow public read of non-sensitive fields, or rely entirely on `users` table and `user_public_profile` view.

6. **Fix `tribe_members` SELECT policy.** Allow members to see other members in the same tribe: `user_id = auth.uid() OR tribe_id IN (SELECT tribe_id FROM tribe_members WHERE user_id = auth.uid())`.

7. **Add DELETE policy to `post_bookmarks`.** Users need to be able to un-bookmark posts.

8. **Remove conflicting `posts` SELECT policies.** Keep only the `can_view_post()` version. Remove the inline `visibility = 'public' OR user_id = auth.uid()` version.

9. **Clean up orphaned storage buckets.** Delete `make-70df0d6e-avatars` and `make-70df0d6e-audio`. Add RLS policies to `make-70df0d6e-media` if missing.

10. **Update client-side file size limit** from 5MB to match actual bucket limits, or set proper bucket-level limits.

### Schema Consolidation Plan

```
Tables to KEEP (12):
  users, profiles (simplified), tribes, tribe_members,
  posts, post_comments, post_reactions, post_bookmarks,
  notifications (simplified), user_relationships,
  achievements, user_achievements

Tables to DELETE (8):
  follows (duplicate of user_relationships)
  post_likes (duplicate of post_reactions)
  saved_posts (duplicate of post_bookmarks)
  stories (not in MVP)
  stories_compat (not in MVP)
  story_reactions (not in MVP)
  story_views (not in MVP)
  kv_store_70df0d6e (internal, keep if edge function needs it)

Tables/Views to KEEP AS-IS (4):
  posts_with_reaction_count (useful view)
  user_public_profile (useful view)
  v_profile_counts (useful view)
  post_tribes (junction table, may be useful)
```

### Profiles Table Decision

The `profiles` table (14 columns) heavily overlaps with `users`. Recommended approach:
- **Option A (Recommended):** Merge unique profile fields into `users`. Delete `profiles`. Simpler, one source of truth.
- **Option B:** Keep `profiles` as the public-facing table with only display fields (display_name, bio, avatar_url, theme). Make `users` the auth/system table. Update all code to be consistent about which table to read/write.

Either way, **stop writing to both tables simultaneously.**

---

## 19. Summary: Delta Between Codebase Audit and Backend Reality

| Area | Codebase Assumption | Backend Reality | Impact |
|------|-------------------|-----------------|--------|
| Tables | 12 defined in TypeScript | 24 exist in database | Half the tables are unknown to the type system |
| Column names | As defined in database-types.tsx | Multiple mismatches | Queries may silently fail or return unexpected data |
| Auth providers | Google OAuth code exists | Google is disabled | Google login will always fail |
| Auth providers | Phone signup flow exists | Phone is disabled | Phone "auth" is fake email workaround |
| RLS policies | Code acknowledges recursion issues | 69 policies with heavy duplication | Unpredictable access control behavior |
| Storage | Code expects 5MB limit | Buckets allow 50MB | Client blocks valid uploads unnecessarily |
| Storage | Code references 2 buckets | 4 buckets exist | 2 orphaned buckets with no policies |
| Edge function | Code in repo | Last deployed 7 months ago | May be out of sync |
| Comment threading | TypeScript defines parent_comment_id | DB may lack this column | Threading may not work |

**This drift between code and database is the single biggest technical risk in the project.** Every feature built on incorrect type assumptions is fragile. The first priority should be regenerating `database-types.tsx` from the actual schema using `supabase gen types typescript`.
