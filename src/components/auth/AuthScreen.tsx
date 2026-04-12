import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { GoogleAuthButton } from './GoogleAuthButton';
import { EmailSignupForm } from './EmailSignupForm';
import { EmailLoginForm } from './EmailLoginForm';
import { PhoneAuthForm } from './PhoneAuthForm';
import { PasswordReset } from './PasswordReset';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import crystalLogo from 'figma:asset/e22313690bdd7d3499ac6d9e1c84f155bebc32cb.png';

interface AuthScreenProps {
  defaultTab?: 'login' | 'signup';
  onAuthComplete: () => void;
  onBack: () => void;
}

export function AuthScreen({ defaultTab = 'signup', onAuthComplete, onBack }: AuthScreenProps) {
  const [view, setView] = useState<'auth' | 'reset' | 'phone'>('auth');
  const [googleError, setGoogleError] = useState('');

  if (view === 'reset') {
    return (
      <AuthShell>
        <PasswordReset onBack={() => setView('auth')} />
      </AuthShell>
    );
  }

  if (view === 'phone') {
    return (
      <AuthShell>
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-bold font-display text-pearl-white">Sign in with phone</h2>
            <p className="text-sm text-muted-lavender/70">We'll text you a verification code</p>
          </div>
          <PhoneAuthForm onAuthComplete={onAuthComplete} />
          <div className="text-center pt-2">
            <button onClick={() => setView('auth')} className="text-sm text-muted-lavender/50 hover:text-pearl-white transition-colors">
              <ArrowLeft className="w-3 h-3 inline mr-1" />
              Use email instead
            </button>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell onBack={onBack}>
      <Tabs defaultValue={defaultTab} className="w-full" key={defaultTab}>
        <TabsList className="w-full grid grid-cols-2 mb-6 bg-muted/10 border border-border/30">
          <TabsTrigger value="signup" className="font-semibold data-[state=active]:bg-neon-lilac/20 data-[state=active]:text-pearl-white">
            Sign Up
          </TabsTrigger>
          <TabsTrigger value="login" className="font-semibold data-[state=active]:bg-neon-lilac/20 data-[state=active]:text-pearl-white">
            Log In
          </TabsTrigger>
        </TabsList>

        <div className="space-y-4">
          <GoogleAuthButton onError={setGoogleError} />

          {googleError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-glitch-red/10 border border-glitch-red/20" role="alert">
              <AlertCircle className="w-4 h-4 text-glitch-red shrink-0" />
              <p className="text-sm text-glitch-red">{googleError}</p>
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/30" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-midnight-black px-3 text-muted-lavender/50">or continue with email</span>
            </div>
          </div>

          <TabsContent value="signup" className="mt-0 space-y-0">
            <EmailSignupForm onSignupComplete={onAuthComplete} />
          </TabsContent>

          <TabsContent value="login" className="mt-0 space-y-0">
            <EmailLoginForm
              onLoginComplete={onAuthComplete}
              onForgotPassword={() => setView('reset')}
            />
          </TabsContent>
        </div>

        <div className="mt-4 space-y-3">
          <button
            onClick={() => setView('phone')}
            className="w-full text-center text-sm text-electric-blue hover:text-electric-blue/80 transition-colors py-2"
          >
            Use phone number instead
          </button>

          <p className="text-center text-xs text-muted-lavender/40 leading-relaxed">
            By continuing, you confirm you're 13+ and agree to our{' '}
            <button className="text-muted-lavender/60 underline hover:text-pearl-white transition-colors">Terms</button>
            {' '}and{' '}
            <button className="text-muted-lavender/60 underline hover:text-pearl-white transition-colors">Privacy Policy</button>
          </p>
        </div>
      </Tabs>
    </AuthShell>
  );
}

function AuthShell({ children, onBack }: { children: React.ReactNode; onBack?: () => void }) {
  return (
    <div className="min-h-screen bg-midnight-black flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <img src={crystalLogo} alt="Tribe Social" className="w-20 h-20 mx-auto object-contain" />
          <h1 className="text-2xl font-bold font-display text-pearl-white">Tribe Social</h1>
        </div>

        {children}

        {onBack && (
          <div className="text-center">
            <button
              onClick={onBack}
              className="text-sm text-muted-lavender/50 hover:text-pearl-white transition-colors"
            >
              <ArrowLeft className="w-3 h-3 inline mr-1" />
              Back to home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
