"use client";

import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import { 
  UploadCloud, 
  FileText, 
  Merge,
  Trash2,
  AlertCircle,
  Download,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";

export default function MergePdfPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFiles = (newFiles: File[]) => {
    setError(null);
    const pdfFiles = newFiles.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length !== newFiles.length) {
      setError("Some files were rejected. Please only upload PDF files.");
    }
    
    if (pdfFiles.length > 0) {
      setFiles(prev => [...prev, ...pdfFiles]);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
    // reset input so the same file can be selected again if needed
    e.target.value = '';
  };

  const removeFile = (indexToRemove: number) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
  };

  const mergePdfs = async () => {
    if (files.length < 2) return;
    
    setIsMerging(true);
    setError(null);

    try {
      const mergedPdf = await PDFDocument.create();

      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => {
          mergedPdf.addPage(page);
        });
      }

      const mergedPdfFile = await mergedPdf.save();
      
      // Trigger download
      const blob = new Blob([mergedPdfFile as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'merged.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error("Error merging PDFs:", err);
      setError("An error occurred while merging the PDF files. Please ensure they are valid PDFs.");
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col pt-6 pb-24 md:pb-12 bg-[#0A0A0B] text-white selection:bg-indigo-500/30">
      <header className="px-6 md:px-12 flex items-center justify-between mb-12 max-w-5xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Tools</span>
        </Link>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 flex flex-col">
        <div className="mb-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-6">
            <Merge className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-4xl font-black mb-4 tracking-tight">Merge PDF</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Combine multiple PDF files into one document instantly. Processed entirely local in your browser.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex flex-col gap-4">
            {/* Upload Area */}
            <label 
              className={`
                relative flex flex-col items-center justify-center p-10 
                border-2 border-dashed rounded-2xl transition-all duration-200 cursor-pointer
                ${isDragging 
                  ? 'border-indigo-500 bg-indigo-500/5' 
                  : 'border-white/10 bg-[#121214] hover:border-indigo-500/50 hover:bg-[#18181A]'
                }
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input 
                type="file" 
                multiple 
                accept="application/pdf"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4 text-indigo-400">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="font-medium mb-1">Upload PDF Files</p>
              <p className="text-xs text-gray-500 text-center">Drag & drop or click to browse</p>
            </label>

            {/* Merge Action */}
            <div className="mt-4 p-6 rounded-2xl bg-[#121214] border border-white/5 flex flex-col items-center">
              <div className="text-center mb-6">
                <p className="text-sm text-gray-400">
                  {files.length === 0 ? "Select at least 2 PDFs to merge" : `${files.length} file${files.length === 1 ? '' : 's'} ready to merge`}
                </p>
              </div>
              <button
                onClick={mergePdfs}
                disabled={files.length < 2 || isMerging}
                className={`
                  w-full py-3.5 px-6 rounded-xl font-medium flex items-center justify-center gap-2 transition-all
                  ${files.length < 2 
                    ? 'bg-white/5 text-gray-500 cursor-not-allowed' 
                    : isMerging 
                      ? 'bg-indigo-600 outline-none text-white opacity-80 cursor-wait'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5'
                  }
                `}
              >
                {isMerging ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Merging...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Merge PDFs
                  </>
                )}
              </button>
              <p className="text-xs text-gray-500 mt-4 text-center">
                Processing happens entirely in your browser.<br/>No files are uploaded.
              </p>
            </div>
          </div>

          <div className="flex flex-col">
            <h3 className="text-sm font-medium text-gray-400 mb-4 flex justify-between items-center">
              <span>File Queue</span>
              {files.length > 0 && (
                <button 
                  onClick={() => setFiles([])}
                  className="text-xs hover:text-white transition-colors"
                >
                  Clear all
                </button>
              )}
            </h3>
            
            {files.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-2xl bg-[#121214]/50 p-8 text-center min-h-[200px]">
                <FileText className="w-8 h-8 text-gray-600 mb-3" />
                <p className="text-sm text-gray-500">No files added yet</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto max-h-[400px] pr-2 space-y-2 custom-scrollbar">
                {files.map((file, index) => (
                  <div 
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#18181A] border border-white/5 group"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate w-48" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="p-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-500/10"
                      title="Remove file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
