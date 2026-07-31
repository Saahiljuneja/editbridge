import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

console.log("Starting Help Center migration...");

// 1. Create Categories Table
await sql`
  CREATE TABLE IF NOT EXISTS help_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar(255) NOT NULL,
    slug varchar(255) NOT NULL UNIQUE,
    description text,
    icon varchar(100) DEFAULT 'HelpCircle',
    sort_order integer DEFAULT 0,
    created_at timestamp DEFAULT now()
  )
`;
console.log("Created table: help_categories");

// 2. Create Articles Table
await sql`
  CREATE TABLE IF NOT EXISTS help_articles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id uuid REFERENCES help_categories(id) ON DELETE CASCADE,
    title varchar(255) NOT NULL,
    slug varchar(255) NOT NULL UNIQUE,
    excerpt text,
    content text NOT NULL,
    is_published boolean DEFAULT false,
    read_time varchar(50) DEFAULT '3 min read',
    view_count integer DEFAULT 0,
    helpful_votes integer DEFAULT 0,
    unhelpful_votes integer DEFAULT 0,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
  )
`;
console.log("Created table: help_articles");

console.log("Help Center migration completed successfully.");
process.exit(0);
