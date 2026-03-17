"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Download, AlertCircle, Unlock, KeyRound } from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";

export default function UnlockTool() {
  const { file } = useWorkspace();
  const [password, setPassword] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
        password: password
      });

      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;

      const newPdf = await PDFDocument.create();

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 }); 
        
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
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      link.download = `${baseName}_unlocked.pdf`;
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

  if (!file || file.type !== 'application/pdf') return null;

  return (
    <div className="w-full bg-[#121214] border border-white/5 flex flex-col gap-6 shadow-xl relative overflow-hidden p-6 mt-6 rounded-b-2xl">
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-rose-500/0 via-rose-500/50 to-rose-500/0 hidden md:block"></div>
      
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-sm w-full">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="flex-1">{error}</p>
        </div>
      )}

      <div>
         <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            <Unlock className="w-5 h-5 text-rose-500" />
            Document Decryption
         </h3>
         <p className="text-sm text-gray-400">
            Remove passwords and encryption from your PDF strictly in your browser. 100% offline.
         </p>
      </div>

      <div className="space-y-2 relative max-w-xl">
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
        disabled={isProcessing || password.length === 0}
        className={`w-full sm:w-auto py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-all tracking-wide self-start ${(isProcessing || password.length === 0) ? 'bg-rose-600 outline-none text-white opacity-80 cursor-wait' : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40 hover:-translate-y-0.5'}`}
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
            <Download className="w-4 h-4" />
            Unlock & Download
          </>
        )}
      </button>
    </div>
  );
}
