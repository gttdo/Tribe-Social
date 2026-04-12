import React, { useState, useEffect } from 'react';
import { ChevronLeft, Users, Loader2, Search } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback } from './ui/avatar';
import { FollowButton } from './FollowButton';
import { Badge } from './ui/badge';
import type { CoreRealm } from '../App';

interface User {
  id: string;
  username: string;
  nickname: string;
  coreRealm: CoreRealm | null;
  followerCount: number;
  followingCount: number;
  level: number;
  xp: number;
  isFollowing?: boolean;
  isFollowedBy?: boolean;
  description?: string | null; // Add description field with null guard
}

interface UserListPageProps {
  userId: string;
  listType: 'followers' | 'following';
  title?: string;
  onBack: () => void;
  onUserSelect?: (user: User) => void;
}

export function UserListPage({ 
  userId, 
  listType, 
  title, 
  onBack, 
  onUserSelect 
}: UserListPageProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string>('');

  const pageTitle = title || (listType === 'followers' ? 'Followers' : 'Following');

  useEffect(() => {
    fetchUsers();
  }, [userId, listType]);

  useEffect(() => {
    // Filter users based on search query
    if (searchQuery.trim()) {
      const filtered = users.filter(user => 
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.nickname.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError('');

      const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
      
      const endpoint = listType === 'followers' 
        ? `/make-server-70df0d6e/users/${userId}/followers`
        : `/make-server-70df0d6e/users/${userId}/following`;

      const response = await makeAuthenticatedRequest(endpoint);

      if (response.error) {
        throw new Error(response.error);
      }

      const userList = response[listType] || [];
      setUsers(userList);
      setFilteredUsers(userList);

    } catch (error) {
      console.error(`Error fetching ${listType}:`, error);
      setError(error instanceof Error ? error.message : `Failed to load ${listType}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowChange = (targetUserId: string, isFollowing: boolean) => {
    // Update the user's follow status in the list
    setUsers(prev => prev.map(user => 
      user.id === targetUserId 
        ? { ...user, isFollowing }
        : user
    ));
    setFilteredUsers(prev => prev.map(user => 
      user.id === targetUserId 
        ? { ...user, isFollowing }
        : user
    ));
  };

  const getRealmColors = (realm: CoreRealm) => {
    const colors = {
      mirrorcore: { bg: 'electric-blue/20', text: 'electric-blue', border: 'electric-blue/30' },
      embercore: { bg: 'soft-blush/20', text: 'soft-blush', border: 'soft-blush/30' },
      shadowcore: { bg: 'muted-lavender/20', text: 'muted-lavender', border: 'muted-lavender/30' }
    };
    return colors[realm] || colors.mirrorcore;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-midnight-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-neon-lilac animate-spin mx-auto" />
          <p className="text-muted-lavender font-body">Loading {listType}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-midnight-black flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 mx-auto rounded-full bg-glitch-red/20 border border-glitch-red/50 flex items-center justify-center">
            <Users className="w-8 h-8 text-glitch-red" />
          </div>
          <h2 className="font-headline text-pearl-white text-xl">Error Loading {pageTitle}</h2>
          <p className="text-muted-lavender font-body">{error}</p>
          <div className="space-x-2">
            <Button onClick={onBack} variant="outline" className="border-muted-lavender/30 text-muted-lavender">
              Go Back
            </Button>
            <Button onClick={fetchUsers} className="bg-gradient-to-r from-neon-lilac to-electric-blue text-white">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-midnight-black">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-midnight-black/80 soft-blur border-b border-muted-lavender/20 pt-safe">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <Button
              onClick={onBack}
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-lavender hover:text-pearl-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
            
            <div>
              <h1 className="font-headline text-pearl-white">{pageTitle}</h1>
              <p className="text-sm text-muted-lavender font-body">
                {filteredUsers.length} {filteredUsers.length === 1 ? 'person' : 'people'}
              </p>
            </div>
          </div>

          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-neon-lilac/20 to-electric-blue/20 border border-neon-lilac/40 flex items-center justify-center">
            <Users className="w-6 h-6 text-neon-lilac" />
          </div>
        </div>

        {/* Search Bar */}
        {users.length > 0 && (
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-lavender/60" />
              <Input
                type="text"
                placeholder={`Search ${listType}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-midnight-black/50 border-muted-lavender/30 text-pearl-white placeholder:text-muted-lavender/60 font-body"
              />
            </div>
          </div>
        )}
      </div>

      {/* User List */}
      <div className="px-4 py-6">
        {filteredUsers.length === 0 && !searchQuery ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted-lavender/10 border border-muted-lavender/30 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-muted-lavender" />
            </div>
            <h3 className="font-headline text-pearl-white text-lg mb-2">
              No {pageTitle} Yet
            </h3>
            <p className="text-muted-lavender font-body">
              {listType === 'followers' 
                ? 'No one is following this user yet.' 
                : 'This user isn\'t following anyone yet.'}
            </p>
          </div>
        ) : filteredUsers.length === 0 && searchQuery ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted-lavender/10 border border-muted-lavender/30 flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-muted-lavender" />
            </div>
            <h3 className="font-headline text-pearl-white text-lg mb-2">No Results</h3>
            <p className="text-muted-lavender font-body">
              No {listType} found matching "{searchQuery}"
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => {
              const realmColors = user.coreRealm ? getRealmColors(user.coreRealm) : null;
              
              return (
                <div
                  key={user.id}
                  className="bg-midnight-black/30 border border-muted-lavender/20 rounded-xl p-4 hover:bg-midnight-black/50 transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <div 
                      className="flex items-center space-x-3 flex-1 cursor-pointer"
                      onClick={() => onUserSelect?.(user)}
                    >
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className={`${realmColors ? `bg-${realmColors.bg} text-${realmColors.text}` : 'bg-muted-lavender/20 text-muted-lavender'} font-headline`}>
                          {user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-body font-medium text-pearl-white truncate">
                            @{user.username}
                          </h3>
                          {user.coreRealm && (
                            <Badge 
                              variant="secondary" 
                              className={`bg-${realmColors!.bg} text-${realmColors!.text} border-${realmColors!.border} text-xs`}
                            >
                              {user.coreRealm}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-electric-blue font-body mb-1">{user.nickname}</p>
                        <div className="flex items-center space-x-4 text-xs text-muted-lavender font-body">
                          <span>{user.followerCount} followers</span>
                          <span>{user.followingCount} following</span>
                          <span>Lv. {user.level}</span>
                        </div>
                      </div>
                    </div>

                    <div className="ml-3">
                      <FollowButton
                        userId={user.id}
                        isFollowing={user.isFollowing}
                        isFollowedBy={user.isFollowedBy}
                        size="sm"
                        showText={false}
                        onFollowChange={(isFollowing) => handleFollowChange(user.id, isFollowing)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}