"use client";

import { useState, useCallback, useEffect } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { 
  UploadCloud, 
  FileText, 
  AlertCircle,
  Download,
  ArrowLeft,
  X,
  Hash,
  AlignEndHorizontal,
  AlignVerticalJustifyCenter,
  AlignStartHorizontal
} from "lucide-react";
import Link from "next/link";

type Position = "bottom-left" | "bottom-center" | "bottom-right";

export default function AddPageNumbersPage() {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [position, setPosition] = useState<Position>("bottom-center");
  const [startNumber, setStartNumber] = useState<number>(1);
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

        // Overlay visual proxy for page number
        const text = String(startNumber + i - 1);
        ctx.save();
        
        // Use a relative font size scaled to the thumbnail width
        const fontSize = Math.max(14, 12 * scale);
        ctx.font = `${fontSize}px Helvetica, Arial, sans-serif`;
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        
        // Standardize Y padding to relative bottom
        const yPadding = 20 * scale;
        const xPadding = 20 * scale;
        const textMetrics = ctx.measureText(text);
        
        let x = 0;
        const y = canvas.height - yPadding;

        if (position === "bottom-left") {
            x = xPadding;
            ctx.textAlign = "left";
        } else if (position === "bottom-center") {
            x = canvas.width / 2;
             ctx.textAlign = "center";
        } else if (position === "bottom-right") {
            x = canvas.width - xPadding;
            ctx.textAlign = "right";
        }

        ctx.textBaseline = "middle";
        ctx.fillText(text, x, y);
        ctx.restore();

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
    setThumbnails([]); // Clear old thumbnails
    loadPdfMetadata(newFile);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [isPdfjsLoaded, position, startNumber]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
    e.target.value = '';
  };

  const removeFile = () => {
    setFile(null);
    setTotalPages(0);
    setThumbnails([]);
    setError(null);
  };

  // Debounced Re-generation on setting changes
  useEffect(() => {
      if (file && isPdfjsLoaded) {
          const delay = setTimeout(() => {
              generateThumbnails(file);
          }, 400);
          return () => clearTimeout(delay);
      }
  }, [position, startNumber]);

  const applyPageNumbers = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

      const pages = pdfDoc.getPages();
      const FONT_SIZE = 12;
      const Y_MARGIN = 30;
      const X_MARGIN = 30;

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const { width } = page.getSize();
        
        const textToDraw = String(startNumber + i);
        const textWidth = helveticaFont.widthOfTextAtSize(textToDraw, FONT_SIZE);

        let x = 0;
        if (position === "bottom-left") {
            x = X_MARGIN;
        } else if (position === "bottom-center") {
            x = (width / 2) - (textWidth / 2);
        } else if (position === "bottom-right") {
            x = width - X_MARGIN - textWidth;
        }

        page.drawText(textToDraw, {
          x: x,
          y: Y_MARGIN,
          size: FONT_SIZE,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });
      }

      const newPdfBuffer = await pdfDoc.save();
      
      const blob = new Blob([newPdfBuffer as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `numbered_${file.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error("Error applying page numbers:", err);
      setError("An error occurred while stamping the page numbers. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col pt-6 pb-24 md:pb-12 bg-[#0A0A0B] text-white selection:bg-purple-500/30">
      <header className="px-6 md:px-12 flex items-center justify-between mb-8 max-w-7xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Tools</span>
        </Link>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 flex flex-col items-center">
        <div className="mb-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-6">
            <Hash className="w-8 h-8 text-purple-500" />
          </div>
          <h1 className="text-4xl font-black mb-4 tracking-tight">Add Page Numbers</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Insert sequential page numbers into your PDF with customizable formatting.
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
                    ? 'border-purple-500 bg-purple-500/5' 
                    : 'border-white/10 bg-[#121214] hover:border-purple-500/50 hover:bg-[#18181A]'
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
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 text-purple-500">
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
                    <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6 text-purple-500" />
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
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Numbering Format</h3>
                  
                  <div className="space-y-5">
                     <div className="space-y-2">
                         <label className="text-sm font-medium text-gray-300">Position</label>
                         <div className="grid grid-cols-3 gap-2">
                             <button
                                 onClick={() => setPosition("bottom-left")}
                                 className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${position === 'bottom-left' ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-[#18181A] border-white/5 text-gray-400 hover:bg-white/5'}`}
                             >
                                 <AlignStartHorizontal className="w-4 h-4" />
                                 <span className="text-[10px] font-medium uppercase tracking-wider">Left</span>
                             </button>
                              <button
                                 onClick={() => setPosition("bottom-center")}
                                 className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${position === 'bottom-center' ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-[#18181A] border-white/5 text-gray-400 hover:bg-white/5'}`}
                             >
                                 <AlignVerticalJustifyCenter className="w-4 h-4 rotate-90" />
                                 <span className="text-[10px] font-medium uppercase tracking-wider">Center</span>
                             </button>
                             <button
                                 onClick={() => setPosition("bottom-right")}
                                 className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${position === 'bottom-right' ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-[#18181A] border-white/5 text-gray-400 hover:bg-white/5'}`}
                             >
                                 <AlignEndHorizontal className="w-4 h-4" />
                                 <span className="text-[10px] font-medium uppercase tracking-wider">Right</span>
                             </button>
                         </div>
                     </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Starting Number</label>
                        <input
                            type="number"
                            min="1"
                            value={startNumber}
                            onChange={(e) => setStartNumber(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full bg-[#18181A] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors font-mono"
                        />
                    </div>
                  </div>

                  <button
                    onClick={applyPageNumbers}
                    disabled={isProcessing}
                    className={`
                      w-full mt-4 py-4 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all text-lg
                      ${isProcessing 
                          ? 'bg-purple-600 outline-none text-white opacity-80 cursor-wait'
                          : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:-translate-y-0.5'
                      }
                    `}
                  >
                    {isProcessing ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Numbering...
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        Add Numbers & Download
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - 2/3 Visual Previews Grid */}
          <div className="w-full lg:w-2/3 flex flex-col fade-in bg-[#121214] border border-white/5 rounded-2xl p-6 md:p-8 min-h-[400px]">
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold tracking-tight">Visual Preview</h3>
             </div>
            
            {!file ? (
              <div className="w-full flex-1 flex flex-col items-center justify-center text-gray-500">
                <FileText className="w-12 h-12 mb-4 opacity-50" />
                <p>Upload a PDF to see the numbered preview here</p>
              </div>
            ) : isGeneratingPreviews && thumbnails.length === 0 ? (
              <div className="w-full flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-2xl bg-[#0A0A0B]">
                <svg className="animate-spin mb-4 h-8 w-8 text-purple-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-400 font-medium tracking-tight">Generating page thumbnails...</p>
              </div>
            ) : (
              <div className="w-full grid grid-cols-2 lg:grid-cols-3 gap-6">
                {thumbnails.map((url, i) => (
                  <div key={i} className="flex flex-col gap-3 group">
                    <div className="relative aspect-[1/1.414] w-full rounded-xl bg-[#1A1A1E] overflow-hidden shadow-xl border border-white/5 flex items-center justify-center p-2">
                       <div className="bg-white rounded-md shadow-md w-full h-full flex items-center justify-center overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={url} 
                          alt={`Page ${i + 1}`} 
                          className="w-full h-full object-contain"
                        />
                       </div>
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
