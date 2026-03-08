"use client";

import { useState, useRef } from "react";
import { UploadCloud, Scissors, Download, Play } from "lucide-react";
import { useFFmpeg } from "@/hooks/useFFmpeg";
import { fetchFile } from "@ffmpeg/util";

export default function TimelineTrimmer() {
  const { ffmpeg, loaded, loading, progress, error, load } = useFFmpeg();
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [converting, setConverting] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    
    setFile(selected);
    setOutputUrl(null);
    setVideoUrl(URL.createObjectURL(selected));
    
    if (!loaded) await load();
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = Math.floor(videoRef.current.duration);
      setDuration(dur);
      setEndTime(dur);
      setStartTime(0);
    }
  };

  const trimVideo = async () => {
    if (!ffmpeg || !file) return;
    
    setConverting(true);
    try {
      const inputName = file.name;
      const outputName = "trimmed.mp4";
      
      await ffmpeg.writeFile(inputName, await fetchFile(file));
      
      // Trim using -ss and -to, using -c copy for lightning-fast trimming without re-encoding
      await ffmpeg.exec([
        "-i", inputName,
        "-ss", startTime.toString(),
        "-to", endTime.toString(),
        "-c", "copy",
        outputName
      ]);
      
      const data = await ffmpeg.readFile(outputName);
      const _url = URL.createObjectURL(new Blob([new Uint8Array(data as any)], { type: "video/mp4" }));
      setOutputUrl(_url);
    } catch (err) {
      console.error(err);
    } finally {
      setConverting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-2">
          <Scissors className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Timeline Trimmer</h2>
        <p className="text-muted-foreground">Cut the start and end of any video instantly without quality loss.</p>
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
            <p className="mb-2 text-sm font-semibold text-foreground">Tap to select a video for trimming</p>
          </div>
          <input 
            type="file" 
            className="hidden" 
            accept="video/*" 
            onChange={handleFileChange}
          />
        </label>
      )}

      {/* Processing State */}
      {file && !outputUrl && videoUrl && (
        <div className="p-4 md:p-6 bg-card border border-border rounded-2xl space-y-6">
          <div className="aspect-video bg-black rounded-xl overflow-hidden relative">
            <video 
              ref={videoRef}
              src={videoUrl}
              onLoadedMetadata={handleLoadedMetadata}
              className="w-full h-full object-contain"
              controls
            />
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between text-sm font-medium">
              <span>Start: {formatTime(startTime)}</span>
              <span>End: {formatTime(endTime)}</span>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Set Start Point</label>
                <input 
                  type="range" 
                  min="0" 
                  max={endTime - 1 || 1} 
                  value={startTime} 
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setStartTime(val);
                    if (videoRef.current) videoRef.current.currentTime = val;
                  }}
                  className="w-full accent-primary"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Set End Point</label>
                <input 
                  type="range" 
                  min={startTime + 1 || 1} 
                  max={duration} 
                  value={endTime} 
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setEndTime(val);
                    if (videoRef.current) videoRef.current.currentTime = val - 1; // preview slightly before end
                  }}
                  className="w-full accent-primary"
                />
              </div>
            </div>
          </div>

          {(loading || converting) ? (
            <div className="space-y-2 pt-4 border-t border-border">
              <div className="flex justify-between text-sm mb-1">
                <span>{loading ? "Loading Media Engine..." : "Trimming Video..."}</span>
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
            <div className="pt-4 border-t border-border">
              <button
                onClick={trimVideo}
                disabled={!loaded}
                className="w-full py-4 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Scissors className="w-4 h-4" /> Trim Now
              </button>
            </div>
          )}
        </div>
      )}

      {/* Result State */}
      {outputUrl && (
        <div className="p-4 bg-card border border-border rounded-2xl flex flex-col items-center gap-4">
          <video src={outputUrl} controls className="w-full max-h-64 rounded-xl object-contain bg-black" />
          
          <div className="flex gap-2 w-full">
            <button 
              onClick={() => { setFile(null); setOutputUrl(null); setVideoUrl(null); }}
              className="flex-1 py-3 bg-secondary text-secondary-foreground font-medium rounded-xl hover:bg-secondary/80 active:scale-[0.98] transition-all cursor-pointer"
            >
              Start Over
            </button>
            <a 
              href={outputUrl} 
              download={`trimmed_${file?.name}`}
              className="flex-1 py-3 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all flex justify-center items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" /> Save Video
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
