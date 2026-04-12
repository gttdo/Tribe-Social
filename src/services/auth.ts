import { supabase } from '../utils/supabase/client';

export const authService = {
  signUpWithEmail: async (email: string, password: string) => {
    return supabase.auth.signUp({ email, password });
  },

  signInWithEmail: async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password });
  },

  signInWithGoogle: async () => {
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  },

  signInWithPhone: async (phone: string) => {
    return supabase.auth.signInWithOtp({ phone });
  },

  verifyOtp: async (phone: string, token: string) => {
    return supabase.auth.verifyOtp({ phone, token, type: 'sms' });
  },

  resetPassword: async (email: string) => {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
  },

  signOut: async () => {
    return supabase.auth.signOut();
  },

  getSession: async () => {
    return supabase.auth.getSession();
  },
};

export function formatPhoneE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+${digits}`;
}

export function formatPhoneDisplay(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function mapAuthError(error: any): string {
  const msg = error?.message || error || '';
  if (msg.includes('Invalid login')) return 'Invalid email or password.';
  if (msg.includes('Email not confirmed')) return 'Please verify your email before signing in.';
  if (msg.includes('already registered') || msg.includes('already exists')) return 'This email is already registered. Try signing in instead.';
  if (msg.includes('rate limit') || msg.includes('too many')) return 'Too many attempts. Please wait a moment and try again.';
  if (msg.includes('provider is not enabled')) return 'This sign-in method is not available yet.';
  if (msg.includes('invalid_otp') || msg.includes('expired')) return 'Invalid or expired code. Please try again.';
  if (msg.includes('network') || msg.includes('fetch')) return 'Unable to connect. Please check your internet connection.';
  return msg || 'Something went wrong. Please try again.';
}
