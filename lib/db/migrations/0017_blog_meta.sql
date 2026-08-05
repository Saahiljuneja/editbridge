-- Custom meta overrides for SEO: OG image, Twitter card type, canonical URL
ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "og_image_url" text;
ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "twitter_card_type" text DEFAULT 'summary_large_image';
ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "canonical_url" text;
