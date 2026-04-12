import React, { useState } from 'react';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Badge } from './ui/badge';
import { ChevronDown, Users, Check, Globe, Lock } from 'lucide-react';
import { TribeWithDetails, Visibility } from '../utils/supabase/database-types';
import { getVisibilityColor } from '../utils/visibility-helpers';

interface TribeSelectionDropdownProps {
  /** Currently selected tribes */
  selectedTribes: string[];
  
  /** Available tribes for selection */
  availableTribes: TribeWithDetails[];
  
  /** Current visibility setting */
  visibility: Visibility;
  
  /** Callback when tribe selection changes */
  onTribeSelectionChange: (tribeIds: string[]) => void;
  
  /** Whether to allow multiple tribe selection */
  allowMultiple?: boolean;
  
  /** Whether to show the visibility indicator */
  showVisibilityIndicator?: boolean;
  
  /** Placeholder text when no tribes selected */
  placeholder?: string;
  
  /** Whether the dropdown is disabled */
  disabled?: boolean;
  
  /** Error state */
  error?: boolean;
  
  /** Additional CSS classes */
  className?: string;
}

export function TribeSelectionDropdown({
  selectedTribes,
  availableTribes,
  visibility,
  onTribeSelectionChange,
  allowMultiple = true,
  showVisibilityIndicator = true,
  placeholder = "Select tribe(s)",
  disabled = false,
  error = false,
  className = ''
}: TribeSelectionDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const visibilityColors = getVisibilityColor(visibility);

  const handleTribeToggle = (tribeId: string) => {
    if (allowMultiple) {
      const newSelection = selectedTribes.includes(tribeId)
        ? selectedTribes.filter(id => id !== tribeId)
        : [...selectedTribes, tribeId];
      onTribeSelectionChange(newSelection);
    } else {
      // Single selection - close dropdown after selection
      onTribeSelectionChange(selectedTribes.includes(tribeId) ? [] : [tribeId]);
      setIsOpen(false);
    }
  };

  const getSelectedTribesText = () => {
    if (selectedTribes.length === 0) return placeholder;
    if (selectedTribes.length === 1) {
      const tribe = availableTribes.find(t => t.id === selectedTribes[0]);
      return tribe?.name || 'Unknown Tribe';
    }
    return `${selectedTribes.length} tribes selected`;
  };

  const getVisibilityIcon = () => {
    switch (visibility) {
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

  const VisibilityIcon = getVisibilityIcon();

  return (
    <div className={`space-y-2 ${className}`}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={`w-full justify-between bg-midnight-black/50 border-muted-lavender/30 text-pearl-white hover:bg-midnight-black/70 ${
              error ? 'border-glitch-red/50' : ''
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center space-x-2 flex-1 text-left">
              {showVisibilityIndicator && (
                <div className={`p-1 rounded bg-${visibilityColors.primary}/20`}>
                  <VisibilityIcon className={`w-3 h-3 text-${visibilityColors.primary}`} />
                </div>
              )}
              <span className={`truncate ${selectedTribes.length === 0 ? 'text-muted-lavender' : 'text-pearl-white'}`}>
                {getSelectedTribesText()}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-lavender shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent 
          className="w-80 bg-midnight-black border-muted-lavender/30 soft-blur max-h-80 overflow-y-auto"
          align="start"
        >
          {availableTribes.length === 0 ? (
            <DropdownMenuItem disabled className="text-muted-lavender">
              No tribes available
            </DropdownMenuItem>
          ) : (
            <>
              {availableTribes.map((tribe, index) => (
                <DropdownMenuItem
                  key={tribe.id}
                  className="text-pearl-white hover:bg-muted-lavender/10 cursor-pointer p-3"
                  onClick={() => handleTribeToggle(tribe.id)}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center space-x-3">
                      {/* Tribe Avatar */}
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-neon-lilac to-electric-blue flex items-center justify-center text-white font-headline text-sm">
                        {tribe.name.charAt(0).toUpperCase()}
                      </div>
                      
                      {/* Tribe Info */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-body font-medium">{tribe.name}</span>
                          {tribe.is_private && (
                            <Lock className="w-3 h-3 text-muted-lavender" />
                          )}
                        </div>
                        <p className="text-xs text-muted-lavender">
                          {tribe.member_count} members
                        </p>
                      </div>
                    </div>
                    
                    {/* Selection Indicator */}
                    {selectedTribes.includes(tribe.id) && (
                      <div className={`w-5 h-5 rounded-full bg-${visibilityColors.primary} flex items-center justify-center`}>
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
              
              {allowMultiple && selectedTribes.length > 0 && (
                <>
                  <DropdownMenuSeparator className="bg-muted-lavender/20" />
                  <DropdownMenuItem 
                    className="text-glitch-red hover:bg-glitch-red/10 cursor-pointer"
                    onClick={() => onTribeSelectionChange([])}
                  >
                    Clear all selections
                  </DropdownMenuItem>
                </>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Selected Tribes Display */}
      {selectedTribes.length > 0 && allowMultiple && (
        <div className="flex flex-wrap gap-2">
          {selectedTribes.map((tribeId) => {
            const tribe = availableTribes.find(t => t.id === tribeId);
            return tribe ? (
              <Badge
                key={tribeId}
                className={`bg-${visibilityColors.primary}/20 border-${visibilityColors.primary}/40 text-${visibilityColors.primary} cursor-pointer hover:bg-${visibilityColors.primary}/30 transition-colors`}
                onClick={() => handleTribeToggle(tribeId)}
              >
                {tribe.name}
                <span className="ml-1 text-xs opacity-60">×</span>
              </Badge>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for use in headers or tight spaces
 */
export function CompactTribeSelector({
  selectedTribes,
  availableTribes,
  visibility,
  onTribeSelectionChange,
  allowMultiple = false,
  className = ''
}: Omit<TribeSelectionDropdownProps, 'placeholder' | 'showVisibilityIndicator'>) {
  return (
    <TribeSelectionDropdown
      selectedTribes={selectedTribes}
      availableTribes={availableTribes}
      visibility={visibility}
      onTribeSelectionChange={onTribeSelectionChange}
      allowMultiple={allowMultiple}
      showVisibilityIndicator={false}
      placeholder={selectedTribes.length === 0 ? "Select tribe" : undefined}
      className={`max-w-xs ${className}`}
    />
  );
}