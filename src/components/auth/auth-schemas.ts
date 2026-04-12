import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const usernameSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(24, 'Username must be 24 characters or less')
    .regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers, and underscores'),
});

export const phoneSchema = z.object({
  phone: z.string().regex(/^\d{10}$/, 'Please enter a valid 10-digit phone number'),
});

export const resetSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export type SignupFormData = z.infer<typeof signupSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type UsernameFormData = z.infer<typeof usernameSchema>;
export type PhoneFormData = z.infer<typeof phoneSchema>;
export type ResetFormData = z.infer<typeof resetSchema>;
