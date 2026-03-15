"use client";

import { useState, useCallback, useEffect } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import { 
  UploadCloud, 
  FileText, 
  RefreshCw,
  RotateCw,
  RotateCcw,
  AlertCircle,
  Download,
  ArrowLeft,
  X
} from "lucide-react";
import Link from "next/link";

export default function RotatePdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [pageRotations, setPageRotations] = useState<number[]>([]);
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

      // Render all pages to canvases and get data URLs
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        // Default scale for thumbnails
        const viewport = page.getViewport({ scale: 1.0 });
        
        // We use an offscreen canvas to render
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        if (!ctx) continue;

        // Scale down large PDFs for preview thumbnails
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
      // We don't block the actual rotate tool if previews fail, but we'll show no images.
    } finally {
      setIsGeneratingPreviews(false);
    }
  };

  const loadPdfMetadata = async (pdfFile: File) => {
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pagesCount = pdfDoc.getPageCount();
      
      setTotalPages(pagesCount);
      setPageRotations(Array(pagesCount).fill(0));
      setError(null);
      
      // Kick off thumbnail generation asynchronously
      if (isPdfjsLoaded) {
        generateThumbnails(pdfFile);
      } else {
        // Poll briefly if it hasn't loaded yet
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
    setPageRotations([]); // Reset rotation array for new file
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
    setPageRotations([]);
    setThumbnails([]);
    setError(null);
  };

  const rotateClockwise = (index?: number) => {
    setPageRotations(prev => {
      if (index !== undefined) {
        // Rotate specific page
        const next = [...prev];
        next[index] = (next[index] + 90) % 360;
        return next;
      }
      // Global rotate
      return prev.map(r => (r + 90) % 360);
    });
  };

  const rotateCounterClockwise = (index?: number) => {
    setPageRotations(prev => {
      if (index !== undefined) {
        // Rotate specific page
        const next = [...prev];
        next[index] = (next[index] - 90 + 360) % 360;
        return next;
      }
      // Global rotate
      return prev.map(r => (r - 90 + 360) % 360);
    });
  };

  const applyRotation = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      const pages = pdfDoc.getPages();
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const addedRotation = pageRotations[i] || 0;
        
        // Add the new individual rotation to whatever the existing rotation is
        if (addedRotation !== 0) {
          const existingRotation = page.getRotation().angle;
          page.setRotation(degrees((existingRotation + addedRotation) % 360));
        }
      }

      const newPdfBuffer = await pdfDoc.save();
      
      // Trigger download using the slice workaround to bypass TS SharedArrayBuffer issues
      const blob = new Blob([newPdfBuffer as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rotated_${file.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error("Error rotating PDF:", err);
      setError("An error occurred while rotating the PDF. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col pt-6 pb-24 md:pb-12 bg-[#0A0A0B] text-white selection:bg-amber-500/30">
      <header className="px-6 md:px-12 flex items-center justify-between mb-8 max-w-7xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Tools</span>
        </Link>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 flex flex-col items-center">
        <div className="mb-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
            <RefreshCw className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-4xl font-black mb-4 tracking-tight">Rotate PDF</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Apply a rotation to all pages in your PDF document instantly. Processed completely locally in your browser.
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
                    ? 'border-amber-500 bg-amber-500/5' 
                    : 'border-white/10 bg-[#121214] hover:border-amber-500/50 hover:bg-[#18181A]'
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
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 text-amber-500">
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
                    <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6 text-amber-500" />
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

                {/* Global Rotation Controls */}
                <div className="p-6 rounded-2xl bg-[#121214] border border-white/5 flex flex-col items-center">
                  <h3 className="text-sm font-medium text-gray-400 mb-6 uppercase tracking-wider">Rotate All Pages</h3>
                  
                  <div className="flex items-center gap-6 mb-8">
                    <button 
                      onClick={() => rotateCounterClockwise()}
                      className="p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-amber-500/50 transition-all group"
                      title="Rotate All Counter-Clockwise"
                    >
                      <RotateCcw className="w-5 h-5 text-gray-400 group-hover:text-amber-400 transition-colors" />
                    </button>

                    <div className="flex flex-col items-center justify-center w-20 h-20 rounded-2xl bg-[#18181A] border border-white/10 shadow-inner">
                      <RotateCw className="w-8 h-8 text-amber-500" />
                      <span className="text-xs font-mono text-gray-500 mt-2 absolute bottom-2">ALL</span>
                    </div>

                    <button 
                      onClick={() => rotateClockwise()}
                      className="p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-amber-500/50 transition-all group"
                      title="Rotate All Clockwise"
                    >
                      <RotateCw className="w-5 h-5 text-gray-400 group-hover:text-amber-400 transition-colors" />
                    </button>
                  </div>

                  <button
                    onClick={applyRotation}
                    disabled={pageRotations.every(r => r === 0) || isProcessing}
                    className={`
                      w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all
                      ${pageRotations.every(r => r === 0) 
                        ? 'bg-white/5 text-gray-500 cursor-not-allowed' 
                        : isProcessing 
                          ? 'bg-amber-600 outline-none text-white opacity-80 cursor-wait'
                          : 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:-translate-y-0.5'
                      }
                    `}
                  >
                    {isProcessing ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Applying...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Download
                      </>
                    )}
                  </button>
                  {pageRotations.every(r => r === 0) && (
                    <p className="text-xs text-gray-500 mt-3 text-center">
                      Rotate one or more pages to enable download.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - 2/3 Visual Previews Grid */}
          <div className="w-full lg:w-2/3 flex flex-col fade-in bg-[#121214] border border-white/5 rounded-2xl p-6 md:p-8 min-h-[400px]">
            <h3 className="text-lg font-bold mb-6 tracking-tight">Visual Preview</h3>
            
            {!file ? (
              <div className="w-full flex-1 flex flex-col items-center justify-center text-gray-500">
                <FileText className="w-12 h-12 mb-4 opacity-50" />
                <p>Upload a PDF to preview pages here</p>
              </div>
            ) : isGeneratingPreviews && thumbnails.length === 0 ? (
              <div className="w-full flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-2xl bg-[#0A0A0B]">
                <svg className="animate-spin mb-4 h-8 w-8 text-amber-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-400 font-medium tracking-tight">Generating page thumbnails...</p>
              </div>
            ) : (
              <div className="w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {thumbnails.map((url, i) => (
                  <div key={i} className="flex flex-col gap-3 group relative">
                    <div className="relative aspect-[1/1.414] w-full rounded-xl bg-[#1A1A1E] overflow-hidden shadow-xl border border-white/5 flex items-center justify-center p-2 group-hover:border-white/20 transition-colors">
                      <div className="bg-white rounded-md shadow-md w-full h-full flex items-center justify-center overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={url} 
                          alt={`Page ${i + 1}`} 
                          className="max-w-full max-h-full object-contain transition-transform duration-300 ease-out"
                          style={{ transform: `rotate(${pageRotations[i] || 0}deg)` }}
                        />
                      </div>
                      
                      {/* Overlay Individual Rotate Control */}
                      <button 
                        onClick={() => rotateClockwise(i)}
                        className="absolute right-2 top-2 p-2 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-amber-600 hover:border-amber-500"
                        title="Rotate Page Clockwise"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-center gap-2">
                        <span className="text-xs font-medium text-gray-500">Page {i + 1}</span>
                        {pageRotations[i] !== 0 && (
                          <span className="text-[10px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded-sm font-mono border border-amber-500/20">
                            {pageRotations[i]}°
                          </span>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
