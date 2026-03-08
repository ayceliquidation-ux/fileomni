import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ImageToPdfConverter from '@/components/ImageToPdf';
import { ToolInstructions } from '@/components/ToolInstructions';

export const metadata: Metadata = {
  title: 'Image to PDF Converter | UltraConvert',
  description: 'Instantly convert and merge multiple JPG/PNG images into a single secure PDF document completely locally.',
};

export default function ImageToPdfPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0B] text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-12">
          <ArrowLeft className="w-4 h-4" /> Back to Tools
        </Link>
        <ToolInstructions steps={[
          "Upload multiple JPG or PNG images", 
          "Reorder or remove images if necessary", 
          "Generate and download your compiled PDF"
        ]} />
        <ImageToPdfConverter />
      </div>
    </main>
  );
}
