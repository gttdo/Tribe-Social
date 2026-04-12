import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js";
import { z } from "npm:zod";
import * as kv from "./kv_store.tsx";
import {
  DatabaseUser,
  CoreRealmDB,
  SubRealmDB,
} from "./types.tsx";
import {
  authenticateUser,
  dbUserToFrontend,
  generateNickname,
  canUserViewPost,
} from "./helpers.tsx";
import {
  isValidUUID,
  resolvePostIdSafe,
  resolvePostIds,
} from "./post-id-helpers.tsx";
import { setupAuthRoutes } from "./auth-routes.tsx";
import { setupDeleteRoutes } from "./delete-routes.tsx";

// Initialize Supabase clients
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get(
  "SUPABASE_SERVICE_ROLE_KEY",
)!;
const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey,
);

// Validation schemas for notifications
const notificationQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(30),
  cursor: z.string().optional(), // for keyset pagination using created_at timestamp
  unreadOnly: z.coerce.boolean().optional().default(false),
});

const markAsReadSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50),
});

const createNotificationSchema = z.object({
  user_id: z.string().uuid(),
  type: z.enum([
    "like",
    "comment",
    "follow",
    "realm_activity",
    "achievement",
    "message",
    "system",
    "announcement",
    "tribe_access_request",
    "tribe_access_approved",
    "tribe_access_denied",
  ]),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(1000),
  related_id: z.string().optional(),
  related_data: z.record(z.any()).optional(),
});

const profileUpdateSchema = z.object({
  bio: z.string().max(280).optional(),
  description: z.string().max(280).optional(),
  username: z.string().min(3).max(20).optional(),
  profile_privacy: z
    .enum(["public", "private", "friends"])
    .optional(),
});

// Follow routes
function setupFollowRoutes(app: Hono) {
  console.log("=== SETTING UP FOLLOW ROUTES ===");

  // Follow a user
  app.post("/make-server-70df0d6e/users/:userId/follow", async (c) => {
    try {
      console.log("=== FOLLOW USER REQUEST ===");

      const { user, error } = await authenticateUser(c.req.raw);
      if (error || !user?.id) {
        console.log("Authentication failed:", error);
        return c.json({ error: error || "Authentication required" }, 401);
      }

      const targetUserId = c.req.param("userId");
      console.log("Following user:", targetUserId, "by:", user.id.substring(0, 8) + "...");

      // Validate target user ID
      if (!targetUserId || !isValidUUID(targetUserId)) {
        return c.json({ error: "Invalid user ID" }, 400);
      }

      // Prevent self-follow
      if (targetUserId === user.id) {
        return c.json({ error: "Cannot follow yourself" }, 400);
      }

      // Check if target user exists
      const { data: targetUser, error: targetUserError } = await supabaseAdmin
        .from("users")
        .select("id, username")
        .eq("id", targetUserId)
        .maybeSingle();

      if (targetUserError) {
        console.error("Error checking target user:", targetUserError);
        return c.json({ error: "Failed to find user" }, 500);
      }

      if (!targetUser) {
        return c.json({ error: "User not found" }, 404);
      }

      // Check if already following
      const { data: existingFollow, error: checkError } = await supabaseAdmin
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId)
        .maybeSingle();

      if (checkError) {
        console.error("Error checking existing follow:", checkError);
        return c.json({ error: "Failed to check follow status" }, 500);
      }

      if (existingFollow) {
        return c.json({ error: "Already following this user" }, 409);
      }

      // Create follow relationship
      const { error: insertError } = await supabaseAdmin
        .from("follows")
        .insert({
          follower_id: user.id,
          following_id: targetUserId
        });

      if (insertError) {
        console.error("Error creating follow:", insertError);
        if (insertError.code === "23505") {
          return c.json({ error: "Already following this user" }, 409);
        }
        return c.json({ error: "Failed to follow user" }, 500);
      }

      // Update follower/following counts
      await Promise.allSettled([
        // Increment target user's follower count
        supabaseAdmin.rpc('increment_follower_count', { user_id: targetUserId }),
        // Increment current user's following count
        supabaseAdmin.rpc('increment_following_count', { user_id: user.id })
      ]);

      // Get current user's username for notification
      const { data: currentUserData } = await supabaseAdmin
        .from("users")
        .select("username")
        .eq("id", user.id)
        .single();

      // Create notification for followed user
      try {
        const notificationData = {
          user_id: targetUserId,
          type: "follow" as const,
          title: "New Follower",
          content: `@${currentUserData?.username || "Someone"} started following you`,
          related_id: user.id,
          related_data: {
            follower_username: currentUserData?.username || "Unknown",
            follower_id: user.id
          }
        };

        // Try inserting with 'message' column first, fallback to 'content'
        try {
          await supabaseAdmin
            .from("notifications")
            .insert({
              ...notificationData,
              message: notificationData.content,
              is_read: false
            });
        } catch (messageError) {
          await supabaseAdmin
            .from("notifications")
            .insert({
              ...notificationData,
              is_read: false
            });
        }
        console.log("Follow notification created successfully");
      } catch (notificationError) {
        console.error("Failed to create follow notification (non-critical):", notificationError);
      }

      console.log("Follow relationship created successfully");
      return c.json({ 
        success: true, 
        message: `Now following ${targetUser.username}` 
      }, 201);

    } catch (error) {
      console.error("Error following user:", error);
      return c.json({
        error: "Internal server error while following user",
        details: error.message
      }, 500);
    }
  });

  // Unfollow a user
  app.delete("/make-server-70df0d6e/users/:userId/follow", async (c) => {
    try {
      console.log("=== UNFOLLOW USER REQUEST ===");

      const { user, error } = await authenticateUser(c.req.raw);
      if (error || !user?.id) {
        console.log("Authentication failed:", error);
        return c.json({ error: error || "Authentication required" }, 401);
      }

      const targetUserId = c.req.param("userId");
      console.log("Unfollowing user:", targetUserId, "by:", user.id.substring(0, 8) + "...");

      // Validate target user ID
      if (!targetUserId || !isValidUUID(targetUserId)) {
        return c.json({ error: "Invalid user ID" }, 400);
      }

      // Prevent self-unfollow
      if (targetUserId === user.id) {
        return c.json({ error: "Cannot unfollow yourself" }, 400);
      }

      // Check if target user exists
      const { data: targetUser, error: targetUserError } = await supabaseAdmin
        .from("users")
        .select("id, username")
        .eq("id", targetUserId)
        .maybeSingle();

      if (targetUserError) {
        console.error("Error checking target user:", targetUserError);
        return c.json({ error: "Failed to find user" }, 500);
      }

      if (!targetUser) {
        return c.json({ error: "User not found" }, 404);
      }

      // Check if currently following
      const { data: existingFollow, error: checkError } = await supabaseAdmin
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId)
        .maybeSingle();

      if (checkError) {
        console.error("Error checking follow status:", checkError);
        return c.json({ error: "Failed to check follow status" }, 500);
      }

      if (!existingFollow) {
        return c.json({ error: "Not following this user" }, 409);
      }

      // Remove follow relationship
      const { error: deleteError } = await supabaseAdmin
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId);

      if (deleteError) {
        console.error("Error removing follow:", deleteError);
        return c.json({ error: "Failed to unfollow user" }, 500);
      }

      // Update follower/following counts
      await Promise.allSettled([
        // Decrement target user's follower count
        supabaseAdmin.rpc('decrement_follower_count', { user_id: targetUserId }),
        // Decrement current user's following count
        supabaseAdmin.rpc('decrement_following_count', { user_id: user.id })
      ]);

      console.log("Follow relationship removed successfully");
      return c.json({ 
        success: true, 
        message: `Unfollowed ${targetUser.username}` 
      });

    } catch (error) {
      console.error("Error unfollowing user:", error);
      return c.json({
        error: "Internal server error while unfollowing user",
        details: error.message
      }, 500);
    }
  });

  // Get follow status between current user and target user
  app.get("/make-server-70df0d6e/users/:userId/follow-status", async (c) => {
    try {
      const { user, error } = await authenticateUser(c.req.raw);
      if (error || !user?.id) {
        return c.json({ error: error || "Authentication required" }, 401);
      }

      const targetUserId = c.req.param("userId");

      if (!targetUserId || !isValidUUID(targetUserId)) {
        return c.json({ error: "Invalid user ID" }, 400);
      }

      // Check both directions
      const [isFollowing, isFollowedBy] = await Promise.allSettled([
        supabaseAdmin
          .from("follows")
          .select("id")
          .eq("follower_id", user.id)
          .eq("following_id", targetUserId)
          .maybeSingle(),
        supabaseAdmin
          .from("follows")
          .select("id")
          .eq("follower_id", targetUserId)
          .eq("following_id", user.id)
          .maybeSingle()
      ]);

      return c.json({
        isFollowing: isFollowing.status === 'fulfilled' && !isFollowing.value.error && !!isFollowing.value.data,
        isFollowedBy: isFollowedBy.status === 'fulfilled' && !isFollowedBy.value.error && !!isFollowedBy.value.data,
        isSelf: targetUserId === user.id
      });

    } catch (error) {
      console.error("Error getting follow status:", error);
      return c.json({
        error: "Internal server error while getting follow status",
        details: error.message
      }, 500);
    }
  });
}

