import { CoreRealm } from '../App';

export type NotificationType = 
  | 'like' 
  | 'comment' 
  | 'follow' 
  | 'realm_activity' 
  | 'achievement' 
  | 'message' 
  | 'system'
  | 'announcement'
  | 'tribe_access_request'
  | 'tribe_access_approved'
  | 'tribe_access_denied';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  relatedId?: string; // post_id, user_id, or achievement_id
  relatedData?: {
    username?: string;
    postCaption?: string;
    achievementName?: string;
    realmName?: CoreRealm;
    // Tribe access request related data
    tribe_id?: string;
    tribe_name?: string;
    requester_id?: string;
    requester_name?: string;
    request_id?: string;
    [key: string]: any;
  };
  isRead: boolean;
  createdAt: string;
  timestamp: string; // Formatted timestamp like "2m ago"
}

export interface NotificationGroup {
  type: NotificationType;
  title: string;
  notifications: Notification[];
  unreadCount: number;
}

export type NotificationTab = 'unread' | 'all';

export interface NotificationCenterState {
  notifications: Notification[];
  unreadCount: number;
  currentTab: NotificationTab;
  isLoading: boolean;
  lastFetched?: Date;
}