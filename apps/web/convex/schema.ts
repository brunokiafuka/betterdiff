import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// Use authTables for all auth tables and only override users table
// This ensures all required fields and indexes are correct
export default defineSchema({
  ...authTables,
  /*
   * Replace the default users table from authTables so we can add our own fields
   * New fields must be optional if all of the OAuth providers don't return them
   */
  users: defineTable({
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.float64()),
    username: v.optional(v.string()),
    token: v.optional(v.string()),
  }).index("by_token", ["token"]).index("by_username", ["username"]),
});
