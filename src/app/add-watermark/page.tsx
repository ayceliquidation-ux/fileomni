"use client";

import { useState, useCallback, useEffect } from "react";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import { 
  UploadCloud, 
  FileText, 
  Droplet,
  Type,
  Maximize,
  AlertCircle,
  Download,
  ArrowLeft,
  X
} from "lucide-react";
import Link from "next/link";

export default function AddWatermarkPage() {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [watermarkText, setWatermarkText] = useState<string>("CONFIDENTIAL");
  const [opacity, setOpacity] = useState<number>(0.5);
  const [fontSize, setFontSize] = useState<number>(60);
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

        // Overlay a visual approximation of the watermark for the preview ONLY
        // (Note: This is just a canvas approximation. pdf-lib handles the actual vector text downstream)
        if (watermarkText) {
          ctx.save();
          // Translate to center
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((-45 * Math.PI) / 180); // -45 degrees
          
          // Approximate the font scale for the thumbnail width
           const scaledFontSize = fontSize * scale;
          ctx.font = `bold ${scaledFontSize}px Helvetica, Arial, sans-serif`;
          ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(watermarkText, 0, 0);
          ctx.restore();
        }

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
    setThumbnails([]); // Clear old thumbnails
    loadPdfMetadata(newFile);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [isPdfjsLoaded, watermarkText, opacity, fontSize]);

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

  // Re-run thumbnail generation when watermark settings change, if a file is loaded.
  // We use a small debounce so dragging sliders doesn't stutter the UI.
  useEffect(() => {
    if (file && isPdfjsLoaded) {
      const delay = setTimeout(() => {
        generateThumbnails(file);
      }, 300);
      return () => clearTimeout(delay);
    }
  }, [watermarkText, opacity, fontSize]);

  const applyWatermark = async () => {
    if (!file || !watermarkText) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const pages = pdfDoc.getPages();

      for (const page of pages) {
        const { width, height } = page.getSize();
        
        // Measure text width to perfectly center it diagonally
        const textWidth = helveticaFont.widthOfTextAtSize(watermarkText, fontSize);
        const textHeight = helveticaFont.heightAtSize(fontSize);

        page.drawText(watermarkText, {
          x: width / 2 - (textWidth / 2) * Math.cos(-Math.PI / 4) + (textHeight / 2) * Math.sin(-Math.PI / 4),
          y: height / 2 - (textWidth / 2) * Math.sin(-Math.PI / 4) - (textHeight / 2) * Math.cos(-Math.PI / 4),
          size: fontSize,
          font: helveticaFont,
          color: rgb(0, 0, 0),
          opacity: opacity,
          rotate: degrees(-45),
        });
      }

      const newPdfBuffer = await pdfDoc.save();
      
      // Trigger download using the slice workaround to bypass TS SharedArrayBuffer issues
      const blob = new Blob([newPdfBuffer as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `watermarked_${file.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error("Error applying watermark:", err);
      setError("An error occurred while stamping the PDF. Please try again.");
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
            <Type className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-4xl font-black mb-4 tracking-tight">Add Watermark</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Stamp custom text diagonally across your PDF pages. Fast, secure, and processed completely locally.
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

                {/* Configuration Controls */}
                <div className="p-6 rounded-2xl bg-[#121214] border border-white/5 flex flex-col gap-6">
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Stamp Settings</h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                            <Type className="w-4 h-4 text-amber-500" />
                            Watermark Text
                        </label>
                        <input
                            type="text"
                            value={watermarkText}
                            onChange={(e) => setWatermarkText(e.target.value)}
                            placeholder="e.g. DRAFT"
                            className="w-full bg-[#18181A] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                        />
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/5">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                    <Droplet className="w-4 h-4 text-amber-500" />
                                    Opacity
                                </label>
                                <span className="text-xs font-mono text-gray-500">{Math.round(opacity * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0.1"
                                max="1.0"
                                step="0.05"
                                value={opacity}
                                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                                className="w-full accent-amber-500"
                            />
                        </div>

                        <div className="space-y-2">
                             <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                    <Maximize className="w-4 h-4 text-amber-500" />
                                    Font Size
                                </label>
                                <span className="text-xs font-mono text-gray-500">{fontSize}px</span>
                            </div>
                            <input
                                type="range"
                                min="24"
                                max="120"
                                step="2"
                                value={fontSize}
                                onChange={(e) => setFontSize(parseInt(e.target.value))}
                                className="w-full accent-amber-500"
                            />
                        </div>
                    </div>
                  </div>

                  <button
                    onClick={applyWatermark}
                    disabled={!watermarkText || isProcessing}
                    className={`
                      w-full mt-4 py-4 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all text-lg
                      ${!watermarkText
                        ? 'bg-white/5 text-gray-500 cursor-not-allowed' 
                        : isProcessing 
                          ? 'bg-amber-600 outline-none text-white opacity-80 cursor-wait'
                          : 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:-translate-y-0.5'
                      }
                    `}
                  >
                    {isProcessing ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Stamping...
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        Add Watermark
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
                {file && (
                     <p className="text-xs text-amber-500/70 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 truncate max-w-[200px]">
                        "{watermarkText}"
                     </p>
                )}
             </div>
            
            {!file ? (
              <div className="w-full flex-1 flex flex-col items-center justify-center text-gray-500">
                <FileText className="w-12 h-12 mb-4 opacity-50" />
                <p>Upload a PDF to see the watermark preview here</p>
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
                    <span className="text-xs font-medium text-gray-500 text-center">Page {i + 1}</span>
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
