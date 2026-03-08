"use client";

import { useState, useRef, useEffect } from "react";
import { FileUp, FileDown, RefreshCw, Layers } from "lucide-react";
import JSZip from "jszip";

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

interface ConvertedPage {
  pageNumber: number;
  dataUrl: string;
}

export default function PdfToJpg() {
  const [pdfjs, setPdfjs] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<ConvertedPage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  useEffect(() => {
    if (window.pdfjsLib) {
      setPdfjs(window.pdfjsLib);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.async = true;

    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        setPdfjs(window.pdfjsLib);
      }
    };

    script.onerror = () => {
      console.error("Failed to load PDF.js script");
      setError("Failed to load PDF engine.");
    };

    document.body.appendChild(script);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    
    // reset logic
    setFile(selected);
    setPages([]);
    setError(null);
    setProgress({ current: 0, total: 0 });
    
    await processPdf(selected);
  };

  const processPdf = async (pdfFile: File) => {
    if (!pdfjs) {
      setError("PDF engine is still loading. Please try again in a moment.");
      return;
    }

    setIsProcessing(true);
    const convertedPages: ConvertedPage[] = [];

    try {
      // 1. Convert to ArrayBuffer
      const arrayBuffer = await pdfFile.arrayBuffer();

      // 2. Initialize PDF.js payload parser
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdfDoc = await loadingTask.promise;
      
      const totalPages = pdfDoc.numPages;
      setProgress({ current: 0, total: totalPages });

      // 3. Systematically drain page pixels synchronously into an invisible canvas payload string
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        
        // Use a scale of 2.0 or 3.0 for ultra high-res text extraction
        const viewport = page.getViewport({ scale: 2.0 });
        
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        if (!ctx) throw new Error("Could not initialize 2D context.");
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Draw white background (PDFs are often transparent by default)
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        // Note: The @types/pdfjs-dist interface is occasionally out of sync with the runtime CDN worker parameters.
        // We ts-ignore the RenderParameters to bypass structural mismatch while retaining true API compatibility
        // @ts-ignore
        await page.render(renderContext).promise;

        // Export directly to compressed standard jpeg Base64 payload architecture
        const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
        
        convertedPages.push({
          pageNumber: pageNum,
          dataUrl
        });

        // 4. Tick progress
        setProgress({ current: pageNum, total: totalPages });
      }

      setPages(convertedPages);
    } catch (err: any) {
       console.error("PDF Parsing Error:", err);
       setError(err.message || "Failed to parse PDF document. Ensure it isn't completely corrupted or malformed.");
    } finally {
       setIsProcessing(false);
    }
  };

  const downloadSinglePage = (page: ConvertedPage) => {
    const a = document.createElement("a");
    a.href = page.dataUrl;
    // Strip original PDF extension and append discrete page identifier
    const baseName = file?.name.replace(/\.pdf$/i, "") || "document";
    a.download = `${baseName}_page_${page.pageNumber}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadAllAsZip = async () => {
    if (pages.length === 0 || !file) return;
    
    try {
       setIsZipping(true);
       const zip = new JSZip();
       const baseName = file.name.replace(/\.pdf$/i, "");
       const folderName = `${baseName}_images`;

       pages.forEach((page) => {
          // JSZip requires base64 string stripped of the generic MIME header prefix
          const base64Data = page.dataUrl.replace(/^data:image\/(png|jpeg);base64,/, "");
          const fileName = `${folderName}/${baseName}_page_${page.pageNumber}.jpg`;
          zip.file(fileName, base64Data, { base64: true });
       });

       const compiledZip = await zip.generateAsync({ type: "blob" });
       const downloadUrl = URL.createObjectURL(compiledZip);

       const a = document.createElement("a");
       a.href = downloadUrl;
       a.download = `${folderName}.zip`;
       document.body.appendChild(a);
       a.click();
       document.body.removeChild(a);
       URL.revokeObjectURL(downloadUrl);
       
    } catch (err) {
       console.error("ZIP Architecture Error:", err);
       setError("The offline compression archiver failed. Please download images organically individually.");
    } finally {
       setIsZipping(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-2xl font-bold">PDF to JPG Extractor</h2>
        <p className="text-gray-400">Instantly convert secure, multi-page PDFs directly into high-fidelity JPEGs without leaving your browser</p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 text-sm">
          {error}
        </div>
      )}

      {/* Primary Upload Input */}
      {!file && (
        <label className="relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-white/20 rounded-3xl bg-[#121214] hover:bg-white/[0.02] hover:border-emerald-500/50 transition-all cursor-pointer group active:scale-[0.98]">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
               <FileUp className="w-8 h-8 text-gray-400 group-hover:text-emerald-400 transition-colors" />
            </div>
            <p className="mb-2 text-lg font-bold text-white">Drop PDF document here</p>
            <p className="text-sm text-gray-500 mb-4 font-mono">Accepts strictly secure .pdf files</p>
            <div className="px-6 py-2 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium border border-emerald-500/20 shadow-md shadow-emerald-500/10 truncate max-w-full">
              {pdfjs ? "Browse Files" : "Loading Engine..."}
            </div>
          </div>
          <input 
            type="file" 
            className="hidden" 
            accept="application/pdf"
            onChange={handleFileChange}
            disabled={isProcessing || !pdfjs}
          />
        </label>
      )}

      {/* Progress Architecture Feedback UI */}
      {isProcessing && (
         <div className="p-8 md:p-12 bg-[#121214] border border-white/5 rounded-3xl flex flex-col items-center justify-center space-y-6">
            <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
            <div className="text-center space-y-2">
               <h3 className="text-xl font-bold">Ripping Document Architecture</h3>
               <p className="text-gray-400 font-mono">
                  Extracting Page {progress.current} of {progress.total}
               </p>
            </div>
            <div className="w-full max-w-sm h-2 bg-white/10 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-blue-500 transition-all duration-300 rounded-full"
                 style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
               />
            </div>
         </div>
      )}

      {/* Extracted Images UI Matrix */}
      {!isProcessing && pages.length > 0 && (
         <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-[#121214] border border-white/5 rounded-2xl">
               <div className="space-y-1">
                  <h3 className="font-bold text-lg text-white max-w-[250px] md:max-w-md truncate">{file?.name}</h3>
                  <p className="text-gray-400 text-sm flex items-center gap-2">
                     <Layers className="w-4 h-4" /> {pages.length} Pages Extracted
                  </p>
               </div>
               
               <div className="flex gap-2">
                  <button 
                     onClick={() => { setFile(null); setPages([]); }}
                     className="px-4 py-2 bg-[#18181A] text-white font-medium rounded-xl hover:bg-white/5 active:scale-95 transition-all text-sm border border-white/5"
                  >
                     Clear Source
                  </button>
                  {pages.length > 1 && (
                     <button
                       onClick={downloadAllAsZip}
                       disabled={isZipping}
                       className="px-4 py-2 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-600 active:scale-95 transition-all text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                       {isZipping ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                       {isZipping ? "Compressing Archive..." : "Download ZIP"}
                     </button>
                  )}
               </div>
            </div>

            {/* Matrix Data Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
               {pages.map((page) => (
                  <div key={page.pageNumber} className="group relative bg-[#121214] border border-white/5 rounded-2xl overflow-hidden active:scale-[0.98] transition-all">
                     <div className="relative aspect-[3/4] w-full bg-white border-b border-white/5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                           src={page.dataUrl} 
                           alt={`Page ${page.pageNumber}`} 
                           className="w-full h-full object-contain p-2"
                        />
                     </div>
                     <div className="p-4 flex flex-col gap-3">
                        <span className="text-sm font-medium text-gray-400 text-center">
                           Page {page.pageNumber}
                        </span>
                        <button 
                           onClick={() => downloadSinglePage(page)}
                           className="w-full py-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500 min-h-[40px] hover:text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 border border-blue-500/20 max-w-[120px] mx-auto"
                        >
                           <FileDown className="w-4 h-4" /> Save
                        </button>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      )}

    </div>
  );
}
