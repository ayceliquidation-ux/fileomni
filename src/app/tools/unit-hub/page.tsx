import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import UnitHub from '@/components/UnitHub';
import { ToolInstructions } from '@/components/ToolInstructions';

export const metadata: Metadata = {
  title: 'Unit Converter Hub | FileOmni',
  description: 'Instantly convert length, weight, temperature, and volume units completely locally.',
};

export default function UnitHubPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0B] text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-12">
          <ArrowLeft className="w-4 h-4" /> Back to Tools
        </Link>
        <ToolInstructions steps={[
          "Select a measurement category", 
          "Choose your starting and target units", 
          "Type your value for an instant conversion"
        ]} />
        <UnitHub />
      </div>
    </main>
  );
}
