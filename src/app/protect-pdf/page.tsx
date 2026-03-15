"use client";

import { useState, useCallback, useEffect } from "react";
import { encryptPDF } from "@pdfsmaller/pdf-encrypt-lite";
import { 
  UploadCloud, 
  FileText, 
  AlertCircle,
  Download,
  ArrowLeft,
  X,
  Lock,
  KeyRound,
  ShieldCheck,
  EyeOff
} from "lucide-react";
import Link from "next/link";

export default function ProtectPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [isGeneratingPreviews, setIsGeneratingPreviews] = useState(false);
  const [isPdfjsLoaded, setIsPdfjsLoaded] = useState(false);

  useEffect(() => {
    // Inject pdf.js CDN script to bypass Webpack issues
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

      for (let i = 1; i <= Math.min(numPages, 12); i++) { // Cap preview at 12 pages for speed
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
      
      setTotalPages(numPages);
      setThumbnails(urls);
    } catch (err) {
      console.error("Error generating thumbnails:", err);
      // We don't block the actual encryption if previews fail
    } finally {
      setIsGeneratingPreviews(false);
    }
  };

  const processFile = (newFile: File) => {
    setError(null);
    if (newFile.type !== 'application/pdf') {
      setError("Please only upload a valid PDF file.");
      return;
    }
    
    setFile(newFile);
    setPassword("");
    setConfirmPassword("");
    setThumbnails([]); 
    
    if (isPdfjsLoaded) {
      generateThumbnails(newFile);
    } else {
        const checkInterval = setInterval(() => {
          if ((window as any).pdfjsLib) {
            clearInterval(checkInterval);
            generateThumbnails(newFile);
          }
        }, 500);
        setTimeout(() => clearInterval(checkInterval), 5000);
    }
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
    setThumbnails([]);
    setPassword("");
    setConfirmPassword("");
    setError(null);
  };

  const applyProtection = async () => {
    if (!file) return;
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length === 0) {
       setError("Please enter a password to encrypt the document.");
       return;
    }
    
    setIsProcessing(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfBytes = new Uint8Array(arrayBuffer);
      
      // Perform AES encryption natively in the browser
      const encryptedBytes = await encryptPDF(pdfBytes, password);

      const blob = new Blob([encryptedBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `protected_${file.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error("Error protecting PDF:", err);
      setError("An error occurred while encrypting the PDF. Please ensure the file is not already encrypted or corrupted.");
    } finally {
      setIsProcessing(false);
    }
  };

  const isFormValid = file && password.length > 0 && password === confirmPassword;

  return (
    <div className="min-h-screen flex flex-col pt-6 pb-24 md:pb-12 bg-[#0A0A0B] text-white selection:bg-emerald-500/30">
      <header className="px-6 md:px-12 flex items-center justify-between mb-8 max-w-7xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Tools</span>
        </Link>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 flex flex-col items-center">
        <div className="mb-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-4xl font-black mb-4 tracking-tight">Protect PDF</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Secure your PDF files with military-grade AES encryption and a strong password directly in your browser.
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
                    ? 'border-emerald-500 bg-emerald-500/5' 
                    : 'border-white/10 bg-[#121214] hover:border-emerald-500/50 hover:bg-[#18181A]'
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
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 text-emerald-500">
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
                    <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6 text-emerald-500" />
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
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Security Settings</h3>
                  
                  <div className="space-y-4">
                     <div className="space-y-2 relative">
                         <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                             <KeyRound className="w-4 h-4 text-emerald-500" />
                             Password
                         </label>
                         <input
                             type="password"
                             value={password}
                             onChange={(e) => setPassword(e.target.value)}
                             placeholder="Enter a secure password"
                             className="w-full bg-[#18181A] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-colors pr-10"
                         />
                     </div>

                    <div className="space-y-2 relative">
                        <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                            <ShieldCheck className={`w-4 h-4 ${password && password === confirmPassword ? 'text-emerald-500' : 'text-gray-500'}`} />
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter password"
                            className={`w-full bg-[#18181A] border rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-1 transition-colors ${confirmPassword && password !== confirmPassword ? 'border-red-500/50 focus:ring-red-500 focus:border-red-500' : 'border-white/10 focus:ring-emerald-500 focus:border-emerald-500'}`}
                        />
                         {confirmPassword && password !== confirmPassword && (
                            <p className="text-xs text-red-400 absolute -bottom-5 left-0">Passwords do not match</p>
                         )}
                    </div>
                  </div>

                  <button
                    onClick={applyProtection}
                    disabled={!isFormValid || isProcessing}
                    className={`
                      w-full mt-6 py-4 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all text-lg
                      ${!isFormValid
                          ? 'bg-white/5 text-gray-500 cursor-not-allowed' 
                          : isProcessing 
                              ? 'bg-emerald-600 outline-none text-white opacity-80 cursor-wait'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5'
                      }
                    `}
                  >
                    {isProcessing ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Encrypting...
                      </>
                    ) : (
                      <>
                        <Lock className="w-5 h-5" />
                        Encrypt & Download
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - 2/3 Visual Previews Grid */}
          <div className="w-full lg:w-2/3 flex flex-col fade-in bg-[#121214] border border-white/5 rounded-2xl p-6 md:p-8 min-h-[400px] relative overflow-hidden">
             
             {file && (
                 <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#121214] via-[#121214]/80 to-transparent z-10 pointer-events-none flex flex-col items-center justify-start pt-6">
                      <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 rounded-full backdrop-blur-md shadow-lg">
                          <EyeOff className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">Visibility Restricted</span>
                      </div>
                 </div>
             )}

             <div className="flex items-center justify-between mb-6 relative z-20">
                <h3 className="text-lg font-bold tracking-tight">Document Contents</h3>
             </div>
            
            {!file ? (
              <div className="w-full flex-1 flex flex-col items-center justify-center text-gray-500">
                <FileText className="w-12 h-12 mb-4 opacity-50" />
                <p>Upload a PDF to preview its contents before locking</p>
              </div>
            ) : isGeneratingPreviews && thumbnails.length === 0 ? (
              <div className="w-full flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-2xl bg-[#0A0A0B]">
                <svg className="animate-spin mb-4 h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-400 font-medium tracking-tight">Generating page thumbnails...</p>
              </div>
            ) : (
              <div className="w-full grid grid-cols-2 lg:grid-cols-3 gap-6 relative z-0">
                {thumbnails.map((url, i) => (
                  <div key={i} className="flex flex-col gap-3 group relative">
                    <div className="relative aspect-[1/1.414] w-full rounded-xl bg-[#1A1A1E] overflow-hidden shadow-xl border border-white/5 flex items-center justify-center p-2 opacity-25 grayscale group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-500">
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
                {totalPages > 12 && (
                    <div className="flex flex-col gap-3">
                         <div className="relative aspect-[1/1.414] w-full rounded-xl bg-[#1A1A1E] overflow-hidden border border-white/5 flex items-center justify-center flex-col">
                             <FileText className="w-8 h-8 text-gray-600 mb-2" />
                             <span className="text-xs text-gray-500 font-medium">+{totalPages - 12} more pages</span>
                         </div>
                    </div>
                )}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
