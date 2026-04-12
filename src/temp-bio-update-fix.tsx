// Enhanced Bio Update Route - Drop-in replacement for server bio update functionality
// This fixes the bio persistence issue by ensuring proper database updates

import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js";
import { z } from "npm:zod";

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Enhanced profile update schema with strict validation
const profileUpdateSchema = z.object({
  bio: z.string().max(280).optional(),
  description: z.string().max(280).optional(),
  username: z.string().min(3).max(20).optional(),
  profile_privacy: z.enum(["public", "private", "friends"]).optional(),
});

// Bio update route with enhanced error handling and persistence
export function setupEnhancedBioUpdate(app: Hono) {
  // PATCH/PUT user profile endpoint (for bio updates and other profile changes)
  const handleProfileUpdate = async (c) => {
    try {
      console.log("=== ENHANCED BIO UPDATE REQUEST ===");

      // Authenticate user
      const { authenticateUser } = await import("./helpers.tsx");
      const { user, error } = await authenticateUser(c.req.raw);
      
      if (error) {
        console.log("Authentication error:", error);
        return c.json({ error: "Authentication required" }, 401);
      }

      if (!user?.id) {
        console.log("No user ID found in authentication");
        return c.json({ error: "Invalid user session" }, 401);
      }

      console.log("Authenticated user ID:", user.id.substring(0, 8) + "...");

      // Parse and validate request body
      let requestBody;
      try {
        requestBody = await c.req.json();
        console.log("Request body received:", {
          hasBio: !!requestBody.bio,
          bioLength: requestBody.bio ? requestBody.bio.length : 0
        });
      } catch (parseError) {
        console.error("Failed to parse request body:", parseError);
        return c.json({ error: "Invalid request format" }, 400);
      }

      // Validate using schema
      const parsed = profileUpdateSchema.safeParse(requestBody);
      if (!parsed.success) {
        console.error("Validation errors:", parsed.error.issues);
        return c.json({
          error: "Validation failed",
          details: parsed.error.issues
        }, 400);
      }

      const validatedData = parsed.data;
      const updates: any = {};

      // Process bio update with enhanced logging
      if (validatedData.bio !== undefined) {
        const trimmedBio = validatedData.bio.trim();
        console.log("Processing bio update:", {
          originalLength: validatedData.bio.length,
          trimmedLength: trimmedBio.length,
          preview: trimmedBio.substring(0, 50) + (trimmedBio.length > 50 ? "..." : "")
        });

        // Update both bio and description fields for compatibility
        updates.bio = trimmedBio;
        updates.description = trimmedBio;
        updates.updated_at = new Date().toISOString();
      }

      // Process other updates
      if (validatedData.description !== undefined && validatedData.bio === undefined) {
        const trimmedDesc = validatedData.description.trim();
        updates.description = trimmedDesc;
        updates.bio = trimmedDesc; // Keep bio in sync
        updates.updated_at = new Date().toISOString();
      }

      if (validatedData.username !== undefined) {
        updates.username = validatedData.username.trim();
        updates.updated_at = new Date().toISOString();
      }

      if (validatedData.profile_privacy !== undefined) {
        updates.profile_privacy = validatedData.profile_privacy;
        updates.updated_at = new Date().toISOString();
      }

      // Ensure we have something to update
      if (Object.keys(updates).length === 0) {
        console.log("No valid updates provided");
        return c.json({ error: "No valid updates provided" }, 400);
      }

      console.log("Updates to apply:", Object.keys(updates));

      // Perform database update with enhanced error handling
      let updatedProfile;
      try {
        console.log("Executing database update for user:", user.id);
        
        const { data, error: updateError } = await supabaseAdmin
          .from("users")
          .update(updates)
          .eq("id", user.id)
          .select("*")
          .single();

        if (updateError) {
          console.error("Database update error:", {
            code: updateError.code,
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint
          });
          
          // Check for specific database errors
          if (updateError.code === "23505") {
            return c.json({ error: "Username already exists" }, 409);
          } else if (updateError.code === "23503") {
            return c.json({ error: "Invalid reference" }, 400);
          } else {
            throw updateError;
          }
        }

        if (!data) {
          console.error("No data returned from update - user may not exist");
          return c.json({ error: "User not found or update failed" }, 404);
        }

        updatedProfile = data;
        console.log("Database update successful:", {
          userId: updatedProfile.id.substring(0, 8) + "...",
          bioLength: updatedProfile.bio ? updatedProfile.bio.length : 0,
          updatedAt: updatedProfile.updated_at
        });

      } catch (dbError) {
        console.error("Critical database error:", dbError);
        return c.json({
          error: "Database update failed",
          details: dbError.message
        }, 500);
      }

      // Verify the update was persisted by reading it back
      try {
        console.log("Verifying update persistence...");
        
        const { data: verifyData, error: verifyError } = await supabaseAdmin
          .from("users")
          .select("id, bio, description, username, updated_at")
          .eq("id", user.id)
          .single();

        if (verifyError) {
          console.warn("Failed to verify update:", verifyError);
        } else {
          console.log("Update verification successful:", {
            bioMatch: verifyData.bio === updates.bio,
            descriptionMatch: verifyData.description === updates.description,
            actualBio: verifyData.bio?.substring(0, 50) + "..." || "null"
          });
        }
      } catch (verifyErr) {
        console.warn("Update verification failed:", verifyErr);
        // Don't fail the request if verification fails
      }

      // Transform response to expected frontend format
      const responseProfile = {
        id: updatedProfile.id,
        username: updatedProfile.username,
        email: updatedProfile.email,
        phone: updatedProfile.phone,
        profileImageUrl: updatedProfile.profile_image_url,
        description: updatedProfile.description || updatedProfile.bio,
        bio: updatedProfile.bio || updatedProfile.description,
        xp: updatedProfile.xp || 0,
        level: updatedProfile.level || 1,
        followerCount: updatedProfile.follower_count || 0,
        followingCount: updatedProfile.following_count || 0,
        coreRealm: updatedProfile.core_realm,
        subRealms: updatedProfile.sub_realm || [],
        createdAt: updatedProfile.created_at,
        updatedAt: updatedProfile.updated_at
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
        error: "Internal server error during profile update",
        details: error.message
      }, 500);
    }
  };

  // Register both PATCH and PUT methods for profile updates
  app.patch("/make-server-70df0d6e/users/profile", handleProfileUpdate);
  app.put("/make-server-70df0d6e/users/profile", handleProfileUpdate);

  console.log("Enhanced bio update route registered");
}