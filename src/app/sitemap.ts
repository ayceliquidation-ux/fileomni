import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://fileomni.com';

  const tools = [
    'audio-extractor',
    'heic-to-jpg',
    'image-to-pdf',
    'pdf-to-jpg',
    'remove-background',
    'smart-scanner',
    'timeline-trimmer',
    'unit-hub',
    'video-to-gif'
  ];

  const toolEntries: MetadataRoute.Sitemap = tools.map((tool) => ({
    url: `${baseUrl}/tools/${tool}`,
    lastModified: new Date(),
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      priority: 1.0,
    },
    ...toolEntries,
  ];
}
