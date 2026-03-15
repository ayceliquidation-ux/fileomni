"use client";

import { useState, useRef, useEffect, useCallback, MouseEvent as ReactMouseEvent } from 'react';
import { UploadCloud, FileText, Download, Minimize2, ArrowLeft, AlertCircle, RefreshCw, Type, PenTool } from 'lucide-react';
import Link from 'next/link';
import type * as pdfjsLibTypes from 'pdfjs-dist';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';



interface TextItem {
  id: string;
  text: string;
  x: number;
  y: number;
  isEditing: boolean;
}

export default function EditPdfPage() {
  // Set up PDF.js worker securely on the client side only
  useEffect(() => {
    (async () => {
      if (typeof window !== 'undefined') {
        if (typeof Promise.withResolvers === 'undefined') {
          (window as any).Promise.withResolvers = function() {
            let resolve, reject;
            const promise = new Promise((res, rej) => {
              resolve = res;
              reject = rej;
            });
            return { promise, resolve, reject };
          };
        }
        // @ts-ignore
        const pdfjsLib = await import(/* webpackIgnore: true */ 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs');
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';
        }
      }
    })();
  }, []);

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  
  const [pdfDimensions, setPdfDimensions] = useState({ width: 0, height: 0 });
  const [activeTool, setActiveTool] = useState<'text' | 'draw' | null>(null);
  
  // Canvas Refs
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Drawing State
  const [isDrawing, setIsDrawing] = useState(false);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  
  // Text State
  const [textItems, setTextItems] = useState<TextItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load PDF into Canvas
  useEffect(() => {
    let renderTask: pdfjsLibTypes.RenderTask | null = null;
    let isCancelled = false;

    const renderPdf = async () => {
      if (!file || !pdfCanvasRef.current || !drawCanvasRef.current) return;
      
      try {
        if (typeof window !== 'undefined' && typeof Promise.withResolvers === 'undefined') {
          (window as any).Promise.withResolvers = function() {
            let resolve, reject;
            const promise = new Promise((res, rej) => {
              resolve = res;
              reject = rej;
            });
            return { promise, resolve, reject };
          };
        }
        // @ts-ignore
        const pdfjsLib = await import(/* webpackIgnore: true */ 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs');
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';
        
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument(arrayBuffer);
        const pdf = await loadingTask.promise;
        
        if (isCancelled) return;
        
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });
        
        setPdfDimensions({ width: viewport.width, height: viewport.height });
        
        const canvas = pdfCanvasRef.current;
        const drawCanvas = drawCanvasRef.current;
        
        if (!canvas || !drawCanvas) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        drawCanvas.width = viewport.width;
        drawCanvas.height = viewport.height;
        
        const context = canvas.getContext('2d');
        const drawContext = drawCanvas.getContext('2d');
        
        if (!context || !drawContext) return;
        
        setCtx(drawContext);
        
        // Setup initial drawing styles
        drawContext.lineWidth = 3;
        drawContext.lineCap = 'round';
        drawContext.lineJoin = 'round';
        drawContext.strokeStyle = 'blue';

        renderTask = page.render({ canvasContext: context as any, viewport } as any);
        if (renderTask) {
          await renderTask.promise;
        }
        
      } catch (err: any) {
        if (!isCancelled && err.name !== 'RenderingCancelledException') {
          console.error('Error rendering PDF:', err);
          setError('Failed to render PDF preview.');
        }
      }
    };

    renderPdf();

    return () => {
      isCancelled = true;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [file]);

  const handleFileSelect = (newFile: File) => {
    if (newFile.type === 'application/pdf') {
      setFile(newFile);
      setError(null);
      setOutputUrl(null);
      setTextItems([]);
      setActiveTool(null);
    } else {
      setError('Please upload a valid PDF file.');
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
  }, []);

  // Drawing Handlers
  const startDrawing = (e: ReactMouseEvent | React.TouchEvent) => {
    if (activeTool !== 'draw' || !ctx || !drawCanvasRef.current) return;
    setIsDrawing(true);
    const rect = drawCanvasRef.current.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as ReactMouseEvent).clientX;
      clientY = (e as ReactMouseEvent).clientY;
    }

    // Calculate scaling factor between actual DOM size and internal canvas resolution
    const scaleX = drawCanvasRef.current.width / rect.width;
    const scaleY = drawCanvasRef.current.height / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: ReactMouseEvent | React.TouchEvent) => {
    if (!isDrawing || activeTool !== 'draw' || !ctx || !drawCanvasRef.current) return;
    
    // Prevent scrolling while drawing on touch devices
    if ('touches' in e && e.cancelable) {
       e.preventDefault();
    }
    
    const rect = drawCanvasRef.current.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as ReactMouseEvent).clientX;
      clientY = (e as ReactMouseEvent).clientY;
    }

    const scaleX = drawCanvasRef.current.width / rect.width;
    const scaleY = drawCanvasRef.current.height / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing && ctx) {
      ctx.closePath();
      setIsDrawing(false);
    }
  };

  // Text Handlers
  const handleCanvasClick = (e: ReactMouseEvent) => {
    if (activeTool !== 'text' || !containerRef.current || !pdfCanvasRef.current) return;

    // Check if we clicked on an existing text input
    if ((e.target as HTMLElement).tagName.toLowerCase() === 'textarea') return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newItem: TextItem = {
      id: Date.now().toString(),
      text: '',
      x,
      y,
      isEditing: true
    };

    setTextItems(prev => [...prev.map(item => ({ ...item, isEditing: false })), newItem]);
  };

  const updateTextItem = (id: string, newText: string) => {
    setTextItems(prev => prev.map(item => item.id === id ? { ...item, text: newText } : item));
  };

  const finalizeTextItem = (id: string) => {
    setTextItems(prev => prev.filter(item => item.text.trim() !== '' || item.id !== id).map(item => item.id === id ? { ...item, isEditing: false } : item));
  };

  // Export Logic
  const handleExport = async () => {
    if (!file || !pdfCanvasRef.current || !drawCanvasRef.current || !containerRef.current) return;
    setIsProcessing(true);
    setError(null);

    try {
      const existingPdfBytes = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      
      const { width: pdfWidth, height: pdfHeight } = firstPage.getSize();
      
      const canvasWidth = pdfCanvasRef.current.width;
      const canvasHeight = pdfCanvasRef.current.height;

      // 1. Embed Freehand Drawing Canvas
      // Extract drawing overlay as transparent PNG
      const drawDataUrl = drawCanvasRef.current.toDataURL('image/png');
      const pngImageBytes = await fetch(drawDataUrl).then(res => res.arrayBuffer());
      const pngImage = await pdfDoc.embedPng(pngImageBytes);

      // Draw the transparent image overlay bounding the entire page
      firstPage.drawImage(pngImage, {
        x: 0,
        y: 0,
        width: pdfWidth,
        height: pdfHeight,
      });

      // 2. Embed User Text Overlays
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const containerRect = containerRef.current.getBoundingClientRect();

      textItems.forEach(item => {
        if (!item.text) return;
        
        // We use the raw DOM bounds here to map ratio perfectly
        // Map DOM X (pixels) -> PDF Points
        const xRatio = pdfWidth / containerRect.width;
        const textX = item.x * xRatio;

        // Map DOM Y (pixels Top-Left) -> PDF Points (Bottom-Left)
        // Adjust vertically for font ascender roughly (DOM clicks are usually top-left of the text block)
        const yRatio = pdfHeight / containerRect.height;
        const textY = pdfHeight - (item.y * yRatio) - 16; 
        
        // Approximate standard DOM size conversion (16px ~ 12pt)
        const fontSize = 16 * xRatio;

        firstPage.drawText(item.text, {
          x: textX,
          y: textY,
          size: fontSize,
          font: helveticaFont,
          color: rgb(0.1, 0.4, 0.9), // Match the blue drawing stroke roughly, or make it customizable later
        });
      });

      // Export Final PDF
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setOutputUrl(url);
    } catch (err) {
      console.error('Export Error:', err);
      setError('Failed to merge and export the PDF document.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartOver = () => {
    setFile(null);
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);
    setTextItems([]);
    setActiveTool(null);
    if (drawCanvasRef.current && ctx) {
      ctx.clearRect(0, 0, drawCanvasRef.current.width, drawCanvasRef.current.height);
    }
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col pt-6 pb-24 md:pb-12 bg-[#0A0A0B] text-white selection:bg-blue-500/30">
      <header className="px-6 md:px-12 flex items-center justify-between mb-8 max-w-7xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Tools</span>
        </Link>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 flex flex-col items-center">
        <div className="mb-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-6">
            <PenTool className="w-8 h-8 text-blue-500" />
          </div>
          <h1 className="text-4xl font-black mb-4 tracking-tight">Edit PDF</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Locally add custom text overlays and freehand drawings directly onto your PDF documents securely.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-sm w-full max-w-2xl mx-auto animate-in fade-in">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="w-full flex flex-col items-center max-w-3xl mx-auto space-y-8">
          
          {!file ? (
            <label 
              className={`
                w-full relative flex flex-col items-center justify-center p-12
                border-2 border-dashed rounded-2xl transition-all duration-200 cursor-pointer
                ${isDragging 
                  ? 'border-blue-500 bg-blue-500/5' 
                  : 'border-white/10 bg-[#121214] hover:border-blue-500/50 hover:bg-[#18181A]'
                }
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input 
                type="file" 
                accept="application/pdf"
                onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="Upload PDF"
              />
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 text-blue-500">
                <UploadCloud className="w-8 h-8" />
              </div>
              <p className="font-medium text-lg mb-2 text-center text-white">Upload your PDF document</p>
              <p className="text-sm text-gray-500 text-center">Drag & drop your file or click to browse</p>
            </label>
          ) : (
            <div className="w-full bg-[#121214] border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col animate-in fade-in zoom-in-95 duration-300">
               
               {!outputUrl ? (
                   <>
                       <div className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5 mb-6">
                           <div className="flex items-center gap-3">
                               <FileText className="w-6 h-6 text-blue-400" />
                               <p className="text-sm font-medium truncate text-gray-300 max-w-[200px]">{file.name}</p>
                           </div>
                           
                           {/* Floating Toolbar */}
                           <div className="flex items-center gap-2 bg-[#1A1A1D] p-1.5 rounded-lg border border-white/10">
                               <button
                                   onClick={() => setActiveTool(activeTool === 'text' ? null : 'text')}
                                   className={`p-2 rounded-md transition-colors flex flex-col items-center gap-1 ${activeTool === 'text' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                   title="Add Text"
                               >
                                   <Type className="w-4 h-4" />
                                   <span className="text-[10px] font-bold">TEXT</span>
                               </button>
                               <button
                                   onClick={() => setActiveTool(activeTool === 'draw' ? null : 'draw')}
                                   className={`p-2 rounded-md transition-colors flex flex-col items-center gap-1 ${activeTool === 'draw' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                   title="Freehand Draw"
                               >
                                   <PenTool className="w-4 h-4" />
                                   <span className="text-[10px] font-bold">DRAW</span>
                               </button>
                           </div>
                       </div>

                       <div className="w-full flex justify-center bg-black/20 rounded-xl p-4 border border-white/5 overflow-x-auto custom-scrollbar">
                           <div 
                                className="relative select-none shadow-2xl" 
                                ref={containerRef}
                                onClick={handleCanvasClick}
                                style={{ 
                                    width: pdfDimensions.width ? `${pdfDimensions.width}px` : 'auto', 
                                    height: pdfDimensions.height ? `${pdfDimensions.height}px` : 'auto',
                                    cursor: activeTool === 'text' ? 'text' : activeTool === 'draw' ? 'crosshair' : 'default'
                                }}
                           >
                               <canvas 
                                   ref={pdfCanvasRef} 
                                   className="rounded-sm bg-white block w-full h-full touch-none"
                               />
                               
                               <canvas 
                                   ref={drawCanvasRef}
                                   className={`absolute inset-0 w-full h-full rounded-sm block touch-none ${activeTool !== 'draw' ? 'pointer-events-none' : ''}`}
                                   onPointerDown={startDrawing}
                                   onPointerMove={draw}
                                   onPointerUp={stopDrawing}
                                   onPointerOut={stopDrawing}
                                   onPointerCancel={stopDrawing}
                               />

                               {textItems.map(item => (
                                   <div
                                       key={item.id}
                                       className="absolute"
                                       style={{
                                           left: `${item.x}px`,
                                           top: `${item.y}px`,
                                           transform: 'translateY(-20%)' // Align slightly so click target matches roughly text baseline visual
                                       }}
                                   >
                                       {item.isEditing ? (
                                           <textarea
                                               autoFocus
                                               value={item.text}
                                               onChange={e => updateTextItem(item.id, e.target.value)}
                                               onBlur={() => finalizeTextItem(item.id)}
                                               className="bg-transparent border border-blue-500 border-dashed text-blue-600 outline-none resize-none p-1 m-0 font-sans font-medium leading-none"
                                               style={{
                                                    fontSize: '16px', 
                                                    minWidth: '10px', 
                                                    width: `${Math.max(50, item.text.length * 10 + 20)}px`,
                                                    height: '30px',
                                                    overflow: 'hidden'
                                               }}
                                               placeholder="Type here..."
                                               title="Enter text"
                                           />
                                       ) : (
                                           <div 
                                                className="text-blue-600 font-sans font-medium p-1 cursor-text hover:outline hover:outline-1 hover:outline-blue-400"
                                                onClick={() => {
                                                    if (activeTool === 'text') {
                                                        setTextItems(prev => prev.map(t => t.id === item.id ? { ...t, isEditing: true } : { ...t, isEditing: false }));
                                                    }
                                                }}
                                                style={{ fontSize: '16px', lineHeight: '1' }}
                                           >
                                               {item.text}
                                           </div>
                                       )}
                                   </div>
                               ))}
                           </div>
                       </div>
                       
                       <div className="flex flex-col gap-2 mt-6">
                           <button
                               onClick={handleExport}
                               disabled={isProcessing}
                               className={`w-full py-4 font-bold rounded-xl transition-all flex items-center justify-center gap-2 group border active:scale-95 ${
                                   isProcessing 
                                   ? 'bg-blue-600/50 text-blue-200 border-blue-500/20 cursor-not-allowed opacity-80' 
                                   : 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_-5px_rgba(59,130,246,0.5)] border-blue-400/20'
                               }`}
                           >
                               {isProcessing ? (
                                   <>
                                       <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                           <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                           <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                       </svg>
                                       Generating Output...
                                   </>
                               ) : (
                                   <>
                                       <Download className="w-5 h-5 group-hover:translate-y-1 transition-transform" />
                                       Export Edited PDF
                                   </>
                               )}
                           </button>

                           {!isProcessing && (
                              <button 
                                   onClick={handleStartOver}
                                   className="w-full py-3 mt-2 bg-transparent hover:bg-white/5 text-gray-400 hover:text-white text-sm font-medium rounded-xl transition-colors"
                              >
                                   Cancel
                              </button>
                           )}
                       </div>
                   </>
               ) : (
                  <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                     <div className="w-full p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-6 flex flex-col items-center justify-center">
                         <p className="text-emerald-400 font-bold mb-1">Editing Complete!</p>
                         <p className="text-sm text-gray-400">Your documents have been securely processed.</p>
                     </div>

                     <div className="flex gap-4 w-full">
                         <button 
                              onClick={handleStartOver}
                              title="Start Over"
                              className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 transition-all flex items-center justify-center mb-0"
                         >
                              <RefreshCw className="w-5 h-5" />
                         </button>
                         <a
                              href={outputUrl}
                              download={`Edited_${file.name}`}
                              className="w-3/4 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 border border-emerald-400/20 transition-all flex items-center justify-center gap-2 group active:scale-95"
                         >
                              <Download className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                              Download File
                         </a>
                     </div>
                  </div>
               )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
