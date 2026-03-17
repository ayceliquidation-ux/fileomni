"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Download, AlertCircle, Stamp } from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";

export default function FlattenTool() {
  const { file } = useWorkspace();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyFlatten = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const form = pdfDoc.getForm();
      form.flatten();
      
      const pdfBytes = await pdfDoc.save();

      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      link.download = `${baseName}_flattened.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      // In a more robust Phase 3, we would update the WorkspaceContext 
      // with the new flattened file Blob so the Live Preview instantly updates.
      // For Phase 2, we just trigger the download to mirror standalone functionality.
      
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

  if (!file || file.type !== 'application/pdf') return null;

  return (
    <div className="w-full bg-[#121214] border border-white/5 flex flex-col gap-4 shadow-xl relative overflow-hidden p-6 mt-6 rounded-b-2xl">
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-rose-500/0 via-rose-500/50 to-rose-500/0 hidden md:block"></div>
      
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-sm w-full">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="flex-1">{error}</p>
        </div>
      )}

      <div>
         <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            <Stamp className="w-5 h-5 text-rose-500" />
            Flatten Document
         </h3>
         <p className="text-sm text-gray-400">
            This action will merge all interactive text fields, checkboxes, and annotations natively into the static visual layer of the PDF. They will no longer be editable.
         </p>
      </div>

      <button
        onClick={applyFlatten}
        disabled={isProcessing}
        className={`
          w-full sm:w-auto mt-2 py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-all tracking-wide
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
            <Download className="w-4 h-4" />
            Download Flattened PDF
          </>
        )}
      </button>
    </div>
  );
}
