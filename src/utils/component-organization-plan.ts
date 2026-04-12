/**
 * Tribe Board Component Organization Plan
 * 
 * Suggested directory structure for better maintainability:
 * 
 * /components/
 *   /auth/           - SignupFlow, LoginFlow, etc.
 *   /social/         - SocialFeed, PostCard, CommentRow, etc.
 *   /profile/        - ProfilePage, AvatarUploader, etc.
 *   /media/          - AudioRecorder, VideoPlayer, ImageCropper, etc.
 *   /tribes/         - TribeCard, TribeManager, etc.
 *   /navigation/     - MobileBottomNav, HamburgerMenu, etc.
 *   /notifications/  - NotificationCenter, NotificationBadge, etc.
 *   /creation/       - CreatePostPage, PostTypeCard, MediaOptions, etc.
 *   /debug/          - All debug/test components
 *   /ui/             - Shadcn components (keep as is)
 *   /common/         - Shared components like LoadingScreen, ErrorState, etc.
 */

export const COMPONENT_CATEGORIES = {
  auth: [
    'SignupFlow',
    'LoginFlow', 
    'LoginDebug',
    'LoginTroubleshooting'
  ],
  social: [
    'SocialFeed',
    'PostCard',
    'CommentRow',
    'CommentsSystem',
    'MobileCommentsDrawer',
    'DesktopCommentsModal',
    'QuickReactions',
    'PostDetailsDrawer',
    'PostDetailsModal',
    'PostDetailDesktop'
  ],
  profile: [
    'ProfilePage',
    'UserProfilePage', 
    'AvatarUploader',
    'AvatarCropper',
    'ProfileSetupFlow',
    'BioEditor',
    'ProfilePostsList',
    'GuardedProfilePostsList'
  ],
  media: [
    'AudioRecorder',
    'VideoPlayer',
    'WaveformAudioPlayer',
    'MediaCapture',
    'ImageCropper',
    'MediaPostCard',
    'AudioPostCard',
    'VideoCard'
  ],
  navigation: [
    'MobileBottomNav',
    'HamburgerMenu',
    'Navigation',
    'TopNavigationBar',
    'URLRouter'
  ],
  // ... etc
} as const;

/**
 * Migration Priority:
 * 1. HIGH: Move debug/test components first (low risk)
 * 2. MEDIUM: Organize by feature areas (auth, social, etc.)
 * 3. LOW: Refactor imports across the codebase
 */