// Deployment Helper for Tribe Board
// This file helps diagnose and resolve common deployment issues

export interface DeploymentStatus {
  supabaseConfigured: boolean;
  edgeFunctionsAvailable: boolean;
  authWorking: boolean;
  storageConfigured: boolean;
  issues: string[];
  solutions: string[];
}

export async function checkDeploymentStatus(): Promise<DeploymentStatus> {
  const status: DeploymentStatus = {
    supabaseConfigured: false,
    edgeFunctionsAvailable: false,
    authWorking: false,
    storageConfigured: false,
    issues: [],
    solutions: []
  };

  try {
    // Check if Supabase is configured
    const { projectId, publicAnonKey } = await import('./supabase/info');
    
    if (!projectId || !publicAnonKey) {
      status.issues.push('Supabase credentials missing');
      status.solutions.push('Create /utils/supabase/info.tsx with your project credentials');
    } else {
      status.supabaseConfigured = true;
    }

    // Check edge functions
    try {
      const { supabase } = await import('./supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        status.authWorking = true;
        
        // Test edge function
        const url = `https://${projectId}.supabase.co/functions/v1/make-server-70df0d6e/test`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': publicAnonKey,
            'Content-Type': 'application/json'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          status.edgeFunctionsAvailable = true;
        } else {
          status.issues.push('Edge functions not responding');
          status.solutions.push('Deploy your Supabase Edge Functions using: supabase functions deploy');
        }
      } else {
        status.issues.push('No active session');
        status.solutions.push('Sign in to test edge functions');
      }
    } catch (error) {
      status.issues.push('Edge function connection failed');
      status.solutions.push('1. Deploy edge functions: supabase functions deploy\n2. Check your Supabase project settings\n3. Verify your environment variables');
    }

    // Check storage
    try {
      const { supabase } = await import('./supabase/client');
      const { data: buckets } = await supabase.storage.listBuckets();
      
      if (buckets?.some(bucket => bucket.name === 'make-70df0d6e-media')) {
        status.storageConfigured = true;
      } else {
        status.issues.push('Media storage bucket not found');
        status.solutions.push('Media bucket will be created automatically when edge functions are deployed');
      }
    } catch (error) {
      status.issues.push('Storage access failed');
      status.solutions.push('Check Supabase storage permissions');
    }

  } catch (error) {
    status.issues.push('Critical configuration error');
    status.solutions.push('Check your Supabase setup and environment variables');
  }

  return status;
}

export function printDeploymentStatus(status: DeploymentStatus) {
  console.log('🚀 Tribe Board Deployment Status');
  console.log('================================');
  console.log(`✅ Supabase Configured: ${status.supabaseConfigured}`);
  console.log(`✅ Edge Functions Available: ${status.edgeFunctionsAvailable}`);
  console.log(`✅ Auth Working: ${status.authWorking}`);
  console.log(`✅ Storage Configured: ${status.storageConfigured}`);
  
  if (status.issues.length > 0) {
    console.log('\n❌ Issues Found:');
    status.issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue}`);
    });
    
    console.log('\n🔧 Solutions:');
    status.solutions.forEach((solution, index) => {
      console.log(`${index + 1}. ${solution}`);
    });
  } else {
    console.log('\n🎉 All systems operational!');
  }
}

// Quick setup check for development
export async function quickSetupCheck() {
  if (process.env.NODE_ENV === 'development') {
    const status = await checkDeploymentStatus();
    
    if (status.issues.length > 0) {
      console.log('\n🚧 Development Setup Issues Detected:');
      console.log('====================================');
      
      if (!status.supabaseConfigured) {
        console.log('📝 Missing Supabase configuration:');
        console.log('   1. Create /utils/supabase/info.tsx');
        console.log('   2. Add your project URL and anon key');
        console.log('   3. Get these from: https://supabase.com/dashboard/project/[your-project]/settings/api');
      }
      
      if (!status.edgeFunctionsAvailable) {
        console.log('🚀 Edge Functions not deployed:');
        console.log('   1. Install Supabase CLI: npm install -g supabase');
        console.log('   2. Login: supabase login');
        console.log('   3. Link project: supabase link --project-ref [your-project-ref]');
        console.log('   4. Deploy functions: supabase functions deploy');
      }
      
      console.log('\n💡 The app will work with limited functionality until these are resolved.');
    }
  }
}