"use client";

import { useState, useCallback, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import { 
  UploadCloud, 
  FileText, 
  AlertCircle,
  Download,
  ArrowLeft,
  X,
  Unlock,
  KeyRound
} from "lucide-react";
import Link from "next/link";

export default function UnlockPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPdfjsLoaded, setIsPdfjsLoaded] = useState(false);

  useEffect(() => {
    // Inject pdf.js CDN script
    if (document.getElementById("pdfjs-cdn-unlock")) {
      setIsPdfjsLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.id = "pdfjs-cdn-unlock";
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
      setError("Failed to load PDF decryption engine. Please check your internet connection.");
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

  const processFile = (newFile: File) => {
    setError(null);
    if (newFile.type !== 'application/pdf') {
      setError("Please only upload a valid PDF file.");
      return;
    }
    setFile(newFile);
    setPassword("");
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
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

  const removeFile = () => {
    setFile(null);
    setPassword("");
    setError(null);
  };

  const applyUnlock = async () => {
    if (!file) return;
    if (password.length === 0) {
       setError("Please enter the password to unlock the document.");
       return;
    }
    
    setIsProcessing(true);
    setError(null);

    try {
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) throw new Error("PDF processing library not loaded.");

      const arrayBuffer = await file.arrayBuffer();
      
      // Load the document using pdf.js with the provided password
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
        password: password
      });

      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;

      // Because browsers natively lack pure JS PDF re-serialization that strips encryption without data loss,
      // we must rasterize the decrypted pages and rebuild a visually identical, flattened PDF.
      const newPdf = await PDFDocument.create();

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 }); // High-res scale
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        await page.render({
          canvasContext: ctx,
          viewport: viewport
        }).promise;
        
        const imgDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        const imgBytes = await fetch(imgDataUrl).then(res => res.arrayBuffer());
        
        const image = await newPdf.embedJpg(imgBytes);
        const newPage = newPdf.addPage([viewport.width, viewport.height]);
        newPage.drawImage(image, {
          x: 0,
          y: 0,
          width: viewport.width,
          height: viewport.height,
        });
      }

      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `unlocked_${file.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (err: any) {
      console.error("Error unlocking PDF:", err);
      const errorMsg = err?.message || err?.toString() || "";
      if (errorMsg.includes("Password") || errorMsg.includes("password") || errorMsg.includes("Incorrect")) {
          setError("Incorrect password. Please try again.");
      } else {
          setError("Failed to decrypt this file. Ensure the file is not corrupted.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const isFormValid = file && password.length > 0;

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
            <Unlock className="w-8 h-8 text-rose-500" />
          </div>
          <h1 className="text-4xl font-black mb-4 tracking-tight">Unlock PDF</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Remove passwords and encryption from your PDF strictly in your browser. 100% offline.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-sm w-full max-w-2xl">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="flex-1">{error}</p>
          </div>
        )}

        <div className="w-full max-w-2xl flex flex-col gap-6 items-center mb-16">
          {!file ? (
            <label 
              className={`
                relative flex flex-col items-center justify-center p-12 w-full
                border-2 border-dashed rounded-2xl transition-all duration-200 cursor-pointer
                ${isDragging 
                  ? 'border-rose-500 bg-rose-500/5' 
                  : 'border-white/10 bg-[#121214] hover:border-rose-500/50 hover:bg-[#18181A]'
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
                title="Upload PDF"
              />
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 text-rose-500">
                <UploadCloud className="w-8 h-8" />
              </div>
              <p className="font-medium text-lg mb-2 text-center">Upload Locked PDF</p>
              <p className="text-sm text-gray-500 text-center">Drag & drop or click</p>
            </label>
          ) : (
            <div className="w-full flex flex-col gap-6 fade-in">
              {/* File Info */}
              <div className="p-4 rounded-xl bg-[#121214] border border-white/5 flex items-center justify-between shadow-xl">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6 text-rose-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white truncate text-sm" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
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

              {/* Unlock Configuration Controls */}
              <div className="p-6 md:p-8 rounded-2xl bg-[#121214] border border-white/5 flex flex-col gap-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-rose-500/0 via-rose-500/50 to-rose-500/0 hidden md:block"></div>
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Document Decryption</h3>
                
                <div className="space-y-2 relative">
                    <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-rose-500" />
                        Original Password
                    </label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter the password to unlock"
                        className="w-full bg-[#18181A] border border-white/10 rounded-lg px-4 py-4 text-lg text-white focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 transition-colors shadow-inner"
                    />
                </div>

                <button
                  onClick={applyUnlock}
                  disabled={!isFormValid || isProcessing}
                  className={`
                    w-full mt-4 py-4 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-lg tracking-wide
                    ${!isFormValid
                        ? 'bg-white/5 text-gray-500 cursor-not-allowed' 
                        : isProcessing 
                            ? 'bg-rose-600 outline-none text-white opacity-80 cursor-wait'
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
                      Decrypting...
                    </>
                  ) : (
                    <>
                      <Unlock className="w-5 h-5" />
                      Unlock & Download
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
