import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { ArrowLeft, ArrowRight, Mail, Phone, Shield, CheckCircle, User, Lock, Eye, EyeOff, Info, Sparkles, Shuffle, Wifi } from 'lucide-react';
import { UserInfo } from '../App';
import { LegalDocuments } from './LegalDocuments';
import { ConnectivityTest } from './ConnectivityTest';

interface SignupFlowProps {
  onComplete: (info: UserInfo) => void;
  onBack: () => void;
  onSwitchToLogin?: () => void;
}

type SignupStep = 'method' | 'credentials' | 'consent' | 'creating' | 'welcome' | 'complete' | 'privacy-policy' | 'terms-of-service';

export function SignupFlow({ onComplete, onBack, onSwitchToLogin }: SignupFlowProps) {
  const [step, setStep] = useState<SignupStep>('method'); // Start with method selection instead of consent
  
  // Step 1: Consent (moved to after credentials)
  const [isOver13, setIsOver13] = useState(false);
  const [acceptsTerms, setAcceptsTerms] = useState(false);
  
  // Step 2: Auth Method
  const [method, setMethod] = useState<'email' | 'phone' | null>(null);
  
  // Step 3: Credentials
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  
  // Step 4: Creating account
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  
  // Add error state for account creation
  const [credentialsError, setCredentialsError] = useState('');
  const [showConnectivityTest, setShowConnectivityTest] = useState(false);

  // Random username generator
  const generateRandomUsername = () => {
    const prefixes = [
      'cyber', 'neon', 'void', 'echo', 'glitch', 'pixel', 'shadow', 'lunar', 'cosmic', 'digital',
      'dream', 'mirror', 'prism', 'ghost', 'drift', 'vibe', 'pulse', 'flux', 'wave', 'mystic',
      'crystal', 'ember', 'frost', 'storm', 'dawn', 'dusk', 'star', 'moon', 'sun', 'nova',
      'zen', 'flow', 'glow', 'spark', 'beam', 'aura', 'mist', 'haze', 'blur', 'fade'
    ];
    
    const suffixes = [
      'wanderer', 'dreamer', 'seeker', 'keeper', 'weaver', 'dancer', 'walker', 'rider', 'sage',
      'mystic', 'soul', 'spirit', 'phantom', 'whisper', 'echo', 'shade', 'glow', 'beam',
      'vibe', 'flow', 'drift', 'pulse', 'wave', 'storm', 'frost', 'fire', 'void', 'star',
      'moon', 'sun', 'light', 'dark', 'wild', 'free', 'lost', 'found', 'born', 'made'
    ];
    
    const connectors = ['_', '_', '_', '', ''];
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const connector = connectors[Math.floor(Math.random() * connectors.length)];
    
    const addNumber = Math.random() < 0.3;
    const number = addNumber ? Math.floor(Math.random() * 999) + 1 : '';
    
    const generated = `${prefix}${connector}${suffix}${number}`;
    
    if (generated.length > 20) {
      const shortPrefix = prefix.slice(0, 4);
      const shortSuffix = suffix.slice(0, 4);
      return `${shortPrefix}_${shortSuffix}${number}`.slice(0, 20);
    }
    
    return generated;
  };

  // Username validation
  const isValidUsername = (name: string) => {
    return /^[a-zA-Z0-9_]{3,20}$/.test(name);
  };

  const checkUsernameAvailability = async (name: string) => {
    if (!isValidUsername(name)) {
      setIsUsernameAvailable(false);
      return;
    }
    
    setIsCheckingUsername(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      setIsUsernameAvailable(true);
    } catch (error) {
      setIsUsernameAvailable(false);
    } finally {
      setIsCheckingUsername(false);
    }
  };

  // Email validation
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  // Phone handling and validation
  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const numbers = value.replace(/\D/g, '');
    
    // Limit to 10 digits
    const limitedNumbers = numbers.slice(0, 10);
    
    // Format as (XXX) XXX-XXXX if we have enough digits
    if (limitedNumbers.length === 0) {
      return '';
    } else if (limitedNumbers.length <= 3) {
      return limitedNumbers;
    } else if (limitedNumbers.length <= 6) {
      return `(${limitedNumbers.slice(0, 3)}) ${limitedNumbers.slice(3)}`;
    } else {
      return `(${limitedNumbers.slice(0, 3)}) ${limitedNumbers.slice(3, 6)}-${limitedNumbers.slice(6)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Allow completely clearing the field
    if (inputValue === '') {
      setPhone('');
      return;
    }
    
    // Format the phone number
    const formattedPhone = formatPhoneNumber(inputValue);
    setPhone(formattedPhone);
  };

  const isValidPhone = (phone: string) => {
    const phoneRegex = /^[0-9]{10}$/;
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    return phoneRegex.test(cleanPhone);
  };

  // Step handlers
  const handleConsentContinue = async () => {
    if (!isOver13 || !acceptsTerms) return;
    
    setStep('creating');
    setIsCreatingAccount(true);
    
    try {
      const { makePublicRequest } = await import('../utils/supabase/client');
      
      const contactValue = method === 'email' ? email : phone.replace(/[\s\-\(\)]/g, '');
      
      console.log('Starting signup process with:', {
        method,
        username: username.toLowerCase(),
        email: method === 'email' ? email : `${phone.replace(/[\s\-\(\)]/g, '')}@phone-signup.tribal`,
      });

      const response = await makePublicRequest('/make-server-70df0d6e/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: method === 'email' ? email : `${phone.replace(/[\s\-\(\)]/g, '')}@phone-signup.tribal`,
          password,
          username: username.toLowerCase(),
          name: username
        })
      });

      console.log('Signup API response:', response);

      if (response.error) {
        let errorMessage = response.error;
        
        if (response.error.includes('email already exists')) {
          errorMessage = method === 'email' 
            ? 'This email is already registered. Try signing in instead.'
            : 'This phone number is already registered. Try signing in instead.';
        } else if (response.error.includes('phone number already exists')) {
          errorMessage = 'This phone number is already registered. Try signing in instead.';
        } else if (response.error.includes('Username already taken')) {
          errorMessage = 'This username is already taken. Please choose a different one.';
        }
        
        console.error('Signup error from server:', response.error);
        if (response.details) {
          console.error('Error details:', response.details);
        }
        
        throw new Error(errorMessage);
      }

      // If signup was successful, try to sign in
      try {
        const { supabase } = await import('../utils/supabase/client');
        
        const signInEmail = method === 'email' ? email : `${phone.replace(/[\s\-\(\)]/g, '')}@phone-signup.tribal`;
        
        console.log('Attempting auto sign-in with email:', signInEmail);
        
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: signInEmail,
          password: password
        });

        if (signInError) {
          console.error('Auto sign-in error after signup:', signInError);
          // Don't throw here - the account was created successfully, just couldn't auto-login
        } else {
          console.log('User successfully signed in after signup');
        }
      } catch (signInErr) {
        console.error('Sign-in attempt error:', signInErr);
        // Don't throw here - the account was created successfully
      }

      setIsCreatingAccount(false);
      setStep('welcome');
      
      setTimeout(() => {
        setStep('complete');
        
        const userInfo: UserInfo = {
          method: method!,
          contact: contactValue,
          username,
          verified: true,
          joinDate: new Date(),
          xpPoints: 0,
          notificationsEnabled: true,
          privacyMode: 'high'
        };
        
        setTimeout(() => onComplete(userInfo), 2000);
      }, 2000);

    } catch (error) {
      console.error('Account creation error:', error);
      setIsCreatingAccount(false);
      setStep('credentials');
      
      const errorMsg = error?.message || 'Account creation failed';
      
      // Check if this is a network connectivity issue
      if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError') || errorMsg.includes('TypeError')) {
        setCredentialsError('Unable to connect to our servers. Please check your internet connection and try again.');
      } else if (errorMsg.includes('already registered') || errorMsg.includes('email already exists')) {
        setCredentialsError('This email is already registered. Try signing in instead.');
      } else if (errorMsg.includes('Username already taken')) {
        setCredentialsError('This username is already taken. Please choose a different one.');
      } else {
        setCredentialsError(`Account creation failed: ${errorMsg}`);
      }
    }
  };

  const handleMethodSelect = (selectedMethod: 'email' | 'phone') => {
    setMethod(selectedMethod);
    setCredentialsError('');
    setStep('credentials');
  };

  const handleGenerateUsername = () => {
    const newUsername = generateRandomUsername();
    setUsername(newUsername);
    setIsUsernameAvailable(null);
  };

  const handleCreateCredentials = () => {
    if (!canContinueCredentials) return;
    
    // Go to consent step instead of creating account immediately
    setStep('consent');
  };

  // Legal document handlers
  const handleShowPrivacyPolicy = () => {
    setStep('privacy-policy');
  };

  const handleShowTermsOfService = () => {
    setStep('terms-of-service');
  };

  const handleBackFromLegal = () => {
    setStep('consent');
  };

  // Username change handler with debounced checking
  React.useEffect(() => {
    if (!username) {
      setIsUsernameAvailable(null);
      return;
    }
    
    const timeoutId = setTimeout(() => {
      checkUsernameAvailability(username);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [username]);

  // Validation logic for credentials step
  const isContactValid = method === 'email' ? isValidEmail(email) : isValidPhone(phone);
  
  const canContinueCredentials = username && 
    password && 
    confirmPassword && 
    password === confirmPassword && 
    password.length >= 8 && 
    isUsernameAvailable === true &&
    isContactValid;

  // Show connectivity test
  if (showConnectivityTest) {
    return <ConnectivityTest onClose={() => setShowConnectivityTest(false)} />;
  }

  // Show legal documents
  if (step === 'privacy-policy') {
    return <LegalDocuments document="privacy" onBack={handleBackFromLegal} />;
  }

  if (step === 'terms-of-service') {
    return <LegalDocuments document="terms" onBack={handleBackFromLegal} />;
  }

  return (
    <div className="min-h-screen bg-midnight-black relative overflow-auto">
      {/* Floating aesthetic elements */}
      <div className="absolute top-20 left-8 w-3 h-3 bg-soft-blush/40 rounded-full animate-pulse float opacity-60" />
      <div className="absolute top-32 right-12 w-2 h-2 bg-neon-lilac/50 rounded-full animate-bounce opacity-50" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-40 left-16 w-4 h-4 bg-electric-blue/30 rounded-full animate-pulse float opacity-40" style={{ animationDelay: '2s' }} />
      
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Step 1: Age & Consent */}
          {step === 'consent' && (
            <div className="space-y-8">
              <div className="text-center space-y-4">
                <div className="flex justify-center mb-6">
                  <Shield className="w-12 h-12 text-neon-lilac opacity-80" />
                </div>
                
                <h1 className="text-2xl sm:text-3xl font-headline text-pearl-white">
                  Welcome to Tribe
                </h1>
                <p className="text-muted-lavender/70 font-body">
                  Before we begin your journey of self-discovery
                </p>
              </div>

              <div className="space-y-6 p-6 rounded-2xl soft-blur border border-muted-lavender/20">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="age-consent"
                      checked={isOver13}
                      onCheckedChange={(checked) => setIsOver13(checked === true)}
                      className="mt-1 flex-shrink-0"
                    />
                    <Label htmlFor="age-consent" className="text-pearl-white font-body leading-relaxed">
                      I am 13 years of age or older
                    </Label>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="terms-consent"
                      checked={acceptsTerms}
                      onCheckedChange={(checked) => setAcceptsTerms(checked === true)}
                      className="mt-1 flex-shrink-0"
                    />
                    <Label htmlFor="terms-consent" className="text-pearl-white font-body leading-relaxed">
                      I agree to the{' '}
                      <button
                        onClick={handleShowTermsOfService}
                        className="text-electric-blue hover:text-electric-blue/80 hover:underline cursor-pointer font-medium transition-colors duration-200"
                      >
                        Terms of Service
                      </button>
                      {' '}and{' '}
                      <button
                        onClick={handleShowPrivacyPolicy}
                        className="text-electric-blue hover:text-electric-blue/80 hover:underline cursor-pointer font-medium transition-colors duration-200"
                      >
                        Privacy Policy
                      </button>
                    </Label>
                  </div>
                </div>

                {/* Info note about teen safety */}
                <div className="p-4 rounded-lg bg-neon-lilac/10 border border-neon-lilac/20">
                  <div className="flex items-start space-x-3">
                    <Info className="w-5 h-5 text-neon-lilac mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-pearl-white">Teen-Safe Community</p>
                      <p className="text-xs text-muted-lavender/80 leading-relaxed">
                        Tribe Board is designed specifically for teens with robust safety features, content moderation, and privacy controls built for your age group.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleConsentContinue}
                disabled={!isOver13 || !acceptsTerms}
                className="w-full p-4 bg-gradient-to-r from-neon-lilac to-electric-blue hover:from-neon-lilac/90 hover:to-electric-blue/90 disabled:from-muted-lavender/20 disabled:to-muted-lavender/20 disabled:text-muted-lavender/50 text-white font-body font-medium rounded-xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-105 dreamy-glow border-0"
              >
                Create Account
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>

              <div className="text-center">
                <Button
                  onClick={() => setStep('credentials')}
                  className="p-3 bg-transparent border border-muted-lavender/30 text-muted-lavender hover:bg-muted-lavender/10 hover:text-white rounded-xl transition-all duration-300"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Choose Sign-in Method */}
          {step === 'method' && (
            <div className="space-y-8">
              <div className="text-center space-y-4">
                <div className="flex justify-center mb-6">
                  <Shield className="w-12 h-12 text-neon-lilac opacity-80" />
                </div>
                
                <h1 className="text-2xl sm:text-3xl font-headline text-pearl-white">
                  Choose Your Path
                </h1>
                <p className="text-muted-lavender/70 font-body">
                  Select how you'd like to create your account
                </p>
              </div>

              <div className="space-y-4">
                {/* Social Login Buttons */}
                <Button
                  onClick={() => {
                    // Placeholder for Google signup
                    setCredentialsError('Google signup coming soon! Please use email or phone for now.');
                  }}
                  className="w-full p-6 h-auto text-left rounded-2xl bg-transparent border-2 border-glitch-red/30 text-glitch-red hover:bg-glitch-red/10 hover:border-glitch-red/50 hover:text-pearl-white transition-all duration-300 soft-blur"
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
                      <div className="text-sm opacity-70">Quick signup with Google account</div>
                    </div>
                  </div>
                </Button>

                <Button
                  onClick={() => {
                    // Placeholder for Facebook signup
                    setCredentialsError('Facebook signup coming soon! Please use email or phone for now.');
                  }}
                  className="w-full p-6 h-auto text-left rounded-2xl bg-transparent border-2 border-electric-blue/30 text-electric-blue hover:bg-electric-blue/10 hover:border-electric-blue/50 hover:text-pearl-white transition-all duration-300 soft-blur"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-6 h-6 bg-[#1877F2] rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </div>
                    <div className="space-y-1">
                      <div className="font-body font-medium">Continue with Facebook</div>
                      <div className="text-sm opacity-70">Quick signup with Facebook account</div>
                    </div>
                  </div>
                </Button>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-muted-lavender/20" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-midnight-black text-muted-lavender/60 font-body">or sign up with</span>
                  </div>
                </div>

                {/* Email Option */}
                <Button
                  onClick={() => handleMethodSelect('email')}
                  className="w-full p-6 h-auto text-left rounded-2xl bg-transparent border-2 border-muted-lavender/30 text-muted-lavender hover:bg-muted-lavender/10 hover:border-muted-lavender/50 hover:text-pearl-white transition-all duration-300 soft-blur"
                >
                  <div className="flex items-center space-x-4">
                    <Mail className="w-6 h-6 text-electric-blue" />
                    <div className="space-y-1">
                      <div className="font-body font-medium">Sign up with email</div>
                      <div className="text-sm opacity-70">Create account using your email address</div>
                    </div>
                  </div>
                </Button>

                {/* Phone Option */}
                <Button
                  onClick={() => handleMethodSelect('phone')}
                  className="w-full p-6 h-auto text-left rounded-2xl bg-transparent border-2 border-muted-lavender/30 text-muted-lavender hover:bg-muted-lavender/10 hover:border-muted-lavender/50 hover:text-pearl-white transition-all duration-300 soft-blur"
                >
                  <div className="flex items-center space-x-4">
                    <Phone className="w-6 h-6 text-soft-blush" />
                    <div className="space-y-1">
                      <div className="font-body font-medium">Sign up with phone</div>
                      <div className="text-sm opacity-70">Create account using your phone number</div>
                    </div>
                  </div>
                </Button>
              </div>

              {/* Error message display */}
              {credentialsError && (
                <div className="p-3 rounded-lg bg-red-400/10 border border-red-400/20">
                  <p className="text-red-400 text-sm font-body">{credentialsError}</p>
                </div>
              )}

              <div className="text-center space-y-2">
                <Button
                  onClick={onBack}
                  className="p-3 bg-transparent border border-muted-lavender/30 text-muted-lavender hover:bg-muted-lavender/10 hover:text-white rounded-xl transition-all duration-300"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                
                {onSwitchToLogin && (
                  <div className="text-center mt-4">
                    <p className="text-muted-lavender/60 font-body">
                      Already have an account?{' '}
                      <button
                        onClick={onSwitchToLogin}
                        className="text-electric-blue hover:underline font-medium"
                      >
                        Sign in
                      </button>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Create Credentials */}
          {step === 'credentials' && (
            <div className="space-y-8">
              <div className="text-center space-y-4">
                <div className="flex justify-center mb-6">
                  <User className="w-12 h-12 text-neon-lilac opacity-80" />
                </div>
                
                <h1 className="text-2xl sm:text-3xl font-headline text-pearl-white">
                  Create Your Identity
                </h1>
                <p className="text-muted-lavender/70 font-body">
                  Set up your username and password
                </p>
              </div>

              <div className="space-y-6 p-6 rounded-2xl soft-blur border border-muted-lavender/20">
                <div className="space-y-4">
                  {/* Username Field */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="username" className="text-pearl-white font-body">
                        Username
                      </Label>
                      <Button
                        type="button"
                        onClick={handleGenerateUsername}
                        className="text-xs px-2 py-1 bg-electric-blue/20 text-electric-blue hover:bg-electric-blue/30 border-0 rounded-lg transition-all duration-300"
                      >
                        <Shuffle className="w-3 h-3 mr-1" />
                        Generate
                      </Button>
                    </div>
                    <div className="relative">
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Choose a unique username"
                        className="bg-midnight-black/50 border-muted-lavender/30 text-pearl-white placeholder:text-muted-lavender/50 focus:border-electric-blue font-body pr-10"
                      />
                      {username && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {isCheckingUsername ? (
                            <div className="w-4 h-4 animate-spin border-2 border-electric-blue/30 border-t-electric-blue rounded-full" />
                          ) : isUsernameAvailable === true ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : isUsernameAvailable === false ? (
                            <div className="w-4 h-4 rounded-full bg-red-400" />
                          ) : null}
                        </div>
                      )}
                    </div>
                    {username && isUsernameAvailable === false && (
                      <p className="text-red-400 text-sm font-body">
                        Username must be 3-20 characters, letters, numbers, and underscores only
                      </p>
                    )}
                  </div>

                  {/* Contact Field */}
                  <div className="space-y-2">
                    <Label htmlFor="contact" className="text-pearl-white font-body">
                      {method === 'email' ? 'Email Address' : 'Phone Number'}
                    </Label>
                    <Input
                      id="contact"
                      type={method === 'email' ? 'email' : 'tel'}
                      value={method === 'email' ? email : phone}
                      onChange={(e) => method === 'email' ? setEmail(e.target.value) : handlePhoneChange(e)}
                      placeholder={method === 'email' ? 'Enter your email' : 'Enter your phone number'}
                      className="bg-midnight-black/50 border-muted-lavender/30 text-pearl-white placeholder:text-muted-lavender/50 focus:border-electric-blue font-body"
                    />
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-pearl-white font-body">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a strong password"
                        className="bg-midnight-black/50 border-muted-lavender/30 text-pearl-white placeholder:text-muted-lavender/50 focus:border-electric-blue font-body pr-10"
                      />
                      <Button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 p-0 h-auto bg-transparent border-0 text-muted-lavender/50 hover:text-electric-blue"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Confirm Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-pearl-white font-body">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        className="bg-midnight-black/50 border-muted-lavender/30 text-pearl-white placeholder:text-muted-lavender/50 focus:border-electric-blue font-body pr-10"
                      />
                      <Button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 p-0 h-auto bg-transparent border-0 text-muted-lavender/50 hover:text-electric-blue"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Password validation hints */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${password.length >= 8 ? 'bg-green-400' : 'bg-muted-lavender/30'}`} />
                      <span className={`text-sm font-body ${password.length >= 8 ? 'text-green-400' : 'text-muted-lavender/50'}`}>
                        At least 8 characters
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${password === confirmPassword && password ? 'bg-green-400' : 'bg-muted-lavender/30'}`} />
                      <span className={`text-sm font-body ${password === confirmPassword && password ? 'text-green-400' : 'text-muted-lavender/50'}`}>
                        Passwords match
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Error message display */}
              {credentialsError && (
                <div className="p-4 rounded-lg bg-red-400/10 border border-red-400/20">
                  <p className="text-red-400 text-sm font-body leading-relaxed">{credentialsError}</p>
                </div>
              )}

              <Button
                onClick={handleCreateCredentials}
                disabled={!canContinueCredentials}
                className="w-full p-4 bg-gradient-to-r from-neon-lilac to-electric-blue hover:from-neon-lilac/90 hover:to-electric-blue/90 disabled:from-muted-lavender/20 disabled:to-muted-lavender/20 disabled:text-muted-lavender/50 text-white font-body font-medium rounded-xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-105 dreamy-glow border-0"
              >
                Continue
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>

              <div className="text-center">
                <Button
                  onClick={() => setStep('method')}
                  className="p-3 bg-transparent border border-muted-lavender/30 text-muted-lavender hover:bg-muted-lavender/10 hover:text-white rounded-xl transition-all duration-300"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Account Creation */}
          {step === 'creating' && (
            <div className="space-y-8 text-center">
              <div className="flex justify-center mb-8">
                <Sparkles className="w-16 h-16 text-neon-lilac opacity-80 animate-pulse" />
              </div>
              
              <div className="space-y-4">
                <h1 className="text-2xl sm:text-3xl font-headline text-pearl-white">
                  Creating Your Tribe
                </h1>
                <p className="text-muted-lavender/70 font-body">
                  Setting up your account and profile...
                </p>
                
                <div className="w-full bg-muted-lavender/20 rounded-full h-2 mt-8">
                  <div className="bg-gradient-to-r from-neon-lilac to-electric-blue h-2 rounded-full animate-pulse" style={{ width: '100%' }} />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Welcome */}
          {step === 'welcome' && (
            <div className="space-y-8 text-center">
              <div className="flex justify-center mb-8">
                <CheckCircle className="w-16 h-16 text-green-400 animate-bounce" />
              </div>
              
              <div className="space-y-4">
                <h1 className="text-2xl sm:text-3xl font-headline text-pearl-white">
                  Welcome to Tribe!
                </h1>
                <p className="text-muted-lavender/70 font-body">
                  Your account has been created successfully. Let's get you started...
                </p>
              </div>
            </div>
          )}

          {/* Step 6: Complete */}
          {step === 'complete' && (
            <div className="space-y-8 text-center">
              <div className="flex justify-center mb-8">
                <div className="relative">
                  <CheckCircle className="w-16 h-16 text-green-400" />
                  <div className="absolute inset-0 animate-ping">
                    <CheckCircle className="w-16 h-16 text-green-400 opacity-30" />
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h1 className="text-2xl sm:text-3xl font-headline text-pearl-white">
                  You're All Set!
                </h1>
                <p className="text-muted-lavender/70 font-body">
                  Redirecting you to your new tribe...
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}