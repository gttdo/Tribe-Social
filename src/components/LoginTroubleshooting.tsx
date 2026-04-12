import React, { useState } from 'react';
import { Button } from './ui/button';
import { AlertCircle, CheckCircle, HelpCircle, RefreshCcw, Wifi, Server, Key } from 'lucide-react';

interface LoginTroubleshootingProps {
  onClose: () => void;
  onRetryLogin: () => void;
}

export function LoginTroubleshooting({ onClose, onRetryLogin }: LoginTroubleshootingProps) {
  const [runningChecks, setRunningChecks] = useState(false);
  const [checkResults, setCheckResults] = useState<{
    internet: boolean | null;
    server: boolean | null;
    credentials: boolean | null;
  }>({
    internet: null,
    server: null,
    credentials: null
  });

  const runDiagnostics = async () => {
    setRunningChecks(true);
    const results = { internet: false, server: false, credentials: null };

    // Check internet connectivity
    try {
      const response = await fetch('https://httpbin.org/get', { 
        mode: 'no-cors',
        cache: 'no-cache'
      });
      results.internet = true;
    } catch (error) {
      results.internet = false;
    }

    // Check server connectivity
    try {
      const { checkHealth } = await import('../utils/edge');
      await checkHealth();
      results.server = true;
    } catch (error) {
      results.server = false;
    }

    setCheckResults(results);
    setRunningChecks(false);
  };

  const clearStorage = () => {
    try {
      // Clear all localStorage related to authentication
      Object.keys(localStorage).forEach(key => {
        if (key.includes('supabase') || key.includes('tribe') || key.includes('auth')) {
          localStorage.removeItem(key);
        }
      });

      // Clear sessionStorage as well
      Object.keys(sessionStorage).forEach(key => {
        if (key.includes('supabase') || key.includes('tribe') || key.includes('auth')) {
          sessionStorage.removeItem(key);
        }
      });

      alert('Storage cleared successfully. Please try logging in again.');
    } catch (error) {
      console.error('Error clearing storage:', error);
      alert('Failed to clear storage. Please manually clear your browser cache.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-midnight-black border border-muted-lavender/30 rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto soft-blur">
        <div className="text-center space-y-4 mb-8">
          <div className="flex justify-center">
            <HelpCircle className="w-12 h-12 text-electric-blue opacity-80" />
          </div>
          
          <h1 className="text-2xl font-headline text-pearl-white">
            Login Troubleshooting
          </h1>
          <p className="text-muted-lavender/70 font-body">
            Let's help you get back into your realm
          </p>
        </div>

        <div className="space-y-6">
          {/* Diagnostics Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-body font-medium text-pearl-white">
              System Diagnostics
            </h2>
            
            <Button
              onClick={runDiagnostics}
              disabled={runningChecks}
              className="w-full p-4 bg-gradient-to-r from-electric-blue/20 to-neon-lilac/20 border border-electric-blue/30 text-electric-blue hover:from-electric-blue/30 hover:to-neon-lilac/30 rounded-xl transition-all duration-300"
            >
              {runningChecks ? (
                <>
                  <div className="w-5 h-5 mr-2 border-2 border-electric-blue/30 border-t-electric-blue rounded-full animate-spin" />
                  Running Diagnostics...
                </>
              ) : (
                <>
                  <RefreshCcw className="w-5 h-5 mr-2" />
                  Run System Check
                </>
              )}
            </Button>

            {(checkResults.internet !== null || checkResults.server !== null) && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-input-background border border-muted-lavender/20">
                  <div className="flex items-center space-x-3">
                    <Wifi className="w-5 h-5 text-electric-blue" />
                    <span className="text-pearl-white font-body">Internet Connection</span>
                  </div>
                  {checkResults.internet === true ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-glitch-red" />
                  )}
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-input-background border border-muted-lavender/20">
                  <div className="flex items-center space-x-3">
                    <Server className="w-5 h-5 text-soft-blush" />
                    <span className="text-pearl-white font-body">Server Connection</span>
                  </div>
                  {checkResults.server === true ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-glitch-red" />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Common Solutions */}
          <div className="space-y-4">
            <h2 className="text-lg font-body font-medium text-pearl-white">
              Common Solutions
            </h2>
            
            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-input-background border border-muted-lavender/20">
                <h3 className="font-body font-medium text-pearl-white mb-2">
                  Double-check your credentials
                </h3>
                <p className="text-muted-lavender/70 text-sm mb-3">
                  Make sure you're using the correct email/phone and password. Remember:
                </p>
                <ul className="text-muted-lavender/60 text-sm space-y-1 ml-4">
                  <li>• Passwords are case-sensitive</li>
                  <li>• Phone numbers should be 10 digits (US format)</li>
                  <li>• Try the email you originally signed up with</li>
                </ul>
              </div>

              <div className="p-4 rounded-lg bg-input-background border border-muted-lavender/20">
                <h3 className="font-body font-medium text-pearl-white mb-2">
                  Clear browser data
                </h3>
                <p className="text-muted-lavender/70 text-sm mb-3">
                  Sometimes old session data can cause conflicts. Clear your stored data:
                </p>
                <Button
                  onClick={clearStorage}
                  className="mt-2 px-4 py-2 bg-glitch-red/20 border border-glitch-red/30 text-glitch-red hover:bg-glitch-red/30 rounded-lg transition-all duration-300"
                >
                  <Key className="w-4 h-4 mr-2" />
                  Clear Stored Data
                </Button>
              </div>

              <div className="p-4 rounded-lg bg-input-background border border-muted-lavender/20">
                <h3 className="font-body font-medium text-pearl-white mb-2">
                  OAuth Login Issues
                </h3>
                <p className="text-muted-lavender/70 text-sm mb-3">
                  If Google or Facebook login isn't working:
                </p>
                <ul className="text-muted-lavender/60 text-sm space-y-1 ml-4">
                  <li>• These providers need to be configured by an admin</li>
                  <li>• Use email or phone login instead for now</li>
                  <li>• Check if popups are blocked in your browser</li>
                </ul>
              </div>

              <div className="p-4 rounded-lg bg-input-background border border-muted-lavender/20">
                <h3 className="font-body font-medium text-pearl-white mb-2">
                  Still having trouble?
                </h3>
                <p className="text-muted-lavender/70 text-sm mb-3">
                  Try these additional steps:
                </p>
                <ul className="text-muted-lavender/60 text-sm space-y-1 ml-4">
                  <li>• Refresh the page and try again</li>
                  <li>• Disable browser extensions temporarily</li>
                  <li>• Try using a different browser or incognito mode</li>
                  <li>• Check if you need to create a new account</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <Button
              onClick={onRetryLogin}
              className="flex-1 p-4 bg-gradient-to-r from-neon-lilac to-electric-blue hover:from-neon-lilac/90 hover:to-electric-blue/90 text-white font-body font-medium rounded-xl transition-all duration-300"
            >
              Try Login Again
            </Button>
            
            <Button
              onClick={onClose}
              className="flex-1 p-4 bg-transparent border border-muted-lavender/30 text-muted-lavender hover:bg-muted-lavender/10 hover:text-white rounded-xl transition-all duration-300"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}