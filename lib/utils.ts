import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Display name shown publicly: "Saahil J."
export function displayName(
  firstName: string,
  lastName: string | null | undefined
): string {
  if (!lastName) return firstName;
  return `${firstName} ${lastName[0].toUpperCase()}.`;
}

// Parse a full name string into display format
export function displayNameFromFull(fullName: string | null | undefined): string {
  if (!fullName) return "Unknown";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return displayName(parts[0], parts[parts.length - 1]);
}

// paise → "₹1,500" (or "₹1,500.00" if needed)
export function formatCurrency(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rupees);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

// "3 days ago", "just now", etc.
export function formatRelativeTime(date: Date | string): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

// "EB-" + 8 random uppercase chars
export function generateOrderId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "EB-";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// PAN masking: "ABCDE1234F" → "ABCDE****F"
export function maskPan(pan: string): string {
  if (!pan || pan.length !== 10) return pan;
  return pan.slice(0, 5) + "****" + pan.slice(9);
}

// Aadhaar masking: "123456789012" → "XXXX XXXX 9012" (UIDAI requirement)
export function maskAadhaar(num: string): string {
  const digits = num.replace(/\s/g, "");
  if (!digits || digits.length !== 12) return num;
  return `XXXX XXXX ${digits.slice(8)}`;
}

// rupees → paise
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

// paise → rupees (number)
export function paiseToRupees(paise: number): number {
  return paise / 100;
}
