import type { Metadata } from "next";
import { site } from "@/data/site";
import { SiteLayout } from "@/layouts/SiteLayout";
import { AppProviders } from "@/shared/contexts/AppProviders";
import { getSiteUrl } from "@/shared/utils/siteUrl";
import { socialImages, websiteStructuredData } from "@/shared/utils/siteMetadata";
import { manrope } from "./fonts";
import "bootstrap/dist/css/bootstrap.min.css";
import "@/styles/globals.scss";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: { default: "Seatwise | School admissions, clearly", template: "%s | Seatwise" },
  description: site.description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: site.name,
    title: "School admissions, clearly",
    description: site.description,
    locale: "en_US",
    images: socialImages,
  },
  twitter: { card: "summary_large_image", images: socialImages.map(image => image.url) },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={manrope.variable}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData).replace(/</g, "\\u003c") }} />
        <AppProviders><SiteLayout>{children}</SiteLayout></AppProviders>
      </body>
    </html>
  );
}
