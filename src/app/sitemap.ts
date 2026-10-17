import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://repopilot.dev";
  const now = new Date();

  const routes = [
    {
      url: `${siteUrl}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 1.0
    },
    {
      url: `${siteUrl}/explore`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.9
    },
    {
      url: `${siteUrl}/architecture`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.9
    },
    {
      url: `${siteUrl}/debugging`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.9
    },
    {
      url: `${siteUrl}/assistant`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8
    },
    {
      url: `${siteUrl}/patches`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8
    },
    {
      url: `${siteUrl}/search`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8
    },
    {
      url: `${siteUrl}/docs`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7
    },
    {
      url: `${siteUrl}/settings`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.5
    },
    {
      url: `${siteUrl}/settings/ai`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.5
    }
  ];

  return routes;
}
