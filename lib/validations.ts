import { z } from "zod";

// ─── Auth building blocks ──────────────────────────────────────────────────────

// Rejects values that contain HTML or script tags instead of silently stripping.
// Stripping is dangerous because sanitizers can be bypassed; explicit rejection
// is simpler and safer for structured fields like names.
function noHtmlTags(val: string): boolean {
  return !/<[^>]+>/.test(val);
}

// Unicode-aware name: letters, marks, spaces, hyphens, apostrophes, periods.
// Explicit allowlist — anything else is rejected.
export const nameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name must be under 100 characters")
  .regex(
    /^[\p{L}\p{M} '\-.]+$/u,
    "Name may only contain letters, spaces, hyphens, apostrophes, and periods"
  )
  .refine(noHtmlTags, { message: "Name contains invalid characters" });

// Normalises email inside the schema so routes never forget to do it.
export const emailSchema = z
  .string()
  .email("Invalid email address")
  .max(254, "Email address is too long")
  .transform((v) => v.toLowerCase().trim());

// OTP must be exactly 6 ASCII digits — nothing else reaches the DB.
export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Verification code must be exactly 6 digits");

// Password-reset token is 32 random bytes encoded as 64 lowercase hex chars.
export const resetTokenSchema = z
  .string()
  .regex(/^[0-9a-f]{64}$/, "Invalid reset token");

// Shared password complexity used for signup AND password reset so a reset link
// cannot be used to downgrade password strength below what signup enforces.
export const passwordComplexitySchema = z
  .string()
  .min(8, "Must be at least 8 characters long")
  .max(128, "Password is too long")
  .regex(/[a-z]/, "Must include at least 1 lowercase letter")
  .regex(/[A-Z]/, "Must include at least 1 uppercase letter")
  .regex(/[0-9]/, "Must include at least 1 number")
  .regex(/[^a-zA-Z0-9]/, "Must include at least 1 special character");

// ─── Business schemas ──────────────────────────────────────────────────────────

export const createOrderSchema = z.object({
  packageId: z.string().uuid("Invalid package ID"),
  useCredits: z.boolean().optional(),
  rewardDiscountAmount: z.number().int().min(0).default(0).optional(),
  options: z.object({
    extraFast: z.boolean().optional(),
    extraRevision: z.boolean().optional(),
    sourceFiles: z.boolean().optional(),
    commercialRights: z.boolean().optional(),
  }).optional(),
});

export const submitReviewSchema = z.object({
  orderId: z.string().uuid("Invalid order ID"),
  rating: z.number().int().min(1).max(5),
  text: z.string().max(1000, "Review must be under 1000 characters").optional(),
});

export const createPackageSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must be under 100 characters"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(500, "Description must be under 500 characters"),
  price: z
    .number()
    .int("Price must be a whole number")
    .min(29900, "Minimum price is ₹299")
    .max(10000000, "Maximum price is ₹1,00,000"), // in paise
  deliveryDays: z
    .number()
    .int()
    .min(1, "Minimum delivery is 1 day")
    .max(90, "Maximum delivery is 90 days"),
  revisionCount: z
    .number()
    .int()
    .min(0, "Revision count cannot be negative")
    .max(100),
  videoLengthLimit: z.string().max(50).nullable().optional(),
  videoCount: z.number().int().min(1).max(100).optional().default(1),
  videoCategory: z.string().max(50).nullable().optional(),
  videoFormat: z.enum(["short_form", "long_form", "both"]).nullable().optional(),
  resolution: z.enum(["1080p", "4k", "any"]).nullable().optional(),
  aspectRatios: z.array(z.string().max(10)).optional().default([]),
  addons: z.array(z.string().max(50)).optional().default([]),
  softwareUsed: z.array(z.string().max(50)).optional().default([]),
  maxRawFootage: z.string().max(50).nullable().optional(),
  deliveryFormats: z.array(z.string().max(50)).optional().default([]),
  includesSourceFiles: z.boolean().optional().default(false),
  includesCommercialRights: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
});

export const submitKycSchema = z.object({
  documentType: z.enum(["aadhaar", "passport"]),
  documentNumber: z.string().min(1, "Document number is required").max(30),
  documentUrl: z.string().min(1, "Document URL is required"),
  documentBackUrl: z.string().optional(),
  panNumber: z.string().min(10).max(10).regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Invalid PAN format (e.g. ABCDE1234F)"),
  panDocumentUrl: z.string().min(1, "PAN card upload is required"),
  selfieUrl: z.string().min(1, "Selfie with document is required"),
}).superRefine((data, ctx) => {
  const digits = data.documentNumber.replace(/\s/g, "");
  if (data.documentType === "aadhaar" && !/^\d{12}$/.test(digits)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Aadhaar number must be exactly 12 digits", path: ["documentNumber"] });
  }
  if (data.documentType === "passport" && !/^[A-Z]\d{7}$/.test(data.documentNumber)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Passport number must be a letter followed by 7 digits (e.g. A1234567)", path: ["documentNumber"] });
  }
});

export const openDisputeSchema = z.object({
  orderId: z.string().uuid("Invalid order ID"),
  reason: z
    .string()
    .min(20, "Please provide more detail about the dispute")
    .max(1000),
  evidenceText: z
    .string()
    .max(2000, "Evidence text must be under 2000 characters")
    .optional(),
  evidenceUrls: z.array(z.string()).max(5).optional().default([]),
});

export const sendMessageSchema = z.object({
  content: z
    .string()
    .min(1, "Message cannot be empty")
    .max(5000, "Message too long"),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
});

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100)
    .optional(),
  bio: z.string().max(500, "Bio must be under 500 characters").optional(),
  isAvailable: z.boolean().optional(),
});

export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

export const passwordResetSchema = z
  .object({
    token: resetTokenSchema,
    password: passwordComplexitySchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const signupSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordComplexitySchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const verifyEmailSchema = z.object({
  email: emailSchema,
  otp: otpSchema,
});

export const resendVerificationSchema = z.object({
  email: emailSchema,
});
