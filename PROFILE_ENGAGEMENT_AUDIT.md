# Tribe Social — Profile & Engagement UX Audit

## 1. Executive Summary

The profile and engagement system has **solid backend architecture** (optimistic updates, UUID validation, proper Supabase integration) but suffers from **massive dead code** (~400KB of unused profile variants) and **incomplete features** (comment threading not wired, comment likes not functional). The canonical profile page (UnifiedProfilePage.tsx, 1,075 lines) works but should be split into smaller components. Engagement interactions (likes, bookmarks, follows) work well with optimistic updates, but comments lack threading and likes.

**Key findings:**
- **26 profile-related components** exist, only 1 is used (UnifiedProfilePage.tsx)
- **~400KB of dead profile code** should be deleted
- **Comment replies don't work** — `parent_id` exists in DB but isn't used in frontend
- **Comment likes not functional** — `onLike` prop exists on CommentRow but handler not wired
- **No accessibility attributes** on like, comment, save, share buttons
- **Engagement buttons have no aria-labels or aria-pressed states**
- **Profile page is 1,075 lines** — should be split into Header, Stats, Tabs, PostGrid components
- **ProfilePostDetailDrawerUpdated is 1,097 lines** — needs splitting

**What works well:**
- Optimistic updates on likes, bookmarks, follows
- Clear own-profile vs other-user distinction (isOwner flag)
- Follow button with proper state management and accessibility
- Safe text rendering (SafeUsername, SafeComment prevent XSS)
- Database-first profile loading with direct counts

---

## 2. Current Profile & Engagement UX Audit

### Profile Page (UnifiedProfilePage.tsx)

| Aspect | Assessment |
|--------|-----------|
| Own vs other profile | Good — clear isOwner flag, shows edit/avatar upload for own, follow for others |
| Avatar | Works — database-first with refresh, upload dialog on own profile |
| Bio display | Works — SafeBio sanitization, editable on own profile |
| Stats (followers/following/posts) | Works — direct count queries, clickable |
| Follow button | Good — optimistic updates, proper aria attributes, icon changes |
| Post grid | 3-column grid on desktop, responsive, ProfileMediaCard components |
| Tabs | Posts / Saved Posts / Achievements — saved only on own profile |
| Empty states | Present but basic — could be more engaging |
| Loading states | Spinner during load — no skeleton placeholder |
| Edit profile | Navigation to EditProfilePage — works |
| Component size | **1,075 lines — too large, should split** |

### Likes (PostCard → SocialFeed → edge.ts)

| Aspect | Assessment |
|--------|-----------|
| Interaction | Heart icon toggle — standard pattern |
| Optimistic update | Yes — immediate state change |
| Feedback | Heart fills/unfills, count updates |
| Error rollback | Yes — reverts on failure |
| Accessibility | **Missing** — no aria-label, no aria-pressed |
| Animation | None — should have subtle scale animation |
| Haptic feedback | None — consider for mobile |

### Comments (CommentsSystem.tsx)

| Aspect | Assessment |
|--------|-----------|
| Comment display | CommentRow with username, body, timestamp |
| Comment submission | Edge function via `/posts/{id}/comments`, optimistic add |
| Reply threading | **NOT IMPLEMENTED** — parent_id in DB but not used |
| Comment likes | **NOT FUNCTIONAL** — onLike prop exists, handler not wired |
| Loading state | Spinner while fetching |
| Empty state | EmptyState component |
| Accessibility | **Very limited** — no aria-labels, no roles |
| Comment composer | Basic input at bottom — works |

### Bookmarks/Saves (bookmark-helpers.tsx)

| Aspect | Assessment |
|--------|-----------|
| Interaction | Bookmark icon toggle |
| Optimistic update | Yes |
| Error rollback | Yes |
| Saved posts view | Tab on own profile + SavedPostsGrid |
| Accessibility | **Missing** — no aria-label |
| Feedback | Icon fills/unfills |

### Follow (FollowButton.tsx)

| Aspect | Assessment |
|--------|-----------|
| Interaction | Button with UserPlus/UserCheck icons |
| Optimistic update | Yes |
| Error handling | Handles 404/409 edge cases |
| Accessibility | **Good** — aria-label and aria-pressed present |
| Visibility | Hidden on own profile |
| Count update | Passes delta to parent for stats update |

---

## 3. What Is Hurting the Experience Today

### Critical Issues
1. **Comment replies don't work.** `parent_id` column exists in `comment` table but frontend never sets it. Users can't reply to specific comments.
2. **Comment likes not functional.** CommentRow has `onLike` prop but no actual handler toggles the `comment_like` table.
3. **~400KB of dead profile code.** 25 unused profile components create confusion and maintenance burden.
4. **No accessibility on engagement buttons.** Like, comment, share, bookmark buttons have no aria-labels.

