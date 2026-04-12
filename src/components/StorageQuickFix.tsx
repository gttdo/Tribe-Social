import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { AlertTriangle, ExternalLink, Copy, CheckCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { STORAGE_BUCKETS } from '../utils/storage-constants';

export function StorageQuickFix() {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard`);
  };

  const openSupabaseDashboard = () => {
    window.open('https://supabase.com/dashboard/project', '_blank');
  };

  const sqlCommands = `-- RLS Policies for Avatar Uploads
-- Copy and paste this into your Supabase SQL Editor

-- Allow authenticated users to upload files
CREATE POLICY IF NOT EXISTS "Allow authenticated uploads" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id IN ('${STORAGE_BUCKETS.AVATARS}', '${STORAGE_BUCKETS.MEDIA}') AND
  auth.uid() IS NOT NULL
);

-- Allow public read access
CREATE POLICY IF NOT EXISTS "Allow public read access" 
ON storage.objects FOR SELECT 
USING (
  bucket_id IN ('${STORAGE_BUCKETS.AVATARS}', '${STORAGE_BUCKETS.MEDIA}')
);

-- Allow users to update their files
CREATE POLICY IF NOT EXISTS "Allow authenticated updates" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id IN ('${STORAGE_BUCKETS.AVATARS}', '${STORAGE_BUCKETS.MEDIA}') AND
  auth.uid() IS NOT NULL
);

-- Allow users to delete their files  
CREATE POLICY IF NOT EXISTS "Allow authenticated deletes"
ON storage.objects FOR DELETE
USING (
  bucket_id IN ('${STORAGE_BUCKETS.AVATARS}', '${STORAGE_BUCKETS.MEDIA}') AND
  auth.uid() IS NOT NULL
);`;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Card className="bg-gradient-to-br from-midnight-black/95 to-midnight-black/90 border-glitch-red/50">
        <CardHeader>
          <CardTitle className="text-glitch-red font-headline flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Storage Setup Required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 rounded-lg border border-glitch-red/30 bg-glitch-red/5">
            <p className="text-sm text-pearl-white mb-4">
              Avatar uploads are failing because your Supabase storage isn't configured. 
              Follow these steps to fix it:
            </p>
          </div>

          {/* Step 1: Create Buckets */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-electric-blue text-midnight-black flex items-center justify-center text-sm font-semibold">
                1
              </div>
              <h3 className="font-medium text-pearl-white">Create Storage Buckets</h3>
            </div>
            
            <div className="ml-8 space-y-3">
              <Button
                onClick={openSupabaseDashboard}
                className="bg-electric-blue hover:bg-electric-blue/80 text-midnight-black"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Supabase Dashboard
              </Button>
              
              <div className="text-sm text-muted-lavender space-y-2">
                <p>In your dashboard:</p>
                <ol className="list-decimal list-inside space-y-1 ml-4">
                  <li>Go to <strong>Storage</strong> section</li>
                  <li>Click <strong>"New bucket"</strong></li>
                  <li>Create these buckets with <strong>Public</strong> access:</li>
                </ol>
                
                <div className="space-y-2 mt-3">
                  <div className="flex items-center gap-2 p-2 bg-midnight-black/50 rounded border border-muted-lavender/20">
                    <code className="text-electric-blue text-sm font-mono flex-1">
                      {STORAGE_BUCKETS.AVATARS}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(STORAGE_BUCKETS.AVATARS, 'avatars bucket name')}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2 p-2 bg-midnight-black/50 rounded border border-muted-lavender/20">
                    <code className="text-electric-blue text-sm font-mono flex-1">
                      {STORAGE_BUCKETS.MEDIA}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(STORAGE_BUCKETS.MEDIA, 'media bucket name')}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Add RLS Policies (if needed) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-neon-lilac text-midnight-black flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <h3 className="font-medium text-pearl-white">Add Upload Permissions (If Step 1 Doesn't Work)</h3>
            </div>
            
            <div className="ml-8 space-y-3">
              <p className="text-sm text-muted-lavender">
                If uploads still fail after creating buckets, you need to add RLS policies:
              </p>
              
              <div className="p-3 bg-midnight-black/70 rounded border border-muted-lavender/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-lavender">SQL Commands for Supabase SQL Editor:</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(sqlCommands, 'SQL commands')}
                    className="h-6 text-xs"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy SQL
                  </Button>
                </div>
                <pre className="text-xs text-electric-blue overflow-x-auto whitespace-pre-wrap">
                  {sqlCommands}
                </pre>
              </div>
              
              <div className="text-xs text-muted-lavender">
                <p>1. Go to <strong>SQL Editor</strong> in your Supabase Dashboard</p>
                <p>2. Paste and run the SQL commands above</p>
                <p>3. Try uploading your avatar again</p>
              </div>
            </div>
          </div>

          {/* Step 3: Test */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-green-500 text-midnight-black flex items-center justify-center text-sm font-semibold">
                3
              </div>
              <h3 className="font-medium text-pearl-white">Test Your Setup</h3>
            </div>
            
            <div className="ml-8">
              <p className="text-sm text-muted-lavender">
                After completing the setup, go back and try uploading your avatar again.
              </p>
            </div>
          </div>

          {/* Quick Access */}
          <div className="border-t border-muted-lavender/20 pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-lavender">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span>Need more help? Add <code className="text-electric-blue">?storage-helper</code> to your URL for an interactive setup tool.</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}