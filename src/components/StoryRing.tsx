import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { TribeAccessRequestDialog } from './TribeAccessRequestDialog';
import { Plus, Users, Lock, Shield } from 'lucide-react';
import { StoryGroup } from '../utils/story-types';
import { hasRequestedAccess } from '../utils/tribe-access-helpers';
import { formatDistanceToNow } from 'date-fns';

interface StoryRingProps {
  storyGroup?: StoryGroup;
  isCreateButton?: boolean;
  onClick: () => void;
  userAvatar?: string;
  userName?: string;
}

export function StoryRing({ 
  storyGroup, 
  isCreateButton = false, 
  onClick, 
  userAvatar, 
  userName 
}: StoryRingProps) {
  if (isCreateButton) {
    return (
      <div className="flex flex-col items-center gap-2 min-w-0">
        <Button
          onClick={onClick}
          className="relative w-16 h-16 p-0 rounded-full overflow-hidden bg-gradient-to-br from-neon-lilac/20 to-electric-blue/20 border-2 border-dashed border-neon-lilac/50 hover:border-neon-lilac hover:from-neon-lilac/30 hover:to-electric-blue/30 transition-all duration-300"
        >
          <div className="absolute inset-2 rounded-full bg-midnight-black/50 flex items-center justify-center">
            <Plus className="w-6 h-6 text-neon-lilac" />
          </div>
        </Button>
        
        <div className="text-center min-w-0 max-w-[70px]">
          <p className="font-body text-pearl-white text-xs truncate">Your Story</p>
        </div>
      </div>
    );
  }

  if (!storyGroup) return null;

  const { user, tribe, stories, has_new_stories, latest_story_time } = storyGroup;
  const latestStory = stories[stories.length - 1];
  
  // Check if user or tribe data indicates privacy/locking
  const isUserPrivate = user?.is_private === true;
  const isTribePrivate = tribe?.is_private === true;
  
  // Display name handling with privacy fallbacks
  let displayName = 'Unknown User';
  if (isUserPrivate) {
    displayName = 'Private User';
  } else if (user) {
    displayName = user.nickname || user.username || 'Unknown User';
  }
  
  // Tribe name handling with privacy fallbacks
  let tribeName = null;
  if (tribe) {
    if (isTribePrivate) {
      tribeName = 'Private Tribe';
    } else {
      tribeName = tribe.name;
    }
  }
  
  const isMultipleStories = stories.length > 1;

  return (
    <div className="flex flex-col items-center gap-2 min-w-0">
      <Button
        onClick={onClick}
        className="relative w-16 h-16 p-0 rounded-full overflow-hidden bg-transparent hover:scale-105 transition-all duration-300"
        disabled={isUserPrivate && !stories.some(s => !s.author?.is_private)} // Disable if all stories are private
      >
        {/* Story ring gradient - dimmed for private content */}
        <div className={`absolute inset-0 rounded-full ${
          has_new_stories && !isUserPrivate
            ? 'bg-gradient-to-tr from-neon-lilac via-electric-blue to-soft-blush p-0.5'
            : isUserPrivate
            ? 'bg-gradient-to-tr from-muted-lavender/30 to-muted-lavender/20 p-0.5'
            : 'bg-gradient-to-tr from-muted-lavender/50 to-muted-lavender/30 p-0.5'
        }`}>
          <div className="w-full h-full rounded-full bg-midnight-black p-0.5">
            {/* Avatar or story preview with privacy handling */}
            {!isUserPrivate && latestStory?.media_type === 'image' && latestStory.media_url ? (
              <img
                src={latestStory.media_url}
                alt="Story preview"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <Avatar className="w-full h-full">
                <AvatarImage src={isUserPrivate ? undefined : user?.avatar_url} />
                <AvatarFallback className={`${
                  isUserPrivate 
                    ? 'bg-muted-lavender/10 text-muted-lavender/60' 
                    : 'bg-neon-lilac/20 text-neon-lilac'
                } font-headline text-sm`}>
                  {isUserPrivate ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    displayName[0]?.toUpperCase()
                  )}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>

        {/* Multiple stories indicator - hidden for private content */}
        {isMultipleStories && !isUserPrivate && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-electric-blue rounded-full border-2 border-midnight-black flex items-center justify-center">
            <span className="text-midnight-black font-body text-xs font-bold">
              {stories.length}
            </span>
          </div>
        )}

        {/* Tribe indicator with privacy handling */}
        {tribe && (
          <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 border-midnight-black flex items-center justify-center ${
            isTribePrivate 
              ? 'bg-muted-lavender/40' 
              : 'bg-soft-blush'
          }`}>
            {isTribePrivate ? (
              <Lock className="w-2.5 h-2.5 text-muted-lavender" />
            ) : (
              <Users className="w-3 h-3 text-midnight-black" />
            )}
          </div>
        )}

        {/* New stories pulse effect - disabled for private content */}
        {has_new_stories && !isUserPrivate && (
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-neon-lilac/20 via-electric-blue/20 to-soft-blush/20 animate-pulse" />
        )}

        {/* Privacy overlay for completely private stories */}
        {isUserPrivate && (
          <div className="absolute inset-0 rounded-full bg-midnight-black/60 flex items-center justify-center">
            <Lock className="w-6 h-6 text-muted-lavender/70" />
          </div>
        )}
      </Button>
      
      <div className="text-center min-w-0 max-w-[70px]">
        <p className={`font-body text-xs truncate ${
          has_new_stories && !isUserPrivate 
            ? 'text-pearl-white font-medium' 
            : 'text-muted-lavender'
        }`}>
          {displayName}
        </p>
        
        {tribeName && (
          <p className={`font-body text-[10px] truncate ${
            isTribePrivate ? 'text-muted-lavender/60' : 'text-muted-lavender'
          }`}>
            {tribeName}
            {isTribePrivate && ' 🔒'}
          </p>
        )}
        
        {!isUserPrivate && (
          <p className="font-body text-muted-lavender text-[10px]">
            {formatDistanceToNow(new Date(latest_story_time), { addSuffix: false })}
          </p>
        )}
        
        {isUserPrivate && (
          <p className="font-body text-muted-lavender/60 text-[10px]">
            Private
          </p>
        )}
      </div>
    </div>
  );
}

interface StoryRowProps {
  storyGroups: StoryGroup[];
  onStoryClick: (groupIndex: number) => void;
  onCreateStory: () => void;
  userAvatar?: string;
  userName?: string;
  className?: string;
}

export function StoryRow({ 
  storyGroups, 
  onStoryClick, 
  onCreateStory, 
  userAvatar, 
  userName,
  className = ''
}: StoryRowProps) {
  return (
    <div className={`flex gap-4 overflow-x-auto pb-4 px-4 scrollbar-hide ${className}`}>
      {/* Create story button */}
      <StoryRing
        isCreateButton
        onClick={onCreateStory}
        userAvatar={userAvatar}
        userName={userName}
      />
      
      {/* Story groups */}
      {storyGroups.map((group, index) => (
        <StoryRing
          key={`${group.user_id}-${group.tribe_id || 'personal'}`}
          storyGroup={group}
          onClick={() => onStoryClick(index)}
        />
      ))}
      
      {/* Empty state */}
      {storyGroups.length === 0 && (
        <div className="flex items-center justify-center w-full py-8">
          <div className="text-center">
            <p className="font-body text-muted-lavender text-sm">
              No stories yet today
            </p>
            <p className="font-body text-muted-lavender/70 text-xs mt-1">
              Be the first to share a moment
            </p>
          </div>
        </div>
      )}
    </div>
  );
}