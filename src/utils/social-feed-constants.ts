import { Story, FeedPost, SearchResult, UserProfile } from './social-feed-types';

export const mockStories: Story[] = [
  { id: 'user', username: 'Your Story', coreRealm: 'mirrorcore', viewed: false },
  { id: 'announce', username: 'Tribe Updates', coreRealm: 'mirrorcore', viewed: false, isAnnouncement: true },
  { id: '1', username: 'lunar_echoes', coreRealm: 'mirrorcore', viewed: true },
  { id: '2', username: 'digital_phoenix', coreRealm: 'embercore', viewed: false },
  { id: '3', username: 'void_aesthetic', coreRealm: 'shadowcore', viewed: false },
  { id: '4', username: 'prism_drift', coreRealm: 'mirrorcore', viewed: true },
  { id: '5', username: 'ember_flow', coreRealm: 'embercore', viewed: false }
];

export const mockPosts: FeedPost[] = [
  {
    id: '1',
    username: 'lunar_echoes',
    nickname: 'Mirror Walker',
    coreRealm: 'mirrorcore',
    timestamp: '2m ago',
    location: 'Los Angeles, CA',
    caption: 'Found this ethereal reflection in the city lights tonight ✨ The way the neon bends through glass speaks to my soul',
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2ac3?w=800&h=600&fit=crop',
    liked: false,
    bookmarked: false,
    likes: 23,
    xpEarned: 15,
    type: 'media',
    comments: [
      { id: '1', username: 'prism_drift', text: 'This resonates deeply 🪞', timestamp: '1m ago', coreRealm: 'mirrorcore' },
      { id: '2', username: 'void_aesthetic', text: 'Beautiful capture of liminal space', timestamp: '30s ago', coreRealm: 'shadowcore' }
    ]
  },
  {
    id: '2',
    username: 'digital_phoenix',
    nickname: 'Flame Keeper',
    coreRealm: 'embercore',
    timestamp: '15m ago',
    caption: 'Manifesting transformation through digital alchemy 🔥 Every pixel burns with intention',
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
    liked: true,
    bookmarked: true,
    likes: 41,
    xpEarned: 25,
    type: 'media',
    comments: [
      { id: '3', username: 'ember_flow', text: 'The fire in this is incredible!', timestamp: '10m ago', coreRealm: 'embercore' },
      { id: '4', username: 'lunar_echoes', text: 'Your energy is infectious', timestamp: '5m ago', coreRealm: 'mirrorcore' }
    ]
  },
  {
    id: '3',
    username: 'void_aesthetic',
    nickname: 'Shadow Weaver',
    coreRealm: 'shadowcore',
    timestamp: '1h ago',
    location: 'Brooklyn, NY',
    caption: 'Dancing with shadows in the space between realities. The darkness holds infinite possibilities 🌙',
    imageUrl: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=800&h=600&fit=crop',
    liked: false,
    bookmarked: false,
    likes: 67,
    xpEarned: 20,
    type: 'media',
    comments: [
      { id: '5', username: 'cosmic_drifter', text: 'This speaks to my soul', timestamp: '45m ago', coreRealm: 'shadowcore' }
    ]
  },
  {
    id: '4',
    username: 'prism_drift',
    nickname: 'Echo Dreamer',
    coreRealm: 'mirrorcore',
    timestamp: '3h ago',
    content: 'Sometimes the most beautiful art lives only in our thoughts, suspended between what is and what could be. Tonight I\'m dreaming in liquid light.',
    caption: 'Sometimes the most beautiful art lives only in our thoughts, suspended between what is and what could be. Tonight I\'m dreaming in liquid light.',
    imageUrl: null, // This is a thought post, no image
    liked: true,
    bookmarked: false,
    likes: 34,
    xpEarned: 10,
    type: 'thought',
    comments: [
      { id: '6', username: 'lunar_echoes', text: 'This is poetry in motion 💫', timestamp: '2h ago', coreRealm: 'mirrorcore' }
    ]
  },
  {
    id: '5',
    username: 'zenfree292',
    nickname: 'Cosmic Wanderer',
    coreRealm: 'shadowcore',
    timestamp: '45m ago',
    location: 'San Francisco, CA',
    caption: 'Captured this incredible sunset while exploring the urban mystique. The colors blend reality and dreams 🌅✨',
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
    liked: false,
    bookmarked: true,
    likes: 89,
    xpEarned: 30,
    type: 'media',
    comments: [
      { id: '7', username: 'lunar_echoes', text: 'Absolutely stunning! 🌟', timestamp: '40m ago', coreRealm: 'mirrorcore' },
      { id: '8', username: 'digital_phoenix', text: 'This is pure magic', timestamp: '35m ago', coreRealm: 'embercore' }
    ]
  }
];

export const mockSearchResults: SearchResult[] = [
  { id: '1', type: 'user', title: 'lunar_echoes', subtitle: 'Mirror Walker', coreRealm: 'mirrorcore', verified: true },
  { id: '2', type: 'user', title: 'digital_phoenix', subtitle: 'Flame Keeper', coreRealm: 'embercore' },
  { id: '3', type: 'realm', title: 'Mirrorcore', subtitle: '🪞 Reflection realm' },
  { id: '4', type: 'post', title: 'Ethereal reflection in city lights', subtitle: 'by @lunar_echoes' },
];

export const mockUserProfiles: Record<string, UserProfile> = {
  'lunar_echoes': {
    username: 'lunar_echoes',
    nickname: 'Mirror Walker',
    coreRealm: 'mirrorcore',
    followers: 1200,
    following: 340,
    posts: 89,
    bio: 'Exploring reflections in the digital cosmos ✨ Finding beauty in the liminal spaces',
    isFollowing: false,
    isOwn: false
  },
  'digital_phoenix': {
    username: 'digital_phoenix',
    nickname: 'Flame Keeper',
    coreRealm: 'embercore',
    followers: 2100,
    following: 567,
    posts: 156,
    bio: 'Transforming pixels into fire 🔥 Manifesting digital alchemy',
    isFollowing: true,
    isOwn: false
  }
};