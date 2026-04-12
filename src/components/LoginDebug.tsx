import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { AlertCircle, TestTube } from 'lucide-react';

interface LoginDebugProps {
  onComplete: (userInfo: any) => void;
  onBack: () => void;
}

export function LoginDebug({ onComplete, onBack }: LoginDebugProps) {
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [testEmail, setTestEmail] = useState('test@example.com');
  const [testPassword, setTestPassword] = useState('testpassword123');
  const [isLoading, setIsLoading] = useState(false);

  const addDebugInfo = (message: string) => {
    console.log('[DEBUG]', message);
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    const checkEnvironment = async () => {
      addDebugInfo('Starting environment check...');
      
      // Check if we're in preview mode
      if (window.location.hostname.includes('figma.com') || 
          window.location.hostname.includes('make.') ||
          window.location.hostname.includes('preview')) {
        addDebugInfo('⚠️ Running in Figma Make preview environment');
      } else {
        addDebugInfo('Running in normal environment');
      }
      
      // Check Supabase client
      try {
        const { supabase } = await import('../utils/supabase/client');
        const { projectId, publicAnonKey } = await import('../utils/supabase/info');
        
        addDebugInfo(`✓ Supabase client loaded`);
        addDebugInfo(`Project ID: ${projectId}`);
        addDebugInfo(`Anon key: ${publicAnonKey.substring(0, 20)}...`);
        
        // Test session
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          addDebugInfo(`❌ Session check error: ${error.message}`);
        } else if (session) {
          addDebugInfo(`✓ Active session found`);
        } else {
          addDebugInfo(`No active session`);
        }
        
      } catch (error: any) {
        addDebugInfo(`❌ Supabase setup error: ${error.message}`);
      }
      
      // Check network connectivity
      try {
        const response = await fetch('https://httpbin.org/get', { 
          method: 'GET',
          mode: 'cors'
        });
        if (response.ok) {
          addDebugInfo('✓ External network access working');
        } else {
          addDebugInfo('❌ External network access limited');
        }
      } catch (error: any) {
        addDebugInfo(`❌ Network test failed: ${error.message}`);
      }
    };

    checkEnvironment();
  }, []);

  const testLogin = async () => {
    setIsLoading(true);
    addDebugInfo('Starting login test...');
    
    try {
      const { supabase } = await import('../utils/supabase/client');
      
      addDebugInfo(`Attempting login with: ${testEmail}`);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      });

      if (error) {
        addDebugInfo(`❌ Login failed: ${error.message}`);
        return;
      }

      if (data.user && data.session) {
        addDebugInfo(`✓ Login successful!`);
        addDebugInfo(`User ID: ${data.user.id}`);
        addDebugInfo(`Session: ${data.session.access_token.substring(0, 20)}...`);
        
        // Create mock user info for completion
        const mockUserInfo = {
          method: 'email' as const,
          contact: testEmail,
          username: 'Debug User',
          verified: true,
          joinDate: new Date(),
          xpPoints: 100,
          notificationsEnabled: true,
          privacyMode: 'high' as const
        };
        
        onComplete(mockUserInfo);
      } else {
        addDebugInfo(`❌ No user/session in response`);
      }
      
    } catch (error: any) {
      addDebugInfo(`❌ Exception during login: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testSignup = async () => {
    setIsLoading(true);
    addDebugInfo('Testing signup process...');
    
    try {
      const { supabase } = await import('../utils/supabase/client');
      
      // Generate random email for testing
      const randomEmail = `test${Date.now()}@example.com`;
      addDebugInfo(`Creating test account: ${randomEmail}`);
      
      const { data, error } = await supabase.auth.signUp({
        email: randomEmail,
        password: testPassword,
        options: {
          data: {
            username: 'Debug Test User'
          }
        }
      });

      if (error) {
        addDebugInfo(`❌ Signup failed: ${error.message}`);
        return;
      }

      if (data.user) {
        addDebugInfo(`✓ Signup successful!`);
        addDebugInfo(`User ID: ${data.user.id}`);
        
        if (data.session) {
          addDebugInfo(`✓ Session created automatically`);
          const mockUserInfo = {
            method: 'email' as const,
            contact: randomEmail,
            username: 'Debug Test User',
            verified: true,
            joinDate: new Date(),
            xpPoints: 0,
            notificationsEnabled: true,
            privacyMode: 'high' as const
          };
          onComplete(mockUserInfo);
        } else {
          addDebugInfo(`❌ No session in signup response`);
        }
      } else {
        addDebugInfo(`❌ No user in signup response`);
      }
      
    } catch (error: any) {
      addDebugInfo(`❌ Exception during signup: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const bypassLogin = () => {
    addDebugInfo('Bypassing login for testing...');
    const mockUserInfo = {
      method: 'email' as const,
      contact: 'debug@example.com',
      username: 'Debug User',
      verified: true,
      joinDate: new Date(),
      xpPoints: 100,
      notificationsEnabled: true,
      privacyMode: 'high' as const
    };
    onComplete(mockUserInfo);
  };

  return (
    <div className="min-h-screen bg-midnight-black p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <TestTube className="w-12 h-12 text-electric-blue mx-auto mb-4" />
          <h1 className="text-2xl font-headline text-pearl-white mb-2">
            Login Debug Mode
          </h1>
          <p className="text-muted-lavender/70 font-body">
            Diagnosing login issues in preview environment
          </p>
        </div>

        {/* Debug Info Panel */}
        <div className="bg-midnight-black/80 border border-muted-lavender/20 rounded-xl p-4">
          <h3 className="text-lg font-headline text-pearl-white mb-3">Debug Information</h3>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {debugInfo.map((info, index) => (
              <div key={index} className="text-sm font-mono text-muted-lavender/80">
                {info}
              </div>
            ))}
          </div>
        </div>

        {/* Test Controls */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email" className="text-pearl-white">Test Email</Label>
              <Input
                id="email"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="bg-input-background border-muted-lavender/30 text-pearl-white"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-pearl-white">Test Password</Label>
              <Input
                id="password"
                type="password"
                value={testPassword}
                onChange={(e) => setTestPassword(e.target.value)}
                className="bg-input-background border-muted-lavender/30 text-pearl-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={testLogin}
              disabled={isLoading}
              className="bg-electric-blue hover:bg-electric-blue/90 text-midnight-black"
            >
              {isLoading ? 'Testing...' : 'Test Login'}
            </Button>
            
            <Button
              onClick={testSignup}
              disabled={isLoading}
              className="bg-neon-lilac hover:bg-neon-lilac/90 text-midnight-black"
            >
              {isLoading ? 'Testing...' : 'Test Signup'}
            </Button>
            
            <Button
              onClick={bypassLogin}
              className="bg-soft-blush hover:bg-soft-blush/90 text-midnight-black"
            >
              Bypass Login
            </Button>
          </div>
        </div>

        {/* Warning */}
        <div className="flex items-start space-x-3 p-4 bg-glitch-red/10 border border-glitch-red/20 rounded-xl">
          <AlertCircle className="w-5 h-5 text-glitch-red flex-shrink-0 mt-0.5" />
          <div className="text-sm text-glitch-red">
            <p className="font-medium mb-1">Preview Environment Limitations:</p>
            <ul className="list-disc list-inside space-y-1 text-glitch-red/80">
              <li>Supabase authentication may not work in preview</li>
              <li>Network requests may be blocked or limited</li>
              <li>LocalStorage may not persist between sessions</li>
              <li>Use "Bypass Login" to test the social feed functionality</li>
            </ul>
          </div>
        </div>

        {/* Back Button */}
        <div className="text-center">
          <Button
            onClick={onBack}
            className="bg-transparent border border-muted-lavender/30 text-muted-lavender hover:bg-muted-lavender/10"
          >
            Back to Normal Login
          </Button>
        </div>
      </div>
    </div>
  );
}