import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { SafeBio, SafeUsername } from './SafeText';
import { LevelBadge } from './LevelProgressBar';
import { FollowButton } from './FollowButton';
import { toast } from 'sonner@2.0.3';
import { 
  ArrowLeft, 
  MoreHorizontal,
  Grid3X3,
  UserPlus,
  UserCheck,
  Loader2,
  Edit3
} from 'lucide-react';
import { supabase } from '../utils/supabase/client';

interface UserProfileProps {
  userId: string;
  onBack?: () => void;
}

export function UserProfile({ userId, onBack }: UserProfileProps) {
  // Page variables as specified
  const [user, setUser] = useState<any>(null);
  const [counts, setCounts] = useState<any>({});
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string>('');

  // Load function - runs on page open / props.userId change
  const Load = async () => {
    setLoading(true);
    setErr("");
    const profileId = userId;
    
    // Validate UUID format before making database calls
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(profileId)) {
      setErr(`Invalid user profile ID: ${profileId}`);
      setLoading(false);
      return;
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // Fetch profile by id (not session): query public.profiles where id = route.userId
      // selecting id, display_name, avatar_url, avatar_version, bio, xp
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, avatar_version, bio, xp")
        .eq("id", profileId)
        .single();

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          // Profile not found (404/null)
          setUser(null);
          setErr("Profile not found");
          return;
        }
        setErr(`Failed to load profile: ${profileError.message}`);
        return;
      }

      // Set the profile data
      setUser(profileData);
      
      // Get additional data in parallel
      const [postCountResult, postsResult, userCountsResult] = await Promise.all([
        // Get post count directly
        supabase
          .from("posts")
          .select("*", { count: 'exact', head: true })
          .eq("user_id", profileId),
        

        
        // Get recent posts
        supabase
          .from("posts")
          .select("id, text_body, content, media_url, media_type, created_at, post_type")
          .eq("user_id", profileId)
          .order("created_at", { ascending: false })
          .limit(12),

        // Get follower/following counts from users table
        supabase
          .from("users")
          .select("follower_count, following_count")
          .eq("id", profileId)
          .single()
      ]);
      
      // Handle count data
      const postCount = postCountResult.count ?? 0;
      const userCounts = userCountsResult.data || { follower_count: 0, following_count: 0 };
      
      setCounts({ 
        posts_count: postCount, 
        followers_count: userCounts.follower_count || 0, 
        following_count: userCounts.following_count || 0 
      });
      
      setPosts(postsResult.data ?? []);
      
    } catch (error: any) {
      console.error('Error loading profile:', error);
      setErr(`Error loading profile: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };



  // Add two modes: isOwner = session.user.id === route.userId
  const [isOwner, setIsOwner] = useState<boolean>(false);

  useEffect(() => {
    const checkIsOwner = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // isOwner = session.user.id === route.userId
      setIsOwner(session?.user?.id === userId);
    };
    
    checkIsOwner();
    Load();
  }, [userId]);

  // Get avatar URL with cachebuster ?v=${avatar_version}
  const getAvatarUrl = () => {
    if (!user?.avatar_url) return null;
    // Avatar → avatar_url with cachebuster ?v=${avatar_version}
    return user.avatar_url + '?v=' + (user.avatar_version ?? 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-midnight-black flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 text-neon-lilac animate-spin" />
          <p className="text-muted-lavender">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen bg-midnight-black flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-glitch-red mb-4">{err}</p>
          <Button onClick={() => Load()} className="bg-neon-lilac text-midnight-black">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Empty state: Show "Profile not found" only if the fetch returns 404/null
  // Don't show it just because !isOwner
  if (!user && !loading && err === "Profile not found") {
    return (
      <div className="min-h-screen bg-midnight-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="font-headline text-pearl-white">Profile not found</h2>
          <p className="text-muted-lavender font-body text-sm">
            This user profile doesn't exist
          </p>
          {onBack && (
            <Button onClick={onBack} className="bg-neon-lilac text-midnight-black">
              Go Back
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!user && !loading) {
    return (
      <div className="min-h-screen bg-midnight-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-lavender">Unable to load profile</p>
          {onBack && (
            <Button onClick={onBack} className="bg-neon-lilac text-midnight-black">
              Go Back
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-midnight-black pb-safe">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-midnight-black/80 soft-blur border-b border-muted-lavender/20 pt-safe">
        <div className="flex items-center justify-between px-4 py-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 bg-transparent border border-muted-lavender/30 text-muted-lavender hover:text-pearl-white hover:bg-muted-lavender/10 rounded-xl transition-all duration-300"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          
          <h1 className="font-headline font-medium text-pearl-white">
            {/* Name → display_name (replace any username usage) */}
            <SafeUsername username={user.display_name || 'User'} />
          </h1>
          
          <button className="p-2 bg-transparent border border-muted-lavender/30 text-muted-lavender hover:text-pearl-white hover:bg-muted-lavender/10 rounded-xl transition-all duration-300">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Profile Header */}
        <Card className="bg-gradient-to-br from-midnight-black to-midnight-black/80 border-muted-lavender/30">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4 mb-6">
              <Avatar className="w-20 h-20">
                {getAvatarUrl() ? (
                  <AvatarImage src={getAvatarUrl()} alt={user.display_name} />
                ) : (
                  <AvatarFallback className="bg-gradient-to-r from-neon-lilac to-electric-blue text-white font-headline text-2xl">
                    {(user.display_name || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h2 className="font-headline text-pearl-white text-xl font-medium">
                    {/* Name → display_name (replace any username usage) */}
                    <SafeUsername username={user.display_name || 'User'} />
                  </h2>
                </div>
                
                {/* Show Edit controls only when isOwner; otherwise show Follow button */}
                {isOwner ? (
                  <div className="flex space-x-2 mt-4">
                    <Button className="flex-1 bg-muted-lavender/20 border border-muted-lavender/40 text-muted-lavender hover:bg-muted-lavender/30 font-body rounded-xl px-4 py-2 text-sm transition-all duration-300 flex items-center justify-center space-x-2">
                      <Edit3 className="w-4 h-4" />
                      <span>Edit Profile</span>
                    </Button>
                  </div>
                ) : (
                  <div className="flex space-x-2 mt-4">
                    <FollowButton
                      userId={userId}
                      className="flex-1"
                      variant="default"
                      size="default"
                      showText={true}
                      onFollowChange={(targetUserId, isFollowing) => {
                        // Optionally re-fetch counts after successful toggle
                        console.log('Follow status changed:', { targetUserId, isFollowing });
                        // Update local counts optimistically
                        setCounts(prev => ({
                          ...prev,
                          followers_count: prev.followers_count + (isFollowing ? 1 : -1)
                        }));
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-around py-4 border-t border-b border-muted-lavender/20">
              <div className="text-center">
                <p className="font-headline text-pearl-white text-lg">{counts.posts_count || 0}</p>
                <p className="text-muted-lavender font-body text-sm">posts</p>
              </div>
              <div className="text-center">
                <p className="font-headline text-pearl-white text-lg">{counts.followers_count || 0}</p>
                <p className="text-muted-lavender font-body text-sm">followers</p>
              </div>
              <div className="text-center">
                <p className="font-headline text-pearl-white text-lg">{counts.following_count || 0}</p>
                <p className="text-muted-lavender font-body text-sm">following</p>
              </div>
            </div>

            {/* Bio */}
            {user.bio && (
              <div className="mt-4">
                <SafeBio 
                  description={user.bio}
                  className="leading-relaxed"
                  showFullOnClick={true}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Posts Grid */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Grid3X3 className="w-5 h-5 text-muted-lavender" />
            <h3 className="font-headline text-pearl-white">Posts</h3>
          </div>
          
          {posts.length > 0 ? (
            <div className="grid grid-cols-3 gap-1 sm:gap-2 md:gap-3">
              {posts.map((post) => (
                <Card 
                  key={post.id} 
                  className="aspect-square overflow-hidden bg-midnight-black/50 border-muted-lavender/30 hover:border-neon-lilac/50 transition-all duration-300 cursor-pointer"
                  onClick={() => {
                    // Handle post click - could navigate to post detail
                    console.log('Post clicked:', post);
                  }}
                >
                  <CardContent className="p-0 w-full h-full">
                    {post.media_url ? (
                      <img 
                        src={post.media_url} 
                        alt={post.text_body || post.content || 'Post media'} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-neon-lilac/20 to-electric-blue/20 flex items-center justify-center p-2">
                        <p className="text-pearl-white text-xs text-center line-clamp-3">
                          {post.text_body || post.content || 'Text post'}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Grid3X3 className="w-12 h-12 text-muted-lavender/40 mx-auto mb-4" />
              <h3 className="font-headline text-pearl-white mb-2">No posts yet</h3>
              <p className="text-muted-lavender font-body text-sm">This user hasn't shared anything yet</p>
            </div>
          )}
        </div>

        {/* Bottom spacing for mobile navigation */}
        <div className="h-20 md:h-0" />
      </div>
    </div>
  );
}