import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ArrowLeft, Plus, Users, Lock, Globe, Search, Hash, TrendingUp } from 'lucide-react';

interface Tribe {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  isPrivate: boolean;
  category: string;
  trending: boolean;
  tags: string[];
  recentActivity: string;
}

// Sample tribes for discovery
const SAMPLE_TRIBES: Tribe[] = [
  {
    id: '1',
    name: 'Digital Dreamers',
    description: 'Where vaporwave aesthetics meet cutting-edge tech discussions.',
    memberCount: 2847,
    isPrivate: false,
    category: 'Tech',
    trending: true,
    tags: ['vaporwave', 'tech', 'aesthetics'],
    recentActivity: '5 new posts today'
  },
  {
    id: '2',
    name: 'Cosmic Creators',
    description: 'Artists, musicians, and creators sharing their otherworldly work.',
    memberCount: 1532,
    isPrivate: false,
    category: 'Art',
    trending: false,
    tags: ['art', 'music', 'creative'],
    recentActivity: '12 new posts today'
  },
  {
    id: '3',
    name: 'Mindful Mystics',
    description: 'Meditation, spirituality, and consciousness exploration.',
    memberCount: 934,
    isPrivate: false,
    category: 'Wellness',
    trending: false,
    tags: ['meditation', 'spirituality', 'mindfulness'],
    recentActivity: '8 new posts today'
  },
  {
    id: '4',
    name: 'Secret Synth Society',
    description: 'Private group for synthwave enthusiasts and producers.',
    memberCount: 156,
    isPrivate: true,
    category: 'Music',
    trending: false,
    tags: ['synthwave', 'music', 'exclusive'],
    recentActivity: 'Invite only'
  },
  {
    id: '5',
    name: 'Neon Nomads',
    description: 'Travel stories and cyberpunk-inspired urban exploration.',
    memberCount: 3021,
    isPrivate: false,
    category: 'Travel',
    trending: true,
    tags: ['travel', 'cyberpunk', 'urban'],
    recentActivity: '15 new posts today'
  },
  {
    id: '6',
    name: 'Retro Gamers',
    description: 'Celebrating classic games with a nostalgic twist.',
    memberCount: 4125,
    isPrivate: false,
    category: 'Gaming',
    trending: true,
    tags: ['gaming', 'retro', 'nostalgia'],
    recentActivity: '23 new posts today'
  }
];

const CATEGORIES = ['All', 'Tech', 'Art', 'Music', 'Gaming', 'Wellness', 'Travel'];

interface TribeDiscoveryProps {
  onBack: () => void;
  onContinue: () => void;
}

