import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { toast } from 'sonner@2.0.3';
import { 
  ArrowLeft, 
  Bell,
  Shield,
  Eye,
  Smartphone,
  Globe,
  HelpCircle,
  ChevronRight,
  Wrench,
  Camera,
  Mic,
  Video
} from 'lucide-react';
import { UserInfo } from '../App';

interface SettingsPageProps {
  userInfo: UserInfo | null;
  userResult?: any;
  onBack: () => void;
  onLogout?: () => void;
  onGlobalAvatarUpdate?: (newAvatarUrl: string) => Promise<void>;
  cameraPermission?: boolean;
  micPermission?: boolean;
  onPermissionToggle?: (type: 'camera' | 'mic', enabled: boolean) => Promise<void> | void;
}

export function SettingsPage({ userInfo, userResult, onBack, onLogout, onGlobalAvatarUpdate, cameraPermission, micPermission, onPermissionToggle }: SettingsPageProps) {
  const [notifications, setNotifications] = useState(userInfo?.notificationsEnabled ?? true);
  const [privateProfile, setPrivateProfile] = useState(false);
  const [activityStatus, setActivityStatus] = useState(true);
  const settingSections = [
    {
      title: 'Privacy & Safety',
      items: [
        {
          icon: Shield,
          label: 'Private Profile',
          description: 'Only followers can see your posts',
          type: 'switch' as const,
          value: privateProfile,
          onChange: setPrivateProfile
        },
        {
          icon: Eye,
          label: 'Activity Status',
          description: 'Show when you\'re active',
          type: 'switch' as const,
          value: activityStatus,
          onChange: setActivityStatus
        }
      ]
    },
    {
      title: 'Permissions',
      items: [
        {
          icon: Video,
          label: 'Media Permissions',
          description: 'Allow camera and microphone access for posts, stories, and audio',
          type: 'switch' as const,
          value: (cameraPermission ?? false) && (micPermission ?? false),
          onChange: async (enabled: boolean) => {
            console.log('🎛️ Media permissions toggle clicked:', enabled);
            console.log('🎛️ onPermissionToggle function exists:', typeof onPermissionToggle);
            console.log('🎛️ Current permissions:', { camera: cameraPermission, mic: micPermission });
            
            try {
              if (enabled) {
                console.log('📲 Requesting permissions via dialog');
                // Show permissions dialog to request both
                await onPermissionToggle?.('camera', enabled);
              } else {
                console.log('🚫 Disabling both permissions');
                // Turn off both permissions sequentially
                await onPermissionToggle?.('camera', false);
                await onPermissionToggle?.('mic', false);
              }
              console.log('✅ Permission toggle completed');
            } catch (error) {
              console.error('❌ Error in permission toggle:', error);
              toast.error('Permission Error', {
                description: 'Failed to update media permissions. Please try again.',
                duration: 4000
              });
            }
          }
        }
      ]
    },
    {
      title: 'Notifications',
      items: [
        {
          icon: Bell,
          label: 'Push Notifications',
          description: 'Get notified about likes, comments, and follows',
          type: 'switch' as const,
          value: notifications,
          onChange: setNotifications
        }
      ]
    },
    {
      title: 'Developer',
      items: [
        {
          icon: Wrench,
          label: 'Debug Info',
          description: 'View app debug information',
          type: 'action' as const,
          action: () => {
            toast.success('Debug Info', {
              description: `User ID: ${userInfo?.id?.substring(0, 8)}...\nUsername: ${userInfo?.username}\nXP: ${userResult?.xp || 0}`
            });
          }
        }
      ]
    },
    {
      title: 'About',
      items: [
        {
          icon: Smartphone,
          label: 'App Version',
          description: '1.0.0',
          type: 'info' as const
        },
        {
          icon: Globe,
          label: 'Region',
          description: 'Global',
          type: 'info' as const
        },
        {
          icon: HelpCircle,
          label: 'Help & Support',
          description: 'Get help or contact support',
          type: 'link' as const
        }
      ]
    }
  ];

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
          
          <h1 className="font-headline font-medium text-pearl-white">Settings</h1>
          
          <div className="w-10 h-10" /> {/* Spacer */}
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* User Info Card */}
        <Card className="bg-gradient-to-br from-neon-lilac/10 to-electric-blue/10 border-neon-lilac/30">
          <CardHeader className="pb-4">
            <div className="text-center">
              <h2 className="font-headline text-pearl-white text-lg">@{userInfo?.username || 'user'}</h2>
              <p className="text-muted-lavender font-body text-sm">
                Member since {userInfo?.joinDate ? new Date(userInfo.joinDate).toLocaleDateString() : 'recently'}
              </p>
            </div>
          </CardHeader>
        </Card>



        {/* Settings Sections */}
        {settingSections.map((section, sectionIndex) => (
          <div key={section.title} className="space-y-4">
            <h3 className="font-headline text-pearl-white text-sm font-medium px-2">
              {section.title}
            </h3>
            
            <Card className="bg-midnight-black/50 border-muted-lavender/30">
              <CardContent className="p-0">
                {section.items.map((item, itemIndex) => {
                  const Icon = item.icon;
                  
                  return (
                    <div key={item.label}>
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-lg bg-muted-lavender/10 border border-muted-lavender/20">
                            <Icon className="w-4 h-4 text-muted-lavender" />
                          </div>
                          <div>
                            <p className="font-body text-pearl-white font-medium">{item.label}</p>
                            <p className="font-body text-muted-lavender text-sm">{item.description}</p>
                          </div>
                        </div>
                        
                        {item.type === 'switch' && (
                          <Switch
                            checked={item.value as boolean}
                            onCheckedChange={item.onChange as (value: boolean) => void}
                          />
                        )}
                        
                        {item.type === 'action' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={item.action}
                            className="text-electric-blue hover:text-electric-blue hover:bg-electric-blue/10"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        )}
                        
                        {(item.type === 'link' || item.type === 'info') && (
                          <ChevronRight className="w-4 h-4 text-muted-lavender" />
                        )}
                      </div>
                      
                      {itemIndex < section.items.length - 1 && (
                        <Separator className="bg-muted-lavender/10" />
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        ))}

        {/* Bottom spacing for mobile navigation */}
        <div className="h-20 md:h-0" />
      </div>
    </div>
  );
}