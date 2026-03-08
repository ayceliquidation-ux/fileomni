import type { Metadata } from 'next';
import AudioExtractor from '@/components/AudioExtractor';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Extract Audio from Video | FileOmni',
  description: 'Convert MP4 to ultra-high-quality 320kbps MP3 right in your browser. All processing is local and secure.',
};

export default function AudioExtractorPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0B] text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-12">
          <ArrowLeft className="w-4 h-4" /> Back to Tools
        </Link>
        <AudioExtractor />
      </div>
    </main>
  );
}
