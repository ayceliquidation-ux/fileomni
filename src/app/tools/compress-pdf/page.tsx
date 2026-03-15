"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { UploadCloud, FileText, Download, Minimize2, X, ArrowLeft, AlertCircle, Settings2, FileArchive, Plus } from 'lucide-react';
import Link from 'next/link';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';

type CompressionLevel = 'Light' | 'Recommended' | 'Extreme';

export default function CompressPDFPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('Recommended');
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const [overallOriginalBytes, setOverallOriginalBytes] = useState(0);
  const [originalTotalSize, setOriginalTotalSize] = useState<string | null>(null);
  const [compressedTotalSize, setCompressedTotalSize] = useState<string | null>(null);
  const [compressionRatio, setCompressionRatio] = useState<number | null>(null);
  
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputFilename, setOutputFilename] = useState<string>('');
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [compressionResults, setCompressionResults] = useState<{name: string, original: number, compressed: number}[]>([]);
  
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPdfjsLoaded, setIsPdfjsLoaded] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setError("Failed to load PDF engine. Please check your internet connection.");
    };
    document.body.appendChild(script);
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const processFiles = (newFiles: File[]) => {
    const validPdfs = newFiles.filter(f => f.type === "application/pdf");
    
    if (validPdfs.length > 0) {
      setFiles(validPdfs);
      
      const totalBytes = validPdfs.reduce((acc, f) => acc + f.size, 0);
      setOverallOriginalBytes(totalBytes);
      setOriginalTotalSize(formatSize(totalBytes));
      
      setError(null);
      setOutputUrl(null);
      setCompressedTotalSize(null);
      setCompressionRatio(null);
      setPreviews({});
      setCompressionResults([]);
      setProgress(0);
      
      validPdfs.forEach(file => {
        const fileReader = new FileReader();
        fileReader.onload = async function() {
          try {
            const typedarray = new Uint8Array(this.result as ArrayBuffer);
            const pdfjsLib = (window as any).pdfjsLib;
            if (!pdfjsLib) return;
            const pdf = await pdfjsLib.getDocument(typedarray).promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 1.0 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            setPreviews(prev => ({ ...prev, [file.name]: canvas.toDataURL('image/jpeg', 0.5) }));
          } catch (err) {
            console.error("Preview generation failed:", err);
          }
        };
        fileReader.readAsArrayBuffer(file);
      });
    } else {
      setError("Please upload valid PDF documents.");
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
      processFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
    e.target.value = '';
  };

  const handleAddMoreFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFilesArray = Array.from(e.target.files);
      const validPdfs = newFilesArray.filter(f => f.type === "application/pdf");
      
      if (validPdfs.length > 0) {
        setFiles(prev => {
          const updatedFiles = [...prev, ...validPdfs];
          const totalBytes = updatedFiles.reduce((acc, f) => acc + f.size, 0);
          setOverallOriginalBytes(totalBytes);
          setOriginalTotalSize(formatSize(totalBytes));
          return updatedFiles;
        });
        
        setError(null);
        setOutputUrl(null);
        setCompressedTotalSize(null);
        setCompressionRatio(null);
        setCompressionResults([]);
        setProgress(0);
        
        validPdfs.forEach(file => {
          const fileReader = new FileReader();
          fileReader.onload = async function() {
            try {
              const typedarray = new Uint8Array(this.result as ArrayBuffer);
              const pdfjsLib = (window as any).pdfjsLib;
              if (!pdfjsLib) return;
              const pdf = await pdfjsLib.getDocument(typedarray).promise;
              const page = await pdf.getPage(1);
              const viewport = page.getViewport({ scale: 1.0 });
              const canvas = document.createElement('canvas');
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
              setPreviews(prev => ({ ...prev, [file.name]: canvas.toDataURL('image/jpeg', 0.5) }));
            } catch (err) {
              console.error("Preview generation failed:", err);
            }
          };
          fileReader.readAsArrayBuffer(file);
        });
      } else {
        setError("Please upload valid PDF documents.");
      }
    }
    e.target.value = '';
  };

  const removeFiles = () => {
    setFiles([]);
    setOriginalTotalSize(null);
    setOverallOriginalBytes(0);
    setCompressedTotalSize(null);
    setCompressionRatio(null);
    setPreviews({});
    setCompressionResults([]);
    setOutputUrl(null);
    setError(null);
    setProgress(0);
  };

  const handleCompress = async () => {
    if (files.length === 0 || !isPdfjsLoaded) {
      if (!isPdfjsLoaded) setError("PDF engine is still loading. Please wait a moment.");
      return;
    }

    setIsCompressing(true);
    setProgress(0);
    setError(null);

    try {
      // Setup compression parameters based on level
      let scale = 1.0;
      let quality = 0.6;
      
      switch (compressionLevel) {
        case 'Light':
          scale = 1.5;
          quality = 0.8;
          break;
        case 'Recommended':
           scale = 1.0;
           quality = 0.6;
           break;
        case 'Extreme':
           scale = 0.7;
           quality = 0.4;
           break;
      }

      const zip = new JSZip();
      const pdfjsLib = (window as any).pdfjsLib;

      let compressedBytes = 0;
      let finalSingleBlob: Blob | null = null;
      const stats = [];

      for (let fIndex = 0; fIndex < files.length; fIndex++) {
          const file = files[fIndex];
          const fileBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
          const totalPages = pdf.numPages;

          const newPdf = await PDFDocument.create();

          for (let i = 1; i <= totalPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale });

            // Render page to temporary canvas
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            
            if (!ctx) throw new Error("Could not create canvas context.");

            const renderContext = {
              canvasContext: ctx,
              viewport: viewport
            };

            await page.render(renderContext).promise;

            // Extract JPEG
            const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
            
            // Embed into new PDF
            const jpegImage = await newPdf.embedJpg(jpegDataUrl);
            const { width, height } = jpegImage.scale(1 / scale); // Scale back to original dimensions for PDF
            
            const newPage = newPdf.addPage([width, height]);
            newPage.drawImage(jpegImage, {
               x: 0,
               y: 0,
               width,
               height
            });

            // Update sub-progress smoothly based on current file + page within that file
            const fileProgress = fIndex / files.length;
            const pageProgress = (i / totalPages) / files.length;
            setProgress(Math.round((fileProgress + pageProgress) * 100));
          }

          // Save newly generated individual PDF
          const pdfBytes = await newPdf.save({ useObjectStreams: false });
          const pdfBlob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
          
          compressedBytes += pdfBlob.size;
          stats.push({ name: file.name, original: file.size, compressed: pdfBlob.size });

          if (files.length > 1) {
             zip.file(`compressed_${file.name}`, pdfBlob);
          } else {
             finalSingleBlob = pdfBlob;
          }
      }

      let outputBlob: Blob;
      let outFilename: string;

      // Final Output Logic
      if (files.length > 1) {
         outputBlob = await zip.generateAsync({ type: 'blob' });
         outFilename = 'compressed_pdfs.zip';
      } else {
         outputBlob = finalSingleBlob!;
         outFilename = `compressed_${files[0].name}`;
      }
      
      const url = URL.createObjectURL(outputBlob);
      
      setCompressionResults(stats);
      setCompressedTotalSize(formatSize(compressedBytes));
      
      const ratio = ((overallOriginalBytes - compressedBytes) / overallOriginalBytes) * 100;
      setCompressionRatio(Math.max(0, ratio));
      
      setOutputUrl(url);
      setOutputFilename(outFilename);
      setProgress(100);

    } catch (err) {
      console.error("Compression error:", err);
      setError("Failed to compress documents. Please try again.");
    } finally {
      setIsCompressing(false);
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

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 flex flex-col items-center">
        <div className="mb-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-6">
            <Minimize2 className="w-8 h-8 text-indigo-500" />
          </div>
          <h1 className="text-4xl font-black mb-4 tracking-tight">Compress PDF</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Drastically reduce PDF file sizes securely on your machine by rasterizing pages into optimized JPEG layers. Supports batch compression!
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-sm w-full max-w-xl mx-auto">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="w-full flex flex-col items-center max-w-xl mx-auto space-y-8">
          
          {files.length === 0 ? (
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
                multiple
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 text-indigo-500">
                <UploadCloud className="w-8 h-8" />
              </div>
              <p className="font-medium text-lg mb-2 text-center text-white">Upload PDFs to Compress</p>
              <p className="text-sm text-gray-500 text-center">Drag & drop multiple files or click</p>
            </label>
          ) : (
             <div className="w-full bg-[#121214] border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col">
               
               {/* File Info Header */}
               <div className="w-full flex flex-col mb-8 p-4 bg-black/40 rounded-xl border border-white/5 shadow-inner">
                  <div className="flex items-center justify-between mb-4">
                      <div className="text-sm font-medium text-white">{files.length} File{files.length > 1 ? 's' : ''} Uploaded</div>
                      <div className="text-xs text-gray-400">Total: <span className="text-gray-300 font-semibold">{originalTotalSize}</span></div>
                      {!isCompressing && !outputUrl && (
                        <div className="flex items-center gap-2">
                           <button 
                               onClick={() => fileInputRef.current?.click()}
                               className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-300 hover:text-white rounded-lg transition-colors border border-white/5"
                           >
                               <Plus className="w-3.5 h-3.5" /> Add Files
                           </button>
                           <button 
                               onClick={removeFiles}
                               aria-label="Remove files"
                               className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                           >
                               <X className="w-5 h-5" />
                           </button>
                        </div>
                      )}
                  </div>
                  
                  <input type="file" title="Add more files" multiple accept="application/pdf" ref={fileInputRef} className="hidden" onChange={handleAddMoreFiles} />
                  
                  <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                     {files.map((f, i) => (
                        <div key={i} className="flex items-center gap-3 overflow-hidden bg-white/5 p-2 rounded-lg">
                            {previews[f.name] ? (
                                <img src={previews[f.name]} className="w-12 h-16 object-cover rounded shrink-0 border border-gray-700" alt="preview" />
                            ) : (
                                <div className="w-12 h-16 flex items-center justify-center bg-black/20 rounded border border-gray-800 shrink-0">
                                    <FileText className="w-5 h-5 text-indigo-400" />
                                </div>
                            )}
                            <p className="text-sm font-medium truncate text-gray-300 flex-1">{f.name}</p>
                            <p className="text-xs text-gray-500 shrink-0">{formatSize(f.size)}</p>
                        </div>
                     ))}
                  </div>
               </div>

               {/* Pre-Compression: Settings & Compress Button */}
               {!outputUrl ? (
                   <>
                       <div className="flex flex-col gap-4 mb-8">
                           <div className="flex items-center gap-2 mb-2">
                               <Settings2 className="w-4 h-4 text-indigo-400" />
                               <h3 className="text-sm font-semibold tracking-wide text-gray-200">Compression Level</h3>
                           </div>
                           
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                               <button 
                                  onClick={() => setCompressionLevel('Light')}
                                  disabled={isCompressing}
                                  className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${compressionLevel === 'Light' ? 'bg-indigo-500/10 border-indigo-500' : 'bg-black/20 border-white/5 hover:border-white/20'}`}
                               >
                                   <span className={`text-sm font-bold ${compressionLevel === 'Light' ? 'text-indigo-400' : 'text-gray-300'}`}>Light</span>
                                   <span className="text-xs text-gray-500 mt-1">High Quality</span>
                               </button>
                               <button 
                                  onClick={() => setCompressionLevel('Recommended')}
                                  disabled={isCompressing}
                                  className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${compressionLevel === 'Recommended' ? 'bg-indigo-500/10 border-indigo-500' : 'bg-black/20 border-white/5 hover:border-white/20'}`}
                               >
                                   <span className={`text-sm font-bold ${compressionLevel === 'Recommended' ? 'text-indigo-400' : 'text-gray-300'}`}>Recommended</span>
                                   <span className="text-xs text-gray-500 mt-1">Best Balance</span>
                               </button>
                               <button 
                                  onClick={() => setCompressionLevel('Extreme')}
                                  disabled={isCompressing}
                                  className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${compressionLevel === 'Extreme' ? 'bg-indigo-500/10 border-indigo-500' : 'bg-black/20 border-white/5 hover:border-white/20'}`}
                               >
                                   <span className={`text-sm font-bold ${compressionLevel === 'Extreme' ? 'text-indigo-400' : 'text-gray-300'}`}>Extreme</span>
                                   <span className="text-xs text-gray-500 mt-1">Smallest Size</span>
                               </button>
                           </div>
                       </div>

                       <div className="flex flex-col w-full relative">
                            {isCompressing && (
                                <div className="absolute inset-x-0 -top-8 flex flex-col gap-2">
                                    <div className="flex justify-between text-xs font-medium text-gray-400 px-1">
                                        <span>Compressing {files.length} file{files.length > 1 ? 's' : ''}...</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                        <div 
                                           className="bg-indigo-500 h-full rounded-full transition-all duration-300 ease-out"
                                           style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleCompress}
                                disabled={isCompressing || !isPdfjsLoaded}
                                className={`w-full py-4 font-bold rounded-xl transition-all flex items-center justify-center gap-2 group border active:scale-95 ${
                                    isCompressing 
                                    ? 'bg-indigo-600/50 text-indigo-200 border-indigo-500/20 cursor-not-allowed opacity-80' 
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_-5px_rgba(99,102,241,0.5)] border-indigo-400/20'
                                }`}
                            >
                                {isCompressing ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Rasterizing...
                                    </>
                                ) : (
                                    <>
                                        <Minimize2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                        Compress {files.length} Document{files.length > 1 ? 's' : ''}
                                    </>
                                )}
                            </button>
                       </div>
                   </>
               ) : (
                   /* Post-Compression: Success & Download */
                   <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                       <div className="w-full p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-6 flex flex-col items-center justify-center">
                           <p className="text-emerald-400 font-bold mb-1">Batch Compression Complete!</p>
                           <div className="flex items-center gap-4 text-sm mt-3 bg-black/40 px-4 py-2 rounded-full border border-white/5">
                                <span className="text-gray-400 line-through decoration-red-500/50">{originalTotalSize}</span>
                                <span className="text-gray-600">➔</span>
                                <span className="text-emerald-300 font-bold">{compressedTotalSize}</span>
                           </div>
                           {compressionRatio !== null && compressionRatio > 0 && (
                               <div className="mt-4 px-3 py-1 bg-emerald-500 text-black text-xs font-black rounded-lg uppercase tracking-wider">
                                   Saved {compressionRatio.toFixed(1)}%
                               </div>
                           )}
                       </div>

                       {compressionResults.length > 0 && (
                          <div className="w-full mb-6 bg-black/20 border border-white/5 rounded-xl p-4 shadow-inner">
                             <h4 className="text-sm font-semibold text-gray-300 mb-3 border-b border-white/5 pb-2">Individual Results</h4>
                             <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                {compressionResults.map((stat, i) => {
                                   const savings = stat.original > 0 ? ((stat.original - stat.compressed) / stat.original) * 100 : 0;
                                   return (
                                       <div key={i} className="flex items-center justify-between text-xs bg-white/5 p-2 rounded-lg">
                                          <div className="flex items-center gap-2 overflow-hidden flex-1">
                                             <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                             <span className="truncate text-gray-300">{stat.name}</span>
                                          </div>
                                          <div className="flex items-center gap-3 shrink-0 ml-4">
                                             <span className="text-gray-500 line-through">{formatSize(stat.original)}</span>
                                             <span className="text-gray-600">➔</span>
                                             <span className={savings > 0 ? "text-emerald-400 font-semibold" : "text-gray-400"}>
                                                {formatSize(stat.compressed)}
                                             </span>
                                          </div>
                                       </div>
                                   );
                                })}
                             </div>
                          </div>
                       )}

                       <div className="flex gap-4 w-full">
                           <button 
                                onClick={removeFiles}
                                className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 transition-all"
                           >
                               Start Over
                           </button>
                           <a
                                href={outputUrl}
                                download={outputFilename}
                                className="w-2/3 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 border border-emerald-400/20 transition-all flex items-center justify-center gap-2 group active:scale-95"
                           >
                                {files.length > 1 ? (
                                   <FileArchive className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                                ) : (
                                   <Download className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                                )}
                                Download {files.length > 1 ? 'ZIP Archive' : 'PDF'}
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
