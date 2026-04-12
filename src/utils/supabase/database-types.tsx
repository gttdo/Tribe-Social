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
      users: {
        Row: {
          id: string
          created_at: string
          email: string | null
          phone: string | null
          username: string | null
          core_realm: 'MIRRORCORE' | 'EMBERCORE' | 'SHADOWCORE' | null
          sub_realm: string | null
          xp: number | null
          level: number | null
          achievement_ids: string[] | null  // Changed from achievements to achievement_ids
          description: string | null
          follower_count: number | null
          following_count: number | null
          profile_privacy: 'public' | 'private' | null
          profile_image_url: string | null  // Added profile_image_url column
        }
        Insert: {
          id: string
          created_at?: string
          email?: string | null
          phone?: string | null
          username?: string | null
          core_realm?: 'MIRRORCORE' | 'EMBERCORE' | 'SHADOWCORE' | null
          sub_realm?: string | null
          xp?: number | null
          level?: number | null
          achievement_ids?: string[] | null  // Changed from achievements to achievement_ids
          description?: string | null
          follower_count?: number | null
          following_count?: number | null
          profile_privacy?: 'public' | 'private' | null
          profile_image_url?: string | null  // Added profile_image_url column
        }
        Update: {
          id?: string
          created_at?: string
          email?: string | null
          phone?: string | null
          username?: string | null
          core_realm?: 'MIRRORCORE' | 'EMBERCORE' | 'SHADOWCORE' | null
          sub_realm?: string | null
          xp?: number | null
          level?: number | null
          achievement_ids?: string[] | null  // Changed from achievements to achievement_ids
          description?: string | null
          follower_count?: number | null
          following_count?: number | null
          profile_privacy?: 'public' | 'private' | null
          profile_image_url?: string | null  // Added profile_image_url column
        }
        Relationships: []
      }
      tribes: {
        Row: {
          id: string
          created_at: string
          name: string
          description: string | null
          owner_id: string
          is_private: boolean
          post_count: number
          member_count: number
          category: string | null
          tags: string[] | null
          rules: string[] | null
          banner_url: string | null
          avatar_url: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          description?: string | null
          owner_id: string
          is_private?: boolean
          post_count?: number
          member_count?: number
          category?: string | null
          tags?: string[] | null
          rules?: string[] | null
          banner_url?: string | null
          avatar_url?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          description?: string | null
          owner_id?: string
          is_private?: boolean
          post_count?: number
          member_count?: number
          category?: string | null
          tags?: string[] | null
          rules?: string[] | null
          banner_url?: string | null
          avatar_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tribes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      tribe_members: {
        Row: {
          id: string
          created_at: string
          tribe_id: string
          user_id: string
          role: 'member' | 'moderator' | 'admin' | 'owner'
          joined_at: string
        }
        Insert: {
          id?: string
          created_at?: string
          tribe_id: string
          user_id: string
          role?: 'member' | 'moderator' | 'admin' | 'owner'
          joined_at?: string
        }
        Update: {
          id?: string
          created_at?: string
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
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_relationships: {
        Row: {
          id: string
          follower_id: string
          followed_id: string
          created_at: string
        }
        Insert: {
          id?: string
          follower_id: string
          followed_id: string
          created_at?: string
        }
        Update: {
          id?: string
          follower_id?: string
          followed_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_relationships_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_relationships_followed_id_fkey"
            columns: ["followed_id"]
            isOneToOne: false
            referencedRelation: "users"
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
          visibility: 'public' | 'tribe' | 'private'
          like_count: number
          comment_count: number
          share_count: number
          reaction_count: number
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
          visibility?: 'public' | 'tribe' | 'private'
          like_count?: number
          comment_count?: number
          share_count?: number
          reaction_count?: number
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
          visibility?: 'public' | 'tribe' | 'private'
          like_count?: number
          comment_count?: number
          share_count?: number
          reaction_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
          reaction_type: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry'
        }
        Insert: {
          id?: string
          created_at?: string
          post_id: string
          user_id: string
          reaction_type: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry'
        }
        Update: {
          id?: string
          created_at?: string
          post_id?: string
          user_id?: string
          reaction_type?: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry'
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
            referencedRelation: "users"
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
          parent_comment_id: string | null
          content: string
          like_count: number
          reply_count: number
        }
        Insert: {
          id?: string
          created_at?: string
          post_id: string
          user_id: string
          parent_comment_id?: string | null
          content: string
          like_count?: number
          reply_count?: number
        }
        Update: {
          id?: string
          created_at?: string
          post_id?: string
          user_id?: string
          parent_comment_id?: string | null
          content?: string
          like_count?: number
          reply_count?: number
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
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          }
        ]
      }
      comment_reactions: {
        Row: {
          id: string
          created_at: string
          comment_id: string
          user_id: string
          reaction_type: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry'
        }
        Insert: {
          id?: string
          created_at?: string
          comment_id: string
          user_id: string
          reaction_type: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry'
        }
        Update: {
          id?: string
          created_at?: string
          comment_id?: string
          user_id?: string
          reaction_type?: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry'
        }
        Relationships: [
          {
            foreignKeyName: "comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      stories: {
        Row: {
          id: string
          created_at: string
          user_id: string
          tribe_id: string | null
          type: 'image' | 'video' | 'text'
          content: string | null
          media_url: string | null
          visibility: 'public' | 'tribe' | 'private'
          expires_at: string
          view_count: number
          reaction_count: number
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          tribe_id?: string | null
          type: 'image' | 'video' | 'text'
          content?: string | null
          media_url?: string | null
          visibility?: 'public' | 'tribe' | 'private'
          expires_at: string
          view_count?: number
          reaction_count?: number
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          tribe_id?: string | null
          type?: 'image' | 'video' | 'text'
          content?: string | null
          media_url?: string | null
          visibility?: 'public' | 'tribe' | 'private'
          expires_at?: string
          view_count?: number
          reaction_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "stories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_tribe_id_fkey"
            columns: ["tribe_id"]
            isOneToOne: false
            referencedRelation: "tribes"
            referencedColumns: ["id"]
          }
        ]
      }
      story_views: {
        Row: {
          id: string
          created_at: string
          story_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          created_at?: string
          story_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          created_at?: string
          story_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      story_reactions: {
        Row: {
          id: string
          created_at: string
          story_id: string
          user_id: string
          reaction_type: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry'
        }
        Insert: {
          id?: string
          created_at?: string
          story_id: string
          user_id: string
          reaction_type: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry'
        }
        Update: {
          id?: string
          created_at?: string
          story_id?: string
          user_id?: string
          reaction_type?: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry'
        }
        Relationships: [
          {
            foreignKeyName: "story_reactions_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
            referencedRelation: "users"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

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

// Helper types for the follow system
export type UserRelationship = Tables<'user_relationships'>
export type UserWithCounts = Tables<'users'> & {
  follower_count: number
  following_count: number
}

// Public profile type for user information
export type PublicProfile = {
  id: string;
  username: string | null;
  profile_image_url: string | null;
  description: string | null;
  created_at: string;
}

// Extended user type for profiles with follow status
export type UserProfile = UserWithCounts & {
  isFollowing?: boolean
  isFollowedBy?: boolean
}

// New helper types for the updated schema
export type Tribe = Tables<'tribes'>
export type TribeMember = Tables<'tribe_members'>
export type Post = Tables<'posts'>
export type PostReaction = Tables<'post_reactions'>
export type PostComment = Tables<'post_comments'>
export type CommentReaction = Tables<'comment_reactions'>
export type Story = Tables<'stories'>
export type StoryView = Tables<'story_views'>
export type StoryReaction = Tables<'story_reactions'>
export type PostBookmark = Tables<'post_bookmarks'>

// Extended types with additional computed fields
export type PostWithDetails = Post & {
  user: {
    id: string
    username: string | null
    nickname: string | null
    core_realm: 'MIRRORCORE' | 'EMBERCORE' | 'SHADOWCORE' | null
  }
  tribe?: {
    id: string
    name: string
    is_private: boolean
  }
  user_reaction?: PostReaction | null
  is_owned_by_user?: boolean
  can_edit?: boolean
  can_delete?: boolean
}

export type CommentWithDetails = PostComment & {
  user: {
    id: string
    username: string | null
    nickname: string | null
    core_realm: 'MIRRORCORE' | 'EMBERCORE' | 'SHADOWCORE' | null
  }
  user_reaction?: CommentReaction | null
  replies?: CommentWithDetails[]
  is_owned_by_user?: boolean
  can_edit?: boolean
  can_delete?: boolean
}

export type TribeWithDetails = Tribe & {
  owner: {
    id: string
    username: string | null
    nickname: string | null
  }
  user_membership?: TribeMember | null
  is_member?: boolean
  can_post?: boolean
  can_moderate?: boolean
}

export type StoryWithDetails = Story & {
  user: {
    id: string
    username: string | null
    nickname: string | null
    core_realm: 'MIRRORCORE' | 'EMBERCORE' | 'SHADOWCORE' | null
  }
  tribe?: {
    id: string
    name: string
    is_private: boolean
  }
  user_viewed?: boolean
  user_reaction?: StoryReaction | null
  is_owned_by_user?: boolean
  can_view?: boolean
}

// Media dimension types
export interface MediaDimensions {
  width: number
  height: number
  aspectRatio?: string
  orientation?: 'portrait' | 'landscape' | 'square'
}

// Visibility and access control types
export type Visibility = 'public' | 'tribe' | 'private'
export type ReactionType = 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry'
export type TribeRole = 'member' | 'moderator' | 'admin' | 'owner'
export type PostType = 'thought' | 'image' | 'video' | 'audio'
export type StoryType = 'image' | 'video' | 'text'

// File size and validation constants
export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB in bytes
export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
export const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']
export const SUPPORTED_AUDIO_TYPES = ['audio/mp3', 'audio/wav', 'audio/m4a', 'audio/ogg']
export const TEXT_CONTENT_LIMIT = 250 // characters

// Access control helper functions (RLS-aware)
export interface AccessControlContext {
  currentUserId?: string
  userTribeRoles?: Record<string, TribeRole>
  isAuthenticated: boolean
}

export function canViewPost(post: PostWithDetails, context: AccessControlContext): boolean {
  // Public posts are always viewable
  if (post.visibility === 'public') return true
  
  // Private posts only viewable by owner
  if (post.visibility === 'private') {
    return context.currentUserId === post.user_id
  }
  
  // Tribe posts viewable by tribe members (if tribe exists and is joined)
  if (post.visibility === 'tribe' && post.tribe_id) {
    return context.userTribeRoles?.[post.tribe_id] !== undefined
  }
  
  return false
}

export function canEditPost(post: PostWithDetails, context: AccessControlContext): boolean {
  return context.currentUserId === post.user_id
}

export function canDeletePost(post: PostWithDetails, context: AccessControlContext): boolean {
  // Post owner can always delete
  if (context.currentUserId === post.user_id) return true
  
  // Tribe moderators/admins/owners can delete posts in their tribe
  if (post.tribe_id && context.userTribeRoles?.[post.tribe_id]) {
    const role = context.userTribeRoles[post.tribe_id]
    return ['moderator', 'admin', 'owner'].includes(role)
  }
  
  return false
}

export function canReactToContent(context: AccessControlContext): boolean {
  return context.isAuthenticated
}

export function canCommentOnPost(post: PostWithDetails, context: AccessControlContext): boolean {
  // Must be able to view the post and be authenticated
  return canViewPost(post, context) && context.isAuthenticated
}