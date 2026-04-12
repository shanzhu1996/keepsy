import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://keepsy.app",
      lastModified: new Date(),
    },
    {
      url: "https://keepsy.app/login",
      lastModified: new Date(),
    },
  ];
}
