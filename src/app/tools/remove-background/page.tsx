import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import BackgroundRemover from '@/components/BackgroundRemover';
import { ToolInstructions } from '@/components/ToolInstructions';

export const metadata: Metadata = {
  title: 'AI Background Remover | UltraConvert',
  description: 'Remove subjects from images locally using Transformers.js AI engine. Runs entirely in your browser.',
};

export default function RemoveBackgroundPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0B] text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-12">
          <ArrowLeft className="w-4 h-4" /> Back to Tools
        </Link>
        <ToolInstructions steps={[
          "Upload an image", 
          "Let the local AI extract the subject", 
          "Choose a new background and export"
        ]} />
        <BackgroundRemover />
      </div>
    </main>
  );
}
