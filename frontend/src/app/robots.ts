import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/shared/utils/siteUrl";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/health"] }, sitemap: `${getSiteUrl()}/sitemap.xml` };
}
