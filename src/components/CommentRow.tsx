import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Heart, MessageCircle, MoreHorizontal } from 'lucide-react';
import { cn } from './ui/utils';
import { formatTimeAgo } from '../utils/timestamp-helpers';

interface CommentRowProps {
  id: string;
  avatar?: string | null;
  name: string;
  body: string;
  time: string;
  coreRealm?: string;
  likes?: number;
  isLiked?: boolean;
  onLike?: (commentId: string) => void;
  onReply?: (commentId: string, commentAuthor: string) => void;
}

export function CommentRow({ 
  id,
  avatar, 
  name, 
  body, 
  time, 
  coreRealm,
  likes = 0,
  isLiked = false,
  onLike,
  onReply
}: CommentRowProps) {
  const [isPressed, setIsPressed] = useState(false);
  
  // Safe fallbacks for all props
  const safeName = name || 'Unknown User';
  const safeBody = body || '';
  const safeTime = time || '';
  
  // Get realm colors safely
  const getRealmColors = (realm?: string) => {
    const colors = {
      mirrorcore: { primary: 'electric-blue', secondary: 'soft-blush' },
      embercore: { primary: 'glitch-red', secondary: 'neon-lilac' },
      shadowcore: { primary: 'neon-lilac', secondary: 'electric-blue' }
    };
    return colors[realm as keyof typeof colors] || colors.mirrorcore;
  };

  const realmColors = getRealmColors(coreRealm);

  const handleLike = () => {
    if (onLike) {
      onLike(id);
    }
  };

  const handleReply = () => {
    if (onReply) {
      onReply(id, safeName);
    }
  };

  // Format timestamp with consistent "name • time" format
  const formattedTime = safeTime ? formatTimeAgo(safeTime) : '';
  const displayText = formattedTime ? `${safeName} • ${formattedTime}` : safeName;

  return (
    <div className={cn(
      "group flex items-start space-x-3 p-3 rounded-xl transition-all duration-200",
      "hover:bg-muted-lavender/5",
      isPressed && "bg-muted-lavender/10"
    )}>
      <Avatar className="w-8 h-8 flex-shrink-0">
        {avatar && (
          <AvatarImage src={avatar} alt={safeName} />
        )}
        <AvatarFallback className={`bg-gradient-to-r from-${realmColors.primary} to-${realmColors.secondary} text-white font-headline text-sm`}>
          {safeName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        {/* Comment Header - Updated to use consistent format */}
        <div className="flex items-center justify-between mb-1">
          <span className="font-body font-medium text-pearl-white text-sm truncate">
            {displayText}
          </span>
          
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-lavender hover:text-pearl-white h-6 w-6 p-1"
          >
            <MoreHorizontal className="w-3 h-3" />
          </Button>
        </div>
        
        {/* Comment Content */}
        <p className="text-pearl-white font-body text-sm break-words leading-relaxed mb-2">
          {safeBody}
        </p>
        
        {/* Comment Actions */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            onMouseLeave={() => setIsPressed(false)}
            className={cn(
              "h-7 px-2 space-x-1 text-xs transition-all duration-200",
              "hover:bg-muted-lavender/10 hover:text-neon-lilac",
              isLiked 
                ? "text-neon-lilac bg-neon-lilac/10" 
                : "text-muted-lavender"
            )}
          >
            <Heart 
              className={cn(
                "w-3 h-3 transition-all duration-200",
                isLiked && "fill-current scale-110"
              )} 
            />
            {likes > 0 && (
              <span className="font-medium">
                {likes}
              </span>
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReply}
            className="h-7 px-2 space-x-1 text-xs text-muted-lavender hover:text-electric-blue hover:bg-electric-blue/10 transition-all duration-200"
          >
            <MessageCircle className="w-3 h-3" />
            <span className="font-medium">Reply</span>
          </Button>
        </div>
      </div>
    </div>
  );
}