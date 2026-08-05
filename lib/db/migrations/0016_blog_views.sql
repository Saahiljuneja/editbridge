-- Add view counter to blog posts
ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "views" integer NOT NULL DEFAULT 0;
