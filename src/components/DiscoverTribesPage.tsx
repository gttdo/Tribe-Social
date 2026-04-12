import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { 
  ArrowLeft, 
  Compass, 
  Search, 
  Filter, 
  TrendingUp, 
  Clock, 
  MapPin, 
  Users, 
  Lock, 
  Globe, 
  Hash,
  Star,
  ChevronRight,
  SlidersHorizontal,
  Plus,
  Sparkles
} from 'lucide-react';
import { UserResult, UserInfo } from '../App';

interface Tribe {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  isPrivate: boolean;
  category: string;
  trending: boolean;
  isNew: boolean;
  isNearby?: boolean;
  tags: string[];
  recentActivity: string;
  coverImage?: string;
  joinedAt?: string;
  rating?: number;
  location?: string;
}

// Enhanced sample tribes with more data for discovery
const SAMPLE_TRIBES: Tribe[] = [
  {
    id: '1',
    name: 'Digital Dreamers',
    description: 'Where vaporwave aesthetics meet cutting-edge tech discussions and cyberpunk visions.',
    memberCount: 2847,
    isPrivate: false,
    category: 'Tech',
    trending: true,
    isNew: false,
    isNearby: true,
    tags: ['vaporwave', 'tech', 'aesthetics', 'cyberpunk'],
    recentActivity: '5 new posts today',
    rating: 4.8,
    location: 'Virtual Space',
    coverImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=200&fit=crop'
  },
  {
    id: '2',
    name: 'Cosmic Creators',
    description: 'Artists, musicians, and creators sharing their otherworldly work and creative processes.',
    memberCount: 1532,
    isPrivate: false,
    category: 'Art',
    trending: true,
    isNew: false,
    tags: ['art', 'music', 'creative', 'inspiration'],
    recentActivity: '12 new posts today',
    rating: 4.6,
    location: 'Creative Realm',
    coverImage: 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=400&h=200&fit=crop'
  },
  {
    id: '3',
    name: 'Synthwave Society',
    description: 'The ultimate destination for synthwave enthusiasts, retro-futurism, and 80s nostalgia.',
    memberCount: 934,
    isPrivate: false,
    category: 'Music',
    trending: false,
    isNew: true,
    tags: ['synthwave', 'retro', '80s', 'music'],
    recentActivity: '8 new posts today',
    rating: 4.9,
    location: 'Neon City',
    coverImage: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=200&fit=crop'
  },
  {
    id: '4',
    name: 'Midnight Coders',
    description: 'Late-night programming sessions, code reviews, and tech discussions in a chill atmosphere.',
    memberCount: 3156,
    isPrivate: false,
    category: 'Tech',
    trending: true,
    isNew: false,
    isNearby: true,
    tags: ['coding', 'programming', 'tech', 'development'],
    recentActivity: '18 new posts today',
    rating: 4.7,
    location: 'Code Matrix',
    coverImage: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=200&fit=crop'
  },
  {
    id: '5',
    name: 'Neon Nomads',
    description: 'Travel stories and cyberpunk-inspired urban exploration across digital and physical realms.',
    memberCount: 3021,
    isPrivate: false,
    category: 'Travel',
    trending: true,
    isNew: false,
    tags: ['travel', 'cyberpunk', 'urban', 'exploration'],
    recentActivity: '15 new posts today',
    rating: 4.5,
    location: 'Global Network',
    coverImage: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=400&h=200&fit=crop'
  },
  {
    id: '6',
    name: 'Crystal Meditation',
    description: 'Mindfulness, crystal healing, and spiritual growth in a supportive community.',
    memberCount: 721,
    isPrivate: false,
    category: 'Wellness',
    trending: false,
    isNew: true,
    tags: ['meditation', 'crystals', 'spirituality', 'healing'],
    recentActivity: '6 new posts today',
    rating: 4.8,
    location: 'Zen Gardens',
    coverImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=200&fit=crop'
  },
  {
    id: '7',
    name: 'Retro Gamers',
    description: 'Celebrating classic games with a nostalgic twist and modern gaming insights.',
    memberCount: 4125,
    isPrivate: false,
    category: 'Gaming',
    trending: true,
    isNew: false,
    isNearby: true,
    tags: ['gaming', 'retro', 'nostalgia', 'arcade'],
    recentActivity: '23 new posts today',
    rating: 4.9,
    location: 'Arcade Zone',
    coverImage: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=200&fit=crop'
  },
  {
    id: '8',
    name: 'Future Fashion',
    description: 'Cutting-edge fashion, sustainable design, and style innovation for the digital age.',
    memberCount: 1876,
    isPrivate: false,
    category: 'Fashion',
    trending: false,
    isNew: true,
    tags: ['fashion', 'style', 'sustainable', 'design'],
    recentActivity: '9 new posts today',
    rating: 4.4,
    location: 'Style Matrix',
    coverImage: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=200&fit=crop'
  }
];

