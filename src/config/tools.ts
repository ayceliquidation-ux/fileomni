export type ToolCategory = 'AI & Vision' | 'Media' | 'Documents' | 'Utilities';

export interface ToolConfig {
  id: string;
  name: string;
  description: string;
  href: string;
  category: ToolCategory;
  icon: string; // We will use simple emoji or text icons for now to keep it lightweight
}

export const tools: ToolConfig[] = [
  {
    id: 'merge-pdf',
    name: 'Merge PDF',
    description: 'Combine multiple PDF files into a single document.',
    href: '/merge-pdf',
    category: 'Documents',
    icon: '📑'
  },
  {
    id: 'split-pdf',
    name: 'Split PDF',
    description: 'Extract specific pages from a PDF document.',
    href: '/split-pdf',
    category: 'Documents',
    icon: '✂️'
  },
  {
    id: 'rotate-pdf',
    name: 'Rotate PDF',
    description: 'Rotate pages in your PDF document.',
    href: '/rotate-pdf',
    category: 'Documents',
    icon: '🔄'
  },
  {
    id: 'remove-pages',
    name: 'Remove Pages',
    description: 'Visually delete pages from your PDF files.',
    href: '/remove-pages',
    category: 'Documents',
    icon: '🗑️'
  },
  {
    id: 'add-watermark',
    name: 'Add Watermark',
    description: 'Stamp custom text onto your PDF pages.',
    href: '/add-watermark',
    category: 'Documents',
    icon: '🔏'
  },
  {
    id: 'remove-background',
    name: 'AI Background Remover',
    description: 'Local AI subject isolation and background removal.',
    href: '/tools/remove-background',
    category: 'AI & Vision',
    icon: '✨'
  },
  {
    id: 'smart-scanner',
    name: 'Smart Scanner',
    description: 'Auto-straighten and enhance documents using OpenCV.',
    href: '/tools/smart-scanner',
    category: 'Documents',
    icon: '📄'
  },
  {
    id: 'video-to-gif',
    name: 'Video to GIF',
    description: 'Instant local MP4/MOV to GIF conversion.',
    href: '/tools/video-to-gif',
    category: 'Media',
    icon: '🎬'
  },
  {
    id: 'audio-extractor',
    name: 'Audio Extractor',
    description: 'Extract MP3/WAV audio tracks from video files.',
    href: '/tools/audio-extractor',
    category: 'Media',
    icon: '🎵'
  },
  {
    id: 'pdf-to-jpg',
    name: 'PDF to JPG',
    description: 'Convert PDF pages into high-quality images.',
    href: '/tools/pdf-to-jpg',
    category: 'Documents',
    icon: '🖼️'
  },
  {
    id: 'image-to-pdf',
    name: 'Image to PDF',
    description: 'Combine multiple images into a single PDF document.',
    href: '/tools/image-to-pdf',
    category: 'Documents',
    icon: '📚'
  },
  {
    id: 'unit-hub',
    name: 'Unit Hub',
    description: 'Instant offline conversions for length, weight, and more.',
    href: '/tools/unit-hub',
    category: 'Utilities',
    icon: '⚖️'
  },
  {
    id: 'heic-to-jpg',
    name: 'HEIC to JPG',
    description: 'Convert Apple HEIC photos to standard JPG locally.',
    href: '/tools/heic-to-jpg',
    category: 'Media',
    icon: '🍏'
  }
];
