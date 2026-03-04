import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://fullstack-chat-agent-fe.vercel.app';
  return [
    { url: `${base}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 1 },
    {
      url: `${base}/register`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];
}
