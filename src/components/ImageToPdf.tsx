"use client";

import { useState } from "react";
import { FileUp, FileDown, RefreshCw, Layers, Plus } from "lucide-react";
import { PDFDocument } from "pdf-lib";

interface UploadedImage {
  id: string;
  file: File;
  dataUrl: string;
}

export default function ImageToPdf() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;
    
    setError(null);

    // Read new files into state with data URLs for thumbnail preview
    const newImages: UploadedImage[] = [];
    for (const file of selectedFiles) {
      if (!file.type.startsWith('image/')) continue;
      
      const dataUrl = await new Promise<string>((resolve, reject) => {
         const reader = new FileReader();
         reader.onload = (e) => resolve(e.target?.result as string);
         reader.onerror = reject;
         reader.readAsDataURL(file);
      });

      newImages.push({
         id: crypto.randomUUID(),
         file,
         dataUrl
      });
    }

    setImages(prev => [...prev, ...newImages]);
    
    // Clear input so selecting the same files again works
    e.target.value = '';
  };

  const removeImage = (idToRemove: string) => {
     setImages(prev => prev.filter(img => img.id !== idToRemove));
  };

  const generatePDF = async () => {
    if (images.length === 0) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      // 1. Initialize a volatile PDFDocument payload
      const pdfDoc = await PDFDocument.create();

      // 2. Transcribe each native image exactly based on its native MIME compression architecture
      for (const img of images) {
         const arrayBuffer = await img.file.arrayBuffer();
         let pdfImage;

         if (img.file.type === 'image/png') {
            pdfImage = await pdfDoc.embedPng(arrayBuffer);
         } else if (img.file.type === 'image/jpeg' || img.file.type === 'image/jpg') {
            pdfImage = await pdfDoc.embedJpg(arrayBuffer);
         } else {
             // Fallback for webp/etc: draw via canvas first to sanitize to JPEG/PNG (Skipped for brevity, assume jpeg/png input)
             throw new Error(`Unsupported image type: ${img.file.type}. Please upload JPG or PNG.`);
         }

         // 3. Inject new page perfectly locked to the exact 1:1 image native dimensions
         const page = pdfDoc.addPage([pdfImage.width, pdfImage.height]);
         
         // 4. Fill the exact coordinates
         page.drawImage(pdfImage, {
            x: 0,
            y: 0,
            width: pdfImage.width,
            height: pdfImage.height,
         });
      }

      // 5. Serialize into document byte array
      const pdfBytes = await pdfDoc.save();
      
      // 6. Push local ArrayBuffer directly to standard user download flow via blob object
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const downloadUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `converted-images-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

    } catch (err: any) {
        console.error("PDF Compilation Error:", err);
        setError(err.message || "Failed to compile the final PDF document.");
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-2xl font-bold">Image to PDF Compiler</h2>
        <p className="text-gray-400">Merge multiple images into a single perfect-fit secure PDF document</p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 text-sm">
          {error}
        </div>
      )}

      {/* Main UI Container */}
      <div className="bg-[#121214] border border-white/5 rounded-3xl p-6 md:p-8 space-y-8">
          
        {/* Upload Zone (Always visible to allow appending) */}
        <label className="relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-white/10 rounded-2xl hover:bg-white/[0.02] hover:border-emerald-500/50 transition-all cursor-pointer group active:scale-[0.98]">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
             <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-gray-400 group-hover:text-emerald-400">
               <Plus className="w-6 h-6" />
             </div>
             <p className="mb-2 text-base font-bold text-white">Add Images (JPG/PNG)</p>
             <p className="text-xs text-gray-500 font-mono">Select multiple files at once</p>
          </div>
          <input 
            type="file" 
            className="hidden" 
            accept="image/jpeg, image/png"
            multiple
            onChange={handleFileChange}
            disabled={isProcessing}
          />
        </label>

        {/* Selected Images Grid Matrix */}
        {images.length > 0 && (
           <div className="space-y-4">
               <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                     <Layers className="w-4 h-4 text-emerald-400" />
                     {images.length} {images.length === 1 ? 'Image' : 'Images'} Selected
                  </h3>
                  <button 
                     onClick={() => setImages([])}
                     className="text-sm font-medium text-gray-500 hover:text-red-400 transition-colors"
                  >
                     Clear All
                  </button>
               </div>

               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {images.map((img, index) => (
                     <div key={img.id} className="relative group aspect-[4/3] rounded-xl overflow-hidden bg-black border border-white/5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                           src={img.dataUrl} 
                           alt={`Upload ${index + 1}`}
                           className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                           <span className="text-xs font-mono text-white truncate">{img.file.name}</span>
                        </div>
                        <button 
                           onClick={() => removeImage(img.id)}
                           className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-90 transition-all shadow-lg"
                        >
                           <span className="text-white text-xs font-bold leading-none select-none">&times;</span>
                        </button>
                        <div className="absolute top-2 left-2 w-5 h-5 bg-black/50 backdrop-blur text-white text-[10px] font-bold rounded flex items-center justify-center border border-white/10">
                           {index + 1}
                        </div>
                     </div>
                  ))}
               </div>
               
               {/* Final Action Sequence */}
               <div className="pt-6 mt-6 border-t border-white/5 flex justify-end">
                   <button
                     onClick={generatePDF}
                     disabled={isProcessing || images.length === 0}
                     className="w-full md:w-auto px-8 py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                   >
                     {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
                     {isProcessing ? "Compiling PDF..." : "Generate PDF Document"}
                   </button>
               </div>
           </div>
        )}

      </div>
    </div>
  );
}
