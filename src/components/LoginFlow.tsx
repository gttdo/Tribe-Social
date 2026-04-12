import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ArrowLeft, ArrowRight, Mail, Phone, Lock, Eye, EyeOff, User, AlertCircle, HelpCircle } from 'lucide-react';
import { UserInfo } from '../utils/app-constants';
import { LoginTroubleshooting } from './LoginTroubleshooting';

interface LoginFlowProps {
  onComplete: (info: UserInfo) => void;
  onBack: () => void;
}

type LoginStep = 'method' | 'credentials' | 'signing-in';

export function LoginFlow({ onComplete, onBack }: LoginFlowProps) {
  const [step, setStep] = useState<LoginStep>('method');
  const [method, setMethod] = useState<'email' | 'phone' | null>(null);
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);

  const handleMethodSelect = (selectedMethod: 'email' | 'phone') => {
    setMethod(selectedMethod);
    setError('');
    setStep('credentials');
  };

  const handleSignIn = async () => {
    if (!contact.trim() || !password) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const { supabase } = await import('../utils/supabase/client');
      
      // Clean phone number for consistent format (remove formatting)
      let signInContact = contact.trim();
      if (method === 'phone') {
        signInContact = contact.replace(/[\s\-\(\)]/g, ''); // Remove formatting characters
      }
      
      // Try different email formats for sign in
      let signInEmails = [];
      
      if (method === 'email') {
        signInEmails = [signInContact]; // Just use the email as-is
      } else {
        // For phone numbers, try multiple possible formats that might exist in the database
        signInEmails = [
          `${signInContact}@phone-signup.tribal`, // Current format
          `${signInContact}@tribal.app`, // Alternative format
          signInContact // Direct phone (in case it was stored as email somehow)
        ];
      }
      
      console.log('Attempting sign in with contact:', signInContact, 'method:', method);
      console.log('Will try these email formats:', signInEmails);
      
      let signInSuccess = false;
      let userData = null;
      let sessionData = null;
      let lastError = null;
      
      // Try each possible email format
      for (const emailToTry of signInEmails) {
        try {
          console.log('Trying sign in with email:', emailToTry);
          
          const { data, error: signInError } = await supabase.auth.signInWithPassword({
            email: emailToTry,
            password: password
          });

          if (signInError) {
            console.log('Sign in attempt failed for', emailToTry, ':', signInError.message);
            lastError = signInError;
            continue; // Try next format
          }

          if (data.user && data.session) {
            console.log('✅ Sign in successful with:', emailToTry);
            userData = data.user;
            sessionData = data.session;
            signInSuccess = true;
            break; // Stop trying other formats
          }
          
        } catch (attemptError) {
          console.log('Exception during sign in attempt with', emailToTry, ':', attemptError);
          lastError = attemptError;
          continue; // Try next format
        }
      }
      
      if (!signInSuccess) {
        console.error('All sign in attempts failed. Last error:', lastError);
        
        // Show user-friendly error messages
        if (lastError?.message?.includes('Invalid login credentials')) {
          if (method === 'email') {
            setError('Invalid email or password. Please check your credentials and try again.');
          } else {
            setError('Invalid phone number or password. Please check your credentials and try again.');
          }
        } else if (lastError?.message?.includes('Email not confirmed')) {
          setError('Please verify your email before signing in.');
        } else if (lastError?.message?.includes('Too many requests')) {
          setError('Too many login attempts. Please wait a moment before trying again.');
        } else {
          const contactType = method === 'email' ? 'email' : 'phone number';
          setError(`Unable to sign in with this ${contactType}. Please check your credentials or create a new account.`);
        }
        setIsLoading(false);
        return;
      }

      // Sign in was successful
      console.log('User successfully signed in, session established');
      
      // Wait a moment for session to be fully established
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Try to get additional user profile data from the server
      let userProfile = null;
      try {
        const { makeAuthenticatedRequest } = await import('../utils/supabase/client');
        const profileResponse = await makeAuthenticatedRequest('/make-server-70df0d6e/users/profile');
        if (profileResponse.profile) {
          userProfile = profileResponse.profile;
          console.log('Retrieved user profile:', userProfile);
        }
      } catch (profileError) {
        console.log('Could not retrieve user profile (this is okay for new users):', profileError);
      }
      
      // Create UserInfo object with available data
      const userInfo: UserInfo = {
        method: method!,
        contact: signInContact,
        username: userProfile?.username || userData.user_metadata?.username || userData.user_metadata?.name || 'User',
        verified: true,
        joinDate: new Date(userData.created_at),
        xpPoints: userProfile?.xp || 0,
        notificationsEnabled: true,
        privacyMode: 'high'
      };
      
      console.log('Completing login with user info:', userInfo);
      console.log('About to call onComplete...');
      setIsLoading(false);
      
      // Call completion handler
      onComplete(userInfo);
      
    } catch (error) {
      console.error('Critical sign in error:', error);
      
      const errorMsg = error?.message || 'Something went wrong during sign in';
      
      // Check if this is a network connectivity issue
      if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError') || errorMsg.includes('TypeError')) {
        setError('Unable to connect to our servers. Please check your internet connection and try again.');
      } else {
        setError('Something went wrong during sign in. Please try again.');
      }
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const { supabase } = await import('../utils/supabase/client');
      
      console.log('Initiating Google OAuth login...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });

      if (error) {
        console.error('Google OAuth error:', error);
        if (error.message.includes('provider is not enabled')) {
          setError('Google login is not enabled yet. Please use email or phone login instead.');
        } else {
          setError(`Google login failed: ${error.message}`);
        }
        setIsLoading(false);
        return;
      }

      // OAuth redirect will happen automatically
      console.log('Google OAuth redirect initiated');
      
    } catch (error) {
      console.error('Google login error:', error);
      setError('Failed to initiate Google login. Please try again.');
      setIsLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const { supabase } = await import('../utils/supabase/client');
      
      console.log('Initiating Facebook OAuth login...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: window.location.origin
        }
      });

      if (error) {
        console.error('Facebook OAuth error:', error);
        if (error.message.includes('provider is not enabled')) {
          setError('Facebook login is not enabled yet. Please use email or phone login instead.');
        } else {
          setError(`Facebook login failed: ${error.message}`);
        }
        setIsLoading(false);
        return;
      }

      // OAuth redirect will happen automatically
      console.log('Facebook OAuth redirect initiated');
      
    } catch (error) {
      console.error('Facebook login error:', error);
      setError('Failed to initiate Facebook login. Please try again.');
      setIsLoading(false);
    }
  };
  
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSignIn();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading && contact.trim() && password) {
      e.preventDefault();
      handleSignIn();
    }
  };

  return (
    <div className="min-h-screen bg-midnight-black relative overflow-auto">
      {/* Floating aesthetic elements */}
      <div className="absolute top-20 left-8 w-3 h-3 bg-soft-blush/40 rounded-full animate-pulse float opacity-60" />
      <div className="absolute top-32 right-12 w-2 h-2 bg-neon-lilac/50 rounded-full animate-bounce opacity-50" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-40 left-16 w-4 h-4 bg-electric-blue/30 rounded-full animate-pulse float opacity-40" style={{ animationDelay: '2s' }} />
      
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Step 1: Choose Sign-in Method */}
          {step === 'method' && (
            <div className="space-y-8">
              <div className="text-center space-y-4">
                <div className="flex justify-center mb-6">
                  <User className="w-12 h-12 text-neon-lilac opacity-80" />
                </div>
                
                <h1 className="text-2xl sm:text-3xl font-headline text-pearl-white">
                  Welcome back
                </h1>
                <p className="text-muted-lavender/70 font-body">
                  Choose how you'd like to sign in
                </p>
              </div>

              {error && (
                <div className="flex items-center space-x-2 text-sm text-glitch-red p-3 rounded-lg bg-glitch-red/10 border border-glitch-red/20">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-4">
                {/* Social Login Buttons */}
                <Button
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full p-6 h-auto text-left rounded-2xl bg-transparent border-2 border-glitch-red/30 text-glitch-red hover:bg-glitch-red/10 hover:border-glitch-red/50 hover:text-pearl-white transition-all duration-300 soft-blur disabled:opacity-50"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    </div>
                    <div className="space-y-1">
                      <div className="font-body font-medium">Continue with Google</div>
                      <div className="text-sm opacity-70">Quick login with Google account</div>
                    </div>
                  </div>
                </Button>

                <Button
                  onClick={handleFacebookLogin}
                  disabled={isLoading}
                  className="w-full p-6 h-auto text-left rounded-2xl bg-transparent border-2 border-electric-blue/30 text-electric-blue hover:bg-electric-blue/10 hover:border-electric-blue/50 hover:text-pearl-white transition-all duration-300 soft-blur disabled:opacity-50"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-6 h-6 bg-[#1877F2] rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </div>
                    <div className="space-y-1">
                      <div className="font-body font-medium">Continue with Facebook</div>
                      <div className="text-sm opacity-70">Quick login with Facebook account</div>
                    </div>
                  </div>
                </Button>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-muted-lavender/20" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-midnight-black text-muted-lavender/60 font-body">or sign in with</span>
                  </div>
                </div>

                <Button
                  onClick={() => handleMethodSelect('phone')}
                  className="w-full p-6 h-auto text-left rounded-2xl bg-transparent border-2 border-muted-lavender/30 text-muted-lavender hover:bg-muted-lavender/10 hover:border-muted-lavender/50 hover:text-pearl-white transition-all duration-300 soft-blur"
                >
                  <div className="flex items-center space-x-4">
                    <Phone className="w-6 h-6 text-soft-blush" />
                    <div className="space-y-1">
                      <div className="font-body font-medium">Sign in with phone</div>
                      <div className="text-sm opacity-70">Use your phone number</div>
                    </div>
                  </div>
                </Button>

                <Button
                  onClick={() => handleMethodSelect('email')}
                  className="w-full p-6 h-auto text-left rounded-2xl bg-transparent border-2 border-muted-lavender/30 text-muted-lavender hover:bg-muted-lavender/10 hover:border-muted-lavender/50 hover:text-pearl-white transition-all duration-300 soft-blur"
                >
                  <div className="flex items-center space-x-4">
                    <Mail className="w-6 h-6 text-electric-blue" />
                    <div className="space-y-1">
                      <div className="font-body font-medium">Sign in with email</div>
                      <div className="text-sm opacity-70">Use your email address</div>
                    </div>
                  </div>
                </Button>
              </div>

              <div className="text-center">
                <Button
                  onClick={onBack}
                  className="p-3 bg-transparent border border-muted-lavender/30 text-muted-lavender hover:bg-muted-lavender/10 hover:text-white rounded-xl transition-all duration-300"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </div>

              {/* Need Help Button */}
              <div className="text-center">
                <Button
                  onClick={() => setShowTroubleshooting(true)}
                  className="p-3 px-6 bg-transparent border border-electric-blue/30 text-electric-blue hover:bg-electric-blue/10 hover:text-white rounded-xl transition-all duration-300 text-sm"
                >
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Need Help?
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Enter Credentials */}
          {step === 'credentials' && method && (
            <div className="space-y-8">
              <div className="text-center space-y-4">
                <div className="flex justify-center mb-6">
                  {method === 'email' ? (
                    <Mail className="w-12 h-12 text-electric-blue opacity-80" />
                  ) : (
                    <Phone className="w-12 h-12 text-soft-blush opacity-80" />
                  )}
                </div>
                
                <h1 className="text-2xl sm:text-3xl font-headline text-pearl-white">
                  Sign in to your realm
                </h1>
                <p className="text-muted-lavender/70 font-body">
                  Enter your credentials to continue your journey
                </p>
              </div>

              <div className="space-y-6">
                <form onSubmit={handleFormSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="contact" className="text-pearl-white font-body">
                      {method === 'email' ? 'Email Address' : 'Phone Number'}
                    </Label>
                    <Input
                      id="contact"
                      type={method === 'email' ? 'email' : 'tel'}
                      value={contact}
                      onChange={(e) => {
                        let value = e.target.value;
                        
                        // If phone method, only allow numbers
                        if (method === 'phone') {
                          // Allow completely clearing the field
                           if (value === '') {
                             setContact('');
                             setError('');
                             return;
                           }
                           
                           // Remove all non-digit characters and limit to 10 digits
                           const numbers = value.replace(/\D/g, '');
                           value = numbers.slice(0, 10);
                          
                          // Format phone number as user types (XXX) XXX-XXXX
                          if (value.length > 6) {
                            value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6)}`;
                          } else if (value.length > 3) {
                            value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
                          }
                        }
                        
                        setContact(value);
                        setError('');
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder={method === 'email' ? 'your@email.com' : '(555) 123-4567'}
                      className="p-4 text-lg rounded-xl bg-input-background border-muted-lavender/30 text-pearl-white placeholder:text-muted-lavender/50 focus:border-neon-lilac focus:ring-neon-lilac soft-blur"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-pearl-white font-body">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setError('');
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Enter your password"
                        className="p-4 pr-12 text-lg rounded-xl bg-input-background border-muted-lavender/30 text-pearl-white placeholder:text-muted-lavender/50 focus:border-neon-lilac focus:ring-neon-lilac soft-blur"
                      />
                      <Button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 h-auto bg-transparent text-muted-lavender/50 hover:text-pearl-white transition-colors duration-200"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center space-x-2 text-sm text-glitch-red p-3 rounded-lg bg-glitch-red/10 border border-glitch-red/20">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={!contact.trim() || !password || isLoading}
                    className="w-full p-4 bg-gradient-to-r from-neon-lilac to-electric-blue hover:from-neon-lilac/90 hover:to-electric-blue/90 disabled:from-muted-lavender/20 disabled:to-muted-lavender/20 disabled:text-muted-lavender/50 text-white font-body font-medium rounded-xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-105 dreamy-glow border-0"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        <Lock className="w-5 h-5 mr-2" />
                        Sign In
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                </form>

                <div className="text-center">
                  <button 
                    className="text-sm text-muted-lavender/70 hover:text-electric-blue transition-colors duration-300"
                  >
                    Forgot your password?
                  </button>
                </div>
                
              </div>

              <div className="flex flex-col items-center space-y-4">
                <Button
                  onClick={() => setStep('method')}
                  className="p-3 bg-transparent border border-muted-lavender/30 text-muted-lavender hover:bg-muted-lavender/10 hover:text-white rounded-xl transition-all duration-300"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                
                {/* Need Help Button */}
                <Button
                  onClick={() => setShowTroubleshooting(true)}
                  className="p-2 px-5 bg-transparent border border-electric-blue/30 text-electric-blue hover:bg-electric-blue/10 hover:text-white rounded-xl transition-all duration-300 text-sm"
                >
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Need Help?
                </Button>
              </div>
            </div>
          )}

          {/* Troubleshooting Modal */}
          {showTroubleshooting && (
            <LoginTroubleshooting
              onClose={() => setShowTroubleshooting(false)}
              onRetryLogin={() => {
                setShowTroubleshooting(false);
                setError('');
                setContact('');
                setPassword('');
                setStep('method');
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}