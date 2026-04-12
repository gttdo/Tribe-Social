import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Heart, MessageCircle, MoreHorizontal, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from './ui/utils';
import { formatTimeAgo } from '../utils/timestamp-helpers';

interface Reply {
  id: string;
  username: string;
  content: string;
  timestamp: string;
  likes: number;
  isLiked: boolean;
  avatar?: string;
}

interface Comment {
  id: string;
  username: string;
  content: string;
  timestamp: string;
  likes: number;
  isLiked: boolean;
  avatar?: string;
  replies?: Reply[];
  replyCount?: number;
}

interface ThreadedCommentRowProps {
  comment: Comment;
  isNested?: boolean;
  showReplies?: boolean;
  onLike?: (commentId: string) => void;
  onReply?: (commentId: string, username: string) => void;
  onLoadReplies?: (commentId: string) => void;
}

export function ThreadedCommentRow({
  comment,
  isNested = false,
  showReplies: initialShowReplies = false,
  onLike,
  onReply,
  onLoadReplies
}: ThreadedCommentRowProps) {
  const {
    id,
    username,
    content,
    timestamp,
    likes = 0,
    isLiked = false,
    avatar,
    replies = [],
    replyCount = 0
  } = comment;
  const [showReplies, setShowReplies] = useState(initialShowReplies);
  const [isPressed, setIsPressed] = useState(false);

  const handleLike = () => {
    if (onLike) {
      onLike(id);
    }
  };

  const handleReply = () => {
    if (onReply) {
      onReply(id, username);
    }
  };

  const handleToggleReplies = () => {
    if (!showReplies && onLoadReplies && replies.length === 0 && replyCount > 0) {
      onLoadReplies(id);
    }
    setShowReplies(!showReplies);
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  // Format timestamp with consistent "username • time" format
  const formattedTime = timestamp ? formatTimeAgo(timestamp) : '';
  const displayText = formattedTime ? `${username} • ${formattedTime}` : username;

  return (
    <div className={cn(
      "transition-all duration-200",
      isNested ? "ml-8 mt-1" : ""
    )}>
      <div className={cn(
        "group flex items-start space-x-3 py-2 px-1 transition-all duration-200",
        "active:bg-muted-lavender/5",
        isPressed && "bg-muted-lavender/8",
        isNested && "ml-4"
      )}>
        <Avatar className={cn(
          "flex-shrink-0",
          isNested ? "w-7 h-7" : "w-8 h-8"
        )}>
          {avatar && (
            <AvatarImage src={avatar} alt={username} />
          )}
          <AvatarFallback className="bg-gradient-to-r from-neon-lilac to-electric-blue text-white font-headline text-xs">
            {username ? username.charAt(0).toUpperCase() : 'U'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          {/* Instagram-style Comment Content */}
          <div className="mb-1">
            <p className={cn(
              "text-pearl-white font-body break-words leading-relaxed",
              isNested ? "text-sm" : "text-sm"
            )}>
              <span className="font-medium text-pearl-white mr-2">
                {username}
              </span>
              {content}
            </p>
          </div>
          
          {/* Instagram-style Comment Meta */}
          <div className="flex items-center space-x-4 text-xs text-muted-lavender">
            <span className="font-medium">
              {formattedTime}
            </span>
            
            {likes > 0 && (
              <span className="font-medium">
                {formatCount(likes)} {likes === 1 ? 'like' : 'likes'}
              </span>
            )}
            
            {!isNested && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReply}
                className="h-6 px-0 text-xs font-medium text-muted-lavender hover:text-pearl-white transition-colors"
              >
                Reply
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              onTouchStart={() => setIsPressed(true)}
              onTouchEnd={() => setIsPressed(false)}
              onMouseDown={() => setIsPressed(true)}
              onMouseUp={() => setIsPressed(false)}
              onMouseLeave={() => setIsPressed(false)}
              className={cn(
                "h-6 px-0 transition-all duration-200 touch-target",
                isLiked 
                  ? "text-glitch-red hover:text-glitch-red/80" 
                  : "text-muted-lavender hover:text-glitch-red"
              )}
            >
              <Heart 
                className={cn(
                  "w-3 h-3 transition-all duration-200",
                  isLiked && "fill-current scale-110"
                )} 
              />
            </Button>
          </div>
        </div>
      </div>

      {/* Replies Section */}
      {!isNested && replyCount > 0 && (
        <div className="ml-12 mt-2">
          <Button
            variant="ghost"
            onClick={handleToggleReplies}
            className="h-8 px-2 text-xs text-electric-blue hover:text-electric-blue/80 hover:bg-electric-blue/10 transition-all duration-200"
          >
            {showReplies ? (
              <ChevronDown className="w-3 h-3 mr-1" />
            ) : (
              <ChevronRight className="w-3 h-3 mr-1" />
            )}
            <span className="font-medium">
              {showReplies ? 'Hide' : 'View'} {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
            </span>
          </Button>
          
          {/* Nested Replies */}
          {showReplies && (
            <div className="space-y-1 mt-2">
              {replies.map(reply => (
                <ThreadedCommentRow
                  key={reply.id}
                  comment={reply}
                  isNested={true}
                  onLike={onLike}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}