import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import PdfToJpg from '@/components/PdfToJpg';
import { ToolInstructions } from '@/components/ToolInstructions';

export const metadata: Metadata = {
  title: 'PDF to JPG Converter | FileOmni',
  description: 'Instantly convert secure PDF multi-page documents to high-resolution offline JPG images.',
};

export default function PdfToJpgPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0B] text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-12">
          <ArrowLeft className="w-4 h-4" /> Back to Tools
        </Link>
        <ToolInstructions steps={[
          "Drop your secure PDF document", 
          "Wait for the local engine to parse the pages", 
          "Download individual JPGs or zip them all"
        ]} />
        <PdfToJpg />
      </div>
    </main>
  );
}
