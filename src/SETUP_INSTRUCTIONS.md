# Setup Instructions for Tribe Board

## Current Issues & Solutions

### 1. Storage Bucket Setup Required

**Issue:** The app requires two storage buckets that need to be manually created in your Supabase Dashboard.

**Error Messages:**
```
⚠️ Some buckets need manual setup: ["avatars", "make-70df0d6e-media"]
⚠️ Storage initialization had issues: ["Manual Setup Required: avatars bucket must be created in Supabase Dashboard", ...]
```

**Solution:**
1. Go to your Supabase Dashboard
2. Navigate to **Storage** section in the sidebar
3. Click **"New Bucket"**
4. Create these two buckets:
   - **Bucket name:** `avatars`
     - **Public bucket:** ✅ YES (check this box)
     - **File size limit:** 2MB
     - **Allowed file types:** image/jpeg, image/png, image/webp
   
   - **Bucket name:** `make-70df0d6e-media`
     - **Public bucket:** ✅ YES (check this box)  
     - **File size limit:** 5MB
     - **Allowed file types:** image/*, video/*, audio/*

5. Refresh your app once both buckets are created

### 2. Edge Function Authentication Issues

**Issue:** Edge function calls are failing due to authentication problems.

**Error Messages:**
```
📡 edgeGet error response body: {"error":"Auth error: Auth session missing!"}
📡 edgeGet error: Error: Authentication failed: {"error":"Auth error: Auth session missing!"}
```

**Current Status:** 
- The app currently bypasses edge functions for most operations and uses direct database queries
- This provides better reliability during development
- Avatar uploads and core functionality work without edge functions

**Solution (Optional):**
If you want to enable edge functions:
1. Ensure you're properly signed in to the app
2. Check that your Supabase Edge Functions are deployed
3. Verify the edge function authentication middleware is properly configured

**Workaround:**
The app is designed to work without edge functions. Most features use direct database access as a fallback, so these errors can be safely ignored during development.

## Verification

After creating the storage buckets:

1. Refresh the app
2. You should see in the console:
   ```
   ✅ Storage system is healthy
   ✅ All required storage buckets are available
   ```
3. Avatar uploads should now work properly
4. Media uploads in posts should function correctly

## Features That Work

Even with the edge function errors, the following features are fully functional:

- ✅ User authentication and signup
- ✅ Social feed with posts
- ✅ Avatar uploads (once buckets are created)
- ✅ Media uploads for posts
- ✅ Comments and interactions
- ✅ Profile management
- ✅ Real-time notifications
- ✅ Stories functionality
- ✅ Mobile responsiveness

The app is designed to gracefully handle missing edge functions and provide full functionality through direct database operations.