"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import { 
  UploadCloud, 
  FileText, 
  AlertCircle,
  Download,
  ArrowLeft,
  X,
  Layers,
  Grip
} from "lucide-react";
import Link from "next/link";

interface PdfPage {
  id: string; // Unique ID for React key
  originalIndex: number;
  thumbnailUrl: string;
}

export default function OrganizePdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PdfPage[]>([]);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingPreviews, setIsGeneratingPreviews] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPdfjsLoaded, setIsPdfjsLoaded] = useState(false);

  // Drag and drop state for reordering
  const draggedItemIndex = useRef<number | null>(null);
  const dragOverItemIndex = useRef<number | null>(null);

  useEffect(() => {
    // Inject pdf.js CDN
    if (document.getElementById("pdfjs-cdn-organize")) {
      setIsPdfjsLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.id = "pdfjs-cdn-organize";
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.async = true;
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      if (pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        setIsPdfjsLoaded(true);
      }
    };
    script.onerror = () => {
      setError("Failed to load PDF engine. Please check your internet connection.");
    };
    document.body.appendChild(script);
  }, []);

  const handleDragOverFile = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeaveFile = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = async (newFile: File) => {
    setError(null);
    if (newFile.type !== 'application/pdf') {
      setError("Please only upload a valid PDF file.");
      return;
    }
    setFile(newFile);
    await generatePreviews(newFile);
  };

  const handleDropFile = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
    e.target.value = '';
  };

  const generatePreviews = async (pdfFile: File) => {
    if (!isPdfjsLoaded) {
      setError("PDF engine is still loading. Please try again in a moment.");
      setFile(null);
      return;
    }

    setIsGeneratingPreviews(true);
    setPages([]);
    
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfjsLib = (window as any).pdfjsLib;
      
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
      const pdf = await loadingTask.promise;
      
      const newPages: PdfPage[] = [];
      const numPages = pdf.numPages;

      // We explicitly render every page so the user can drag them.
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        // Smaller scale since we just need thumbnails for a grid
        const viewport = page.getViewport({ scale: 0.5 }); 
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        await page.render({
          canvasContext: ctx,
          viewport: viewport
        }).promise;
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        newPages.push({
          id: `page-${i}-${Date.now()}`,
          originalIndex: i - 1, // 0-indexed for pdf-lib copyPages
          thumbnailUrl: dataUrl
        });
      }

      setPages(newPages);
    } catch (err: any) {
      console.error("Error generating previews:", err);
      if (err.name === 'PasswordException') {
        setError("This PDF is password protected. Please use the Unlock PDF tool first.");
      } else {
        setError("Failed to read PDF. The file might be corrupted.");
      }
      setFile(null);
    } finally {
      setIsGeneratingPreviews(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setPages([]);
    setError(null);
  };

  // --- Drag and Drop Handlers for Reordering ---

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    draggedItemIndex.current = index;
    // Set a slight opacity to the original item being dragged for visual feedback
    e.currentTarget.style.opacity = '0.5';
    // Firefox requires setting data in dataTransfer to enable drag
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.parentNode as any);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    if (draggedItemIndex.current === null) return;
    if (draggedItemIndex.current === index) return;
    
    dragOverItemIndex.current = index;
    
    // Create a copy to mutate
    const newPages = [...pages];
    
    // Pull the dragged item out of the array
    const draggedItemContent = newPages.splice(draggedItemIndex.current, 1)[0];
    
    // Splice it back into the new position
    newPages.splice(dragOverItemIndex.current, 0, draggedItemContent);
    
    // Update state to trigger reflow instantly
    draggedItemIndex.current = dragOverItemIndex.current;
    dragOverItemIndex.current = null;
    
    setPages(newPages);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.style.opacity = '1';
    draggedItemIndex.current = null;
    dragOverItemIndex.current = null;
  };

  const handleDragOverItem = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  // --- Export ---

  const handleExport = async () => {
    if (!file || pages.length === 0) return;
    setIsProcessing(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      // Load the original PDF
      const originalDoc = await PDFDocument.load(arrayBuffer);
      
      // Create a brand new, empty PDF
      const newPdf = await PDFDocument.create();

      // Extract the requested page indices in the custom array order
      const pageIndicesToCopy = pages.map(p => p.originalIndex);
      
      // Copy the pages mathematically in the new order
      const copiedPages = await newPdf.copyPages(originalDoc, pageIndicesToCopy);
      
      // Add them explicitly to the new document
      for (const copiedPage of copiedPages) {
         newPdf.addPage(copiedPage);
      }

      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      // Extract original filename without extension to append _organized
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      link.download = `${baseName}_organized.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Error organizing PDF:", err);
      setError("Failed to export the organized PDF. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col pt-6 pb-24 md:pb-12 bg-[#0A0A0B] text-white selection:bg-rose-500/30">
      <header className="px-6 md:px-12 flex items-center justify-between mb-8 max-w-5xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Tools</span>
        </Link>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 flex flex-col items-center">
        <div className="mb-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-6">
            <Layers className="w-8 h-8 text-rose-500" />
          </div>
          <h1 className="text-4xl font-black mb-4 tracking-tight">Organize PDF</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Visually drag and drop thumbnails to reorder your PDF pages. Fast, secure, and 100% offline.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-sm w-full max-w-3xl">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="flex-1">{error}</p>
          </div>
        )}

        <div className="w-full max-w-4xl flex flex-col gap-6 items-center mb-16">
          {!file ? (
            <label 
              className={`
                relative flex flex-col items-center justify-center p-12 w-full max-w-2xl mx-auto
                border-2 border-dashed rounded-2xl transition-all duration-200 cursor-pointer
                ${isDragging 
                  ? 'border-rose-500 bg-rose-500/5' 
                  : 'border-white/10 bg-[#121214] hover:border-rose-500/50 hover:bg-[#18181A]'
                }
              `}
              onDragOver={handleDragOverFile}
              onDragLeave={handleDragLeaveFile}
              onDrop={handleDropFile}
            >
              <input 
                type="file" 
                accept="application/pdf"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="Upload PDF"
              />
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 text-rose-500">
                <UploadCloud className="w-8 h-8" />
              </div>
              <p className="font-medium text-lg mb-2 text-center">Upload PDF</p>
              <p className="text-sm text-gray-500 text-center">Drag & drop or click</p>
            </label>
          ) : (
            <div className="w-full flex flex-col gap-6 fade-in">
              {/* File Info & Action Bar */}
              <div className="p-4 rounded-xl bg-[#121214] border border-white/5 flex flex-col sm:flex-row items-center justify-between shadow-xl gap-4 sticky top-4 z-10">
                <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">
                  <div className="w-12 h-12 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6 text-rose-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white truncate text-sm" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {pages.length} Pages • {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={removeFile}
                    disabled={isProcessing || isGeneratingPreviews}
                    className="p-3 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors shrink-0 disabled:opacity-50"
                    title="Cancel"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleExport}
                    disabled={isProcessing || isGeneratingPreviews || pages.length === 0}
                    className={`
                      flex-1 sm:flex-none py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-all
                      ${isProcessing || isGeneratingPreviews || pages.length === 0
                        ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                        : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40 hover:-translate-y-0.5'
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
                        Save & Download
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Grid Workspace */}
              <div className="w-full bg-[#121214] border border-white/5 rounded-2xl p-6 md:p-8 shadow-2xl min-h-[400px]">
                {isGeneratingPreviews ? (
                  <div className="flex flex-col items-center justify-center h-full py-20 text-gray-400">
                     <svg className="animate-spin mb-4 h-10 w-10 text-rose-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                     <p className="font-medium">Slicing PDF into thumbnails...</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-6 bg-black/20 p-3 rounded-xl border border-white/5 inline-flex w-fit">
                      <Grip className="w-4 h-4 text-rose-500" />
                      <p>Drag and drop the thumbnails below to rearrange the pages.</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                      {pages.map((page, index) => (
                        <div
                          key={page.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragEnter={(e) => handleDragEnter(e, index)}
                          onDragEnd={handleDragEnd}
                          onDragOver={handleDragOverItem}
                          className="group relative flex flex-col items-center cursor-grab active:cursor-grabbing"
                        >
                          <div className="w-full aspect-[1/1.414] bg-white rounded-lg overflow-hidden shadow-lg border-2 border-transparent hover:border-rose-500 transition-colors duration-200 relative mb-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={page.thumbnailUrl} 
                              alt={`Page ${page.originalIndex + 1}`}
                              className="w-full h-full object-cover pointer-events-none"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                              <Grip className="w-8 h-8 text-white drop-shadow-md" />
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#18181A] text-gray-300 font-medium text-xs border border-white/10 group-hover:border-rose-500/50 group-hover:text-rose-400 transition-colors">
                            {index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
