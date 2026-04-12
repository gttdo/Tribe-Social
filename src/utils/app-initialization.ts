import { UserInfo, UserResult, STORAGE_KEYS, createFallbackUserInfo, createFallbackUserResult, createEmergencyUserInfo, createEmergencyUserResult } from './app-constants';
import { loadFromStorage } from './app-helpers';

export interface InitializationResult {
  userInfo: UserInfo;
  userResult: UserResult;
  currentView: string;
  error?: string;
}

export const initializeApp = async (): Promise<InitializationResult> => {
  try {
    console.log('=== STARTING STREAMLINED APP INITIALIZATION ===');
    
    // Skip deployment check for faster initialization - it can run in background
    if (process.env.NODE_ENV === 'development') {
      // Run deployment check in background without waiting
      import('./deployment-helper').then(({ quickSetupCheck }) => {
        quickSetupCheck().catch(() => {
          console.log('📝 Development mode: some features may be limited until edge functions are deployed');
        });
      }).catch(() => {
        // Ignore import errors
      });
    }

    // Create default fallback data first
    const defaultUserInfo = createFallbackUserInfo();
    const defaultUserResult = createFallbackUserResult();

    // Check if we have any saved user data for offline mode
    const savedUserInfo = loadFromStorage(STORAGE_KEYS.USER_INFO);
    const savedUserResult = loadFromStorage(STORAGE_KEYS.USER_RESULT);
    const savedCurrentView = loadFromStorage(STORAGE_KEYS.CURRENT_VIEW);

    console.log('Loaded from storage:', { 
      hasSavedUserInfo: !!savedUserInfo, 
      hasSavedUserResult: !!savedUserResult, 
      savedCurrentView
    });

    // Quick session check with timeout protection
    let hasValidSession = false;
    try {
      const { supabase } = await import('./supabase/client');
      
      // Add aggressive timeout to session check to prevent hanging
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Session check timeout')), 1000)
      );
      
      const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]);
      
      if (!error && session?.access_token && session?.user) {
        console.log('✓ Valid session found');
        hasValidSession = true;
      } else {
        console.log('✗ No valid session found');
      }
    } catch (authError) {
      console.warn('Authentication check failed (possibly timeout):', authError);
      hasValidSession = false;
    }

    // Determine initial view and user data
    let currentView: string;
    let finalUserInfo: UserInfo;
    let finalUserResult: UserResult;

    if (hasValidSession && (savedUserInfo || savedUserResult)) {
      // Authenticated user with saved data
      finalUserInfo = { ...defaultUserInfo, ...savedUserInfo };
      finalUserResult = { ...defaultUserResult, ...savedUserResult };
      currentView = savedCurrentView || 'social';
      console.log('Authenticated user - going to:', currentView);
    } else if (savedUserInfo && savedUserResult) {
      // Offline mode with saved data
      finalUserInfo = savedUserInfo;
      finalUserResult = savedUserResult;
      currentView = 'social';
      console.log('Using offline mode');
    } else {
      // New user or no saved data - show landing page
      finalUserInfo = defaultUserInfo;
      finalUserResult = defaultUserResult;
      currentView = 'landing';
      console.log('New user - showing landing page');
    }

    console.log('=== APP INITIALIZATION COMPLETED SUCCESSFULLY ===');
    
    return {
      userInfo: finalUserInfo,
      userResult: finalUserResult,
      currentView
    };

  } catch (error) {
    console.error('=== CRITICAL INITIALIZATION ERROR ===');
    console.error('Error details:', error);
    
    // Fallback to landing page on any error
    return {
      userInfo: createFallbackUserInfo(),
      userResult: createFallbackUserResult(),
      currentView: 'landing',
      error: 'Initialization error - using fallback mode'
    };
  }
};