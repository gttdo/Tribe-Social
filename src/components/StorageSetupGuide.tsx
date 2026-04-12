import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ExternalLink, Database, Shield, Settings, CheckCircle } from 'lucide-react';

interface StorageSetupGuideProps {
  onClose?: () => void;
}

export function StorageSetupGuide({ onClose }: StorageSetupGuideProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-midnight-black via-midnight-black to-purple-900/20 p-4">
      <div className="container mx-auto max-w-4xl">
        <Card className="bg-gradient-to-br from-midnight-black/80 to-midnight-black/60 border-muted-lavender/30">
          <CardHeader>
            <CardTitle className="text-pearl-white font-headline flex items-center gap-2">
              <Database className="w-6 h-6 text-electric-blue" />
              Storage Setup Guide
            </CardTitle>
            <p className="text-muted-lavender">
              Your storage buckets need to be created manually due to security policies. Follow these steps:
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Step 1 */}
            <div className="bg-electric-blue/5 border border-electric-blue/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-electric-blue text-midnight-black rounded-full flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-pearl-white font-medium mb-2">Access Supabase Dashboard</h3>
                  <p className="text-muted-lavender text-sm mb-3">
                    Go to your Supabase project dashboard and navigate to the Storage section.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-electric-blue/30 text-electric-blue hover:bg-electric-blue/10"
                    onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
                  >
                    <ExternalLink className="w-3 h-3 mr-2" />
                    Open Supabase Dashboard
                  </Button>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-neon-lilac/5 border border-neon-lilac/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-neon-lilac text-midnight-black rounded-full flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-pearl-white font-medium mb-2">Create Avatars Bucket</h3>
                  <p className="text-muted-lavender text-sm mb-3">
                    Click "New bucket" and create a bucket with these settings:
                  </p>
                  <div className="bg-midnight-black/50 border border-muted-lavender/20 rounded p-3 font-mono text-xs">
                    <div className="space-y-1 text-pearl-white">
                      <div><span className="text-electric-blue">Name:</span> avatars</div>
                      <div><span className="text-electric-blue">Public:</span> ✓ Enable</div>
                      <div><span className="text-electric-blue">File size limit:</span> 2 MB</div>
                      <div><span className="text-electric-blue">Allowed MIME types:</span></div>
                      <div className="text-muted-lavender pl-4">
                        • image/jpeg<br/>
                        • image/jpg<br/>
                        • image/png<br/>
                        • image/webp
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-soft-blush/5 border border-soft-blush/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-soft-blush text-midnight-black rounded-full flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="text-pearl-white font-medium mb-2">Create Media Bucket (Optional)</h3>
                  <p className="text-muted-lavender text-sm mb-3">
                    For full functionality, also create a media bucket:
                  </p>
                  <div className="bg-midnight-black/50 border border-muted-lavender/20 rounded p-3 font-mono text-xs">
                    <div className="space-y-1 text-pearl-white">
                      <div><span className="text-electric-blue">Name:</span> make-70df0d6e-media</div>
                      <div><span className="text-electric-blue">Public:</span> ✓ Enable</div>
                      <div><span className="text-electric-blue">File size limit:</span> 5 MB</div>
                      <div><span className="text-electric-blue">Allowed MIME types:</span></div>
                      <div className="text-muted-lavender pl-4">
                        • All image types<br/>
                        • video/mp4, video/webm, video/mov<br/>
                        • audio/wav, audio/mp3, audio/ogg, audio/m4a
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Note */}
            <div className="bg-glitch-red/5 border border-glitch-red/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-glitch-red flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-glitch-red font-medium mb-2">Why Manual Setup?</h3>
                  <p className="text-muted-lavender text-sm">
                    Your Supabase project has Row-Level Security (RLS) policies that prevent automatic bucket creation. 
                    This is a security feature to protect your database. Manual creation in the dashboard bypasses this restriction safely.
                  </p>
                </div>
              </div>
            </div>

            {/* Success Steps */}
            <div className="bg-muted-lavender/5 border border-muted-lavender/20 rounded-lg p-4">
              <h3 className="text-pearl-white font-medium mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                After Setup
              </h3>
              <ul className="text-muted-lavender text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-green-400 text-xs">•</span>
                  <span>Avatar uploads will work immediately</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 text-xs">•</span>
                  <span>No app restart required</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 text-xs">•</span>
                  <span>Use the diagnostic tool to verify setup</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
                className="bg-neon-lilac hover:bg-neon-lilac/80 text-midnight-black flex-1"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Supabase Dashboard
              </Button>
              
              {onClose && (
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="border-muted-lavender/30 text-pearl-white hover:bg-muted-lavender/10"
                >
                  Close Guide
                </Button>
              )}
            </div>

            {/* Quick Links */}
            <div className="pt-4 border-t border-muted-lavender/20">
              <h4 className="text-pearl-white font-medium mb-2">Quick Links</h4>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-muted-lavender/30 text-muted-lavender hover:bg-muted-lavender/10"
                  onClick={() => window.open('https://supabase.com/docs/guides/storage/buckets/creating-buckets', '_blank')}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Bucket Docs
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="border-muted-lavender/30 text-muted-lavender hover:bg-muted-lavender/10"
                  onClick={() => window.open('https://supabase.com/docs/guides/storage/security/access-control', '_blank')}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Security Guide
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}