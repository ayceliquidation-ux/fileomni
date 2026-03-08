import type { Metadata } from 'next';
import TimelineTrimmer from '@/components/TimelineTrimmer';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Video Trim & Cut | UltraConvert',
  description: 'Cut the start and end of any video instantly without quality loss. Zero upload delays.',
};

export default function TimelineTrimmerPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0B] text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-12">
          <ArrowLeft className="w-4 h-4" /> Back to Tools
        </Link>
        <TimelineTrimmer />
      </div>
    </main>
  );
}
