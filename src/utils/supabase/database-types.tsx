export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profile: {
        Row: {
          id: string
          username: string
          display_name: string | null
          bio: string | null
          avatar_url: string | null
          xp: number
          level: number
          follower_count: number
          following_count: number
          post_count: number
          is_private: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          display_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          xp?: number
          level?: number
          follower_count?: number
          following_count?: number
          post_count?: number
          is_private?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          display_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          xp?: number
          level?: number
          follower_count?: number
          following_count?: number
          post_count?: number
          is_private?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      tribes: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string
          slug: string
          description: string | null
          creator_id: string
          is_public: boolean
          category: string | null
          icon_url: string | null
          banner_url: string | null
          member_count: number
          post_count: number
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          name: string
          slug: string
          description?: string | null
          creator_id: string
          is_public?: boolean
          category?: string | null
          icon_url?: string | null
          banner_url?: string | null
          member_count?: number
          post_count?: number
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          name?: string
          slug?: string
          description?: string | null
          creator_id?: string
          is_public?: boolean
          category?: string | null
          icon_url?: string | null
          banner_url?: string | null
          member_count?: number
          post_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "tribes_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          }
        ]
      }
      tribe_members: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          tribe_id: string
          user_id: string
          role: 'member' | 'moderator' | 'admin' | 'owner'
          joined_at: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          tribe_id: string
          user_id: string
          role?: 'member' | 'moderator' | 'admin' | 'owner'
          joined_at?: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          tribe_id?: string
          user_id?: string
          role?: 'member' | 'moderator' | 'admin' | 'owner'
          joined_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tribe_members_tribe_id_fkey"
            columns: ["tribe_id"]
            isOneToOne: false
            referencedRelation: "tribes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tribe_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          }
        ]
      }
      follow: {
        Row: {
          follower_id: string
          followed_id: string
          created_at: string
        }
        Insert: {
          follower_id: string
          followed_id: string
          created_at?: string
        }
        Update: {
          follower_id?: string
          followed_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_followed_id_fkey"
            columns: ["followed_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          }
        ]
      }
      posts: {
        Row: {
          id: string
          created_at: string
          user_id: string
          tribe_id: string | null
          post_type: 'thought' | 'image' | 'video' | 'audio'
          text_body: string | null
          caption: string | null
          media_url: string | null
          media_thumb_url: string | null
          visibility: string
          like_count: number
          comment_count: number
          share_count: number
          thumbnail_url: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          tribe_id?: string | null
          post_type: 'thought' | 'image' | 'video' | 'audio'
          text_body?: string | null
          caption?: string | null
          media_url?: string | null
          media_thumb_url?: string | null
          visibility?: string
          like_count?: number
          comment_count?: number
          share_count?: number
          thumbnail_url?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          tribe_id?: string | null
          post_type?: 'thought' | 'image' | 'video' | 'audio'
          text_body?: string | null
          caption?: string | null
          media_url?: string | null
          media_thumb_url?: string | null
          visibility?: string
          like_count?: number
          comment_count?: number
          share_count?: number
          thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_tribe_id_fkey"
            columns: ["tribe_id"]
            isOneToOne: false
            referencedRelation: "tribes"
            referencedColumns: ["id"]
          }
        ]
      }
      post_reactions: {
        Row: {
          id: string
          created_at: string
          post_id: string
          user_id: string
          reaction: string
        }
        Insert: {
          id?: string
          created_at?: string
          post_id: string
          user_id: string
          reaction: string
        }
        Update: {
          id?: string
          created_at?: string
          post_id?: string
          user_id?: string
          reaction?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          }
        ]
      }
      post_comments: {
        Row: {
          id: string
          created_at: string
          post_id: string
          user_id: string
          body: string
        }
        Insert: {
          id?: string
          created_at?: string
          post_id: string
          user_id: string
          body: string
        }
        Update: {
          id?: string
          created_at?: string
          post_id?: string
          user_id?: string
          body?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          }
        ]
      }
      post_bookmarks: {
        Row: {
          id: string
          created_at: string
          user_id: string
          post_id: string
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          post_id: string
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_bookmarks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          }
        ]
      }
      notification: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          body: string | null
          actor_id: string | null
          target_type: string | null
          target_id: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title?: string
          body?: string | null
          actor_id?: string | null
          target_type?: string | null
          target_id?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          body?: string | null
          actor_id?: string | null
          target_type?: string | null
          target_id?: string | null
          is_read?: boolean
          created_at?: string
        }
        Relationships: []
      }
      points_ledger: {
        Row: {
          id: string
          user_id: string
          action: string
          points: number
          reference_type: string | null
          reference_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          points: number
          reference_type?: string | null
          reference_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          points?: number
          reference_type?: string | null
          reference_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      report: {
        Row: {
          id: string
          reporter_id: string
          target_type: string
          target_id: string
          reason: string
          status: string
          reviewed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          reporter_id: string
          target_type: string
          target_id: string
          reason: string
          status?: string
          reviewed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          reporter_id?: string
          target_type?: string
          target_id?: string
          reason?: string
          status?: string
          reviewed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      user_block: {
        Row: {
          blocker_id: string
          blocked_id: string
          created_at: string
        }
        Insert: {
          blocker_id: string
          blocked_id: string
          created_at?: string
        }
        Update: {
          blocker_id?: string
          blocked_id?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_tribe_member: {
        Args: { p_tribe_id: string }
        Returns: boolean
      }
      has_tribe_role: {
        Args: { p_tribe_id: string; p_roles: string[] }
        Returns: boolean
      }
    }
    Enums: {
      post_type_enum: 'thought' | 'image' | 'video' | 'audio'
      visibility_enum: 'public' | 'tribe'
      tribe_role_enum: 'owner' | 'admin' | 'moderator' | 'member'
      report_status_enum: 'pending' | 'reviewed' | 'actioned' | 'dismissed'
      report_target_enum: 'post' | 'comment' | 'user' | 'tribe'
      point_action_enum: 'post_created' | 'comment_added' | 'reaction_received' | 'follow_received' | 'tribe_joined' | 'achievement_unlocked' | 'daily_login'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ============================================================
// Helper type utilities (from Supabase)
// ============================================================

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never

// ============================================================
// Convenience type aliases
// ============================================================

export type Profile = Tables<'profile'>
export type Tribe = Tables<'tribes'>
export type TribeMember = Tables<'tribe_members'>
export type Follow = Tables<'follow'>
export type Post = Tables<'posts'>
export type PostReaction = Tables<'post_reactions'>
export type PostComment = Tables<'post_comments'>
export type PostBookmark = Tables<'post_bookmarks'>
export type Notification = Tables<'notification'>
export type PointsLedger = Tables<'points_ledger'>
export type Report = Tables<'report'>
export type UserBlock = Tables<'user_block'>

// Extended types with computed fields
export type PostWithDetails = Post & {
  user: {
    id: string
    username: string | null
    display_name: string | null
    avatar_url: string | null
  }
  tribe?: {
    id: string
    name: string
    is_public: boolean
  }
  is_owned_by_user?: boolean
}

export type ProfileWithFollowStatus = Profile & {
  isFollowing?: boolean
  isFollowedBy?: boolean
}

export type TribeWithDetails = Tribe & {
  creator: {
    id: string
    username: string | null
    display_name: string | null
  }
  user_membership?: TribeMember | null
  is_member?: boolean
}

// ============================================================
// Enums and constants
// ============================================================

export type Visibility = 'public' | 'tribe'
export type PostType = 'thought' | 'image' | 'video' | 'audio'
export type TribeRole = 'member' | 'moderator' | 'admin' | 'owner'

export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB for video/audio
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB for images
export const MAX_AVATAR_SIZE = 5 * 1024 * 1024 // 5MB for avatars
export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
export const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']
export const SUPPORTED_AUDIO_TYPES = ['audio/mp3', 'audio/wav', 'audio/m4a', 'audio/ogg']
export const TEXT_CONTENT_LIMIT = 500 // characters
export const BIO_LIMIT = 280 // characters
export const USERNAME_MIN = 3
export const USERNAME_MAX = 24
