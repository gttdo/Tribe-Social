// Enhanced Bio Update Routes - Fixes persistence issues
// This should be integrated into the existing routes.tsx file

import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js";
import { z } from "npm:zod";

// Initialize Supabase client (matching existing setup)
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Enhanced validation schema
const profileUpdateSchema = z.object({
  bio: z.string().max(280).optional(),
  description: z.string().max(280).optional(),
  username: z.string().min(3).max(20).optional(),
  profile_privacy: z.enum(["public", "private", "friends"]).optional(),
});

// Enhanced authentication function
async function authenticateUser(request: Request): Promise<{ user: any; error?: string }> {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { user: null, error: "Missing or invalid authorization header" };
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return { user: null, error: error?.message || "Invalid token" };
    }

    return { user, error: undefined };
  } catch (error) {
    console.error("Authentication error:", error);
    return { user: null, error: "Authentication failed" };
  }
}

// Enhanced profile update handler with better persistence
export function addEnhancedBioRoutes(app: Hono) {
  console.log("=== REGISTERING ENHANCED BIO ROUTES ===");

  // Enhanced profile update route (PATCH)
  app.patch("/make-server-70df0d6e/users/profile", async (c) => {
    console.log("=== ENHANCED PROFILE UPDATE REQUEST ===");
    
    try {
      // Authenticate user
      const { user, error: authError } = await authenticateUser(c.req.raw);
      
      if (authError || !user?.id) {
        console.log("Authentication failed:", authError);
        return c.json({ error: authError || "Authentication required" }, 401);
      }

      console.log("User authenticated:", user.id.substring(0, 8) + "...");

      // Parse and validate request
      let requestBody;
      try {
        requestBody = await c.req.json();
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        return c.json({ error: "Invalid JSON in request body" }, 400);
      }

      console.log("Request data:", {
        hasBio: !!requestBody.bio,
        bioLength: requestBody.bio ? requestBody.bio.length : 0,
        hasDescription: !!requestBody.description
      });

      // Validate input
      const validation = profileUpdateSchema.safeParse(requestBody);
      if (!validation.success) {
        console.error("Validation failed:", validation.error.issues);
        return c.json({
          error: "Validation failed",
          details: validation.error.issues
        }, 400);
      }

      const validatedData = validation.data;
      const updates: any = {};
      const timestamp = new Date().toISOString();

      // Process bio/description updates with enhanced logging
      if (validatedData.bio !== undefined) {
        const trimmedBio = validatedData.bio.trim();
        console.log("Processing bio update:", {
          original: validatedData.bio.length,
          trimmed: trimmedBio.length,
          preview: trimmedBio.substring(0, 50) + (trimmedBio.length > 50 ? "..." : "")
        });
        
        updates.bio = trimmedBio;
        updates.updated_at = timestamp;
      } else if (validatedData.description !== undefined) {
        const trimmedDesc = validatedData.description.trim();
        console.log("Processing description update:", {
          original: validatedData.description.length,
          trimmed: trimmedDesc.length
        });

        updates.bio = trimmedDesc;
        updates.updated_at = timestamp;
      }

      // Process other updates
      if (validatedData.username !== undefined) {
        updates.username = validatedData.username.trim();
        updates.updated_at = timestamp;
      }

      if (validatedData.profile_privacy !== undefined) {
        updates.profile_privacy = validatedData.profile_privacy;
        updates.updated_at = timestamp;
      }

      // Ensure we have updates to apply
      if (Object.keys(updates).length === 0) {
        console.log("No updates to apply");
        return c.json({ error: "No valid updates provided" }, 400);
      }

      console.log("Applying updates:", Object.keys(updates));

      // Execute database update with comprehensive error handling
      let updateResult;
      try {
        const { data, error: updateError } = await supabaseAdmin
          .from("profile")
          .update(updates)
          .eq("id", user.id)
          .select(`
            id, username, email, phone, 
            avatar_url, bio,
            xp, level, follower_count, following_count,
            core_realm, sub_realm, created_at, updated_at
          `)
          .single();

        if (updateError) {
          console.error("Database update error:", updateError);
          
          // Handle specific database errors
          if (updateError.code === "23505") {
            return c.json({ error: "Username already exists" }, 409);
          } else if (updateError.code === "42P01") {
            return c.json({ error: "Database table not found" }, 500);
          } else {
            return c.json({ 
              error: "Database update failed",
              details: updateError.message
            }, 500);
          }
        }

        if (!data) {
          console.error("No data returned from update");
          return c.json({ error: "Update failed - no data returned" }, 500);
        }

        updateResult = data;
        console.log("Update successful:", {
          userId: updateResult.id.substring(0, 8) + "...",
          bioLength: updateResult.bio?.length || 0,
          updatedAt: updateResult.updated_at
        });

      } catch (dbError) {
        console.error("Critical database error:", dbError);
        return c.json({
          error: "Critical database error",
          details: dbError.message
        }, 500);
      }

      // Verify persistence with a read-back check
      try {
        console.log("Verifying update persistence...");
        
        // Small delay to ensure database consistency
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const { data: verificationData, error: verifyError } = await supabaseAdmin
          .from("profile")
          .select("id, bio, updated_at")
          .eq("id", user.id)
          .single();

        if (verifyError) {
          console.warn("Verification query failed:", verifyError);
        } else {
          const expectedBio = updates.bio;
          const actualBio = verificationData.bio;
          
          console.log("Persistence verification:", {
            expected: expectedBio?.substring(0, 50) + "..." || "null",
            actual: actualBio?.substring(0, 50) + "..." || "null",
            matches: expectedBio === actualBio
          });
          
          if (expectedBio && actualBio !== expectedBio) {
            console.warn("⚠️ PERSISTENCE VERIFICATION FAILED!");
            // Could implement retry logic here
          }
        }
      } catch (verifyError) {
        console.warn("Verification check failed:", verifyError);
      }

      // Format response for frontend compatibility
      const responseProfile = {
        id: updateResult.id,
        username: updateResult.username,
        email: updateResult.email,
        phone: updateResult.phone,
        profileImageUrl: updateResult.avatar_url,
        description: updateResult.bio,
        bio: updateResult.bio,
        xp: updateResult.xp || 0,
        level: updateResult.level || 1,
        followerCount: updateResult.follower_count || 0,
        followingCount: updateResult.following_count || 0,
        coreRealm: updateResult.core_realm,
        subRealms: updateResult.sub_realm || [],
        createdAt: updateResult.created_at,
        updatedAt: updateResult.updated_at
      };

      console.log("Profile update completed successfully");

      return c.json({
        success: true,
        message: "Profile updated successfully",
        profile: responseProfile
      });

    } catch (error) {
      console.error("Critical profile update error:", error);
      return c.json({
        error: "Internal server error",
        details: error.message
      }, 500);
    }
  });

  // Also handle PUT method for compatibility
  app.put("/make-server-70df0d6e/users/profile", async (c) => {
    // Delegate to PATCH handler
    return app.fetch(
      new Request(c.req.url.replace("PUT", "PATCH"), {
        method: "PATCH",
        headers: c.req.raw.headers,
        body: c.req.raw.body
      })
    );
  });

  console.log("Enhanced bio routes registered successfully");
}

export default addEnhancedBioRoutes;