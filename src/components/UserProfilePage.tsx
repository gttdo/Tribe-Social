import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { SafeBio, SafeUsername, SafePostContent } from './SafeText';
import { UserLevelInfo, LevelBadge } from './LevelProgressBar';
import { safeFormatCount } from '../utils/safe-rendering';
import { 
  ArrowLeft, 
  MoreHorizontal,
  Grid3X3,
  Heart,
  MessageCircle,
  UserPlus,
  UserCheck
} from 'lucide-react';
import { CoreRealm } from '../App';

interface UserProfile {
  username: string;
  nickname: string;
  coreRealm: CoreRealm;
  followers: number;
  following: number;
  posts: number;
  bio: string;
  xp?: number;          // NEW: Add XP field
  level?: number;       // NEW: Add level field
  isFollowing: boolean;
  isOwn: boolean;
}

interface UserProfilePageProps {
  profile: UserProfile;
  onBack: () => void;
  onToggleFollow: (username: string) => void;
}

const mockPosts = [
  {
    id: '1',
    caption: 'Lost in the liminal spaces between dreams ✨',
    likes: 45,
    comments: 12,
    timestamp: '3h ago'
  },
  {
    id: '2',
    caption: 'Digital alchemy transforming reality 🔥',
    likes: 67,
    comments: 8,
    timestamp: '1d ago'
  },
  {
    id: '3',
    caption: 'Reflecting on the cosmic journey within',
    likes: 23,
    comments: 5,
    timestamp: '2d ago'
  }
];

export function UserProfilePage({ profile, onBack, onToggleFollow }: UserProfilePageProps) {
  const getRealmColors = (realm: CoreRealm) => {
    const colors = {
      mirrorcore: { primary: 'electric-blue', secondary: 'soft-blush' },
      embercore: { primary: 'glitch-red', secondary: 'neon-lilac' },
      shadowcore: { primary: 'neon-lilac', secondary: 'electric-blue' }
    };
    return colors[realm];
  };

  const realmColors = getRealmColors(profile.coreRealm);

  return (
    <div className="min-h-screen bg-midnight-black pb-safe">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-midnight-black/80 soft-blur border-b border-muted-lavender/20 pt-safe">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={onBack}
            className="p-2 bg-transparent border border-muted-lavender/30 text-muted-lavender hover:text-pearl-white hover:bg-muted-lavender/10 rounded-xl transition-all duration-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <h1 className="font-headline font-medium text-pearl-white">@{profile.username}</h1>
          
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
                <AvatarFallback className={`bg-gradient-to-r from-${realmColors.primary} to-${realmColors.secondary} text-white font-headline text-2xl`}>
                  {profile.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h2 className="font-headline text-pearl-white text-xl font-medium">@{profile.username}</h2>
                  {profile.level && (
                    <LevelBadge xp={profile.xp} level={profile.level} />
                  )}
                </div>
                <p className={`text-${realmColors.primary} font-body text-sm mb-2`}>{profile.nickname}</p>
                
                {profile.xp !== undefined && (
                  <p className={`text-${realmColors.secondary} font-body text-sm mb-3`}>
                    ✨ {profile.xp} XP
                  </p>
                )}
                
                <div className="flex space-x-2">
                  <Button
                    onClick={() => onToggleFollow(profile.username)}
                    className={`flex-1 ${
                      profile.isFollowing
                        ? 'bg-muted-lavender/20 border border-muted-lavender/40 text-muted-lavender hover:bg-muted-lavender/30'
                        : `bg-gradient-to-r from-${realmColors.primary} to-${realmColors.secondary} hover:from-${realmColors.primary}/90 hover:to-${realmColors.secondary}/90 text-white`
                    } font-body rounded-xl px-4 py-2 text-sm transition-all duration-300 flex items-center justify-center space-x-2`}
                  >
                    {profile.isFollowing ? (
                      <>
                        <UserCheck className="w-4 h-4" />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Follow</span>
                      </>
                    )}
                  </Button>
                  
                  <Button className="bg-muted-lavender/10 border border-muted-lavender/30 text-muted-lavender hover:bg-muted-lavender/20 font-body rounded-xl px-4 py-2 text-sm">
                    Message
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-around py-4 border-t border-b border-muted-lavender/20">
              <div className="text-center">
                <p className="font-headline text-pearl-white text-lg">{profile.posts}</p>
                <p className="text-muted-lavender font-body text-sm">Posts</p>
              </div>
              <div className="text-center">
                <p className="font-headline text-pearl-white text-lg">{safeFormatCount(profile.followers)}</p>
                <p className="text-muted-lavender font-body text-sm">Followers</p>
              </div>
              <div className="text-center">
                <p className="font-headline text-pearl-white text-lg">{safeFormatCount(profile.following)}</p>
                <p className="text-muted-lavender font-body text-sm">Following</p>
              </div>
            </div>

            <SafeBio 
              description={profile.bio}
              className="mt-4 leading-relaxed"
              showFullOnClick={true}
            />
          </CardContent>
        </Card>

        {/* Posts Grid */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Grid3X3 className="w-5 h-5 text-muted-lavender" />
            <h3 className="font-headline text-pearl-white">Posts</h3>
          </div>
          
          {mockPosts.length > 0 ? (
            <div className="grid gap-4">
              {mockPosts.map((post) => (
                <Card key={post.id} className="bg-midnight-black/50 border-muted-lavender/30 hover:border-muted-lavender/50 transition-all duration-300">
                  <CardContent className="p-4">
                    <SafePostContent 
                      content={post.caption}
                      className="text-pearl-white font-body mb-3"
                      showFullOnClick={false}
                    />
                    <div className="flex items-center justify-between text-sm text-muted-lavender">
                      <span className="font-body">{post.timestamp}</span>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <Heart className="w-4 h-4" />
                          <span>{safeFormatCount(post.likes)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MessageCircle className="w-4 h-4" />
                          <span>{safeFormatCount(post.comments)}</span>
                        </div>
                      </div>
                    </div>
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