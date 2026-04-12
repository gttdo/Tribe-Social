import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { CheckCircle, XCircle, AlertTriangle, ExternalLink, Copy } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface SetupStatus {
  supabaseConfigured: boolean;
  edgeFunctionsDeployed: boolean;
  storageConfigured: boolean;
  authWorking: boolean;
  issues: string[];
  solutions: string[];
}

export function SetupHelper() {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [checking, setChecking] = useState(false);

  const checkSetup = async () => {
    setChecking(true);
    
    try {
      const { checkDeploymentStatus } = await import('../utils/deployment-helper');
      const deploymentStatus = await checkDeploymentStatus();
      
      setStatus({
        supabaseConfigured: deploymentStatus.supabaseConfigured,
        edgeFunctionsDeployed: deploymentStatus.edgeFunctionsAvailable,
        storageConfigured: deploymentStatus.storageConfigured,
        authWorking: deploymentStatus.authWorking,
        issues: deploymentStatus.issues,
        solutions: deploymentStatus.solutions
      });
    } catch (error) {
      toast.error('Failed to check setup status');
      console.error('Setup check error:', error);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkSetup();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  if (!status && !checking) {
    return null;
  }

  const allGood = status?.supabaseConfigured && status?.edgeFunctionsDeployed && status?.authWorking;

  return (
    <Card className="bg-midnight-black/50 border-electric-blue/30 max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-pearl-white">
          {allGood ? (
            <CheckCircle className="w-5 h-5 text-electric-blue" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-glitch-red" />
          )}
          Development Setup Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {checking ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-electric-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-lavender">Checking setup...</p>
          </div>
        ) : (
          <>
            {/* Status Checks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-3 bg-midnight-black/30 rounded-lg">
                <span className="text-sm text-pearl-white">Supabase Config</span>
                {status?.supabaseConfigured ? (
                  <Badge className="bg-electric-blue/20 text-electric-blue border-electric-blue/30">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Ready
                  </Badge>
                ) : (
                  <Badge className="bg-glitch-red/20 text-glitch-red border-glitch-red/30">
                    <XCircle className="w-3 h-3 mr-1" />
                    Missing
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between p-3 bg-midnight-black/30 rounded-lg">
                <span className="text-sm text-pearl-white">Edge Functions</span>
                {status?.edgeFunctionsDeployed ? (
                  <Badge className="bg-electric-blue/20 text-electric-blue border-electric-blue/30">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Deployed
                  </Badge>
                ) : (
                  <Badge className="bg-glitch-red/20 text-glitch-red border-glitch-red/30">
                    <XCircle className="w-3 h-3 mr-1" />
                    Not Deployed
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between p-3 bg-midnight-black/30 rounded-lg">
                <span className="text-sm text-pearl-white">Storage</span>
                {status?.storageConfigured ? (
                  <Badge className="bg-electric-blue/20 text-electric-blue border-electric-blue/30">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Ready
                  </Badge>
                ) : (
                  <Badge className="bg-soft-blush/20 text-soft-blush border-soft-blush/30">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Auto-setup
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between p-3 bg-midnight-black/30 rounded-lg">
                <span className="text-sm text-pearl-white">Authentication</span>
                {status?.authWorking ? (
                  <Badge className="bg-electric-blue/20 text-electric-blue border-electric-blue/30">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Working
                  </Badge>
                ) : (
                  <Badge className="bg-soft-blush/20 text-soft-blush border-soft-blush/30">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Sign In
                  </Badge>
                )}
              </div>
            </div>

            {/* Quick Setup Commands */}
            {!status?.edgeFunctionsDeployed && (
              <div className="p-4 bg-electric-blue/5 border border-electric-blue/20 rounded-lg">
                <h4 className="text-sm font-medium text-electric-blue mb-3">Quick Setup Commands:</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-midnight-black/30 rounded font-mono text-xs">
                    <span className="text-muted-lavender">npm install -g supabase</span>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => copyToClipboard('npm install -g supabase')}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-midnight-black/30 rounded font-mono text-xs">
                    <span className="text-muted-lavender">supabase login</span>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => copyToClipboard('supabase login')}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-midnight-black/30 rounded font-mono text-xs">
                    <span className="text-muted-lavender">supabase functions deploy</span>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => copyToClipboard('supabase functions deploy')}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Documentation Link */}
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open('https://supabase.com/docs/guides/functions', '_blank')}
                className="text-electric-blue hover:text-electric-blue/80"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Supabase Functions Docs
              </Button>
            </div>

            {/* Refresh Button */}
            <div className="flex justify-center">
              <Button
                onClick={checkSetup}
                disabled={checking}
                className="bg-neon-lilac hover:bg-neon-lilac/90 text-midnight-black"
              >
                Recheck Status
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}