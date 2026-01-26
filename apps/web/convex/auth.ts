import { v } from "convex/values";
import {  query, action, mutation } from "./_generated/server";
import { Octokit } from "@octokit/rest";
import GitHub from "@auth/core/providers/github";
import { convexAuth } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    GitHub({
      authorization: {
        params: {
          scope: "read:user user:email",
        },
      },
      profile(profile, tokens) {
        // Note:
        // Filter out null values from GitHub profile to match Convex schema
        // GitHub may return email: null if user hasn't set a public email
        return {
          id: profile.id.toString(),
          username: profile.login || undefined,
          email: profile.email || undefined,
          image: profile.avatar_url || undefined,
          token: tokens.access_token || undefined,
        };
      },
    }),
  ],
});

export const getCurrentUsername = query({
  args: {},
  handler: async (ctx) => {
    const authUserIdentity = await ctx.auth.getUserIdentity();
    const userId = authUserIdentity?.subject.split('|')[0];
    

    const user = await ctx.db.query("users").withIndex("by_id", (q) => q.eq("_id", userId as Id<"users">)).first();

    return user?.username || null;
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const authUserIdentity = await ctx.auth.getUserIdentity();
    if (!authUserIdentity) {
      return null;
    }
    
    const userId = authUserIdentity.subject.split('|')[0];
    const user = await ctx.db.query("users").withIndex("by_id", (q) => q.eq("_id", userId as Id<"users">)).first();

    if (!user) {
      return null;
    }

    return {
      username: user.username || null,
      image: user.image || null,
      email: user.email || null,
    };
  },
});

export const getToken = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    
    const user = await ctx.db.query("users").withIndex("by_username", (q) => q.eq("username", args.username)).first();
    console.log('user', user)
    
  
    return user?.token || null;
  },
});


// Validate token (action - can make HTTP requests)
export const validateToken = action({
  args: { token: v.string() },
  handler: async (_, args) => {
    const octokit = new Octokit({ auth: args.token });
    try {
      const { data } = await octokit.users.getAuthenticated();
      return { success: true, user: data.login };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
});


export const authenticate = action({
  args: { token: v.string() },
  handler: async (_, args) => {
    const octokit = new Octokit({ auth: args.token });
    try {
      const { data } = await octokit.users.getAuthenticated();
      return { success: true, user: data.login };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
});

export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const authUserIdentity = await ctx.auth.getUserIdentity();
    if (!authUserIdentity) {
      throw new Error("Not authenticated");
    }

    // Extract user ID from subject (format: "provider|id")
    const userId = authUserIdentity.subject.split('|')[0] as Id<"users">;
    
    // Query the user to ensure they exist
    const user = await ctx.db.query("users").withIndex("by_id", (q) => q.eq("_id", userId)).first();
    
    if (!user) {
      throw new Error("User not found");
    }
    
    await ctx.db.delete(userId);
    
    return { success: true };
  },
});
