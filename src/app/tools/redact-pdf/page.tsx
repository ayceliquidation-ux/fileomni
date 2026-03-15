"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { UploadCloud, FileText, Download, Minimize2, ArrowLeft, AlertCircle, Eraser, Check, X, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { PDFDocument } from 'pdf-lib';

interface RedactBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function RedactPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPdfjsLoaded, setIsPdfjsLoaded] = useState(false);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputFilename, setOutputFilename] = useState<string>('');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [renderScale, setRenderScale] = useState(1);
  const [boxes, setBoxes] = useState<RedactBox[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentBox, setCurrentBox] = useState<RedactBox | null>(null);

  // Load PDF.js
  useEffect(() => {
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
      setError("Failed to load PDF engine. Please check your internet connection.");
    };
    document.body.appendChild(script);
  }, []);

  const renderPdfPage = async (pdfFile: File) => {
    if (!isPdfjsLoaded) {
      setError("PDF Engine is still loading. Please try again in a moment.");
      return;
    }
    setError(null);
    setBoxes([]);
    setOutputUrl(null);
    
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfjsLib = (window as any).pdfjsLib;
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2.0 }); // High-res scale
      setRenderScale(2.0);

      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      await page.render({
        canvasContext: ctx,
        viewport: viewport
      }).promise;

    } catch (err) {
      console.error(err);
      setError("Failed to render PDF preview.");
    }
  };

  const handleFileSelect = (newFile: File) => {
    if (newFile.type === "application/pdf") {
      setFile(newFile);
      renderPdfPage(newFile);
    } else {
      setError("Please upload a valid PDF document.");
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
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [isPdfjsLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
    e.target.value = '';
  };

  // Drawing Logic
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (outputUrl) return; // Prevent drawing if already processed
    
    const { x, y } = getCoordinates(e);
    setIsDrawing(true);
    setStartPos({ x, y });
    setCurrentBox({
      id: Date.now().toString(),
      x, y,
      width: 0, height: 0
    });
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing || !currentBox || outputUrl) return;

    const { x, y } = getCoordinates(e);
    
    setCurrentBox({
      ...currentBox,
      x: Math.min(startPos.x, x),
      y: Math.min(startPos.y, y),
      width: Math.abs(x - startPos.x),
      height: Math.abs(y - startPos.y)
    });
  };

  const handlePointerUp = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing || outputUrl) return;
    
    setIsDrawing(false);
    if (currentBox && currentBox.width > 5 && currentBox.height > 5) {
      setBoxes([...boxes, currentBox]);
    }
    setCurrentBox(null);
  };

  const removeBox = (id: string) => {
    setBoxes(boxes.filter(b => b.id !== id));
  };

  const handleStartOver = () => {
    setFile(null);
    setBoxes([]);
    setOutputUrl(null);
    setError(null);
  };

  const handleRedactAndExport = async () => {
    if (!canvasRef.current || !file) return;
    setIsProcessing(true);
    setError(null);

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not get canvas context.");

      // 1. Physically draw solid black redaction boxes onto the canvas
      ctx.fillStyle = "black";
      boxes.forEach(box => {
        ctx.fillRect(box.x, box.y, box.width, box.height);
      });

      // 2. Extrapolate that perfectly flattened image as a JPEG (This DELETES all text layers underneath)
      const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.95);

      // 3. Build a brand new PDF from scratch and inject the flattened image
      const newPdf = await PDFDocument.create();
      const image = await newPdf.embedJpg(jpegDataUrl);
      
      const { width, height } = image.scale(1 / renderScale); // Map it back to standard scale
      
      const newPage = newPdf.addPage([width, height]);
      newPage.drawImage(image, {
        x: 0,
        y: 0,
        width,
        height
      });

      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      
      setOutputUrl(url);
      setOutputFilename(`redacted_${file.name.replace('.pdf', '')}.pdf`);

    } catch (err) {
      console.error("Redaction Error:", err);
      setError("Failed to apply redactions and generate document.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col pt-6 pb-24 md:pb-12 bg-[#0A0A0B] text-white selection:bg-indigo-500/30">
      <header className="px-6 md:px-12 flex items-center justify-between mb-8 max-w-7xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Tools</span>
        </Link>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 flex flex-col items-center">
        <div className="mb-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-6">
            <Eraser className="w-8 h-8 text-indigo-500" />
          </div>
          <h1 className="text-4xl font-black mb-4 tracking-tight">Secure Redact</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Permanently erase sensitive information from PDFs locally. Texts are visually blacked-out and the document is flattened into a single secure image.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-sm w-full max-w-xl mx-auto animate-in fade-in">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="w-full flex flex-col items-center">
          
          {!file ? (
            <label 
              className={`
                w-full max-w-xl relative flex flex-col items-center justify-center p-12
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
                accept="application/pdf"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="Upload PDF"
              />
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 text-indigo-500">
                <UploadCloud className="w-8 h-8" />
              </div>
              <p className="font-medium text-lg mb-2 text-center text-white">Upload PDF to Redact</p>
              <p className="text-sm text-gray-500 text-center">Drag & drop your file or click</p>
            </label>
          ) : (
            <div className="w-full flex flex-col lg:flex-row gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Left Panel: Toolbar & Actions */}
              <div className="w-full lg:w-1/3 flex flex-col gap-6">
                 
                 <div className="w-full bg-[#121214] border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col">
                    <div className="flex items-center gap-3 overflow-hidden bg-black/40 p-3 rounded-lg border border-white/5 mb-6">
                        <FileText className="w-5 h-5 text-indigo-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                           <p className="text-sm font-medium truncate text-gray-300">{file.name}</p>
                           <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                    </div>

                    {!outputUrl ? (
                      <div className="flex flex-col gap-4">
                        <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                           <p className="text-sm text-indigo-300 leading-relaxed font-medium">
                               <span className="font-bold flex items-center gap-2 mb-1"><Eraser className="w-4 h-4" /> Draw Redactions</span>
                               Click and drag over the document preview to draw solid black redaction boxes.
                           </p>
                        </div>

                        {boxes.length > 0 && (
                            <div className="flex flex-col gap-2 mt-2">
                                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Active Redactions ({boxes.length})</h4>
                                <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                                   {boxes.map((b, i) => (
                                      <div key={b.id} className="flex items-center justify-between bg-black/40 p-2 rounded border border-white/5 text-xs text-gray-300">
                                         <span>Redaction #{i+1}</span>
                                         <button onClick={() => removeBox(b.id)} className="text-red-400 hover:text-red-300 transition-colors p-1" title="Remove block">
                                             <X className="w-3.5 h-3.5" />
                                         </button>
                                      </div>
                                   ))}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleRedactAndExport}
                            disabled={isProcessing || boxes.length === 0}
                            className={`w-full py-3 mt-4 font-bold rounded-xl transition-all flex items-center justify-center gap-2 group border active:scale-95 ${
                                isProcessing || boxes.length === 0
                                ? 'bg-indigo-600/50 text-indigo-200 border-indigo-500/20 cursor-not-allowed opacity-80' 
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_-5px_rgba(99,102,241,0.5)] border-indigo-400/20'
                            }`}
                        >
                            {isProcessing ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Securing Document...
                                </>
                            ) : (
                                <>
                                    <Check className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    Apply Redactions
                                </>
                            )}
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4 animate-in fade-in">
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-2 text-center">
                           <p className="text-emerald-400 font-bold mb-1">Redaction Complete!</p>
                           <p className="text-xs text-emerald-500/80">The document has been securely flattened. Hidden text is permanently erased.</p>
                        </div>
                        <a
                           href={outputUrl}
                           download={outputFilename}
                           className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 border border-emerald-400/20 transition-all flex items-center justify-center gap-2 group active:scale-95"
                        >
                           <Download className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                           Download Secured PDF
                        </a>
                      </div>
                    )}

                    <button 
                         onClick={handleStartOver}
                         className="w-full py-3 mt-4 bg-white/5 hover:bg-white/10 text-white text-sm font-bold rounded-xl border border-white/10 transition-all flex items-center justify-center gap-2"
                    >
                         <RefreshCw className="w-4 h-4" /> Start Over
                    </button>
                 </div>
              </div>

              {/* Right Panel: Interactive Canvas Mapping */}
              <div className="w-full lg:w-2/3 flex flex-col items-center bg-[#121214] border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                 
                 {/* CSS Scaled Display Layer for the High-Res Canvas */}
                 <div className="relative border border-white/10 shadow-2xl bg-[#0F0F11] overflow-hidden" style={{ maxWidth: "100%", maxHeight: "70vh" }}>
                    
                    {/* The Main High-Res Canvas rendered efficiently using CSS scaling logic */}
                    <canvas 
                        ref={canvasRef}
                        className={`block h-auto w-full object-contain ${outputUrl ? 'opacity-80' : 'cursor-crosshair'}`}
                        style={{ maxHeight: "70vh", maxWidth: "100%" }}
                        onMouseDown={handlePointerDown}
                        onMouseMove={handlePointerMove}
                        onMouseUp={handlePointerUp}
                        onMouseLeave={handlePointerUp}
                        onTouchStart={handlePointerDown}
                        onTouchMove={handlePointerMove}
                        onTouchEnd={handlePointerUp}
                    />

                    {/* Rendering the active DOM overlays natively scaled to match the fluid CSS size constraints */}
                    {!outputUrl && canvasRef.current && (
                        <div className="absolute inset-0 pointer-events-none">
                            {boxes.map(box => (
                                <div 
                                   key={box.id}
                                   className="absolute bg-black shadow-[0_0_0_1px_rgba(255,255,255,0.7)]"
                                   style={{
                                       left: `${(box.x / canvasRef.current!.width) * 100}%`,
                                       top: `${(box.y / canvasRef.current!.height) * 100}%`,
                                       width: `${(box.width / canvasRef.current!.width) * 100}%`,
                                       height: `${(box.height / canvasRef.current!.height) * 100}%`
                                   }}
                                />
                            ))}
                            {isDrawing && currentBox && (
                                <div 
                                   className="absolute bg-black/50 border border-white/80 border-dashed"
                                   style={{
                                       left: `${(currentBox.x / canvasRef.current!.width) * 100}%`,
                                       top: `${(currentBox.y / canvasRef.current!.height) * 100}%`,
                                       width: `${(currentBox.width / canvasRef.current!.width) * 100}%`,
                                       height: `${(currentBox.height / canvasRef.current!.height) * 100}%`
                                   }}
                                />
                            )}
                        </div>
                    )}
                 </div>

                 {outputUrl && (
                     <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm animate-in fade-in">
                         <div className="flex flex-col items-center p-6 bg-[#18181A] border border-white/10 shadow-2xl rounded-2xl">
                             <Check className="w-12 h-12 text-emerald-500 mb-4" />
                             <h3 className="text-xl font-bold text-white mb-2">Redactions Baked In</h3>
                             <p className="text-gray-400 text-sm text-center max-w-xs">Text destroyed. Canvas flattened into a singular high fidelity image output.</p>
                         </div>
                     </div>
                 )}

              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
