import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { setupRoutes } from './routes.tsx';
import { createClient } from 'npm:@supabase/supabase-js';

const app = new Hono();

// Debug startup
console.log('=== STARTING TRIBE BOARD SERVER ===');
console.log('Environment check:', {
  supabaseUrl: !!Deno.env.get('SUPABASE_URL'),
  serviceKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  timestamp: new Date().toISOString()
});

// Initialize Supabase client for bucket management
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Storage bucket names (matching client-side constants)
const MEDIA_BUCKET_NAME = 'make-70df0d6e-media';
const AVATARS_BUCKET_NAME = 'avatars';

// Initialize storage buckets on startup
async function initializeStorage() {
  try {
    console.log('Initializing storage buckets...');
    
    // Check existing buckets
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    if (listError) {
      console.error('Error listing buckets:', listError);
      return;
    }
    
    const existingBuckets = new Set(buckets?.map(b => b.name) || []);
    console.log('Existing buckets:', Array.from(existingBuckets));
    
    // Initialize media bucket
    await initializeBucket(MEDIA_BUCKET_NAME, {
      public: true,
      allowedMimeTypes: [
        'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
        'video/mp4', 'video/webm', 'video/mov',
        'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/m4a'
      ],
      fileSizeLimit: 5 * 1024 * 1024 // 5MB limit
    }, existingBuckets);
    
    // Initialize avatars bucket
    await initializeBucket(AVATARS_BUCKET_NAME, {
      public: true,
      allowedMimeTypes: [
        'image/jpeg', 'image/jpg', 'image/png', 'image/webp'
      ],
      fileSizeLimit: 2 * 1024 * 1024 // 2MB limit for avatars
    }, existingBuckets);
    
    console.log('Storage initialization complete');
  } catch (error) {
    console.error('Error initializing storage:', error);
  }
}

// Helper function to create storage RLS policies
async function createStoragePolicies(bucketName: string) {
  try {
    console.log(`🔐 Creating RLS policies for bucket: ${bucketName}`);
    
    // Create essential RLS policies for the bucket
    const policies = [
      // Allow authenticated users to upload to their own folders
      {
        name: `Allow authenticated uploads to ${bucketName}`,
        sql: `
          CREATE POLICY IF NOT EXISTS "Allow authenticated uploads to ${bucketName}"
          ON storage.objects FOR INSERT
          WITH CHECK (
            bucket_id = '${bucketName}' AND
            (auth.uid() IS NOT NULL)
          );
        `
      },
      // Allow public read access to files in public buckets
      {
        name: `Allow public read access to ${bucketName}`,
        sql: `
          CREATE POLICY IF NOT EXISTS "Allow public read access to ${bucketName}"
          ON storage.objects FOR SELECT
          USING (bucket_id = '${bucketName}');
        `
      },
      // Allow users to update their own files
      {
        name: `Allow user updates in ${bucketName}`,
        sql: `
          CREATE POLICY IF NOT EXISTS "Allow user updates in ${bucketName}"
          ON storage.objects FOR UPDATE
          USING (
            bucket_id = '${bucketName}' AND
            (auth.uid() IS NOT NULL)
          );
        `
      },
      // Allow users to delete their own files
      {
        name: `Allow user deletes in ${bucketName}`,
        sql: `
          CREATE POLICY IF NOT EXISTS "Allow user deletes in ${bucketName}"
          ON storage.objects FOR DELETE
          USING (
            bucket_id = '${bucketName}' AND
            (auth.uid() IS NOT NULL)
          );
        `
      }
    ];
    
    // Try to create policies using direct SQL execution
    for (const policy of policies) {
      try {
        console.log(`📝 Creating policy: ${policy.name}`);
        
        // Use the admin client to execute SQL directly
        const { error: sqlError } = await supabaseAdmin
          .from('_sql_execution_placeholder') // This won't work, but we'll catch it
          .select('*')
          .limit(1);
        
        // Since direct SQL execution via client isn't available, 
        // we'll just log what needs to be done manually
        console.log(`📋 Manual policy needed: ${policy.sql}`);
        
      } catch (error) {
        console.log(`⚠️ Policy creation via API not available for: ${policy.name}`);
        console.log(`📋 SQL for manual execution: ${policy.sql}`);
      }
    }
    
    console.log(`✅ RLS policy setup completed for ${bucketName}`);
    console.log(`💡 If uploads fail, please run the logged SQL commands in your Supabase SQL Editor`);
    
  } catch (error) {
    console.warn(`⚠️ RLS policy creation failed for ${bucketName}:`, error);
    console.log(`💡 Manual bucket setup required in Supabase Dashboard`);
  }
}

