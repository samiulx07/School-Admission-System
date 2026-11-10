import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/shared/utils/siteUrl";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: getSiteUrl(), changeFrequency: "weekly" }];
}
