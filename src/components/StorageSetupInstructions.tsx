import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ExternalLink, Database, AlertTriangle, CheckCircle, Settings } from 'lucide-react';

interface StorageSetupInstructionsProps {
  onDismiss?: () => void;
  compact?: boolean;
}

export function StorageSetupInstructions({ onDismiss, compact = false }: StorageSetupInstructionsProps) {
  const openDashboard = () => {
    window.open('https://supabase.com/dashboard', '_blank');
  };

  const openSetupGuide = () => {
    window.open('/?storage-guide', '_blank');
  };

  if (compact) {
    return (
      <div className="bg-glitch-red/10 border border-glitch-red/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-glitch-red flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-pearl-white font-medium mb-2">Manual Storage Setup Required</h4>
            <p className="text-xs text-muted-lavender mb-3">
              Your Supabase project has Row-Level Security policies that prevent automatic bucket creation.
              You need to create storage buckets manually in your Supabase Dashboard.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={openDashboard}
                size="sm"
                className="bg-neon-lilac hover:bg-neon-lilac/80 text-midnight-black"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Open Dashboard
              </Button>
              <Button
                onClick={openSetupGuide}
                variant="outline"
                size="sm"
                className="border-electric-blue/30 text-electric-blue hover:bg-electric-blue/10"
              >
                <Settings className="w-3 h-3 mr-1" />
                Setup Guide
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-midnight-black/80 to-midnight-black/60 border-muted-lavender/30">
      <CardHeader>
        <CardTitle className="text-pearl-white font-headline flex items-center gap-2">
          <Database className="w-5 h-5 text-electric-blue" />
          Storage Setup Required
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Issue Explanation */}
        <div className="bg-glitch-red/5 border border-glitch-red/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-glitch-red flex-shrink-0" />
            <div>
              <h3 className="text-glitch-red font-medium mb-2">Why Manual Setup?</h3>
              <p className="text-muted-lavender text-sm">
                Your Supabase project has Row-Level Security (RLS) policies enabled, which prevent automatic 
                bucket creation for security reasons. This is a good security practice, but requires manual setup.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Steps */}
        <div className="bg-electric-blue/5 border border-electric-blue/20 rounded-lg p-4">
          <h3 className="text-electric-blue font-medium mb-3">Quick Setup Steps</h3>
          <ol className="space-y-2 text-sm text-muted-lavender">
            <li className="flex items-start gap-2">
              <span className="text-electric-blue font-bold">1.</span>
              <span>Open your Supabase Dashboard</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-electric-blue font-bold">2.</span>
              <span>Go to Storage section</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-electric-blue font-bold">3.</span>
              <span>Create a new bucket named <code className="bg-midnight-black/50 px-1 rounded text-pearl-white">"avatars"</code></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-electric-blue font-bold">4.</span>
              <span>Enable "Public bucket" option</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-electric-blue font-bold">5.</span>
              <span>Come back and try uploading again</span>
            </li>
          </ol>
        </div>

        {/* Bucket Settings */}
        <div className="bg-neon-lilac/5 border border-neon-lilac/20 rounded-lg p-4">
          <h3 className="text-neon-lilac font-medium mb-3">Required Bucket Settings</h3>
          <div className="space-y-3">
            <div>
              <h4 className="text-pearl-white text-sm font-medium mb-1">Avatars Bucket</h4>
              <div className="bg-midnight-black/50 border border-muted-lavender/20 rounded p-2 text-xs font-mono">
                <div className="text-pearl-white space-y-1">
                  <div><span className="text-electric-blue">Name:</span> avatars</div>
                  <div><span className="text-electric-blue">Public:</span> ✓ Enabled</div>
                  <div><span className="text-electric-blue">File size limit:</span> 2 MB</div>
                  <div><span className="text-electric-blue">MIME types:</span> image/jpeg, image/png, image/webp</div>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-pearl-white text-sm font-medium mb-1">Media Bucket (Optional)</h4>
              <div className="bg-midnight-black/50 border border-muted-lavender/20 rounded p-2 text-xs font-mono">
                <div className="text-pearl-white space-y-1">
                  <div><span className="text-electric-blue">Name:</span> make-70df0d6e-media</div>
                  <div><span className="text-electric-blue">Public:</span> ✓ Enabled</div>
                  <div><span className="text-electric-blue">File size limit:</span> 5 MB</div>
                  <div><span className="text-electric-blue">MIME types:</span> All media types</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Success Indicators */}
        <div className="bg-muted-lavender/5 border border-muted-lavender/20 rounded-lg p-4">
          <h3 className="text-pearl-white font-medium mb-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            After Setup
          </h3>
          <ul className="text-muted-lavender text-sm space-y-1">
            <li className="flex items-start gap-2">
              <span className="text-green-400 text-xs">•</span>
              <span>Avatar uploads will work immediately</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 text-xs">•</span>
              <span>No app restart or refresh required</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 text-xs">•</span>
              <span>All future uploads will work automatically</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={openDashboard}
            className="flex-1 bg-neon-lilac hover:bg-neon-lilac/80 text-midnight-black"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open Supabase Dashboard
          </Button>
          
          <Button
            onClick={openSetupGuide}
            variant="outline"
            className="border-electric-blue/30 text-electric-blue hover:bg-electric-blue/10"
          >
            <Settings className="w-4 h-4 mr-2" />
            Detailed Guide
          </Button>
        </div>

        {onDismiss && (
          <div className="pt-2 border-t border-muted-lavender/20">
            <Button
              onClick={onDismiss}
              variant="ghost"
              size="sm"
              className="w-full text-muted-lavender hover:text-pearl-white"
            >
              Dismiss
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}