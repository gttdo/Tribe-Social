import React, { useState, useEffect } from 'react';
import { Check, Search, Users, Lock, Globe, ChevronDown } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { TribeDisplay, TRIBE_CATEGORIES, canUserPerformAction } from '../utils/tribe-types';
import { Visibility } from '../utils/supabase/database-types';

interface TribeSelectorProps {
  selectedTribes: string[];
  onTribesChange: (tribeIds: string[]) => void;
  visibility: Visibility;
  onVisibilityChange: (visibility: Visibility) => void;
  allowMultiSelect?: boolean;
  isRequired?: boolean;
  maxSelections?: number;
  className?: string;
}

// Mock data for demonstration - in real app this would come from props or API
const mockTribes: TribeDisplay[] = [
  {
    id: '1',
    name: 'Tech Visionaries',
    description: 'Exploring the future of technology',
    category: 'Tech',
    member_count: 1245,
    post_count: 3421,
    is_private: false,
    isJoined: true,
    isAdmin: false,
    userRole: 'member',
    canPost: true,
    recentActivity: '2 hours ago',
    isTrending: true,
    created_at: '2024-01-01T00:00:00Z',
    owner_id: 'owner1',
    tags: ['tech', 'innovation'],
    rules: [],
    banner_url: null,
    avatar_url: null,
    owner: { id: 'owner1', username: 'techleader', nickname: 'Tech Leader' },
    user_membership: null,
    is_member: true,
    can_post: true,
    can_moderate: false,
    joinStatus: 'joined',
    recentPostCount: 12,
    activeMembers: 234,
    growthRate: 15.2,
    requiresApproval: false,
    hasContentWarnings: false
  },
  {
    id: '2',
    name: 'Digital Artists',
    description: 'Showcasing creative digital art',
    category: 'Art',
    member_count: 892,
    post_count: 2156,
    is_private: false,
    isJoined: true,
    isAdmin: true,
    userRole: 'admin',
    canPost: true,
    recentActivity: '1 hour ago',
    isTrending: false,
    created_at: '2024-01-01T00:00:00Z',
    owner_id: 'owner2',
    tags: ['art', 'digital'],
    rules: [],
    banner_url: null,
    avatar_url: null,
    owner: { id: 'owner2', username: 'artlead', nickname: 'Art Leader' },
    user_membership: null,
    is_member: true,
    can_post: true,
    can_moderate: true,
    joinStatus: 'joined',
    recentPostCount: 8,
    activeMembers: 145,
    growthRate: 8.7,
    requiresApproval: false,
    hasContentWarnings: false
  },
  {
    id: '3',
    name: 'Secret Society',
    description: 'An exclusive private community',
    category: 'General',
    member_count: 45,
    post_count: 234,
    is_private: true,
    isJoined: true,
    isAdmin: false,
    userRole: 'member',
    canPost: true,
    recentActivity: '30 minutes ago',
    isTrending: false,
    created_at: '2024-01-01T00:00:00Z',
    owner_id: 'owner3',
    tags: ['private', 'exclusive'],
    rules: [],
    banner_url: null,
    avatar_url: null,
    owner: { id: 'owner3', username: 'secretkeeper', nickname: 'Secret Keeper' },
    user_membership: null,
    is_member: true,
    can_post: true,
    can_moderate: false,
    joinStatus: 'joined',
    recentPostCount: 3,
    activeMembers: 23,
    growthRate: 2.1,
    requiresApproval: true,
    hasContentWarnings: false
  },
  {
    id: '4',
    name: 'Gaming Zone',
    description: 'All things gaming and esports',
    category: 'Gaming',
    member_count: 2134,
    post_count: 5421,
    is_private: false,
    isJoined: false,
    isAdmin: false,
    userRole: undefined,
    canPost: false,
    recentActivity: '5 minutes ago',
    isTrending: true,
    created_at: '2024-01-01T00:00:00Z',
    owner_id: 'owner4',
    tags: ['gaming', 'esports'],
    rules: [],
    banner_url: null,
    avatar_url: null,
    owner: { id: 'owner4', username: 'gaminglead', nickname: 'Gaming Leader' },
    user_membership: null,
    is_member: false,
    can_post: false,
    can_moderate: false,
    joinStatus: 'not_joined',
    recentPostCount: 25,
    activeMembers: 456,
    growthRate: 22.8,
    requiresApproval: false,
    hasContentWarnings: false
  }
];

