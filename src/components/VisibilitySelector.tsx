import React from 'react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Globe, Users, Lock, ChevronDown, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { 
  Visibility, 
  TribeWithDetails 
} from '../utils/supabase/database-types';
import { 
  getVisibilityDisplayText, 
  getVisibilityDescription, 
  getVisibilityColor,
  VisibilitySettings,
  DEFAULT_VISIBILITY_SETTINGS 
} from '../utils/visibility-helpers';

interface VisibilitySelectorProps {
  /** Current visibility setting */
  visibility: Visibility;
  
  /** Currently selected tribes */
  selectedTribes: string[];
  
  /** Available tribes user can post to */
  availableTribes: TribeWithDetails[];
  
  /** Callback when visibility changes */
  onVisibilityChange: (visibility: Visibility) => void;
  
  /** Callback when tribe selection changes */
  onTribeSelectionChange: (tribeIds: string[]) => void;
  
  /** Visibility configuration */
  settings?: VisibilitySettings;
  
  /** Whether to show as compact inline selector */
  compact?: boolean;
  
  /** Whether to allow multiple tribe selection */
  allowMultipleTribes?: boolean;
  
  /** Whether to show tribe selector always or only for tribe visibility */
  showTribeSelector?: 'always' | 'tribe-only' | 'never';
  
  /** Error message to display */
  error?: string;
  
  /** Additional CSS classes */
  className?: string;
}

