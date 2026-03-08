import type { Metadata } from 'next';
import VideoToGif from '@/components/VideoToGif';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Video to GIF Converter | FileOmni',
  description: 'Convert MP4 and MOV videos to extremely high-quality GIFs totally offline with our local-first WebAssembly engine.',
};

export default function VideoToGifPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0B] text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-12">
          <ArrowLeft className="w-4 h-4" /> Back to Tools
        </Link>
        <VideoToGif />
      </div>
    </main>
  );
}
