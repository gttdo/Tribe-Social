import { Notification, NotificationType } from '../notification-types';
import { formatNotificationTime } from '../notification-helpers';

export interface NotificationFetchOptions {
  limit?: number;
  cursor?: string;
  unreadOnly?: boolean;
}

export interface NotificationFetchResponse {
  items: Notification[];
  nextCursor?: string;
  hasMore: boolean;
}

export const fetchNotifications = async (
  options: NotificationFetchOptions = {}
): Promise<NotificationFetchResponse> => {
  try {
    const { limit = 30, cursor, unreadOnly = false } = options;
    console.log('Fetching notifications with options:', { limit, cursor, unreadOnly });
    
    // Use auth guard to safely fetch notifications
    const { fetchNotificationsSafely } = await import('../auth-guards');
    const notifications = await fetchNotificationsSafely();
    
    if (!notifications) {
      console.warn('Auth guard returned null for notifications fetch');
      return {
        items: [],
        hasMore: false
      };
    }
    
    // Transform backend notifications to frontend format
    const transformedNotifications = notifications.map(transformBackendNotification);
    
    return {
      items: transformedNotifications,
      nextCursor: undefined, // Since we're using the safe wrapper, pagination might be simplified
      hasMore: false
    };
    
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

export const markNotificationsAsRead = async (notificationIds: string[]): Promise<void> => {
  try {
    console.log('Marking notifications as read:', notificationIds);
    
    const { callFn } = await import('../edge');
    const response = await callFn('/notifications/read', {
      method: 'POST',
      body: JSON.stringify({
        ids: notificationIds
      })
    });
    
    console.log('Notifications marked as read successfully:', response.updatedCount);
    
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    throw error;
  }
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  return markNotificationsAsRead([notificationId]);
};

export const markAllNotificationsAsRead = async (): Promise<void> => {
  try {
    console.log('Marking all notifications as read');
    
    const { callFn } = await import('../edge');
    const response = await callFn('/notifications/read-all', {
      method: 'POST'
    });
    
    console.log('All notifications marked as read successfully:', response.updatedCount);
    
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

export const getUnreadNotificationCount = async (): Promise<number> => {
  try {
    // Use simple session check to avoid throwing errors
    const { isAuthenticated } = await import('../simple-session-check');
    
    if (!(await isAuthenticated())) {
      // Silently return 0 for unauthenticated users
      return 0;
    }
    
    const { safeFetch } = await import('../auth-guards');
    const { data, error } = await safeFetch('/notifications/unread-count');
    
    if (error) {
      // Silently return 0 on error
      return 0;
    }
    
    return data?.count || 0;
    
  } catch (error) {
    // Never throw, always return 0
    return 0;
  }
};

export const transformBackendNotification = (backendNotification: any): Notification => {
  // The backend notification should already be in the correct format
  // but we'll add some safety transformations
  
  return {
    id: backendNotification.id,
    userId: backendNotification.userId,
    type: backendNotification.type as NotificationType,
    title: backendNotification.title,
    content: backendNotification.content,
    relatedId: backendNotification.relatedId,
    relatedData: backendNotification.relatedData || {},
    isRead: backendNotification.isRead || false,
    createdAt: backendNotification.createdAt,
    timestamp: backendNotification.timestamp || formatNotificationTime(backendNotification.createdAt)
  };
};

// Function to create a notification in the backend
export const createNotification = async (
  recipientId: string,
  type: NotificationType,
  title: string,
  content: string,
  relatedId?: string,
  relatedData?: any
): Promise<void> => {
  try {
    console.log('Creating notification:', { recipientId, type, title, content, relatedId });
    
    const { callFn } = await import('../edge');
    const response = await callFn('/notifications', {
      method: 'POST',
      body: JSON.stringify({
        user_id: recipientId,
        type,
        title,
        content,
        related_id: relatedId,
        related_data: relatedData || {}
      })
    });
    
    console.log('Notification created successfully');
    
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Helper functions for creating specific notification types
export const createLikeNotification = async (
  postOwnerId: string, 
  likerUsername: string, 
  postId: string,
  postCaption?: string
): Promise<void> => {
  await createNotification(
    postOwnerId,
    'like',
    'Post Liked',
    `@${likerUsername} liked your post`,
    postId,
    {
      username: likerUsername,
      postCaption: postCaption || ''
    }
  );
};

export const createCommentNotification = async (
  postOwnerId: string,
  commenterUsername: string,
  postId: string,
  commentContent: string,
  postCaption?: string
): Promise<void> => {
  await createNotification(
    postOwnerId,
    'comment',
    'New Comment',
    `@${commenterUsername} commented: "${commentContent.substring(0, 50)}${commentContent.length > 50 ? '...' : ''}"`,
    postId,
    {
      username: commenterUsername,
      postCaption: postCaption || '',
      commentContent
    }
  );
};

export const createFollowNotification = async (
  followedUserId: string,
  followerUsername: string,
  followerId: string
): Promise<void> => {
  await createNotification(
    followedUserId,
    'follow',
    'New Follower',
    `@${followerUsername} started following you`,
    followerId,
    {
      username: followerUsername
    }
  );
};

export const createAchievementNotification = async (
  userId: string,
  achievementName: string,
  achievementDescription: string,
  achievementId: string
): Promise<void> => {
  await createNotification(
    userId,
    'achievement',
    'Achievement Unlocked!',
    `You unlocked "${achievementName}" - ${achievementDescription}`,
    achievementId,
    {
      achievementName,
      achievementDescription
    }
  );
};

export const createSystemNotification = async (
  userId: string,
  title: string,
  message: string
): Promise<void> => {
  await createNotification(
    userId,
    'system',
    title,
    message
  );
};

export const createAnnouncementNotification = async (
  userId: string,
  title: string,
  message: string
): Promise<void> => {
  await createNotification(
    userId,
    'announcement',
    title,
    message
  );
};