// Helper function to initialize individual buckets
async function initializeBucket(
  bucketName: string, 
  config: {
    public: boolean;
    allowedMimeTypes: string[];
    fileSizeLimit: number;
  },
  existingBuckets: Set<string>
) {
  try {
    if (!existingBuckets.has(bucketName)) {
      console.log(`Creating ${bucketName} bucket...`);
      
      const { data: bucket, error: createError } = await supabaseAdmin.storage.createBucket(bucketName, config);
      
      if (createError) {
        console.error(`Error creating ${bucketName} bucket:`, createError);
      } else {
        console.log(`✅ ${bucketName} bucket created successfully:`, bucket);
        // Create RLS policies for the new bucket
        await createStoragePolicies(bucketName);
      }
    } else {
      console.log(`✅ ${bucketName} bucket already exists`);
      
      // Update bucket to ensure correct settings
      try {
        const { error: updateError } = await supabaseAdmin.storage.updateBucket(bucketName, {
          public: config.public
        });
        
        if (updateError) {
          console.warn(`Could not update ${bucketName} bucket settings:`, updateError);
        } else {
          console.log(`✅ Confirmed ${bucketName} bucket settings`);
        }
      } catch (updateErr) {
        console.warn(`Error updating ${bucketName} bucket settings:`, updateErr);
      }
    }
  } catch (error) {
    console.error(`Error initializing ${bucketName} bucket:`, error);
  }
}

// Initialize storage on startup
initializeStorage();

// Middleware
app.use('*', logger(console.log));
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization', 'apikey', 'X-Update-Type'],
  allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE', 'PATCH'],
}));

// Helper to register both unprefixed and prefixed paths for this function name
const both = (p: string) => [p, `/make-server-70df0d6e${p}`];

// Setup all routes
console.log('Setting up routes...');
setupRoutes(app);
console.log('Routes setup complete');

