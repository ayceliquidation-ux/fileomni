"use client";

import { useState, useCallback, useRef } from 'react';
import { UploadCloud, FileType2, Download, Minimize2, ArrowLeft, AlertCircle, RefreshCw, Plus, X } from 'lucide-react';
import Link from 'next/link';
import JSZip from 'jszip';

export default function CompressOfficePage() {
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState<string>('');
  
  const originalTotalSize = files.reduce((acc, f) => acc + f.size, 0);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);
  
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputFilename, setOutputFilename] = useState<string>('');

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelect = (newFiles: File[]) => {
    const validExtensions = ['.docx', '.pptx', '.xlsx'];
    const validPdfs: File[] = [];

    newFiles.forEach(f => {
      const extension = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();
      if (validExtensions.includes(extension) || f.type.includes('officedocument')) {
         validPdfs.push(f);
      }
    });
    
    if (validPdfs.length > 0) {
      setFiles(validPdfs);
      setError(null);
      setOutputUrl(null);
      setProgress(0);
      setProgressStatus('');
      setCompressedSize(null);
    } else {
      setError("Please upload a valid Word, PowerPoint, or Excel document.");
    }
  };

  const handleAddMoreFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const validExtensions = ['.docx', '.pptx', '.xlsx'];
      const newValidFiles: File[] = [];
      Array.from(e.target.files).forEach(f => {
         const extension = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();
         if (validExtensions.includes(extension) || f.type.includes('officedocument')) {
            newValidFiles.push(f);
         }
      });
      if (newValidFiles.length > 0) {
         setFiles(prev => [...prev, ...newValidFiles]);
      }
    }
    e.target.value = '';
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
      handleFileSelect(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(Array.from(e.target.files));
    }
    e.target.value = '';
  };

  const compressImage = (blob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Failed to get 2d context"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob((compressedBlob) => {
          if (compressedBlob) {
            resolve(compressedBlob);
          } else {
            reject(new Error("Failed to compress image"));
          }
        }, 'image/jpeg', 0.5);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load image for compression"));
      };
      
      img.src = url;
    });
  };

  const handleCompress = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setProgress(0);
    setProgressStatus('Initializing engine...');
    setError(null);

    try {
      let finalBlob: Blob;
      let finalFilename: string;

      if (files.length === 1) {
         // Single file
         const singleFile = files[0];
         setProgressStatus('Opening archive...');
         const fileBuffer = await singleFile.arrayBuffer();
         const zip = new JSZip();
         await zip.loadAsync(fileBuffer);
         
         const filesToCompress: string[] = [];
         zip.forEach((relativePath, zipEntry) => {
           if (!zipEntry.dir && relativePath.match(/^(word|ppt|xl)\/media\/.*\.(png|jpeg|jpg)$/i)) {
             filesToCompress.push(relativePath);
           }
         });

         if (filesToCompress.length === 0) {
            setProgressStatus('No media found to compress.');
         } else {
            for (let i = 0; i < filesToCompress.length; i++) {
              const relativePath = filesToCompress[i];
              setProgressStatus(`Compressing image ${i + 1} of ${filesToCompress.length}...`);
              const uint8 = await zip.file(relativePath)!.async("uint8array");
              const blob = new Blob([uint8 as unknown as BlobPart]);
              try {
                 const compressedBlob = await compressImage(blob);
                 const compressedArrayBuffer = await compressedBlob.arrayBuffer();
                 zip.file(relativePath, compressedArrayBuffer);
              } catch (err) {}
              setProgress(Math.round(((i + 1) / filesToCompress.length) * 80));
            }
         }

         setProgressStatus('Generating output document...');
         setProgress(90);
         finalBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 }});
         finalFilename = singleFile.name;
      } else {
         // Batch files
         const masterZip = new JSZip();
         for (let j = 0; j < files.length; j++) {
            const currentFile = files[j];
            setProgressStatus(`Processing file ${j + 1} of ${files.length}...`);
            const fileBuffer = await currentFile.arrayBuffer();
            const docZip = new JSZip();
            await docZip.loadAsync(fileBuffer);
            
            const filesToCompress: string[] = [];
            docZip.forEach((relativePath, zipEntry) => {
              if (!zipEntry.dir && relativePath.match(/^(word|ppt|xl)\/media\/.*\.(png|jpeg|jpg)$/i)) {
                filesToCompress.push(relativePath);
              }
            });

            for (let i = 0; i < filesToCompress.length; i++) {
              setProgressStatus(`Optimizing media in ${currentFile.name}... (${i + 1}/${filesToCompress.length})`);
              const uint8 = await docZip.file(filesToCompress[i])!.async("uint8array");
              const blob = new Blob([uint8 as unknown as BlobPart]);
              try {
                 const compressedBlob = await compressImage(blob);
                 const compressedArrayBuffer = await compressedBlob.arrayBuffer();
                 docZip.file(filesToCompress[i], compressedArrayBuffer);
              } catch (err) {}
            }
            
            const docBlob = await docZip.generateAsync({ type: "arraybuffer", compression: "DEFLATE", compressionOptions: { level: 6 }});
            masterZip.file(currentFile.name, docBlob);
            setProgress(Math.round(((j + 1) / files.length) * 80));
         }

         setProgressStatus('Generating ZIP archive...');
         setProgress(90);
         finalBlob = await masterZip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 }});
         finalFilename = "Compressed_Office_Batch.zip";
      }
      
      setCompressedSize(finalBlob.size);
      
      const url = URL.createObjectURL(finalBlob);
      setOutputUrl(url);
      setOutputFilename(finalFilename);
      
      setProgress(100);
      setProgressStatus('Compression complete!');
      
    } catch (err) {
      console.error("Compression Error:", err);
      setError("Failed to compress the files. Please ensure they are valid Office documents.");
    } finally {
      setIsProcessing(false);
    }
  };

  const removeFiles = () => {
    setFiles([]);
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);
    setCompressedSize(null);
    setProgress(0);
    setProgressStatus('');
    setError(null);
  };

  const handleStartOver = () => removeFiles();

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
          <h1 className="text-4xl font-black mb-4 tracking-tight">Compress Office Files</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Drastically reduce the file size of your Microsoft Word (.docx), PowerPoint (.pptx), and Excel (.xlsx) documents by compressing their internal media entirely locally.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-sm w-full max-w-xl mx-auto animate-in fade-in">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="w-full flex flex-col items-center max-w-xl mx-auto space-y-8">
          
          {!files.length ? (
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
                multiple
                accept=".docx,.pptx,.xlsx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="Upload Office File"
              />
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 text-indigo-500">
                <UploadCloud className="w-8 h-8" />
              </div>
              <p className="font-medium text-lg mb-2 text-center text-white">Drop your Word, PowerPoint, or Excel files here</p>
              <p className="text-sm text-gray-500 text-center">Drag & drop your file or click</p>
            </label>
          ) : (
            <div className="w-full bg-[#121214] border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col animate-in fade-in zoom-in-95 duration-300">
               
               <div className="flex flex-col mb-8 p-4 bg-black/40 rounded-xl border border-white/5 shadow-inner">
                  <div className="flex items-center justify-between mb-4">
                      <div className="text-sm font-medium text-white">{files.length} File{files.length > 1 ? 's' : ''} Uploaded</div>
                      <div className="text-xs text-gray-400">Total: <span className="text-gray-300 font-semibold">{formatSize(originalTotalSize)}</span></div>
                      {!isProcessing && !outputUrl && (
                        <div className="flex items-center gap-2">
                           <button 
                               onClick={() => fileInputRef.current?.click()}
                               className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-300 hover:text-white rounded-lg transition-colors border border-white/5"
                           >
                               <Plus className="w-3.5 h-3.5" /> Add Files
                           </button>
                           <button 
                               onClick={handleStartOver}
                               aria-label="Remove files"
                               className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                           >
                               <X className="w-5 h-5" />
                           </button>
                        </div>
                      )}
                  </div>

                  <input type="file" title="Add more files" multiple accept=".docx,.pptx,.xlsx" ref={fileInputRef} className="hidden" onChange={handleAddMoreFiles} />

                  <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                     {files.map((f, i) => (
                        <div key={i} className="flex items-center gap-3 overflow-hidden bg-white/5 p-2 rounded-lg">
                            <FileType2 className="w-4 h-4 text-indigo-400 shrink-0" />
                            <p className="text-sm font-medium truncate text-gray-300 flex-1">{f.name}</p>
                            <p className="text-xs text-gray-500 shrink-0">{formatSize(f.size)}</p>
                        </div>
                     ))}
                  </div>
               </div>

               {!outputUrl ? (
                  <div className="flex flex-col gap-6">
                     
                     <div className="flex flex-col gap-2 relative">
                        {isProcessing && (
                           <div className="absolute inset-x-0 -top-8 flex flex-col gap-1">
                               <div className="flex justify-between text-xs font-medium text-gray-400 px-1">
                                   <span>{progressStatus}</span>
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
                            disabled={isProcessing}
                            className={`w-full py-4 font-bold rounded-xl transition-all flex items-center justify-center gap-2 group border active:scale-95 ${
                                isProcessing 
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
                                    Compressing File...
                                </>
                            ) : (
                                <>
                                    <Minimize2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    Compress {files.length} Office File{files.length > 1 ? 's' : ''}
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
                  </div>
               ) : (
                  <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                     <div className="w-full p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-6 flex flex-col items-center justify-center">
                         <p className="text-emerald-400 font-bold mb-1">Compression Complete!</p>
                         <div className="flex items-center gap-4 text-sm mt-3 bg-black/40 px-4 py-2 rounded-full border border-white/5">
                              <span className="text-gray-400 line-through decoration-red-500/50">{formatSize(originalTotalSize)}</span>
                              <span className="text-gray-600">➔</span>
                              <span className="text-emerald-300 font-bold">{formatSize(compressedSize || 0)}</span>
                         </div>
                         {originalTotalSize > 0 && compressedSize && originalTotalSize > compressedSize && (
                             <div className="mt-4 px-3 py-1 bg-emerald-500 text-black text-xs font-black rounded-lg uppercase tracking-wider">
                                 Saved {(((originalTotalSize - compressedSize) / originalTotalSize) * 100).toFixed(1)}%
                             </div>
                         )}
                     </div>

                     <div className="flex gap-4 w-full">
                         <button 
                              onClick={handleStartOver}
                              title="Start Over"
                              className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 transition-all"
                         >
                              <RefreshCw className="w-5 h-5 mx-auto" />
                         </button>
                         <a
                              href={outputUrl}
                              download={outputFilename}
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
