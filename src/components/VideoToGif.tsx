"use client";

import { useState } from "react";
import { UploadCloud, FileVideo, Download } from "lucide-react";
import { useFFmpeg } from "@/hooks/useFFmpeg";
import { fetchFile } from "@ffmpeg/util";

export default function VideoToGif() {
  const { ffmpeg, loaded, loading, progress, error, load } = useFFmpeg();
  const [file, setFile] = useState<File | null>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [fps, setFps] = useState(10); // Frame-rate control

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    
    setFile(selected);
    setGifUrl(null);
    
    // Lazy load FFmpeg as soon as a file is selected
    if (!loaded) await load();
  };

  const convertToGif = async () => {
    if (!ffmpeg || !file) return;
    
    setConverting(true);
    try {
      const inputName = file.name;
      const outputName = "output.gif";
      
      // Write file to FFmpeg WASM FS
      await ffmpeg.writeFile(inputName, await fetchFile(file));
      
      // Execute FFmpeg command
      // -r specifies the frame rate
      // -vf sets a max width of 480 to keep GIF sizes reasonable on mobile, maintaining aspect ratio
      await ffmpeg.exec([
        "-i", inputName,
        "-vf", "scale=480:-1",
        "-r", fps.toString(),
        outputName
      ]);
      
      // Read the result
      const data = await ffmpeg.readFile(outputName);
      
      // Create blob URL
      const _gifUrl = URL.createObjectURL(new Blob([new Uint8Array(data as any)], { type: "image/gif" }));
      setGifUrl(_gifUrl);
    } catch (err) {
      console.error(err);
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-2">
          <FileVideo className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Video to GIF</h2>
        <p className="text-muted-foreground">Convert MP4 or MOV to high-quality GIFs totally offline.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 text-sm">
          {error}
        </div>
      )}

      {/* Upload Zone */}
      {!file && (
        <label className="relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-2xl cursor-pointer bg-card hover:bg-white/[0.02] hover:border-primary/50 transition-all active:scale-[0.98] group">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadCloud className="w-8 h-8 mb-3 text-muted-foreground group-hover:text-primary transition-colors" />
            <p className="mb-2 text-sm font-semibold text-foreground">Tap to select a video</p>
            <p className="text-xs text-muted-foreground">MP4, MOV</p>
          </div>
          <input 
            type="file" 
            className="hidden" 
            accept="video/mp4,video/quicktime" 
            onChange={handleFileChange}
          />
        </label>
      )}

      {/* Processing State */}
      {file && !gifUrl && (
        <div className="p-6 bg-card border border-border rounded-2xl space-y-6">
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium truncate max-w-[200px]">{file.name}</span>
            <span className="text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
          </div>
          
          <div className="space-y-3">
            <label className="text-sm font-medium">Frame Rate (FPS): {fps}</label>
            <input 
              type="range" 
              min="5" 
              max="30" 
              value={fps} 
              onChange={(e) => setFps(Number(e.target.value))}
              disabled={converting || loading}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Low (Smaller size)</span>
              <span>High (Smoother)</span>
            </div>
          </div>

          {(loading || converting) ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm mb-1">
                <span>{loading ? "Loading Media Engine..." : "Converting..."}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-primary h-2.5 rounded-full transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <button
              onClick={convertToGif}
              disabled={!loaded}
              className="w-full py-4 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              Convert to GIF
            </button>
          )}
        </div>
      )}

      {/* Result State */}
      {gifUrl && (
        <div className="p-4 bg-card border border-border rounded-2xl flex flex-col items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={gifUrl} alt="Output GIF" className="max-h-64 rounded-xl object-contain" />
          
          <div className="flex gap-2 w-full">
            <button 
              onClick={() => { setFile(null); setGifUrl(null); }}
              className="flex-1 py-3 bg-secondary text-secondary-foreground font-medium rounded-xl hover:bg-secondary/80 active:scale-[0.98] transition-all cursor-pointer"
            >
              Start Over
            </button>
            <a 
              href={gifUrl} 
              download={`ultraconvert_${file?.name}.gif`}
              className="flex-1 py-3 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all flex justify-center items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" /> Save GIF
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
