# Database-First Avatar System

## Overview

Tribe Board now uses a comprehensive database-first avatar system that ensures all profile pictures are always loaded from the latest data in Supabase profiles table.

## Key Changes

### ✅ New System
- **Single Source of Truth**: `profiles.avatar_url` + `profiles.avatar_version`
- **Cache Busting**: Automatic version-based cache invalidation
- **Consistent Loading**: Same avatar helper used everywhere
- **Performance**: Efficient batch loading for multiple users

### ❌ Removed Sources
- `session.user.user_metadata.avatar_url`
- `userInfo.profileImageUrl`
- Any other avatar sources

## Implementation

### 1. Profile Pages
Both Owner and Public profile pages use identical loading logic:

```typescript
// Page state variables (as requested)
const [profile, setProfile] = useState<ProfileData | null>(null);
const [profileAvatarSrc, setProfileAvatarSrc] = useState<string>('');
const [profileLoading, setProfileLoading] = useState<boolean>(true);
const [profileError, setProfileError] = useState<string>('');

// Database-first loading (runs on page load and route changes)
const loadProfile = useCallback(async () => {
  profileLoading = true;
  profileError = "";

  const { data: { session } } = await supabase.auth.getSession();
  const routeUserId = params.userId; // route param for public profile
  const profileId = routeUserId ?? session?.user?.id;

  if (!profileId) {
    profile = null;
    profileAvatarSrc = "";
    profileLoading = false;
    return;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, bio, avatar_url, avatar_version')
    .eq('id', profileId)
    .single();

  if (error) {
    profileError = error.message;
    profileLoading = false;
    return;
  }

  profile = {
    ...data,
    username: data.display_name || 'Unknown User' // Transform display_name to username for UI
  };

  // Build usable image URL with cache-bust
  let src = data?.avatar_url ?? "";
  if (src) {
    if (src.startsWith("http")) {
      src = `${src}?v=${data.avatar_version ?? 0}`;
    } else {
      // stored as path in the 'avatars' bucket
      const { data: pub } = supabase.storage
        .from('avatars')
        .getPublicUrl(src, { transform: { width: 256, height: 256, resize: 'cover' } });
      src = `${pub.publicUrl}?v=${data.avatar_version ?? 0}`;
    }
  }
  
  profileAvatarSrc = src;
  profileLoading = false;
}, [userId]);
```

### 2. Post Headers and User Cards
Use the centralized avatar helper:

```typescript
import { useUserAvatar } from '../utils/supabase/profile-avatar-helpers';

function PostCard({ post }) {
  const authorId = post.authorId || post.userId || post.user_id;
  const avatarResult = useUserAvatar(authorId || null);

  return (
    <Avatar>
      {avatarResult.src ? (
        <AvatarImage 
          src={avatarResult.src} 
          alt={`${avatarResult.username}'s profile picture`}
        />
      ) : null}
      <AvatarFallback>
        {(avatarResult.username || 'U').charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
```

### 3. Avatar Helper Functions

**Single User**: `fetchUserAvatar(userId: string)`
**Multiple Users**: `fetchMultipleUserAvatars(userIds: string[])`
**React Hook**: `useUserAvatar(userId: string | null)`

## Database Schema

### profiles table
```sql
- id: uuid (primary key)
- display_name: text -- Username field
- bio: text
- avatar_url: text (nullable) -- Full URL or storage path
- avatar_version: integer (default 0) -- Incremented on upload
```

### Avatar URL Formats
1. **Full URL**: `https://example.com/avatar.jpg?v=123`
2. **Storage Path**: `user-uploads/abc123.jpg` → transformed to public URL with version

## Upload Flow

1. User uploads new avatar via AvatarUploadDialog
2. Image saved to Supabase Storage
3. Database updated with new `avatar_url` and incremented `avatar_version`
4. All components automatically refresh with new avatar
5. Cache busting ensures immediate visibility

## Benefits

- **Consistency**: Same avatar everywhere, always up-to-date
- **Performance**: Efficient loading with version-based caching
- **Reliability**: Single source of truth eliminates sync issues
- **Scalability**: Batch loading for feed pages
- **Maintainability**: Centralized avatar logic

## Migration Notes

- Removed `profileImageUrl` from UserInfo interface
- Removed global avatar update handlers from App.tsx
- Updated all avatar displays to use database-first system
- PostCard components now use `useUserAvatar` hook

## Future Enhancements

- Avatar optimization (WebP, multiple sizes)
- Default avatar generation based on username
- Avatar change notifications
- Avatar history/rollback functionality