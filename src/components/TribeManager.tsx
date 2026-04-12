import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  ArrowLeft, 
  Plus, 
  X, 
  Globe, 
  Lock, 
  Users, 
  Settings, 
  Hash,
  Crown,
  Shield,
  UserMinus,
  Flag
} from 'lucide-react';
import { TRIBE_CATEGORIES } from '../utils/tribe-types';
import type { Tribe } from '../utils/tribe-types';

interface TribeManagerProps {
  mode: 'create' | 'edit';
  tribe?: Tribe;
  onSave: (tribeData: Partial<Tribe>) => void;
  onCancel: () => void;
}

export function TribeManager({ mode, tribe, onSave, onCancel }: TribeManagerProps) {
  const [formData, setFormData] = useState({
    name: tribe?.name || '',
    description: tribe?.description || '',
    category: tribe?.category || '',
    isPrivate: tribe?.isPrivate || false,
    tags: tribe?.tags || [],
    rules: tribe?.rules || [],
    bannerColor: tribe?.bannerColor || '#C084FC'
  });
  
  const [newTag, setNewTag] = useState('');
  const [newRule, setNewRule] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim().toLowerCase())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim().toLowerCase()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleAddRule = () => {
    if (newRule.trim() && !formData.rules.includes(newRule.trim())) {
      setFormData(prev => ({
        ...prev,
        rules: [...prev.rules, newRule.trim()]
      }));
      setNewRule('');
    }
  };

  const handleRemoveRule = (ruleToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      rules: prev.rules.filter(rule => rule !== ruleToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await onSave(formData);
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = formData.name.trim() && formData.description.trim() && formData.category;

  return (
    <div className="min-h-screen bg-midnight-black flex flex-col safe-area-inset">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-muted-lavender/20">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onCancel}
          className="text-muted-lavender hover:text-pearl-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        
        <h1 className="font-headline text-xl text-pearl-white">
          {mode === 'create' ? 'Create Tribe' : 'Edit Tribe'}
        </h1>
        
        <div className="w-16" /> {/* Spacer for centering */}
      </div>

      {/* Content */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Basic Info */}
          <Card className="p-6 soft-blur border-muted-lavender/30">
            <h2 className="font-headline text-lg text-pearl-white mb-6 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Basic Information
            </h2>
            
            <div className="space-y-6">
              <div>
                <Label htmlFor="tribe-name" className="text-pearl-white mb-2 block">
                  Tribe Name *
                </Label>
                <Input
                  id="tribe-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter tribe name..."
                  className="bg-midnight-black/50 border-muted-lavender/30 text-pearl-white placeholder-muted-lavender/70"
                  required
                />
              </div>

              <div>
                <Label htmlFor="tribe-description" className="text-pearl-white mb-2 block">
                  Description *
                </Label>
                <Textarea
                  id="tribe-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what your tribe is about..."
                  className="bg-midnight-black/50 border-muted-lavender/30 text-pearl-white placeholder-muted-lavender/70 min-h-24 resize-none"
                  required
                />
              </div>

              <div>
                <Label className="text-pearl-white mb-2 block">
                  Category *
                </Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger className="bg-midnight-black/50 border-muted-lavender/30 text-pearl-white">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent className="bg-midnight-black border-muted-lavender/30">
                    {TRIBE_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category} className="text-pearl-white hover:bg-muted-lavender/10">
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted-lavender/5 border border-muted-lavender/20">
                <div className="flex items-center space-x-3">
                  {formData.isPrivate ? (
                    <Lock className="w-5 h-5 text-soft-blush" />
                  ) : (
                    <Globe className="w-5 h-5 text-electric-blue" />
                  )}
                  <div>
                    <Label className="text-pearl-white font-medium">
                      {formData.isPrivate ? 'Private Tribe' : 'Public Tribe'}
                    </Label>
                    <p className="text-sm text-muted-lavender">
                      {formData.isPrivate 
                        ? 'Users need approval to join' 
                        : 'Anyone can join instantly'
                      }
                    </p>
                  </div>
                </div>
                <Switch
                  checked={formData.isPrivate}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPrivate: checked }))}
                />
              </div>
            </div>
          </Card>

          {/* Tags */}
          <Card className="p-6 soft-blur border-muted-lavender/30">
            <h2 className="font-headline text-lg text-pearl-white mb-6 flex items-center">
              <Hash className="w-5 h-5 mr-2" />
              Tags
            </h2>
            
            <div className="space-y-4">
              <div className="flex space-x-3">
                <Input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="Add a tag..."
                  className="flex-1 bg-midnight-black/50 border-muted-lavender/30 text-pearl-white placeholder-muted-lavender/70"
                />
                <Button 
                  type="button"
                  onClick={handleAddTag}
                  className="bg-neon-lilac hover:bg-neon-lilac/80 text-midnight-black"
                  disabled={!newTag.trim()}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <Badge 
                      key={tag}
                      variant="outline"
                      className="border-muted-lavender/30 text-muted-lavender hover:text-pearl-white group cursor-pointer"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      <Hash className="w-3 h-3 mr-1" />
                      {tag}
                      <X className="w-3 h-3 ml-2 opacity-60 group-hover:opacity-100" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Rules */}
          <Card className="p-6 soft-blur border-muted-lavender/30">
            <h2 className="font-headline text-lg text-pearl-white mb-6 flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Community Rules
            </h2>
            
            <div className="space-y-4">
              <div className="flex space-x-3">
                <Input
                  type="text"
                  value={newRule}
                  onChange={(e) => setNewRule(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddRule()}
                  placeholder="Add a community rule..."
                  className="flex-1 bg-midnight-black/50 border-muted-lavender/30 text-pearl-white placeholder-muted-lavender/70"
                />
                <Button 
                  type="button"
                  onClick={handleAddRule}
                  className="bg-electric-blue hover:bg-electric-blue/80 text-midnight-black"
                  disabled={!newRule.trim()}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              {formData.rules.length > 0 && (
                <div className="space-y-2">
                  {formData.rules.map((rule, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted-lavender/5 border border-muted-lavender/20 group"
                    >
                      <span className="text-muted-lavender font-body text-sm flex-1">
                        {index + 1}. {rule}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveRule(rule)}
                        className="p-1 text-muted-lavender hover:text-glitch-red opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Customization */}
          <Card className="p-6 soft-blur border-muted-lavender/30">
            <h2 className="font-headline text-lg text-pearl-white mb-6 flex items-center">
              <Crown className="w-5 h-5 mr-2" />
              Appearance
            </h2>
            
            <div>
              <Label className="text-pearl-white mb-3 block">
                Banner Color
              </Label>
              <div className="flex items-center space-x-4">
                <input
                  type="color"
                  value={formData.bannerColor}
                  onChange={(e) => setFormData(prev => ({ ...prev, bannerColor: e.target.value }))}
                  className="w-16 h-10 rounded-lg border-2 border-muted-lavender/30 cursor-pointer"
                />
                <div 
                  className="flex-1 h-10 rounded-lg border border-muted-lavender/30"
                  style={{
                    background: `linear-gradient(135deg, ${formData.bannerColor}60, ${formData.bannerColor}80)`
                  }}
                />
              </div>
            </div>
          </Card>
        </div>
      </form>

      {/* Footer */}
      <div className="p-6 border-t border-muted-lavender/20 bg-midnight-black/50 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto flex space-x-4">
          <Button 
            type="button"
            variant="outline" 
            onClick={onCancel}
            className="flex-1 border-muted-lavender/30 text-muted-lavender hover:text-pearl-white"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!isFormValid || isLoading}
            className="flex-1 bg-neon-lilac hover:bg-neon-lilac/80 text-midnight-black font-medium"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
            ) : null}
            {mode === 'create' ? 'Create Tribe' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}