### High-Friction Issues
5. **1,075-line UnifiedProfilePage.** Should be split into Header, Stats, Tabs, PostGrid, SavedGrid.
6. **1,097-line ProfilePostDetailDrawerUpdated.** Drawer for viewing post details is monolithic.
7. **No loading skeletons.** Profile shows spinner instead of skeleton placeholder while loading.
8. **No like animation.** Heart toggle is instant with no visual feedback animation.
9. **Comment composer is basic.** Plain input field with no rich affordances.

### Missing Features
10. **No reply UI.** Can't reply to a specific comment — all comments are flat.
11. **No comment likes.** Can't like individual comments.
12. **No share tracking.** Share button exists but doesn't track or count shares.
13. **No "you and X others liked this" social proof on likes.**

---

## 4. Recommended UX Direction

### Profile Page Structure (Instagram/TikTok pattern)

```
┌─────────────────────────────────┐
│ [←]  @username            [⚙️]  │  ← Header (own: settings, other: overflow)
├─────────────────────────────────┤
│   [Avatar]                      │
│   Display Name                  │
│   Bio text here...              │
│                                 │
│   123        456        78      │
│   posts    followers  following │
│                                 │
│   [Edit Profile] or [Follow]    │
├─────────────────────────────────┤
│  [🔲 Posts] [🔖 Saved] [🏆]    │  ← Tabs
├─────────────────────────────────┤
│  ┌──┐ ┌──┐ ┌──┐                │
│  │  │ │  │ │  │  Post Grid     │
│  └──┘ └──┘ └──┘                │
│  ┌──┐ ┌──┐ ┌──┐                │
│  │  │ │  │ │  │                 │
│  └──┘ └──┘ └──┘                │
└─────────────────────────────────┘
```

### Comment Threading (Reddit/Instagram pattern)

```
┌─────────────────────────────────┐
│ Comments (12)              [×]  │
├─────────────────────────────────┤
│ @alice                          │
│ Great photo! 🔥                 │
│ ♡ 3  ·  Reply  ·  2h           │
│                                 │
│   ↳ @bob                       │
│     Thanks! 🙏                  │
│     ♡ 1  ·  Reply  ·  1h       │
│                                 │
│ @charlie                        │
│ Where was this taken?           │
│ ♡ 0  ·  Reply  ·  30m          │
├─────────────────────────────────┤
│ [💬 Add a comment...]    [Post] │
└─────────────────────────────────┘
```

### Like Animation (Instagram pattern)
- Heart fills with scale animation (1.0 → 1.3 → 1.0, 200ms)
- Color transition from outline to filled red
- Count updates optimistically

### Engagement Button Accessibility
Every interaction button should have:
- `aria-label` describing the action
- `aria-pressed` for toggle states (like, bookmark)
- `role="button"` if not a native button
- Visible focus ring for keyboard navigation

---

## 5. Recommended Improvements

### Profile Page
- Split into: ProfileHeader, ProfileStats, ProfileTabs, ProfilePostGrid, ProfileSavedGrid
- Add loading skeleton (not spinner)
- Add pull-to-refresh on mobile
- Improve empty states with illustrations and CTAs

### Likes
- Add subtle scale animation on toggle
- Add aria-label: "Like" / "Unlike"
- Add aria-pressed state
- Keep optimistic updates (they work well)

### Comments
- **Wire comment threading:** When replying, set parent_id on the comment
- **Add reply UI:** "Reply" link below each comment opens composer with @mention
- **Indent replies:** Show child comments indented under parent
- **Wire comment likes:** Toggle insert/delete on comment_like table
- **Add aria-labels** to all comment actions

### Bookmarks
- Add aria-label: "Save" / "Unsave"
- Add aria-pressed state
- Keep optimistic updates

### Follow
- Already has good accessibility — no changes needed
- Keep optimistic updates

---

## 6. Code Cleanup Recommendations

### Delete Dead Code (~400KB)
Delete these unused profile components:
- ProfilePage.tsx, ProfilePageComplete.tsx, EnhancedProfilePage.tsx
- UnifiedProfilePageWithDrawer.tsx, UserProfilePage.tsx
- ProfilePageWithBioEditor.tsx, ProfilePageWithWorkingBio.tsx, ProfilePageFixed.tsx
- EnhancedProfilePostsList.tsx, GuardedProfilePostsList.tsx
- ProfilePostsList.tsx, ProfilePostsList-COMPLETE.tsx
- ProfilePostsDebugTest.tsx, ProfilePostsEdgeApiTest.tsx, ProfileEdgeApiTestPage.tsx
- StabilizedProfilePostDetailDrawer.tsx
- SimplePostsList.tsx, PublicProfileVerification.tsx

### Split UnifiedProfilePage (1,075 → ~5 components)
```
src/components/profile/
  ProfilePage.tsx           (~200 lines) — Main container with data loading
  ProfileHeader.tsx         (~150 lines) — Avatar, name, bio, edit/follow
  ProfileStats.tsx          (~60 lines)  — Posts/followers/following counts
  ProfileTabs.tsx           (~80 lines)  — Tab navigation
  ProfilePostGrid.tsx       (~100 lines) — Post grid with cards
```

