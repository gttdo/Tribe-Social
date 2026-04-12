import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetSchema, type ResetFormData } from './auth-schemas';
import { authService, mapAuthError } from '../../services/auth';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Loader2, ArrowLeft, AlertCircle, Mail, CheckCircle } from 'lucide-react';

interface PasswordResetProps {
  onBack: () => void;
}

export function PasswordReset({ onBack }: PasswordResetProps) {
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const { register, handleSubmit, formState: { errors }, getValues } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (data: ResetFormData) => {
    setServerError('');
    setIsSubmitting(true);

    try {
      const { error } = await authService.resetPassword(data.email);
      if (error) {
        setServerError(mapAuthError(error));
      } else {
        setSent(true);
      }
    } catch (err) {
      setServerError(mapAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="space-y-6 text-center py-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-electric-blue/10 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-electric-blue" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold font-display text-pearl-white">Check your email</h3>
          <p className="text-sm text-muted-lavender/70">
            We sent a password reset link to <span className="text-pearl-white font-medium">{getValues('email')}</span>
          </p>
        </div>
        <Button variant="ghost" onClick={onBack} className="text-electric-blue hover:text-electric-blue/80">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-neon-lilac/10 flex items-center justify-center">
          <Mail className="w-6 h-6 text-neon-lilac" />
        </div>
        <h3 className="text-xl font-semibold font-display text-pearl-white">Reset your password</h3>
        <p className="text-sm text-muted-lavender/70">Enter your email and we'll send you a reset link</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reset-email">Email</Label>
          <Input
            id="reset-email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            autoFocus
            aria-invalid={!!errors.email}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-sm text-glitch-red" role="alert">{errors.email.message}</p>
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
              Sending...
            </>
          ) : (
            'Send Reset Link'
          )}
        </Button>
      </form>

      <div className="text-center">
        <button onClick={onBack} className="text-sm text-muted-lavender/70 hover:text-electric-blue transition-colors">
          <ArrowLeft className="w-3 h-3 inline mr-1" />
          Back to sign in
        </button>
      </div>
    </div>
  );
}
