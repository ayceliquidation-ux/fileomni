"use client";

import { useState, useRef, useEffect, MouseEvent as ReactMouseEvent, TouchEvent, useCallback } from 'react';
import { UploadCloud, FileText, Download, PenTool, X, ArrowLeft, AlertCircle, Type, MousePointer2, Layers } from 'lucide-react';
import Link from 'next/link';
import { PDFDocument } from 'pdf-lib';
import { Caveat } from 'next/font/google';

const caveat = Caveat({ subsets: ['latin'], weight: ['400', '700'] });

export default function SignPDFPage() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [outputPdfUrl, setOutputPdfUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Signature Input State
  const [inputMode, setInputMode] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  // PDF Preview & Drag State
  const [isPdfjsLoaded, setIsPdfjsLoaded] = useState(false);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  const [signaturePos, setSignaturePos] = useState({ x: 0, y: 0 }); 
  const [isDraggingSignature, setIsDraggingSignature] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [signatureScale, setSignatureScale] = useState(1);

  useEffect(() => {
    // Inject pdf.js CDN script
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
      console.error("Failed to load pdf.js from CDN");
      setError("Failed to load PDF preview engine.");
    };
    document.body.appendChild(script);
  }, []);

  const renderPreview = async (file: File) => {
    if (!isPdfjsLoaded) {
       // Wait 500ms and try again if script is still parsing
       setTimeout(() => renderPreview(file), 500);
       return;
    }
    try {
      const fileBuffer = await file.arrayBuffer();
      const pdfjsLib = (window as any).pdfjsLib;
      const pdf = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
      const page = await pdf.getPage(1);
      
      const viewport = page.getViewport({ scale: 1.5 }); // High-res preview
      const canvas = previewCanvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext('2d');
      if (!context) return;
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      await page.render(renderContext).promise;
      
      // Default position to roughly the center-right of the preview
      setSignaturePos({ 
        x: canvas.clientWidth - (400 * 0.5) - 20,
        y: canvas.clientHeight - (200 * 0.5) - 50 
      });

      setIsPreviewReady(true);
    } catch (err) {
      console.error("Failed to render preview:", err);
    }
  };

  const processFile = (file: File) => {
    if (file.type === "application/pdf") {
      setPdfFile(file);
      setError(null);
      setOutputPdfUrl(null);
      setIsPreviewReady(false);
      clearSignature();
      renderPreview(file);
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
    setPdfFile(null);
    setOutputPdfUrl(null);
    setError(null);
    setIsPreviewReady(false);
    clearSignature();
  };

  // --- DRAW MODE ---
  const startDrawing = (e: ReactMouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = ('clientX' in e) ? e.clientX - rect.left : e.touches[0].clientX - rect.left;
    const y = ('clientY' in e) ? e.clientY - rect.top : e.touches[0].clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: ReactMouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('clientX' in e) ? e.clientX - rect.left : e.touches[0].clientX - rect.left;
    const y = ('clientY' in e) ? e.clientY - rect.top : e.touches[0].clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    updateSignatureData();
  };
  
  const updateSignatureData = () => {
    if (inputMode === 'draw' && canvasRef.current) {
        setSignatureDataUrl(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clearSignature = () => {
    setTypedName("");
    setSignatureDataUrl(null);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    if (hiddenCanvasRef.current) {
      const ctx = hiddenCanvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, hiddenCanvasRef.current.width, hiddenCanvasRef.current.height);
    }
  };

  // --- TYPE MODE ---
  const handleTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setTypedName(text);
    if (!text.trim()) {
        setSignatureDataUrl(null);
        return;
    }

    const canvas = hiddenCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw text in cursive
    ctx.font = `80px ${caveat.style.fontFamily}`;
    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    
    // Draw text at the center of the 400x200 canvas
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    setSignatureDataUrl(canvas.toDataURL('image/png'));
  };

  // --- DRAG LOGIC ---
  const handleDragStart = (e: ReactMouseEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>) => {
      e.stopPropagation();
      setIsDraggingSignature(true);
      const clientX = 'clientX' in e ? e.clientX : e.touches[0].clientX;
      const clientY = 'clientY' in e ? e.clientY : e.touches[0].clientY;
      setDragOffset({
          x: clientX - signaturePos.x,
          y: clientY - signaturePos.y
      });
  };

  const handleDragMove = (e: ReactMouseEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>) => {
      if (!isDraggingSignature) return;
      
      const clientX = 'clientX' in e ? e.clientX : e.touches[0].clientX;
      const clientY = 'clientY' in e ? e.clientY : e.touches[0].clientY;
      
      let newX = clientX - dragOffset.x;
      let newY = clientY - dragOffset.y;

      // Constrain to container
      if (previewContainerRef.current) {
          const rect = previewContainerRef.current.getBoundingClientRect();
          const sigWidth = 400 * 0.5 * signatureScale; 
          const sigHeight = 200 * 0.5 * signatureScale; 
          
          if (newX < 0) newX = 0;
          if (newY < 0) newY = 0;
          if (newX > rect.width - sigWidth) newX = rect.width - sigWidth;
          if (newY > rect.height - sigHeight) newY = rect.height - sigHeight;
      }

      setSignaturePos({ x: newX, y: newY });
  };

  const handleDragEnd = () => {
      setIsDraggingSignature(false);
  };


  // --- PDF MERGE LOGIC ---
  const signDocument = async () => {
    if (!pdfFile || !signatureDataUrl) return;
    setIsProcessing(true);
    setError(null);

    try {
      // 1. Load the original PDF
      const existingPdfBytes = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width: pdfWidth, height: pdfHeight } = firstPage.getSize();

      // 2. Embed the PNG signature
      const signatureImage = await pdfDoc.embedPng(signatureDataUrl);
      
      let finalX = (pdfWidth / 2) - ((signatureImage.width * 0.5 * signatureScale) / 2);
      let finalY = 50;
      let finalSigWidth = signatureImage.width * 0.5 * signatureScale;
      let finalSigHeight = signatureImage.height * 0.5 * signatureScale;

      // Extract accurate coordinate mapping if preview was used
      if (isPreviewReady && previewCanvasRef.current && previewContainerRef.current) {
         const containerRect = previewCanvasRef.current.getBoundingClientRect();
         
         // 3. Calculate Scale: Match the visual scale of the HTML overlay to the PDF
         const sigWidthVisual = 400 * 0.5 * signatureScale;
         const scaleRatio = sigWidthVisual / containerRect.width; 
         finalSigWidth = pdfWidth * scaleRatio;
         finalSigHeight = (finalSigWidth / signatureImage.width) * signatureImage.height;

         // 4. Calculate Coordinates: Map HTML percentages to PDF points and INVERT the Y-axis
         const percentX = signaturePos.x / containerRect.width;
         const percentY = signaturePos.y / containerRect.height;

         finalX = percentX * pdfWidth;
         // INVERT Y: Start at top (pdfHeight), subtract the drop distance, then subtract the image height to anchor bottom-left
         finalY = pdfHeight - (percentY * pdfHeight) - finalSigHeight;
      }

      // 5. Stamp it
      firstPage.drawImage(signatureImage, {
        x: finalX,
        y: finalY,
        width: finalSigWidth,
        height: finalSigHeight,
      });

      // 6. Export and Download
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setOutputPdfUrl(url);

      // Auto-trigger the download like requested
      const link = document.createElement('a');
      link.href = url;
      link.download = `signed_${pdfFile.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      console.error("Signature error:", err);
      setError("Failed to sign the document.");
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <div className="min-h-screen flex flex-col pt-6 pb-24 md:pb-12 bg-[#0A0A0B] text-white selection:bg-indigo-500/30">
      
      {/* Hidden element to force Next.js font rendering on load */}
      <div className={caveat.className} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}>Caveat Loaded</div>
      {/* Hidden Text-to-Signature Canvas */}
      <canvas ref={hiddenCanvasRef} width={400} height={200} className="hidden" />

      <header className="px-6 md:px-12 flex items-center justify-between mb-8 max-w-7xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Tools</span>
        </Link>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 flex flex-col items-center">
        <div className="mb-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-6">
            <PenTool className="w-8 h-8 text-indigo-500" />
          </div>
          <h1 className="text-4xl font-black mb-4 tracking-tight">Sign PDF</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Visually place standard or handwritten signatures onto your documents natively inside your browser. 
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-sm w-full max-w-3xl">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="w-full flex flex-col items-center">
          
          {!pdfFile ? (
            <div className="w-full max-w-2xl">
                <label 
                className={`
                    w-full relative flex flex-col items-center justify-center p-12
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
                />
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 text-indigo-500">
                    <UploadCloud className="w-8 h-8" />
                </div>
                <p className="font-medium text-lg mb-2 text-center text-white">Upload PDF to Sign</p>
                <p className="text-sm text-gray-500 text-center">Drag & drop or click</p>
                </label>
            </div>
          ) : (
            <div className="w-full flex flex-col lg:flex-row gap-8 items-start">
               
               {/* LEFT COLUMN: Controls & Generation */}
               <div className="w-full lg:w-1/3 flex flex-col gap-6 shrink-0 relative">
                    
                    {/* File Header */}
                    <div className="w-full flex items-center justify-between p-4 bg-[#121214] rounded-xl border border-white/5 shadow-inner">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
                                <FileText className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-medium truncate text-white">{pdfFile.name}</p>
                            </div>
                        </div>
                        <button 
                            onClick={removeFile}
                            aria-label="Remove file"
                            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Generator Panel */}
                    <div className="w-full bg-[#121214] border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col">
                        <div className="flex gap-2 mb-6 p-1 bg-black/40 rounded-xl">
                           <button 
                             onClick={() => { setInputMode('draw'); clearSignature(); }}
                             className={`flex-1 py-2 text-sm font-bold flex justify-center items-center gap-2 rounded-lg transition-all ${inputMode === 'draw' ? 'bg-[#2A2A2E] text-white shadow' : 'text-gray-500 hover:text-white'}`}
                           >
                             <PenTool className="w-4 h-4" /> Draw
                           </button>
                           <button 
                             onClick={() => { setInputMode('type'); clearSignature(); }}
                             className={`flex-1 py-2 text-sm font-bold flex justify-center items-center gap-2 rounded-lg transition-all ${inputMode === 'type' ? 'bg-[#2A2A2E] text-white shadow' : 'text-gray-500 hover:text-white'}`}
                           >
                             <Type className="w-4 h-4" /> Type
                           </button>
                        </div>

                        {inputMode === 'draw' ? (
                            <div className="w-full flex flex-col items-center">
                                <div className="flex justify-between w-full mb-2 items-center px-1">
                                    <h3 className="font-medium text-white tracking-tight text-sm">Draw Signature</h3>
                                    <button onClick={clearSignature} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium tracking-wide">
                                        CLEAR
                                    </button>
                                </div>
                                <div className="p-1 bg-white rounded-xl w-full max-w-[400px] overflow-hidden shadow-inner">
                                    <canvas
                                        ref={canvasRef}
                                        width={400}
                                        height={200}
                                        className="bg-white rounded-lg cursor-crosshair touch-none w-full"
                                        onMouseDown={startDrawing}
                                        onMouseMove={draw}
                                        onMouseUp={stopDrawing}
                                        onMouseLeave={stopDrawing}
                                        onTouchStart={startDrawing}
                                        onTouchMove={draw}
                                        onTouchEnd={stopDrawing}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="w-full flex flex-col">
                                <div className="flex justify-between w-full mb-2 items-center px-1">
                                    <h3 className="font-medium text-white tracking-tight text-sm">Type Signature</h3>
                                </div>
                                <input 
                                   type="text"
                                   placeholder="Type your name..."
                                   value={typedName}
                                   onChange={handleTypeChange}
                                   className={`w-full bg-[#1A1A1D] border border-white/10 rounded-xl p-4 text-white text-3xl placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors ${caveat.className}`}
                                />
                            </div>
                        )}

                        {/* Adjustments */}
                        {signatureDataUrl && (
                            <div className="mt-8 pt-6 border-t border-white/5">
                               <div className="flex justify-between items-center mb-4">
                                  <label className="text-sm font-medium text-gray-300">Scale</label>
                                  <span className="text-xs text-gray-500">{Math.round(signatureScale * 100)}%</span>
                               </div>
                               <input 
                                  type="range" 
                                  min="0.2" max="2.0" step="0.1"
                                  value={signatureScale}
                                  onChange={(e) => setSignatureScale(parseFloat(e.target.value))}
                                  className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                               />
                            </div>
                        )}
                        
                        {!outputPdfUrl ? (
                            <button
                                onClick={signDocument}
                                disabled={isProcessing || !signatureDataUrl || !isPreviewReady}
                                className="w-full mt-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-[0_0_20px_-5px_rgba(99,102,241,0.5)] transition-all flex items-center justify-center gap-2 group border border-indigo-400/20 active:scale-95 disabled:opacity-50"
                            >
                                {isProcessing ? "Processing..." : "Sign Document"}
                            </button>
                        ) : (
                            <a
                                href={outputPdfUrl}
                                download={`signed_${pdfFile.name}`}
                                className="w-full mt-6 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 border border-emerald-400/20 transition-all flex items-center justify-center gap-2 group active:scale-95"
                            >
                                <Download className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                                Download PDF
                            </a>
                        )}

                    </div>
               </div>

               {/* RIGHT COLUMN: Interactive Visual Preview */}
               <div className="w-full lg:w-2/3 flex flex-col fade-in bg-[#121214] border border-white/5 rounded-2xl min-h-[500px] lg:min-h-[700px] overflow-hidden relative">
                   <div 
                      ref={previewContainerRef}
                      className="absolute inset-0 flex items-start justify-center p-4 bg-[#0F0F11] overflow-hidden touch-none"
                      onMouseMove={handleDragMove}
                      onTouchMove={handleDragMove}
                      onMouseUp={handleDragEnd}
                      onMouseLeave={handleDragEnd}
                      onTouchEnd={handleDragEnd}
                   >
                       {!isPreviewReady && (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-gray-600 opacity-60">
                                <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                <p className="font-medium tracking-wide text-sm">Rendering PDF Preview...</p>
                            </div>
                       )}
                       
                       {/* The Base PDF Image rendered by pdfjs */}
                       <canvas 
                          ref={previewCanvasRef} 
                          className={`shadow-2xl transition-opacity duration-300 w-auto h-auto max-h-full max-w-full object-contain ${isPreviewReady ? 'opacity-100' : 'opacity-0'}`}
                       />

                       {/* Draggable Signature Overlay */}
                       {isPreviewReady && signatureDataUrl && (
                          <div 
                             className="absolute cursor-move touch-none z-20 group"
                             style={{ 
                                left: `${signaturePos.x}px`, 
                                top: `${signaturePos.y}px`,
                                width: `${400 * 0.5 * signatureScale}px`,
                                height: `${200 * 0.5 * signatureScale}px`
                             }}
                             onMouseDown={handleDragStart}
                             onTouchStart={handleDragStart}
                          >
                             <div className="absolute -inset-2 border-2 border-dashed border-indigo-500/0 group-hover:border-indigo-500/50 rounded-lg transition-colors flex items-center justify-center">
                                <MousePointer2 className="absolute -top-4 -right-4 w-6 h-6 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                             </div>
                             <img 
                               src={signatureDataUrl} 
                               draggable={false}
                               className="w-full h-full object-contain pointer-events-none drop-shadow-md" 
                               alt="Signature Overlay"
                             />
                          </div>
                       )}

                   </div>
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