### Wire Comment Threading
- Update CommentsSystem to pass parent_id when submitting replies
- Update CommentRow to show "Reply" action
- Add indented reply display
- Query comments with parent_id ordering

### Wire Comment Likes
- Add toggle handler in CommentsSystem
- Call insert/delete on comment_like table
- Optimistic update on comment like count

### Add Accessibility
- Add aria-label to PostCard like button: `aria-label={liked ? "Unlike" : "Like"}`
- Add aria-pressed to PostCard like button: `aria-pressed={liked}`
- Same for bookmark button
- Add aria-labels to comment actions

---

## 7. Ideal User Journeys

### Viewing Your Own Profile
1. Tap profile icon in navigation
2. Profile loads with skeleton placeholder → content appears
3. See avatar, display name, bio, stats
4. See "Edit Profile" button
5. Scroll through 3-column post grid
6. Tap "Saved" tab to see bookmarked posts
7. Tap a post to open detail drawer

### Viewing Another User's Profile
1. Tap username on a post or in a list
2. Profile loads → see their avatar, name, bio, stats
3. See "Follow" button (if not following) or "Following" (if following)
4. Scroll through their post grid
5. No "Saved" tab visible

### Liking a Post
1. Tap heart icon on post
2. Heart fills red with scale animation (200ms)
3. Like count increments by 1
4. If like fails: heart unfills, count reverts, toast: "Couldn't like this post"

### Commenting on a Post
1. Tap comment icon on post
2. Comments drawer/modal opens
3. Existing comments load (threaded, with reply counts)
4. Type in comment input at bottom
5. Tap "Post" → comment appears at top (optimistic)
6. If fails: comment removed, toast: "Couldn't post comment"

### Replying to a Comment
1. Tap "Reply" below a comment
2. Comment input focuses with "@username " prefilled
3. Type reply → tap "Post"
4. Reply appears indented below parent comment

### Liking a Comment
1. Tap heart icon on a comment
2. Heart fills, like count increments
3. If fails: reverts

### Saving a Post
1. Tap bookmark icon on post
2. Icon fills, toast: "Saved"
3. Post appears in Saved tab on profile
4. Tap again to unsave

---

## 8. Prioritized Improvement List

### Top 10 UX Improvements

| # | Improvement | Impact | Effort |
|---|-----------|--------|--------|
| 1 | **Wire comment threading** (reply to comments with parent_id) | High | Medium |
| 2 | **Wire comment likes** (toggle comment_like table) | High | Low |
| 3 | **Add accessibility to all engagement buttons** | High | Low |
| 4 | **Add like animation** (scale + color transition) | Medium | Low |
| 5 | **Add loading skeletons** to profile (replace spinner) | Medium | Medium |
| 6 | **Improve comment composer** (auto-focus, @mention for replies) | Medium | Medium |
| 7 | **Add reply indentation** in comment threads | Medium | Medium |
| 8 | **Add "Saved" toast** when bookmarking | Low | Low |
| 9 | **Improve empty states** with illustrations | Low | Medium |
| 10 | **Add pull-to-refresh** on profile | Low | Low |

### Top 10 Code Improvements

| # | Improvement | Impact | Effort |
|---|-----------|--------|--------|
| 1 | **Delete ~400KB of dead profile components** (25 files) | High | Low |
| 2 | **Split UnifiedProfilePage** (1,075 lines → 5 components) | High | Medium |
| 3 | **Split ProfilePostDetailDrawerUpdated** (1,097 lines) | Medium | Medium |
| 4 | **Move notification logic** out of SocialFeed into helpers | Medium | Low |
| 5 | **Consolidate engagement helpers** into single service | Medium | Medium |
| 6 | **Add aria-labels and roles** to all interactive elements | High | Low |
| 7 | **Remove duplicate edge function patterns** | Low | Low |
| 8 | **Extract comment state management** to custom hook | Medium | Medium |
| 9 | **Standardize error handling** across all engagement flows | Low | Low |
| 10 | **Add TypeScript strict types** to engagement callbacks | Low | Low |

### Immediate Fixes
1. Delete dead profile components (~400KB)
2. Add aria-labels to engagement buttons
3. Wire comment likes (comment_like table exists, just needs frontend)
4. Fix comment threading (parent_id column exists, just needs frontend)

### Can Wait
- Loading skeletons (spinner works for now)
- Like animation (functional without it)
- Pull-to-refresh
- Share tracking

### MVP-Critical
- Working comments (already works, flat)
- Working likes (already works)
- Working bookmarks (already works)
- Working follows (already works)
- Comment threading (users expect replies)

### Design for Android Later
- Profile as a standalone screen (maps to Fragment/Activity)
- Comment drawer as bottom sheet (maps to BottomSheetDialogFragment)
- Engagement actions as ViewModel methods
- Optimistic update pattern reusable in Kotlin/Compose
