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
    id: 'compress-pdf',
    name: 'Compress PDF',
    description: 'Reduce PDF file sizes by rasterizing pages to optimized JPEGs.',
    href: '/tools/compress-pdf',
    category: 'Documents',
    icon: '🗜️'
  },
  {
    id: 'sign-pdf',
    name: 'Sign PDF',
    description: 'Draw your signature and stamp it securely onto your PDF.',
    href: '/tools/sign-pdf',
    category: 'Documents',
    icon: '🖋️'
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
    id: 'protect-pdf',
    name: 'Protect PDF',
    description: 'Secure your PDF files with a password.',
    href: '/protect-pdf',
    category: 'Documents',
    icon: '🔒'
  },
  {
    id: 'add-page-numbers',
    name: 'Add Page Numbers',
    description: 'Insert sequential page numbers into PDFs.',
    href: '/add-page-numbers',
    category: 'Documents',
    icon: '🔢'
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
  },
  {
    id: 'ocr-extract',
    name: 'OCR Extract',
    description: 'Extract text from any image instantly using local OCR.',
    href: '/tools/ocr-extract',
    category: 'AI & Vision',
    icon: '📝'
  },
  {
    id: 'redact-pdf',
    name: 'Redact PDF',
    description: 'Securely black-out, flatten, and permanently erase text from PDFs.',
    href: '/tools/redact-pdf',
    category: 'Documents',
    icon: '⬛'
  },
  {
    id: 'compress-office',
    name: 'Compress Office',
    description: 'Locally reduce Word and PowerPoint file sizes through image optimization.',
    href: '/tools/compress-office',
    category: 'Documents',
    icon: '📊'
  },
  {
    id: 'edit-pdf',
    name: 'Edit PDF',
    description: 'Add custom text overlays and freehand drawings directly onto PDFs locally.',
    href: '/tools/edit-pdf',
    category: 'Documents',
    icon: '📝'
  },
  {
    id: 'exif-scrubber',
    name: 'EXIF Scrubber',
    description: 'View hidden camera metadata and securely obliterate GPS coordinates.',
    href: '/tools/exif-scrubber',
    category: 'Media',
    icon: '📸'
  },
  {
    id: 'unlock-pdf',
    name: 'Unlock PDF',
    description: 'Remove password protection from encrypted PDF documents natively.',
    href: '/tools/unlock-pdf',
    category: 'Documents',
    icon: '🔓'
  },
  {
    id: 'organize-pdf',
    name: 'Organize PDF',
    description: 'Visually drag and drop thumbnails to reorder your PDF pages.',
    href: '/tools/organize-pdf',
    category: 'Documents',
    icon: '📑'
  },
  {
    id: 'flatten-pdf',
    name: 'Flatten PDF',
    description: 'Permanently merge interactive form fields into your PDF document.',
    href: '/tools/flatten-pdf',
    category: 'Documents',
    icon: '🔒'
  }
];
