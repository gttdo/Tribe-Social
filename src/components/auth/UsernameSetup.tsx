import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { usernameSchema, type UsernameFormData } from './auth-schemas';
import { supabase } from '../../utils/supabase/client';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Loader2, Check, X, Sparkles } from 'lucide-react';

interface UsernameSetupProps {
  userId: string;
  onComplete: () => void;
}

const adjectives = ['cosmic', 'neon', 'shadow', 'dream', 'lunar', 'ember', 'crystal', 'void', 'zen', 'wild', 'glitch', 'vapor'];
const nouns = ['rider', 'echo', 'wave', 'drift', 'spark', 'bloom', 'haze', 'pulse', 'core', 'myth', 'glow', 'flux'];

function generateUsername(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 999);
  return `${adj}_${noun}${num}`;
}

export function UsernameSetup({ userId, onComplete }: UsernameSetupProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestions] = useState(() => [generateUsername(), generateUsername(), generateUsername()]);

  const { register, handleSubmit, formState: { errors }, watch, setValue, trigger } = useForm<UsernameFormData>({
    resolver: zodResolver(usernameSchema),
  });

  const username = watch('username');

  const checkAvailability = useCallback(async (value: string) => {
    if (!value || value.length < 3) {
      setIsAvailable(null);
      return;
    }

    setIsChecking(true);
    try {
      const { data, error } = await supabase
        .from('profile')
        .select('id')
        .eq('username', value.toLowerCase())
        .neq('id', userId)
        .maybeSingle();

      if (error) {
        setIsAvailable(null);
      } else {
        setIsAvailable(!data);
      }
    } catch {
      setIsAvailable(null);
    } finally {
      setIsChecking(false);
    }
  }, [userId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (username && username.length >= 3) {
        checkAvailability(username);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [username, checkAvailability]);

  const onSubmit = async (data: UsernameFormData) => {
    if (!isAvailable) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('profile')
        .update({ username: data.username.toLowerCase() })
        .eq('id', userId);

      if (error) {
        console.error('Username update error:', error);
      }
      onComplete();
    } catch {
      onComplete();
    }
  };

  const selectSuggestion = (suggestion: string) => {
    setValue('username', suggestion);
    trigger('username');
  };

  return (
    <div className="min-h-screen bg-midnight-black flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-neon-lilac/20 to-electric-blue/20 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-neon-lilac" />
          </div>
          <h1 className="text-2xl font-bold font-display text-pearl-white">Choose your username</h1>
          <p className="text-sm text-muted-lavender/70">This is how others will find you</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-lavender/50">@</span>
              <Input
                id="username"
                placeholder="your_username"
                className="pl-8 pr-10"
                autoFocus
                autoComplete="username"
                aria-invalid={!!errors.username}
                {...register('username')}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isChecking && <Loader2 className="w-4 h-4 animate-spin text-muted-lavender/50" />}
                {!isChecking && isAvailable === true && <Check className="w-4 h-4 text-green-400" />}
                {!isChecking && isAvailable === false && <X className="w-4 h-4 text-glitch-red" />}
              </div>
            </div>
            {errors.username && (
              <p className="text-sm text-glitch-red" role="alert">{errors.username.message}</p>
            )}
            {!errors.username && isAvailable === false && (
              <p className="text-sm text-glitch-red" role="alert">This username is taken</p>
            )}
            {!errors.username && isAvailable === true && (
              <p className="text-sm text-green-400">Available!</p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-lavender/50">Suggestions</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => selectSuggestion(s)}
                  className="px-3 py-1.5 text-xs rounded-full border border-border/30 text-muted-lavender/70 hover:border-electric-blue/50 hover:text-electric-blue transition-colors"
                >
                  @{s}
                </button>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold bg-neon-lilac hover:bg-neon-lilac/90 text-midnight-black"
            disabled={!isAvailable || isSubmitting || !!errors.username}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Setting up...
              </>
            ) : (
              'Continue'
            )}
          </Button>
        </form>

        <div className="text-center">
          <button onClick={onComplete} className="text-sm text-muted-lavender/50 hover:text-pearl-white transition-colors">
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