export function TribeSelector({
  selectedTribes,
  onTribesChange,
  visibility,
  onVisibilityChange,
  allowMultiSelect = true,
  isRequired = false,
  maxSelections = 5,
  className = ''
}: TribeSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [availableTribes] = useState<TribeDisplay[]>(mockTribes);

  // Filter tribes based on search and membership
  const filteredTribes = availableTribes.filter(tribe => {
    const matchesSearch = tribe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tribe.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tribe.category?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Only show tribes the user is a member of and can post to
    return matchesSearch && tribe.isJoined && tribe.canPost;
  });

  // Handle tribe selection
  const handleTribeSelect = (tribeId: string) => {
    if (!allowMultiSelect) {
      onTribesChange([tribeId]);
      setIsExpanded(false);
      return;
    }

    let newSelection: string[];
    if (selectedTribes.includes(tribeId)) {
      newSelection = selectedTribes.filter(id => id !== tribeId);
    } else {
      if (selectedTribes.length >= maxSelections) {
        return; // Don't allow more selections than the limit
      }
      newSelection = [...selectedTribes, tribeId];
    }
    
    onTribesChange(newSelection);
    
    // Auto-adjust visibility based on selection
    if (newSelection.length > 0 && visibility === 'public') {
      onVisibilityChange('tribe');
    } else if (newSelection.length === 0 && visibility === 'tribe') {
      onVisibilityChange('public');
    }
  };

  // Handle visibility change
  const handleVisibilityChange = (newVisibility: Visibility) => {
    onVisibilityChange(newVisibility);
    
    // Clear tribe selection if not tribe visibility
    if (newVisibility !== 'tribe') {
      onTribesChange([]);
    }
  };

  // Get selected tribes data
  const selectedTribesData = availableTribes.filter(tribe => selectedTribes.includes(tribe.id));

  // Get visibility icon and text
  const getVisibilityIcon = (vis: Visibility) => {
    switch (vis) {
      case 'public':
        return <Globe className="w-4 h-4" />;
      case 'tribe':
        return <Users className="w-4 h-4" />;
      case 'private':
        return <Lock className="w-4 h-4" />;
    }
  };

  const getVisibilityText = (vis: Visibility) => {
    switch (vis) {
      case 'public':
        return 'Public';
      case 'tribe':
        return 'Tribe Only';
      case 'private':
        return 'Private';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Visibility Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-pearl-white">Who can see this post?</label>
        <div className="flex gap-2">
          {(['public', 'tribe', 'private'] as Visibility[]).map((vis) => (
            <Button
              key={vis}
              variant={visibility === vis ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleVisibilityChange(vis)}
              className={`flex items-center gap-2 ${
                visibility === vis
                  ? 'bg-neon-lilac text-midnight-black border-neon-lilac'
                  : 'border-muted-lavender/30 text-muted-lavender hover:border-neon-lilac/50 hover:text-neon-lilac'
              }`}
            >
              {getVisibilityIcon(vis)}
              {getVisibilityText(vis)}
            </Button>
          ))}
        </div>
      </div>

      {/* Tribe Selection (only shown for tribe visibility) */}
      {visibility === 'tribe' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-pearl-white">
              Select Tribe{allowMultiSelect ? 's' : ''} {isRequired && <span className="text-glitch-red">*</span>}
            </label>
            {allowMultiSelect && (
              <span className="text-xs text-muted-lavender">
                {selectedTribes.length}/{maxSelections} selected
              </span>
            )}
          </div>

          {/* Selected Tribes */}
          {selectedTribes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedTribesData.map((tribe) => (
                <Badge
                  key={tribe.id}
                  variant="secondary"
                  className="bg-neon-lilac/10 text-neon-lilac border-neon-lilac/30 px-3 py-1 flex items-center gap-2"
                >
                  {tribe.is_private && <Lock className="w-3 h-3" />}
                  {tribe.name}
                  <button
                    onClick={() => handleTribeSelect(tribe.id)}
                    className="ml-1 hover:text-glitch-red transition-colors"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Tribe Selector */}
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full justify-between border-muted-lavender/30 text-muted-lavender hover:border-neon-lilac/50"
            >
              <span>
                {selectedTribes.length === 0 
                  ? 'Choose your tribes...' 
                  : allowMultiSelect 
                    ? `${selectedTribes.length} tribe${selectedTribes.length !== 1 ? 's' : ''} selected`
                    : selectedTribesData[0]?.name
                }
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </Button>

            {isExpanded && (
              <div className="absolute z-50 w-full mt-2 bg-midnight-black/95 border border-muted-lavender/30 rounded-lg backdrop-blur-md shadow-xl">
                {/* Search */}
                <div className="p-3 border-b border-muted-lavender/20">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-lavender" />
                    <Input
                      placeholder="Search tribes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-transparent border-muted-lavender/30 text-pearl-white placeholder:text-muted-lavender"
                    />
                  </div>
                </div>

                {/* Tribe List */}
                <ScrollArea className="max-h-64">
                  <div className="p-2">
                    {filteredTribes.length === 0 ? (
                      <div className="text-center py-4 text-muted-lavender">
                        {searchQuery ? 'No tribes found' : 'No tribes available'}
                      </div>
                    ) : (
                      filteredTribes.map((tribe) => {
                        const isSelected = selectedTribes.includes(tribe.id);
                        const canSelect = !isSelected && (selectedTribes.length < maxSelections || !allowMultiSelect);
                        
                        return (
                          <button
                            key={tribe.id}
                            onClick={() => canSelect || isSelected ? handleTribeSelect(tribe.id) : null}
                            disabled={!canSelect && !isSelected}
                            className={`w-full p-3 rounded-lg text-left transition-all ${
                              isSelected
                                ? 'bg-neon-lilac/10 border border-neon-lilac/30'
                                : canSelect
                                  ? 'hover:bg-muted-lavender/5 border border-transparent'
                                  : 'opacity-50 cursor-not-allowed border border-transparent'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {isSelected && <Check className="w-4 h-4 text-neon-lilac" />}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-pearl-white">{tribe.name}</span>
                                    {tribe.is_private && <Lock className="w-3 h-3 text-muted-lavender" />}
                                    {tribe.isTrending && (
                                      <Badge variant="secondary" className="bg-electric-blue/10 text-electric-blue text-xs">
                                        Trending
                                      </Badge>
                                    )}
                                    {tribe.isAdmin && (
                                      <Badge variant="secondary" className="bg-soft-blush/10 text-soft-blush text-xs">
                                        Admin
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-lavender mt-1">{tribe.description}</p>
                                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-lavender">
                                    <span>{tribe.member_count.toLocaleString()} members</span>
                                    <span>Active {tribe.recentActivity}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>

                {/* Footer */}
                <div className="p-3 border-t border-muted-lavender/20">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(false)}
                    className="w-full text-muted-lavender hover:text-pearl-white"
                  >
                    Done
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Validation Messages */}
          {isRequired && selectedTribes.length === 0 && (
            <p className="text-xs text-glitch-red">At least one tribe must be selected for tribe posts</p>
          )}
          
          {allowMultiSelect && selectedTribes.length >= maxSelections && (
            <p className="text-xs text-muted-lavender">Maximum {maxSelections} tribes can be selected</p>
          )}
        </div>
      )}

      {/* Info Text */}
      <div className="text-xs text-muted-lavender space-y-1">
        {visibility === 'public' && (
          <p>Your post will be visible to everyone on Tribe Board</p>
        )}
        {visibility === 'tribe' && (
          <p>Your post will only be visible to members of the selected tribe{allowMultiSelect && selectedTribes.length > 1 ? 's' : ''}</p>
        )}
        {visibility === 'private' && (
          <p>Your post will only be visible on your profile</p>
        )}
      </div>
    </div>
  );
}