export function TribeDiscovery({ onBack, onContinue }: TribeDiscoveryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [joinedTribes, setJoinedTribes] = useState<Set<string>>(new Set());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTribeName, setNewTribeName] = useState('');
  const [newTribeDescription, setNewTribeDescription] = useState('');

  const filteredTribes = SAMPLE_TRIBES.filter(tribe => {
    const matchesSearch = tribe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tribe.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tribe.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'All' || tribe.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleJoinTribe = (tribeId: string) => {
    const newJoined = new Set(joinedTribes);
    if (newJoined.has(tribeId)) {
      newJoined.delete(tribeId);
    } else {
      newJoined.add(tribeId);
    }
    setJoinedTribes(newJoined);
  };

  const handleCreateTribe = () => {
    if (newTribeName.trim()) {
      // In a real app, this would create the tribe via API
      console.log('Creating tribe:', { name: newTribeName, description: newTribeDescription });
      setShowCreateForm(false);
      setNewTribeName('');
      setNewTribeDescription('');
    }
  };

  const handleContinue = () => {
    // Save joined tribes to local storage or send to API
    console.log('User joined tribes:', Array.from(joinedTribes));
    onContinue();
  };

  return (
    <div className="min-h-screen bg-midnight-black flex flex-col safe-area-inset">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-muted-lavender/20">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onBack}
          className="text-muted-lavender hover:text-pearl-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        <h1 className="font-headline text-xl text-pearl-white">
          Discover Tribes
        </h1>
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setShowCreateForm(true)}
          className="text-neon-lilac hover:text-neon-lilac/80"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Introduction */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-electric-blue/20 to-soft-blush/20 border-2 border-electric-blue/40 flex items-center justify-center">
              <Users className="w-8 h-8 text-electric-blue" />
            </div>
            
            <h2 className="font-headline text-2xl text-pearl-white">
              Join Your Tribes
            </h2>
            
            <p className="text-muted-lavender font-body max-w-md mx-auto">
              Discover communities that match your interests. Join public tribes instantly or request access to private ones.
            </p>
          </div>

          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-lavender" />
              <Input
                type="text"
                placeholder="Search tribes by name, description, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-midnight-black/50 border-muted-lavender/30 text-pearl-white placeholder-muted-lavender/70"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((category) => (
                <Badge
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  className={`
                    cursor-pointer transition-all duration-200
                    ${selectedCategory === category 
                      ? 'bg-neon-lilac text-midnight-black' 
                      : 'border-muted-lavender/30 text-muted-lavender hover:border-neon-lilac/50 hover:text-neon-lilac'
                    }
                  `}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Badge>
              ))}
            </div>
          </div>

          {/* Tribes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTribes.map((tribe) => (
              <Card 
                key={tribe.id}
                className="soft-blur border-muted-lavender/30 hover:dreamy-glow transition-all duration-300"
              >
                <div className="p-6 space-y-4">
                  {/* Tribe Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-headline text-lg text-pearl-white">
                          {tribe.name}
                        </h3>
                        {tribe.isPrivate ? (
                          <Lock className="w-4 h-4 text-soft-blush" />
                        ) : (
                          <Globe className="w-4 h-4 text-electric-blue" />
                        )}
                        {tribe.trending && (
                          <TrendingUp className="w-4 h-4 text-neon-lilac" />
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 text-sm text-muted-lavender">
                        <Users className="w-3 h-3" />
                        <span>{tribe.memberCount.toLocaleString()} members</span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-lavender font-body line-clamp-2">
                    {tribe.description}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {tribe.tags.map((tag) => (
                      <span 
                        key={tag}
                        className="inline-flex items-center px-2 py-1 rounded-full bg-muted-lavender/10 text-xs text-muted-lavender"
                      >
                        <Hash className="w-3 h-3 mr-1" />
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Recent Activity */}
                  <p className="text-xs text-electric-blue font-body">
                    {tribe.recentActivity}
                  </p>

                  {/* Join Button */}
                  <Button
                    onClick={() => handleJoinTribe(tribe.id)}
                    className={`
                      w-full transition-all duration-200
                      ${joinedTribes.has(tribe.id)
                        ? 'bg-neon-lilac/20 border border-neon-lilac text-neon-lilac hover:bg-neon-lilac/30'
                        : 'bg-neon-lilac hover:bg-neon-lilac/80 text-midnight-black'
                      }
                    `}
                    variant={joinedTribes.has(tribe.id) ? "outline" : "default"}
                  >
                    {joinedTribes.has(tribe.id) 
                      ? 'Joined' 
                      : tribe.isPrivate 
                        ? 'Request Access' 
                        : 'Join Tribe'
                    }
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {filteredTribes.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-lavender font-body">
                No tribes found matching your search.
              </p>
              <Button 
                variant="ghost" 
                onClick={() => setShowCreateForm(true)}
                className="mt-4 text-neon-lilac hover:text-neon-lilac/80"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Tribe
              </Button>
            </div>
          )}

          {/* Create Tribe Form */}
          {showCreateForm && (
            <Card className="soft-blur border-neon-lilac/30">
              <div className="p-6 space-y-4">
                <h3 className="font-headline text-lg text-pearl-white">
                  Create New Tribe
                </h3>
                
                <Input
                  type="text"
                  placeholder="Tribe name..."
                  value={newTribeName}
                  onChange={(e) => setNewTribeName(e.target.value)}
                  className="bg-midnight-black/50 border-muted-lavender/30 text-pearl-white placeholder-muted-lavender/70"
                />
                
                <textarea
                  placeholder="Tribe description..."
                  value={newTribeDescription}
                  onChange={(e) => setNewTribeDescription(e.target.value)}
                  className="w-full p-3 bg-midnight-black/50 border border-muted-lavender/30 rounded-md text-pearl-white placeholder-muted-lavender/70 font-body text-sm min-h-20 resize-none"
                />
                
                <div className="flex space-x-3">
                  <Button 
                    onClick={handleCreateTribe}
                    className="flex-1 bg-neon-lilac hover:bg-neon-lilac/80 text-midnight-black"
                    disabled={!newTribeName.trim()}
                  >
                    Create Tribe
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCreateForm(false)}
                    className="border-muted-lavender/30 text-muted-lavender hover:text-pearl-white"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-muted-lavender/20">
        <div className="space-y-3">
          {joinedTribes.size > 0 && (
            <p className="text-center text-sm text-muted-lavender font-body">
              You've joined {joinedTribes.size} tribe{joinedTribes.size !== 1 ? 's' : ''}
            </p>
          )}
          
          <Button 
            onClick={handleContinue}
            className="w-full bg-electric-blue hover:bg-electric-blue/80 text-midnight-black font-medium"
            size="lg"
          >
            {joinedTribes.size > 0 ? 'Enter the Tribes' : 'Skip for Now'}
          </Button>
        </div>
      </div>
    </div>
  );
}