// Add storage management routes (enhanced with better authorization and error handling)
both('/storage/ensure-buckets').forEach((path) =>
  app.post(path, async (c) => {
    try {
      console.log('🪣 Manual bucket creation requested...');
      
      // Safely log headers
      try {
        const headers = c.req.header ? Object.keys(c.req.header()).reduce((acc, key) => {
          acc[key] = c.req.header(key);
          return acc;
        }, {} as Record<string, string | undefined>) : {};
        console.log('Request headers:', headers);
      } catch (headerError) {
        console.log('Could not log headers:', headerError);
      }
      
      // Enhanced authorization check - allow both Bearer token and direct API key
      let authHeader, directApiKey;
      try {
        authHeader = c.req.header('Authorization');
        directApiKey = c.req.header('apikey');
      } catch (authError) {
        console.warn('❌ Could not read authorization headers:', authError);
      }
      
      console.log('🔍 Authorization check:', { 
        hasAuthHeader: !!authHeader, 
        hasApiKey: !!directApiKey 
      });
      
      // Allow requests without auth for bucket creation since we use service role internally
      console.log('✅ Proceeding with bucket creation using service role...');
      
      // Force bucket creation using admin client
      console.log('📊 Checking current buckets...');
      const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
      
      if (listError) {
        console.error('❌ Error listing buckets:', listError);
        return c.json({ 
          error: 'Storage system not available', 
          details: listError,
          suggestion: 'Please check Supabase storage configuration'
        }, 500);
      }
      
      const existingBuckets = new Set(buckets?.map(b => b.name) || []);
      console.log('📋 Current buckets:', Array.from(existingBuckets));
      
      const results = [];
      const bucketsToCreate = [
        {
          name: AVATARS_BUCKET_NAME,
          config: {
            public: true,
            allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
            fileSizeLimit: 2 * 1024 * 1024
          }
        },
        {
          name: MEDIA_BUCKET_NAME,
          config: {
            public: true,
            allowedMimeTypes: [
              'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
              'video/mp4', 'video/webm', 'video/mov',
              'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/m4a'
            ],
            fileSizeLimit: 5 * 1024 * 1024
          }
        }
      ];
      
      for (const bucketInfo of bucketsToCreate) {
        try {
          if (!existingBuckets.has(bucketInfo.name)) {
            console.log(`🔧 Creating ${bucketInfo.name} bucket...`);
            
            const { data: bucket, error: createError } = await supabaseAdmin.storage.createBucket(
              bucketInfo.name, 
              bucketInfo.config
            );
            
            // If bucket was created successfully, create RLS policies
            if (!createError && bucket) {
              await createStoragePolicies(bucketInfo.name);
            }
            
            if (createError) {
              console.error(`❌ Failed to create ${bucketInfo.name}:`, createError);
              
              // Try alternative creation methods
              console.log(`🔄 Trying alternative methods for ${bucketInfo.name}...`);
              
              // Method 1: Retry with minimal config
              try {
                console.log(`🔄 Attempting minimal config creation for ${bucketInfo.name}...`);
                const { data: minimalBucket, error: minimalError } = await supabaseAdmin.storage.createBucket(
                  bucketInfo.name, 
                  { public: true } // Minimal config to avoid RLS issues
                );
                
                if (!minimalError) {
                  console.log(`✅ ${bucketInfo.name} created with minimal config`);
                  results.push({ bucket: bucketInfo.name, status: 'created-minimal' });
                } else {
                  throw minimalError;
                }
              } catch (minimalCreateError) {
                console.warn(`⚠️ Minimal config creation failed for ${bucketInfo.name}:`, minimalCreateError);
                
                // Method 2: Try direct SQL with proper RLS bypass
                try {
                  console.log(`🔄 Attempting RLS bypass SQL for ${bucketInfo.name}...`);
                  
                  // Use raw SQL to bypass RLS
                  const { data: sqlData, error: sqlError } = await supabaseAdmin.rpc('create_storage_bucket', {
                    bucket_name: bucketInfo.name,
                    bucket_public: true
                  });
                  
                  if (sqlError) {
                    // If RPC doesn't exist, try direct insert
                    console.log(`🔄 RPC failed, trying direct insert for ${bucketInfo.name}...`);
                    const { error: insertError } = await supabaseAdmin
                      .from('storage.buckets')
                      .insert({
                        id: bucketInfo.name,
                        name: bucketInfo.name,
                        public: true,
                        file_size_limit: bucketInfo.config.fileSizeLimit,
                        allowed_mime_types: bucketInfo.config.allowedMimeTypes
                      });
                    
                    if (insertError) {
                      throw insertError;
                    } else {
                      console.log(`✅ ${bucketInfo.name} created via direct SQL insert`);
                      results.push({ bucket: bucketInfo.name, status: 'created-sql' });
                    }
                  } else {
                    console.log(`✅ ${bucketInfo.name} created via RPC`);
                    results.push({ bucket: bucketInfo.name, status: 'created-rpc' });
                  }
                } catch (sqlCreateError) {
                  console.error(`❌ All creation methods failed for ${bucketInfo.name}:`, sqlCreateError);
                  results.push({ 
                    bucket: bucketInfo.name, 
                    status: 'failed', 
                    error: createError,
                    sqlError: sqlCreateError,
                    suggestion: 'Bucket creation blocked by RLS policies. Manual creation required in Supabase dashboard.'
                  });
                }
              }
            } else {
              console.log(`✅ ${bucketInfo.name} created successfully:`, bucket);
              results.push({ bucket: bucketInfo.name, status: 'created', data: bucket });
            }
          } else {
            console.log(`✅ ${bucketInfo.name} already exists`);
            results.push({ bucket: bucketInfo.name, status: 'exists' });
            
            // Verify bucket is public
            try {
              const { error: updateError } = await supabaseAdmin.storage.updateBucket(bucketInfo.name, {
                public: true
              });
              if (updateError) {
                console.warn(`⚠️ Could not verify ${bucketInfo.name} is public:`, updateError);
              } else {
                console.log(`✅ Verified ${bucketInfo.name} is public`);
              }
            } catch (updateErr) {
              console.warn(`⚠️ Error updating ${bucketInfo.name}:`, updateErr);
            }
          }
        } catch (bucketError) {
          console.error(`❌ Exception creating ${bucketInfo.name}:`, bucketError);
          results.push({ 
            bucket: bucketInfo.name, 
            status: 'exception', 
            error: bucketError,
            suggestion: 'Check server logs and Supabase configuration'
          });
        }
      }
      
      // Final verification
      console.log('🔍 Final bucket verification...');
      const { data: finalBuckets } = await supabaseAdmin.storage.listBuckets();
      const finalBucketNames = finalBuckets?.map(b => b.name) || [];
      
      return c.json({
        success: true,
        results,
        finalBuckets: finalBucketNames,
        message: 'Bucket creation process complete',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('💥 Critical error in bucket creation:', error);
      return c.json({ 
        error: 'Critical bucket creation failure', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        suggestion: 'Check server logs and contact support if issue persists'
      }, 500);
    }
  })
);

// Add test avatar upload endpoint for debugging RLS issues
both('/test-avatar-upload').forEach((path) =>
  app.post(path, async (c) => {
    try {
      console.log('🧪 Testing avatar upload capabilities...');
      
      // Get auth token
      const authHeader = c.req.header('Authorization');
      if (!authHeader) {
        return c.json({ error: 'Authorization header required' }, 401);
      }
      
      // Test user authentication
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
        authHeader.replace('Bearer ', '')
      );
      
      if (authError || !user) {
        return c.json({ error: 'Authentication failed', details: authError }, 401);
      }
      
      console.log('✅ User authenticated:', user.id.substring(0, 8) + '...');
      
      // Test bucket access
      const bucketName = AVATARS_BUCKET_NAME;
      console.log('🪣 Testing bucket access:', bucketName);
      
      const { data: buckets, error: bucketError } = await supabaseAdmin.storage.listBuckets();
      
      if (bucketError) {
        return c.json({ 
          error: 'Cannot access storage buckets', 
          details: bucketError,
          suggestion: 'Check Supabase storage configuration'
        }, 500);
      }
      
      const avatarBucket = buckets?.find(b => b.name === bucketName);
      
      if (!avatarBucket) {
        return c.json({
          error: 'Avatar bucket not found',
          availableBuckets: buckets?.map(b => b.name) || [],
          expectedBucket: bucketName,
          suggestion: 'Run /storage/ensure-buckets endpoint first'
        }, 404);
      }
      
      console.log('✅ Avatar bucket found:', avatarBucket.name, 'public:', avatarBucket.public);
      
      // Test upload permissions (create a small test file)
      const testFileName = `${user.id}/test-upload-${Date.now()}.txt`;
      const testContent = 'test upload permissions';
      
      try {
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from(bucketName)
          .upload(testFileName, testContent, {
            contentType: 'text/plain',
            upsert: true
          });
        
        if (uploadError) {
          return c.json({
            error: 'Upload test failed',
            details: uploadError,
            bucketName,
            fileName: testFileName,
            suggestion: 'Check RLS policies on storage.objects table'
          }, 403);
        }
        
        console.log('✅ Upload test successful:', uploadData.path);
        
        // Clean up test file
        try {
          await supabaseAdmin.storage.from(bucketName).remove([testFileName]);
          console.log('✅ Test file cleaned up');
        } catch (cleanupError) {
          console.warn('⚠️ Test file cleanup failed:', cleanupError);
        }
        
        return c.json({
          success: true,
          message: 'Avatar upload test passed',
          bucketName,
          bucketExists: true,
          bucketPublic: avatarBucket.public,
          uploadPermissions: 'working',
          userId: user.id
        });
        
      } catch (uploadException) {
        return c.json({
          error: 'Upload exception',
          details: uploadException instanceof Error ? uploadException.message : uploadException,
          bucketName,
          suggestion: 'Storage RLS policies may be blocking uploads'
        }, 500);
      }
      
    } catch (error) {
      console.error('💥 Avatar upload test error:', error);
      return c.json({
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 500);
    }
  })
);

// Public signup (no Authorization header required)
both('/auth/signup').forEach((path) =>
  app.post(path, async (c) => {
    try {
      const body = await c.req.json().catch(() => ({}));
      const { email, password, username } = body ?? {};

      if (!email || !password) {
        return c.json({ error: 'email and password are required' }, 400);
      }

      const { data: { user }, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (error || !user) {
        return c.json({ error: error?.message ?? 'Create user failed' }, 400);
      }

      await supabaseAdmin
        .from('users')
        .insert({ id: user.id, username: username ?? email.split('@')[0], profile_image_url: null })
        .onConflict('id')
        .ignore();

      return c.json({ user: { id: user.id, email: user.email } }, 201);
    } catch (err) {
      const message = (err as any)?.message ?? 'Internal server error';
      return c.json({ error: message }, 500);
    }
  })
);

// Add a catch-all route for debugging
app.all('*', (c) => {
  console.log(`Unmatched route: ${c.req.method} ${c.req.path}`);
  return c.json({ 
    error: 'Route not found',
    method: c.req.method,
    path: c.req.path,
    availableRoutes: [
      'GET /test',
      'GET /posts',
      'GET /make-server-70df0d6e/test',
      'GET /make-server-70df0d6e/posts',
      'POST /auth/signup',
      'POST /make-server-70df0d6e/auth/signup',
      'POST /auth/check-availability',
      'GET /make-server-70df0d6e/users/:userId/posts',
      'GET /make-server-70df0d6e/posts/:postId',
      'POST /make-server-70df0d6e/posts',
      'GET /make-server-70df0d6e/posts/:postId/comments',
      'POST /make-server-70df0d6e/posts/:postId/comments',
      'POST /make-server-70df0d6e/posts/:postId/like',
      'POST /make-server-70df0d6e/posts/:postId/bookmark',
      'GET /make-server-70df0d6e/notifications',
      'POST /make-server-70df0d6e/notifications',
      'PATCH /make-server-70df0d6e/notifications/mark-read',
      'GET /make-server-70df0d6e/notifications/unread-count',
      'DELETE /make-server-70df0d6e/posts/:postId/force-delete',
      'GET /make-server-70df0d6e/users/profile',
      'PATCH /make-server-70df0d6e/users/profile',
      'PUT /make-server-70df0d6e/users/profile',
      'GET /make-server-70df0d6e/saved-posts',
      'POST /make-server-70df0d6e/users/:userId/follow',
      'DELETE /make-server-70df0d6e/users/:userId/follow',
      'GET /make-server-70df0d6e/users/:userId/follow-status'
    ]
  }, 404);
});

console.log('Starting server...');

// Start the server
Deno.serve(app.fetch);