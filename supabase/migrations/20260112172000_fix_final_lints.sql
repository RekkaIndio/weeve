-- Drop duplicate indexes
DROP INDEX IF EXISTS "public"."comment_likes_user_id_idx";
DROP INDEX IF EXISTS "public"."contributions_story_id_idx";
DROP INDEX IF EXISTS "public"."member_roles_user_id_idx";

-- Add missing indexes for foreign keys
CREATE INDEX IF NOT EXISTS "story_comments_parent_comment_id_idx" ON "public"."story_comments" ("parent_comment_id");
CREATE INDEX IF NOT EXISTS "transactions_related_user_id_idx" ON "public"."transactions" ("related_user_id");
