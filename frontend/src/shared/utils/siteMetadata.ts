import { site } from "@/data/site";
import { getSiteUrl } from "./siteUrl";

export const socialImages = [{
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Seatwise. Find your class. Hold your place.",
}];

export const websiteStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: site.name,
  description: site.description,
  url: getSiteUrl(),
  inLanguage: "en",
};
