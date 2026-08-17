import { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://editbridge.in";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/dashboard",
          "/editor/dashboard",
          "/editor/kyc",
          "/editor/payments",
          "/editor/settings",
          "/messages",
          "/orders",
          "/settings",
          "/onboarding",
          "/checkout/",
          "/login",
          "/signup",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