const CATEGORIES = ['All', 'Tech', 'Art', 'Music', 'Gaming', 'Wellness', 'Travel', 'Fashion'];

type SortOption = 'trending' | 'newest' | 'popular' | 'nearby';

interface DiscoverTribesPageProps {
  userResult: UserResult | null;
  userInfo: UserInfo | null;
  onBack: () => void;
  onCreateTribe?: () => void;
}

export function DiscoverTribesPage({ userResult, userInfo, onBack, onCreateTribe }: DiscoverTribesPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<SortOption>('trending');
  const [showFilters, setShowFilters] = useState(false);
  const [joinedTribes, setJoinedTribes] = useState<Set<string>>(new Set());

  // Filter and sort tribes
  const getFilteredTribes = () => {
    let filtered = SAMPLE_TRIBES.filter(tribe => {
      const matchesSearch = searchTerm === '' || 
        tribe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tribe.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tribe.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'All' || tribe.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });

    // Sort based on selected option
    switch (sortBy) {
      case 'trending':
        return filtered.sort((a, b) => (b.trending ? 1 : 0) - (a.trending ? 1 : 0));
      case 'newest':
        return filtered.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
      case 'popular':
        return filtered.sort((a, b) => b.memberCount - a.memberCount);
      case 'nearby':
        return filtered.sort((a, b) => (b.isNearby ? 1 : 0) - (a.isNearby ? 1 : 0));
      default:
        return filtered;
    }
  };

  const getTrendingTribes = () => SAMPLE_TRIBES.filter(tribe => tribe.trending).slice(0, 4);
  const getNewTribes = () => SAMPLE_TRIBES.filter(tribe => tribe.isNew).slice(0, 4);
  const getNearbyTribes = () => SAMPLE_TRIBES.filter(tribe => tribe.isNearby).slice(0, 4);

  const handleJoinTribe = (tribeId: string) => {
    const newJoined = new Set(joinedTribes);
    if (newJoined.has(tribeId)) {
      newJoined.delete(tribeId);
    } else {
      newJoined.add(tribeId);
    }
    setJoinedTribes(newJoined);
  };

  const TribeCard = ({ tribe, size = 'normal' }: { tribe: Tribe; size?: 'normal' | 'large' }) => (
    <Card className={`soft-blur border-muted-lavender/30 hover:dreamy-glow transition-all duration-300 overflow-hidden ${
      size === 'large' ? 'md:col-span-2' : ''
    }`}>
      {/* Cover Image */}
      {tribe.coverImage && (
        <div className="h-32 bg-gradient-to-r from-neon-lilac/20 to-electric-blue/20 relative overflow-hidden">
          <img 
            src={tribe.coverImage} 
            alt={tribe.name}
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-midnight-black/60 to-transparent" />
          
          {/* Status badges */}
          <div className="absolute top-3 left-3 flex space-x-2">
            {tribe.trending && (
              <Badge className="bg-glitch-red/20 border-glitch-red/40 text-glitch-red text-xs">
                <TrendingUp className="w-3 h-3 mr-1" />
                Trending
              </Badge>
            )}
            {tribe.isNew && (
              <Badge className="bg-electric-blue/20 border-electric-blue/40 text-electric-blue text-xs">
                <Star className="w-3 h-3 mr-1" />
                New
              </Badge>
            )}
          </div>
          
          {/* Privacy indicator */}
          <div className="absolute top-3 right-3">
            {tribe.isPrivate ? (
              <Lock className="w-4 h-4 text-soft-blush" />
            ) : (
              <Globe className="w-4 h-4 text-electric-blue" />
            )}
          </div>
        </div>
      )}
      
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="space-y-2">
          <h3 className="font-headline text-lg text-pearl-white line-clamp-1">
            {tribe.name}
          </h3>
          
          <div className="flex items-center justify-between text-sm text-muted-lavender">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1">
                <Users className="w-3 h-3" />
                <span>{tribe.memberCount.toLocaleString()}</span>
              </div>
              {tribe.rating && (
                <div className="flex items-center space-x-1">
                  <Star className="w-3 h-3 text-neon-lilac fill-neon-lilac" />
                  <span>{tribe.rating}</span>
                </div>
              )}
            </div>
            {tribe.location && (
              <div className="flex items-center space-x-1">
                <MapPin className="w-3 h-3" />
                <span className="text-xs">{tribe.location}</span>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-lavender font-body line-clamp-2">
          {tribe.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {tribe.tags.slice(0, 3).map((tag) => (
            <span 
              key={tag}
              className="inline-flex items-center px-2 py-1 rounded-full bg-muted-lavender/10 text-xs text-muted-lavender"
            >
              <Hash className="w-2 h-2 mr-1" />
              {tag}
            </span>
          ))}
          {tribe.tags.length > 3 && (
            <span className="text-xs text-muted-lavender/60">+{tribe.tags.length - 3}</span>
          )}
        </div>

        {/* Activity */}
        <p className="text-xs text-electric-blue font-body">
          {tribe.recentActivity}
        </p>

        {/* Join Button */}
        <Button
          onClick={() => handleJoinTribe(tribe.id)}
          className={`w-full transition-all duration-200 ${
            joinedTribes.has(tribe.id)
              ? 'bg-neon-lilac/20 border border-neon-lilac text-neon-lilac hover:bg-neon-lilac/30'
              : 'bg-neon-lilac hover:bg-neon-lilac/80 text-midnight-black'
          }`}
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
  );

  const SectionHeader = ({ title, subtitle, onViewAll }: { 
    title: string; 
    subtitle?: string; 
    onViewAll?: () => void;
  }) => (
    <div className="flex items-center justify-between">
      <div>
        <h3 className="font-headline text-xl text-pearl-white">{title}</h3>
        {subtitle && (
          <p className="text-sm text-muted-lavender font-body">{subtitle}</p>
        )}
      </div>
      {onViewAll && (
        <Button 
          variant="ghost" 
          onClick={onViewAll}
          className="text-electric-blue hover:text-electric-blue/80"
        >
          View All
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-midnight-black">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-midnight-black/80 soft-blur border-b border-muted-lavender/20">
        <div className="flex items-center justify-between px-4 py-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack}
            className="text-muted-lavender hover:text-pearl-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-center space-x-2">
            <Compass className="w-6 h-6 text-neon-lilac" />
            <h1 className="font-headline text-xl text-pearl-white">
              Discover Tribes
            </h1>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowFilters(!showFilters)}
            className="text-muted-lavender hover:text-pearl-white"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-8">
        {/* Hero Banner */}
        <div className="text-center py-8 space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-electric-blue/20 to-soft-blush/20 border-2 border-electric-blue/40 flex items-center justify-center">
            <Compass className="w-10 h-10 text-electric-blue" />
          </div>
          
          <div className="space-y-2">
            <h2 className="font-headline text-3xl text-pearl-white">
              Find Your Next Tribe
            </h2>
            <p className="text-muted-lavender font-body max-w-md mx-auto">
              Discover communities that match your interests and connect with like-minded digital wanderers
            </p>
          </div>
          
          {/* Create Tribe CTA */}
          <div className="pt-4">
            <Button
              onClick={onCreateTribe}
              className="bg-gradient-to-r from-neon-lilac to-soft-blush hover:from-neon-lilac/80 hover:to-soft-blush/80 text-midnight-black font-semibold px-8 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 dreamy-glow"
              size="lg"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Create Your Own Tribe
              <Plus className="w-5 h-5 ml-2" />
            </Button>
            <p className="text-xs text-muted-lavender/80 font-body mt-2 max-w-xs mx-auto">
              Start a community around your passion and bring people together
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-lavender" />
          <Input
            type="text"
            placeholder="Search for tribes, topics, or interests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 bg-midnight-black/50 border-muted-lavender/30 text-pearl-white placeholder-muted-lavender/70 rounded-xl"
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <Card className="soft-blur border-muted-lavender/30 p-4 space-y-4">
            {/* Categories */}
            <div className="space-y-2">
              <h4 className="font-headline text-sm text-pearl-white">Categories</h4>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((category) => (
                  <Badge
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    className={`cursor-pointer transition-all duration-200 ${
                      selectedCategory === category 
                        ? 'bg-neon-lilac text-midnight-black' 
                        : 'border-muted-lavender/30 text-muted-lavender hover:border-neon-lilac/50 hover:text-neon-lilac'
                    }`}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Sort Options */}
            <div className="space-y-2">
              <h4 className="font-headline text-sm text-pearl-white">Sort By</h4>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'trending', label: 'Trending', icon: TrendingUp },
                  { key: 'newest', label: 'Newest', icon: Clock },
                  { key: 'popular', label: 'Popular', icon: Users },
                  { key: 'nearby', label: 'Nearby', icon: MapPin }
                ].map((option) => {
                  const Icon = option.icon;
                  return (
                    <Badge
                      key={option.key}
                      variant={sortBy === option.key ? "default" : "outline"}
                      className={`cursor-pointer transition-all duration-200 ${
                        sortBy === option.key 
                          ? 'bg-electric-blue text-midnight-black' 
                          : 'border-muted-lavender/30 text-muted-lavender hover:border-electric-blue/50 hover:text-electric-blue'
                      }`}
                      onClick={() => setSortBy(option.key as SortOption)}
                    >
                      <Icon className="w-3 h-3 mr-1" />
                      {option.label}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </Card>
        )}

        {/* Show search results if searching */}
        {searchTerm && (
          <div className="space-y-4">
            <SectionHeader 
              title="Search Results" 
              subtitle={`${getFilteredTribes().length} tribes found`}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getFilteredTribes().map((tribe) => (
                <TribeCard key={`search-${tribe.id}`} tribe={tribe} />
              ))}
            </div>
          </div>
        )}

        {/* Curated Sections (only show when not searching) */}
        {!searchTerm && (
          <>
            {/* Trending Tribes */}
            <div className="space-y-4">
              <SectionHeader 
                title="Trending Tribes" 
                subtitle="Communities that are buzzing right now"
                onViewAll={() => setSortBy('trending')}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {getTrendingTribes().map((tribe) => (
                  <TribeCard key={`trending-${tribe.id}`} tribe={tribe} />
                ))}
              </div>
            </div>

            {/* New Tribes */}
            <div className="space-y-4">
              <SectionHeader 
                title="New Tribes" 
                subtitle="Fresh communities just getting started"
                onViewAll={() => setSortBy('newest')}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {getNewTribes().map((tribe) => (
                  <TribeCard key={`new-${tribe.id}`} tribe={tribe} />
                ))}
              </div>
            </div>

            {/* Nearby Tribes */}
            <div className="space-y-4">
              <SectionHeader 
                title="Nearby Tribes" 
                subtitle="Communities in your digital vicinity"
                onViewAll={() => setSortBy('nearby')}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {getNearbyTribes().map((tribe) => (
                  <TribeCard key={`nearby-${tribe.id}`} tribe={tribe} />
                ))}
              </div>
            </div>
          </>
        )}

        {/* Empty state */}
        {searchTerm && getFilteredTribes().length === 0 && (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted-lavender/10 flex items-center justify-center">
              <Search className="w-8 h-8 text-muted-lavender/40" />
            </div>
            <div className="space-y-2">
              <h3 className="font-headline text-lg text-pearl-white">No tribes found</h3>
              <p className="text-muted-lavender font-body">
                Try adjusting your search terms or filters
              </p>
            </div>
            
            {/* Secondary CTA in empty state */}
            <div className="pt-4">
              <Button
                onClick={onCreateTribe}
                variant="outline"
                className="border-neon-lilac/40 text-neon-lilac hover:bg-neon-lilac/10 px-6 py-2 rounded-lg transition-all duration-200"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create a Tribe for "{searchTerm}"
              </Button>
              <p className="text-xs text-muted-lavender/80 font-body mt-2">
                Be the first to start this community
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom spacing for mobile navigation */}
      <div className="h-20 md:h-0" />
    </div>
  );
}