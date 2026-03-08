'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, MonitorUp, Loader2, Download, Image as ImageIcon } from 'lucide-react';
import { ToolInstructions } from '@/components/ToolInstructions';
export default function HeicToJpgPage() {
  const [file, setFile] = useState<File | null>(null);
  const [convertedUrl, setConvertedUrl] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    // Check if it's actually a HEIC/HEIF file
    const isHeic = selectedFile.name.toLowerCase().endsWith('.heic') || 
                   selectedFile.name.toLowerCase().endsWith('.heif') ||
                   selectedFile.type === 'image/heic' || 
                   selectedFile.type === 'image/heif';
                   
    if (!isHeic) {
      setError("Please select a valid .HEIC or .HEIF image file.");
      return;
    }

    setFile(selectedFile);
    setError(null);
    setConvertedUrl(null);
    await convertHeicToJpg(selectedFile);
  };

  const convertHeicToJpg = async (heicFile: File) => {
    setIsConverting(true);
    
    try {
      // Dynamically import heic2any to prevent "window is not defined" SSR errors
      const heic2any = (await import('heic2any')).default;
      
      // heic2any returns either a single Blob or Blob[] depending on the file
      const result = await heic2any({
        blob: heicFile,
        toType: 'image/jpeg',
        quality: 0.9
      });
      
      // Handle the result whether it's an array or a single blob
      const jpegBlob = Array.isArray(result) ? result[0] : result;
      
      // Create an object URL for the converted jpeg
      const url = URL.createObjectURL(jpegBlob);
      setConvertedUrl(url);
      
    } catch (err) {
      console.error("Error converting HEIC:", err);
      setError("Failed to convert image. The file might be corrupted or unsupported.");
    } finally {
      setIsConverting(false);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const downloadImage = () => {
    if (!convertedUrl || !file) return;
    
    const a = document.createElement('a');
    a.href = convertedUrl;
    // Replace .heic/.heif extension with .jpg
    const newFilename = file.name.replace(/\.heic$|\.heif$/i, '.jpg');
    a.download = newFilename || 'converted-image.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <main className="min-h-screen bg-[#0A0A0B] text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-12">
          <ArrowLeft className="w-4 h-4" /> Back to Tools
        </Link>
        
        <ToolInstructions steps={[
          "Select or drop your Apple .HEIC photo", 
          "Wait for the local WebAssembly engine to process it", 
          "Download your standard .JPG instantly"
        ]} />

        <div className="bg-[#121214] border border-white/5 rounded-3xl p-8 mb-12">
            
          {!file ? (
             <div 
               onClick={triggerFileUpload}
               className="border-2 border-dashed border-indigo-500/30 rounded-2xl p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-indigo-500/5 transition-all group min-h-[400px]"
             >
               <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                 <MonitorUp className="w-10 h-10 text-indigo-400" />
               </div>
               <h3 className="text-2xl font-bold mb-2">Upload HEIC Photo</h3>
               <p className="text-gray-400 max-w-sm mb-6">
                 Select a .HEIC or .HEIF image from your device to instantly convert it to JPG locally.
               </p>
               <button className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors">
                 Select File
               </button>
               <input
                 type="file"
                 ref={fileInputRef}
                 onChange={handleFileChange}
                 accept=".heic,.heif,image/heic,image/heif"
                 className="hidden"
               />
               {error && (
                  <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm max-w-md">
                    {error}
                  </div>
               )}
             </div>
          ) : (
            <div className="space-y-8">
              <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                        <p className="font-medium text-white truncate max-w-xs md:max-w-md">{file.name}</p>
                        <p className="text-xs text-gray-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                 </div>
                 <button 
                    onClick={() => {
                        setFile(null);
                        setConvertedUrl(null);
                        setError(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
                 >
                    Clear
                 </button>
              </div>

              {isConverting && (
                 <div className="flex flex-col items-center justify-center p-12 bg-[#0A0A0B] border border-white/5 rounded-2xl min-h-[300px]">
                    <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-6" />
                    <h3 className="text-xl font-bold text-white mb-2">Converting Apple Magic to JPG...</h3>
                    <p className="text-gray-400 text-center max-w-md">
                        Please wait while your CPU processes the high-efficiency image format.
                    </p>
                 </div>
              )}

              {convertedUrl && !isConverting && (
                  <div className="flex flex-col items-center gap-8">
                     <div className="relative w-full max-w-2xl rounded-xl overflow-hidden border border-white/10 bg-[#0A0A0B]">
                         {/* eslint-disable-next-line @next/next/no-img-element */}
                         <img 
                            src={convertedUrl} 
                            alt="Converted JPG preview" 
                            className="w-full h-auto max-h-[60vh] object-contain"
                         />
                     </div>
                     
                     <button 
                        onClick={downloadImage}
                        className="flex items-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-900/20"
                     >
                        <Download className="w-5 h-5" />
                        Download JPG
                     </button>
                  </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
