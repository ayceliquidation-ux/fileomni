import { pipeline, env } from '@huggingface/transformers';

// Ensure models are loaded from HuggingFace and cached in the browser locally
env.allowLocalModels = false;
env.useBrowserCache = false; // Bypass IndexedDB to prevent silent memory deadlocks

// Force single-threaded execution to prevent deadlocks and missing threaded JSEP modules
if (env.backends.onnx.wasm) {
    env.backends.onnx.wasm.numThreads = 1;
    env.backends.onnx.wasm.proxy = false;
}

let segmenter: any = null;

self.addEventListener('message', async (e) => {
    const { image } = e.data;
    console.log("[Worker] Received message, processing image...");
    
    try {
        // 1. Load the model on the first run (with progress callbacks)
        if (!segmenter) {
            try {
                console.log("[Worker] Initializing pipeline...");
                self.postMessage({ status: 'init_progress', data: { progress: 0 } });
                
                // Add a 30-second timeout to catch silent network/caching failures
                const initTimeout = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error("Pipeline initialization timed out after 30 seconds.")), 30000)
                );

                const initPipeline = pipeline('image-segmentation', 'Xenova/modnet', {
                    device: 'wasm',
                    quantized: true,
                    progress_callback: (progressData: any) => {
                        console.log(`[Worker] ${progressData.status}: ${progressData.file || ''} (${progressData.progress || 0}%)`);
                        self.postMessage({ status: 'init_progress', data: progressData });
                    }
                } as any);

                segmenter = await Promise.race([initPipeline, initTimeout]);
                console.log("[Worker] Pipeline initialized successfully.");
            } catch (pipelineErr: any) {
                console.error("[Worker] Pipeline Init Error:", pipelineErr);
                self.postMessage({ status: 'error', error: `Failed to initialize AI Pipeline: ${pipelineErr.message}` });
                return; // Stop execution if pipeline fails
            }
        }

        // 2. Perform background removal inference
        console.log("[Worker] Starting inference...");
        self.postMessage({ status: 'processing' });
        
        // Run inference
        const result = await segmenter(image);
        console.log("[Worker] Inference completed successfully.");
        
        // Extract the mask (RMBG-1.4 typically returns a single mask or an array with a `mask` property)
        const maskObj = Array.isArray(result) ? result[0] : result;
        const maskImage = maskObj.mask || maskObj;

        // Post the raw image data back to the main thread
        self.postMessage({ 
            status: 'done', 
            mask: {
                data: maskImage.data,
                width: maskImage.width,
                height: maskImage.height
            }
        });

    } catch (error: any) {
        console.error("Worker Error:", error);
        self.postMessage({ status: 'error', error: error.message || "Unknown error occurred in worker." });
    }
});
