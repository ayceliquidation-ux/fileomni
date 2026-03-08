"use client";

import { useState, useRef } from "react";
import Script from "next/script";
import { Camera, RefreshCw, FileDown } from "lucide-react";
import { PDFDocument } from "pdf-lib";

declare global {
  interface Window {
    cv: any;
  }
}

export default function SmartScanner() {
  const [cvLoaded, setCvLoaded] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    
    setFile(selected);
    setError(null);
    processImage(selected);
  };

  const processImage = async (imageFile: File) => {
    if (!window.cv || !cvLoaded) {
      setError("OpenCV is still loading. Please try again in a moment.");
      return;
    }
    
    setProcessing(true);

    const imageUrl = URL.createObjectURL(imageFile);
    const img = new Image();
    
    img.onload = () => {
      let src: any = null;
      let dst: any = null;

      try {
        const cv = window.cv;
        
        // 1. Calculate scaled dimensions (max 1500)
        const MAX_DIM = 1500;
        let width = img.width;
        let height = img.height;
        if (width > MAX_DIM || height > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // Apply dimensions explicitly to the image element before reading
        img.width = width;
        img.height = height;

        // 2. Read Image directly from the scaled DOM node
        src = cv.imread(img);
        
        console.log('[OpenCV] Source Dimensions:', src.cols, src.rows);
        if (src.cols === 0 || src.rows === 0) {
           throw new Error("OpenCV read an empty 0x0 image. Source element was not ready.");
        }

        dst = new cv.Mat();

        // Convert to grayscale
        cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY, 0);
        
        // Apply adaptive threshold for scan effect
        cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2);

        // Convert back to RGBA for HTML canvas rendering
        cv.cvtColor(dst, dst, cv.COLOR_GRAY2RGBA);

        // 3. Size and render back to visible display canvas
        const displayCanvas = displayCanvasRef.current;
        if (!displayCanvas) throw new Error("Display canvas ref is missing.");
        
        displayCanvas.width = src.cols;
        displayCanvas.height = src.rows;
        
        cv.imshow(displayCanvas, dst);

      } catch (err: any) {
        console.error("OpenCV Processing Error:", err);
        const errMsg = typeof err === 'number' ? `OpenCV C++ Exception Code: ${err}` : err.message;
        setError(errMsg || "An unexpected error occurred during OpenCV processing.");
      } finally {
        // Clean up Mats to prevent memory leaks rigidly
        if (src && !src.isDeleted()) src.delete();
        if (dst && !dst.isDeleted()) dst.delete();
        URL.revokeObjectURL(imageUrl);
        setProcessing(false);
      }
    };

    img.onerror = () => {
      setError("Failed to load image element.");
      URL.revokeObjectURL(imageUrl);
      setProcessing(false);
    };

    // Trigger the load sequence
    img.src = imageUrl;
  };

  const handleSavePDF = async () => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return;

    try {
      setGeneratingPdf(true);
      setError(null);

      // 1. Extract image data directly from the perfectly processed OpenCV output canvas
      const imageDataUrl = canvas.toDataURL("image/png");

      // 2. Create the raw PDF document in RAM
      const pdfDoc = await PDFDocument.create();

      // 3. Embed the PNG payload into pdf-lib
      const pngImage = await pdfDoc.embedPng(imageDataUrl);

      // 4. Create a page with exactly matching width and height dimensions to the embedded image
      const page = pdfDoc.addPage([pngImage.width, pngImage.height]);
      page.drawImage(pngImage, {
        x: 0,
        y: 0,
        width: pngImage.width,
        height: pngImage.height,
      });

      // 5. Serialize into bytes and trigger a secure local browser download
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const downloadUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `scanned-document-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

    } catch (err: any) {
        console.error("PDF Generation Error:", err);
        setError("Failed to generate PDF. Check console for details.");
    } finally {
        setGeneratingPdf(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      
      <Script 
        src="https://docs.opencv.org/4.8.0/opencv.js"
        onReady={() => {
          // OpenCV.js loads WASM asynchronously internally, we poll to ensure cv.Mat is available
          const checkCv = setInterval(() => {
            if (window.cv && window.cv.Mat) {
              setCvLoaded(true);
              clearInterval(checkCv);
            }
          }, 100);
        }}
      />

      {/* Hidden Canvas for initial image reading */}
      <canvas ref={originalCanvasRef} className="hidden" />

      {error && (
        <div className="p-4 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 text-sm">
          {error}
        </div>
      )}

      {/* Upload/Camera Zone */}
      {!file && (
        <label className={`relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-2xl ${cvLoaded ? 'cursor-pointer hover:bg-white/[0.02] hover:border-emerald-500/50' : 'opacity-50 cursor-not-allowed'} bg-[#121214] transition-all active:scale-[0.98] group`}>
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Camera className={`w-8 h-8 mb-3 transition-colors ${cvLoaded ? 'text-gray-500 group-hover:text-emerald-400' : 'text-gray-600'}`} />
            <p className="mb-2 text-sm font-semibold text-white">
              {cvLoaded ? "Tap to Scan Document" : "Loading Scanner Engine..."}
            </p>
            <p className="text-xs text-gray-500">Auto-crop & enhance locally</p>
          </div>
          <input 
            type="file" 
            className="hidden" 
            accept="image/*" 
            capture="environment" 
            onChange={handleFileChange}
            disabled={!cvLoaded}
          />
        </label>
      )}

      {/* Result UI */}
      {file && (
        <div className="p-4 md:p-6 bg-[#121214] border border-white/5 rounded-2xl space-y-6 shadow-xl">
          <div className="flex justify-between items-center text-sm border-b border-white/5 pb-4">
            <span className="font-medium text-white truncate max-w-[200px]">{file.name}</span>
            <span className="text-emerald-400 font-medium">{processing ? "Processing..." : "Scanned"}</span>
          </div>

          <div className="relative aspect-[3/4] md:aspect-auto md:min-h-[400px] w-full rounded-xl overflow-hidden bg-black flex items-center justify-center border border-white/10">
            {/* Visible Display Canvas */}
            <canvas 
              ref={displayCanvasRef} 
              className={`max-w-full max-h-[60vh] object-contain transition-opacity duration-300 ${processing ? 'opacity-0' : 'opacity-100'}`} 
            />
            
            {processing && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
                <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-4" />
                <p className="text-white font-medium text-sm">Applying Smart Filter...</p>
              </div>
            )}
          </div>

          {!processing && (
            <div className="flex gap-2 w-full mt-4 border-t border-white/5 pt-4">
              <button 
                onClick={() => { setFile(null); }}
                className="flex-1 py-3 bg-[#18181A] text-white font-medium rounded-xl hover:bg-white/5 active:scale-[0.98] transition-all cursor-pointer border border-white/5"
              >
                Scan Another
              </button>
              <button 
                onClick={handleSavePDF}
                disabled={generatingPdf}
                className="flex-1 py-3 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-600 active:scale-[0.98] transition-all flex justify-center items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generatingPdf ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                {generatingPdf ? "Saving..." : "Save PDF"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
