import React, { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Users, Lock, Globe, Hash, TrendingUp, Settings, Crown } from 'lucide-react';

export interface Tribe {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  isPrivate: boolean;
  category: string;
  trending: boolean;
  tags: string[];
  recentActivity: string;
  isJoined?: boolean;
  isAdmin?: boolean;
  bannerColor?: string;
}

interface TribeCardProps {
  tribe: Tribe;
  onJoin?: (tribeId: string) => void;
  onLeave?: (tribeId: string) => void;
  onManage?: (tribeId: string) => void;
  className?: string;
}

export function TribeCard({ tribe, onJoin, onLeave, onManage, className = '' }: TribeCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleJoinLeave = async () => {
    setIsLoading(true);
    
    try {
      if (tribe.isJoined) {
        onLeave?.(tribe.id);
      } else {
        onJoin?.(tribe.id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`relative group soft-blur border-muted-lavender/30 hover:dreamy-glow transition-all duration-300 rounded-2xl overflow-hidden ${className}`}>
      {/* Banner */}
      <div 
        className="h-24 relative"
        style={{
          background: tribe.bannerColor 
            ? `linear-gradient(135deg, ${tribe.bannerColor}40, ${tribe.bannerColor}60)` 
            : 'linear-gradient(135deg, #C084FC40, #7DD3FC40)'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        
        {/* Tribe badges */}
        <div className="absolute top-3 left-3 flex space-x-2">
          {tribe.isPrivate ? (
            <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-soft-blush/20 backdrop-blur-sm">
              <Lock className="w-3 h-3 text-soft-blush" />
              <span className="text-xs text-soft-blush font-medium">Private</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-electric-blue/20 backdrop-blur-sm">
              <Globe className="w-3 h-3 text-electric-blue" />
              <span className="text-xs text-electric-blue font-medium">Public</span>
            </div>
          )}
          
          {tribe.trending && (
            <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-neon-lilac/20 backdrop-blur-sm">
              <TrendingUp className="w-3 h-3 text-neon-lilac" />
              <span className="text-xs text-neon-lilac font-medium">Trending</span>
            </div>
          )}
        </div>

        {/* Admin controls */}
        {tribe.isAdmin && (
          <div className="absolute top-3 right-3">
            <Button
              onClick={() => onManage?.(tribe.id)}
              size="sm"
              variant="ghost"
              className="p-2 bg-midnight-black/30 backdrop-blur-sm border border-neon-lilac/30 text-neon-lilac hover:bg-neon-lilac/20"
            >
              <Crown className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <h3 className="font-headline text-xl text-pearl-white group-hover:text-neon-lilac transition-colors duration-300">
              {tribe.name}
            </h3>
            <Badge variant="outline" className="text-xs border-muted-lavender/30 text-muted-lavender">
              {tribe.category}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-muted-lavender">
            <Users className="w-4 h-4" />
            <span>{tribe.memberCount.toLocaleString()} members</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-lavender font-body leading-relaxed line-clamp-2">
          {tribe.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {tribe.tags.slice(0, 3).map((tag) => (
            <span 
              key={tag}
              className="inline-flex items-center px-2 py-1 rounded-full bg-muted-lavender/10 text-xs text-muted-lavender hover:text-electric-blue transition-colors duration-200 cursor-pointer"
            >
              <Hash className="w-3 h-3 mr-1" />
              {tag}
            </span>
          ))}
          {tribe.tags.length > 3 && (
            <span className="text-xs text-muted-lavender/60">
              +{tribe.tags.length - 3} more
            </span>
          )}
        </div>

        {/* Recent Activity */}
        <p className="text-xs text-electric-blue/80 font-body">
          {tribe.recentActivity}
        </p>

        {/* Actions */}
        <div className="flex space-x-3">
          <Button
            onClick={handleJoinLeave}
            disabled={isLoading}
            className={`
              flex-1 transition-all duration-300
              ${tribe.isJoined
                ? 'bg-neon-lilac/20 border border-neon-lilac text-neon-lilac hover:bg-neon-lilac/30'
                : 'bg-neon-lilac hover:bg-neon-lilac/80 text-midnight-black'
              }
            `}
            variant={tribe.isJoined ? "outline" : "default"}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : tribe.isJoined ? (
              'Joined'
            ) : tribe.isPrivate ? (
              'Request Access'
            ) : (
              'Join Tribe'
            )}
          </Button>
          
          {tribe.isJoined && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-lavender hover:text-pearl-white hover:bg-muted-lavender/10 border border-muted-lavender/20"
            >
              View Feed
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}