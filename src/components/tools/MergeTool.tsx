"use client";

import { useState, useCallback, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import { UploadCloud, FileText, AlertCircle, Download, Merge, Trash2 } from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";

export default function MergeTool() {
  const { file } = useWorkspace();
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize with the workspace active file
  useEffect(() => {
    if (file && file.type === 'application/pdf') {
       setFiles((prev) => {
          if (prev.length === 0) return [file];
          const exists = prev.some(f => f.name === file.name && f.size === file.size);
          if (!exists) {
              return [file, ...prev];
          }
          return prev;
       });
    }
  }, [file]);

  const processFiles = (newFiles: File[]) => {
    setError(null);
    const pdfFiles = newFiles.filter(f => f.type === 'application/pdf');
    if (pdfFiles.length !== newFiles.length) {
      setError("Some files were rejected. Please only upload PDF files.");
    }
    if (pdfFiles.length > 0) {
      setFiles(prev => [...prev, ...pdfFiles]);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

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
    e.target.value = '';
  };

  const removeFile = (indexToRemove: number) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
  };

  const mergePdfs = async () => {
    if (files.length < 2) return;
    setIsProcessing(true);
    setError(null);

    try {
      const mergedPdf = await PDFDocument.create();

      for (const f of files) {
        const arrayBuffer = await f.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => {
          mergedPdf.addPage(page);
        });
      }

      const mergedPdfFile = await mergedPdf.save();
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
      setIsProcessing(false);
    }
  };

  if (!file || file.type !== 'application/pdf') return null;

  return (
    <div className="w-full bg-[#121214] border border-white/5 flex flex-col gap-6 shadow-xl relative overflow-hidden p-6 mt-6 rounded-b-2xl">
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500/0 via-indigo-500/50 to-indigo-500/0 hidden md:block"></div>
      
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div>
         <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            <Merge className="w-5 h-5 text-indigo-500" />
            Merge Documents
         </h3>
         <p className="text-sm text-gray-400">
            Add multiple PDFs below to append them to your active workspace document.
         </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* File Queue */}
          <div className="flex flex-col bg-black/20 rounded-xl border border-white/5 p-4 max-h-[250px] overflow-y-auto custom-scrollbar">
             <div className="text-xs font-semibold tracking-wider text-gray-500 uppercase mb-3 px-1">Merging Queue</div>
             {files.length === 0 ? (
                <div className="text-gray-500 text-sm italic py-4 flex items-center justify-center flex-col gap-2">
                   <FileText className="w-6 h-6 opacity-50" />
                   No files queued.
                </div>
             ) : (
                <div className="flex flex-col gap-2">
                   {files.map((f, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 group">
                        <div className="flex items-center gap-2 overflow-hidden">
                           <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                           <p className="text-xs font-medium text-gray-200 truncate pr-2 max-w-[150px] sm:max-w-[200px]" title={f.name}>{f.name}</p>
                           {i === 0 && <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-md font-bold shrink-0">BASE</span>}
                        </div>
                        <button
                          onClick={() => removeFile(i)}
                          aria-label="Remove file"
                          className="p-1.5 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                   ))}
                </div>
             )}
          </div>

          <div className="flex flex-col gap-4 h-full">
              <label 
                className={`
                  relative flex flex-col items-center justify-center p-6 flex-1 min-h-[140px]
                  border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer
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
                  type="file" multiple accept="application/pdf"
                  onChange={handleFileInput}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <UploadCloud className="w-8 h-8 text-indigo-400 mb-2" />
                <p className="font-medium text-sm text-gray-200">Append More PDFs</p>
                <p className="text-xs text-gray-500">Drag & drop or click</p>
              </label>

              <button
                onClick={mergePdfs}
                disabled={files.length < 2 || isProcessing}
                className={`
                  w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all tracking-wide
                  ${files.length < 2 || isProcessing
                      ? 'bg-indigo-600/50 text-white/80 cursor-not-allowed border-indigo-500/20'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_-5px_rgba(99,102,241,0.5)] border-indigo-500/20 active:scale-[0.98]'
                  }
                `}
              >
                {isProcessing ? (
                  <>
                     <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                     </svg>
                     Merging...
                  </>
                ) : (
                  <>
                     <Download className="w-4 h-4" />
                     Download Merged PDF
                  </>
                )}
              </button>
          </div>
      </div>
    </div>
  );
}
