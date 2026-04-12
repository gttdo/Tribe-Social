import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupSchema, type SignupFormData } from './auth-schemas';
import { authService, mapAuthError } from '../../services/auth';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface EmailSignupFormProps {
  onSignupComplete: () => void;
}

export function EmailSignupForm({ onSignupComplete }: EmailSignupFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormData) => {
    setServerError('');
    setIsSubmitting(true);

    try {
      const { error } = await authService.signUpWithEmail(data.email, data.password);
      if (error) {
        setServerError(mapAuthError(error));
      } else {
        onSignupComplete();
      }
    } catch (err) {
      setServerError(mapAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          aria-invalid={!!errors.email}
          {...register('email')}
        />
        {errors.email && (
          <p className="text-sm text-glitch-red" role="alert">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <div className="relative">
          <Input
            id="signup-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            className="pr-10"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-lavender/50 hover:text-pearl-white transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-sm text-glitch-red" role="alert">{errors.password.message}</p>
        )}
      </div>

      {serverError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-glitch-red/10 border border-glitch-red/20" role="alert">
          <AlertCircle className="w-4 h-4 text-glitch-red shrink-0" />
          <p className="text-sm text-glitch-red">{serverError}</p>
        </div>
      )}

      <Button
        type="submit"
        className="w-full h-12 text-base font-semibold bg-neon-lilac hover:bg-neon-lilac/90 text-midnight-black"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Creating account...
          </>
        ) : (
          'Create Account'
        )}
      </Button>
    </form>
  );
}
