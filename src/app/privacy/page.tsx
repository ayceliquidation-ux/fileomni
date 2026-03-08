import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, CheckCircle2, Lock, Cpu, ServerOff } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | UltraConvert',
  description: 'Learn about our 100% local-first, zero-data-collection privacy architecture.',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0B] text-white p-6 md:p-12 selection:bg-primary/30">
      <div className="max-w-3xl mx-auto flex flex-col pt-12 pb-24 space-y-12">
        
        <div className="flex justify-between items-center border-b border-white/5 pb-8 mb-8">
            <Link href="/" className="text-xl font-bold tracking-tight flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                UltraConvert
            </Link>
            <nav className="flex gap-6 text-sm font-medium text-gray-400">
                <Link href="/" className="hover:text-white transition-colors">Home</Link>
                <Link href="/privacy" className="text-white">Privacy</Link>
            </nav>
        </div>

        <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" /> Zero Data Collection
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
                What happens on your device,<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">stays on your device.</span>
            </h1>
            <p className="text-xl text-gray-400 leading-relaxed max-w-2xl">
                Unlike traditional web tools, UltraConvert operates on a strict Local-First architecture. We do not have servers to process your files, which means your data can never be intercepted, stored, or sold.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8">
            <div className="bg-[#121214] border border-white/5 rounded-2xl p-6 space-y-4">
               <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <ServerOff className="w-6 h-6 text-blue-400" />
               </div>
               <h3 className="text-lg font-bold">No Cloud Uploads</h3>
               <p className="text-gray-400 text-sm leading-relaxed">
                  Every single file you drop into our tools is processed entirely within your browser's memory sandbox. We never transfer your PDFs, photos, videos, or audio files over the network.
               </p>
            </div>

            <div className="bg-[#121214] border border-white/5 rounded-2xl p-6 space-y-4">
               <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Cpu className="w-6 h-6 text-purple-400" />
               </div>
               <h3 className="text-lg font-bold">WebAssembly Powered</h3>
               <p className="text-gray-400 text-sm leading-relaxed">
                  Heavy computational tasks like OpenCV edge detection, multi-megabyte PDF parsing, and Machine Learning Background Removal are executed directly on your local CPU via WebAssembly (WASM).
               </p>
            </div>

            <div className="bg-[#121214] border border-white/5 rounded-2xl p-6 space-y-4">
               <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-emerald-400" />
               </div>
               <h3 className="text-lg font-bold">Absolute Security</h3>
               <p className="text-gray-400 text-sm leading-relaxed">
                  By eliminating the server, we eliminate the attack vector. Your sensitive documents (tax forms, legal contracts, private photos) are completely impervious to cloud data breaches.
               </p>
            </div>

            <div className="bg-[#121214] border border-white/5 rounded-2xl p-6 space-y-4">
               <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-rose-400" />
               </div>
               <h3 className="text-lg font-bold">No Hidden Tracking</h3>
               <p className="text-gray-400 text-sm leading-relaxed">
                  UltraConvert is a statically hosted application. We do not use invasive analytics, cookie tracking, or user fingerprinting. What you do here is your business alone.
               </p>
            </div>
        </div>

        <div className="pt-12 border-t border-white/5 space-y-6">
            <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
            
            <div className="space-y-8">
                <div>
                   <h4 className="font-semibold mb-2">If you don't upload my files, how does the AI Background Remover work?</h4>
                   <p className="text-gray-400 text-sm leading-relaxed">
                      When you load the Background Remover tool for the first time, your browser downloads the actual AI model weights (the "brain") directly to your device caching system. The mathematical inference happens 100% locally using your device's graphics processor.
                   </p>
                </div>
                <div>
                   <h4 className="font-semibold mb-2">Can I use the app while disconnected from the internet?</h4>
                   <p className="text-gray-400 text-sm leading-relaxed">
                      Yes! Once the initial site assets and necessary WebAssembly libraries (like pdf.js or OpenCV) are cached in your browser by loading the page once, you can safely sever your WiFi connection and continue processing files locally.
                   </p>
                </div>
            </div>
        </div>

      </div>
    </main>
  );
}
