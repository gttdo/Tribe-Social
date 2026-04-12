import { Notification, NotificationType, NotificationGroup } from './notification-types';
import { CoreRealm } from '../App';

export const getNotificationIcon = (type: NotificationType): string => {
  const icons = {
    like: '❤️',
    comment: '💬',
    follow: '👥',
    realm_activity: '🌟',
    achievement: '🏆',
    message: '💌',
    system: '⚙️',
    announcement: '📢'
  };
  return icons[type];
};

export const getNotificationColor = (type: NotificationType): string => {
  const colors = {
    like: 'glitch-red',
    comment: 'electric-blue',
    follow: 'neon-lilac',
    realm_activity: 'soft-blush',
    achievement: 'electric-blue',
    message: 'neon-lilac',
    system: 'muted-lavender',
    announcement: 'electric-blue',
    tribe_access_request: 'neon-lilac',
    tribe_access_approved: 'electric-blue',
    tribe_access_denied: 'glitch-red'
  };
  return colors[type] || 'muted-lavender';
};

export const getNotificationGroupTitle = (type: NotificationType): string => {
  const titles = {
    like: 'Likes & Reactions',
    comment: 'Comments',
    follow: 'New Followers',
    realm_activity: 'Realm Activity',
    achievement: 'Achievements',
    message: 'Messages',
    system: 'System',
    announcement: 'Announcements'
  };
  return titles[type];
};

export const formatNotificationTime = (timestamp: string): string => {
  const now = new Date();
  const notificationDate = new Date(timestamp);
  const diffMs = now.getTime() - notificationDate.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  
  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return notificationDate.toLocaleDateString();
};

export const groupNotificationsByType = (notifications: Notification[]): NotificationGroup[] => {
  const grouped = notifications.reduce((acc, notification) => {
    const type = notification.type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(notification);
    return acc;
  }, {} as Record<NotificationType, Notification[]>);

  return Object.entries(grouped).map(([type, notifications]) => ({
    type: type as NotificationType,
    title: getNotificationGroupTitle(type as NotificationType),
    notifications: notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    unreadCount: notifications.filter(n => !n.isRead).length
  })).sort((a, b) => {
    // Sort by priority: unread count first, then by most recent notification
    if (a.unreadCount !== b.unreadCount) {
      return b.unreadCount - a.unreadCount;
    }
    const aLatest = Math.max(...a.notifications.map(n => new Date(n.createdAt).getTime()));
    const bLatest = Math.max(...b.notifications.map(n => new Date(n.createdAt).getTime()));
    return bLatest - aLatest;
  });
};

export const createMockNotifications = (): Notification[] => [
  {
    id: '1',
    userId: 'current-user',
    type: 'like',
    title: 'Post Liked',
    content: '@lunar_echoes liked your thought about digital reflections',
    relatedId: 'post_1',
    relatedData: {
      username: 'lunar_echoes',
      postCaption: 'Found this ethereal reflection in the city lights tonight ✨'
    },
    isRead: false,
    createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    timestamp: '2m ago'
  },
  {
    id: '2',
    userId: 'current-user',
    type: 'comment',
    title: 'New Comment',
    content: '@void_aesthetic commented: "This resonates deeply with my shadow realm journey"',
    relatedId: 'post_2',
    relatedData: {
      username: 'void_aesthetic',
      postCaption: 'Dancing with shadows in the space between realities'
    },
    isRead: false,
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    timestamp: '15m ago'
  },
  {
    id: '3',
    userId: 'current-user',
    type: 'follow',
    title: 'New Follower',
    content: '@digital_phoenix started following you',
    relatedId: 'user_digital_phoenix',
    relatedData: {
      username: 'digital_phoenix'
    },
    isRead: false,
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    timestamp: '30m ago'
  },
  {
    id: '4',
    userId: 'current-user',
    type: 'achievement',
    title: 'Achievement Unlocked!',
    content: 'You unlocked "Reflection Master" - Complete 10 Mirrorcore posts',
    relatedId: 'achievement_reflection_master',
    relatedData: {
      achievementName: 'Reflection Master'
    },
    isRead: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    timestamp: '2h ago'
  },
  {
    id: '5',
    userId: 'current-user',
    type: 'realm_activity',
    title: 'Realm Activity',
    content: 'New trending post in Mirrorcore realm by @prism_drift',
    relatedId: 'post_trending',
    relatedData: {
      username: 'prism_drift',
      realmName: 'mirrorcore'
    },
    isRead: true,
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    timestamp: '4h ago'
  },
  {
    id: '6',
    userId: 'current-user',
    type: 'system',
    title: 'Welcome to Tribe Board!',
    content: 'Your digital identity journey begins now. Explore the realms and connect with your tribe.',
    relatedId: null,
    relatedData: {},
    isRead: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    timestamp: '1d ago'
  }
];

export const handleNotificationAction = (notification: Notification) => {
  const { type, relatedId, relatedData } = notification;
  
  // Return action instructions for the parent component to handle
  switch (type) {
    case 'like':
    case 'comment':
      return { action: 'navigate', target: 'post', id: relatedId };
    case 'follow':
      return { action: 'navigate', target: 'profile', username: relatedData?.username };
    case 'achievement':
      return { action: 'navigate', target: 'achievements', id: relatedId };
    case 'realm_activity':
      return { action: 'navigate', target: 'realm', realm: relatedData?.realmName };
    case 'message':
      return { action: 'navigate', target: 'messages', id: relatedId };
    case 'system':
    case 'announcement':
      return { action: 'dismiss' };
    default:
      return { action: 'dismiss' };
  }
};