// Profile routes with enhanced bio update functionality
function setupProfileRoutes(app: Hono) {
  console.log("=== SETTING UP PROFILE ROUTES ===");

  // Get user profile (GET)
  app.get("/make-server-70df0d6e/users/profile", async (c) => {
    try {
      console.log("=== GET USER PROFILE REQUEST ===");

      const { user, error } = await authenticateUser(c.req.raw);
      if (error || !user?.id) {
        console.log("Authentication failed:", error);
        return c.json({ error: error || "Authentication required" }, 401);
      }

      console.log("Getting profile for user:", user.id.substring(0, 8) + "...");

      // Get user profile from users table
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("users")
        .select(`
          id, username, email, phone,
          profile_image_url, bio, description,
          xp, level, follower_count, following_count,
          core_realm, sub_realm, created_at, updated_at
        `)
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Error fetching user profile:", profileError);
        return c.json({ error: "Failed to fetch profile" }, 500);
      }

      if (!profile) {
        return c.json({ error: "Profile not found" }, 404);
      }

      // Transform profile for frontend
      const responseProfile = {
        id: profile.id,
        username: profile.username,
        email: profile.email,
        phone: profile.phone,
        profileImageUrl: profile.profile_image_url,
        description: profile.description || profile.bio,
        bio: profile.bio || profile.description,
        xp: profile.xp || 0,
        level: profile.level || 1,
        followerCount: profile.follower_count || 0,
        followingCount: profile.following_count || 0,
        coreRealm: profile.core_realm,
        subRealms: profile.sub_realm || [],
        createdAt: profile.created_at,
        updatedAt: profile.updated_at
      };

      console.log("Profile fetched successfully");
      return c.json({ profile: responseProfile });

    } catch (error) {
      console.error("Critical profile fetch error:", error);
      return c.json({
        error: "Internal server error while fetching profile",
        details: error.message
      }, 500);
    }
  });

  // Update user profile (PATCH)
  app.patch("/make-server-70df0d6e/users/profile", async (c) => {
    try {
      console.log("=== ENHANCED PROFILE UPDATE REQUEST ===");
      
      const { user, error } = await authenticateUser(c.req.raw);
      if (error || !user?.id) {
        console.log("Authentication failed:", error);
        return c.json({ error: error || "Authentication required" }, 401);
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
        hasDescription: !!requestBody.description,
        hasUsername: !!requestBody.username
      });

      // Validate input using schema
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
        updates.description = trimmedBio; // Keep both fields in sync
        updates.updated_at = timestamp;
      } else if (validatedData.description !== undefined) {
        const trimmedDesc = validatedData.description.trim();
        console.log("Processing description update:", {
          original: validatedData.description.length,
          trimmed: trimmedDesc.length
        });
        
        updates.description = trimmedDesc;
        updates.bio = trimmedDesc; // Keep both fields in sync
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
          .from("users")
          .update(updates)
          .eq("id", user.id)
          .select(`
            id, username, email, phone, 
            profile_image_url, bio, description,
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
          .from("users")
          .select("id, bio, description, updated_at")
          .eq("id", user.id)
          .single();

        if (verifyError) {
          console.warn("Verification query failed:", verifyError);
        } else {
          const expectedBio = updates.bio || updates.description;
          const actualBio = verificationData.bio || verificationData.description;
          
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
        profileImageUrl: updateResult.profile_image_url,
        description: updateResult.description || updateResult.bio,
        bio: updateResult.bio || updateResult.description,
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

  console.log("Profile routes registered successfully");
}

// Comment routes with enhanced validation
function setupCommentRoutes(app: Hono) {
  console.log("=== SETTING UP COMMENT ROUTES ===");

  // Get comments for a post
  app.get(
    "/make-server-70df0d6e/posts/:postId/comments",
    async (c) => {
      try {
        console.log("=== GET COMMENTS REQUEST ===");

        const { user, error } = await authenticateUser(
          c.req.raw,
        );
        if (error) {
          console.log("Authentication error:", error);
          return c.json({ error }, 401);
        }

        const postId = c.req.param("postId");
        console.log("Getting comments for post:", postId);

        // Validate and resolve post ID
        const resolvedPostId = await resolvePostIdSafe(postId);

        if (!resolvedPostId) {
          return c.json(
            { error: "Invalid or missing postId" },
            400,
          );
        }

        // Check if post exists
        const { data: postData, error: postError } =
          await supabaseAdmin
            .from("posts")
            .select("id")
            .eq("id", resolvedPostId)
            .maybeSingle();

        if (postError) {
          console.error(
            "Error checking post existence:",
            postError,
          );
          return c.json({ error: "Failed to find post" }, 500);
        }

        if (!postData) {
          return c.json({ error: "Post not found" }, 404);
        }

        // Get comments with user information
        const { data: comments, error: commentsError } =
          await supabaseAdmin
            .from("post_comments")
            .select(
              `
          id,
          post_id,
          user_id,
          body,
          created_at,
          users!inner (
            username
          )
        `,
            )
            .eq("post_id", resolvedPostId)
            .order("created_at", { ascending: true });

        if (commentsError) {
          console.error(
            "Error fetching comments:",
            commentsError,
          );
          return c.json(
            { error: "Failed to fetch comments" },
            500,
          );
        }

        // Transform comments for response
        const transformedComments = (comments || []).map(
          (comment) => ({
            id: comment.id,
            post_id: comment.post_id,
            user_id: comment.user_id,
            username: comment.users?.username || "Unknown",
            body: comment.body,
            content: comment.body, // Backward compatibility
            created_at: comment.created_at,
            createdAt: comment.created_at,
          }),
        );

        console.log(
          `Returning ${transformedComments.length} comments`,
        );
        return c.json({ comments: transformedComments });
      } catch (error) {
        console.error("Error getting comments:", error);
        return c.json(
          {
            error:
              "Internal server error while fetching comments",
            details: error.message,
          },
          500,
        );
      }
    },
  );

  // Create comment with notification
  app.post(
    "/make-server-70df0d6e/posts/:postId/comments",
    async (c) => {
      try {
        console.log("=== CREATE COMMENT REQUEST ===");

        const { user, error } = await authenticateUser(
          c.req.raw,
        );
        if (error) {
          console.log("Authentication error:", error);
          return c.json({ error }, 401);
        }

        const postId = c.req.param("postId");
        const body = await c.req.json();
        const { body: commentBody } = body;

        console.log(
          "Creating comment for post:",
          postId,
          "body length:",
          commentBody?.length,
        );

        // Validate comment body
        if (!commentBody || !commentBody.trim()) {
          return c.json(
            { error: "Comment body is required" },
            400,
          );
        }

        if (commentBody.trim().length > 500) {
          return c.json(
            { error: "Comment must be 500 characters or less" },
            400,
          );
        }

        // Validate and resolve post ID
        const resolvedPostId = await resolvePostIdSafe(postId);

        if (!resolvedPostId) {
          return c.json(
            { error: "Invalid or missing postId" },
            400,
          );
        }

        // Check if post exists and get post owner info
        const { data: postData, error: postError } =
          await supabaseAdmin
            .from("posts")
            .select(
              `
          id, 
          user_id,
          caption,
          text_body,
          post_type
        `,
            )
            .eq("id", resolvedPostId)
            .maybeSingle();

        if (postError) {
          console.error(
            "Error checking post existence:",
            postError,
          );
          return c.json({ error: "Failed to find post" }, 500);
        }

        if (!postData) {
          return c.json({ error: "Post not found" }, 404);
        }

        // Validate user ID before using in queries
        if (!user || !user.id || !isValidUUID(user.id)) {
          console.error(
            "[Comment User ID Guard] Invalid user ID:",
            user?.id,
          );
          return c.json(
            { error: "Invalid user authentication" },
            401,
          );
        }

        // Get commenter's username
        const { data: commenterData, error: commenterError } =
          await supabaseAdmin
            .from("users")
            .select("username")
            .eq("id", user.id)
            .maybeSingle();

        if (commenterError) {
          console.error(
            "Error getting commenter info:",
            commenterError,
          );
          return c.json(
            { error: "Failed to get user info" },
            500,
          );
        }

        // Insert comment using "body" field
        const { data: newComment, error: insertError } =
          await supabaseAdmin
            .from("post_comments")
            .insert({
              post_id: resolvedPostId,
              user_id: user.id,
              body: commentBody.trim(),
            })
            .select(
              `
          id,
          post_id,
          user_id,
          body,
          created_at
        `,
            )
            .maybeSingle();

        if (insertError) {
          console.error(
            "Error inserting comment:",
            insertError,
          );
          return c.json(
            { error: "Failed to create comment" },
            500,
          );
        }

        if (!newComment) {
          console.error("No comment returned after insertion");
          return c.json(
            {
              error:
                "Failed to create comment - no data returned",
            },
            500,
          );
        }

        // Create notification for post owner (if commenter is not the post owner)
        if (postData.user_id !== user.id) {
          try {
            console.log(
              "Creating comment notification for post owner:",
              postData.user_id,
            );

            // Determine post caption/content for notification
            const postCaption =
              postData.caption ||
              postData.text_body ||
              "your post";
            const truncatedCaption =
              postCaption.length > 50
                ? postCaption.substring(0, 50) + "..."
                : postCaption;

            // Best-effort notification - try message first, fallback to content
            const notificationData = {
              user_id: postData.user_id,
              type: "comment" as const,
              title: "New Comment",
              content: `@${commenterData?.username || "Someone"} commented: "${commentBody.substring(0, 50)}${commentBody.length > 50 ? "..." : ""}"`,
              related_id: resolvedPostId,
              related_data: {
                username: commenterData?.username || "Unknown",
                postCaption: truncatedCaption,
                commentContent: commentBody.trim(),
              },
            };

            // Manual validation to avoid Zod import issues
            const isValidNotification = 
              notificationData &&
              typeof notificationData.user_id === 'string' &&
              notificationData.user_id.length === 36 && // UUID length
              typeof notificationData.type === 'string' &&
              ['like', 'comment', 'follow', 'realm_activity', 'achievement', 'message', 'system', 'announcement', 'tribe_access_request', 'tribe_access_approved', 'tribe_access_denied'].includes(notificationData.type) &&
              typeof notificationData.title === 'string' &&
              notificationData.title.length > 0 &&
              notificationData.title.length <= 200 &&
              typeof notificationData.content === 'string' &&
              notificationData.content.length > 0 &&
              notificationData.content.length <= 1000;

            if (isValidNotification) {
              // Try inserting with 'message' column first, fallback to 'content'
              try {
                await supabaseAdmin
                  .from("notifications")
                  .insert({
                    ...notificationData,
                    message: notificationData.content, // Try message column
                    is_read: false,
                  });
                console.log(
                  "Comment notification created successfully",
                );
              } catch (messageError) {
                console.log(
                  "Message column not found, using content column:",
                  messageError,
                );
                await supabaseAdmin
                  .from("notifications")
                  .insert({
                    ...notificationData,
                    is_read: false,
                  });
                console.log(
                  "Comment notification created with content column",
                );
              }
            } else {
              console.error(
                "Notification validation failed: invalid data format",
                notificationData,
              );
            }
          } catch (notificationError) {
            console.error(
              "Failed to create comment notification (non-critical):",
              notificationError,
            );
          }
        } else {
          console.log(
            "Skipping notification - user commented on their own post",
          );
        }

        console.log(
          "Comment created successfully:",
          newComment.id,
        );

        // Return comment with "body" field
        const responseComment = {
          id: newComment.id,
          post_id: newComment.post_id,
          user_id: newComment.user_id,
          username: commenterData?.username || "Unknown",
          body: newComment.body,
          content: newComment.body, // Backward compatibility
          created_at: newComment.created_at,
          createdAt: newComment.created_at,
        };

        return c.json({ comment: responseComment }, 201);
      } catch (error) {
        console.error("Error creating comment:", error);
        return c.json(
          {
            error:
              "Internal server error while creating comment",
            details: error.message,
          },
          500,
        );
      }
    },
  );
}

export function setupRoutes(app: Hono) {
  console.log("=== SETTING UP SERVER ROUTES ===");
  console.log("Hono app instance received:", !!app);

  setupAuthRoutes(app); // Initialize auth routes
  setupCommentRoutes(app); // Initialize comment routes
  setupDeleteRoutes(app); // Initialize delete routes
  setupFollowRoutes(app); // Initialize follow routes
  
  // Setup profile routes
  setupProfileRoutes(app);
  
  // Main posts feed route - CRITICAL for app functionality
  console.log("=== SETTING UP MAIN POSTS FEED ROUTE ===");
  
  app.get("/make-server-70df0d6e/posts", async (c) => {
    try {
      console.log("=== GET POSTS FEED REQUEST ===");
      
      const { user, error } = await authenticateUser(c.req.raw);
      if (error || !user?.id) {
        console.log("Authentication failed:", error);
        return c.json({ error: error || "Authentication required" }, 401);
      }

      console.log("Getting posts feed for user:", user.id.substring(0, 8) + "...");

      // Get posts with user information
      const { data: postsData, error: postsError } = await supabaseAdmin
        .from("posts")
        .select(`
          id,
          user_id,
          post_type,
          text_body,
          caption,
          media_url,
          media_thumb_url,
          visibility,
          tribe_id,
          like_count,
          comment_count,
          created_at,
          users!inner (
            username,
            profile_image_url
          )
        `)
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .limit(30);

      if (postsError) {
        console.error("Error fetching posts:", postsError);
        return c.json({ error: "Failed to fetch posts" }, 500);
      }

      // Transform posts for frontend compatibility
      const transformedPosts = (postsData || []).map((post) => ({
        id: post.id,
        user_id: post.user_id,
        userId: post.user_id,
        username: post.users?.username || "Unknown",
        nickname: post.users?.username || "Unknown User",
        profileImageUrl: post.users?.profile_image_url,
        type: post.post_type || "thought",
        post_type: post.post_type || "thought",
        text_body: post.text_body,
        content: post.text_body || post.caption,
        caption: post.caption,
        media_url: post.media_url,
        contentUrl: post.media_url,
        imageUrl: post.media_url,
        media_thumb_url: post.media_thumb_url,
        thumbnail_url: post.media_thumb_url,
        visibility: post.visibility || "public",
        tribe_id: post.tribe_id,
        likes: post.like_count || 0,
        like_count: post.like_count || 0,
        comments: post.comment_count || 0,
        comment_count: post.comment_count || 0,
        liked: false, // TODO: Check if user has liked this post
        bookmarked: false, // TODO: Check if user has bookmarked this post
        created_at: post.created_at,
        createdAt: post.created_at
      }));

      console.log(`Successfully fetched ${transformedPosts.length} posts`);
      return c.json({ posts: transformedPosts });

    } catch (error) {
      console.error("Critical posts feed error:", error);
      return c.json({ 
        error: "Internal server error while fetching posts", 
        details: error.message 
      }, 500);
    }
  });
  
  // Post creation route
  app.post("/make-server-70df0d6e/posts", async (c) => {
    try {
      console.log("=== CREATE POST REQUEST ===");
      
      const { user, error } = await authenticateUser(c.req.raw);
      if (error || !user?.id) {
        console.log("Authentication failed:", error);
        return c.json({ error: error || "Authentication required" }, 401);
      }

      const body = await c.req.json();
      const { post_type, text_body, caption, media_url, media_thumb_url, visibility, tribe_id } = body;

      console.log("Creating post for user:", user.id.substring(0, 8) + "...", "type:", post_type);

      // Validate required fields
      if (!post_type) {
        return c.json({ error: "Post type is required" }, 400);
      }

      if (post_type === "thought" && !text_body?.trim()) {
        return c.json({ error: "Text content is required for thought posts" }, 400);
      }

      // Insert the new post
      const { data: newPost, error: insertError } = await supabaseAdmin
        .from("posts")
        .insert({
          user_id: user.id,
          post_type: post_type,
          text_body: text_body?.trim(),
          caption: caption?.trim(),
          media_url,
          media_thumb_url,
          visibility: visibility || "public",
          tribe_id: tribe_id || null,
          like_count: 0,
          comment_count: 0
        })
        .select(`
          id,
          user_id,
          post_type,
          text_body,
          caption,
          media_url,
          media_thumb_url,
          visibility,
          tribe_id,
          like_count,
          comment_count,
          created_at
        `)
        .single();

      if (insertError) {
        console.error("Error inserting post:", insertError);
        return c.json({ error: "Failed to create post" }, 500);
      }

      // Get user data for response
      const { data: userData } = await supabaseAdmin
        .from("users")
        .select("username, profile_image_url")
        .eq("id", user.id)
        .single();

      // Transform for frontend compatibility
      const responsePost = {
        id: newPost.id,
        user_id: newPost.user_id,
        userId: newPost.user_id,
        username: userData?.username || "Unknown",
        nickname: userData?.username || "Unknown User",
        profileImageUrl: userData?.profile_image_url,
        type: newPost.post_type,
        post_type: newPost.post_type,
        text_body: newPost.text_body,
        content: newPost.text_body || newPost.caption,
        caption: newPost.caption,
        media_url: newPost.media_url,
        contentUrl: newPost.media_url,
        imageUrl: newPost.media_url,
        media_thumb_url: newPost.media_thumb_url,
        thumbnail_url: newPost.media_thumb_url,
        visibility: newPost.visibility,
        tribe_id: newPost.tribe_id,
        likes: 0,
        like_count: 0,
        comments: 0,
        comment_count: 0,
        liked: false,
        bookmarked: false,
        created_at: newPost.created_at,
        createdAt: newPost.created_at
      };

      console.log("Post created successfully:", newPost.id);
      return c.json({ post: responsePost }, 201);

    } catch (error) {
      console.error("Critical post creation error:", error);
      return c.json({ 
        error: "Internal server error while creating post", 
        details: error.message 
      }, 500);
    }
  });
  
  // User profile routes
  console.log("=== SETTING UP PROFILE ROUTES ===");
  
  // Get user profile
  app.get("/make-server-70df0d6e/users/profile", async (c) => {
    try {
      console.log("=== GET USER PROFILE REQUEST ===");
      
      const { user, error } = await authenticateUser(c.req.raw);
      if (error || !user?.id) {
        console.log("Authentication failed:", error);
        return c.json({ error: error || "Authentication required" }, 401);
      }

      console.log("Getting profile for user:", user.id.substring(0, 8) + "...");

      // Get user data from users table and profile data from profiles table
      const [usersResult, profilesResult] = await Promise.allSettled([
        supabaseAdmin
          .from("users")
          .select(`
            id, username, email, phone, 
            profile_image_url, xp, level, follower_count, following_count,
            core_realm, sub_realm, created_at, updated_at
          `)
          .eq("id", user.id)
          .single(),
        supabaseAdmin
          .from("profiles")
          .select("id, display_name, avatar_url, bio")
          .eq("id", user.id)
          .single()
      ]);

      // Handle users table result
      let userData = null;
      if (usersResult.status === 'fulfilled' && !usersResult.value.error) {
        userData = usersResult.value.data;
      } else {
        console.error("Error fetching user data:", usersResult.status === 'fulfilled' ? usersResult.value.error : usersResult.reason);
        return c.json({ error: "Failed to fetch user data" }, 500);
      }

      // Handle profiles table result (bio is optional)
      let profileData = null;
      if (profilesResult.status === 'fulfilled' && !profilesResult.value.error) {
        profileData = profilesResult.value.data;
      } else {
        console.log("No profile data found (this is okay for new users):", profilesResult.status === 'fulfilled' ? profilesResult.value.error : profilesResult.reason);
      }

      if (!userData) {
        return c.json({ error: "User not found" }, 404);
      }

      // Format response for frontend compatibility, combining data from both tables
      const responseProfile = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        phone: userData.phone,
        profileImageUrl: userData.profile_image_url,
        description: profileData?.bio || '', // Use bio from profiles table
        bio: profileData?.bio || '', // Use bio from profiles table
        xp: userData.xp || 0,
        level: userData.level || 1,
        followerCount: userData.follower_count || 0,
        followingCount: userData.following_count || 0,
        coreRealm: userData.core_realm,
        subRealms: userData.sub_realm || [],
        createdAt: userData.created_at,
        updatedAt: userData.updated_at
      };

      console.log("Profile fetched successfully");
      return c.json({ 
        profile: responseProfile 
      });

    } catch (error) {
      console.error("Critical profile fetch error:", error);
      return c.json({ 
        error: "Internal server error", 
        details: error.message 
      }, 500);
    }
  });
  
  // Update user profile (PATCH)
  app.patch("/make-server-70df0d6e/users/profile", async (c) => {
    try {
      console.log("=== UPDATE USER PROFILE REQUEST (PATCH) ===");
      
      const { user, error } = await authenticateUser(c.req.raw);
      if (error || !user?.id) {
        console.log("Authentication failed:", error);
        return c.json({ error: error || "Authentication required" }, 401);
      }

      console.log("Updating profile for user:", user.id.substring(0, 8) + "...");

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

      // Manual validation to avoid Zod issues
      const updates: any = {};
      const timestamp = new Date().toISOString();

      // Handle bio updates separately (goes to profiles table)
      let bioUpdate = null;
      if (requestBody.bio !== undefined) {
        const trimmedBio = requestBody.bio.trim().slice(0, 280);
        console.log("Processing bio update:", {
          original: requestBody.bio.length,
          trimmed: trimmedBio.length,
          preview: trimmedBio.substring(0, 50) + (trimmedBio.length > 50 ? "..." : "")
        });
        
        bioUpdate = trimmedBio;
      } else if (requestBody.description !== undefined) {
        const trimmedDesc = requestBody.description.trim().slice(0, 280);
        console.log("Processing description update:", {
          original: requestBody.description.length,
          trimmed: trimmedDesc.length
        });
        
        bioUpdate = trimmedDesc;
      }

      // Process other updates
      if (requestBody.username !== undefined) {
        const trimmedUsername = requestBody.username.trim();
        if (trimmedUsername.length >= 3 && trimmedUsername.length <= 20) {
          updates.username = trimmedUsername;
          updates.updated_at = timestamp;
        } else {
          return c.json({ error: "Username must be between 3 and 20 characters" }, 400);
        }
      }

      if (requestBody.profile_privacy !== undefined) {
        if (["public", "private", "friends"].includes(requestBody.profile_privacy)) {
          updates.profile_privacy = requestBody.profile_privacy;
          updates.updated_at = timestamp;
        } else {
          return c.json({ error: "Invalid profile privacy setting" }, 400);
        }
      }

      // Ensure we have updates to apply (either user table updates OR bio update)
      if (Object.keys(updates).length === 0 && bioUpdate === null) {
        console.log("No updates to apply");
        return c.json({ error: "No valid updates provided" }, 400);
      }

      console.log("Applying updates:", Object.keys(updates), bioUpdate ? "and bio update" : "");

      // Execute updates - handle both users table and profiles table
      let updateResult = null;
      let profileResult = null;

      // Update users table if we have user-related updates
      if (Object.keys(updates).length > 0) {
        const { data, error: updateError } = await supabaseAdmin
          .from("users")
          .update(updates)
          .eq("id", user.id)
          .select(`
            id, username, email, phone, 
            profile_image_url, xp, level, follower_count, following_count,
            core_realm, sub_realm, created_at, updated_at
          `)
          .single();

        if (updateError) {
          console.error("Users table update error:", updateError);
          
          // Handle specific database errors
          if (updateError.code === "23505") {
            return c.json({ error: "Username already exists" }, 409);
          } else {
            return c.json({ 
              error: "Database update failed",
              details: updateError.message
            }, 500);
          }
        }

        updateResult = data;
      } else {
        // If no users table updates, just fetch current data
        const { data, error: fetchError } = await supabaseAdmin
          .from("users")
          .select(`
            id, username, email, phone, 
            profile_image_url, xp, level, follower_count, following_count,
            core_realm, sub_realm, created_at, updated_at
          `)
          .eq("id", user.id)
          .single();

        if (fetchError) {
          console.error("Error fetching user data:", fetchError);
          return c.json({ error: "Failed to fetch user data" }, 500);
        }

        updateResult = data;
      }

      // Update profiles table if we have bio update
      if (bioUpdate !== null) {
        // Use upsert to handle both insert and update cases
        const { data, error: bioError } = await supabaseAdmin
          .from("profiles")
          .upsert({ 
            id: user.id,
            bio: bioUpdate
          }, { onConflict: 'id' })
          .select("id, display_name, avatar_url, bio")
          .single();

        if (bioError) {
          console.error("Profiles table bio update error:", bioError);
          return c.json({ 
            error: "Bio update failed",
            details: bioError.message
          }, 500);
        }

        profileResult = data;
      } else {
        // Fetch existing profile data
        const { data, error: profileFetchError } = await supabaseAdmin
          .from("profiles")
          .select("id, display_name, avatar_url, bio")
          .eq("id", user.id)
          .single();

        if (!profileFetchError) {
          profileResult = data;
        }
        // If no profile exists, that's okay - profileResult stays null
      }

      if (!updateResult) {
        console.error("No user data returned from update/fetch");
        return c.json({ error: "Update failed - no user data returned" }, 500);
      }

      console.log("Update successful:", {
        userId: updateResult.id.substring(0, 8) + "...",
        bioLength: profileResult?.bio?.length || 0,
        updatedAt: updateResult.updated_at
      });

      // Format response for frontend compatibility, combining data from both tables
      const responseProfile = {
        id: updateResult.id,
        username: updateResult.username,
        email: updateResult.email,
        phone: updateResult.phone,
        profileImageUrl: updateResult.profile_image_url,
        description: profileResult?.bio || '', // Use bio from profiles table
        bio: profileResult?.bio || '', // Use bio from profiles table  
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
    // Forward PUT requests to PATCH handler
    const newRequest = new Request(c.req.url, {
      method: "PATCH",
      headers: c.req.raw.headers,
      body: c.req.raw.body
    });
    
    return app.fetch(newRequest);
  });

  // Saved posts endpoint
  app.get("/make-server-70df0d6e/saved-posts", async (c) => {
    try {
      console.log("=== GET SAVED POSTS REQUEST ===");

      const { user, error } = await authenticateUser(c.req.raw);
      if (error || !user?.id) {
        console.log("Authentication failed:", error);
        return c.json({ error: error || "Authentication required" }, 401);
      }

      console.log("Loading saved posts for user:", user.id.substring(0, 8) + "...");

      // Get saved posts with embedded post data
      const { data: savedPosts, error: savedError } = await supabaseAdmin
        .from("post_bookmarks")
        .select(`
          created_at,
          posts (*)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (savedError) {
        console.error("Error fetching saved posts:", savedError);
        return c.json({
          error: "Failed to load saved posts",
          details: savedError.message
        }, 500);
      }

      // Transform the data to flatten posts and add saved timestamp
      const transformedPosts = (savedPosts || [])
        .filter(item => item.posts) // Filter out any null posts
        .map(item => ({
          ...item.posts,
          saved_at: item.created_at
        }));

      console.log(`Returning ${transformedPosts.length} saved posts`);
      
      return c.json({ data: transformedPosts });

    } catch (error) {
      console.error("Error loading saved posts:", error);
      return c.json({
        error: "Internal server error while loading saved posts",
        details: error.message
      }, 500);
    }
  });

  // Health check endpoint
  app.get("/make-server-70df0d6e/health", async (c) => {
    try {
      // Test database connectivity
      const { data: testQuery, error: testError } = await supabaseAdmin
        .from('users')
        .select('id')
        .limit(1);

      if (testError) {
        console.error('Health check database test failed:', testError);
        return c.json({
          healthy: false,
          message: "Database connectivity failed",
          timestamp: new Date().toISOString(),
          error: testError.message
        }, 500);
      }

      return c.json({
        healthy: true,
        message: "Tribe Board API is healthy",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        database: "connected",
        endpoints: {
          profile: "/make-server-70df0d6e/users/profile",
          posts: "/make-server-70df0d6e/posts",
          auth: "/make-server-70df0d6e/auth",
          "saved-posts": "/make-server-70df0d6e/saved-posts"
        }
      });
    } catch (error) {
      console.error('Health check failed:', error);
      return c.json({
        healthy: false,
        message: "Health check failed",
        timestamp: new Date().toISOString(),
        error: error.message
      }, 500);
    }
  });

  // Test endpoint
  app.get("/test", async (c) => {
    return c.json({
      message: "Tribe Board API is running",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    });
  });

  // Get posts for a specific user (User Profile Posts) - HARDENED
  app.get(
    "/make-server-70df0d6e/users/:userId/posts",
    async (c) => {
      try {
        console.log("=== GET USER POSTS REQUEST ===");

        const { user, error } = await authenticateUser(
          c.req.raw,
        );
        if (error) {
          console.log("Authentication error:", error);
          return c.json({ error }, 401);
        }

        const userId = c.req.param("userId");
        console.log("Getting posts for user:", userId);

        // Use centralized validation - PREVENTS 22P02 ERRORS
        if (!userId || !isValidUUID(userId)) {
          console.error("Invalid or missing userId:", userId);
          return c.json(
            { error: "Invalid or missing userId" },
            400,
          );
        }

        console.log("Validated userId:", userId);

        // Get user profile information first to verify user exists
        const { data: userProfile, error: userError } =
          await supabaseAdmin
            .from("users")
            .select("id, username, profile_image_url")
            .eq("id", userId)
            .maybeSingle();

        if (userError) {
          console.error(
            "Error fetching user profile:",
            userError,
          );
          return c.json({ error: "Failed to find user" }, 500);
        }

        if (!userProfile) {
          console.log("User not found:", userId);
          return c.json({ error: "User not found" }, 404);
        }

        // Get posts for the user
        const { data: postsData, error: postsError } =
          await supabaseAdmin
            .from("posts")
            .select(
              `
          id,
          user_id,
          post_type,
          text_body,
          caption,
          media_url,
          media_thumb_url,
          visibility,
          tribe_id,
          like_count,
          comment_count,
          created_at
        `,
            )
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(50);

        if (postsError) {
          console.error(
            "Error fetching user posts:",
            postsError,
          );
          return c.json(
            { error: "Failed to fetch user posts" },
            500,
          );
        }

        console.log(
          `Fetched ${postsData?.length || 0} posts for user ${userId}`,
        );

        if (!postsData || postsData.length === 0) {
          return c.json({ posts: [] });
        }

        // Filter out posts with invalid IDs - PREVENTS 22P02 ERRORS
        const validPosts = postsData.filter((post) => {
          if (!post?.id || !isValidUUID(post.id)) {
            console.warn(
              "[User Posts UUID Guard] Invalid post ID:",
              post?.id,
            );
            return false;
          }
          return true;
        });

        console.log(
          `Valid posts after UUID filtering: ${validPosts.length}/${postsData.length}`,
        );

        // Transform posts to expected frontend format
        const transformedPosts = validPosts.map((post) => ({
          id: post.id,
          user_id: post.user_id,
          userId: post.user_id,
          username: userProfile.username || "unknown_user",
          nickname: userProfile.username || "Unknown User",
          type: post.post_type || "thought",
          post_type: post.post_type || "thought",
          text_body: post.text_body,
          content: post.text_body || post.caption,
          caption: post.caption,
          media_url: post.media_url,
          contentUrl: post.media_url,
          media_thumb_url: post.media_thumb_url,
          thumbnail_url: post.media_thumb_url,
          visibility: post.visibility || "public",
          tribe_id: post.tribe_id,
          likes: post.like_count || 0,
          like_count: post.like_count || 0,
          comments: post.comment_count || 0,
          comment_count: post.comment_count || 0,
          liked: false, // Will be determined by frontend if needed
          bookmarked: false, // Will be determined by frontend if needed
          created_at: post.created_at,
          createdAt: post.created_at,
        }));

        console.log(
          `Returning ${transformedPosts.length} transformed posts for user ${userId}`,
        );
        return c.json({ posts: transformedPosts });
      } catch (error) {
        console.error("Error in user posts route:", error);
        return c.json(
          {
            error:
              "Internal server error while fetching user posts",
            details: error.message,
          },
          500,
        );
      }
    },
  );

  // Get main posts feed - HARDENED
  app.get("/make-server-70df0d6e/posts", async (c) => {
    try {
      console.log("=== GET POSTS FEED REQUEST ===");

      const { user, error } = await authenticateUser(c.req.raw);
      if (error) {
        console.log("Authentication error:", error);
        return c.json({ error }, 401);
      }

      // Try to get posts from reactions view first, fallback to posts table
      let postsData: any[] = [];
      let useReactionsView = true;

      try {
        const { data, error: reactionsError } =
          await supabaseAdmin
            .from("posts_with_reactions") // reactions view
            .select(
              `
            id,
            user_id,
            post_type,
            text_body,
            caption,
            media_url,
            media_thumb_url,
            visibility,
            tribe_id,
            reaction_count,
            comment_count,
            created_at
          `,
            )
            .eq("visibility", "public")
            .order("created_at", { ascending: false })
            .limit(50);

        if (reactionsError) {
          console.log(
            "gv Reactions view not available, falling back to posts table:",
            reactionsError,
          );
          useReactionsView = false;
        } else {
          postsData = data || [];
        }
      } catch (viewError) {
        console.log(
          "Reactions view not available, using fallback:",
          viewError,
        );
        useReactionsView = false;
      }

      // Fallback to regular posts table
      if (!useReactionsView) {
        const { data, error: postsError } = await supabaseAdmin
          .from("posts")
          .select(
            `
            id,
            user_id,
            post_type,
            text_body,
            caption,
            media_url,
            media_thumb_url,
            visibility,
            tribe_id,
            like_count,
            comment_count,
            created_at
          `,
          )
          .eq("visibility", "public")
          .order("created_at", { ascending: false })
          .limit(50);

        if (postsError) {
          console.error(
            "Error fetching posts from posts table:",
            postsError,
          );
          return c.json(
            { error: "Failed to fetch posts" },
            500,
          );
        }

        postsData = data || [];
      }

      console.log(
        `Fetched ${postsData.length} posts from ${useReactionsView ? "reactions view" : "posts table"}`,
      );

      if (postsData.length === 0) {
        return c.json({ posts: [] });
      }

      // Filter out posts with invalid IDs before processing
      const validPosts = postsData.filter((post) => {
        if (!post?.id || !isValidUUID(post.id)) {
          console.warn(
            "[Posts Feed UUID Guard] Invalid post ID:",
            post?.id,
          );
          return false;
        }
        return true;
      });

      console.log(
        `Valid posts after filtering: ${validPosts.length}/${postsData.length}`,
      );

      // Get user data for all valid posts
      const userIds = [
        ...new Set(
          validPosts
            .map((post) => post.user_id)
            .filter(Boolean),
        ),
      ];
      const { data: userData, error: userError } =
        await supabaseAdmin
          .from("users")
          .select("id, username, profile_image_url")
          .in("id", userIds);

      if (userError) {
        console.error("Error fetching user data:", userError);
      }

      // Create user lookup map
      const userMap = new Map();
      (userData || []).forEach((user) => {
        userMap.set(user.id, user);
      });

      // Check likes and bookmarks for current user - filter out invalid post IDs
      const validPostIds = validPosts.map((post) => post.id);

      // Validate user ID before using it in queries
      if (!user || !user.id || !isValidUUID(user.id)) {
        console.error(
          "[Posts Feed User ID Guard] Invalid user ID:",
          user?.id,
        );
        return c.json(
          { error: "Invalid user authentication" },
          401,
        );
      }

      const { data: likesData } = await supabaseAdmin
        .from("post_reactions")
        .select("post_id")
        .in("post_id", validPostIds)
        .eq("user_id", user.id)
        .eq("reaction", "like");

      const { data: bookmarksData } = await supabaseAdmin
        .from("post_bookmarks")
        .select("post_id")
        .in("post_id", validPostIds)
        .eq("user_id", user.id);

      const likedPosts = new Set(
        (likesData || []).map((like) => like.post_id),
      );
      const bookmarkedPosts = new Set(
        (bookmarksData || []).map(
          (bookmark) => bookmark.post_id,
        ),
      );

      // Transform posts to frontend format
      const transformedPosts = validPosts.map((post) => {
        const postUser = userMap.get(post.user_id);

        return {
          id: post.id,
          user_id: post.user_id,
          userId: post.user_id,
          username: postUser?.username || "unknown_user",
          nickname: postUser?.username || "Unknown User",
          type: post.post_type || "thought",
          post_type: post.post_type || "thought",
          text_body: post.text_body,
          content: post.text_body || post.caption,
          caption: post.caption,
          media_url: post.media_url,
          contentUrl: post.media_url,
          media_thumb_url: post.media_thumb_url,
          thumbnail_url: post.media_thumb_url,
          visibility: post.visibility || "public",
          tribe_id: post.tribe_id,
          likes: useReactionsView
            ? post.reaction_count || 0
            : post.like_count || 0,
          like_count: useReactionsView
            ? post.reaction_count || 0
            : post.like_count || 0,
          comments: post.comment_count || 0,
          comment_count: post.comment_count || 0,
          liked: likedPosts.has(post.id),
          bookmarked: bookmarkedPosts.has(post.id),
          created_at: post.created_at,
          createdAt: post.created_at,
        };
      });

      console.log(
        `Returning ${transformedPosts.length} transformed posts`,
      );
      return c.json({ posts: transformedPosts });
    } catch (error) {
      console.error("gv Error in posts feed route:", error);
      return c.json(
        {
          error: "Internal server error while fetching posts",
          details: error.message,
        },
        500,
      );
    }
  });

  // Get individual post by ID - HARDENED
  app.get("/make-server-70df0d6e/posts/:postId", async (c) => {
    try {
      console.log("=== GETTING INDIVIDUAL POST REQUEST ===");

      const { user, error } = await authenticateUser(c.req.raw);
      if (error) {
        console.log("Authentication error:", error);
        return c.json({ error }, 401);
      }

      const postId = c.req.param("postId");
      console.log("Getting individual post:", postId);

      // Validate and resolve post ID
      const resolvedPostId = await resolvePostIdSafe(postId);

      if (!resolvedPostId) {
        return c.json(
          { error: "Invalid or missing postId" },
          400,
        );
      }

      // Get post details from posts table
      const { data: postData, error: postError } =
        await supabaseAdmin
          .from("posts")
          .select(
            `
          id,
          user_id,
          post_type,
          text_body,
          caption,
          media_url,
          media_thumb_url,
          visibility,
          tribe_id,
          like_count,
          comment_count,
          created_at
        `,
          )
          .eq("id", resolvedPostId)
          .maybeSingle();

      if (postError) {
        console.error("Error fetching post:", postError);
        return c.json({ error: "Failed to fetch post" }, 500);
      }

      if (!postData) {
        return c.json({ error: "Post not found" }, 404);
      }

      // Get user information for the post author
      const { data: userData, error: userError } =
        await supabaseAdmin
          .from("users")
          .select("username, profile_image_url, core_realm")
          .eq("id", postData.user_id)
          .maybeSingle();

      // Validate user ID before using in queries
      if (!user || !user.id || !isValidUUID(user.id)) {
        console.error(
          "[Individual Post User ID Guard] Invalid user ID:",
          user?.id,
        );
        return c.json(
          { error: "Invalid user authentication" },
          401,
        );
      }

      // Check user's like status for this post
      const { data: likeData } = await supabaseAdmin
        .from("post_reactions")
        .select("id")
        .eq("post_id", resolvedPostId)
        .eq("user_id", user.id)
        .eq("reaction", "like")
        .maybeSingle();

      // Check user's bookmark status for this post
      const { data: bookmarkData } = await supabaseAdmin
        .from("post_bookmarks")
        .select("id")
        .eq("post_id", resolvedPostId)
        .eq("user_id", user.id)
        .maybeSingle();

      // Transform to frontend format
      const transformedPost = {
        id: postData.id,
        user_id: postData.user_id,
        userId: postData.user_id,
        username: userData?.username || "unknown_user",
        nickname: userData?.username || "Unknown User",
        type: postData.post_type || "thought",
        post_type: postData.post_type || "thought",
        text_body: postData.text_body,
        content: postData.text_body || postData.caption,
        caption: postData.caption,
        media_url: postData.media_url,
        contentUrl: postData.media_url,
        media_thumb_url: postData.media_thumb_url,
        thumbnail_url: postData.media_thumb_url,
        visibility: postData.visibility || "public",
        tribe_id: postData.tribe_id,
        likes: postData.like_count || 0,
        like_count: postData.like_count || 0,
        comments: postData.comment_count || 0,
        comment_count: postData.comment_count || 0,
        liked: !!likeData,
        bookmarked: !!bookmarkData,
        created_at: postData.created_at,
        createdAt: postData.created_at,
      };

      console.log(
        "Successfully fetched individual post:",
        transformedPost.id,
      );
      return c.json({ post: transformedPost });
    } catch (error) {
      console.error("Error loading individual post:", error);
      return c.json(
        {
          error: "Internal server error while fetching post",
          details: error.message,
        },
        500,
      );
    }
  });

  // Like/Unlike post endpoint - HARDENED
  app.post(
    "/make-server-70df0d6e/posts/:postId/like",
    async (c) => {
      try {
        console.log("=== LIKE/UNLIKE POST REQUEST ===");

        const { user, error } = await authenticateUser(
          c.req.raw,
        );
        if (error) {
          console.log("Authentication error:", error);
          return c.json({ error }, 401);
        }

        const postId = c.req.param("postId");
        console.log("Toggling like for post:", postId);

        // Validate and resolve post ID
        const resolvedPostId = await resolvePostIdSafe(postId);

        if (!resolvedPostId) {
          return c.json(
            { error: "Invalid or missing postId" },
            400,
          );
        }

        // Check if post exists
        const { data: postData, error: postError } =
          await supabaseAdmin
            .from("posts")
            .select("id, user_id, like_count")
            .eq("id", resolvedPostId)
            .maybeSingle();

        if (postError) {
          console.error(
            "Error checking post existence:",
            postError,
          );
          return c.json({ error: "Failed to find post" }, 500);
        }

        if (!postData) {
          return c.json({ error: "Post not found" }, 404);
        }

        // Validate user ID before using in queries
        if (!user || !user.id || !isValidUUID(user.id)) {
          console.error(
            "[Like Post User ID Guard] Invalid user ID:",
            user?.id,
          );
          return c.json(
            { error: "Invalid user authentication" },
            401,
          );
        }

        // Check if user already liked this post
        const { data: existingLike, error: likeCheckError } =
          await supabaseAdmin
            .from("post_reactions")
            .select("id")
            .eq("post_id", resolvedPostId)
            .eq("user_id", user.id)
            .eq("reaction", "like")
            .maybeSingle();

        if (
          likeCheckError &&
          likeCheckError.code !== "PGRST116"
        ) {
          console.error(
            "Error checking existing like:",
            likeCheckError,
          );
          return c.json(
            { error: "Failed to check like status" },
            500,
          );
        }

        let liked = false;
        let likeCount = postData.like_count || 0;

        if (existingLike) {
          // Unlike the post
          const { error: deleteError } = await supabaseAdmin
            .from("post_reactions")
            .delete()
            .eq("id", existingLike.id);

          if (deleteError) {
            console.error("Error removing like:", deleteError);
            return c.json(
              { error: "Failed to unlike post" },
              500,
            );
          }

          likeCount = Math.max(0, likeCount - 1);
          liked = false;
          console.log("Post unliked successfully");
        } else {
          // Like the post
          const { data: newLike, error: insertError } =
            await supabaseAdmin
              .from("post_reactions")
              .insert({
                post_id: resolvedPostId,
                user_id: user.id,
                reaction: "like",
              })
              .select("id")
              .maybeSingle();

          if (insertError) {
            console.error("Error adding like:", insertError);
            return c.json(
              { error: "Failed to like post" },
              500,
            );
          }

          if (newLike) {
            likeCount = likeCount + 1;
            liked = true;
            console.log("Post liked successfully");
          }
        }

        // Update post like count in posts table
        const { error: updateError } = await supabaseAdmin
          .from("posts")
          .update({ like_count: likeCount })
          .eq("id", resolvedPostId);

        if (updateError) {
          console.error(
            "Error updating post like count:",
            updateError,
          );
          // Don't return error - like action was successful
        }

        console.log(
          `Like toggle completed for post ${resolvedPostId}: liked=${liked}, count=${likeCount}`,
        );
        return c.json({ liked, likes: likeCount });
      } catch (error) {
        console.error("Error in like toggle route:", error);
        return c.json(
          {
            error: "Internal server error while toggling like",
            details: error.message,
          },
          500,
        );
      }
    },
  );

  // Bookmark/Unbookmark post endpoint - HARDENED
  app.post(
    "/make-server-70df0d6e/posts/:postId/bookmark",
    async (c) => {
      try {
        console.log("=== BOOKMARK/UNBOOKMARK POST REQUEST ===");

        const { user, error } = await authenticateUser(
          c.req.raw,
        );
        if (error) {
          console.log("Authentication error:", error);
          return c.json({ error }, 401);
        }

        const postId = c.req.param("postId");
        console.log("Toggling bookmark for post:", postId);

        // Validate and resolve post ID
        const resolvedPostId = await resolvePostIdSafe(postId);

        if (!resolvedPostId) {
          return c.json(
            { error: "Invalid or missing postId" },
            400,
          );
        }

        // Validate user ID before using in queries
        if (!user || !user.id || !isValidUUID(user.id)) {
          console.error(
            "[Bookmark Post User ID Guard] Invalid user ID:",
            user?.id,
          );
          return c.json(
            { error: "Invalid user authentication" },
            401,
          );
        }

        // Check if post exists
        const { data: postData, error: postError } =
          await supabaseAdmin
            .from("posts")
            .select("id, user_id")
            .eq("id", resolvedPostId)
            .maybeSingle();

        if (postError) {
          console.error(
            "Error checking post existence:",
            postError,
          );
          return c.json({ error: "Failed to find post" }, 500);
        }

        if (!postData) {
          return c.json({ error: "Post not found" }, 404);
        }

        // Check if user already bookmarked this post
        const {
          data: existingBookmark,
          error: bookmarkCheckError,
        } = await supabaseAdmin
          .from("post_bookmarks")
          .select("id")
          .eq("post_id", resolvedPostId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (
          bookmarkCheckError &&
          bookmarkCheckError.code !== "PGRST116"
        ) {
          console.error(
            "Error checking existing bookmark:",
            bookmarkCheckError,
          );
          return c.json(
            { error: "Failed to check bookmark status" },
            500,
          );
        }

        let bookmarked = false;

        if (existingBookmark) {
          // Unbookmark the post
          const { error: deleteError } = await supabaseAdmin
            .from("post_bookmarks")
            .delete()
            .eq("id", existingBookmark.id);

          if (deleteError) {
            console.error(
              "Error removing bookmark:",
              deleteError,
            );
            return c.json(
              { error: "Failed to unbookmark post" },
              500,
            );
          }

          bookmarked = false;
          console.log("Post unbookmarked successfully");
        } else {
          // Bookmark the post
          const { data: newBookmark, error: insertError } =
            await supabaseAdmin
              .from("post_bookmarks")
              .insert({
                post_id: resolvedPostId,
                user_id: user.id,
              })
              .select("id")
              .maybeSingle();

          if (insertError) {
            console.error(
              "Error adding bookmark:",
              insertError,
            );
            return c.json(
              { error: "Failed to bookmark post" },
              500,
            );
          }

          if (newBookmark) {
            bookmarked = true;
            console.log("Post bookmarked successfully");
          }
        }

        console.log(
          `Bookmark toggle completed for post ${resolvedPostId}: bookmarked=${bookmarked}`,
        );
        return c.json({ bookmarked });
      } catch (error) {
        console.error("Error in bookmark toggle route:", error);
        return c.json(
          {
            error:
              "Internal server error while toggling bookmark",
            details: error.message,
          },
          500,
        );
      }
    },
  );

  // Notification routes
  app.get("/make-server-70df0d6e/notifications", async (c) => {
    try {
      console.log("=== GET NOTIFICATIONS REQUEST ===");

      const { user, error } = await authenticateUser(c.req.raw);
      if (error) {
        console.log("Authentication error:", error);
        return c.json({ error }, 401);
      }

      // Validate user ID
      if (!user || !user.id || !isValidUUID(user.id)) {
        console.error(
          "[Notifications User ID Guard] Invalid user ID:",
          user?.id,
        );
        return c.json(
          { error: "Invalid user authentication" },
          401,
        );
      }

      // Parse and validate query parameters
      const query = c.req.query();
      const validationResult =
        notificationQuerySchema.safeParse(query);

      if (!validationResult.success) {
        console.error(
          "Invalid query parameters:",
          validationResult.error,
        );
        return c.json(
          { error: "Invalid query parameters" },
          400,
        );
      }

      const { limit, cursor, unreadOnly } =
        validationResult.data;
      console.log(
        `Getting notifications for user ${user.id}: limit=${limit}, cursor=${cursor}, unreadOnly=${unreadOnly}`,
      );

      // Build query for notifications
      let notificationQuery = supabaseAdmin
        .from("notifications")
        .select(
          `
          id,
          user_id,
          type,
          title,
          content,
          is_read,
          created_at,
          related_id,
          related_data
        `,
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (unreadOnly) {
        notificationQuery = notificationQuery.eq(
          "is_read",
          false,
        );
      }

      if (cursor) {
        notificationQuery = notificationQuery.lt(
          "created_at",
          cursor,
        );
      }

      const { data: notifications, error: notificationsError } =
        await notificationQuery;

      if (notificationsError) {
        console.error(
          "Error fetching notifications:",
          notificationsError,
        );
        return c.json(
          { error: "Failed to fetch notifications" },
          500,
        );
      }

      // Transform notifications for response
      const transformedNotifications = (
        notifications || []
      ).map((notification) => ({
        id: notification.id,
        userId: notification.user_id,
        type: notification.type,
        title: notification.title,
        content: notification.content,
        isRead: notification.is_read,
        createdAt: notification.created_at,
        relatedId: notification.related_id,
        relatedData: notification.related_data,
      }));

      // Check if there are more notifications
      const hasMore =
        notifications && notifications.length === limit;
      const nextCursor =
        hasMore && notifications.length > 0
          ? notifications[notifications.length - 1].created_at
          : undefined;

      console.log(
        `Returning ${transformedNotifications.length} notifications`,
      );
      return c.json({
        items: transformedNotifications,
        hasMore: !!hasMore,
        nextCursor,
      });
    } catch (error) {
      console.error("Error in notifications route:", error);
      return c.json(
        {
          error:
            "Internal server error while fetching notifications",
          details: error.message,
        },
        500,
      );
    }
  });

  app.post(
    "/make-server-70df0d6e/notifications/read",
    async (c) => {
      try {
        console.log(
          "=== MARK NOTIFICATIONS AS READ REQUEST ===",
        );

        const { user, error } = await authenticateUser(
          c.req.raw,
        );
        if (error) {
          console.log("Authentication error:", error);
          return c.json({ error }, 401);
        }

        // Validate user ID
        if (!user || !user.id || !isValidUUID(user.id)) {
          console.error(
            "[Mark Read User ID Guard] Invalid user ID:",
            user?.id,
          );
          return c.json(
            { error: "Invalid user authentication" },
            401,
          );
        }

        const body = await c.req.json();
        const validationResult =
          markAsReadSchema.safeParse(body);

        if (!validationResult.success) {
          console.error(
            "Invalid request body:",
            validationResult.error,
          );
          return c.json({ error: "Invalid request body" }, 400);
        }

        const { ids } = validationResult.data;
        console.log(
          `Marking ${ids.length} notifications as read for user ${user.id}`,
        );

        // Update notifications to mark as read
        const { data, error: updateError } = await supabaseAdmin
          .from("notifications")
          .update({ is_read: true })
          .in("id", ids)
          .eq("user_id", user.id) // Ensure user can only mark their own notifications as read
          .select("id");

        if (updateError) {
          console.error(
            "Error marking notifications as read:",
            updateError,
          );
          return c.json(
            { error: "Failed to mark notifications as read" },
            500,
          );
        }

        console.log(
          `Successfully marked ${data?.length || 0} notifications as read`,
        );
        return c.json({
          success: true,
          updatedCount: data?.length || 0,
        });
      } catch (error) {
        console.error(
          "Error in mark notifications as read route:",
          error,
        );
        return c.json(
          {
            error:
              "Internal server error while marking notifications as read",
            details: error.message,
          },
          500,
        );
      }
    },
  );

  app.get(
    "/make-server-70df0d6e/notifications/unread-count",
    async (c) => {
      try {
        console.log(
          "=== GET UNREAD NOTIFICATION COUNT REQUEST ===",
        );

        const { user, error } = await authenticateUser(
          c.req.raw,
        );
        if (error) {
          console.log("Authentication error:", error);
          return c.json({ error }, 401);
        }

        // Validate user ID
        if (!user || !user.id || !isValidUUID(user.id)) {
          console.error(
            "[Unread Count User ID Guard] Invalid user ID:",
            user?.id,
          );
          return c.json(
            { error: "Invalid user authentication" },
            401,
          );
        }

        const { count, error: countError } = await supabaseAdmin
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_read", false);

        if (countError) {
          console.error(
            "Error getting unread count:",
            countError,
          );
          return c.json(
            { error: "Failed to get unread count" },
            500,
          );
        }

        console.log(
          `User ${user.id} has ${count || 0} unread notifications`,
        );
        return c.json({ count: count || 0 });
      } catch (error) {
        console.error("Error in unread count route:", error);
        return c.json(
          {
            error:
              "Internal server error while getting unread count",
            details: error.message,
          },
          500,
        );
      }
    },
  );

  console.log("=== SERVER ROUTES SETUP COMPLETED ===");

  // Bookmark/Unbookmark post endpoint - HARDENED
  app.post(
    "/make-server-70df0d6e/posts/:postId/bookmark",
    async (c) => {
      try {
        console.log("=== BOOKMARK/UNBOOKMARK POST REQUEST ===");

        const { user, error } = await authenticateUser(
          c.req.raw,
        );
        if (error) {
          console.log("Authentication error:", error);
          return c.json({ error }, 401);
        }

        const postId = c.req.param("postId");
        console.log("Toggling bookmark for post:", postId);

        // Validate and resolve post ID
        const resolvedPostId = await resolvePostIdSafe(postId);

        if (!resolvedPostId) {
          return c.json(
            { error: "Invalid or missing postId" },
            400,
          );
        }

        // Check if post exists
        const { data: postData, error: postError } =
          await supabaseAdmin
            .from("posts")
            .select("id")
            .eq("id", resolvedPostId)
            .maybeSingle();

        if (postError) {
          console.error(
            "Error checking post existence:",
            postError,
          );
          return c.json({ error: "Failed to find post" }, 500);
        }

        if (!postData) {
          return c.json({ error: "Post not found" }, 404);
        }

        // Check if user already bookmarked this post
        const {
          data: existingBookmark,
          error: bookmarkCheckError,
        } = await supabaseAdmin
          .from("post_bookmarks")
          .select("id")
          .eq("post_id", resolvedPostId)
          .eq("user_id", user!.id)
          .maybeSingle();

        if (
          bookmarkCheckError &&
          bookmarkCheckError.code !== "PGRST116"
        ) {
          console.error(
            "Error checking existing bookmark:",
            bookmarkCheckError,
          );
          return c.json(
            { error: "Failed to check bookmark status" },
            500,
          );
        }

        let bookmarked = false;

        if (existingBookmark) {
          // Remove bookmark
          const { error: deleteError } = await supabaseAdmin
            .from("post_bookmarks")
            .delete()
            .eq("id", existingBookmark.id);

          if (deleteError) {
            console.error(
              "Error removing bookmark:",
              deleteError,
            );
            return c.json(
              { error: "Failed to unbookmark post" },
              500,
            );
          }

          bookmarked = false;
          console.log("Post unbookmarked successfully");
        } else {
          // Add bookmark
          const { error: insertError } = await supabaseAdmin
            .from("post_bookmarks")
            .insert({
              post_id: resolvedPostId,
              user_id: user!.id,
            });

          if (insertError) {
            console.error(
              "Error creating bookmark:",
              insertError,
            );
            return c.json(
              { error: "Failed to bookmark post" },
              500,
            );
          }

          bookmarked = true;
          console.log("Post bookmarked successfully");
        }

        return c.json({ bookmarked });
      } catch (error) {
        console.error("Error toggling bookmark:", error);
        return c.json(
          {
            error:
              "Internal server error while toggling bookmark",
            details: error.message,
          },
          500,
        );
      }
    },
  );

  // GET notifications with enhanced error handling
  app.get("/make-server-70df0d6e/notifications", async (c) => {
    try {
      console.log("=== GET NOTIFICATIONS REQUEST ===");

      const { user, error } = await authenticateUser(c.req.raw);
      if (error) {
        console.log("Authentication error:", error);
        return c.json({ error }, 401);
      }

      // Parse and validate query parameters with Zod
      const query = c.req.query();
      const parsed = notificationQuerySchema.safeParse(query);

      if (!parsed.success) {
        return c.json(
          {
            error: "Invalid query parameters",
            issues: parsed.error.issues,
          },
          400,
        );
      }

      const { limit, cursor, unreadOnly } = parsed.data;

      let notificationsQuery = supabaseAdmin
        .from("notifications")
        .select(
          `
          id,
          type,
          title,
          content,
          message,
          related_id,
          related_data,
          is_read,
          created_at
        `,
        )
        .eq("user_id", user!.id);

      if (unreadOnly) {
        notificationsQuery = notificationsQuery.eq(
          "is_read",
          false,
        );
      }

      if (cursor) {
        notificationsQuery = notificationsQuery.lt(
          "created_at",
          cursor,
        );
      }

      notificationsQuery = notificationsQuery
        .order("created_at", { ascending: false })
        .limit(limit);

      // Try with message column first, fallback to content
      let notifications: any[] = [];
      try {
        const { data, error: notifError } =
          await notificationsQuery;

        if (notifError && notifError.code === "42703") {
          // column doesn't exist
          console.log(
            "Message column not found, using content column fallback",
          );
          // Retry without message column
          const { data: fallbackData, error: fallbackError } =
            await supabaseAdmin
              .from("notifications")
              .select(
                `
              id,
              type,
              title,
              content,
              related_id,
              related_data,
              is_read,
              created_at
            `,
              )
              .eq("user_id", user!.id)
              .eq("is_read", unreadOnly ? false : undefined)
              .lt(
                "created_at",
                cursor || "9999-12-31T23:59:59Z",
              )
              .order("created_at", { ascending: false })
              .limit(limit);

          if (fallbackError) {
            throw fallbackError;
          }
          notifications = fallbackData || [];
        } else if (notifError) {
          throw notifError;
        } else {
          notifications = data || [];
        }
      } catch (queryError) {
        console.error(
          "Error fetching notifications:",
          queryError,
        );
        return c.json(
          { error: "Failed to fetch notifications" },
          500,
        );
      }

      // Transform notifications
      const transformedNotifications = notifications.map(
        (notification) => ({
          id: notification.id,
          type: notification.type,
          title: notification.title,
          content: notification.message || notification.content, // Use message if available, fallback to content
          related_id: notification.related_id,
          related_data: notification.related_data,
          is_read: notification.is_read,
          created_at: notification.created_at,
          timestamp: notification.created_at,
        }),
      );

      console.log(
        `Returning ${transformedNotifications.length} notifications`,
      );

      return c.json({
        notifications: transformedNotifications,
        hasMore: transformedNotifications.length === limit,
        nextCursor:
          transformedNotifications.length > 0
            ? transformedNotifications[
                transformedNotifications.length - 1
              ].created_at
            : null,
      });
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return c.json(
        {
          error:
            "Internal server error while fetching notifications",
          details: error.message,
        },
        500,
      );
    }
  });

  // POST notifications
  app.post("/make-server-70df0d6e/notifications", async (c) => {
    try {
      console.log("=== CREATE NOTIFICATION REQUEST ===");

      const { user, error } = await authenticateUser(c.req.raw);
      if (error) {
        console.log("Authentication error:", error);
        return c.json({ error }, 401);
      }

      const body = await c.req.json();
      const parsed = createNotificationSchema.safeParse(body);

      if (!parsed.success) {
        return c.json(
          {
            error: "Invalid notification data",
            issues: parsed.error.issues,
          },
          400,
        );
      }

      const { data: notificationData } = parsed;

      // Insert notification with content column
      const { data: newNotification, error: insertError } =
        await supabaseAdmin
          .from("notifications")
          .insert({
            ...notificationData,
            is_read: false,
          })
          .select()
          .maybeSingle();

      if (insertError) {
        console.error(
          "Error creating notification:",
          insertError,
        );
        return c.json(
          { error: "Failed to create notification" },
          500,
        );
      }

      console.log(
        "Notification created successfully:",
        newNotification?.id,
      );
      return c.json({ notification: newNotification }, 201);
    } catch (error) {
      console.error("Error creating notification:", error);
      return c.json(
        {
          error:
            "Internal server error while creating notification",
          details: error.message,
        },
        500,
      );
    }
  });

  // PATCH notifications/mark-read
  app.patch(
    "/make-server-70df0d6e/notifications/mark-read",
    async (c) => {
      try {
        console.log("=== MARK NOTIFICATIONS READ REQUEST ===");

        const { user, error } = await authenticateUser(
          c.req.raw,
        );
        if (error) {
          console.log("Authentication error:", error);
          return c.json({ error }, 401);
        }

        const body = await c.req.json();
        const parsed = markAsReadSchema.safeParse(body);

        if (!parsed.success) {
          return c.json(
            {
              error: "Invalid request data",
              issues: parsed.error.issues,
            },
            400,
          );
        }

        const { ids } = parsed.data;

        // Update only the caller's notifications
        const {
          data: updatedNotifications,
          error: updateError,
        } = await supabaseAdmin
          .from("notifications")
          .update({ is_read: true })
          .in("id", ids)
          .eq("user_id", user!.id)
          .select("id");

        if (updateError) {
          console.error(
            "Error marking notifications as read:",
            updateError,
          );
          return c.json(
            { error: "Failed to mark notifications as read" },
            500,
          );
        }

        const markedCount = updatedNotifications?.length || 0;
        console.log(
          `Marked ${markedCount} notifications as read`,
        );

        return c.json({
          success: true,
          markedCount,
          message: `${markedCount} notifications marked as read`,
        });
      } catch (error) {
        console.error(
          "Error marking notifications as read:",
          error,
        );
        return c.json(
          {
            error:
              "Internal server error while marking notifications as read",
            details: error.message,
          },
          500,
        );
      }
    },
  );

  // GET notifications/unread-count
  app.get(
    "/make-server-70df0d6e/notifications/unread-count",
    async (c) => {
      try {
        console.log(
          "=== GET UNREAD NOTIFICATIONS COUNT REQUEST ===",
        );

        const { user, error } = await authenticateUser(
          c.req.raw,
        );
        if (error) {
          console.log("Authentication error:", error);
          return c.json({ error }, 401);
        }

        try {
          const { count, error: countError } =
            await supabaseAdmin
              .from("notifications")
              .select("*", { count: "exact", head: true })
              .eq("user_id", user!.id)
              .eq("is_read", false);

          if (countError) {
            if (countError.code === "42P01") {
              // table doesn't exist
              console.log(
                "Notifications table not found, returning 0",
              );
              return c.json({ count: 0 });
            }
            throw countError;
          }

          console.log(
            `User has ${count || 0} unread notifications`,
          );
          return c.json({ count: count || 0 });
        } catch (tableError) {
          console.log(
            "Notifications table not available, returning 0:",
            tableError,
          );
          return c.json({ count: 0 });
        }
      } catch (error) {
        console.error(
          "Error getting unread notifications count:",
          error,
        );
        return c.json(
          {
            error:
              "Internal server error while getting unread count",
            details: error.message,
          },
          500,
        );
      }
    },
  );

  // CREATE posts endpoint
  app.post("/make-server-70df0d6e/posts", async (c) => {
    try {
      console.log("=== CREATE POST REQUEST ===");

      const { user, error } = await authenticateUser(c.req.raw);
      if (error) {
        console.log("Authentication error:", error);
        return c.json({ error }, 401);
      }

      const body = await c.req.json();
      console.log(
        "Creating post for user:",
        user!.id,
        "Post data:",
        {
          type: body.type,
          hasText: !!body.text_body,
          hasCaption: !!body.caption,
          hasMedia: !!body.media_url,
          visibility: body.visibility,
        },
      );

      // Validate required fields
      const {
        type,
        text_body,
        caption,
        media_url,
        media_thumb_url,
        visibility,
        tribe_id,
      } = body;

      if (!type) {
        return c.json({ error: "Post type is required" }, 400);
      }

      // Validate post type
      const validTypes = [
        "thought",
        "image",
        "video",
        "audio",
        "media",
      ];
      if (!validTypes.includes(type)) {
        return c.json(
          {
            error: `Invalid post type. Must be one of: ${validTypes.join(", ")}`,
          },
          400,
        );
      }

      // Validate content based on type
      if (type === "thought") {
        if (!text_body || text_body.trim().length === 0) {
          return c.json(
            {
              error:
                "Text content is required for thought posts",
            },
            400,
          );
        }
        if (text_body.trim().length > 5000) {
          return c.json(
            {
              error:
                "Text content must be 5000 characters or less",
            },
            400,
          );
        }
      } else if (
        ["image", "video", "audio", "media"].includes(type)
      ) {
        if (!media_url) {
          return c.json(
            {
              error: `Media URL is required for ${type} posts`,
            },
            400,
          );
        }
      }

      // Validate caption if provided
      if (caption && caption.length > 2000) {
        return c.json(
          { error: "Caption must be 2000 characters or less" },
          400,
        );
      }

      // Validate visibility
      const validVisibilities = ["public", "private", "tribe"];
      if (
        visibility &&
        !validVisibilities.includes(visibility)
      ) {
        return c.json(
          {
            error: `Invalid visibility. Must be one of: ${validVisibilities.join(", ")}`,
          },
          400,
        );
      }

      // Prepare post data for insertion
      const postData = {
        user_id: user!.id,
        post_type: type,
        text_body: text_body?.trim() || null,
        caption: caption?.trim() || null,
        media_url: media_url || null,
        media_thumb_url: media_thumb_url || null,
        visibility: visibility || "public",
        tribe_id: tribe_id || null,
        like_count: 0,
        comment_count: 0,
      };

      console.log("Inserting post into database:", {
        user_id: postData.user_id,
        post_type: postData.post_type,
        hasText: !!postData.text_body,
        hasCaption: !!postData.caption,
        hasMedia: !!postData.media_url,
        visibility: postData.visibility,
      });

      // Insert post into database
      const { data: newPost, error: insertError } =
        await supabaseAdmin
          .from("posts")
          .insert(postData)
          .select(
            `
          id,
          user_id,
          post_type,
          text_body,
          caption,
          media_url,
          media_thumb_url,
          visibility,
          tribe_id,
          like_count,
          comment_count,
          created_at
        `,
          )
          .maybeSingle();

      if (insertError) {
        console.error("Error inserting post:", insertError);
        return c.json(
          {
            error: "Failed to create post",
            details: insertError.message,
          },
          500,
        );
      }

      if (!newPost) {
        console.error("No post returned after insertion");
        return c.json(
          { error: "Failed to create post - no data returned" },
          500,
        );
      }

      // Get user information for response
      const { data: userData, error: userError } =
        await supabaseAdmin
          .from("users")
          .select("username, profile_image_url")
          .eq("id", user!.id)
          .maybeSingle();

      // Transform post to frontend format
      const transformedPost = {
        id: newPost.id,
        user_id: newPost.user_id,
        userId: newPost.user_id,
        username: userData?.username || "unknown_user",
        nickname: userData?.username || "Unknown User",
        type: newPost.post_type,
        post_type: newPost.post_type,
        text_body: newPost.text_body,
        content: newPost.text_body || newPost.caption,
        caption: newPost.caption,
        media_url: newPost.media_url,
        contentUrl: newPost.media_url,
        media_thumb_url: newPost.media_thumb_url,
        thumbnail_url: newPost.media_thumb_url,
        visibility: newPost.visibility,
        tribe_id: newPost.tribe_id,
        likes: newPost.like_count || 0,
        like_count: newPost.like_count || 0,
        comments: newPost.comment_count || 0,
        comment_count: newPost.comment_count || 0,
        liked: false,
        bookmarked: false,
        created_at: newPost.created_at,
        createdAt: newPost.created_at,
      };

      console.log(
        "Post created successfully:",
        transformedPost.id,
      );
      return c.json({ post: transformedPost }, 201);
    } catch (error) {
      console.error("Error creating post:", error);
      return c.json(
        {
          error: "Internal server error while creating post",
          details: error.message,
        },
        500,
      );
    }
  });

  // GET user profile endpoint
  app.get("/make-server-70df0d6e/users/profile", async (c) => {
    try {
      console.log("=== GET USER PROFILE REQUEST ===");

      const { user, error } = await authenticateUser(c.req.raw);
      if (error) {
        console.log("Authentication error:", error);
        return c.json({ error }, 401);
      }

      // Get current user's profile
      const { data: profileData, error: profileError } =
        await supabaseAdmin
          .from("users")
          .select(
            `
          id,
          username,
          email,
          phone,
          profile_image_url,
          description,
          bio,
          xp,
          level,
          follower_count,
          following_count,
          core_realm,
          sub_realm,
          profile_privacy,
          created_at,
          updated_at
        `,
          )
          .eq("id", user.id)
          .maybeSingle();

      if (profileError) {
        console.error(
          "Error fetching user profile:",
          profileError,
        );
        return c.json(
          { error: "Failed to fetch profile" },
          500,
        );
      }

      if (!profileData) {
        return c.json({ error: "Profile not found" }, 404);
      }

      console.log(
        "Successfully fetched profile for user:",
        profileData.id,
      );

      // Transform to frontend format
      const transformedProfile = {
        id: profileData.id,
        username: profileData.username,
        email: profileData.email,
        phone: profileData.phone,
        profileImageUrl: profileData.profile_image_url,
        description: profileData.description || profileData.bio, // Support both fields
        bio: profileData.bio || profileData.description,
        xp: profileData.xp || 0,
        level: profileData.level || 1,
        followerCount: profileData.follower_count || 0,
        followingCount: profileData.following_count || 0,
        coreRealm: profileData.core_realm,
        subRealm: profileData.sub_realm,
        profilePrivacy: profileData.profile_privacy || "public",
        createdAt: profileData.created_at,
        updatedAt: profileData.updated_at,
      };

      return c.json({ profile: transformedProfile });
    } catch (error) {
      console.error("Error in get profile route:", error);
      return c.json(
        {
          error: "Internal server error while fetching profile",
          details: error.message,
        },
        500,
      );
    }
  });

  // PATCH/PUT user profile endpoint (for bio updates and other profile changes)
  const handleProfileUpdate = async (c) => {
    try {
      console.log("=== PATCH USER PROFILE REQUEST ===");

      const { user, error } = await authenticateUser(c.req.raw);
      if (error) {
        console.log("Authentication error:", error);
        return c.json({ error }, 401);
      }

      const body = await c.req.json();
      console.log(
        "Profile update request for user:",
        user.id,
        "Updates:",
        Object.keys(body),
      );

      // Validate the request body
      const parsed = profileUpdateSchema.safeParse(body);
      if (!parsed.success) {
        return c.json(
          {
            error: "Invalid profile update data",
            issues: parsed.error.issues,
          },
          400,
        );
      }

      const validatedData = parsed.data;
      const updates: any = {};

      // Process bio update (primary field for bio updates)
      if (validatedData.bio !== undefined) {
        const trimmedBio = validatedData.bio.trim();

        // Update both bio and description fields for compatibility
        updates.bio = trimmedBio;
        updates.description = trimmedBio;
        console.log(
          "Bio update:",
          trimmedBio.substring(0, 50) +
            (trimmedBio.length > 50 ? "..." : ""),
        );
      }

      // Process description update (legacy support)
      if (
        validatedData.description !== undefined &&
        validatedData.bio === undefined
      ) {
        const trimmedDescription =
          validatedData.description.trim();
        updates.description = trimmedDescription;
        updates.bio = trimmedDescription; // Keep bio in sync
        console.log(
          "Description update:",
          trimmedDescription.substring(0, 50) +
            (trimmedDescription.length > 50 ? "..." : ""),
        );
      }

      // Process username update
      if (validatedData.username !== undefined) {
        const username = validatedData.username;

        // Check if username is already taken
        const { data: existingUser, error: checkError } =
          await supabaseAdmin
            .from("users")
            .select("id")
            .eq("username", username.toLowerCase())
            .neq("id", user.id)
            .maybeSingle();

        if (checkError && checkError.code !== "PGRST116") {
          console.error(
            "Error checking username availability:",
            checkError,
          );
          return c.json(
            { error: "Failed to check username availability" },
            500,
          );
        }

        if (existingUser) {
          return c.json(
            { error: "Username already taken" },
            409,
          );
        }

        updates.username = username.toLowerCase();
      }

      // Process privacy setting update
      if (validatedData.profile_privacy !== undefined) {
        updates.profile_privacy = validatedData.profile_privacy;
      }

      if (Object.keys(updates).length === 0) {
        return c.json(
          { error: "No valid fields to update" },
          400,
        );
      }

      // Add updated_at timestamp
      updates.updated_at = new Date().toISOString();

      // Update the profile
      const { data: updatedProfile, error: updateError } =
        await supabaseAdmin
          .from("users")
          .update(updates)
          .eq("id", user.id)
          .select(
            `
          id,
          username,
          email,
          phone,
          profile_image_url,
          description,
          bio,
          xp,
          level,
          follower_count,
          following_count,
          core_realm,
          sub_realm,
          profile_privacy,
          created_at,
          updated_at
        `,
          )
          .maybeSingle();

      if (updateError) {
        console.error("Error updating profile:", updateError);
        return c.json(
          { error: "Failed to update profile" },
          500,
        );
      }

      if (!updatedProfile) {
        return c.json(
          { error: "Profile not found after update" },
          404,
        );
      }

      console.log(
        "Successfully updated profile for user:",
        updatedProfile.id,
      );

      // Transform to frontend format
      const transformedProfile = {
        id: updatedProfile.id,
        username: updatedProfile.username,
        email: updatedProfile.email,
        phone: updatedProfile.phone,
        profileImageUrl: updatedProfile.profile_image_url,
        description:
          updatedProfile.description || updatedProfile.bio,
        bio: updatedProfile.bio || updatedProfile.description,
        xp: updatedProfile.xp || 0,
        level: updatedProfile.level || 1,
        followerCount: updatedProfile.follower_count || 0,
        followingCount: updatedProfile.following_count || 0,
        coreRealm: updatedProfile.core_realm,
        subRealm: updatedProfile.sub_realm,
        profilePrivacy:
          updatedProfile.profile_privacy || "public",
        createdAt: updatedProfile.created_at,
        updatedAt: updatedProfile.updated_at,
      };

      return c.json({
        profile: transformedProfile,
        message: "Profile updated successfully",
      });
    } catch (error) {
      console.error("Error in patch profile route:", error);
      return c.json(
        {
          error: "Internal server error while updating profile",
          details: error.message,
        },
        500,
      );
    }
  };

  // Support both PATCH and PUT for profile updates
  app.patch(
    "/make-server-70df0d6e/users/profile",
    handleProfileUpdate,
  );
  app.put(
    "/make-server-70df0d6e/users/profile",
    handleProfileUpdate,
  );

  console.log("All routes setup complete");
}