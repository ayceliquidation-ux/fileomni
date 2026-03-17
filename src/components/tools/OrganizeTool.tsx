"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import { AlertCircle, Download, Layers, Grip } from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";

interface PdfPage {
  id: string; // Unique ID for React key
  originalIndex: number;
  thumbnailUrl: string;
}

export default function OrganizeTool() {
  const { file } = useWorkspace();
  const [pages, setPages] = useState<PdfPage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingPreviews, setIsGeneratingPreviews] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const draggedItemIndex = useRef<number | null>(null);
  const dragOverItemIndex = useRef<number | null>(null);
  
  // ensure pdf.js
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

  useEffect(() => {
    if (!file) {
      setPages([]);
      return;
    }
    
    let isActive = true;
    
    const generate = async () => {
      setIsGeneratingPreviews(true);
      setError(null);
      const loaded = await ensurePdfJs();
      if (!loaded) {
          setError("Failed to load PDF engine. Please check internet connection.");
          setIsGeneratingPreviews(false);
          return;
      }
      
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfjsLib = (window as any).pdfjsLib;
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        
        const newPages: PdfPage[] = [];
        const numPages = pdf.numPages;

        for (let i = 1; i <= numPages; i++) {
          if (!isActive) break;
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.5 }); 
          
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          
          await page.render({ canvasContext: ctx, viewport }).promise;
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          newPages.push({
            id: `page-${i}-${Date.now()}`,
            originalIndex: i - 1,
            thumbnailUrl: dataUrl
          });
        }
        if (isActive) setPages(newPages);
      } catch (err: any) {
        console.error("Preview generation error:", err);
        if (isActive) {
           setError("Failed to read PDF. It might be password protected or corrupted.");
        }
      } finally {
        if (isActive) setIsGeneratingPreviews(false);
      }
    };
    
    generate();
    
    return () => { isActive = false; };
  }, [file, ensurePdfJs]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    draggedItemIndex.current = index;
    e.currentTarget.style.opacity = '0.5';
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.parentNode as any);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    if (draggedItemIndex.current === null || draggedItemIndex.current === index) return;
    dragOverItemIndex.current = index;
    const newPages = [...pages];
    const draggedItemContent = newPages.splice(draggedItemIndex.current, 1)[0];
    newPages.splice(dragOverItemIndex.current, 0, draggedItemContent);
    draggedItemIndex.current = dragOverItemIndex.current;
    dragOverItemIndex.current = null;
    setPages(newPages);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.style.opacity = '1';
    draggedItemIndex.current = null;
    dragOverItemIndex.current = null;
  };

  const handleExport = async () => {
    if (!file || pages.length === 0) return;
    setIsProcessing(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const originalDoc = await PDFDocument.load(arrayBuffer);
      const newPdf = await PDFDocument.create();
      const pageIndicesToCopy = pages.map(p => p.originalIndex);
      const copiedPages = await newPdf.copyPages(originalDoc, pageIndicesToCopy);
      
      for (const copiedPage of copiedPages) {
         newPdf.addPage(copiedPage);
      }

      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      link.download = `${baseName}_organized.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError("Failed to export the organized PDF. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!file || file.type !== 'application/pdf') return null;

  return (
    <div className="w-full bg-[#121214] border border-white/5 flex flex-col gap-4 shadow-xl relative overflow-hidden p-6 mt-6 rounded-b-2xl">
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500/50 to-emerald-500/0 hidden md:block"></div>
      
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
         <div>
             <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-500" />
                Organize PDF Pages
             </h3>
             <p className="text-sm text-gray-400">
                Drag and drop the thumbnails to reorder your PDF pages.
             </p>
         </div>
         <button
            onClick={handleExport}
            disabled={isProcessing || isGeneratingPreviews || pages.length === 0}
            className={`
              py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shrink-0
              ${isProcessing || isGeneratingPreviews || pages.length === 0
                ? 'bg-emerald-600/50 text-white/80 cursor-not-allowed border-none'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_-5px_rgba(16,185,129,0.5)] border-emerald-400/20 active:scale-95'
              }
            `}
          >
            {isProcessing ? (
              <>
                 <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
                 Saving...
              </>
            ) : (
              <>
                 <Download className="w-5 h-5" />
                 Save Order
              </>
            )}
         </button>
      </div>

      <div className="mt-2 p-4 md:p-6 bg-black/20 border border-white/5 rounded-xl max-h-[500px] overflow-y-auto custom-scrollbar">
          {isGeneratingPreviews ? (
             <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                 <svg className="animate-spin mb-4 h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
                 <p className="font-medium text-sm">Slicing PDF into thumbnails...</p>
             </div>
          ) : pages.length > 0 ? (
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
               {pages.map((page, index) => (
                 <div
                   key={page.id}
                   draggable
                   onDragStart={(e) => handleDragStart(e, index)}
                   onDragEnter={(e) => handleDragEnter(e, index)}
                   onDragEnd={handleDragEnd}
                   onDragOver={(e) => e.preventDefault()}
                   className="group relative flex flex-col items-center cursor-grab active:cursor-grabbing"
                 >
                   <div className="w-full aspect-[1/1.414] bg-white rounded-lg overflow-hidden shadow-lg border-2 border-transparent hover:border-emerald-500 transition-colors duration-200 relative mb-2">
                     <img 
                       src={page.thumbnailUrl} 
                       alt={`Page ${page.originalIndex + 1}`}
                       className="w-full h-full object-cover pointer-events-none"
                     />
                     <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                       <Grip className="w-6 h-6 text-white drop-shadow-md" />
                     </div>
                   </div>
                   <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#18181A] text-gray-300 font-medium text-xs border border-white/10 group-hover:border-emerald-500/50 group-hover:text-emerald-400 transition-colors">
                     {index + 1}
                   </div>
                 </div>
               ))}
             </div>
          ) : (
             <div className="text-center py-12 text-gray-500 text-sm">No valid pages found.</div>
          )}
      </div>

    </div>
  );
}
