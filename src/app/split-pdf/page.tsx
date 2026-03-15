"use client";

import { useState, useCallback, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import { 
  UploadCloud, 
  FileText, 
  Scissors,
  AlertCircle,
  Download,
  ArrowLeft,
  X
} from "lucide-react";
import Link from "next/link";

export default function SplitPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [startPage, setStartPage] = useState<number>(1);
  const [endPage, setEndPage] = useState<number>(1);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const loadPdfMetadata = async (pdfFile: File) => {
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pageCount = pdfDoc.getPageCount();
      
      setTotalPages(pageCount);
      setStartPage(1);
      setEndPage(pageCount);
      setError(null);
    } catch (err) {
      console.error("Error loading PDF:", err);
      setError("Failed to read the PDF. Ensure it is a valid, uncorrupted PDF file.");
      setFile(null);
      setTotalPages(0);
    }
  };

  const processFile = (newFile: File) => {
    setError(null);
    if (newFile.type !== 'application/pdf') {
      setError("Please only upload a valid PDF file.");
      return;
    }
    
    setFile(newFile);
    loadPdfMetadata(newFile);
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
    setTotalPages(0);
    setStartPage(1);
    setEndPage(1);
    setError(null);
  };

  const splitPdf = async () => {
    if (!file || startPage < 1 || endPage > totalPages || startPage > endPage) {
      setError("Invalid page range specified.");
      return;
    }
    
    setIsProcessing(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const originalPdf = await PDFDocument.load(arrayBuffer);
      const newPdf = await PDFDocument.create();

      // pdf-lib's copyPages is 0-indexed.
      const pageIndicesToCopy = [];
      for (let i = startPage - 1; i <= endPage - 1; i++) {
        pageIndicesToCopy.push(i);
      }

      const copiedPages = await newPdf.copyPages(originalPdf, pageIndicesToCopy);
      copiedPages.forEach((page) => {
        newPdf.addPage(page);
      });

      const newPdfBuffer = await newPdf.save();
      
      // Trigger download using the slice workaround to bypass TS SharedArrayBuffer issues
      const blob = new Blob([newPdfBuffer as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `split_${startPage}-${endPage}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error("Error splitting PDF:", err);
      setError("An error occurred while splitting the PDF. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const isFormValid = file !== null && startPage >= 1 && endPage <= totalPages && startPage <= endPage;

  return (
    <div className="min-h-screen flex flex-col pt-6 pb-24 md:pb-12 bg-[#0A0A0B] text-white selection:bg-rose-500/30">
      <header className="px-6 md:px-12 flex items-center justify-between mb-12 max-w-5xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Tools</span>
        </Link>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 flex flex-col">
        <div className="mb-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-6">
            <Scissors className="w-8 h-8 text-rose-400" />
          </div>
          <h1 className="text-4xl font-black mb-4 tracking-tight">Split PDF</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Extract specific pages from a PDF document. Processed entirely local in your browser.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 max-w-2xl mx-auto w-full">
          {!file ? (
            <label 
              className={`
                relative flex flex-col items-center justify-center p-16
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
              />
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 text-rose-400">
                <UploadCloud className="w-8 h-8" />
              </div>
              <p className="font-medium text-lg mb-2">Upload a PDF File</p>
              <p className="text-sm text-gray-500 text-center">Drag & drop or click to browse</p>
            </label>
          ) : (
            <div className="flex flex-col gap-6">
              {/* File Info */}
              <div className="p-4 rounded-xl bg-[#121214] border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6 text-rose-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate max-w-[200px] md:max-w-xs" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {(file.size / 1024 / 1024).toFixed(2)} MB • {totalPages} pages
                    </p>
                  </div>
                </div>
                <button
                  onClick={removeFile}
                  className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                  title="Remove file"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Extraction Options */}
              <div className="p-6 rounded-2xl bg-[#121214] border border-white/5">
                <h3 className="text-sm font-medium text-gray-400 mb-6 uppercase tracking-wider">Extraction Range</h3>
                
                <div className="flex items-center gap-4 mb-8">
                  <div className="flex-1">
                    <label htmlFor="startPage" className="block text-sm font-medium text-gray-300 mb-2">
                      Start Page
                    </label>
                    <input 
                      id="startPage"
                      type="number" 
                      min={1} 
                      max={endPage} 
                      value={startPage}
                      onChange={(e) => setStartPage(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-[#18181A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 transition-all"
                    />
                  </div>
                  <div className="flex-1">
                    <label htmlFor="endPage" className="block text-sm font-medium text-gray-300 mb-2">
                      End Page
                    </label>
                    <input 
                      id="endPage"
                      type="number" 
                      min={startPage} 
                      max={totalPages} 
                      value={endPage}
                      onChange={(e) => setEndPage(Math.min(totalPages, parseInt(e.target.value) || totalPages))}
                      className="w-full bg-[#18181A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 transition-all"
                    />
                  </div>
                </div>

                <div className="mb-6 p-4 rounded-xl bg-white/5 text-sm text-gray-300 text-center">
                  Will extract <strong>{endPage - startPage + 1}</strong> page{(endPage - startPage + 1) !== 1 ? 's' : ''} from the document.
                </div>

                <button
                  onClick={splitPdf}
                  disabled={!isFormValid || isProcessing}
                  className={`
                    w-full py-4 px-6 rounded-xl font-medium flex items-center justify-center gap-2 transition-all text-lg
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
                      Extracting...
                    </>
                  ) : (
                    <>
                      <Scissors className="w-5 h-5" />
                      Split PDF
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
