"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { 
  UploadCloud, 
  FileText, 
  AlertCircle,
  ArrowLeft,
  X,
  Sparkles,
  Layers,
  Download
} from "lucide-react";
import Link from "next/link";
import { PDFDocument } from 'pdf-lib';

export default function SmartScannerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isCvLoaded, setIsCvLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Interactive Scanning State
  const [corners, setCorners] = useState<{x: number, y: number}[] | null>(null);
  const [draggingCornerIndex, setDraggingCornerIndex] = useState<number | null>(null);
  const [isFlattened, setIsFlattened] = useState(false);
  const [filterMode, setFilterMode] = useState<'color' | 'bw'>('color');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalMatRef = useRef<any>(null);
  const initialDisplaySize = useRef({ width: 0, height: 0 });

  const [isCameraMode, setIsCameraMode] = useState(false);
  const [currentFacingMode, setCurrentFacingMode] = useState<string>("environment");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Inject OpenCV.js WebAssembly Engine
  useEffect(() => {
    if (document.getElementById("opencv-cdn")) {
      if ((window as any).cv) setIsCvLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.id = "opencv-cdn";
    script.src = "https://docs.opencv.org/4.8.0/opencv.js";
    script.async = true;
    
    script.onload = () => {
      const cv = (window as any).cv;
      
      // Sometimes OpenCV takes a moment to fully initialize its WASM backend
      if (cv && cv.getBuildInformation) {
         setIsCvLoaded(true);
      } else if (cv) {
         cv.onRuntimeInitialized = () => {
            setIsCvLoaded(true);
         };
      }
    };
    script.onerror = () => {
      console.error("Failed to load OpenCV.js from CDN");
      setError("Failed to initialize the Computer Vision Engine. Please check your internet connection.");
    };
    
    document.body.appendChild(script);
  }, []);

  // Master Draw Loop: Handles Background Image + Interactive Corner Handles
  const drawCanvas = useCallback(() => {
    if (!canvasRef.current || !imageSrc || isFlattened) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Scale bounds 
      const containerWidth = canvas.parentElement?.clientWidth || 800;
      const containerHeight = canvas.parentElement?.clientHeight || 600;
      const scale = Math.min(containerWidth / img.width, containerHeight / img.height);
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;

      canvas.width = scaledWidth;
      canvas.height = scaledHeight;

      // 1. Draw Original Photograph
      ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);

      const cv = (window as any).cv;
      if (cv && canvasRef.current) {
        if (!originalMatRef.current || originalMatRef.current.cols !== scaledWidth || originalMatRef.current.rows !== scaledHeight) {
           if (originalMatRef.current) originalMatRef.current.delete();
           originalMatRef.current = cv.imread(canvasRef.current);
        }
      }

      // 2. Draw Interactive Bounding Polygon (Neon Green)
      if (corners && corners.length === 4) {
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        ctx.lineTo(corners[1].x, corners[1].y);
        ctx.lineTo(corners[2].x, corners[2].y);
        ctx.lineTo(corners[3].x, corners[3].y);
        ctx.closePath();
        
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(16, 185, 129, 1)"; // Emerald-500
        ctx.stroke();
        
        ctx.fillStyle = "rgba(16, 185, 129, 0.1)"; // Light Green overlay
        ctx.fill();

        // 3. Draw Physical Grab Handles
        corners.forEach((corner, i) => {
          ctx.beginPath();
          ctx.arc(corner.x, corner.y, 8, 0, 2 * Math.PI);
          
          // Hover/Active drag states
          if (draggingCornerIndex === i) {
            ctx.fillStyle = "rgba(16, 185, 129, 1)"; 
            ctx.strokeStyle = "#FFFFFF";
            ctx.lineWidth = 3;
          } else {
            ctx.fillStyle = "#FFFFFF";
            ctx.strokeStyle = "rgba(16, 185, 129, 1)";
            ctx.lineWidth = 2;
          }
          
          ctx.fill();
          ctx.stroke();
        });
      }
    };
    img.src = imageSrc;
  }, [imageSrc, corners, draggingCornerIndex, isFlattened]);

  useEffect(() => {
    if (imageSrc) drawCanvas();
  }, [imageSrc, corners, draggingCornerIndex, isFlattened, drawCanvas]);

  const processFile = (newFile: File) => {
    setError(null);
    if (!newFile.type.startsWith('image/')) {
      setError("Please upload a valid image file (JPG, PNG).");
      return;
    }
    
    setFile(newFile);
    
    // Convert to ObjectURL for drawing to canvas
    const url = URL.createObjectURL(newFile);
    setImageSrc(url);
    
    if (originalMatRef.current) {
      originalMatRef.current.delete();
      originalMatRef.current = null;
    }

    initialDisplaySize.current = { width: 0, height: 0 };
    setCorners(null); // Reset corners on new upload
    setIsFlattened(false);
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
    if (imageSrc) URL.revokeObjectURL(imageSrc);
    setFile(null);
    setImageSrc(null);
    if (originalMatRef.current) {
      originalMatRef.current.delete();
      originalMatRef.current = null;
    }
    initialDisplaySize.current = { width: 0, height: 0 };
    setError(null);
    setIsFlattened(false);
    
    // Clear canvas
    if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const startCamera = async (facingMode = "user") => {
    setCurrentFacingMode(facingMode);
    setIsCameraMode(true);
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Camera error:", err);
      alert("Could not access camera. Please check permissions.");
    }
  };

  const flipCamera = () => {
    const newMode = currentFacingMode === "user" ? "environment" : "user";
    startCamera(newMode);
  };

  const stopCamera = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    setIsCameraMode(false);
  };

  const capturePhoto = () => {
    // 1. Remove canvasRef from the safety check since it might be unmounted
    if (!videoRef.current || !(window as any).cv) {
      console.error("Camera or OpenCV not ready.");
      return;
    }
    
    const cv = (window as any).cv;
    const video = videoRef.current;

    // 1. Calculate safe downscaled dimensions (Max 1920px)
    const MAX_DIM = 1920;
    let w = video.videoWidth;
    let h = video.videoHeight;
    
    if (Math.max(w, h) > MAX_DIM) {
      const scale = MAX_DIM / Math.max(w, h);
      w = Math.floor(w * scale);
      h = Math.floor(h * scale);
    }

    // 2. Draw to in-memory canvas at safe resolution
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = w;
    tmpCanvas.height = h;
    const ctx = tmpCanvas.getContext('2d');
    if (ctx) ctx.drawImage(video, 0, 0, w, h);

    // 3. Feed the pristine frame directly into the OpenCV master reference
    if (originalMatRef.current) originalMatRef.current.delete();
    originalMatRef.current = cv.imread(tmpCanvas);

    // 4. Flush the CSS scale lock so the new image calculates its own size
    initialDisplaySize.current = { width: 0, height: 0 };

    // Create a dummy file so UI proceeds to edit mode gracefully
    tmpCanvas.toBlob((blob) => {
      if (blob) {
         const file = new File([blob], "Webcam_Capture.jpg", { type: "image/jpeg" });
         setFile(file);
         setImageSrc(URL.createObjectURL(file));
      }
    }, 'image/jpeg', 0.95);

    // 4. Turn off camera (Triggers React to render the standard display <canvas>)
    stopCamera();

    // 5. CRITICAL FIX: Wait for DOM, then calculate corners using CSS Display Pixels
    setTimeout(() => {
      if (!canvasRef.current) return;
      
      const rect = canvasRef.current.getBoundingClientRect();
      const cssWidth = rect.width;
      const cssHeight = rect.height;

      // Create a crop box with 10% padding relative to the physical screen
      const padX = cssWidth * 0.1;
      const padY = cssHeight * 0.1;

      setCorners([
        { x: padX, y: padY },
        { x: cssWidth - padX, y: padY },
        { x: cssWidth - padX, y: cssHeight - padY },
        { x: padX, y: cssHeight - padY }
      ]);
      
      if (typeof flattenDocument === 'function') {
        flattenDocument();
      }
    }, 150); // 150ms buffer for React to mount the canvas
  };

  // Pointer Tracking Logic for Canvas Interaction
  const getPointerPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    // 1. Get true screen location of the canvas
    const rect = canvas.getBoundingClientRect();
    
    // 2. Calculate scaling factor (Intrinsic / CSS)
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // 3. Map exact CSS click to Intrinsic canvas pixel
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!corners || isFlattened) return;
    const { x, y } = getPointerPos(e);
    
    // Check Euclidean distance to see if we grabbed a specific handle
    for (let i = 0; i < corners.length; i++) {
      const distance = Math.hypot(corners[i].x - x, corners[i].y - y);
      if (distance < 15) { // 15px interaction radius
        setDraggingCornerIndex(i);
        // Lock pointer to canvas natively to prevent mouse-off sliding
        (e.target as Element).setPointerCapture(e.pointerId);
        break;
      }
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (draggingCornerIndex === null || !corners || !canvasRef.current || isFlattened) return;
    
    const { x, y } = getPointerPos(e);
    // Boundary clamp so handles don't leave the canvas mathematically
    const clampedX = Math.max(0, Math.min(x, canvasRef.current.width));
    const clampedY = Math.max(0, Math.min(y, canvasRef.current.height));

    const newCorners = [...corners];
    newCorners[draggingCornerIndex] = { x: clampedX, y: clampedY };
    setCorners(newCorners);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isFlattened) return;
    setDraggingCornerIndex(null);
    (e.target as Element).releasePointerCapture(e.pointerId);
  };

  // Redraw canvas on window resize to maintain responsiveness
  useEffect(() => {
    const handleResize = () => {
        if (imageSrc) drawCanvas();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [imageSrc, drawCanvas]);

  const autoDetectDocument = () => {
    if (!canvasRef.current || !isCvLoaded || !imageSrc) return;
    setIsProcessing(true);
    setError(null);
    
    // Slight timeout allows React to render the loading state
    setTimeout(() => {
      let src: any, dst: any, gray: any, blurred: any, edges: any, contours: any, hierarchy: any;
      try {
        const cv = (window as any).cv;
        const canvas = canvasRef.current;
        if (!canvas) throw new Error("Canvas missing");

        // 1. Read Image Data into Mat
        src = cv.imread(canvas);
        dst = src.clone(); // Clone for drawing overlays
        
        // Output matricies
        gray = new cv.Mat();
        blurred = new cv.Mat();
        edges = new cv.Mat();

        // 2. Grayscale
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

        // 3. Gaussian Blur (smooth out noise)
        cv.GaussianBlur(gray, blurred, new cv.Size(7, 7), 0, 0, cv.BORDER_DEFAULT);

        // 4. Canny Edge Detection
        cv.Canny(blurred, edges, 75, 200, 3, false);

        // 5. Find Contours
        contours = new cv.MatVector();
        hierarchy = new cv.Mat();
        cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        let maxArea = 0;
        let maxContourIndex = -1;
        let bestApprox: any = null;

        // Iterate through all contours to find the largest 4-point polygon
        for (let i = 0; i < contours.size(); ++i) {
          const contour = contours.get(i);
          const area = cv.contourArea(contour);

          // Ignore tiny specs of noise
          if (area > 5000) {
            const perimeter = cv.arcLength(contour, true);
            const approx = new cv.Mat();
            cv.approxPolyDP(contour, approx, 0.05 * perimeter, true);

            // We specifically want a 4-point polygon (a piece of paper)
            if (approx.rows === 4 && area > maxArea) {
              maxArea = area;
              maxContourIndex = i;
              
              if (bestApprox) bestApprox.delete(); // Free old approx
              bestApprox = approx.clone();
            }
            approx.delete();
          }
          contour.delete();
        }

        if (maxContourIndex !== -1 && bestApprox) {
          // 6. Push verified mathematical polygon coordinates into React State
          const foundCorners = [];
          for (let i = 0; i < 4; i++) {
             // access the flattened array struct inside data32S vector
             foundCorners.push({
               x: bestApprox.data32S[i * 2],
               y: bestApprox.data32S[i * 2 + 1]
             });
          }
          setCorners(foundCorners);
          bestApprox.delete();
          
        } else {
          // 7. Auto-Detect Fallback: Build 80% array natively and map to state directly
          const width = canvas.width;
          const height = canvas.height;
          const padX = Math.floor(width * 0.1);
          const padY = Math.floor(height * 0.1);

          setCorners([
            { x: padX, y: padY },
            { x: width - padX, y: padY },
            { x: width - padX, y: height - padY },
            { x: padX, y: height - padY }
          ]);
          
          console.warn("Could not auto-detect document edge contours. Falling back to default 80% bounding box.");
        }

      } catch (e: any) {
        console.error("OpenCV Processing Error:", e);
        setError("An error occurred running the edge-detection algorithm.");
      } finally {
        // ALWAYS delete OpenCV variables to prevent massive memory leaks
        if (src) src.delete();
        if (dst) dst.delete();
        if (gray) gray.delete();
        if (blurred) blurred.delete();
        if (edges) edges.delete();
        if (contours) contours.delete();
        if (hierarchy) hierarchy.delete();
        
        setIsProcessing(false);
      }
    }, 50);
  };

  const flattenDocument = useCallback(() => {
    if (!corners || corners.length !== 4 || !canvasRef.current || !originalMatRef.current || !isCvLoaded) return;
    setIsProcessing(true);
    setError(null);

    // Give React time to show loading state
    setTimeout(() => {
      let src: any, dst: any, srcTri: any, dstTri: any, M: any;
      try {
        const cv = (window as any).cv;
        const canvas = canvasRef.current;
        if (!canvas || !cv) throw new Error("Canvas or OpenCV missing");

        // 1. ALWAYS start from a fresh clone of the pristine original matrix
        src = originalMatRef.current.clone();
        dst = new cv.Mat();

        // 2. Lock in the initial CSS display size on the first run!
        if (initialDisplaySize.current.width === 0) {
          const rect = canvas.getBoundingClientRect();
          initialDisplaySize.current = { width: rect.width, height: rect.height };
        }

        const cssWidth = initialDisplaySize.current.width;
        const cssHeight = initialDisplaySize.current.height;
      
        const intrinsicWidth = src.cols;
        const intrinsicHeight = src.rows;

        const scaleX = intrinsicWidth / cssWidth;
        const scaleY = intrinsicHeight / cssHeight;

        const scaledCorners = corners.map(c => ({
          x: c.x * scaleX,
          y: c.y * scaleY
        }));

        // 3. Sort scaled points: TL, TR, BR, BL
        const sortedX = [...scaledCorners].sort((a, b) => a.x - b.x);
        const leftPts = sortedX.slice(0, 2).sort((a, b) => a.y - b.y);
        const rightPts = sortedX.slice(2, 4).sort((a, b) => a.y - b.y);
        const tl = leftPts[0], bl = leftPts[1], tr = rightPts[0], br = rightPts[1];

        // 4. Calculate exact output dimensions
        const maxWidth = Math.floor(Math.max(Math.hypot(br.x - bl.x, br.y - bl.y), Math.hypot(tr.x - tl.x, tr.y - tl.y)));
        const maxHeight = Math.floor(Math.max(Math.hypot(tr.x - br.x, tr.y - br.y), Math.hypot(tl.x - bl.x, tl.y - bl.y)));

        if (maxWidth === 0 || maxHeight === 0) {
          if (src) src.delete();
          if (dst) dst.delete();
          setIsProcessing(false);
          return;
        }

        srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y]);
        dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, maxWidth, 0, maxWidth, maxHeight, 0, maxHeight]);

        // 5. Warp Perspective
        M = cv.getPerspectiveTransform(srcTri, dstTri);
        const dsize = new cv.Size(maxWidth, maxHeight);
        cv.warpPerspective(src, dst, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

        // 6. Safely Apply B&W (Replacing Alpha Channel)
        if (filterMode === 'bw') {
           cv.cvtColor(dst, dst, cv.COLOR_RGBA2GRAY, 0);
           cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 21, 15);
           cv.cvtColor(dst, dst, cv.COLOR_GRAY2RGBA, 0); // THIS PREVENTS THE BLACK SCREEN
        }

        // 7. Render to Canvas
        cv.imshow(canvas, dst);
        setIsFlattened(true);

      } catch (e: any) {
        console.error("Flatten Error:", e);
        setError("Failed to flatten the document.");
      } finally {
        // 8. Memory Cleanup
        if (src) src.delete(); 
        if (dst) dst.delete(); 
        if (M) M.delete(); 
        if (srcTri) srcTri.delete(); 
        if (dstTri) dstTri.delete();
        setIsProcessing(false);
      }
    }, 50);
  }, [corners, isCvLoaded, filterMode]);

  // Re-run flatten if filter toggled while already flattened
  useEffect(() => {
     if (isFlattened) flattenDocument();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMode, isFlattened]);

  const downloadPDF = async () => {
    if (!canvasRef.current || !isFlattened) return;
    setIsProcessing(true);
    setError(null);
    try {
      const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.9);
      const pdfDoc = await PDFDocument.create();
      
      const res = await fetch(dataUrl);
      const imgBytes = await res.arrayBuffer();
      const image = await pdfDoc.embedJpg(imgBytes);

      const page = pdfDoc.addPage([image.width, image.height]);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Scanned_Document.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("PDF Export Error: ", e);
      setError("Failed to generate PDF.");
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

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 flex flex-col items-center">
        <div className="mb-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8 text-indigo-500" />
          </div>
          <h1 className="text-4xl font-black mb-4 tracking-tight">Perspective Scanner</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Mathematically flatten documents using manual OpenCV perspective transformations natively inside your browser.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-sm w-full max-w-4xl">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="w-full flex flex-col lg:flex-row gap-8 items-start mb-16">
          {/* Left Column - 1/3 Upload and Controls */}
          <div className="w-full lg:w-1/3 flex flex-col gap-6 shrink-0 relative">
             
             {!isCvLoaded && (
                <div className="absolute inset-0 z-50 bg-[#0A0A0B]/80 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center border border-indigo-500/20">
                     <svg className="animate-spin mb-4 h-10 w-10 text-indigo-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                     </svg>
                     <h3 className="font-bold text-white tracking-widest text-sm uppercase">Loading Vision Engine</h3>
                     <p className="text-xs text-gray-400 mt-2">Initializing OpenCV.js WebAssembly...</p>
                </div>
             )}

            {!file && !isCameraMode ? (
              <div className="flex flex-col gap-4 w-full">
                <label 
                  className={`
                    relative flex flex-col items-center justify-center p-12
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
                    accept="image/jpeg, image/png, image/webp"
                    onChange={handleFileInput}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    disabled={!isCvLoaded}
                  />
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 text-indigo-500">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <p className="font-medium text-lg mb-2 text-center text-white">Upload a Photo</p>
                  <p className="text-sm text-gray-500 text-center">Drag & drop or click</p>
                </label>

                <div className="flex gap-4 w-full">
                   <button onClick={() => startCamera("user")} disabled={!isCvLoaded || isProcessing} className="flex-1 py-4 text-sm font-semibold rounded-2xl bg-[#121214] hover:bg-[#18181A] transition flex items-center justify-center gap-2 border border-white/5 disabled:opacity-50">
                     📷 Laptop Camera
                   </button>
                   <button onClick={() => startCamera("environment")} disabled={!isCvLoaded || isProcessing} className="flex-1 py-4 text-sm font-semibold rounded-2xl bg-[#121214] hover:bg-[#18181A] transition flex items-center justify-center gap-2 border border-white/5 disabled:opacity-50">
                     📱 Mobile Camera
                   </button>
                </div>
              </div>
            ) : file && !isCameraMode ? (
              <div className="flex flex-col gap-6 w-full">
                {/* File Info */}
                <div className="p-4 rounded-xl bg-[#121214] border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20">
                      <FileText className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white truncate text-sm" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={removeFile}
                    className="p-2 shrink-0 ml-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                    title="Remove file"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Placeholder for Computer Vision Controls */}
                <div className="p-6 rounded-2xl bg-[#121214] border border-white/5 flex flex-col gap-6">
                  
                  <button
                    onClick={autoDetectDocument}
                    disabled={isProcessing || !isCvLoaded || isFlattened}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-900/20 transition-all flex items-center justify-center gap-2 group border border-indigo-400/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                       <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                       </svg>
                    ) : (
                       <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    )}
                    {isProcessing ? "Analyzing..." : "Set Crop Area"}
                  </button>

                  <button
                    onClick={flattenDocument}
                    disabled={isProcessing || !isCvLoaded || !corners || corners.length !== 4 || isFlattened}
                    className={`w-full py-4 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                        isFlattened 
                        ? "bg-gray-800 text-gray-500 border border-gray-700" 
                        : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20 border border-emerald-400/20"
                    }`}
                  >
                    <Layers className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    {isFlattened ? "Document Flattened" : "Flatten Document"}
                  </button>

                  <button
                    onClick={downloadPDF}
                    disabled={isProcessing || !isFlattened}
                    className="w-full py-4 bg-white hover:bg-gray-100 text-black font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-5 h-5" />
                    Download PDF
                  </button>

                  <div className="flex flex-col items-center justify-center py-4 opacity-50 border-t border-white/5 pt-6 mt-2">
                       <p className="text-sm text-gray-400 font-medium tracking-tight">Scanner Pipeline</p>
                       <p className="text-xs text-gray-600 mt-1 text-center">Capture ➔ Crop ➔ Flatten ➔ Export</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Right Column - 2/3 Canvas Display Container */}
          <div className="w-full lg:w-2/3 flex flex-col fade-in bg-[#121214] border border-white/5 rounded-2xl min-h-[500px] lg:min-h-[700px] overflow-hidden relative">
             
             {isCameraMode && (
                <div className="fixed inset-0 z-50 bg-black flex flex-col">
                  {/* Video takes up maximum available space above buttons */}
                  <div className="flex-grow relative w-full overflow-hidden flex items-center justify-center">
                     <video ref={videoRef} autoPlay playsInline muted className="absolute w-full h-full object-cover" />
                  </div>
                  {/* Fixed bottom bar for buttons */}
                  <div className="w-full bg-black/90 pb-safe pt-4 px-4 flex flex-col gap-3 pb-8">
                     <div className="flex justify-center gap-4">
                       <button onClick={capturePhoto} className="flex-1 bg-blue-600 text-white py-4 rounded-xl text-lg font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-transform">📸 Snap</button>
                       <button onClick={flipCamera} className="flex-1 bg-gray-700 text-white py-4 rounded-xl text-lg font-bold active:scale-95 transition-transform">🔄 Flip</button>
                     </div>
                     <button onClick={stopCamera} className="w-full bg-red-900/50 text-red-200 py-3 rounded-xl active:scale-95 transition-transform">Cancel</button>
                  </div>
                </div>
             )}

             {/* Dynamic Filter Toggle Overlay */}
             {isFlattened && !isCameraMode && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex p-1 bg-[#1A1A1D] border border-white/10 rounded-lg shadow-xl backdrop-blur-md">
                   <button 
                     onClick={() => setFilterMode('color')}
                     className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${filterMode === 'color' ? 'bg-[#2A2A2E] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                   >
                     Original Color
                   </button>
                   <button 
                     onClick={() => setFilterMode('bw')}
                     className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${filterMode === 'bw' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-white'}`}
                   >
                     B&W Scan
                   </button>
                </div>
             )}

             {/* The container gives the canvas a bounding box to scale proportionally */}
             <div className={`absolute inset-0 flex items-center justify-center p-4 md:p-8 md:pt-16 bg-[#0F0F11] touch-none ${isCameraMode ? 'hidden' : ''}`}>
                 {!file && !isCameraMode && (
                     <div className="flex flex-col items-center justify-center text-gray-600 opacity-60">
                         <div className="w-24 h-24 border border-dashed border-gray-600 rounded-lg mb-4"></div>
                         <p className="font-medium tracking-wide text-sm">Waiting for document...</p>
                     </div>
                 )}
                 <canvas 
                    ref={canvasRef} 
                    className={`shadow-2xl ring-1 ring-white/10 transition-opacity duration-300 touch-none ${!file || isCameraMode ? 'opacity-0 pointer-events-none' : 'opacity-100'} ${corners && !isFlattened ? 'cursor-crosshair' : ''}`}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                 />
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}
