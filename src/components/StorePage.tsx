import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { 
  ArrowLeft, 
  ShoppingBag, 
  Star, 
  Sparkles, 
  Crown,
  Zap,
  Palette,
  Frame
} from 'lucide-react';
import { UserResult, UserInfo } from '../App';

interface StorePageProps {
  userResult: UserResult | null;
  userInfo: UserInfo | null;
  onBack: () => void;
}

interface StoreItem {
  id: string;
  name: string;
  description: string;
  price: number;
  type: 'frame' | 'glow' | 'badge' | 'nickname' | 'boost';
  icon: React.ElementType;
  color: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  requirements?: string;
}

const storeItems: StoreItem[] = [
  {
    id: '1',
    name: 'Ethereal Frame',
    description: 'Mystical border that shifts with cosmic energy',
    price: 250,
    type: 'frame',
    icon: Frame,
    color: 'electric-blue',
    rarity: 'rare',
    requirements: 'Level 5+'
  },
  {
    id: '2',
    name: 'Phoenix Glow',
    description: 'Fiery aura that burns with inner transformation',
    price: 500,
    type: 'glow',
    icon: Zap,
    color: 'glitch-red',
    rarity: 'epic',
    requirements: 'Embercore Level 10+'
  },
  {
    id: '3',
    name: 'Realm Walker',
    description: 'Exclusive badge for interdimensional travelers',
    price: 750,
    type: 'badge',
    icon: Star,
    color: 'neon-lilac',
    rarity: 'legendary',
    requirements: 'Visit all 3 realms'
  },
  {
    id: '4',
    name: 'Cosmic Palette',
    description: 'Unlock additional profile color schemes',
    price: 300,
    type: 'frame',
    icon: Palette,
    color: 'soft-blush',
    rarity: 'rare'
  },
  {
    id: '5',
    name: 'XP Boost Crystal',
    description: '2x XP for next 24 hours of activity',
    price: 150,
    type: 'boost',
    icon: Sparkles,
    color: 'muted-lavender',
    rarity: 'common'
  },
  {
    id: '6',
    name: 'Shadow Crown',
    description: 'Exclusive headpiece for shadow realm masters',
    price: 1000,
    type: 'frame',
    icon: Crown,
    color: 'neon-lilac',
    rarity: 'legendary',
    requirements: 'Shadowcore Level 15+'
  }
];

export function StorePage({ userResult, userInfo, onBack }: StorePageProps) {
  const userXP = userInfo?.xpPoints || 0;
  const userLevel = Math.floor(userXP / 100) + 1;

  const getRarityColor = (rarity: string) => {
    const colors = {
      common: 'muted-lavender',
      rare: 'electric-blue',
      epic: 'neon-lilac',
      legendary: 'glitch-red'
    };
    return colors[rarity] || 'muted-lavender';
  };

  const canPurchase = (item: StoreItem) => {
    if (userXP < item.price) return false;
    
    if (item.requirements) {
      if (item.requirements.includes('Level')) {
        const reqLevel = parseInt(item.requirements.match(/\d+/)?.[0] || '0');
        if (userLevel < reqLevel) return false;
      }
      
      if (item.requirements.includes('Embercore') && userResult?.coreRealm !== 'embercore') return false;
      if (item.requirements.includes('Shadowcore') && userResult?.coreRealm !== 'shadowcore') return false;
    }
    
    return true;
  };

  return (
    <div className="min-h-screen bg-midnight-black pb-safe">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-midnight-black/80 soft-blur border-b border-muted-lavender/20 pt-safe">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={onBack}
            className="p-2 bg-transparent border border-muted-lavender/30 text-muted-lavender hover:text-pearl-white hover:bg-muted-lavender/10 rounded-xl transition-all duration-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-3">
            <ShoppingBag className="w-6 h-6 text-neon-lilac" />
            <h1 className="font-headline font-medium text-pearl-white">Cosmic Store</h1>
          </div>
          
          <div className="flex items-center space-x-2 bg-muted-lavender/10 border border-muted-lavender/20 rounded-xl px-3 py-2">
            <Sparkles className="w-4 h-4 text-electric-blue" />
            <span className="font-body text-pearl-white">{userXP}</span>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Welcome Banner */}
        <Card className="bg-gradient-to-r from-neon-lilac/10 to-electric-blue/10 border-neon-lilac/30">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              {userResult && userInfo && (
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="bg-gradient-to-r from-neon-lilac to-electric-blue text-white font-headline">
                    {userInfo.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              <div>
                <h2 className="font-headline text-pearl-white">Welcome, {userResult?.nickname || 'Cosmic Traveler'}</h2>
                <p className="text-muted-lavender font-body text-sm">
                  Level {userLevel} • {userXP} XP available
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Store Categories */}
        <div className="space-y-4">
          <h3 className="font-headline text-pearl-white text-lg">Mystical Enhancements</h3>
          
          <div className="grid gap-4">
            {storeItems.map((item) => {
              const Icon = item.icon;
              const rarityColor = getRarityColor(item.rarity);
              const canBuy = canPurchase(item);
              
              return (
                <Card 
                  key={item.id}
                  className={`bg-midnight-black/50 border-${rarityColor}/30 hover:border-${rarityColor}/50 transition-all duration-300 ${!canBuy ? 'opacity-60' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-xl bg-${item.color}/10 border border-${item.color}/30`}>
                        <Icon className={`w-6 h-6 text-${item.color}`} />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-headline text-pearl-white font-medium">{item.name}</h4>
                              <Badge className={`bg-${rarityColor}/20 border-${rarityColor}/40 text-${rarityColor} text-xs font-accent`}>
                                {item.rarity}
                              </Badge>
                            </div>
                            <p className="text-muted-lavender font-body text-sm mt-1">{item.description}</p>
                            {item.requirements && (
                              <p className="text-muted-lavender/60 font-body text-xs mt-2">
                                Requires: {item.requirements}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center space-x-2">
                            <Sparkles className="w-4 h-4 text-electric-blue" />
                            <span className="font-headline text-electric-blue">{item.price} XP</span>
                          </div>
                          
                          <Button
                            disabled={!canBuy}
                            className={`${
                              canBuy
                                ? `bg-gradient-to-r from-${item.color} to-${rarityColor} hover:from-${item.color}/90 hover:to-${rarityColor}/90 text-white`
                                : 'bg-muted-lavender/20 text-muted-lavender cursor-not-allowed'
                            } font-body rounded-xl px-4 py-2 text-sm transition-all duration-300`}
                          >
                            {canBuy ? 'Purchase' : 'Locked'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Coming Soon Section */}
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-neon-lilac/10 border border-neon-lilac/30 rounded-2xl flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-neon-lilac" />
          </div>
          <h3 className="font-headline text-pearl-white mb-2">More Coming Soon</h3>
          <p className="text-muted-lavender font-body text-sm">
            New mystical items and realm-specific collections arriving with future updates
          </p>
        </div>

        {/* Bottom spacing for mobile navigation */}
        <div className="h-20 md:h-0" />
      </div>
    </div>
  );
}