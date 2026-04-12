// Database types and interfaces
export type CoreRealmDB = 'Mirrorcore' | 'Embercore' | 'Shadowcore';
export type SubRealmDB = 'Dreamcore' | 'Sadcore' | 'NeonKnight' | 'Cosycore' | 'Vaporwave' | 'Weirdcore' | 'Etherealcore' | 'Glitchcore' | 'Clowncore' | 'Bookcore' | 'Occultcore' | 'Royalcore';

export interface DatabaseUser {
  id: string;
  username: string | null;
  email: string | null;
  phone: string | null;
  password_hash: string | null;
  core_realm: CoreRealmDB | null;
  sub_realm: SubRealmDB | null;
  profile_image_url: string | null;
  description: string | null;
  profile_privacy: 'public' | 'private' | null;
  xp: number; // Updated to match actual database schema
  level: number;
  // Removed post_count, like_count, comment_count as they don't exist in the actual schema
  achievement_ids: string[] | null;
  follower_count: number | null;
  following_count: number | null;
  created_at: string;
  updated_at: string;
  // Keep legacy support for transition
  xp_points?: number;
  post_count?: number;
  like_count?: number;
  comment_count?: number;
}