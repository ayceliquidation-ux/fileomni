"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Image as ImageIcon, Download, Sparkles, Loader2, Palette, ImagePlus, Eraser } from "lucide-react";

type BgType = "transparent" | "color" | "image";

export default function BackgroundRemover() {
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  
  // The raw transparent PNG extracted by the AI
  const [extractedUrl, setExtractedUrl] = useState<string | null>(null);
  
  // The final composited output shown to the user
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  
  const [status, setStatus] = useState<"idle" | "loading_model" | "processing" | "done" | "error">("idle");
  const [progress, setProgress] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Background Customization State
  const [bgType, setBgType] = useState<BgType>("transparent");
  const [bgColor, setBgColor] = useState<string>("#121214");
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 1. Extract Mask (Runs once when the AI completes)
  const extractMaskAndSave = useCallback(async (mask: { data: Uint8Array, width: number, height: number }) => {
    if (!originalUrl || !canvasRef.current) return;
    
    try {
      const img = new Image();
      img.src = originalUrl;
      await new Promise((res) => { img.onload = res; });

      const canvas = canvasRef.current;
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context failed");
      
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixelData = imgData.data;

      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = mask.width;
      maskCanvas.height = mask.height;
      const maskCtx = maskCanvas.getContext("2d");
      if (!maskCtx) throw new Error("Mask canvas context failed");

      const maskImageData = maskCtx.createImageData(mask.width, mask.height);
      for (let i = 0; i < mask.data.length; i++) {
        const val = mask.data[i];
        const offset = i * 4;
        maskImageData.data[offset] = val;    
        maskImageData.data[offset + 1] = val;
        maskImageData.data[offset + 2] = val;
        maskImageData.data[offset + 3] = val;
      }
      maskCtx.putImageData(maskImageData, 0, 0);

      const scaledMaskCanvas = document.createElement('canvas');
      scaledMaskCanvas.width = canvas.width;
      scaledMaskCanvas.height = canvas.height;
      const scaledMaskCtx = scaledMaskCanvas.getContext('2d');
      if (!scaledMaskCtx) throw new Error("Scaled Mask context failed");
      scaledMaskCtx.drawImage(maskCanvas, 0, 0, canvas.width, canvas.height);
      
      const rgbScaleMaskData = scaledMaskCtx.getImageData(0, 0, canvas.width, canvas.height).data;

      for (let i = 0; i < pixelData.length; i += 4) {
        const alpha = rgbScaleMaskData[i]; 
        pixelData[i + 3] = alpha; 
      }
      
      ctx.putImageData(imgData, 0, 0);
      
      // Store the raw, perfectly extracted transparent image
      const transparentDataUrl = canvas.toDataURL("image/png");
      setExtractedUrl(transparentDataUrl);
      setOutputUrl(transparentDataUrl);
      setStatus("done");

    } catch (err: any) {
      console.error("Mask application error:", err);
      setStatus("error");
      setErrorMsg(err.message || "Failed to composite mask.");
    }
  }, [originalUrl]);

  // 2. Composite Background (Runs whenever user changes background settings)
  const compositeBackground = useCallback(async () => {
    if (!extractedUrl || !canvasRef.current) return;

    try {
      const fgImg = new Image();
      fgImg.src = extractedUrl;
      await new Promise((res) => { fgImg.onload = res; });

      const canvas = canvasRef.current;
      canvas.width = fgImg.width;
      canvas.height = fgImg.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Clear Canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Background Layer
      if (bgType === "color") {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (bgType === "image" && bgImageUrl) {
        const bgImg = new Image();
        bgImg.src = bgImageUrl;
        await new Promise((res) => { bgImg.onload = res; });

        // Object-fit: cover logic to scale the background image proportionally
        const canvasRatio = canvas.width / canvas.height;
        const bgRatio = bgImg.width / bgImg.height;
        let drawWidth, drawHeight, offsetX, offsetY;

        if (bgRatio > canvasRatio) {
           drawHeight = canvas.height;
           drawWidth = bgImg.width * (canvas.height / bgImg.height);
           offsetX = (canvas.width - drawWidth) / 2;
           offsetY = 0;
        } else {
           drawWidth = canvas.width;
           drawHeight = bgImg.height * (canvas.width / bgImg.width);
           offsetX = 0;
           offsetY = (canvas.height - drawHeight) / 2;
        }

        ctx.drawImage(bgImg, offsetX, offsetY, drawWidth, drawHeight);
      } // If transparent, do nothing (canvas is already cleared)

      // Draw Foreground Layer (Extracted Subject)
      ctx.drawImage(fgImg, 0, 0);

      // Export Final Composited Image
      setOutputUrl(canvas.toDataURL("image/png"));

    } catch (err: any) {
      console.error("Background compositing error:", err);
    }
  }, [extractedUrl, bgType, bgColor, bgImageUrl]);

  // Trigger recompositing whenever background settings change
  useEffect(() => {
    if (status === "done") {
      compositeBackground();
    }
  }, [bgType, bgColor, bgImageUrl, compositeBackground, status]);


  useEffect(() => {
    workerRef.current = new Worker(new URL("../workers/bg-remover.worker.ts", import.meta.url), {
      type: "module"
    });

    workerRef.current.onmessage = (e) => {
      const { status: msgStatus, data, mask, error } = e.data;

      switch(msgStatus) {
        case "init_progress":
          setStatus("loading_model");
          if (data && data.progress !== undefined) {
            setProgress(Math.round(data.progress));
          }
          break;
        case "processing":
          setStatus("processing");
          setProgress(100);
          break;
        case "done":
          extractMaskAndSave(mask);
          break;
        case "error":
          console.error("Received error from worker:", error);
          setStatus("error");
          setErrorMsg(error);
          break;
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, [extractMaskAndSave]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    
    setFile(selected);
    const url = URL.createObjectURL(selected);
    setOriginalUrl(url);
    setExtractedUrl(null);
    setOutputUrl(null);
    setErrorMsg(null);
    setStatus("idle");
    setProgress(0);
    setBgType("transparent");
  };

  const handleBgImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setBgImageUrl(URL.createObjectURL(selected));
    setBgType("image");
  };

  const removeBackground = () => {
    if (!file || !workerRef.current || !originalUrl) return;
    setStatus("loading_model");
    workerRef.current.postMessage({ image: originalUrl });
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      
      <canvas ref={canvasRef} className="hidden" />

      <div className="text-center space-y-2">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 mb-2">
          <Sparkles className="h-6 w-6 text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold">AI Background Remover</h2>
        <p className="text-gray-400">Remove subjects and instantly swap backgrounds natively</p>
      </div>

      {status === "error" && (
        <div className="p-4 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 text-sm break-all">
          {errorMsg || "An error occurred during AI processing."}
        </div>
      )}

      {/* Upload Zone */}
      {!file && (
        <label className="relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer bg-[#121214] hover:bg-white/[0.02] hover:border-blue-500/50 transition-all active:scale-[0.98] group">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <ImageIcon className="w-8 h-8 mb-3 text-gray-500 group-hover:text-blue-400 transition-colors" />
            <p className="mb-2 text-sm font-semibold text-white">Tap to upload image</p>
            <p className="text-xs text-gray-500">PNG, JPG, WEBP</p>
          </div>
          <input 
            type="file" 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileChange}
          />
        </label>
      )}

      {/* Processing & Interactive View */}
      {file && originalUrl && (
        <div className="p-4 md:p-6 bg-[#121214] border border-white/5 rounded-2xl space-y-6 shadow-xl">
          <div className="flex justify-between items-center text-sm border-b border-white/5 pb-4">
            <span className="font-medium text-white truncate max-w-[200px]">{file.name}</span>
            <span className="text-gray-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
          </div>

          <div className={`relative aspect-square md:aspect-video w-full rounded-xl overflow-hidden transition-all duration-300 ${bgType === 'transparent' ? "bg-[url('https://cdn.pixabay.com/photo/2021/08/25/20/42/field-6574455__340.jpg')]" : ""}`} style={bgType === 'color' ? { backgroundColor: bgColor } : {}}>
            
            {/* Checkerboard Pattern for Transparency Visualization */}
            {bgType === 'transparent' && (
               <div className="absolute inset-0 z-0 bg-repeat bg-center" style={{ backgroundImage: 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAADFJREFUOE9jZGBgEGHg/s/AAJIjjAQyEAMoNmEwMGjXAAwG1HCE0dDIQAA2Q9FwH10CAH6MExH6p6TCAAAAAElFTkSuQmCC")' }}></div>
            )}

            {/* Render the Custom Image Background if selected */}
            {bgType === 'image' && bgImageUrl && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={bgImageUrl} alt="Background" className="absolute inset-0 z-0 w-full h-full object-cover" />
              </>
            )}

            {/* Render the Original or Extracted Subject */}
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={status === "done" && extractedUrl ? extractedUrl : originalUrl} 
                alt="Subject Preview" 
                className="max-h-full max-w-full object-contain drop-shadow-2xl"
              />
            </div>

            {/* Loading Overlay */}
            {(status === "loading_model" || status === "processing") && (
              <div className="absolute inset-0 z-20 bg-[#0A0A0B]/80 backdrop-blur-sm flex flex-col items-center justify-center p-8">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-4" />
                <p className="text-white font-medium mb-2">
                  {status === "loading_model" ? "Downloading AI Model..." : "Extracting Subject..."}
                </p>
                
                {status === "loading_model" && (
                  <div className="w-full max-w-xs space-y-2">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>MODNet Engine</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-[#18181A] rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-blue-400 h-1.5 rounded-full transition-all duration-300" 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <p className="text-[10px] text-gray-500 text-center uppercase tracking-wider mt-2">Cached after first run</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Background Replacement Controls (Only visible after extraction) */}
          {status === "done" && (
            <div className="grid grid-cols-3 gap-3 pt-2">
              <button 
                onClick={() => setBgType("transparent")}
                className={`py-3 flex flex-col items-center justify-center gap-2 rounded-xl border transition-all ${bgType === 'transparent' ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'bg-white/5 border-transparent text-gray-400 hover:text-white'}`}
              >
                <Eraser className="w-5 h-5" />
                <span className="text-xs font-medium">Transparent</span>
              </button>
              
              <div className={`relative py-3 flex flex-col items-center justify-center gap-2 rounded-xl border transition-all overflow-hidden ${bgType === 'color' ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'bg-white/5 border-transparent text-gray-400 hover:text-white'}`}>
                <Palette className="w-5 h-5" />
                <span className="text-xs font-medium">Solid Color</span>
                <input 
                  type="color" 
                  value={bgColor}
                  onChange={(e) => { setBgColor(e.target.value); setBgType("color"); }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>

              <div className={`relative py-3 flex flex-col items-center justify-center gap-2 rounded-xl border transition-all overflow-hidden ${bgType === 'image' ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'bg-white/5 border-transparent text-gray-400 hover:text-white'}`}>
                <ImagePlus className="w-5 h-5" />
                <span className="text-xs font-medium">Custom Image</span>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleBgImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t border-white/5">
            <button 
              onClick={() => { setFile(null); setOriginalUrl(null); setExtractedUrl(null); setOutputUrl(null); setStatus("idle"); setBgType("transparent"); }}
              className="flex-1 py-3 bg-[#18181A] text-white font-medium rounded-xl hover:bg-white/5 active:scale-[0.98] transition-all border border-white/5"
            >
              Start Over
            </button>
            
            {status === "done" && outputUrl ? (
              <a 
                href={outputUrl} 
                download={`custombg_${file?.name.replace(/\.[^/.]+$/, "")}.png`}
                className="flex-1 py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 active:scale-[0.98] transition-all flex justify-center items-center gap-2 shadow-lg shadow-blue-500/20"
              >
                <Download className="w-4 h-4" /> Save Image
              </a>
            ) : (
              <button
                onClick={removeBackground}
                disabled={status === "loading_model" || status === "processing"}
                className="flex-1 py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 active:scale-[0.98] transition-all flex justify-center items-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4" /> Extract Subject
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