export function VisibilitySelector({
  visibility,
  selectedTribes,
  availableTribes,
  onVisibilityChange,
  onTribeSelectionChange,
  settings = DEFAULT_VISIBILITY_SETTINGS,
  compact = false,
  allowMultipleTribes = true,
  showTribeSelector = 'tribe-only',
  error,
  className = ''
}: VisibilitySelectorProps) {
  const visibilityColors = getVisibilityColor(visibility);
  
  const getVisibilityIcon = (vis: Visibility) => {
    switch (vis) {
      case 'public':
        return Globe;
      case 'tribe':
        return Users;
      case 'private':
        return Lock;
      default:
        return Globe;
    }
  };

  const handleTribeToggle = (tribeId: string) => {
    if (allowMultipleTribes) {
      const newSelection = selectedTribes.includes(tribeId)
        ? selectedTribes.filter(id => id !== tribeId)
        : [...selectedTribes, tribeId];
      onTribeSelectionChange(newSelection);
    } else {
      onTribeSelectionChange(selectedTribes.includes(tribeId) ? [] : [tribeId]);
    }
  };

  const shouldShowTribeSelector = () => {
    if (showTribeSelector === 'never') return false;
    if (showTribeSelector === 'always') return true;
    return visibility === 'tribe' || settings.requireTribeSelection;
  };

  if (compact) {
    return (
      <div className={`space-y-3 ${className}`}>
        {/* Compact Visibility Selector */}
        <div className="flex items-center space-x-2">
          <Select
            value={visibility}
            onValueChange={(value: Visibility) => onVisibilityChange(value)}
          >
            <SelectTrigger className="w-[140px] bg-midnight-black/50 border-muted-lavender/30 text-pearl-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-midnight-black border-muted-lavender/30">
              {settings.showPublicOption && (
                <SelectItem value="public" className="text-pearl-white hover:bg-electric-blue/10">
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4" />
                    <span>Public</span>
                  </div>
                </SelectItem>
              )}
              {settings.showTribeOption && (
                <SelectItem value="tribe" className="text-pearl-white hover:bg-neon-lilac/10">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4" />
                    <span>Tribe Only</span>
                  </div>
                </SelectItem>
              )}
              {settings.showPrivateOption && (
                <SelectItem value="private" className="text-pearl-white hover:bg-muted-lavender/10">
                  <div className="flex items-center space-x-2">
                    <Lock className="w-4 h-4" />
                    <span>Private</span>
                  </div>
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-muted-lavender hover:text-pearl-white transition-colors" />
              </TooltipTrigger>
              <TooltipContent className="bg-midnight-black border-muted-lavender/30 text-pearl-white">
                <p className="text-sm">{getVisibilityDescription(visibility)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        {/* Compact Tribe Selector */}
        {shouldShowTribeSelector() && availableTribes.length > 0 && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {availableTribes.slice(0, 3).map((tribe) => (
                <Badge
                  key={tribe.id}
                  variant={selectedTribes.includes(tribe.id) ? "default" : "outline"}
                  className={`cursor-pointer transition-all duration-200 ${
                    selectedTribes.includes(tribe.id)
                      ? `bg-${visibilityColors.primary}/20 border-${visibilityColors.primary}/40 text-${visibilityColors.primary}`
                      : 'bg-transparent border-muted-lavender/30 text-muted-lavender hover:border-muted-lavender/50'
                  }`}
                  onClick={() => handleTribeToggle(tribe.id)}
                >
                  {tribe.name}
                </Badge>
              ))}
              {availableTribes.length > 3 && (
                <Badge variant="outline" className="border-muted-lavender/30 text-muted-lavender">
                  +{availableTribes.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
        
        {error && (
          <p className="text-glitch-red text-sm font-body">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Full Visibility Options */}
      <div className="space-y-3">
        <label className="block text-pearl-white font-body font-medium">
          Who can see this?
        </label>
        
        <div className="grid gap-3">
          {settings.showPublicOption && (
            <button
              onClick={() => onVisibilityChange('public')}
              className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                visibility === 'public'
                  ? 'border-electric-blue/60 bg-electric-blue/10'
                  : 'border-muted-lavender/20 bg-transparent hover:border-muted-lavender/40'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${
                  visibility === 'public'
                    ? 'bg-electric-blue/20 text-electric-blue'
                    : 'bg-muted-lavender/10 text-muted-lavender'
                }`}>
                  <Globe className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-body font-medium text-pearl-white flex items-center space-x-2">
                    <span>🌍 Public</span>
                  </h4>
                  <p className="text-sm text-muted-lavender mt-1">
                    Visible to all users on Tribe Board according to your profile privacy settings
                  </p>
                </div>
              </div>
            </button>
          )}
          
          {settings.showTribeOption && (
            <button
              onClick={() => onVisibilityChange('tribe')}
              className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                visibility === 'tribe'
                  ? 'border-neon-lilac/60 bg-neon-lilac/10'
                  : 'border-muted-lavender/20 bg-transparent hover:border-muted-lavender/40'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${
                  visibility === 'tribe'
                    ? 'bg-neon-lilac/20 text-neon-lilac'
                    : 'bg-muted-lavender/10 text-muted-lavender'
                }`}>
                  <Users className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-body font-medium text-pearl-white flex items-center space-x-2">
                    <span>🛡 Tribe Only</span>
                  </h4>
                  <p className="text-sm text-muted-lavender mt-1">
                    Only visible to members of selected tribe(s). Non-members see locked content.
                  </p>
                </div>
              </div>
            </button>
          )}
          
          {settings.showPrivateOption && (
            <button
              onClick={() => onVisibilityChange('private')}
              className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                visibility === 'private'
                  ? 'border-muted-lavender/60 bg-muted-lavender/10'
                  : 'border-muted-lavender/20 bg-transparent hover:border-muted-lavender/40'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${
                  visibility === 'private'
                    ? 'bg-muted-lavender/20 text-muted-lavender'
                    : 'bg-muted-lavender/10 text-muted-lavender'
                }`}>
                  <Lock className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-body font-medium text-pearl-white">
                    🔒 Private
                  </h4>
                  <p className="text-sm text-muted-lavender mt-1">
                    Only visible to you
                  </p>
                </div>
              </div>
            </button>
          )}
        </div>
      </div>
      
      {/* Tribe Selection */}
      {shouldShowTribeSelector() && availableTribes.length > 0 && (
        <div className="space-y-3">
          <label className="block text-pearl-white font-body font-medium">
            {visibility === 'tribe' ? 'Select Tribe(s)' : 'Share with Tribe(s)'}
            {allowMultipleTribes && (
              <span className="text-muted-lavender text-sm font-normal ml-2">
                (Multiple allowed)
              </span>
            )}
          </label>
          
          <div className="grid gap-2 max-h-60 overflow-y-auto scrollbar-hide">
            {availableTribes.map((tribe) => (
              <button
                key={tribe.id}
                onClick={() => handleTribeToggle(tribe.id)}
                className={`p-3 rounded-lg border transition-all duration-200 text-left ${
                  selectedTribes.includes(tribe.id)
                    ? `border-${visibilityColors.primary}/40 bg-${visibilityColors.primary}/10`
                    : 'border-muted-lavender/20 bg-transparent hover:border-muted-lavender/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-r from-neon-lilac to-electric-blue flex items-center justify-center text-white font-headline`}>
                      {tribe.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-body font-medium text-pearl-white">
                        {tribe.name}
                      </h4>
                      <p className="text-xs text-muted-lavender">
                        {tribe.member_count} members {tribe.is_private && '• Private'}
                      </p>
                    </div>
                  </div>
                  
                  {selectedTribes.includes(tribe.id) && (
                    <div className={`w-6 h-6 rounded-full bg-${visibilityColors.primary} flex items-center justify-center`}>
                      <div className="w-3 h-3 rounded-full bg-white" />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
          
          {selectedTribes.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3 bg-midnight-black/30 rounded-lg border border-muted-lavender/20">
              <span className="text-sm text-muted-lavender font-body">Selected:</span>
              {selectedTribes.map((tribeId) => {
                const tribe = availableTribes.find(t => t.id === tribeId);
                return tribe ? (
                  <Badge
                    key={tribeId}
                    className={`bg-${visibilityColors.primary}/20 border-${visibilityColors.primary}/40 text-${visibilityColors.primary}`}
                  >
                    {tribe.name}
                  </Badge>
                ) : null;
              })}
            </div>
          )}
        </div>
      )}
      
      {error && (
        <div className="p-3 rounded-lg bg-glitch-red/10 border border-glitch-red/30">
          <p className="text-glitch-red text-sm font-body">{error}</p>
        </div>
      )}
    </div>
  );
}