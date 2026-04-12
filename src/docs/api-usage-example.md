# API Usage Examples

## Environment Setup

Set your API base URL in `.env.local`:

```env
VITE_API_BASE=https://your-edge-domain.com
```

## Using the Updated API Structure

All API calls now use the `VITE_API_BASE` environment variable and follow the namespaced route pattern:

### Example: Post Deletion

```javascript
// Using makeAuthenticatedRequest (recommended)
const { makeAuthenticatedRequest } = await import('./utils/supabase/client');

const response = await makeAuthenticatedRequest(`/make-server-70df0d6e/posts/${postId}/force-delete`, {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
});

// The actual URL will be: ${VITE_API_BASE}/make-server-70df0d6e/posts/123/force-delete
```

### Example: Manual Fetch (if needed)

```javascript
const API = import.meta.env.VITE_API_BASE;
await fetch(`${API}/make-server-70df0d6e/posts/${postId}/force-delete`, {
  method: 'DELETE',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}` 
  },
  credentials: 'include'
});
```

## Supported Endpoints

All endpoints follow the pattern: `${VITE_API_BASE}/make-server-70df0d6e/...`

- `/make-server-70df0d6e/health` - Health check
- `/make-server-70df0d6e/users/profile` - User profile
- `/make-server-70df0d6e/posts` - Posts CRUD
- `/make-server-70df0d6e/posts/{id}/force-delete` - Force delete post
- And more...

## Migration Notes

- All existing API calls continue to work without changes
- If `VITE_API_BASE` is not set, the system falls back to Supabase functions URL
- The `makeAuthenticatedRequest` function handles authentication automatically
- All API calls include proper CORS headers and credentials