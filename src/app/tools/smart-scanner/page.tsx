'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { ArrowLeft, Camera, Download, RotateCcw, AlertCircle, Upload, Image as ImageIcon, Sparkles, FileText, X } from 'lucide-react';
import { ToolInstructions } from '@/components/ToolInstructions';
import { PDFDocument } from 'pdf-lib';

type ScanMode = 'camera' | 'upload';

export default function SmartScannerPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const guideBoxRef = useRef<HTMLDivElement>(null);
  
  const [scanMode, setScanMode] = useState<ScanMode>('camera');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [rawCroppedImage, setRawCroppedImage] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{width: number, height: number} | null>(null);
  const [step, setStep] = useState<'camera' | 'result'>('camera');
  const [filterMode, setFilterMode] = useState<'color' | 'bw'>('color');
  const [scannedPages, setScannedPages] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isOpenCvLoaded, setIsOpenCvLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const startCamera = useCallback(async () => {
    setError(null);
    setCapturedImage(null);
    setIsCameraActive(true);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true
      });
      
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      setError(`Camera Error: ${err.message || 'Could not access the camera. Please ensure you have granted permission and a camera is available.'}`);
      setIsCameraActive(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  // Clean up on unmount removed to survive React 18 Strict Mode double-firing
  useEffect(() => {
    return () => {
      // Intentionally empty. We only manually clean up on Capture or Mode Switch.
    };
  }, []);

  // Switch mode handling
  const handleModeSwitch = (mode: ScanMode) => {
    if (mode === 'upload') {
      stopCamera();
    }
    setScanMode(mode);
    setCapturedImage(null);
    setRawCroppedImage(null);
    setOriginalImage(null);
    setImageDimensions(null);
    setStep('camera');
    setFilterMode('color');
    setError(null);
  };

  const captureDocument = () => {
    if (!videoRef.current || !canvasRef.current || !guideBoxRef.current) return;
    
    const video = videoRef.current;
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;
    
    const canvas = canvasRef.current;
    const guideBox = guideBoxRef.current;
    
    const videoRect = video.getBoundingClientRect();
    const guideRect = guideBox.getBoundingClientRect();

    const videoRatio = video.videoWidth / video.videoHeight;
    const elementRatio = videoRect.width / videoRect.height;
    
    let renderedWidth = videoRect.width;
    let renderedHeight = videoRect.height;
    let offsetX = 0;
    let offsetY = 0;

    if (videoRatio > elementRatio) {
      renderedHeight = videoRect.width / videoRatio;
      offsetY = (videoRect.height - renderedHeight) / 2;
    } else {
      renderedWidth = videoRect.height * videoRatio;
      offsetX = (videoRect.width - renderedWidth) / 2;
    }

    const scale = video.videoWidth / renderedWidth;

    const cropX = (guideRect.left - (videoRect.left + offsetX)) * scale;
    const cropY = (guideRect.top - (videoRect.top + offsetY)) * scale;
    const cropWidth = guideRect.width * scale;
    const cropHeight = guideRect.height * scale;
    
    canvas.width = cropWidth;
    canvas.height = cropHeight;
    
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(
        video,
        Math.max(0, cropX),
        Math.max(0, cropY),
        Math.min(video.videoWidth, cropWidth),
        Math.min(video.videoHeight, cropHeight),
        0, 0,
        Math.min(video.videoWidth, cropWidth),
        Math.min(video.videoHeight, cropHeight)
      );
      
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setOriginalImage(imageDataUrl);
      setRawCroppedImage(imageDataUrl);
      setCapturedImage(imageDataUrl);
      setFilterMode('color');
      
      stopCamera();
      setStep('result');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        // Draw the image onto the hidden canvas to standardize format
        const img = new Image();
        img.onload = () => {
          if (canvasRef.current) {
             const canvas = canvasRef.current;
             canvas.width = img.width;
             canvas.height = img.height;
             const ctx = canvas.getContext('2d');
             if (ctx) {
               ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
               const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
               setImageDimensions({ width: img.width, height: img.height });
               setOriginalImage(imageDataUrl);
               setRawCroppedImage(imageDataUrl);
               setCapturedImage(imageDataUrl);
               setFilterMode('color');
               setStep('result');
             }
          }
        };
        img.src = event.target.result.toString();
      }
    };
    reader.onerror = () => {
      setError('Failed to read the file.');
    };
    reader.readAsDataURL(file);
    setError(null);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const downloadImage = () => {
    if (!capturedImage) return;
    
    const a = document.createElement('a');
    a.href = capturedImage;
    a.download = `smart-scan-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadPdf = async () => {
    if (!capturedImage) return;
    setIsProcessing(true);
    setError(null);
    try {
      const pdfDoc = await PDFDocument.create();
      
      const allPages = [...scannedPages, capturedImage];
      
      for (const pageImage of allPages) {
        // Get image bytes from data URL
        const base64Data = pageImage.split(',')[1];
        const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
        const image = await pdfDoc.embedJpg(imageBytes);
        const { width, height } = image.scale(1);
        
        const page = pdfDoc.addPage([width, height]);
        page.drawImage(image, {
          x: 0,
          y: 0,
          width,
          height,
        });
      }
      
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `smart-scan-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation error:", err);
      setError("Failed to create PDF document.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetake = () => {
    setScannedPages([]);
    setCapturedImage(null);
    setRawCroppedImage(null);
    setOriginalImage(null);
    setImageDimensions(null);
    setStep('camera');
    setFilterMode('color');
    setError(null);
    if (scanMode === 'camera') {
      startCamera();
    } else {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleScanNextPage = () => {
    // Extract canvas image using toDataURL if available, fallback to capturedImage
    if (canvasRef.current) {
      setScannedPages(prev => [...prev, canvasRef.current!.toDataURL('image/jpeg', 0.9)]);
    } else if (capturedImage) {
      setScannedPages(prev => [...prev, capturedImage]);
    }
    setCapturedImage(null);
    setRawCroppedImage(null);
    setOriginalImage(null);
    setImageDimensions(null);
    setStep('camera');
    setFilterMode('color');
    setError(null);
    if (scanMode === 'camera') {
      startCamera();
    } else {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    
    const newPages = [...scannedPages];
    const [draggedItem] = newPages.splice(draggedIndex, 1);
    newPages.splice(targetIndex, 0, draggedItem);
    
    setScannedPages(newPages);
    setDraggedIndex(null);
  };

  const removePage = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newPages = [...scannedPages];
    newPages.splice(index, 1);
    setScannedPages(newPages);
  };

  const applyFilter = useCallback(() => {
    if (!rawCroppedImage || !canvasRef.current) return;
    
    if (filterMode === 'color') {
      setCapturedImage(rawCroppedImage);
      return;
    }
    
    if (filterMode === 'bw' && !isOpenCvLoaded) {
      setError("Document processor is still loading, please wait.");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // @ts-ignore
      const cv = window.cv;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const img = new window.Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        let src = cv.imread(canvas);
        let dst = new cv.Mat();
        
        cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY, 0);
        
        // Xerox filter (Adaptive Thresholding)
        // src, dst, maxValue, adaptiveMethod, thresholdType, blockSize, C
        cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 21, 10);
        
        cv.imshow(canvas, dst);
        setCapturedImage(canvas.toDataURL('image/jpeg', 0.9));
        
        src.delete(); dst.delete();
        setIsProcessing(false);
      };
      img.src = rawCroppedImage;
    } catch (err: any) {
      console.error(err);
      setError("Failed to apply document filter.");
      setIsProcessing(false);
    }
  }, [rawCroppedImage, filterMode, isOpenCvLoaded]);

  useEffect(() => {
    applyFilter();
  }, [applyFilter]);

  return (
    <main className="min-h-screen bg-[#0A0A0B] text-white p-4 md:p-8">
      <Script 
        id="opencv-script"
        src="https://docs.opencv.org/4.8.0/opencv.js" 
        strategy="lazyOnload"
        onReady={() => {
            // @ts-ignore
            if (window.cv) {
                setIsOpenCvLoaded(true);
            }
        }}
      />
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Tools
        </Link>

        {/* SEO Headers */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 mb-4">
            Free Online Document Scanner (Use Your Device Camera)
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed">
            Instantly scan documents, receipts, and notes using your laptop or phone camera. Completely free, no downloads, and processed 100% locally on your device for maximum privacy.
          </p>
        </div>
        
        <div className="bg-[#121214] border border-white/5 rounded-3xl p-4 md:p-6 mb-6 shadow-2xl">
          <div className="flex flex-col items-center">
            
            {/* Mode selection tabs */}
            {!capturedImage && (
              <div className="flex bg-black/50 p-1.5 rounded-xl border border-white/10 mb-8 w-full max-w-md">
                <button
                  onClick={() => handleModeSwitch('camera')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                    scanMode === 'camera' 
                      ? 'bg-indigo-600 shadow-md text-white' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  Use Camera
                </button>
                <button
                  onClick={() => handleModeSwitch('upload')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                    scanMode === 'upload' 
                      ? 'bg-indigo-600 shadow-md text-white' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Upload Image
                </button>
              </div>
            )}

            {error && (
              <div className="w-full mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-start gap-3 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            {previewIndex !== null ? (
              <div className="w-full flex flex-col items-center gap-6">
                <div className="relative w-full max-w-2xl bg-[#0A0A0B] rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex justify-center">
                  <img src={scannedPages[previewIndex]} className="w-full max-h-[60vh] object-contain rounded-md" alt={`Preview Page ${previewIndex + 1}`} />
                </div>
                <button 
                  onClick={() => setPreviewIndex(null)}
                  className="px-6 py-3.5 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-xl transition-all"
                >
                  Close Preview
                </button>
              </div>
            ) : (
              <>
            {/* Step 1: Camera or Upload Selection */}
            {step === 'camera' && (
              <div className="w-full flex flex-col items-center gap-6">
                
                {/* Permanent Video Element for live feed */}
                <div className={isCameraActive ? "relative w-full flex justify-center block overflow-hidden rounded-lg bg-black" : "hidden"}>
                  <video 
                    ref={videoRef}
                    playsInline 
                    muted
                    onLoadedMetadata={() => videoRef.current?.play().catch(e => console.error(e))}
                    className="block w-full max-h-[60vh] object-contain"
                  />
                  
                  {/* Aiming guide overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div 
                      ref={guideBoxRef}
                      className="w-4/5 max-h-[90%] aspect-[8.5/11] border-4 border-white border-dashed rounded-sm shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]"
                    />
                  </div>
                </div>

                {scanMode === 'camera' && !isCameraActive && !error && (
                  <div className="w-full aspect-[3/4] md:aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center text-center p-6 flex-col">
                    <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4">
                      <Camera className="w-8 h-8 text-indigo-400" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Camera Ready</h3>
                    <p className="text-gray-400 max-w-sm mb-6">
                      Start your camera to scan a document securely on your device.
                    </p>
                    <button 
                      onClick={startCamera}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors shadow-lg shadow-indigo-900/20"
                    >
                      Start Camera Feed
                    </button>
                  </div>
                )}
                
                {scanMode === 'upload' && (
                  <div 
                    onClick={triggerFileUpload}
                    className="w-full border-2 border-dashed border-indigo-500/30 rounded-2xl p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-indigo-500/5 transition-all group min-h-[400px]"
                  >
                    <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <ImageIcon className="w-10 h-10 text-indigo-400" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Upload Document</h3>
                    <p className="text-gray-400 max-w-sm mb-6">
                      Select an image of a document to scan and convert to a standard format.
                    </p>
                    <button className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors">
                      Select File
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                )}

                {scanMode === 'camera' && isCameraActive && (
                  <button 
                    onClick={captureDocument}
                    className="flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg shadow-indigo-900/40 border border-indigo-400/20"
                  >
                    <Camera className="w-5 h-5" />
                    Capture Document
                  </button>
                )}

                {/* How it Works Section for SEO/UX */}
                {scanMode === 'camera' && (
                  <div className="w-full mt-4 bg-black/30 border border-white/5 rounded-2xl p-6 text-left">
                    <h2 className="text-xl font-bold mb-4 text-white">How it Works</h2>
                    <ul className="text-gray-400 space-y-3">
                      <li className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-sm font-bold shrink-0">1</span>
                        <span>Allow camera access.</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-sm font-bold shrink-0">2</span>
                        <span>Hold your document up to the screen.</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-sm font-bold shrink-0">3</span>
                        <span>Capture and save as a PDF or image.</span>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Result and Download */}
            {step === 'result' && capturedImage && (
              <div className="w-full flex flex-col items-center gap-6">
                
                {/* Filter Toggle */}
                <div className="flex bg-black/50 p-1.5 rounded-xl border border-white/10 w-full max-w-sm">
                  <button
                    onClick={() => setFilterMode('color')}
                    disabled={isProcessing}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                      filterMode === 'color' 
                        ? 'bg-indigo-600 shadow-md text-white' 
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    } disabled:opacity-50`}
                  >
                    Original Color
                  </button>
                  <button
                    onClick={() => setFilterMode('bw')}
                    disabled={isProcessing || !isOpenCvLoaded}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                      filterMode === 'bw' 
                        ? 'bg-indigo-600 shadow-md text-white' 
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    } disabled:opacity-50`}
                  >
                    B&W Scan
                  </button>
                </div>

                {scannedPages.length > 0 && (
                  <div className="flex gap-4 overflow-x-auto w-full max-w-2xl py-2 px-1 scrollbar-thin scrollbar-thumb-white/10">
                    {scannedPages.map((pageImage, index) => (
                      <div
                        key={index}
                        draggable={true}
                        onDragStart={() => setDraggedIndex(index)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDrop(e, index)}
                        onClick={() => setPreviewIndex(index)}
                        className="relative w-20 h-28 shrink-0 rounded-lg overflow-hidden border-2 border-white/20 cursor-move cursor-pointer group opacity-70 hover:opacity-100 hover:border-indigo-500 transition-all bg-black/50"
                      >
                        <img src={pageImage} alt={`Page ${index + 1}`} className="w-full h-full object-contain pointer-events-none" />
                        <button
                          onClick={(e) => { e.stopPropagation(); removePage(index, e); }}
                          className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-sm"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/80 rounded text-[10px] text-white font-bold">
                          {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-sm text-gray-400 font-medium pb-2">
                  Page {scannedPages.length + 1} of {scannedPages.length + 1}
                </div>

                <div className="relative w-full max-w-2xl bg-[#0A0A0B] rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={capturedImage} 
                    alt="Captured document" 
                    className={`w-full h-auto max-h-[50vh] object-contain transition-opacity duration-300 ${isProcessing ? 'opacity-50' : 'opacity-100'}`}
                  />
                  {isProcessing && (
                     <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                     </div>
                  )}
                </div>
                
                <div className="flex flex-wrap items-center justify-center gap-4 w-full">
                  <button 
                    onClick={handleRetake}
                    className="flex items-center gap-2 px-6 py-3.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white font-medium rounded-xl transition-all"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Clear All & Restart
                  </button>
                  <button 
                    onClick={handleScanNextPage}
                    className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-indigo-900/30"
                  >
                    <Camera className="w-4 h-4" />
                    Scan Next Page
                  </button>
                  <button 
                    onClick={downloadImage}
                    className="flex items-center gap-2 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-900/30"
                  >
                    <Download className="w-5 h-5" />
                    Download Image
                  </button>
                  <button 
                    onClick={downloadPdf}
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-8 py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-rose-900/30 disabled:opacity-50"
                  >
                    <FileText className="w-5 h-5" />
                    Download PDF
                  </button>
                </div>
              </div>
            )}
              </>
            )}
            
            {/* Hidden canvas for processing image data */}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>

        <div className="mt-8">
          <ToolInstructions steps={[
            "Choose Camera or Upload mode",
            "Align your document or select an image",
            "Capture and download the scan directly"
          ]} />
        </div>
      </div>
    </main>
  );
}
