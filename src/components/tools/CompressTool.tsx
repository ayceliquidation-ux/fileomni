"use client";

import { useState, useCallback, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import JSZip from 'jszip';
import { AlertCircle, Download, Minimize2, Settings2 } from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";

export default function CompressTool() {
  const { file } = useWorkspace();
  const [compressionLevel, setCompressionLevel] = useState<'Light'|'Recommended'|'Extreme'>('Recommended');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const ensurePdfJs = useCallback(async (): Promise<boolean> => {
    if ((window as any).pdfjsLib) return true;
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.async = true;
      script.onload = () => {
        const pdfjsLib = (window as any).pdfjsLib;
        if (pdfjsLib) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          resolve(true);
        } else resolve(false);
      };
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }, []);

  const handleCompress = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgress(0);
    setError(null);

    const loaded = await ensurePdfJs();
    if (!loaded) {
       setError("Failed to load PDF engine. Please wait a moment.");
       setIsProcessing(false);
       return;
    }

    try {
      let scale = 1.0;
      let quality = 0.6;
      
      switch (compressionLevel) {
        case 'Light':
          scale = 1.5; quality = 0.8; break;
        case 'Recommended':
           scale = 1.0; quality = 0.6; break;
        case 'Extreme':
           scale = 0.7; quality = 0.4; break;
      }

      const pdfjsLib = (window as any).pdfjsLib;
      const fileBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
      const totalPages = pdf.numPages;
      const newPdf = await PDFDocument.create();

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Could not create canvas context.");

        await page.render({ canvasContext: ctx, viewport }).promise;

        const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
        const jpegImage = await newPdf.embedJpg(jpegDataUrl);
        const { width, height } = jpegImage.scale(1 / scale); 
        
        const newPage = newPdf.addPage([width, height]);
        newPage.drawImage(jpegImage, { x: 0, y: 0, width, height });

        setProgress(Math.round((i / totalPages) * 100));
      }

      const pdfBytes = await newPdf.save({ useObjectStreams: false });
      const pdfBlob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
      
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      link.download = `${baseName}_compressed.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setProgress(100);
    } catch (err: any) {
      console.error("Compression error:", err);
      if (err.name === 'PasswordException' || err.message?.includes('password')) {
         setError("This PDF is password protected. Please unlock it first.");
      } else {
         setError("Failed to compress document. Please try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (!file || file.type !== 'application/pdf') return null;

  return (
    <div className="w-full bg-[#121214] border border-white/5 flex flex-col gap-6 shadow-xl relative overflow-hidden p-6 mt-6 rounded-b-2xl">
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500/0 via-blue-500/50 to-blue-500/0 hidden md:block"></div>
      
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div>
         <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            <Minimize2 className="w-5 h-5 text-blue-500" />
            Compress Document
         </h3>
         <p className="text-sm text-gray-400">
            Reduce file size securely using local browser rasterization scaling. Select a compression preset below.
         </p>
      </div>

       <div className="flex flex-col gap-4">
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
               <button 
                  onClick={() => setCompressionLevel('Light')}
                  disabled={isProcessing}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${compressionLevel === 'Light' ? 'bg-blue-500/10 border-blue-500' : 'bg-black/20 border-white/5 hover:border-white/20'}`}
               >
                   <span className={`text-sm font-bold ${compressionLevel === 'Light' ? 'text-blue-400' : 'text-gray-300'}`}>Light</span>
                   <span className="text-xs text-gray-500 mt-1 hidden sm:block">High Quality</span>
               </button>
               <button 
                  onClick={() => setCompressionLevel('Recommended')}
                  disabled={isProcessing}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${compressionLevel === 'Recommended' ? 'bg-blue-500/10 border-blue-500 shadow-inner' : 'bg-black/20 border-white/5 hover:border-white/20'}`}
               >
                   <span className={`text-sm font-bold ${compressionLevel === 'Recommended' ? 'text-blue-400' : 'text-gray-300'}`}>Recommended</span>
                   <span className="text-xs text-gray-500 mt-1 hidden sm:block">Best Balance</span>
               </button>
               <button 
                  onClick={() => setCompressionLevel('Extreme')}
                  disabled={isProcessing}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${compressionLevel === 'Extreme' ? 'bg-blue-500/10 border-blue-500' : 'bg-black/20 border-white/5 hover:border-white/20'}`}
               >
                   <span className={`text-sm font-bold ${compressionLevel === 'Extreme' ? 'text-blue-400' : 'text-gray-300'}`}>Extreme</span>
                   <span className="text-xs text-gray-500 mt-1 hidden sm:block">Smallest Size</span>
               </button>
           </div>
       </div>

       <div className="flex flex-col w-full relative sm:w-auto self-end mt-2">
            <button
                onClick={handleCompress}
                disabled={isProcessing}
                className={`w-full sm:min-w-[250px] py-3 px-6 font-bold rounded-xl transition-all flex items-center justify-center gap-2 group border overflow-hidden relative ${
                    isProcessing 
                    ? 'bg-blue-600/50 text-blue-200 border-blue-500/20 cursor-wait opacity-80' 
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg border-blue-400/20 active:scale-[0.98]'
                }`}
            >
                {isProcessing ? (
                   <>
                      <div className="w-full absolute inset-0 bg-blue-500 h-1 rounded-full overflow-hidden top-auto bottom-0">
                         <div className="bg-white h-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
                      </div>
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {progress}%
                   </>
                ) : (
                    <>
                        <Download className="w-4 h-4 text-blue-100" />
                        Download PDF
                    </>
                )}
            </button>
       </div>
    </div>
  );
}
