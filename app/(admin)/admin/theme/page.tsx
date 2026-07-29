import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { platformSettings } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import { ThemeClient } from "./theme-client";


const THEME_KEYS = [
  "platform_name", "platform_tagline",
  "logo_url", "favicon_url",
  "brand_primary", "brand_editor", "brand_client", "brand_teal",
  "site_radius", "font_heading", "font_body",
  "announcement_enabled", "announcement_text", "announcement_bg", "announcement_text_color",
  "site_dark_mode",
  "email_header_color",
  "social_twitter", "social_instagram", "social_linkedin",
  "custom_css",
];

const DEFAULTS: Record<string, string> = {
  platform_name:          "EditBridge",
  platform_tagline:       "",
  logo_url:               "",
  favicon_url:            "",
  brand_primary:          "#7C3AED",
  brand_editor:           "#7C3AED",
  brand_client:           "#0EA5E9",
  brand_teal:             "#0F6E56",
  site_radius:            "0.625rem",
  font_heading:           "Rubik",
  font_body:              "Nunito Sans",
  announcement_enabled:   "false",
  announcement_text:      "",
  announcement_bg:        "#7C3AED",
  announcement_text_color:"#ffffff",
  site_dark_mode:         "light",
  email_header_color:     "#7C3AED",
  social_twitter:         "",
  social_instagram:       "",
  social_linkedin:        "",
  custom_css:             "",
};

export default async function AdminThemePage() {
  const session = await auth();
  if (!session || session.user.role !== "admin") redirect("/admin/dashboard");

  const rows = await db
    .select({ key: platformSettings.key, value: platformSettings.value })
    .from(platformSettings)
    .where(inArray(platformSettings.key, THEME_KEYS));

  const settings: Record<string, string> = { ...DEFAULTS };
  for (const row of rows) settings[row.key] = row.value;

  return <ThemeClient settings={settings} />;
}
