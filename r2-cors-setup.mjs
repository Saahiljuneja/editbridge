/**
 * Cloudflare R2 CORS + Bucket Policy Setup
 *
 * Run ONCE before going to production:
 *   node --env-file=.env.local r2-cors-setup.mjs
 *
 * What this does:
 *   1. Sets CORS rules so browsers can upload files directly to R2 via presigned URLs
 *   2. Without this, all file uploads (KYC docs, portfolio, deliveries) fail in production
 *      even though they work locally (localhost bypasses CORS).
 */

import {
  S3Client,
  PutBucketCorsCommand,
  GetBucketCorsCommand,
} from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME;
const PRODUCTION_DOMAIN = process.env.NEXT_PUBLIC_APP_URL || "https://editbridge.in";

const corsRules = [
  {
    // Allow browsers to PUT files via presigned URLs (KYC docs, portfolio, deliveries)
    ID: "editbridge-presigned-uploads",
    AllowedOrigins: [
      PRODUCTION_DOMAIN,
      "http://localhost:3000",
      "http://localhost:3001",
    ],
    AllowedMethods: ["PUT", "GET", "HEAD"],
    AllowedHeaders: [
      "Content-Type",
      "Content-Length",
      "Content-Disposition",
      "x-amz-content-sha256",
      "x-amz-date",
      "Authorization",
    ],
    ExposeHeaders: ["ETag"],
    MaxAgeSeconds: 3600,
  },
];

async function applyCors() {
  console.log(`\n📦 Bucket: ${BUCKET}`);
  console.log(`🌐 Production domain: ${PRODUCTION_DOMAIN}\n`);

  try {
    await r2.send(
      new PutBucketCorsCommand({
        Bucket: BUCKET,
        CORSConfiguration: { CORSRules: corsRules },
      })
    );
    console.log("✅ CORS rules applied successfully.");

    // Verify
    const { CORSRules } = await r2.send(
      new GetBucketCorsCommand({ Bucket: BUCKET })
    );
    console.log("\n📋 Active CORS rules:");
    CORSRules.forEach((rule, i) => {
      console.log(`\n  Rule ${i + 1}: ${rule.ID}`);
      console.log(`    Origins : ${rule.AllowedOrigins.join(", ")}`);
      console.log(`    Methods : ${rule.AllowedMethods.join(", ")}`);
      console.log(`    Max age : ${rule.MaxAgeSeconds}s`);
    });

    console.log("\n✅ R2 is ready for production file uploads.\n");
  } catch (err) {
    console.error("❌ Failed to set CORS:", err.message);
    console.error("\nCheck that R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME are set in .env.local\n");
    process.exit(1);
  }
}

applyCors();
