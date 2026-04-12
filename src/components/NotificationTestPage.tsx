import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner@2.0.3';
import { 
  Bell, 
  Plus, 
  Heart, 
  MessageCircle, 
  Users, 
  ArrowLeft,
  Loader2,
  CheckCheck,
  Trash2,
  Award,
  Settings,
  Megaphone
} from 'lucide-react';
import { 
  createNotification,
  createLikeNotification,
  createCommentNotification,
  createFollowNotification,
  createAchievementNotification,
  createSystemNotification,
  createAnnouncementNotification
} from '../utils/supabase/notification-helpers';
import { NotificationType } from '../utils/notification-types';

interface NotificationTestPageProps {
  onBack: () => void;
  userInfo: any;
}

export function NotificationTestPage({ onBack, userInfo }: NotificationTestPageProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [notificationType, setNotificationType] = useState<NotificationType>('like');
  const [testMessage, setTestMessage] = useState('');

  const handleCreateTestNotification = async () => {
    if (!userInfo?.id) {
      toast.error('Please sign in to test notifications');
      return;
    }

    setIsCreating(true);
    try {
      // Use the specific helper functions for different notification types
      const message = testMessage || getDefaultMessage(notificationType);
      
      switch (notificationType) {
        case 'like':
          await createLikeNotification(
            userInfo.id,
            'test_user',
            'test_post_123',
            'This is a test post caption'
          );
          break;
          
        case 'comment':
          await createCommentNotification(
            userInfo.id,
            'test_user',
            'test_post_123',
            message,
            'This is a test post caption'
          );
          break;
          
        case 'follow':
          await createFollowNotification(
            userInfo.id,
            'test_user',
            'test_user_id_123'
          );
          break;
          
        case 'achievement':
          await createAchievementNotification(
            userInfo.id,
            'Test Achievement',
            'You completed a test action!',
            'achievement_test_123'
          );
          break;
          
        case 'system':
          await createSystemNotification(
            userInfo.id,
            'System Test',
            message
          );
          break;
          
        case 'announcement':
          await createAnnouncementNotification(
            userInfo.id,
            'Test Announcement',
            message
          );
          break;
          
        default:
          // Fallback to generic notification creation
          await createNotification(
            userInfo.id,
            notificationType,
            'Test Notification',
            message,
            'test_related_id',
            { test: true }
          );
      }

      toast.success('Test notification created! 🔔', {
        description: 'Check your notification center to see it'
      });
      
      setTestMessage('');
    } catch (error) {
      console.error('Error creating test notification:', error);
      toast.error('Failed to create test notification', {
        description: 'Make sure you have an active session and the backend is running'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const getDefaultMessage = (type: NotificationType): string => {
    switch (type) {
      case 'like':
        return '@test_user liked your post';
      case 'comment':
        return 'This is a test comment on your post!';
      case 'follow':
        return '@test_user started following you';
      case 'achievement':
        return 'You unlocked a new test achievement!';
      case 'system':
        return 'This is a system notification test';
      case 'announcement':
        return 'This is a test announcement for all users';
      case 'realm_activity':
        return 'New activity in your realm';
      case 'message':
        return 'You have a new message';
      case 'tribe_access_request':
        return 'Someone requested to join your tribe';
      case 'tribe_access_approved':
        return 'Your tribe access request was approved';
      case 'tribe_access_denied':
        return 'Your tribe access request was denied';
      default:
        return 'You have a new notification';
    }
  };

  const getIconForType = (type: NotificationType) => {
    switch (type) {
      case 'like':
        return <Heart className="w-4 h-4 text-glitch-red" />;
      case 'comment':
        return <MessageCircle className="w-4 h-4 text-electric-blue" />;
      case 'follow':
        return <Users className="w-4 h-4 text-neon-lilac" />;
      case 'achievement':
        return <Award className="w-4 h-4 text-soft-blush" />;
      case 'system':
        return <Settings className="w-4 h-4 text-muted-lavender" />;
      case 'announcement':
        return <Megaphone className="w-4 h-4 text-electric-blue" />;
      case 'realm_activity':
        return <CheckCheck className="w-4 h-4 text-neon-lilac" />;
      case 'message':
        return <MessageCircle className="w-4 h-4 text-soft-blush" />;
      case 'tribe_access_request':
      case 'tribe_access_approved':
      case 'tribe_access_denied':
        return <Users className="w-4 h-4 text-electric-blue" />;
      default:
        return <Bell className="w-4 h-4 text-muted-lavender" />;
    }
  };

  return (
    <div className="min-h-screen bg-midnight-black">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-midnight-black/80 soft-blur border-b border-muted-lavender/20">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-muted-lavender/10 border border-muted-lavender/20 text-muted-lavender hover:text-pearl-white hover:bg-muted-lavender/20 transition-all duration-300"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-headline text-pearl-white">Notification Testing</h1>
              <p className="text-sm text-muted-lavender font-body">Test the notification system</p>
            </div>
          </div>
          <Badge className="bg-electric-blue/20 border-electric-blue/40 text-electric-blue">
            Development Tool
          </Badge>
        </div>
      </div>

      <div className="p-6 max-w-2xl mx-auto space-y-6">
        {/* Info Card */}
        <Card className="bg-muted-lavender/10 border-muted-lavender/20">
          <CardHeader>
            <CardTitle className="text-pearl-white font-headline flex items-center space-x-2">
              <Bell className="w-5 h-5 text-electric-blue" />
              <span>Notification System Test</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-lavender font-body">
              Create test notifications to verify the system is working correctly. 
              These will appear in your notification center.
            </p>
            
            <div className="bg-midnight-black/50 rounded-xl p-4 space-y-3">
              <h3 className="font-headline text-pearl-white">Current User</h3>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-electric-blue to-neon-lilac flex items-center justify-center text-white text-sm">
                  {userInfo?.username?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="text-pearl-white font-body">@{userInfo?.username || 'unknown'}</p>
                  <p className="text-sm text-muted-lavender font-body">ID: {userInfo?.id || 'Not set'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Notification Creator */}
        <Card className="bg-midnight-black/50 border-muted-lavender/20">
          <CardHeader>
            <CardTitle className="text-pearl-white font-headline flex items-center space-x-2">
              <Plus className="w-5 h-5 text-neon-lilac" />
              <span>Create Test Notification</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-pearl-white font-body">Notification Type</label>
              <Select value={notificationType} onValueChange={(value) => setNotificationType(value as NotificationType)}>
                <SelectTrigger className="bg-input-background border-muted-lavender/30 text-pearl-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-midnight-black border-muted-lavender/30">
                  <SelectItem value="like" className="text-pearl-white">
                    <div className="flex items-center space-x-2">
                      <Heart className="w-4 h-4 text-glitch-red" />
                      <span>Like</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="comment" className="text-pearl-white">
                    <div className="flex items-center space-x-2">
                      <MessageCircle className="w-4 h-4 text-electric-blue" />
                      <span>Comment</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="follow" className="text-pearl-white">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-neon-lilac" />
                      <span>Follow</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="achievement" className="text-pearl-white">
                    <div className="flex items-center space-x-2">
                      <Award className="w-4 h-4 text-soft-blush" />
                      <span>Achievement</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="system" className="text-pearl-white">
                    <div className="flex items-center space-x-2">
                      <Settings className="w-4 h-4 text-muted-lavender" />
                      <span>System</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="announcement" className="text-pearl-white">
                    <div className="flex items-center space-x-2">
                      <Megaphone className="w-4 h-4 text-electric-blue" />
                      <span>Announcement</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="realm_activity" className="text-pearl-white">
                    <div className="flex items-center space-x-2">
                      <CheckCheck className="w-4 h-4 text-neon-lilac" />
                      <span>Realm Activity</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="message" className="text-pearl-white">
                    <div className="flex items-center space-x-2">
                      <MessageCircle className="w-4 h-4 text-soft-blush" />
                      <span>Message</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-pearl-white font-body">Custom Message (optional)</label>
              <Input
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder={getDefaultMessage(notificationType)}
                className="bg-input-background border-muted-lavender/30 text-pearl-white placeholder:text-muted-lavender/50"
              />
            </div>

            <div className="bg-muted-lavender/10 rounded-xl p-4">
              <h4 className="font-headline text-pearl-white mb-2 flex items-center space-x-2">
                {getIconForType(notificationType)}
                <span>Preview</span>
              </h4>
              <p className="text-muted-lavender font-body">
                {testMessage || getDefaultMessage(notificationType)}
              </p>
              <p className="text-xs text-muted-lavender/60 font-body mt-2">
                From: test_user • Type: {notificationType}
              </p>
            </div>

            <Button
              onClick={handleCreateTestNotification}
              disabled={isCreating || !userInfo?.id}
              className="w-full bg-gradient-to-r from-neon-lilac to-electric-blue hover:from-neon-lilac/90 hover:to-electric-blue/90 text-white font-body"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Test Notification
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-electric-blue/10 border-electric-blue/20">
          <CardContent className="p-4">
            <h3 className="font-headline text-pearl-white mb-2 flex items-center space-x-2">
              <Bell className="w-4 h-4 text-electric-blue" />
              <span>How to Test</span>
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-muted-lavender font-body">
              <li>Select a notification type from the dropdown</li>
              <li>Optionally enter a custom message</li>
              <li>Click "Create Test Notification"</li>
              <li>Check the notification bell icon in the top bar</li>
              <li>Open the notification center to see your test notification</li>
            </ol>
            <p className="text-sm text-electric-blue font-body mt-3">
              💡 The notification count should update automatically when new notifications are created.
            </p>
          </CardContent>
        </Card>

        {/* API Status */}
        <Card className="bg-neon-lilac/10 border-neon-lilac/20">
          <CardContent className="p-4">
            <h3 className="font-headline text-pearl-white mb-2 flex items-center space-x-2">
              <Settings className="w-4 h-4 text-neon-lilac" />
              <span>API Endpoints</span>
            </h3>
            <div className="space-y-2 text-sm font-body">
              <div className="flex justify-between items-center">
                <span className="text-muted-lavender">GET /notifications</span>
                <Badge className="bg-electric-blue/20 text-electric-blue">Active</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-lavender">POST /notifications</span>
                <Badge className="bg-electric-blue/20 text-electric-blue">Active</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-lavender">POST /notifications/read</span>
                <Badge className="bg-electric-blue/20 text-electric-blue">Active</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-lavender">GET /notifications/unread-count</span>
                <Badge className="bg-electric-blue/20 text-electric-blue">Active</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}