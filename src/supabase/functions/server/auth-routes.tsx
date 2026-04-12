import { Hono } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js';

// Initialize Supabase clients
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export function setupAuthRoutes(app: Hono) {
  console.log('gv Setting up auth routes...');
  const both = (p: string) => [p, `/make-server-70df0d6e${p}`];

  // Check availability endpoint (register unprefixed and prefixed)
  const checkAvailabilityHandler = async (c) => {
    try {
      console.log('=== CHECK AVAILABILITY REQUEST ===');
      const body = await c.req.json();
      // Manual validation to avoid Zod import issues
      const { email, phone } = body;
      const isValidRequest = 
        body &&
        (typeof email === 'string' && email.includes('@') || typeof phone === 'string');
      
      if (!isValidRequest) {
        return c.json({
          error: 'Bad request',
          available: false,
        }, 400);
      }
      if (!email && !phone) {
        return c.json({
          error: 'Either email or phone must be provided',
          available: false,
        }, 400);
      }
      console.log('Checking availability for:', { email: !!email, phone: !!phone });
      let userExists = false;
      if (email) {
        const { data: existingUser, error } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('email', email)
          .maybeSingle();
        if (error && error.code !== 'PGRST116') {
          console.error('Error checking email availability:', error);
        }
        userExists = !!existingUser;
      } else if (phone) {
        const cleanPhone = phone.replace(/[^\d]/g, '');
        const { data: existingUser, error } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('phone', cleanPhone)
          .maybeSingle();
        if (error && error.code !== 'PGRST116') {
          console.error('Error checking phone availability:', error);
        }
        userExists = !!existingUser;
      }
      console.log('Availability check result:', { userExists, available: !userExists });
      return c.json({
        available: !userExists,
        message: userExists ? 'Contact already registered' : 'Contact available',
      });
    } catch (error) {
      console.error('Check availability error:', error);
      return c.json({
        error: 'Internal server error',
        available: false,
      }, 500);
    }
  };
  both('/auth/check-availability').forEach((path) => app.post(path, checkAvailabilityHandler));

  // Signup endpoint (register unprefixed and prefixed)
  const signupHandler = async (c) => {
    try {
      console.log('=== SIGNUP REQUEST ===');
      const body = await c.req.json();
      console.log('Signup request body:', { ...body, password: '[REDACTED]' });
      // Manual validation to avoid Zod import issues
      const { email, password, username, name } = body;
      const isValidSignup = 
        body &&
        typeof email === 'string' &&
        email.includes('@') &&
        typeof password === 'string' &&
        password.length >= 8 &&
        typeof username === 'string' &&
        username.length >= 3 &&
        username.length <= 20;
      
      if (!isValidSignup) {
        return c.json({
          error: 'Bad request - invalid email, password (min 8 chars), or username (3-20 chars)',
        }, 400);
      }
      const { data: existingUser, error: checkError } = await supabaseAdmin
        .from('users')
        .select('id, email, username')
        .or(`email.eq."${email}",username.eq."${username.toLowerCase()}"`)
        .maybeSingle();
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing user:', checkError);
        return c.json({ error: 'Database error during user check' }, 500);
      }
      if (existingUser) {
        if (existingUser.email === email) {
          return c.json({ error: 'Email already exists' }, 409);
        }
        if (existingUser.username === username.toLowerCase()) {
          return c.json({ error: 'Username already taken' }, 409);
        }
      }
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        user_metadata: {
          username: username.toLowerCase(),
          name: name || username,
        },
        email_confirm: true,
      });
      if (authError) {
        console.error('Supabase auth error:', authError);
        return c.json({
          error: authError.message.includes('already') ? 'Email already exists' : 'Failed to create user account',
        }, 400);
      }
      if (!authData.user) {
        console.error('No user returned from auth creation');
        return c.json({ error: 'Failed to create user account' }, 500);
      }
      console.log('User created in auth:', authData.user.id);
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          username: username.toLowerCase(),
          phone: email.includes('@phone-signup.tribal') ? email.replace('@phone-signup.tribal', '') : null,
          xp: 0,
          level: 1,
          follower_count: 0,
          following_count: 0,
          profile_privacy: 'public',
        })
        .select()
        .single();
      if (profileError) {
        console.error('Error creating user profile:', profileError);
        console.error('Profile error details:', { code: profileError.code, message: profileError.message, details: profileError.details });
        try {
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
          console.log('Cleaned up auth user after profile creation failure');
        } catch (cleanupError) {
          console.error('Failed to cleanup auth user:', cleanupError);
        }
        return c.json({ error: 'Failed to create user profile', details: profileError.message }, 500);
      }
      console.log('User profile created successfully:', profileData.id);
      return c.json({
        success: true,
        user: { id: profileData.id, email: profileData.email, username: profileData.username },
        message: 'User created successfully',
      });
    } catch (error) {
      console.error('Signup error:', error);
      return c.json({ error: 'Internal server error during signup', details: error.message }, 500);
    }
  };
  both('/auth/signup').forEach((path) => app.post(path, signupHandler));

  console.log('Auth routes setup complete');
}