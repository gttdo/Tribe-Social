import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Skeleton } from './ui/skeleton';
import { ProfilePostsSection } from './ProfilePostsSection';
import { EditablePostDetailsDrawer } from './EditablePostDetailsDrawer';
import { BioEditor } from './BioEditor';
import { SafeBio, SafeUsername, SafePostContent } from './SafeText';
import { LevelProgressBar, UserLevelInfo } from './LevelProgressBar';
import { getLevelInfo } from '../utils/level';
import { safeFormatCount } from '../utils/safe-rendering';
import { 
  ArrowLeft, 
  Settings, 
  Star,
  Sparkles,
  Award,
  List,
  Heart,
  MessageCircle,
  Bookmark,
  TrendingUp,
  Users,
  Calendar,
  RefreshCw,
  AlertCircle,
  Trophy,
  Crown,
  Zap,
  Target,
  Plus
} from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { UserResult, UserInfo } from '../App';
import { FeedPost, FeedComment } from '../utils/social-feed-types';
import { toast } from 'sonner@2.0.3';
import { guardUUID } from '../utils/uuid';

interface ProfilePageProps {
  userResult?: UserResult | null;
  userInfo: UserInfo | null;
  onBack: () => void;
  onLogout?: () => void;
  onNavigateToPage?: (page: string) => void;
  isOwnProfile?: boolean;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  earned: boolean;
  earnedDate?: string;
  xpReward?: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface UserProfileData {
  username: string;
  profile_image_url?: string;
  level: number;
  xp_points: number;
  post_count: number;
  follower_count: number;
  following_count: number;
  description?: string;
}

interface UserPost {
  id: string;
  caption: string;
  timestamp: string;
  likes: number;
  comments: number;
  imageUrl?: string;
  type?: 'image' | 'video' | 'audio' | 'thought';
  mediaType?: string;
}

const getAchievements = (userStats?: UserProfileData): Achievement[] => [
  {
    id: '1',
    name: 'Welcome Warrior',
    description: 'Joined the Tribe community',
    icon: Sparkles,
    color: 'neon-lilac',
    earned: true,
    earnedDate: '2 days ago',
    xpReward: 50,
    rarity: 'common'
  },
  {
    id: '2',
    name: 'First Post',
    description: 'Shared your first post',
    icon: Star,
    color: 'electric-blue',
    earned: (userStats?.post_count || 0) > 0,
    earnedDate: (userStats?.post_count || 0) > 0 ? '1 day ago' : undefined,
    xpReward: 100,
    rarity: 'common'
  }
];

export function ProfilePage({ userResult, userInfo, onBack, onLogout, onNavigateToPage, isOwnProfile = true }: ProfilePageProps) {
  const [activeTab, setActiveTab] = useState('posts');
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [userPosts, setUserPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get theme colors
  const getThemeColors = () => {
    const selectedTheme = userInfo?.selectedTheme || userResult?.profile?.theme;
    const themeColors = {
      'crystal-pink': { primary: 'glitch-red', secondary: 'soft-blush' },
      'crystal-cyan': { primary: 'electric-blue', secondary: 'neon-lilac' },
      'soft-lavender': { primary: 'neon-lilac', secondary: 'electric-blue' },
      default: { primary: 'neon-lilac', secondary: 'electric-blue' }
    };
    return themeColors[selectedTheme as keyof typeof themeColors] || themeColors.default;
  };

  const themeColors = getThemeColors();

  // Create fallback profile data
  const createFallbackProfileData = (): UserProfileData => {
    const xp = userResult?.xp ?? userInfo?.xpPoints ?? 100;
    const levelInfo = getLevelInfo(xp);
    
    return {
      username: userResult?.nickname || userInfo?.username || 'Tribe Member',
      profile_image_url: undefined,
      level: levelInfo.level,
      xp_points: xp,
      post_count: 0,
      follower_count: userResult?.followerCount || 0,
      following_count: userResult?.followingCount || 0
    };
  };

  // Handle post deletion
  const handlePostDeleted = (deletedPostId: string) => {
    setUserPosts(prev => prev.filter(post => post.id !== deletedPostId));
    if (profileData) {
      setProfileData(prev => prev ? { 
        ...prev, 
        post_count: Math.max(0, prev.post_count - 1) 
      } : null);
    }
    toast.success('Post deleted successfully');
  };

  // Handle post click
  const handlePostClick = async (post: UserPost) => {
    try {
      setSelectedPost({
        id: post.id,
        username: profileData?.username || 'You',
        nickname: profileData?.username || 'You',
        coreRealm: 'mirrorcore',
        timestamp: post.timestamp,
        caption: post.caption,
        content: post.caption,
        imageUrl: post.imageUrl || null,
        liked: false,
        bookmarked: false,
        likes: post.likes,
        comments: [],
        xpEarned: 0,
        type: post.imageUrl ? 'image' : 'thought',
        visibility: 'public',
        tribeId: null,
        tribeName: null
      });
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error opening post for editing:', error);
      toast.error('Could not open post');
    }
  };

  // Check authentication
  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        setProfileData(createFallbackProfileData());
        return null;
      }
      
      const validUserId = guardUUID(session.user.id, 'ProfilePage checkAuth');
      if (!validUserId) {
        setProfileData(createFallbackProfileData());
        return null;
      }
      
      setUid(validUserId);
      return validUserId;
    } catch (error) {
      console.error('Auth check failed:', error);
      setProfileData(createFallbackProfileData());
      return null;
    }
  };

  // Fetch user posts
  const fetchUserPosts = async (userId: string) => {
    try {
      const { edgeGet } = await import('../utils/edge');
      const data = await edgeGet<{ posts: any[] }>(`/users/${userId}/posts`);
      
      if (data && data.posts && Array.isArray(data.posts)) {
        const formattedPosts = data.posts.map((post: any) => ({
          id: post.id,
          caption: post.text_body || post.content || post.caption || '',
          timestamp: formatTimestamp(post.created_at || post.createdAt),
          likes: post.like_count || post.likes || 0,
          comments: post.comment_count || post.comments || 0,
          imageUrl: post.media_thumb_url || post.media_url || post.thumbnail_url || post.contentUrl,
          type: post.type || (post.media_url ? 'image' : 'thought'),
          mediaType: post.media_type
        }));

        setUserPosts(formattedPosts);
        
        if (profileData) {
          setProfileData(prev => prev ? { ...prev, post_count: formattedPosts.length } : null);
        }
      } else {
        setUserPosts([]);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      setUserPosts([]);
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Load data
  const loadData = async () => {
    setLoading(true);
    try {
      setProfileData(createFallbackProfileData());
      
      const userId = await checkAuth();
      if (userId) {
        await fetchUserPosts(userId);
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle bio update
  const handleBioUpdate = (newBio: string) => {
    if (profileData) {
      setProfileData(prev => prev ? { ...prev, description: newBio } : null);
    }
  };

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  const achievements = getAchievements(profileData || undefined);
  const earnedAchievements = achievements.filter(a => a.earned);

  return (
    <div className="min-h-screen bg-midnight-black pb-safe mobile-safe">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-midnight-black/90 soft-blur border-b border-muted-lavender/20 pt-safe">
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3">
          <button
            onClick={onBack}
            className="p-2 bg-transparent border border-muted-lavender/30 text-muted-lavender hover:text-pearl-white hover:bg-muted-lavender/10 rounded-xl transition-all duration-300 touch-target"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          
          <h1 className="font-headline text-pearl-white text-lg sm:text-xl">My Profile</h1>
          
          {onNavigateToPage && (
            <button
              onClick={() => onNavigateToPage('settings')}
              className="p-2 bg-transparent border border-muted-lavender/30 text-muted-lavender hover:text-pearl-white hover:bg-muted-lavender/10 rounded-xl transition-all duration-300 touch-target"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Profile Header */}
        <Card className="bg-gradient-to-br from-midnight-black/80 to-midnight-black/60 border-muted-lavender/30">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center space-x-3 sm:space-x-4 mb-4">
              <Avatar className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0">
                <AvatarImage src={profileData?.profile_image_url} />
                <AvatarFallback className={`bg-gradient-to-r from-${themeColors.primary} to-${themeColors.secondary} text-midnight-black`}>
                  {profileData?.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <SafeUsername 
                  username={profileData?.username || 'Loading...'}
                  className="text-lg sm:text-xl font-medium text-pearl-white"
                />
                
                {profileData && (
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline" className={`border-${themeColors.primary} text-${themeColors.primary} bg-${themeColors.primary}/10`}>
                      Level {profileData.level}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Bio Section */}
            <div className="mb-4">
              <BioEditor
                initialBio={profileData?.description || ''}
                onBioUpdate={handleBioUpdate}
                maxLength={160}
                placeholder="Add a bio to tell people about yourself..."
              />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xl font-medium text-pearl-white">
                  {safeFormatCount(profileData?.post_count || 0)}
                </div>
                <div className="text-sm text-muted-lavender">Posts</div>
              </div>
              <div>
                <div className="text-xl font-medium text-pearl-white">
                  {safeFormatCount(profileData?.follower_count || 0)}
                </div>
                <div className="text-sm text-muted-lavender">Followers</div>
              </div>
              <div>
                <div className="text-xl font-medium text-pearl-white">
                  {safeFormatCount(profileData?.following_count || 0)}
                </div>
                <div className="text-sm text-muted-lavender">Following</div>
              </div>
            </div>

            {/* XP Progress */}
            {profileData && (
              <div className="mt-4">
                <LevelProgressBar 
                  currentXP={profileData.xp_points}
                  level={profileData.level}
                  showLabel={true}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-midnight-black/50 border border-muted-lavender/20">
            <TabsTrigger value="posts" className="data-[state=active]:bg-neon-lilac/20 data-[state=active]:text-neon-lilac">
              <List className="w-4 h-4 mr-2" />
              Posts
            </TabsTrigger>
            <TabsTrigger value="achievements" className="data-[state=active]:bg-electric-blue/20 data-[state=active]:text-electric-blue">
              <Trophy className="w-4 h-4 mr-2" />
              Achievements
            </TabsTrigger>
            <TabsTrigger value="saved" className="data-[state=active]:bg-soft-blush/20 data-[state=active]:text-soft-blush">
              <Bookmark className="w-4 h-4 mr-2" />
              Saved
            </TabsTrigger>
          </TabsList>

          {/* Posts Tab Content */}
          <TabsContent value="posts" className="space-y-4 mt-6">
            <ProfilePostsSection
              posts={userPosts}
              loading={loading}
              onPostClick={handlePostClick}
              onCreatePost={onNavigateToPage ? () => onNavigateToPage('create') : undefined}
              isOwnProfile={isOwnProfile}
            />
          </TabsContent>

          {/* Achievements Tab Content */}
          <TabsContent value="achievements" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {earnedAchievements.map((achievement) => (
                <Card key={achievement.id} className="bg-gradient-to-br from-midnight-black/80 to-midnight-black/60 border-muted-lavender/30">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg bg-${achievement.color}/20`}>
                        <achievement.icon className={`w-5 h-5 text-${achievement.color}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-pearl-white">{achievement.name}</h3>
                        <p className="text-sm text-muted-lavender/70 mt-1">{achievement.description}</p>
                        {achievement.earnedDate && (
                          <p className="text-xs text-muted-lavender/50 mt-2">Earned {achievement.earnedDate}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Saved Tab Content */}
          <TabsContent value="saved" className="space-y-4 mt-6">
            <div className="text-center py-12">
              <Bookmark className="w-16 h-16 mx-auto mb-4 text-muted-lavender/40" />
              <h3 className="text-lg font-medium text-pearl-white mb-2">No saved posts yet</h3>
              <p className="text-muted-lavender/70">Posts you save will appear here</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Post Detail Modal */}
      {selectedPost && (
        <EditablePostDetailsDrawer
          post={selectedPost}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedPost(null);
          }}
          onPostDeleted={handlePostDeleted}
        />
      )}
    </div>
  );
}