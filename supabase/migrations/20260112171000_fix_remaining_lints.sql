-- Drop duplicate indexes
DROP INDEX IF EXISTS "public"."contributions_user_id_idx";
DROP INDEX IF EXISTS "public"."stories_creator_id_idx";
DROP INDEX IF EXISTS "public"."stories_group_id_idx";
DROP INDEX IF EXISTS "public"."story_participants_user_id_idx";

-- Add missing indexes for foreign keys
CREATE INDEX IF NOT EXISTS "groups_owner_id_idx" ON "public"."groups" ("owner_id");
CREATE INDEX IF NOT EXISTS "member_roles_assigned_by_idx" ON "public"."member_roles" ("assigned_by");
CREATE INDEX IF NOT EXISTS "member_roles_role_id_idx" ON "public"."member_roles" ("role_id");
CREATE INDEX IF NOT EXISTS "member_roles_user_id_idx" ON "public"."member_roles" ("user_id");
