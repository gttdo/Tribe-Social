/**
 * Tribe Access Request Helpers
 * 
 * Functions for handling requests to join private tribes,
 * including sending notifications to tribe admins.
 */

export interface TribeAccessRequest {
  id: string;
  user_id: string;
  tribe_id: string;
  message?: string;
  status: 'pending' | 'approved' | 'denied';
  created_at: string;
  updated_at: string;
  // Populated fields
  user?: {
    id: string;
    username?: string;
    nickname?: string;
    avatar_url?: string;
  };
  tribe?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
}

export interface CreateAccessRequestParams {
  tribe_id: string;
  message?: string;
}

export interface AccessRequestResponse {
  success: boolean;
  message: string;
  request?: TribeAccessRequest;
}

/**
 * Request access to a private tribe
 */
export async function requestTribeAccess(params: CreateAccessRequestParams): Promise<AccessRequestResponse> {
  try {
    const { supabase, getCurrentSession } = await import('./supabase/client');
    const session = await getCurrentSession();
    
    if (!session?.user?.id) {
      return {
        success: false,
        message: 'You must be logged in to request tribe access'
      };
    }

    // Check if user already has a pending request for this tribe
    const { data: existingRequest, error: checkError } = await supabase
      .from('tribe_access_requests')
      .select('id, status')
      .eq('user_id', session.user.id)
      .eq('tribe_id', params.tribe_id)
      .eq('status', 'pending')
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // If it's not a "no rows found" error, it's a real error
      console.error('Error checking existing requests:', checkError);
      
      // Check if this is a table not found error
      if (checkError.code === 'PGRST205' || 
          checkError.message?.includes('Could not find the table') ||
          checkError.message?.includes('does not exist')) {
        return {
          success: false,
          message: 'Tribe access requests are not available yet. Please try again later.'
        };
      }
      
      return {
        success: false,
        message: 'Failed to check existing requests. Please try again.'
      };
    }

    if (existingRequest) {
      return {
        success: false,
        message: 'You already have a pending request for this tribe'
      };
    }

    // Create the access request
    const { data: request, error: createError } = await supabase
      .from('tribe_access_requests')
      .insert({
        user_id: session.user.id,
        tribe_id: params.tribe_id,
        message: params.message || '',
        status: 'pending'
      })
      .select(`
        id,
        user_id,
        tribe_id,
        message,
        status,
        created_at,
        updated_at
      `)
      .single();

    if (createError) {
      console.error('Error creating access request:', createError);
      return {
        success: false,
        message: 'Failed to submit access request. Please try again.'
      };
    }

    // Send notifications to tribe admins
    try {
      await notifyTribeAdmins(params.tribe_id, session.user.id, request.id);
    } catch (notificationError) {
      console.warn('Failed to notify tribe admins:', notificationError);
      // Don't fail the request if notifications fail
    }

    return {
      success: true,
      message: 'Access request sent! Tribe admins will be notified.',
      request
    };

  } catch (error) {
    console.error('Error requesting tribe access:', error);
    return {
      success: false,
      message: 'An unexpected error occurred. Please try again.'
    };
  }
}

/**
 * Send notifications to tribe admins about access request
 */
async function notifyTribeAdmins(tribeId: string, requesterId: string, requestId: string): Promise<void> {
  try {
    const { supabase } = await import('./supabase/client');

    // Get tribe admins (owners and admins)
    const { data: admins, error: adminsError } = await supabase
      .from('tribe_members')
      .select('user_id')
      .eq('tribe_id', tribeId)
      .in('role', ['owner', 'admin']);

    if (adminsError) {
      console.error('Error fetching tribe admins:', adminsError);
      return;
    }

    if (!admins || admins.length === 0) {
      console.warn('No admins found for tribe:', tribeId);
      return;
    }

    // Get requester and tribe info for notification
    const [requesterResult, tribeResult] = await Promise.allSettled([
      supabase
        .from('profile')
        .select('display_name')
        .eq('id', requesterId)
        .single(),
      supabase
        .from('tribes')
        .select('name')
        .eq('id', tribeId)
        .single()
    ]);

    const requesterName = requesterResult.status === 'fulfilled' && requesterResult.value.data
      ? (requesterResult.value.data.display_name || 'Someone')
      : 'Someone';

    const tribeName = tribeResult.status === 'fulfilled' && tribeResult.value.data
      ? tribeResult.value.data.name
      : 'your tribe';

    // Create notifications for each admin
    const notifications = admins.map(admin => ({
      user_id: admin.user_id,
      type: 'tribe_access_request',
      title: 'New Tribe Access Request',
      message: `${requesterName} wants to join ${tribeName}`,
      data: {
        tribe_id: tribeId,
        requester_id: requesterId,
        request_id: requestId,
        tribe_name: tribeName,
        requester_name: requesterName
      },
      is_read: false
    }));

    const { error: notificationError } = await supabase
      .from('notification')
      .insert(notifications);

    if (notificationError) {
      console.error('Error creating notifications:', notificationError);
    } else {
      console.log(`Sent ${notifications.length} notifications to tribe admins`);
    }

  } catch (error) {
    console.error('Error notifying tribe admins:', error);
    throw error;
  }
}

/**
 * Get pending access requests for a user
 */
export async function getUserAccessRequests(): Promise<TribeAccessRequest[]> {
  try {
    const { supabase, getCurrentSession } = await import('./supabase/client');
    const session = await getCurrentSession();
    
    if (!session?.user?.id) {
      return [];
    }

    const { data: requests, error } = await supabase
      .from('tribe_access_requests')
      .select(`
        id,
        user_id,
        tribe_id,
        message,
        status,
        created_at,
        updated_at,
        tribes:tribe_id (
          id,
          name,
          avatar_url
        )
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user access requests:', error);
      return [];
    }

    return requests?.map(request => ({
      ...request,
      tribe: request.tribes
        ? {
            id: request.tribes.id,
            name: request.tribes.name,
            avatar_url: request.tribes.avatar_url
          }
        : undefined
    })) || [];

  } catch (error) {
    console.error('Error getting user access requests:', error);
    return [];
  }
}

/**
 * Check if user has already requested access to a tribe
 */
export async function hasRequestedAccess(tribeId: string): Promise<boolean> {
  try {
    const { supabase, getCurrentSession } = await import('./supabase/client');
    const session = await getCurrentSession();
    
    if (!session?.user?.id) {
      return false;
    }

    const { data, error } = await supabase
      .from('tribe_access_requests')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('tribe_id', tribeId)
      .eq('status', 'pending')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking access request:', error);
    }

    return !!data;

  } catch (error) {
    console.error('Error checking if user has requested access:', error);
    return false;
  }
}

/**
 * Cancel a pending access request
 */
export async function cancelAccessRequest(requestId: string): Promise<AccessRequestResponse> {
  try {
    const { supabase, getCurrentSession } = await import('./supabase/client');
    const session = await getCurrentSession();
    
    if (!session?.user?.id) {
      return {
        success: false,
        message: 'You must be logged in to cancel requests'
      };
    }

    const { error } = await supabase
      .from('tribe_access_requests')
      .delete()
      .eq('id', requestId)
      .eq('user_id', session.user.id); // Ensure user can only cancel their own requests

    if (error) {
      console.error('Error canceling access request:', error);
      return {
        success: false,
        message: 'Failed to cancel request. Please try again.'
      };
    }

    return {
      success: true,
      message: 'Access request canceled'
    };

  } catch (error) {
    console.error('Error canceling access request:', error);
    return {
      success: false,
      message: 'An unexpected error occurred. Please try again.'
    };
  }
}