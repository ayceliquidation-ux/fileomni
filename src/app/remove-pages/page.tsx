"use client";

import { useState, useCallback, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import { 
  UploadCloud, 
  FileText, 
  Trash2,
  AlertCircle,
  Download,
  ArrowLeft,
  X,
  FileMinus
} from "lucide-react";
import Link from "next/link";

export default function RemovePagesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [deletedPages, setDeletedPages] = useState<Set<number>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [isGeneratingPreviews, setIsGeneratingPreviews] = useState(false);
  const [isPdfjsLoaded, setIsPdfjsLoaded] = useState(false);

  useEffect(() => {
    // Inject pdf.js CDN script to completely bypass Webpack Object.defineProperty bug
    if (document.getElementById("pdfjs-cdn")) {
      setIsPdfjsLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.id = "pdfjs-cdn";
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
      console.error("Failed to load pdf.js from CDN");
      setError("Failed to load PDF preview engine. Please check your internet connection.");
    };
    document.body.appendChild(script);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const generateThumbnails = async (pdfFile: File) => {
    setIsGeneratingPreviews(true);
    try {
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) throw new Error("PDF.js CDN library is not loaded");

      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;
      const urls: string[] = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.0 });
        
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        if (!ctx) continue;

        const TARGET_WIDTH = 400;
        const scale = TARGET_WIDTH / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        await page.render({
          canvasContext: ctx,
          viewport: scaledViewport,
        }).promise;

        urls.push(canvas.toDataURL("image/jpeg", 0.6));
      }

      setThumbnails(urls);
    } catch (err) {
      console.error("Error generating thumbnails:", err);
    } finally {
      setIsGeneratingPreviews(false);
    }
  };

  const loadPdfMetadata = async (pdfFile: File) => {
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      setTotalPages(pdfDoc.getPageCount());
      setError(null);
      
      if (isPdfjsLoaded) {
        generateThumbnails(pdfFile);
      } else {
        const checkInterval = setInterval(() => {
          if ((window as any).pdfjsLib) {
            clearInterval(checkInterval);
            generateThumbnails(pdfFile);
          }
        }, 500);
        setTimeout(() => clearInterval(checkInterval), 5000);
      }
    } catch (err) {
      console.error("Error loading PDF:", err);
      setError("Failed to read the PDF. Ensure it is a valid, uncorrupted PDF file.");
      setFile(null);
      setTotalPages(0);
      setThumbnails([]);
    }
  };

  const processFile = (newFile: File) => {
    setError(null);
    if (newFile.type !== 'application/pdf') {
      setError("Please only upload a valid PDF file.");
      return;
    }
    
    setFile(newFile);
    setDeletedPages(new Set()); // Reset selected pages for removal
    setThumbnails([]); // Clear old thumbnails
    loadPdfMetadata(newFile);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [isPdfjsLoaded]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
    e.target.value = '';
  };

  const removeFile = () => {
    setFile(null);
    setTotalPages(0);
    setDeletedPages(new Set());
    setThumbnails([]);
    setError(null);
  };

  const togglePageRemoval = (index: number) => {
    setDeletedPages(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        // Can't delete all pages
        if (next.size + 1 < totalPages) {
          next.add(index);
        }
      }
      return next;
    });
  };

  const applyRemoval = async () => {
    if (!file || deletedPages.size === 0) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const originalPdfDoc = await PDFDocument.load(arrayBuffer);
      
      const newPdfDoc = await PDFDocument.create();

      // Filter pages to only the ones we're keeping (not in deletedPages)
      const indicesToKeep = Array.from({ length: totalPages }, (_, i) => i)
        .filter(i => !deletedPages.has(i));

      const copiedPages = await newPdfDoc.copyPages(originalPdfDoc, indicesToKeep);
      copiedPages.forEach((p) => newPdfDoc.addPage(p));

      const newPdfBuffer = await newPdfDoc.save();
      
      const blob = new Blob([newPdfBuffer as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `removed_${file.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error("Error removing pages:", err);
      setError("An error occurred while removing pages. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col pt-6 pb-24 md:pb-12 bg-[#0A0A0B] text-white selection:bg-red-500/30">
      <header className="px-6 md:px-12 flex items-center justify-between mb-8 max-w-7xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Tools</span>
        </Link>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 flex flex-col items-center">
        <div className="mb-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
            <FileMinus className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-4xl font-black mb-4 tracking-tight">Remove Pages</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Visually select and delete specific pages from your PDF document instantly.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-sm w-full max-w-4xl">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="w-full flex flex-col lg:flex-row gap-8 items-start mb-16">
          {/* Left Column - 1/3 Upload and Controls */}
          <div className="w-full lg:w-1/3 flex flex-col gap-6 shrink-0">
            {!file ? (
              <label 
                className={`
                  relative flex flex-col items-center justify-center p-12
                  border-2 border-dashed rounded-2xl transition-all duration-200 cursor-pointer
                  ${isDragging 
                    ? 'border-red-500 bg-red-500/5' 
                    : 'border-white/10 bg-[#121214] hover:border-red-500/50 hover:bg-[#18181A]'
                  }
                `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input 
                  type="file" 
                  accept="application/pdf"
                  onChange={handleFileInput}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 text-red-500">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <p className="font-medium text-lg mb-2 text-center">Upload a PDF File</p>
                <p className="text-sm text-gray-500 text-center">Drag & drop or click</p>
              </label>
            ) : (
              <div className="flex flex-col gap-6 w-full">
                {/* File Info */}
                <div className="p-4 rounded-xl bg-[#121214] border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6 text-red-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white truncate text-sm" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {(file.size / 1024 / 1024).toFixed(2)} MB • {totalPages} pages
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={removeFile}
                    className="p-2 shrink-0 ml-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                    title="Remove file"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Configuration Controls */}
                <div className="p-6 rounded-2xl bg-[#121214] border border-white/5 flex flex-col gap-6">
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Removal Summary</h3>
                  
                  <div className="flex items-center justify-between p-4 rounded-xl bg-[#18181A] border border-white/5">
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-500 font-medium">Pages to Delete</span>
                        <span className="text-2xl font-black text-red-500 mt-1">{deletedPages.size}</span>
                    </div>
                     <div className="flex flex-col text-right">
                        <span className="text-xs text-gray-500 font-medium">Final Page Count</span>
                        <span className="text-2xl font-black text-white mt-1">{totalPages - deletedPages.size}</span>
                    </div>
                  </div>

                  <button
                    onClick={applyRemoval}
                    disabled={deletedPages.size === 0 || isProcessing}
                    className={`
                      w-full mt-2 py-4 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all text-lg
                      ${deletedPages.size === 0
                        ? 'bg-white/5 text-gray-500 cursor-not-allowed' 
                        : isProcessing 
                          ? 'bg-red-600 outline-none text-white opacity-80 cursor-wait'
                          : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:-translate-y-0.5'
                      }
                    `}
                  >
                    {isProcessing ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Trimming...
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        Remove Pages & Download
                      </>
                    )}
                  </button>
                   {deletedPages.size === 0 && (
                    <p className="text-xs text-gray-500 mt-1 text-center">
                      Click the trash icon on a page to mark it for removal.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - 2/3 Visual Previews Grid */}
          <div className="w-full lg:w-2/3 flex flex-col fade-in bg-[#121214] border border-white/5 rounded-2xl p-6 md:p-8 min-h-[400px]">
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold tracking-tight">Select Pages to Delete</h3>
                {deletedPages.size > 0 && (
                    <button 
                        onClick={() => setDeletedPages(new Set())}
                        className="text-xs text-gray-400 hover:text-white transition-colors underline underline-offset-4 decoration-white/20 hover:decoration-white/60"
                    >
                        Clear Selection
                    </button>
                )}
             </div>
            
            {!file ? (
              <div className="w-full flex-1 flex flex-col items-center justify-center text-gray-500">
                <FileText className="w-12 h-12 mb-4 opacity-50" />
                <p>Upload a PDF to view its pages here</p>
              </div>
            ) : isGeneratingPreviews && thumbnails.length === 0 ? (
              <div className="w-full flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-2xl bg-[#0A0A0B]">
                <svg className="animate-spin mb-4 h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-400 font-medium tracking-tight">Generating page thumbnails...</p>
              </div>
            ) : (
              <div className="w-full grid grid-cols-2 lg:grid-cols-3 gap-6">
                {thumbnails.map((url, i) => {
                    const isDeleted = deletedPages.has(i);
                    return (
                      <div key={i} className="flex flex-col gap-3 group relative cursor-pointer" onClick={() => togglePageRemoval(i)}>
                        <div className={`
                            relative aspect-[1/1.414] w-full rounded-xl overflow-hidden shadow-xl border flex items-center justify-center p-2 transition-all duration-200
                            ${isDeleted 
                                ? 'bg-red-500/20 border-red-500/50 opacity-50 outline outline-2 outline-offset-2 outline-red-500 scale-[0.98]' 
                                : 'bg-[#1A1A1E] border-white/5 group-hover:border-white/20'
                            }
                        `}>
                          <div className="bg-white rounded-md shadow-md w-full h-full flex items-center justify-center overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={url} 
                              alt={`Page ${i + 1}`} 
                              className="w-full h-full object-contain"
                            />
                          </div>

                          {/* Deleted Red Overlay Filter */}
                          {isDeleted && (
                              <div className="absolute inset-0 bg-red-500/30 flex items-center justify-center backdrop-blur-[1px]">
                                  <div className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center shadow-2xl">
                                      <Trash2 className="w-6 h-6" />
                                  </div>
                              </div>
                          )}

                          {/* Hover Trash Control (Only show if not already deleted) */}
                          {!isDeleted && (
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <div className="p-3 rounded-full bg-red-500/90 text-white transform translate-y-4 group-hover:translate-y-0 transition-all duration-200">
                                    <Trash2 className="w-5 h-5" />
                                </div>
                              </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between w-full px-1">
                            <span className={`text-xs font-medium transition-colors ${isDeleted ? 'text-red-500 line-through' : 'text-gray-500 group-hover:text-gray-300'}`}>
                                Page {i + 1}
                            </span>
                             {isDeleted && (
                                <span className="text-[10px] font-bold text-red-500 tracking-wider">REMOVED</span>
                            )}
                        </div>
                      </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
