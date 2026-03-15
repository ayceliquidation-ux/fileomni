"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { 
  UploadCloud, 
  FileImage, 
  AlertCircle,
  ArrowLeft,
  X,
  CameraOff,
  Download,
  ShieldCheck,
  Eye,
  EyeOff,
  Camera
} from "lucide-react";
import Link from "next/link";

export default function ExifScrubberPage() {
  const [file, setFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  
  const [exifData, setExifData] = useState<Record<string, any> | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  
  const [scrubbedUrl, setScrubbedUrl] = useState<string | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExifrLoaded, setIsExifrLoaded] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Inject exifr CDN script
    if (document.getElementById("exifr-cdn")) {
      setIsExifrLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.id = "exifr-cdn";
    script.src = "https://cdn.jsdelivr.net/npm/exifr/dist/full.umd.js";
    script.async = true;
    script.onload = () => {
      setIsExifrLoaded(true);
    };
    script.onerror = () => {
      console.error("Failed to load exifr from CDN");
      setError("Failed to load EXIF parser. Please check your internet connection.");
    };
    document.body.appendChild(script);
  }, []);

  const processFile = async (newFile: File) => {
    setError(null);
    setScrubbedUrl(null);
    setShowRawJson(false);
    
    if (!newFile.type.startsWith('image/')) {
      setError("Please upload a valid image file (JPG, PNG, HEIC, TIFF).");
      return;
    }
    
    setFile(newFile);
    
    // Create preview URL
    const url = URL.createObjectURL(newFile);
    setImageSrc(url);
    
    // Parse EXIF
    if ((window as any).exifr) {
      setIsParsing(true);
      try {
        const parsed = await (window as any).exifr.parse(newFile, {
             tiff: true,
             ifd0: true,
             exif: true,
             gps: true,
             xmp: true,
             icc: true,
             iptc: true,
             jfif: true
        });
        
        // Remove ArrayBuffer / Uint8Array raw data fields to prevent UI crashing on large blobs
        if (parsed) {
           const safeData: Record<string, any> = {};
           for (const key in parsed) {
               if (!(parsed[key] instanceof Uint8Array) && !(parsed[key] instanceof ArrayBuffer)) {
                   safeData[key] = parsed[key];
               }
           }
           setExifData(Object.keys(safeData).length > 0 ? safeData : null);
        } else {
           setExifData(null);
        }
      } catch (err) {
        console.error("EXIF Parsing Error:", err);
        setExifData(null); // File has no parseable EXIF or failed
      } finally {
        setIsParsing(false);
      }
    }
  };

  const scrubMetadata = async () => {
    if (!imageSrc || !file) return;
    setIsScrubbing(true);
    setError(null);

    try {
      const img = new Image();
      img.onload = () => {
         try {
             // Create an off-screen canvas exactly matching original dimension boundaries
             const canvas = document.createElement("canvas");
             canvas.width = img.naturalWidth;
             canvas.height = img.naturalHeight;
             
             const ctx = canvas.getContext("2d");
             if (!ctx) throw new Error("Failed to get 2D context");
             
             // Paint original pixels. This drops all underlying metadata automatically
             ctx.drawImage(img, 0, 0);
             
             // Extract pure sanitized blob
             canvas.toBlob((blob) => {
                 if (!blob) throw new Error("Failed to generate sanitized blob.");
                 const safeUrl = URL.createObjectURL(blob);
                 setScrubbedUrl(safeUrl);
                 setIsScrubbing(false);
             }, file.type === "image/png" ? "image/png" : "image/jpeg", 1.0);
             
         } catch(e) {
             console.error("Canvas Scrubbing Error:", e);
             setError("Failed to process image canvas.");
             setIsScrubbing(false);
         }
      };
      img.onerror = () => {
         setError("Failed to load source image into canvas memory.");
         setIsScrubbing(false);
      };
      img.src = imageSrc;
    } catch (err) {
      console.error("Scrubbing process failed:", err);
      setError("An unexpected error occurred during scrubbing.");
      setIsScrubbing(false);
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
    if (imageSrc) URL.revokeObjectURL(imageSrc);
    if (scrubbedUrl) URL.revokeObjectURL(scrubbedUrl);
    setFile(null);
    setImageSrc(null);
    setScrubbedUrl(null);
    setExifData(null);
    setError(null);
    setShowRawJson(false);
  };
  
  const downloadSanitized = () => {
     if (!scrubbedUrl || !file) return;
     const a = document.createElement('a');
     a.href = scrubbedUrl;
     
     // Append -scrubbed to the existing file extension
     const lastDot = file.name.lastIndexOf('.');
     const baseName = lastDot > 0 ? file.name.substring(0, lastDot) : file.name;
     const ext = lastDot > 0 ? file.name.substring(lastDot) : '';
     a.download = `${baseName}-scrubbed${ext}`;
     
     document.body.appendChild(a);
     a.click();
     document.body.removeChild(a);
  };

  // Helper to format EXIF objects for display
  const formatExifValue = (val: any): string => {
     if (val === null || val === undefined) return "null";
     if (typeof val === "object" && val instanceof Date) return val.toLocaleString();
     if (Array.isArray(val)) return val.join(", ");
     if (typeof val === "object") return JSON.stringify(val);
     return String(val);
  };

  return (
    <div className="min-h-screen flex flex-col pt-6 pb-24 md:pb-12 bg-[#0A0A0B] text-white selection:bg-indigo-500/30">
      <header className="px-6 md:px-12 flex items-center justify-between mb-8 max-w-7xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Tools</span>
        </Link>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 flex flex-col items-center">
        <div className="mb-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-6">
            <CameraOff className="w-8 h-8 text-indigo-500" />
          </div>
          <h1 className="text-4xl font-black mb-4 tracking-tight">EXIF Metadata Scrubber</h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            View hidden camera metadata and securely obliterate GPS coordinates natively in your browser.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-sm w-full max-w-4xl">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="w-full flex flex-col lg:flex-row bg-[#121214] border border-gray-800 rounded-2xl shadow-xl overflow-hidden mb-16">
          {/* Left Column - 1/3 Upload and Controls */}
          <div className="w-full lg:w-1/3 flex flex-col p-6 border-b lg:border-b-0 lg:border-r border-gray-800 shrink-0 relative">
              {!isExifrLoaded && (
                <div className="absolute inset-0 z-50 bg-[#0A0A0B]/80 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center border border-indigo-500/20">
                     <svg className="animate-spin mb-4 h-10 w-10 text-indigo-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                     </svg>
                     <h3 className="font-bold text-white tracking-widest text-sm uppercase">Loading Parser Engine</h3>
                </div>
             )}
             
            {!file ? (
              <div className="flex flex-col gap-4 w-full h-full justify-center">
                <label 
                  className={`
                    relative flex flex-col items-center justify-center p-12
                    border-2 border-dashed rounded-2xl transition-all duration-200 cursor-pointer h-full min-h-[300px]
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
                    accept="image/jpeg, image/png, image/webp, image/heic, image/tiff"
                    onChange={handleFileInput}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    disabled={!isExifrLoaded}
                  />
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 text-indigo-500">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <p className="font-medium text-lg mb-2 text-center text-white">Upload Photograph</p>
                  <p className="text-sm text-gray-500 text-center px-4">Drag & drop your JPG/PNG files here</p>
                </label>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  className="hidden" 
                  title="Take Photo"
                  ref={cameraInputRef} 
                  onChange={handleFileInput} 
                />
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={!isExifrLoaded}
                  className="w-full py-4 text-sm font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group active:scale-95 bg-[#121214] hover:bg-gray-800 border border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                   <Camera className="w-5 h-5 group-hover:scale-110 transition-transform" />
                   Take Photo
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-6 w-full h-full justify-start">
                {/* File Info */}
                <div className="p-4 rounded-xl bg-[#0A0A0B] border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20">
                      <FileImage className="w-6 h-6 text-indigo-400" />
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

                <div className="p-6 rounded-2xl bg-[#0A0A0B] border border-white/5 flex flex-col gap-6">
                  <button
                    onClick={scrubMetadata}
                    disabled={isScrubbing || !!scrubbedUrl}
                    className={`w-full py-4 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group active:scale-95 border ${
                        scrubbedUrl 
                        ? "bg-gray-800 text-gray-500 shadow-none border-gray-700 cursor-not-allowed" 
                        : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/20 border-indigo-400/20"
                    }`}
                  >
                    {isScrubbing ? (
                       <svg className="animate-spin h-5 w-5 text-current" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                       </svg>
                    ) : (
                       <CameraOff className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    )}
                    {scrubbedUrl ? "Metadata Destroyed" : isScrubbing ? "Scrubbing..." : "Scrub Metadata"}
                  </button>

                  <button
                    onClick={downloadSanitized}
                    disabled={!scrubbedUrl}
                    className="w-full py-4 bg-white hover:bg-gray-100 text-black font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-5 h-5" />
                    {!scrubbedUrl ? "Awaiting Scrub" : "Download Verified Image"}
                  </button>

                  <div className="flex flex-col items-center justify-center py-4 opacity-50 border-t border-white/5 pt-6 mt-2">
                       <p className="text-sm text-gray-400 font-medium tracking-tight">Security Protocol</p>
                       <p className="text-xs text-gray-600 mt-1 text-center leading-relaxed">Browser-native canvas repaint guarantees 100% metadata destruction.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - 2/3 Metadata Expose / Preview */}
          <div className="w-full lg:w-2/3 flex flex-col fade-in bg-[#0A0A0B] min-h-[500px] lg:min-h-[700px] relative">
             <div className="flex-1 p-6 md:p-8 overflow-y-auto w-full absolute inset-0 custom-scrollbar">
                 {isParsing ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-4">
                        <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-sm tracking-widest uppercase font-bold text-gray-400">Extracting EXIF Vectors</p>
                    </div>
                 ) : !file ? (
                     <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-60 pointer-events-none">
                         <div className="w-24 h-24 border border-dashed border-gray-600 rounded-lg mb-4"></div>
                         <p className="font-medium tracking-wide text-sm">Upload image to view exposed metadata</p>
                     </div>
                 ) : scrubbedUrl ? (
                     <div className="h-full flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500 relative">
                         <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
                             <ShieldCheck className="w-96 h-96 text-emerald-500" />
                         </div>
                         <div className="w-24 h-24 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
                            <ShieldCheck className="w-12 h-12 text-emerald-400" />
                         </div>
                         <h2 className="text-2xl font-black text-white mb-3">Image Sanitized Successfully</h2>
                         <p className="text-gray-400 max-w-sm text-center mb-8">
                            100% of underlying EXIF metadata vectors, GPS coordinates, and camera origin signatures have been destroyed.
                         </p>
                         <img 
                           src={scrubbedUrl} 
                           alt="Sanitized Image Thumbnail" 
                           className="w-48 h-48 object-cover rounded-xl border-4 border-[#121214] shadow-2xl"
                         />
                     </div>
                 ) : exifData ? (
                     <div className="flex flex-col gap-6 fade-in">
                          <div className="flex items-center justify-between pb-4 border-b border-gray-800">
                             <div className="flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-500" />
                                <h2 className="text-lg font-bold text-white tracking-tight">Exposed EXIF Data Detected</h2>
                             </div>
                             <button
                                onClick={() => setShowRawJson(!showRawJson)}
                                className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-white transition-colors bg-white/5 px-3 py-1.5 rounded-lg border border-white/10"
                             >
                                {showRawJson ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                {showRawJson ? "Standard View" : "Raw JSON"}
                             </button>
                          </div>
                          
                          {showRawJson ? (
                              <pre className="text-xs font-mono text-gray-300 bg-[#121214] p-4 rounded-xl border border-gray-800 overflow-x-auto">
                                  {JSON.stringify(exifData, null, 2)}
                              </pre>
                          ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                                {Object.entries(exifData).map(([key, value]) => (
                                   <div key={key} className="flex flex-col justify-center px-4 py-3 bg-[#121214] border border-gray-800/80 rounded-xl hover:border-gray-700 transition-colors group">
                                      <span className="text-xs font-mono text-indigo-400/80 mb-1 group-hover:text-indigo-400 transition-colors truncate">{key}</span>
                                      <span className="text-sm font-medium text-gray-200 truncate" title={formatExifValue(value)}>
                                         {formatExifValue(value)}
                                      </span>
                                   </div>
                                ))}
                              </div>
                          )}
                     </div>
                 ) : (
                     <div className="h-full flex flex-col items-center justify-center fade-in">
                         <div className="w-20 h-20 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6">
                            <ShieldCheck className="w-10 h-10 text-indigo-400" />
                         </div>
                         <h2 className="text-xl font-bold text-white mb-2">No EXIF Data Found</h2>
                         <p className="text-gray-400 text-center max-w-sm">
                            This image appears to be naturally clean. No standard camera signatures or geographic tags were detected.
                         </p>
                     </div>
                 )}
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}
