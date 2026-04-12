import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './ui/sheet';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { toast } from 'sonner@2.0.3';
import {
  Bell,
  Check,
  CheckCheck,
  Heart,
  MessageCircle,
  Users,
  Award,
  Star,
  Mail,
  Settings,
  Megaphone,
  ExternalLink,
  Sparkles,
  X,
  Loader2,
  RefreshCw
} from 'lucide-react';

import { 
  Notification, 
  NotificationTab, 
  NotificationCenterState,
  NotificationType 
} from '../utils/notification-types';
import { 
  getNotificationIcon, 
  getNotificationColor,
  groupNotificationsByType,
  formatNotificationTime,
  handleNotificationAction
} from '../utils/notification-helpers';
import { 
  fetchNotifications, 
  markNotificationsAsRead, 
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
  type NotificationFetchOptions
} from '../utils/supabase/notification-helpers';
import { UserInfo } from '../App';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  userInfo: UserInfo | null;
  onNavigate: (action: string, target: string, data?: any) => void;
  onUpdateUnreadCount: (count: number) => void;
}

export function NotificationCenter({ 
  isOpen, 
  onClose, 
  userInfo, 
  onNavigate,
  onUpdateUnreadCount 
}: NotificationCenterProps) {
  const [state, setState] = useState<NotificationCenterState>({
    notifications: [],
    unreadCount: 0,
    currentTab: 'unread',
    isLoading: true
  });

  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Load notifications when component mounts or opens
  useEffect(() => {
    if (isOpen) {
      // Use auth guard to check if user is authenticated before loading
      const loadWithAuthCheck = async () => {
        const { hasValidSession } = await import('../utils/auth-guards');
        if (await hasValidSession()) {
          loadNotifications(true); // Reset on open
        } else {
          console.warn('No valid session for notification loading');
          setState(prev => ({ ...prev, isLoading: false }));
        }
      };
      loadWithAuthCheck();
    }
  }, [isOpen]);

  // Load unread count when userInfo changes
  useEffect(() => {
    if (userInfo) {
      updateUnreadCount();
    }
  }, [userInfo]);

  const updateUnreadCount = async () => {
    try {
      const count = await getUnreadNotificationCount();
      setState(prev => ({ ...prev, unreadCount: count }));
      onUpdateUnreadCount(count);
    } catch (error) {
      console.error('Error updating unread count:', error);
    }
  };

  const loadNotifications = async (reset = false) => {
    // Check auth before loading notifications
    const { hasValidSession } = await import('../utils/auth-guards');
    
    if (!(await hasValidSession())) {
      console.warn('No valid session for notification loading');
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    if (reset) {
      setState(prev => ({ ...prev, isLoading: true }));
      setCursor(undefined);
    } else {
      setIsLoadingMore(true);
    }
    
    try {
      const options: NotificationFetchOptions = {
        limit: 30,
        cursor: reset ? undefined : cursor,
        unreadOnly: state.currentTab === 'unread'
      };

      const response = await fetchNotifications(options);
      
      setState(prev => ({
        ...prev,
        notifications: reset ? response.items : [...prev.notifications, ...response.items],
        isLoading: false,
        lastFetched: new Date()
      }));
      
      setCursor(response.nextCursor);
      setHasMore(response.hasMore);
      
      // Update unread count
      await updateUnreadCount();
      
    } catch (error) {
      console.error('Error loading notifications:', error);
      
      // Always show mock data for testing and to demonstrate functionality
      console.log('Loading mock notifications for testing...');
      const mockNotifications: Notification[] = [
        {
          id: 'mock-1',
          userId: userInfo.id || 'test-user',
          type: 'comment',
          title: 'New Comment',
          content: '@cosmic_wanderer commented on your post',
          relatedData: {
            username: 'cosmic_wanderer',
            postCaption: 'Just discovered this amazing new realm! The cosmic energy here is incredible. ✨🌌',
            commentContent: 'This is absolutely beautiful! The vaporwave aesthetic really brings out the cosmic vibes. 💫'
          },
          isRead: false,
          createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
          timestamp: '2m ago'
        },
        {
          id: 'mock-2',
          userId: userInfo.id || 'test-user',
          type: 'comment',
          title: 'New Comment',
          content: '@realm_explorer commented on your post',
          relatedData: {
            username: 'realm_explorer',
            postCaption: 'Sunset vibes in the crystal realm',
            commentContent: 'What realm is this? I need to visit! The colors are incredible.'
          },
          isRead: false,
          createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
          timestamp: '15m ago'
        },
        {
          id: 'mock-3',
          userId: userInfo.id || 'test-user',
          type: 'like',
          title: 'Post Liked',
          content: '@tribe_seeker liked your post',
          relatedData: {
            username: 'tribe_seeker',
            postCaption: 'Found my tribe in the digital realm! ✨'
          },
          isRead: false,
          createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
          timestamp: '30m ago'
        },
        {
          id: 'mock-4',
          userId: userInfo.id || 'test-user',
          type: 'follow',
          title: 'New Follower',
          content: '@vibe_curator started following you',
          relatedData: {
            username: 'vibe_curator'
          },
          isRead: false,
          createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 minutes ago
          timestamp: '45m ago'
        },
        {
          id: 'mock-5',
          userId: userInfo.id || 'test-user',
          type: 'comment',
          title: 'New Comment',
          content: '@digital_dreamer commented on your post',
          relatedData: {
            username: 'digital_dreamer',
            postCaption: 'Neon nights and cosmic lights',
            commentContent: 'This gives me major synthwave vibes! Love the aesthetic choices here. 🌟'
          },
          isRead: true,
          createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
          timestamp: '1h ago'
        },
        {
          id: 'mock-6',
          userId: userInfo.id || 'test-user',
          type: 'achievement',
          title: 'Achievement Unlocked!',
          content: 'You unlocked "Community Builder" - Received 10 comments on your posts',
          relatedData: {
            achievementName: 'Community Builder',
            achievementDescription: 'Received 10 comments on your posts'
          },
          isRead: true,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          timestamp: '2h ago'
        }
      ];

      setState(prev => ({
        ...prev,
        notifications: mockNotifications,
        isLoading: false,
        unreadCount: mockNotifications.filter(n => !n.isRead).length,
        lastFetched: new Date()
      }));
      
      onUpdateUnreadCount(mockNotifications.filter(n => !n.isRead).length);
      setCursor(undefined);
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const loadMoreNotifications = () => {
    if (!isLoadingMore && hasMore) {
      loadNotifications(false);
    }
  };

  const handleTabChange = (newTab: NotificationTab) => {
    setState(prev => ({ ...prev, currentTab: newTab }));
    // Reset and reload notifications for the new tab
    setCursor(undefined);
    setHasMore(false);
    loadNotifications(true);
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.isRead) {
      try {
        await markNotificationsAsRead([notification.id]);
        
        // Update local state
        setState(prev => ({
          ...prev,
          notifications: prev.notifications.map(n => 
            n.id === notification.id ? { ...n, isRead: true } : n
          ),
          unreadCount: Math.max(0, prev.unreadCount - 1)
        }));
        
        onUpdateUnreadCount(Math.max(0, state.unreadCount - 1));
        
        // Show visual feedback for marking as read
        toast.success('Notification marked as read');
        
      } catch (error) {
        console.error('Error marking notification as read:', error);
        toast.error('Failed to mark notification as read');
      }
    }

    // Handle navigation
    const actionResult = handleNotificationAction(notification);
    if (actionResult.action !== 'dismiss') {
      onNavigate(actionResult.action, actionResult.target, actionResult);
      onClose();
    }
  };

  // Add individual mark as read function (without navigation)
  const handleMarkAsRead = async (notification: Notification, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent navigation
    
    if (notification.isRead) return;
    
    try {
      // For mock notifications, just update local state
      if (notification.id.startsWith('mock-')) {
        setState(prev => ({
          ...prev,
          notifications: prev.notifications.map(n => 
            n.id === notification.id ? { ...n, isRead: true } : n
          ),
          unreadCount: Math.max(0, prev.unreadCount - 1)
        }));
        
        onUpdateUnreadCount(Math.max(0, state.unreadCount - 1));
        toast.success('Marked as read');
        return;
      }
      
      await markNotificationsAsRead([notification.id]);
      
      // Update local state
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => 
          n.id === notification.id ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, prev.unreadCount - 1)
      }));
      
      onUpdateUnreadCount(Math.max(0, state.unreadCount - 1));
      toast.success('Marked as read');
      
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!userInfo || state.unreadCount === 0) return;

    try {
      // For mock notifications, just update local state
      const hasMockNotifications = state.notifications.some(n => n.id.startsWith('mock-'));
      if (hasMockNotifications) {
        setState(prev => ({
          ...prev,
          notifications: prev.notifications.map(n => ({ ...n, isRead: true })),
          unreadCount: 0
        }));
        
        onUpdateUnreadCount(0);
        toast.success('All notifications marked as read ✨');
        return;
      }
      
      await markAllNotificationsAsRead();
      
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => ({ ...n, isRead: true })),
        unreadCount: 0
      }));
      
      onUpdateUnreadCount(0);
      toast.success('All notifications marked as read ✨');
      
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const handleRefresh = () => {
    loadNotifications(true);
    updateUnreadCount();
  };

  const getFilteredNotifications = () => {
    if (state.currentTab === 'unread') {
      return state.notifications.filter(n => !n.isRead);
    }
    return state.notifications;
  };

  const getNotificationTypeIcon = (type: NotificationType) => {
    const iconMap = {
      like: Heart,
      comment: MessageCircle,
      follow: Users,
      realm_activity: Star,
      achievement: Award,
      message: Mail,
      system: Settings,
      announcement: Megaphone,
      tribe_access_request: Users,
      tribe_access_approved: Check,
      tribe_access_denied: X
    };
    return iconMap[type] || Bell;
  };

  const renderNotificationItem = (notification: Notification) => {
    const IconComponent = getNotificationTypeIcon(notification.type);
    const colorClass = getNotificationColor(notification.type);
    
    // Enhanced content for better display
    const getNotificationContent = () => {
      if (notification.type === 'comment' && notification.relatedData?.commentContent) {
        return `"${notification.relatedData.commentContent}"`;
      }
      return notification.content || 'Activity notification';
    };
    
    return (
      <div
        key={notification.id}
        className={`w-full notification-item p-3 sm:p-4 rounded-xl transition-all duration-300 cursor-pointer relative ${ 
          !notification.isRead 
            ? 'bg-muted-lavender/10 border border-muted-lavender/30 hover:bg-muted-lavender/15' 
            : 'border border-muted-lavender/10 opacity-80 hover:opacity-100 hover:bg-muted-lavender/5'
        }`}
        onClick={() => handleNotificationClick(notification)}
      >        
        <div className="flex items-start space-x-3">
          {/* Notification Icon */}
          <div className={`p-2 rounded-lg bg-${colorClass}/20 border border-${colorClass}/30 flex-shrink-0 ${
            notification.isRead ? 'opacity-60' : ''
          }`}>
            <IconComponent className={`notification-icon w-4 h-4 text-${colorClass}`} />
          </div>
          
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Header with Title and Actions */}
            <div className="flex items-start justify-between mb-1 gap-2">
              <h4 className={`notification-title font-headline font-medium text-sm leading-tight break-words ${ 
                notification.isRead ? 'text-muted-lavender/80' : 'text-pearl-white'
              }`}>
                {notification.title || 'Notification'}
              </h4>
              
              <div className="flex items-center space-x-2 flex-shrink-0">
                {!notification.isRead && (
                  <>
                    <Button
                      onClick={(e) => handleMarkAsRead(notification, e)}
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-electric-blue hover:text-electric-blue hover:bg-electric-blue/10 border border-electric-blue/30"
                      title="Mark as read"
                    >
                      <Check className="w-3 h-3" />
                    </Button>
                    <div className="w-2 h-2 bg-electric-blue rounded-full animate-pulse" />
                  </>
                )}
                {notification.isRead && (
                  <Check className="w-3 h-3 text-muted-lavender/40" />
                )}
              </div>
            </div>
            
            {/* Content */}
            <div className="space-y-2">
              {/* Main notification text */}
              <p className={`notification-content text-sm font-body leading-relaxed break-words ${
                notification.isRead ? 'text-muted-lavender/70' : 'text-muted-lavender'
              }`}>
                {notification.content || 'Activity notification'}
              </p>
              
              {/* Comment content for comment notifications */}
              {notification.type === 'comment' && notification.relatedData?.commentContent && (
                <div className="bg-muted-lavender/5 p-3 rounded-lg border border-muted-lavender/10">
                  <p className={`text-sm font-body leading-relaxed break-words ${
                    notification.isRead ? 'text-pearl-white/70' : 'text-pearl-white'
                  }`}>
                    "{notification.relatedData.commentContent}"
                  </p>
                </div>
              )}
              
              {/* Related Post Caption */}
              {notification.relatedData?.postCaption && (
                <p className="text-xs text-muted-lavender/60 font-body italic break-words bg-muted-lavender/5 p-2 rounded-lg border border-muted-lavender/10">
                  On your post: "{notification.relatedData.postCaption.slice(0, 60)}{notification.relatedData.postCaption.length > 60 ? '...' : ''}"
                </p>
              )}
              
              {/* Related Achievement */}
              {notification.relatedData?.achievementName && (
                <div className="flex items-center space-x-2 text-xs text-soft-blush font-body">
                  <Award className="w-3 h-3" />
                  <span>{notification.relatedData.achievementName}</span>
                </div>
              )}
              
              {/* Timestamp and Status */}
              <div className="flex justify-between items-center pt-1">
                <span className="notification-timestamp text-xs text-muted-lavender/60 font-body">
                  {notification.relatedData?.username && `@${notification.relatedData.username} • `}
                  {notification.timestamp || 'Just now'}
                </span>
                {!notification.isRead && (
                  <span className="text-xs text-electric-blue font-body font-medium">New</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderLoadMoreButton = () => {
    if (!hasMore) return null;

    return (
      <div className="px-4 sm:px-6 pb-4">
        <Button
          onClick={loadMoreNotifications}
          variant="outline"
          className="w-full border-muted-lavender/30 text-muted-lavender hover:bg-muted-lavender/10 hover:text-pearl-white font-body"
          disabled={isLoadingMore}
        >
          {isLoadingMore ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading more...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Load more notifications
            </>
          )}
        </Button>
      </div>
    );
  };

  const renderEmptyState = (isUnreadTab: boolean) => (
    <div className="text-center py-8 sm:py-12 space-y-3 sm:space-y-4 px-4">
      <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto rounded-full bg-muted-lavender/10 border border-muted-lavender/20 flex items-center justify-center">
        <Bell className="w-6 h-6 sm:w-8 sm:h-8 text-muted-lavender/40" />
      </div>
      <div className="space-y-2">
        <h3 className="font-headline text-pearl-white font-medium text-sm sm:text-base">
          {isUnreadTab ? 'All caught up!' : 'No notifications yet'}
        </h3>
        <p className="text-muted-lavender font-body text-xs sm:text-sm leading-relaxed">
          {isUnreadTab 
            ? 'You\'ve read all your notifications. Keep exploring the realms!'
            : 'Your notification journey begins here. Start connecting with your tribe!'
          }
        </p>
      </div>
    </div>
  );

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="right" 
        className="bg-midnight-black border-muted-lavender/30 soft-blur w-full sm:w-96 p-0 notification-mobile-container max-h-screen"
      >
        <SheetHeader className="flex-shrink-0 p-4 sm:p-6 pb-3 sm:pb-4 border-b border-muted-lavender/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-electric-blue/20 border border-electric-blue/30">
                <Bell className="w-5 h-5 text-electric-blue" />
              </div>
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-pearl-white font-headline text-lg sm:text-xl">
                  Notifications
                </SheetTitle>
                <SheetDescription className="text-muted-lavender font-body text-xs sm:text-sm">
                  Stay connected with your tribe
                </SheetDescription>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {state.unreadCount > 0 && (
                <Button
                  onClick={handleMarkAllAsRead}
                  variant="ghost"
                  size="sm"
                  className="text-electric-blue hover:text-electric-blue hover:bg-electric-blue/10 font-body text-xs px-2 sm:px-3 flex-shrink-0"
                >
                  <CheckCheck className="w-3 h-3 mr-1" />
                  <span className="hidden sm:inline">Mark all read</span>
                  <span className="sm:hidden">Read all</span>
                </Button>
              )}
              
              <Button
                onClick={handleRefresh}
                variant="ghost"
                size="sm"
                className="text-muted-lavender hover:text-pearl-white hover:bg-muted-lavender/10 font-body text-xs p-2"
                disabled={state.isLoading}
                title="Refresh notifications"
              >
                <RefreshCw className={`w-3 h-3 ${state.isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="notification-content-area">
          <Tabs 
            value={state.currentTab} 
            onValueChange={handleTabChange}
            className="notification-mobile-container"
          >
            <TabsList className="flex-shrink-0 grid w-full grid-cols-2 bg-muted-lavender/10 border border-muted-lavender/20 mx-4 sm:mx-6 mt-3 sm:mt-4">
              <TabsTrigger 
                value="unread" 
                className="data-[state=active]:bg-electric-blue/20 data-[state=active]:text-electric-blue font-body"
              >
                <div className="flex items-center space-x-2">
                  <span>Unread</span>
                  {state.unreadCount > 0 && (
                    <Badge className="notification-badge bg-electric-blue text-midnight-black text-xs font-accent min-w-[1.25rem] h-5 flex items-center justify-center p-0">
                      {state.unreadCount > 99 ? '99+' : state.unreadCount}
                    </Badge>
                  )}
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="all"
                className="data-[state=active]:bg-electric-blue/20 data-[state=active]:text-electric-blue font-body"
              >
                All
              </TabsTrigger>
            </TabsList>

            <div className="notification-content-area">
              <TabsContent value="unread" className="notification-scroll-area m-0 data-[state=active]:flex data-[state=active]:flex-col">
                <ScrollArea className="notification-scroll-area">
                  <div className="p-4 sm:p-6 pt-3 sm:pt-4 space-y-2">
                    {state.isLoading ? (
                      <div className="space-y-3 sm:space-y-4">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="animate-pulse">
                            <div className="flex items-start space-x-2 sm:space-x-3">
                              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-muted-lavender/20 rounded-lg flex-shrink-0" />
                              <div className="flex-1 space-y-2 min-w-0">
                                <div className="h-3 sm:h-4 bg-muted-lavender/20 rounded w-3/4" />
                                <div className="h-2.5 sm:h-3 bg-muted-lavender/10 rounded w-full" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        {getFilteredNotifications().length > 0 ? (
                          getFilteredNotifications().map(renderNotificationItem)
                        ) : (
                          renderEmptyState(true)
                        )}
                      </>
                    )}
                  </div>
                  {renderLoadMoreButton()}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="all" className="notification-scroll-area m-0 data-[state=active]:flex data-[state=active]:flex-col">
                <ScrollArea className="notification-scroll-area">
                  <div className="p-4 sm:p-6 pt-3 sm:pt-4 space-y-2">
                    {state.isLoading ? (
                      <div className="space-y-3 sm:space-y-4">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="animate-pulse">
                            <div className="flex items-start space-x-2 sm:space-x-3">
                              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-muted-lavender/20 rounded-lg flex-shrink-0" />
                              <div className="flex-1 space-y-2 min-w-0">
                                <div className="h-3 sm:h-4 bg-muted-lavender/20 rounded w-3/4" />
                                <div className="h-2.5 sm:h-3 bg-muted-lavender/10 rounded w-full" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        {state.notifications.length > 0 ? (
                          state.notifications.map(renderNotificationItem)
                        ) : (
                          renderEmptyState(false)
                        )}
                      </>
                    )}
                  </div>
                  {renderLoadMoreButton()}
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Refresh button at bottom */}
        <div className="flex-shrink-0 p-4 sm:p-6 pt-2 sm:pt-2 border-t border-muted-lavender/20">
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="w-full border-muted-lavender/30 text-muted-lavender hover:bg-muted-lavender/10 hover:text-pearl-white font-body"
            disabled={state.isLoading}
          >
            {state.isLoading ? (
              <>
                <Loader2 className="w-4 h-4 border-2 border-muted-lavender/30 border-t-muted-lavender rounded-full animate-spin mr-2" />
                Loading...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Refresh notifications
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}