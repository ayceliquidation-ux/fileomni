"use client";

import { useState, useCallback, useRef } from 'react';
import { UploadCloud, ArrowLeft, AlertCircle, FileText, RefreshCw, Copy, Check, Minimize2, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import Tesseract from 'tesseract.js';

export default function OcrExtractPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState<string>('');
  
  const [extractedText, setExtractedText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleProcessImage = async (imageFile: File, imageUrl: string) => {
    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setProgressStatus('Initializing engine...');
    setExtractedText('');

    try {
      const result = await Tesseract.recognize(
        imageFile,
        'eng',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              setProgress(Math.round(m.progress * 100));
              setProgressStatus(`Extracting text... ${Math.round(m.progress * 100)}%`);
            } else {
              setProgressStatus(m.status);
            }
          }
        }
      );
      
      setExtractedText(result.data.text);
      setProgress(100);
      setProgressStatus('Extraction complete');
    } catch (err) {
      console.error("OCR Error:", err);
      setError("Failed to extract text from the image. Please try again with a clearer image.");
    } finally {
      setIsProcessing(false);
    }
  };

  const onFileSelect = (selectedFile: File) => {
    if (!selectedFile.type.startsWith('image/')) {
      setError("Please upload a valid image file (PNG, JPG, etc.).");
      return;
    }
    
    setFile(selectedFile);
    setError(null);
    
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    
    // Automatically start OCR
    handleProcessImage(selectedFile, url);
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
      onFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
    e.target.value = '';
  };

  const handleStartOver = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setExtractedText('');
    setProgress(0);
    setProgressStatus('');
    setError(null);
    setIsCopied(false);
  };

  const handleCopy = async () => {
    if (!extractedText) return;
    try {
      await navigator.clipboard.writeText(extractedText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
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
            <FileText className="w-8 h-8 text-indigo-500" />
          </div>
          <h1 className="text-4xl font-black mb-4 tracking-tight">OCR Extract</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Extract text from any image instantly. 100% locally powered using Tesseract.js.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-sm w-full max-w-xl mx-auto animate-in fade-in">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="w-full flex flex-col items-center max-w-3xl mx-auto space-y-8">
          
          {!file && !extractedText && !isProcessing && (
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
                accept="image/*"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="Upload Image"
              />
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 text-indigo-500">
                <ImageIcon className="w-8 h-8" />
              </div>
              <p className="font-medium text-lg mb-2 text-center text-white">Upload Image to Extract</p>
              <p className="text-sm text-gray-500 text-center">Drag & drop your image or click</p>
            </label>
          )}

          {file && (
            <div className="w-full bg-[#121214] border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col lg:flex-row gap-8 animate-in fade-in zoom-in-95 duration-300">
              
              {/* Preview Panel */}
              <div className="w-full lg:w-1/3 flex flex-col">
                <div className="w-full bg-black/40 rounded-xl border border-white/5 shadow-inner overflow-hidden flex flex-col">
                  {previewUrl && (
                    <div className="w-full p-2 bg-[#0F0F11] flex items-center justify-center h-48 border-b border-white/5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={previewUrl} 
                        alt="Upload preview" 
                        className="max-w-full max-h-full object-contain drop-shadow-md rounded"
                      />
                    </div>
                  )}
                  <div className="p-3 bg-white/5 flex flex-col">
                    <p className="text-sm font-medium truncate text-gray-300 mb-1">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type.split('/')[1]?.toUpperCase()}
                    </p>
                  </div>
                </div>

                {isProcessing && (
                  <div className="mt-6 flex flex-col gap-2 w-full animate-in fade-in">
                    <div className="flex justify-between text-xs font-medium text-gray-400 px-1">
                        <span className="capitalize">{progressStatus}</span>
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
              </div>

              {/* Extraction Result Panel */}
              <div className="w-full lg:w-2/3 flex flex-col h-[400px]">
                {!isProcessing && extractedText ? (
                  <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                         <Check className="w-4 h-4 text-emerald-400" />
                         Extraction Successful
                      </h3>
                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-300 hover:text-white rounded-lg transition-colors border border-white/5"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {isCopied ? 'Copied!' : 'Copy Text'}
                      </button>
                    </div>
                    
                    <textarea
                      value={extractedText}
                      onChange={(e) => setExtractedText(e.target.value)}
                      className="flex-1 w-full bg-black/40 border border-white/10 rounded-xl p-4 text-gray-200 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 resize-none custom-scrollbar"
                      placeholder="Extracted text will appear here..."
                      title="Extracted OCR Text"
                    />

                    <div className="mt-4 flex justify-end">
                      <button 
                         onClick={handleStartOver}
                         className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white text-sm font-bold rounded-xl border border-white/10 transition-all flex items-center gap-2"
                      >
                         <RefreshCw className="w-4 h-4" /> Start Over
                      </button>
                    </div>
                  </div>
                ) : isProcessing ? (
                  <div className="flex flex-col items-center justify-center h-full bg-black/20 border border-white/5 rounded-xl border-dashed">
                     <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin mb-4" />
                     <p className="text-indigo-400 font-medium">Analyzing Image...</p>
                     <p className="text-gray-500 text-xs mt-2 text-center px-6">Tesseract is reading the pixels locally. This may take a moment depending on the image size.</p>
                  </div>
                ) : null}
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}
