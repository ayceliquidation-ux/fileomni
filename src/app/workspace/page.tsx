"use client";

import { useCallback, useState, useEffect } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { 
  UploadCloud, 
  FileText, 
  X,
  FileImage,
  Unlock,
  Minimize2,
  Stamp,
  CameraOff,
  Layers,
  Merge,
  PenTool
} from "lucide-react";
import Link from "next/link";
import FlattenTool from "@/components/tools/FlattenTool";
import UnlockTool from "@/components/tools/UnlockTool";
import OrganizeTool from "@/components/tools/OrganizeTool";
import MergeTool from "@/components/tools/MergeTool";
import CompressTool from "@/components/tools/CompressTool";

export default function WorkspacePage() {
  const { file, setFile, clearFile, activeTool, setActiveTool } = useWorkspace();
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Generate preview URL when file changes
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

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
      setFile(e.dataTransfer.files[0]);
    }
  }, [setFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
    e.target.value = '';
  };

  // Determine tool availability
  const isPdf = file?.type === 'application/pdf';
  const isImage = file?.type.startsWith('image/');

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0A0A0B] text-white overflow-hidden">
      
      {/* Persistent Sidebar (Reactive Toolbelt) */}
      <aside className="w-full md:w-80 bg-[#121214] border-r border-white/5 flex flex-col h-auto md:h-screen shrink-0 overflow-y-auto">
        <div className="p-6 border-b border-white/5">
          <Link href="/" className="inline-block">
            <h1 className="text-2xl font-black tracking-tight text-white mb-1">FileOmni</h1>
            <p className="text-xs text-rose-500 font-bold uppercase tracking-wider">Universal Workspace</p>
          </Link>
        </div>

        <div className="p-6 flex-1">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">Reactive Toolbelt</h2>
          
          <div className="space-y-3">
            {/* Tool: Edit / Sign PDF (Placeholder) */}
            <div 
              onClick={() => isPdf ? setActiveTool(activeTool === 'edit' ? null : 'edit') : null}
              className={`p-4 rounded-xl border transition-all ${
                isPdf 
                  ? activeTool === 'edit'
                    ? 'bg-amber-500/10 border-amber-500/50 cursor-pointer shadow-lg shadow-amber-500/10'
                    : 'bg-white/5 border-white/10 hover:border-amber-500/30 cursor-pointer' 
                  : 'bg-transparent border-transparent opacity-40 grayscale pointer-events-none'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isPdf 
                    ? activeTool === 'edit'
                      ? 'bg-amber-500 text-white'
                      : 'bg-amber-500/10 text-amber-500' 
                    : 'bg-white/10 text-gray-400'
                }`}>
                  <PenTool className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium text-sm">Edit / Sign PDF</p>
                  <p className="text-xs text-gray-500 mt-0.5">Add test, sigs, lines</p>
                </div>
              </div>
            </div>

            {/* Tool: Organize PDF */}
            <div 
              onClick={() => isPdf ? setActiveTool(activeTool === 'organize' ? null : 'organize') : null}
              className={`p-4 rounded-xl border transition-all ${
                isPdf 
                  ? activeTool === 'organize'
                    ? 'bg-emerald-500/10 border-emerald-500/50 cursor-pointer shadow-lg shadow-emerald-500/10'
                    : 'bg-white/5 border-white/10 hover:border-emerald-500/30 cursor-pointer' 
                  : 'bg-transparent border-transparent opacity-40 grayscale pointer-events-none'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isPdf 
                    ? activeTool === 'organize'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-emerald-500/10 text-emerald-500' 
                    : 'bg-white/10 text-gray-400'
                }`}>
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium text-sm">Organize PDF</p>
                  <p className="text-xs text-gray-500 mt-0.5">Reorder & delete pages</p>
                </div>
              </div>
            </div>

            {/* Tool: Merge PDF */}
            <div 
              onClick={() => isPdf ? setActiveTool(activeTool === 'merge' ? null : 'merge') : null}
              className={`p-4 rounded-xl border transition-all ${
                isPdf 
                  ? activeTool === 'merge'
                    ? 'bg-indigo-500/10 border-indigo-500/50 cursor-pointer shadow-lg shadow-indigo-500/10'
                    : 'bg-white/5 border-white/10 hover:border-indigo-500/30 cursor-pointer' 
                  : 'bg-transparent border-transparent opacity-40 grayscale pointer-events-none'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isPdf 
                    ? activeTool === 'merge'
                      ? 'bg-indigo-500 text-white'
                      : 'bg-indigo-500/10 text-indigo-500' 
                    : 'bg-white/10 text-gray-400'
                }`}>
                  <Merge className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium text-sm">Merge PDF</p>
                  <p className="text-xs text-gray-500 mt-0.5">Combine multiple files</p>
                </div>
              </div>
            </div>

            {/* Tool: Compress PDF */}
            <div 
              onClick={() => isPdf ? setActiveTool(activeTool === 'compress' ? null : 'compress') : null}
              className={`p-4 rounded-xl border transition-all ${
                isPdf 
                  ? activeTool === 'compress'
                    ? 'bg-blue-500/10 border-blue-500/50 cursor-pointer shadow-lg shadow-blue-500/10'
                    : 'bg-white/5 border-white/10 hover:border-blue-500/30 cursor-pointer' 
                  : 'bg-transparent border-transparent opacity-40 grayscale pointer-events-none'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isPdf 
                    ? activeTool === 'compress'
                      ? 'bg-blue-500 text-white'
                      : 'bg-blue-500/10 text-blue-500' 
                    : 'bg-white/10 text-gray-400'
                }`}>
                  <Minimize2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium text-sm">Compress PDF</p>
                  <p className="text-xs text-gray-500 mt-0.5">Reduce file size</p>
                </div>
              </div>
            </div>

            {/* Tool: Flatten PDF */}
            <div 
              onClick={() => isPdf ? setActiveTool(activeTool === 'flatten' ? null : 'flatten') : null}
              className={`p-4 rounded-xl border transition-all ${
                isPdf 
                  ? activeTool === 'flatten'
                    ? 'bg-rose-500/10 border-rose-500/50 cursor-pointer shadow-lg shadow-rose-500/10'
                    : 'bg-white/5 border-white/10 hover:border-rose-500/30 cursor-pointer' 
                  : 'bg-transparent border-transparent opacity-40 grayscale pointer-events-none'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isPdf 
                    ? activeTool === 'flatten'
                      ? 'bg-rose-500 text-white'
                      : 'bg-rose-500/10 text-rose-500' 
                    : 'bg-white/10 text-gray-400'
                }`}>
                  <Stamp className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium text-sm">Flatten PDF</p>
                  <p className="text-xs text-gray-500 mt-0.5">Embed forms permanently</p>
                </div>
              </div>
            </div>

            {/* Tool: Unlock PDF */}
            <div 
              onClick={() => isPdf ? setActiveTool(activeTool === 'unlock' ? null : 'unlock') : null}
              className={`p-4 rounded-xl border transition-all ${
                isPdf 
                  ? activeTool === 'unlock'
                    ? 'bg-rose-500/10 border-rose-500/50 cursor-pointer shadow-lg shadow-rose-500/10'
                    : 'bg-white/5 border-white/10 hover:border-rose-500/30 cursor-pointer' 
                  : 'bg-transparent border-transparent opacity-40 grayscale pointer-events-none'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isPdf 
                    ? activeTool === 'unlock'
                      ? 'bg-rose-500 text-white'
                      : 'bg-rose-500/10 text-rose-500' 
                    : 'bg-white/10 text-gray-400'
                }`}>
                  <Unlock className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium text-sm">Unlock PDF</p>
                  <p className="text-xs text-gray-500 mt-0.5">Remove passwords</p>
                </div>
              </div>
            </div>

            {/* Placeholder Note */}
            {!file && (
              <p className="text-xs text-center text-gray-600 mt-8 italic">
                Upload a file to awaken the toolbelt.
              </p>
            )}
          </div>
        </div>
      </aside>

      {/* Central Workspace Canvas */}
      <main className="flex-1 h-auto md:h-screen overflow-y-auto flex flex-col">
        {!file ? (
          // Dropzone State
          <div className="flex-1 flex flex-col items-center justify-center p-8 fade-in">
            <div className="max-w-md w-full text-center mb-8">
               <h2 className="text-3xl font-bold mb-3">Drop file here</h2>
               <p className="text-gray-400">Your documents never leave your device.</p>
            </div>
            
            <label 
              className={`
                relative flex flex-col items-center justify-center p-16 w-full max-w-2xl
                border-2 border-dashed rounded-3xl transition-all duration-300 cursor-pointer
                ${isDragging 
                  ? 'border-rose-500 bg-rose-500/10 scale-105' 
                  : 'border-white/10 bg-[#121214]/50 hover:border-rose-500/50 hover:bg-[#18181A]'
                }
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input 
                type="file"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="Upload File"
              />
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 text-gray-400 group-hover:text-rose-500 transition-colors">
                <UploadCloud className="w-10 h-10" />
              </div>
              <p className="font-semibold text-xl mb-2 text-center text-gray-200">Select any file to begin</p>
              <p className="text-sm text-gray-500 text-center">PDFs, Images, Office Docs, Audio</p>
            </label>
          </div>
        ) : (
          // Live Preview State
          <div className="flex-1 flex flex-col p-4 md:p-8 fade-in h-full">
            
            {/* Top Action Bar */}
            <div className="mb-6 p-4 rounded-2xl bg-[#121214] border border-white/5 flex flex-col sm:flex-row items-center justify-between shadow-xl gap-4 shrink-0">
               <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">
                 <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                   {isPdf ? <FileText className="w-6 h-6 text-rose-500" /> : <FileImage className="w-6 h-6 text-emerald-500" />}
                 </div>
                 <div className="min-w-0 flex-1">
                   <p className="font-semibold text-white truncate text-base" title={file.name}>
                     {file.name}
                   </p>
                   <p className="text-sm text-gray-400 mt-0.5 flex items-center gap-2">
                     <span className="uppercase text-xs font-bold tracking-wider">{file.type.split('/')[1] || 'Unknown'}</span>
                     <span>•</span>
                     <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                   </p>
                 </div>
               </div>
               
               <button
                 onClick={clearFile}
                 className="px-4 py-2 text-sm font-medium text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors flex items-center gap-2 shrink-0 w-full sm:w-auto justify-center"
               >
                 <X className="w-4 h-4" />
                 Clear Canvas
               </button>
            </div>

            {/* Document Render Container */}
            <div className="flex-1 w-full bg-[#121214]/50 border border-white/5 rounded-2xl overflow-hidden shadow-2xl relative min-h-[500px]">
              {previewUrl && isPdf && (
                <object 
                  data={`${previewUrl}#toolbar=0&navpanes=0`} 
                  type="application/pdf" 
                  className="w-full h-full absolute inset-0"
                >
                  <div className="flex items-center justify-center w-full h-full text-gray-500">
                    PDF Preview unavailable
                  </div>
                </object>
              )}
              
              {previewUrl && isImage && (
                <div className="w-full h-full absolute inset-0 flex items-center justify-center p-8 bg-black/50 overflow-auto">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                     src={previewUrl} 
                     alt="Preview" 
                     className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                  />
                </div>
              )}

              {previewUrl && !isPdf && !isImage && (
                <div className="w-full h-full absolute inset-0 flex flex-col items-center justify-center text-gray-500 p-8 text-center bg-[#121214]">
                   <FileText className="w-16 h-16 mb-4 opacity-50" />
                   <p className="font-medium text-lg text-white mb-2">Ready for processing</p>
                   <p className="max-w-md">Rich visual previews natively in the browser are currently limited to PDFs and Image formats. The Reactive Toolbelt is still active based on your file type!</p>
                </div>
              )}
            </div>

            {/* Contextual Active Tool Panel */}
            {activeTool === 'edit' && (
               <div className="w-full bg-[#121214] border border-white/5 flex flex-col gap-4 shadow-xl relative overflow-hidden p-6 mt-6 rounded-b-2xl items-center justify-center text-center">
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500/0 via-amber-500/50 to-amber-500/0 hidden md:block"></div>
                  <PenTool className="w-8 h-8 text-amber-500 mb-2 opacity-50" />
                  <p className="font-bold text-lg text-white">Edit & Sign PDF Module</p>
                  <p className="text-sm text-gray-500 max-w-sm">This module is currently being built for the Universal Workspace. Check back soon!</p>
               </div>
            )}
            {activeTool === 'organize' && <OrganizeTool />}
            {activeTool === 'merge' && <MergeTool />}
            {activeTool === 'compress' && <CompressTool />}
            {activeTool === 'flatten' && <FlattenTool />}
            {activeTool === 'unlock' && <UnlockTool />}

          </div>
        )}
      </main>
    </div>
  );
}
