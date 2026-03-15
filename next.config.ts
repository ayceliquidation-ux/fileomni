import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    const sharedHeaders = [
      { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" }
    ];
    return [
      { source: "/tools/video-to-gif", headers: sharedHeaders },
      { source: "/tools/audio-extractor", headers: sharedHeaders },
      { source: "/tools/timeline-trimmer", headers: sharedHeaders }
    ];
  },

  webpack: (config) => {
    // See https://huggingface.co/docs/transformers.js/tutorials/next
    config.resolve.alias = {
      ...config.resolve.alias,
      "sharp$": false,
      "onnxruntime-node$": false,
    }
    
    // Fix for Next.js 15 Webpack bug with pdfjs-dist dynamic imports
    // "TypeError: Object.defineProperty called on non-object"
    config.devtool = 'source-map';
    
    return config;
  },
};

export default nextConfig;
