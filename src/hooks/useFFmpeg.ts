"use client";

import { useState, useRef, useCallback } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

export function useFFmpeg() {
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const ffmpegRef = useRef<FFmpeg | null>(null);

  const load = useCallback(async () => {
    if (loaded || loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const ffmpeg = new FFmpeg();
      ffmpegRef.current = ffmpeg;

      ffmpeg.on("progress", ({ progress: p }) => {
        setProgress(Math.round(p * 100)); // 0 to 100
      });

      // Using unpkg CDN. For true offline PWA, these should be hosted in /public
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });
      
      setLoaded(true);
    } catch (err) {
      console.error("FFmpeg load failed", err);
      setError("Failed to initialize the local media engine. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, [loaded, loading]);

  return { ffmpeg: ffmpegRef.current, loaded, loading, progress, error, load };
}
