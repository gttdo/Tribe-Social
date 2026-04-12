# Tribe Social — Post Create/Edit/Delete UX & Code Audit

## 1. Executive Summary

The post creation flow is **feature-complete but architecturally bloated**. CreatePostPage.tsx is 1,582 lines with 13+ state variables, three different character limits (250, 250, 2,000), a broken tribe selector, simulated upload progress, and deferred audio/video processing that makes publishing feel slow. The edit modal is limited (can't edit visibility) and has a character limit mismatch (2,000 vs 250 in creation). The delete dialog is clean and well-built.

**The core problem:** The flow was designed as a multi-step wizard (select type → create content → publishing) when modern social apps use a **single-screen composer** where you type text and optionally attach media. Instagram, TikTok, Reddit — none of them make you choose a "post type" before you start creating.

**What should change:**
- Kill the type selection step. Start with a text input, let users attach media naturally.
- Single-screen composer (modal or full-screen) instead of 3-step wizard.
- Fix the character limit inconsistency (one limit everywhere).
- Show real upload progress, not simulated.
- Split the 1,582-line file into ~5 focused components.
- Make tribe selection actually work or remove it.
- Match edit limits to creation limits.

---

## 2. Current Post Flow UX Audit

### Create Post Flow

| Aspect | Assessment |
|--------|-----------|
| Entry point | Full-screen page via navigation — acceptable |
| Step 1: Type selection | **Unnecessary friction.** Users must pick thought/camera/audio before creating. Modern apps don't do this. |
| Step 2: Content creation | Decent — text input, media preview, caption, visibility |
| Step 3: Publishing | **Simulated progress bar** (increments 5-10% on timer, not actual bytes). Feels fake. |
| Text input | 250 char limit with grapheme-aware counting — over-engineered for MVP |
| Media upload | Works but hidden — must go through camera modal to upload a file |
| Image upload from device | **No direct "upload photo" button** on the type selection screen. Camera is the only entry, with file picker as a fallback when camera fails |
| Audio capture | 100ms artificial delay before opening recorder — feels laggy |
| Audio conversion | Happens at publish time (WebM → WAV) — makes publishing slow |
| Video thumbnails | Generated at publish time — makes publishing slow |
| Tribe selection | **Broken.** UI exists but `tribeIds: []` is hardcoded in every payload |
| Visibility | Works (public/private/tribe) but tribe selection doesn't |
| Character counter | Good — real-time with color warnings |
| Validation | Scattered across multiple files with different limits |
| Error handling | Good — user-friendly error messages |
| Success state | Toast with XP earned — nice touch |

### Edit Post Flow

| Aspect | Assessment |
|--------|-----------|
| Entry point | Overflow menu on post → "Edit" option |
| What's editable | Text body (thoughts) or caption (media) |
| What's NOT editable | Visibility, media, post type |
| Character limit | **2,000 characters** — inconsistent with 250 in creation |
| UX quality | Minimal but functional |
| Schema inconsistency | Checks both `post.type` and `post.post_type` — fragile |

### Delete Post Flow

| Aspect | Assessment |
|--------|-----------|
| Entry point | Overflow menu on post → "Delete" option |
| Confirmation dialog | Clean AlertDialog with red button, trash icon |
| Loading state | Shows spinner during deletion — good |
| Missing context | Doesn't show what's being deleted (no preview/title) |
| Safety | Double-confirmation prevents accidental deletion — good |

---

## 3. What Is Hurting the Experience Today

### Critical Issues
1. **Type selection as first step.** No modern social app makes you pick "thought vs camera vs audio" before you start. You should start typing and attach media if you want.
2. **Character limit mismatch.** 250 in creation, 2,000 in editing. Users can't edit beyond what they created, or worse, editing allows longer text than creation.
3. **No direct image upload.** Users must open the camera modal to upload a photo from their device. The file picker only appears as a fallback when camera access fails.
4. **Simulated upload progress.** The progress bar increments on a 300ms timer, not based on actual file upload progress. This is deceptive.
5. **Broken tribe selection.** UI exists for selecting tribes but `tribeIds: []` is hardcoded. Either finish it or remove the UI.

### High-Friction Issues
6. **1,582-line monolithic component.** CreatePostPage handles type selection, text input, media capture, audio recording, file upload, preview, visibility, tribe selection, publishing, and progress — all in one file.
7. **Deferred audio/video processing.** Audio conversion and video thumbnail generation happen at publish time, making the "Sharing..." state feel slow.
8. **100ms artificial delay** before audio recorder opens.
9. **3-step flow for simple text posts.** A thought post requires: select "Thought Post" → type text → publish. Should be: type text → publish.
10. **13+ state variables.** State management is sprawling and hard to follow.

### Trust-Damaging Issues
11. **Fake progress bar.** Users can see it doesn't reflect actual upload (increments at regular intervals regardless of file size).
12. **XP values hardcoded.** Frontend shows XP earned but the values are guesses, not from the backend.

---

## 4. Recommended UX Direction

### Design Philosophy
**One screen, one tap to start, media is optional.** The composer should open with a text input focused and ready. Users can type a thought and hit post. OR they can tap an attachment button to add a photo, video, or audio. No type selection. No wizard. No ceremony.

### Structural Change: Single-Screen Composer

**Replace the 3-step wizard with a unified composer:**

```
┌─────────────────────────────────┐
│ [←]  New Post              [Post] │
├─────────────────────────────────┤
│                                   │
│  [Text area - auto-growing]       │
│  "What's on your mind?"          │
│                                   │
│  ┌─ Media Preview (if attached)─┐ │
│  │  [image/video/audio player]  │ │
│  │                    [✕ remove]│ │
│  └──────────────────────────────┘ │
│                                   │
├─────────────────────────────────┤
│ [📷] [🎥] [🎤] [📎]  │  🌐 Public ▾ │
└─────────────────────────────────┘
```

**Bottom toolbar:** Photo, Video, Audio, Upload — always visible.
**Visibility selector:** Inline dropdown at bottom-right.
**Post button:** Top-right, disabled until content exists.
**Character counter:** Appears near text when typing (subtle, not always visible).

### Key UX Principles

1. **Text-first.** The composer opens with cursor in the text field. You can post text-only with zero extra taps.
2. **Media is additive.** Tap an icon to attach media. The media appears inline as a preview.
3. **One media per post (for now).** Keep the current constraint but make it feel like a choice, not a limitation.
4. **Real upload progress.** Show actual bytes uploaded or hide progress entirely (use a spinner for small files).
5. **Post button in header.** Always visible. Disabled until there's content. Shows spinner on submit.
6. **No type selection screen.** The type is inferred from what the user attaches (no media = thought, image attached = image post, etc.).
7. **Modal or full-screen.** Use a full-screen modal on mobile, side panel on desktop.

---

## 5. Recommended Screen-by-Screen Improvements

### Post Composer (New — replaces CreatePostPage 3-step flow)
- Full-screen on mobile, centered modal (max-w-lg) on desktop
- Header: Back arrow + "New Post" title + "Post" button
- Body: Auto-growing textarea with placeholder "What's on your mind?"
- Media preview area: Shows attached media with remove button
- Bottom toolbar: Camera, Video, Mic, Upload file icons
- Visibility: Small dropdown or chip at bottom ("Public ▾")
- Character counter: Shows when text exceeds 80% of limit
- Post button: Disabled until content, shows spinner during submit

### Edit Post (Improved)
- Same visual structure as create (textarea + media preview)
- Pre-filled with existing content
- Header: "Edit Post" + "Save" button
- Character limit MATCHES creation (500 — unified limit)
- Can edit text/caption
- Cannot change media (show it but not editable)
- Cannot change post type

### Delete Post (Minor Improvements)
- Show post preview/snippet in the confirmation dialog
- "Delete this post?" with first ~50 chars of text or media thumbnail
- Keep the red button + cancel pattern
- Add "This can't be undone" warning text

### Media Attachment
- Tap camera icon → open camera (photo mode)
- Tap video icon → open camera (video mode)
- Tap mic icon → open audio recorder inline
- Tap upload icon → native file picker (images, videos, audio)
- All attachments show as inline previews with remove (✕) button
- Only one attachment at a time (for MVP)

---

## 6. Code Cleanup & Refactor Recommendations

### Component Architecture

**Current:** 1 monolithic file (1,582 lines)
**Target:** 6-8 focused files (~100-250 lines each)

```
src/components/post/
  PostComposer.tsx          (~250 lines) — Main composer modal/page
  PostTextArea.tsx           (~80 lines)  — Auto-growing textarea with counter
  MediaAttachment.tsx        (~120 lines) — Media preview + remove
  MediaToolbar.tsx           (~80 lines)  — Bottom bar with camera/video/mic/upload
  VisibilitySelector.tsx     (~60 lines)  — Public/Tribe dropdown
  EditPostModal.tsx          (~150 lines) — Edit existing post
  DeletePostDialog.tsx       (~80 lines)  — Delete confirmation (keep existing, improve)
  usePostSubmit.ts           (~100 lines) — Custom hook for submit/upload logic
  post-constants.ts          (~20 lines)  — Centralized limits and config
```

### Centralized Constants
```typescript
// src/components/post/post-constants.ts
export const POST_TEXT_LIMIT = 500;       // Unified limit (was 250 create, 2000 edit)
export const POST_CAPTION_LIMIT = 300;
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;   // 5MB
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024;  // 50MB
export const MAX_AUDIO_SIZE = 10 * 1024 * 1024;  // 10MB
```

### Custom Hook for Submission
```typescript
// src/components/post/usePostSubmit.ts
function usePostSubmit() {
  return {
    submit: async (postData) => { ... },
    uploadMedia: async (file) => { ... },
    isSubmitting,
    uploadProgress,  // Real progress from XMLHttpRequest or fetch
    error,
  };
}
```

### State Consolidation
Replace 13+ useState hooks with useReducer:
```typescript
type ComposerState = {
  text: string;
  media: File | null;
  mediaPreview: string | null;
  mediaType: 'image' | 'video' | 'audio' | null;
  visibility: 'public' | 'tribe';
  tribeId: string | null;
  isSubmitting: boolean;
  error: string | null;
};
```

### Dead Code to Remove
- PostPreview.tsx (not used in flow)
- MediaOptions.tsx (not integrated)
- CreateContentPage.tsx (unnecessary wrapper)
- Excessive debug logging throughout
- Audio conversion at upload time (convert at recording time instead)
- Simulated progress intervals

---

## 7. Ideal User Journeys

### Creating a Text Post
1. Tap "+" or "Create Post" from feed/profile
2. Composer opens with cursor in text field
3. Type your thought (character counter appears at 80%)
4. Tap "Post" button → spinner → done
5. Toast: "Posted!" — return to feed

**Total: 3 taps (open, type, post)**

### Creating an Image Post
1. Tap "+" from feed
2. Composer opens → tap camera icon in toolbar
3. Camera opens → take photo OR tap "Upload" to pick from device
4. Photo appears as preview in composer
5. Optionally add caption text
6. Tap "Post" → upload + submit → done

**Total: 5 taps**

### Creating a Video Post
1. Tap "+" from feed
2. Composer opens → tap video icon in toolbar
3. Camera opens in video mode → record → stop
4. Video preview appears in composer
5. Optionally add caption
6. Tap "Post" → upload + submit → done

### Creating an Audio Post
1. Tap "+" from feed
2. Composer opens → tap mic icon in toolbar
3. Audio recorder appears inline below text
4. Record → stop → audio waveform preview shows
5. Optionally add caption
6. Tap "Post" → upload + submit → done

### Editing a Post
1. Tap overflow menu (•••) on your post
2. Tap "Edit"
3. Edit modal opens with pre-filled content
4. Edit text/caption → tap "Save"
5. Toast: "Post updated"

### Deleting a Post
1. Tap overflow menu (•••) on your post
2. Tap "Delete"
3. Confirmation dialog: "Delete this post? This can't be undone."
4. Tap "Delete" (red) → spinner → done
5. Toast: "Post deleted" — post removed from feed

### Failed Upload Recovery
1. User taps "Post" → upload begins
2. Upload fails (network error)
3. Error message: "Upload failed. Your post has been saved as a draft."
4. User can retry from the same composer (content preserved)
5. Retry → success

---

## 8. Prioritized Improvement List

### Top 10 UX Improvements

| # | Improvement | Impact | Effort |
|---|-----------|--------|--------|
| 1 | **Remove type selection step** — infer type from content | Critical — eliminates 1 entire screen | Medium |
| 2 | **Single-screen composer** — text + optional media attachment | Critical — modern pattern | High |
| 3 | **Add direct file upload button** — no camera-only entry | High — users expect "upload photo" | Low |
| 4 | **Fix character limit mismatch** — one limit everywhere | High — trust issue | Low |
| 5 | **Real upload progress** — actual bytes or just spinner | Medium — trust issue | Medium |
| 6 | **Process audio/video immediately** — not at publish time | Medium — faster publishing | Medium |
| 7 | **Add post preview in delete dialog** | Low — better context | Low |
| 8 | **Fix or remove tribe selection** | Medium — either works or doesn't | Medium |
| 9 | **Inline audio recorder** — record without full modal | Medium — smoother flow | Medium |
| 10 | **Post button in header** — always visible on scroll | Low — mobile UX | Low |

### Top 10 Code/Architecture Improvements

| # | Improvement | Impact | Effort |
|---|-----------|--------|--------|
| 1 | **Split 1,582-line file** into ~6 components | High — maintainability | High |
| 2 | **Centralize constants** (limits, sizes, types) | High — consistency | Low |
| 3 | **Create usePostSubmit hook** | High — reusable, testable | Medium |
| 4 | **Consolidate state** with useReducer | Medium — readability | Medium |
| 5 | **Remove dead components** (PostPreview, MediaOptions, CreateContentPage wrapper) | Medium — cleanliness | Low |
| 6 | **Remove simulated progress** | Medium — honesty | Low |
| 7 | **Fix schema inconsistency** (post.type vs post.post_type) | Medium — reliability | Low |
| 8 | **Remove debug logging** from production code | Low — performance | Low |
| 9 | **Extract media upload logic** to service | Medium — reusability | Medium |
| 10 | **Add proper form handling** (react-hook-form for edit modal) | Low — consistency with auth | Low |

### What Should Be Fixed Immediately
1. Character limit mismatch (change edit modal to match creation)
2. Add direct file upload button (not just camera)
3. Remove broken tribe selection UI (or make it work)

### What Can Wait
- Inline audio recorder (current modal works)
- Real upload progress (spinner is fine for now)
- useReducer state consolidation
- Draft saving / recovery

### What Is MVP-Critical
- Single-screen composer (no type selection)
- Text + media attachment in one view
- Consistent character limits
- Working upload and submit

### Design Now for Android Later
- Composer as a full-screen activity (maps to Android Intent)
- Bottom toolbar pattern (maps to BottomAppBar)
- Media picker integration (maps to ActivityResultContract)
- usePostSubmit hook (service layer maps to ViewModel)

---

## 9. MVP Recommendations vs Later

### MVP (Build Now)
- Unified composer (text + optional media, no type selection)
- Direct upload button alongside camera/mic
- Fix character limits (one constant)
- Split monolithic component
- Keep full-screen pattern
- Simple spinner during upload (not fake progress)

### Post-MVP (Build Later)
- Draft saving
- Rich text / markdown in thoughts
- Multiple media attachments
- Inline audio recorder (vs modal)
- Real upload progress with byte counting
- Scheduled posts
- Post to multiple tribes
- Cross-posting
