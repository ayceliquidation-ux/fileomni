"use client";

import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import { 
  UploadCloud, 
  FileText, 
  AlertCircle,
  Download,
  ArrowLeft,
  X,
  Stamp
} from "lucide-react";
import Link from "next/link";

export default function FlattenPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flattenedUrl, setFlattenedUrl] = useState<string | null>(null);

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
    setFlattenedUrl(null);
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

  const resetFile = () => {
    setFile(null);
    setError(null);
    setFlattenedUrl(null);
  };

  const handleDownload = () => {
    if (!flattenedUrl || !file) return;
    const link = document.createElement('a');
    link.href = flattenedUrl;
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    link.download = `${baseName}_flattened.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const applyFlatten = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // Load the document using pdf-lib
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      // Access the interactive form layer and execute flatten
      const form = pdfDoc.getForm();
      form.flatten();
      
      const pdfBytes = await pdfDoc.save();

      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setFlattenedUrl(url);
      
    } catch (err: any) {
      console.error("Error flattening PDF:", err);
      if (err?.message?.includes("encrypted")) {
          setError("This document is password protected. Please unlock it first.");
      } else {
          setError("Failed to process this file. The document may be corrupted or missing standard interactive form layers.");
      }
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
            <Stamp className="w-8 h-8 text-rose-500" />
          </div>
          <h1 className="text-4xl font-black mb-4 tracking-tight">Flatten PDF</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Lock interactive form fields and annotations into the document permanently. Secure and 100% offline.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-sm w-full max-w-2xl">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="flex-1">{error}</p>
          </div>
        )}

        <div className={`w-full flex flex-col gap-6 items-center mb-16 ${flattenedUrl ? 'max-w-4xl' : 'max-w-2xl'}`}>
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
              <p className="font-medium text-lg mb-2 text-center">Upload PDF Form</p>
              <p className="text-sm text-gray-500 text-center">Drag & drop or click</p>
            </label>
          ) : !flattenedUrl ? (
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
                  onClick={resetFile}
                  className="p-2 shrink-0 ml-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                  title="Remove file"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Action Panel */}
              <div className="p-6 md:p-8 rounded-2xl bg-[#121214] border border-white/5 flex flex-col gap-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-rose-500/0 via-rose-500/50 to-rose-500/0 hidden md:block"></div>
                
                <div>
                   <h3 className="text-lg font-bold text-white mb-2">Flatten Document</h3>
                   <p className="text-sm text-gray-400">This action will merge all interactive text fields, checkboxes, and annotations natively into the static visual layer of the PDF. They will no longer be editable.</p>
                </div>

                <button
                  onClick={applyFlatten}
                  disabled={isProcessing}
                  className={`
                    w-full mt-2 py-4 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-lg tracking-wide
                    ${isProcessing 
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
                      Embedding Forms...
                    </>
                  ) : (
                    <>
                      <Stamp className="w-5 h-5" />
                      Flatten PDF & Preview
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full flex flex-col gap-6 fade-in">
              {/* Success Action Bar */}
              <div className="p-4 rounded-xl bg-[#121214] border border-white/5 flex flex-col sm:flex-row items-center justify-between shadow-xl gap-4 sticky top-4 z-10">
                 <div className="flex items-center gap-3 w-full sm:w-auto min-w-0">
                   <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                     <Stamp className="w-5 h-5 text-emerald-500" />
                   </div>
                   <div className="min-w-0 flex-1">
                     <p className="font-medium text-white text-sm truncate">Successfully Flattened</p>
                     <p className="text-xs text-gray-400 truncate">Interactive fields are permanently embedded.</p>
                   </div>
                 </div>
                 
                 <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                      onClick={resetFile}
                      className="px-4 py-2.5 text-sm font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors flex-1 sm:flex-none text-center whitespace-nowrap"
                    >
                      Flatten Another File
                    </button>
                    <button
                      onClick={handleDownload}
                      className="px-6 py-2.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-lg shadow-rose-500/25 transition-colors flex items-center justify-center gap-2 flex-1 sm:flex-none whitespace-nowrap"
                    >
                      <Download className="w-4 h-4" />
                      Download Final PDF
                    </button>
                 </div>
              </div>
              
              {/* PDF Preview */}
              <div className="w-full bg-[#121214] rounded-2xl border border-white/5 overflow-hidden shadow-2xl h-[500px] sm:h-[600px] md:h-[800px]">
                <object 
                  data={`${flattenedUrl}#toolbar=0&navpanes=0`} 
                  type="application/pdf" 
                  className="w-full h-full"
                >
                  <p className="p-4 text-center text-gray-400 mt-10">Preview not available in this browser. Please click Download to view your flattened PDF.</p>
                </object>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
