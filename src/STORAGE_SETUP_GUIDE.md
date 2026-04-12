# Storage Setup Guide for Tribe Board

## Required Buckets

Your Tribe Board application requires two storage buckets to be manually created in your Supabase Dashboard:

### 1. avatars bucket
- **Purpose**: Stores user profile pictures/avatars
- **Access**: Private bucket (users can only access their own avatars)

### 2. make-70df0d6e-media bucket  
- **Purpose**: Stores post media content (images, videos, audio files)
- **Access**: Private bucket with signed URL access

## Setup Instructions

### Step 1: Access Supabase Dashboard
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your Tribe Board project
3. Navigate to **Storage** in the left sidebar

### Step 2: Create the avatars bucket
1. Click **"New bucket"**
2. Set bucket name: `avatars`
3. Set **Public bucket**: `OFF` (keep it private)
4. Click **"Create bucket"**

### Step 3: Create the media bucket
1. Click **"New bucket"** again
2. Set bucket name: `make-70df0d6e-media`
3. Set **Public bucket**: `OFF` (keep it private)
4. Click **"Create bucket"**

### Step 4: Configure bucket policies (if needed)
The application handles bucket policies automatically through the server-side code, but if you encounter permissions issues, you may need to set up Row Level Security policies in the Supabase dashboard.

## Verification

After creating both buckets, restart your application. The storage initialization warnings should disappear, and you should be able to:

- Upload and update profile pictures
- Create posts with images, videos, and audio
- View media content properly in the feed and profile pages

## Troubleshooting

If you still see storage warnings after creating the buckets:

1. **Check bucket names**: Ensure they match exactly:
   - `avatars`
   - `make-70df0d6e-media`

2. **Verify project**: Make sure you created the buckets in the correct Supabase project

3. **Check environment variables**: Ensure your `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correctly set

4. **Restart application**: Sometimes a full restart is needed for the changes to take effect

## Important Notes

- Both buckets should be **private** (not public) for security
- The application uses signed URLs to provide temporary access to media files
- Never make these buckets public as they contain user-generated content
- The `make-70df0d6e-media` bucket name includes a unique identifier to avoid conflicts

Once these buckets are created, your Tribe Board application will have full media upload and storage functionality!